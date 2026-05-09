class DecisionTree {
  constructor(maxDepth = 10, minSamplesSplit = 2) {
    this.maxDepth = maxDepth
    this.minSamplesSplit = minSamplesSplit
    this.tree = null
  }

  train(X, y) {
    this.tree = this._buildTree(X, y, 0)
  }

  _buildTree(X, y, depth) {
    const nSamples = X.length
    const nFeatures = X[0].length

    if (depth >= this.maxDepth || nSamples < this.minSamplesSplit || this._isPure(y)) {
      return {
        isLeaf: true,
        value: this._calculateLeafValue(y)
      }
    }

    const { featureIndex, threshold, leftIndices, rightIndices } = this._findBestSplit(X, y, nFeatures)

    if (leftIndices.length === 0 || rightIndices.length === 0) {
      return {
        isLeaf: true,
        value: this._calculateLeafValue(y)
      }
    }

    const leftX = leftIndices.map(i => X[i])
    const leftY = leftIndices.map(i => y[i])
    const rightX = rightIndices.map(i => X[i])
    const rightY = rightIndices.map(i => y[i])

    return {
      isLeaf: false,
      featureIndex,
      threshold,
      left: this._buildTree(leftX, leftY, depth + 1),
      right: this._buildTree(rightX, rightY, depth + 1)
    }
  }

  _isPure(y) {
    return new Set(y).size === 1
  }

  _calculateLeafValue(y) {
    const sum = y.reduce((a, b) => a + b, 0)
    return sum / y.length
  }

  _findBestSplit(X, y, nFeatures) {
    let bestGain = -Infinity
    let bestSplit = null
    const featureSubset = this._getRandomFeatures(nFeatures)

    for (const featureIndex of featureSubset) {
      const thresholds = [...new Set(X.map(row => row[featureIndex]))].sort()

      for (let i = 0; i < thresholds.length - 1; i++) {
        const threshold = (thresholds[i] + thresholds[i + 1]) / 2
        const { leftIndices, rightIndices } = this._split(X, featureIndex, threshold)
        
        if (leftIndices.length > 0 && rightIndices.length > 0) {
          const gain = this._calculateMSEGain(y, leftIndices, rightIndices)
          if (gain > bestGain) {
            bestGain = gain
            bestSplit = { featureIndex, threshold, leftIndices, rightIndices }
          }
        }
      }
    }

    return bestSplit || { featureIndex: 0, threshold: 0, leftIndices: [], rightIndices: [] }
  }

  _getRandomFeatures(nFeatures) {
    const nFeaturesSubset = Math.floor(Math.sqrt(nFeatures)) || 1
    const features = []
    const used = new Set()

    while (features.length < nFeaturesSubset && features.length < nFeatures) {
      const idx = Math.floor(Math.random() * nFeatures)
      if (!used.has(idx)) {
        used.add(idx)
        features.push(idx)
      }
    }

    return features
  }

  _split(X, featureIndex, threshold) {
    const leftIndices = []
    const rightIndices = []

    for (let i = 0; i < X.length; i++) {
      if (X[i][featureIndex] <= threshold) {
        leftIndices.push(i)
      } else {
        rightIndices.push(i)
      }
    }

    return { leftIndices, rightIndices }
  }

  _calculateMSEGain(y, leftIndices, rightIndices) {
    const parentMSE = this._calculateMSE(y)
    const leftY = leftIndices.map(i => y[i])
    const rightY = rightIndices.map(i => y[i])
    
    const leftMSE = this._calculateMSE(leftY)
    const rightMSE = this._calculateMSE(rightY)
    
    const weightLeft = leftY.length / y.length
    const weightRight = rightY.length / y.length
    
    const childMSE = (weightLeft * leftMSE) + (weightRight * rightMSE)
    
    return parentMSE - childMSE
  }

  _calculateMSE(y) {
    if (y.length === 0) return 0
    const mean = y.reduce((a, b) => a + b, 0) / y.length
    return y.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / y.length
  }

  predict(x) {
    return this._traverseTree(x, this.tree)
  }

  _traverseTree(x, node) {
    if (node.isLeaf) {
      return node.value
    }

    if (x[node.featureIndex] <= node.threshold) {
      return this._traverseTree(x, node.left)
    } else {
      return this._traverseTree(x, node.right)
    }
  }
}

