import { writable, derived } from 'svelte/store'

export const activeTab = writable('monitor')

export const systemStatus = writable({
  voltage: 220,
  current: 156.5,
  frequency: 50.02,
  temperature: 45.2,
  status: 'normal'
})

export const faultRecords = writable([])

export const deviceList = writable([
  { id: 'CB-001', name: '断路器 A', status: 'online', health: 95, lastMaintenance: '2026-04-15' },
  { id: 'CB-002', name: '断路器 B', status: 'online', health: 88, lastMaintenance: '2026-03-20' },
  { id: 'TR-001', name: '变压器 #1', status: 'online', health: 92, lastMaintenance: '2026-04-10' },
  { id: 'TR-002', name: '变压器 #2', status: 'warning', health: 72, lastMaintenance: '2026-02-28' },
  { id: 'RL-001', name: '继电器保护装置', status: 'online', health: 98, lastMaintenance: '2026-05-01' }
])

export const faultTreeData = writable({
  nodes: [],
  edges: [],
  riskLevel: 'low'
})

export const alignmentStatus = writable({
  deviceOps: 0,
  realTimeMonitor: 0,
  alignedCount: 0,
  alignmentRate: 0
})
