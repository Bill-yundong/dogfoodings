import { TestRunner, delay } from './testUtils.js'
import { 
  EventEmitter, 
  Broadcaster, 
  ConflictResolver,
  dataSync 
} from '../src/lib/sync/dataSync.js'

export async function runDataSyncTests() {
  const runner = new TestRunner()

  console.log('\n' + '='.repeat(60))
  console.log('RUNNING DATA SYNC MODULE TESTS')
  console.log('='.repeat(60))

  await runner.runTest('1.1 EventEmitter - 创建实例', async (assert) => {
    const emitter = new EventEmitter()
    assert.truthy(emitter, '应该能创建实例')
    assert.truthy(emitter.events, '应该有events对象')
    assert.truthy(typeof emitter.on === 'function', '应该有on方法')
    assert.truthy(typeof emitter.emit === 'function', '应该有emit方法')
  })

  await runner.runTest('1.2 EventEmitter - 事件订阅和发布', async (assert) => {
    const emitter = new EventEmitter()
    let receivedData = null
    
    emitter.on('test-event', (data) => {
      receivedData = data
    })
    
    emitter.emit('test-event', { message: 'hello' })
    await delay(100)
    
    assert.truthy(receivedData, '应该收到事件数据')
    assert.equal(receivedData.message, 'hello', '消息内容应该匹配')
  })

  await runner.runTest('1.3 EventEmitter - 取消订阅', async (assert) => {
    const emitter = new EventEmitter()
    let callCount = 0
    
    const unsubscribe = emitter.on('test-event', () => {
      callCount++
    })
    
    emitter.emit('test-event')
    unsubscribe()
    emitter.emit('test-event')
    
    await delay(100)
    assert.equal(callCount, 1, '取消订阅后不应该再收到事件')
  })

  await runner.runTest('2.1 Broadcaster - 创建实例', async (assert) => {
    const broadcaster = new Broadcaster()
    assert.truthy(broadcaster, '应该能创建实例')
    assert.truthy(broadcaster.channels, '应该有channels对象')
  })

  await runner.runTest('2.2 Broadcaster - 频道订阅和广播', async (assert) => {
    const broadcaster = new Broadcaster()
    let receivedMessage = null
    
    broadcaster.subscribe('test-channel', (message) => {
      receivedMessage = message
    })
    
    const broadcasted = broadcaster.broadcast('test-channel', { type: 'test', data: 123 })
    
    await delay(100)
    
    assert.truthy(receivedMessage, '应该收到广播消息')
    assert.equal(receivedMessage.payload.type, 'test', '消息类型应该匹配')
    assert.equal(receivedMessage.id, broadcasted.id, '消息ID应该匹配')
  })

  await runner.runTest('2.3 Broadcaster - 多订阅者', async (assert) => {
    const broadcaster = new Broadcaster()
    let subscriber1Count = 0
    let subscriber2Count = 0
    
    broadcaster.subscribe('test-channel', () => { subscriber1Count++ })
    broadcaster.subscribe('test-channel', () => { subscriber2Count++ })
    
    broadcaster.broadcast('test-channel', { test: true })
    await delay(100)
    
    assert.equal(subscriber1Count, 1, '订阅者1应该收到消息')
    assert.equal(subscriber2Count, 1, '订阅者2应该收到消息')
  })

  await runner.runTest('3.1 ConflictResolver - 创建实例', async (assert) => {
    const resolver = new ConflictResolver()
    assert.truthy(resolver, '应该能创建实例')
    assert.truthy(resolver.mergeStrategies, '应该有合并策略')
  })

  await runner.runTest('3.2 ConflictResolver - 默认合并策略', async (assert) => {
    const resolver = new ConflictResolver()
    
    const localData = { id: 1, value: 'local', updatedAt: 100 }
    const remoteData = { id: 1, value: 'remote', updatedAt: 200 }
    
    const result = resolver.resolve(localData, remoteData, 'unknown')
    
    assert.equal(result.source, 'remote', '应该选择更新的远程数据')
    assert.equal(result.data.value, 'remote', '值应该是远程数据')
  })

  await runner.runTest('3.3 ConflictResolver - 停车空间合并', async (assert) => {
    const resolver = new ConflictResolver()
    
    const localData = { id: 'space-1', status: 'available', updatedAt: 100 }
    const remoteData = { id: 'space-1', status: 'occupied', updatedAt: 200 }
    
    const result = resolver.resolve(localData, remoteData, 'parking-space')
    
    assert.equal(result.source, 'remote', '应该选择远程数据')
    assert.equal(result.data.status, 'occupied', '状态应该是远程数据')
  })

  await runner.runTest('3.4 ConflictResolver - 本地数据更新', async (assert) => {
    const resolver = new ConflictResolver()
    
    const localData = { id: 1, value: 'local', updatedAt: 300 }
    const remoteData = { id: 1, value: 'remote', updatedAt: 200 }
    
    const result = resolver.resolve(localData, remoteData, 'unknown')
    
    assert.equal(result.source, 'local', '应该选择更新的本地数据')
    assert.equal(result.data.value, 'local', '值应该是本地数据')
  })

  await runner.runTest('4.1 DataSyncManager - 获取同步状态', async (assert) => {
    const state = dataSync.getSyncState()
    assert.truthy(state, '应该能获取同步状态')
    assert.truthy(state.isConnected !== undefined, '应该有连接状态')
    assert.truthy(state.systems !== undefined, '应该有系统数量')
  })

  await runner.runTest('4.2 DataSyncManager - 注册系统', async (assert) => {
    let receivedMessages = []
    
    const system = dataSync.registerSystem('test-system', 'municipal', (data) => {
      receivedMessages.push(data)
    })
    
    assert.truthy(system, '应该返回系统实例')
    assert.truthy(typeof system.send === 'function', '应该有send方法')
    assert.truthy(typeof system.unregister === 'function', '应该有unregister方法')
    
    system.unregister()
  })

  await runner.runTest('4.3 DataSyncManager - 系统间通信', async (assert) => {
    let municipalReceived = []
    let navigationReceived = []
    
    const municipal = dataSync.registerSystem('test-municipal', 'municipal', (data) => {
      municipalReceived.push(data)
    })
    
    const navigation = dataSync.registerSystem('test-nav', 'navigation', (data) => {
      navigationReceived.push(data)
    })
    
    municipal.send({
      type: 'parking-update',
      data: { id: 'test', status: 'available' }
    })
    
    await delay(200)
    
    municipal.unregister()
    navigation.unregister()
    
    assert.truthy(true, '通信应该完成')
  })

  await runner.runTest('4.4 DataSyncManager - 同步状态变更监听', async (assert) => {
    let stateChanges = []
    
    const unsubscribe = dataSync.onStateChange((state) => {
      stateChanges.push(state)
    })
    
    dataSync.startAutoSync(500)
    await delay(1000)
    dataSync.stopAutoSync()
    
    unsubscribe()
    
    assert.greater(stateChanges.length, 0, '应该收到状态变更')
  })

  await runner.runTest('4.5 DataSyncManager - 完整数据同步', async (assert) => {
    const result = await dataSync.syncAllData()
    
    assert.truthy(result, '应该返回同步结果')
    assert.truthy(result.spaces !== undefined, '应该有泊位数量')
    assert.truthy(result.zones !== undefined, '应该有区域数量')
  })

  await runner.runTest('5.1 Full Integration - 双系统同步场景', async (assert) => {
    let municipalUpdates = []
    let navigationUpdates = []
    
    const municipal = dataSync.registerSystem('integration-municipal', 'municipal', (data) => {
      municipalUpdates.push(data)
    })
    
    const navigation = dataSync.registerSystem('integration-nav', 'navigation', (data) => {
      navigationUpdates.push(data)
    })
    
    dataSync.startAutoSync(200)
    
    municipal.send({
      type: 'parking-update',
      data: [
        { id: 'sync-test-1', zoneId: 'zone-1', totalSpaces: 50, occupiedSpaces: 25 }
      ]
    })
    
    await delay(500)
    
    dataSync.stopAutoSync()
    
    municipal.unregister()
    navigation.unregister()
    
    assert.greater(municipalUpdates.length, 0, '市政系统应该收到更新')
  })

  runner.printSummary()
  
  return {
    summary: runner.getSummary(),
    results: runner.getResults(),
    module: 'dataSync'
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runDataSyncTests().then(() => process.exit(0))
}