export class AsyncRandomForest {
  constructor(nEstimators = 50, maxDepth = 10, minSamplesSplit = 2) {
    this.nEstimators = nEstimators
    this.maxDepth = maxDepth
    this.minSamplesSplit = minSamplesSplit
    this.trees = []
    this.isTraining = false
  }

  async train(X, y, onProgress = null) {
    if (this.isTraining) {
      throw new Error('Model is already training')
    }

    this.isTraining = true
    this.trees = []

    const nSamples = X.length
    const batchSize = Math.max(1, Math.floor(this.nEstimators / 10))

    for (let i = 0; i < this.nEstimators; i += batchSize) {
      const batchEnd = Math.min(i + batchSize, this.nEstimators)
      const batchPromises = []

      for (let j = i; j < batchEnd; j++) {
        batchPromises.push(
          new Promise((resolve) => {
            setTimeout(() => {
              const { bootstrappedX, bootstrappedY } = this._bootstrap(X, y, nSamples)
              const tree = new DecisionTree(this.maxDepth, this.minSamplesSplit)
              tree.train(bootstrappedX, bootstrappedY)
              resolve(tree)
            }, 0)
          })
        )
      }

      const batchTrees = await Promise.all(batchPromises)
      this.trees.push(...batchTrees)

      if (onProgress) {
        const progress = ((batchEnd) / this.nEstimators) * 100
        onProgress(progress, batchEnd, this.nEstimators)
      }

      await this._yieldToEventLoop()
    }

    this.isTraining = false
  }

  _bootstrap(X, y, nSamples) {
    const bootstrappedX = []
    const bootstrappedY = []

    for (let i = 0; i < nSamples; i++) {
      const idx = Math.floor(Math.random() * nSamples)
      bootstrappedX.push(X[idx])
      bootstrappedY.push(y[idx])
    }

    return { bootstrappedX, bootstrappedY }
  }

  _yieldToEventLoop() {
    return new Promise(resolve => setTimeout(resolve, 0))
  }

  predict(x) {
    if (this.trees.length === 0) {
      throw new Error('Model has not been trained yet')
    }

    const predictions = this.trees.map(tree => tree.predict(x))
    const sum = predictions.reduce((a, b) => a + b, 0)
    return sum / predictions.length
  }

  async predictBatch(X, onProgress = null) {
    const predictions = []
    const batchSize = Math.max(1, Math.floor(X.length / 10))

    for (let i = 0; i < X.length; i += batchSize) {
      const batchEnd = Math.min(i + batchSize, X.length)
      
      for (let j = i; j < batchEnd; j++) {
        predictions.push(this.predict(X[j]))
      }

      if (onProgress) {
        const progress = (batchEnd / X.length) * 100
        onProgress(progress, batchEnd, X.length)
      }

      await this._yieldToEventLoop()
    }

    return predictions
  }

  getFeatureImportance(X, y) {
    const nFeatures = X[0].length
    const importance = new Array(nFeatures).fill(0)
    const originalPredictions = this.trees.map(tree => X.map(x => tree.predict(x)))
    const originalError = this._calculateError(y, this.predictBatchSync(X))

    for (let featureIdx = 0; featureIdx < nFeatures; featureIdx++) {
      const permutedX = X.map(x => {
        const shuffled = [...X].sort(() => Math.random() - 0.5)
        const permuted = [...x]
        permuted[featureIdx] = shuffled[Math.floor(Math.random() * X.length)][featureIdx]
        return permuted
      })

      const permutedPredictions = this.predictBatchSync(permutedX)
      const permutedError = this._calculateError(y, permutedPredictions)
      importance[featureIdx] = permutedError - originalError
    }

    const maxImportance = Math.max(...importance)
    return importance.map(imp => imp / maxImportance)
  }

  predictBatchSync(X) {
    return X.map(x => this.predict(x))
  }

  _calculateError(y, predictions) {
    let sumSquaredError = 0
    for (let i = 0; i < y.length; i++) {
      sumSquaredError += Math.pow(y[i] - predictions[i], 2)
    }
    return sumSquaredError / y.length
  }

