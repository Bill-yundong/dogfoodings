import { PowerNode, PowerConnection } from './topologyModel'
import { SEMANTIC_TYPES, DATA_CATEGORIES } from './semanticMapping'

export function generateMockTopology() {
  const nodes = []
  const connections = []

  const dispatchCenter = new PowerNode(
    'DC-001',
    SEMANTIC_TYPES.DISPATCH_CENTER,
    '华东电网调度中心',
    5000
  )
  dispatchCenter.currentLoad = 3850
  nodes.push(dispatchCenter)

  const substations = [
    { id: 'SS-001', name: '上海浦东变电站', capacity: 1200, load: 920 },
    { id: 'SS-002', name: '上海浦西变电站', capacity: 1000, load: 780 },
    { id: 'SS-003', name: '苏州工业园变电站', capacity: 1500, load: 1350 },
    { id: 'SS-004', name: '杭州滨江变电站', capacity: 1100, load: 650 },
    { id: 'SS-005', name: '南京江北变电站', capacity: 800, load: 720 }
  ]

  substations.forEach(ss => {
    const node = new PowerNode(ss.id, SEMANTIC_TYPES.SUBSTATION, ss.name, ss.capacity)
    node.currentLoad = ss.load
    node.parent = dispatchCenter.id
    nodes.push(node)

    connections.push(new PowerConnection(
      `CONN-${ss.id}`,
      dispatchCenter.id,
      ss.id,
      ss.capacity * 1.2,
      0.01
    ))
  })

  const transformers = [
    { id: 'TR-SS001-T1', name: '浦东变1号主变', substation: 'SS-001', capacity: 500, load: 420 },
    { id: 'TR-SS001-T2', name: '浦东变2号主变', substation: 'SS-001', capacity: 500, load: 500 },
    { id: 'TR-SS002-T1', name: '浦西变1号主变', substation: 'SS-002', capacity: 400, load: 350 },
    { id: 'TR-SS002-T2', name: '浦西变2号主变', substation: 'SS-002', capacity: 400, load: 430 },
    { id: 'TR-SS003-T1', name: '苏州变1号主变', substation: 'SS-003', capacity: 750, load: 680 },
    { id: 'TR-SS003-T2', name: '苏州变2号主变', substation: 'SS-003', capacity: 750, load: 670 },
    { id: 'TR-SS004-T1', name: '杭州变1号主变', substation: 'SS-004', capacity: 500, load: 320 },
    { id: 'TR-SS004-T2', name: '杭州变2号主变', substation: 'SS-004', capacity: 500, load: 330 },
    { id: 'TR-SS005-T1', name: '南京变1号主变', substation: 'SS-005', capacity: 400, load: 360 },
    { id: 'TR-SS005-T2', name: '南京变2号主变', substation: 'SS-005', capacity: 400, load: 360 }
  ]

  transformers.forEach(tr => {
    const node = new PowerNode(tr.id, SEMANTIC_TYPES.TRANSFORMER, tr.name, tr.capacity)
    node.currentLoad = tr.load
    node.parent = tr.substation
    nodes.push(node)

    connections.push(new PowerConnection(
      `CONN-${tr.id}`,
      tr.substation,
      tr.id,
      tr.capacity * 1.1,
      0.005
    ))
  })

  const loads = [
    { id: 'LD-IND-001', name: '工业负荷区A', substation: 'SS-001', capacity: 300, load: 280 },
    { id: 'LD-IND-002', name: '工业负荷区B', substation: 'SS-003', capacity: 600, load: 550 },
    { id: 'LD-RES-001', name: '居民负荷区A', substation: 'SS-002', capacity: 350, load: 320 },
    { id: 'LD-RES-002', name: '居民负荷区B', substation: 'SS-004', capacity: 250, load: 200 },
    { id: 'LD-COM-001', name: '商业负荷区A', substation: 'SS-001', capacity: 200, load: 180 },
    { id: 'LD-COM-002', name: '商业负荷区B', substation: 'SS-005', capacity: 280, load: 260 }
  ]

  loads.forEach(ld => {
    const node = new PowerNode(ld.id, SEMANTIC_TYPES.LOAD, ld.name, ld.capacity)
    node.currentLoad = ld.load
    node.parent = ld.substation
    nodes.push(node)

    connections.push(new PowerConnection(
      `CONN-${ld.id}`,
      ld.substation,
      ld.id,
      ld.capacity,
      0.02
    ))
  })

  return { nodes, connections }
}

