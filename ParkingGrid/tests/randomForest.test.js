import { TestRunner, generateTrainingData, delay } from './testUtils.js'
import { AsyncRandomForest, TurnoverPredictor } from '../src/lib/ml/randomForest.js'

export async function runRandomForestTests() {
  const runner = new TestRunner()
  const { X, y } = generateTrainingData(200)

  console.log('\n' + '='.repeat(60))
  console.log('RUNNING RANDOM FOREST MODEL TESTS')
  console.log('='.repeat(60))

  await runner.runTest('1.1 Model Initialization - 创建模型实例', async (assert) => {
    const model = new AsyncRandomForest(10, 5)
    assert.truthy(model, '应该能创建模型实例')
    assert.equal(model.nEstimators, 10, '树数量应该匹配')
    assert.equal(model.maxDepth, 5, '最大深度应该匹配')
    assert.equal(model.isTraining, false, '初始状态应该为未训练')
  })

  await runner.runTest('1.2 Model Training - 异步训练模型', async (assert) => {
    const model = new AsyncRandomForest(10, 5)
    let progressUpdates = []
    
    await model.train(X.slice(0, 100), y.slice(0, 100), (progress, current, total) => {
      progressUpdates.push({ progress, current, total })
    })
    
    assert.equal(model.isTraining, false, '训练完成后状态应该为false')
    assert.greater(model.trees.length, 0, '应该有训练好的树')
    assert.greater(progressUpdates.length, 0, '应该有进度更新')
  })

  await runner.runTest('1.3 Model Prediction - 单样本预测', async (assert) => {
    const model = new AsyncRandomForest(5, 3)
    await model.train(X.slice(0, 50), y.slice(0, 50))
    
    const prediction = model.predict(X[0])
    assert.truthy(typeof prediction === 'number', '预测结果应该是数字')
    assert.greater(prediction, 0, '预测值应该大于0')
    assert.less(prediction, 1.1, '预测值应该小于1.1')
  })

  await runner.runTest('1.4 Model Prediction - 批量预测', async (assert) => {
    const model = new AsyncRandomForest(5, 3)
    await model.train(X.slice(0, 50), y.slice(0, 50))
    
    let progressUpdates = []
    const predictions = await model.predictBatch(X.slice(50, 60), (progress, current, total) => {
      progressUpdates.push({ progress, current, total })
    })
    
    assert.truthy(Array.isArray(predictions), '应该返回数组')
    assert.equal(predictions.length, 10, '应该返回10个预测值')
    assert.greater(progressUpdates.length, 0, '应该有进度更新')
  })

  await runner.runTest('1.5 Model Serialization - 保存和加载模型', async (assert) => {
    const model1 = new AsyncRandomForest(5, 3)
    await model1.train(X.slice(0, 50), y.slice(0, 50))
    
    const savedModel = model1.saveModel()
    assert.truthy(savedModel.trees, '保存的模型应该包含树')
    assert.equal(savedModel.nEstimators, 5, '树数量应该保存')
    
    const model2 = new AsyncRandomForest()
    model2.loadModel(savedModel)
    
    const pred1 = model1.predict(X[0])
    const pred2 = model2.predict(X[0])
    assert.equal(pred1, pred2, '加载后的模型预测应该相同')
  })

  await runner.runTest('1.6 Model Training Error - 训练状态检查', async (assert) => {
    const model = new AsyncRandomForest(10, 5)
    
    model.isTraining = true
    let threwError = false
    
    try {
      await model.train(X.slice(0, 10), y.slice(0, 10))
    } catch (e) {
      threwError = true
    }
    
    assert.truthy(threwError, '正在训练时应该抛出错误')
    model.isTraining = false
  })

  await runner.runTest('1.7 Model Prediction Error - 未训练预测', async (assert) => {
    const model = new AsyncRandomForest(5, 3)
    let threwError = false
    
    try {
      model.predict(X[0])
    } catch (e) {
      threwError = true
    }
    
    assert.truthy(threwError, '未训练时预测应该抛出错误')
  })

  await runner.runTest('2.1 Turnover Predictor - 创建预测器', async (assert) => {
    const predictor = new TurnoverPredictor()
    assert.truthy(predictor, '应该能创建预测器实例')
    assert.truthy(predictor.model, '应该有模型实例')
    assert.equal(predictor.isModelLoaded, false, '初始状态模型未加载')
  })

  await runner.runTest('2.2 Turnover Predictor - 训练预测器', async (assert) => {
    const predictor = new TurnoverPredictor()
    const historyData = []
    const now = Date.now()
    
    for (let i = 0; i < 100; i++) {
      historyData.push({
        spaceId: 'test-space',
        zoneId: 'test-zone',
        occupancyRate: y[i],
        timestamp: now - (100 - i) * 60 * 60 * 1000
      })
    }
    
    let progressUpdates = []
    const success = await predictor.train(historyData, (progress, current, total) => {
      progressUpdates.push({ progress, current, total })
    })
    
    assert.truthy(success, '训练应该成功')
    assert.truthy(predictor.isModelLoaded, '模型应该已加载')
  })

  await runner.runTest('2.3 Turnover Predictor - 预测周转率', async (assert) => {
    const predictor = new TurnoverPredictor()
    const historyData = []
    const now = Date.now()
    
    for (let i = 0; i < 100; i++) {
      historyData.push({
        spaceId: 'test-space',
        zoneId: 'test-zone',
        occupancyRate: y[i],
        timestamp: now - (100 - i) * 60 * 60 * 1000
      })
    }
    
    await predictor.train(historyData)
    const turnover = predictor.predictTurnover(historyData, now)
    
    assert.truthy(typeof turnover === 'number', '应该返回数字')
    assert.greater(turnover, 0, '周转率应该大于0')
    assert.less(turnover, 1, '周转率应该小于1')
  })

  await runner.runTest('2.4 Turnover Predictor - 批量预测', async (assert) => {
    const predictor = new TurnoverPredictor()
    const historyData = []
    const now = Date.now()
    
    for (let i = 0; i < 100; i++) {
      historyData.push({
        spaceId: 'test-space',
        zoneId: 'test-zone',
        occupancyRate: y[i],
        timestamp: now - (100 - i) * 60 * 60 * 1000
      })
    }
    
    await predictor.train(historyData)
    
    const startTime = now
    const endTime = now + 6 * 60 * 60 * 1000
    
    let progressUpdates = []
    const predictions = await predictor.predictTurnoverForPeriod(
      historyData,
      startTime,
      endTime,
      60,
      (progress, current, total) => {
        progressUpdates.push({ progress, current, total })
      }
    )
    
    assert.truthy(Array.isArray(predictions), '应该返回数组')
    assert.greater(predictions.length, 0, '应该有预测结果')
    assert.truthy(predictions[0].timestamp, '应该有时间戳')
    assert.truthy(predictions[0].predictedOccupancy !== undefined, '应该有预测占用率')
    assert.truthy(predictions[0].predictedTurnover !== undefined, '应该有预测周转率')
  })

  await runner.runTest('2.5 Turnover Predictor - 回退预测', async (assert) => {
    const predictor = new TurnoverPredictor()
    const historyData = []
    const now = Date.now()
    
    for (let i = 0; i < 10; i++) {
      historyData.push({
        spaceId: 'test-space',
        zoneId: 'test-zone',
        occupancyRate: 0.5,
        timestamp: now - (10 - i) * 60 * 60 * 1000
      })
    }
    
    const turnover = predictor.predictTurnover(historyData, now)
    assert.truthy(typeof turnover === 'number', '应该返回数字')
    assert.greater(turnover, 0, '周转率应该大于0')
  })

  await runner.runTest('2.6 Turnover Predictor - 模型序列化', async (assert) => {
    const predictor1 = new TurnoverPredictor()
    const historyData = []
    const now = Date.now()
    
    for (let i = 0; i < 100; i++) {
      historyData.push({
        spaceId: 'test-space',
        zoneId: 'test-zone',
        occupancyRate: y[i],
        timestamp: now - (100 - i) * 60 * 60 * 1000
      })
    }
    
    await predictor1.train(historyData)
    
    const saved = predictor1.saveModel()
    assert.truthy(saved, '应该能保存模型')
    assert.truthy(saved.trees, '保存的模型应该包含树')
    
    const predictor2 = new TurnoverPredictor()
    predictor2.loadModel(saved)
    
    const pred1 = predictor1.predictTurnover(historyData, now)
    const pred2 = predictor2.predictTurnover(historyData, now)
    
    assert.equal(pred1, pred2, '加载后的模型预测应该相同')
  })

  runner.printSummary()
  
  return {
    summary: runner.getSummary(),
    results: runner.getResults(),
    module: 'randomForest'
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runRandomForestTests().then(() => process.exit(0))
}