  saveModel() {
    return {
      nEstimators: this.nEstimators,
      maxDepth: this.maxDepth,
      minSamplesSplit: this.minSamplesSplit,
      trees: this.trees.map(tree => tree.tree)
    }
  }

  loadModel(modelData) {
    this.nEstimators = modelData.nEstimators
    this.maxDepth = modelData.maxDepth
    this.minSamplesSplit = modelData.minSamplesSplit
    this.trees = modelData.trees.map(treeData => {
      const tree = new DecisionTree(this.maxDepth, this.minSamplesSplit)
      tree.tree = treeData
      return tree
    })
  }
}

export class TurnoverPredictor {
  constructor() {
    this.model = new AsyncRandomForest(30, 8)
    this.isModelLoaded = false
  }

  _extractFeatures(historyData, currentTime) {
    const features = []
    const date = new Date(currentTime)
    const hour = date.getHours()
    const dayOfWeek = date.getDay()
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6 ? 1 : 0
    
    const recentData = historyData.slice(-24)
    const avgOccupancy = recentData.length > 0 
      ? recentData.reduce((sum, d) => sum + d.occupancyRate, 0) / recentData.length 
      : 0.5
    const trend = recentData.length >= 2
      ? recentData[recentData.length - 1].occupancyRate - recentData[0].occupancyRate
      : 0
    
    const peakHours = (hour >= 7 && hour <= 9) || (hour >= 17 && hour <= 19) ? 1 : 0
    const nightHours = (hour >= 22 || hour <= 6) ? 1 : 0
    
    features.push(hour / 23)
    features.push(dayOfWeek / 6)
    features.push(isWeekend)
    features.push(avgOccupancy)
    features.push(trend)
    features.push(peakHours)
    features.push(nightHours)
    
    if (historyData.length > 0) {
      const lastOccupancy = historyData[historyData.length - 1].occupancyRate
      features.push(lastOccupancy)
    } else {
      features.push(0.5)
    }
    
    return features
  }

  async train(historyData, onProgress = null) {
    const X = []
    const y = []
    
    for (let i = 24; i < historyData.length; i++) {
      const historicalWindow = historyData.slice(i - 24, i)
      const features = this._extractFeatures(historicalWindow, historyData[i].timestamp)
      X.push(features)
      y.push(historyData[i].occupancyRate)
    }
    
    if (X.length < 50) {
      console.warn('Insufficient training data. Need at least 50 samples.')
      return false
    }
    
    await this.model.train(X, y, onProgress)
    this.isModelLoaded = true
    return true
  }

  predictTurnover(historyData, currentTime) {
    if (!this.isModelLoaded && this.model.trees.length === 0) {
      const date = new Date(currentTime)
      const hour = date.getHours()
      const dayOfWeek = date.getDay()
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6
      
      let baseRate = 0.5
      
      if (isWeekend) {
        if (hour >= 10 && hour <= 20) baseRate = 0.8
        else baseRate = 0.4
      } else {
        if ((hour >= 7 && hour <= 9) || (hour >= 17 && hour <= 19)) baseRate = 0.9
        else if (hour >= 9 && hour <= 17) baseRate = 0.6
        else baseRate = 0.2
      }
      
      return baseRate
    }
    
    const features = this._extractFeatures(historyData, currentTime)
    return Math.max(0, Math.min(1, this.model.predict(features)))
  }

  async predictTurnoverForPeriod(historyData, startTime, endTime, intervalMinutes = 60, onProgress = null) {
    const predictions = []
    const currentTime = startTime
    const intervalMs = intervalMinutes * 60 * 1000
    
    let time = startTime
    let count = 0
    const total = Math.ceil((endTime - startTime) / intervalMs)
    
    while (time <= endTime) {
      const prediction = this.predictTurnover(historyData, time)
      predictions.push({
        timestamp: time,
        predictedOccupancy: prediction,
        predictedTurnover: 1 - prediction
      })
      
      time += intervalMs
      count++
      
      if (onProgress && count % 10 === 0) {
        onProgress((count / total) * 100, count, total)
      }
    }
    
    return predictions
  }

  saveModel() {
    return this.model.saveModel()
  }

  loadModel(modelData) {
    this.model.loadModel(modelData)
    this.isModelLoaded = true
  }
}