export function generateHistoricalSnapshots(days = 7) {
  const snapshots = []
  const now = Date.now()
  const interval = 15 * 60 * 1000
  const count = (days * 24 * 60) / 15

  const substations = [
    { id: 'SS-001', baseLoad: 920, variance: 200, capacity: 1200 },
    { id: 'SS-002', baseLoad: 780, variance: 180, capacity: 1000 },
    { id: 'SS-003', baseLoad: 1350, variance: 250, capacity: 1500 },
    { id: 'SS-004', baseLoad: 650, variance: 150, capacity: 1100 },
    { id: 'SS-005', baseLoad: 720, variance: 160, capacity: 800 }
  ]

  for (let i = 0; i < count; i++) {
    const timestamp = now - (count - i) * interval
    const hour = new Date(timestamp).getHours()
    const dayFactor = (hour >= 8 && hour <= 22) ? 1.2 : 0.7

    substations.forEach(ss => {
      const randomFactor = 0.9 + Math.random() * 0.2
      const load = ss.baseLoad * dayFactor * randomFactor

      snapshots.push({
        substationId: ss.id,
        type: 'load_snapshot',
        timestamp,
        data: {
          load: Math.round(load),
          capacity: ss.capacity,
          ratio: (load / ss.capacity).toFixed(2),
          voltage: (220 + (Math.random() - 0.5) * 4).toFixed(1),
          frequency: (50 + (Math.random() - 0.5) * 0.1).toFixed(2)
        }
      })
    })
  }

  return snapshots
}

export function generateDispatchData() {
  return {
    dispatchLoad: 3850,
    dispatchVoltage: 220,
    dispatchFrequency: 50.02,
    timestamp: Date.now()
  }
}

export function generateSubstationReport(substationId) {
  const baseData = {
    'SS-001': { load: 920, voltage: 221.5, frequency: 50.01, transformers: 2 },
    'SS-002': { load: 780, voltage: 219.8, frequency: 50.03, transformers: 2 },
    'SS-003': { load: 1350, voltage: 220.2, frequency: 50.00, transformers: 2 },
    'SS-004': { load: 650, voltage: 220.8, frequency: 50.02, transformers: 2 },
    'SS-005': { load: 720, voltage: 219.5, frequency: 49.98, transformers: 2 }
  }

  const data = baseData[substationId] || baseData['SS-001']
  
  return {
    actualLoad: data.load + (Math.random() - 0.5) * 50,
    transformerStatus: Math.random() > 0.9 ? 1 : 0,
    busVoltage: data.voltage + (Math.random() - 0.5) * 2,
    frequency: data.frequency + (Math.random() - 0.5) * 0.05,
    timestamp: Date.now()
  }
}

export function generateLoadTimeSeries(hours = 24) {
  const data = []
  const now = Date.now()
  
  for (let i = 0; i < hours; i++) {
    const timestamp = now - (hours - i) * 3600 * 1000
    const hour = new Date(timestamp).getHours()
    const baseLoad = 800
    
    let factor = 0.6
    if (hour >= 7 && hour < 9) factor = 1.0
    else if (hour >= 9 && hour < 12) factor = 0.9
    else if (hour >= 12 && hour < 14) factor = 0.85
    else if (hour >= 14 && hour < 18) factor = 0.95
    else if (hour >= 18 && hour < 22) factor = 1.1
    else if (hour >= 22 || hour < 7) factor = 0.55

    const randomFactor = 0.95 + Math.random() * 0.1
    const load = baseLoad * factor * randomFactor

    data.push({
      timestamp,
      time: `${hour.toString().padStart(2, '0')}:00`,
      load: Math.round(load),
      predicted: Math.round(load * 1.05),
      capacity: 1200
    })
  }

  return data
}

export default {
  generateMockTopology,
  generateHistoricalSnapshots,
  generateDispatchData,
  generateSubstationReport,
  generateLoadTimeSeries
}
