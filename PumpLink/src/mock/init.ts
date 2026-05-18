import { initDB } from '@/database'
import { addDevices } from '@/database/deviceStore'
import { addSnapshots } from '@/database/snapshotStore'
import { addAlerts } from '@/database/alertStore'
import { generateMockDevices, generateMockSnapshots, generateMockAlerts } from './dataGenerator'

export async function initializeMockData() {
  await initDB()

  const devices = generateMockDevices(50)
  await addDevices(devices)

  const allSnapshots: any[] = []
  for (const device of devices) {
    const snapshots = generateMockSnapshots(device.id, 200)
    allSnapshots.push(...snapshots)
  }
  await addSnapshots(allSnapshots)

  const alerts = generateMockAlerts(devices)
  await addAlerts(alerts)

  console.log(`已初始化 Mock 数据: ${devices.length} 台设备, ${allSnapshots.length} 条快照, ${alerts.length} 条告警`)
}

export async function checkAndInitData() {
  try {
    const { getAllDevices } = await import('@/database/deviceStore')
    const existing = await getAllDevices()
    
    if (existing.length === 0) {
      console.log('数据库为空，开始初始化 Mock 数据...')
      await initializeMockData()
    } else {
      console.log(`数据库已存在 ${existing.length} 台设备数据`)
    }
  } catch (e) {
    console.error('数据初始化失败:', e)
  }
}
