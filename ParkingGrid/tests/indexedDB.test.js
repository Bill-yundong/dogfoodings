import { TestRunner, generateMockData, delay } from './testUtils.js'
import {
  saveZone,
  getZone,
  getAllZones,
  saveParkingSpace,
  getParkingSpace,
  getAllParkingSpaces,
  getParkingSpacesByZone,
  saveOccupancyRecord,
  getOccupancyHistory,
  getZoneOccupancyHistory,
  addToSyncQueue,
  getPendingSyncItems,
  markSyncComplete,
  savePrediction,
  getPredictions,
  incrementalBackup,
  restoreFromBackup,
  clearOldData
} from '../src/lib/database/indexedDB.js'

export async function runIndexedDBTests() {
  const runner = new TestRunner()
  const mockData = generateMockData()
  const { zones, parkingSpaces, occupancyHistory, predictions } = mockData

  console.log('\n' + '='.repeat(60))
  console.log('RUNNING INDEXEDDB MODULE TESTS')
  console.log('='.repeat(60))

  await runner.runTest('1.1 Zone CRUD - 保存区域数据', async (assert) => {
    await saveZone(zones[0])
    const saved = await getZone(zones[0].id)
    assert.truthy(saved, '应该能获取保存的区域')
    assert.equal(saved.id, zones[0].id, '区域ID应该匹配')
    assert.equal(saved.name, zones[0].name, '区域名称应该匹配')
  })

  await runner.runTest('1.2 Zone CRUD - 获取所有区域', async (assert) => {
    await saveZone(zones[1])
    const all = await getAllZones()
    assert.truthy(Array.isArray(all), '应该返回数组')
    assert.greater(all.length, 0, '应该至少有一个区域')
  })

  await runner.runTest('2.1 Parking Space CRUD - 保存泊位数据', async (assert) => {
    await saveParkingSpace(parkingSpaces[0])
    const saved = await getParkingSpace(parkingSpaces[0].id)
    assert.truthy(saved, '应该能获取保存的泊位')
    assert.equal(saved.id, parkingSpaces[0].id, '泊位ID应该匹配')
    assert.truthy(saved.updatedAt, '应该有更新时间戳')
  })

  await runner.runTest('2.2 Parking Space CRUD - 批量保存泊位', async (assert) => {
    for (const space of parkingSpaces.slice(1)) {
      await saveParkingSpace(space)
    }
    const all = await getAllParkingSpaces()
    assert.greater(all.length, 1, '应该有多个泊位')
  })

  await runner.runTest('2.3 Parking Space CRUD - 按区域获取泊位', async (assert) => {
    const zone1Spaces = await getParkingSpacesByZone('test-zone-1')
    assert.truthy(Array.isArray(zone1Spaces), '应该返回数组')
    assert.greater(zone1Spaces.length, 0, '区域1应该有泊位')
  })

  await runner.runTest('3.1 Occupancy History - 保存占用记录', async (assert) => {
    const record = occupancyHistory[0]
    await saveOccupancyRecord(record)
    const history = await getOccupancyHistory(record.spaceId)
    assert.greater(history.length, 0, '应该有历史记录')
  })

  await runner.runTest('3.2 Occupancy History - 按时间范围查询', async (assert) => {
    for (let i = 0; i < 50; i++) {
      await saveOccupancyRecord(occupancyHistory[i])
    }
    
    const now = Date.now()
    const oneDayAgo = now - 24 * 60 * 60 * 1000
    
    const recent = await getOccupancyHistory('test-space-1', oneDayAgo, now)
    assert.truthy(Array.isArray(recent), '应该返回数组')
  })

  await runner.runTest('3.3 Occupancy History - 按区域获取历史', async (assert) => {
    const zoneHistory = await getZoneOccupancyHistory('test-zone-1')
    assert.truthy(Array.isArray(zoneHistory), '应该返回数组')
  })

  await runner.runTest('4.1 Sync Queue - 添加同步队列', async (assert) => {
    await addToSyncQueue('test-type', { test: 'data' })
    const pending = await getPendingSyncItems()
    assert.greater(pending.length, 0, '应该有待处理项')
  })

  await runner.runTest('4.2 Sync Queue - 标记同步完成', async (assert) => {
    const pending = await getPendingSyncItems()
    if (pending.length > 0) {
      await markSyncComplete(pending[0].id)
      const updated = await getPendingSyncItems()
      assert.notEqual(updated.length, pending.length, '待处理项应该减少')
    }
  })

  await runner.runTest('5.1 Predictions - 保存预测数据', async (assert) => {
    for (const pred of predictions.slice(0, 5)) {
      await savePrediction(pred)
    }
    const saved = await getPredictions('test-zone-1')
    assert.truthy(Array.isArray(saved), '应该返回数组')
  })

  await runner.runTest('5.2 Predictions - 获取特定时间预测', async (assert) => {
    const pred = predictions[0]
    const saved = await getPredictions(pred.zoneId, pred.predictionTime)
    assert.truthy(saved, '应该能获取特定时间的预测')
  })

  await runner.runTest('6.1 Incremental Backup - 增量备份', async (assert) => {
    localStorage.setItem('lastSyncTimestamp', '0')
    const backup = await incrementalBackup()
    assert.truthy(backup.timestamp, '应该有时间戳')
    assert.truthy(backup.parkingSpaces, '应该包含泊位数据')
    assert.truthy(backup.zones, '应该包含区域数据')
  })

  await runner.runTest('6.2 Incremental Backup - 数据恢复', async (assert) => {
    const backup = await incrementalBackup()
    const originalCount = (await getAllZones()).length
    
    await restoreFromBackup({
      zones: [{ id: 'backup-test-zone', name: '备份测试区域', capacity: 50 }],
      parkingSpaces: []
    })
    
    const allZones = await getAllZones()
    assert.greater(allZones.length, originalCount, '应该有新增的区域')
  })

  await runner.runTest('6.3 Data Cleanup - 清理过期数据', async (assert) => {
    const oldRecord = {
      spaceId: 'old-space',
      zoneId: 'test-zone-1',
      occupancyRate: 0.5,
      occupiedSpaces: 25,
      totalSpaces: 50,
      status: 'available',
      timestamp: Date.now() - 60 * 24 * 60 * 60 * 1000
    }
    await saveOccupancyRecord(oldRecord)
    
    const cleared = await clearOldData(30)
    assert.greater(cleared, 0, '应该清理了过期数据')
  })

  runner.printSummary()
  
  return {
    summary: runner.getSummary(),
    results: runner.getResults(),
    module: 'indexedDB'
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runIndexedDBTests().then(() => process.exit(0))
}
