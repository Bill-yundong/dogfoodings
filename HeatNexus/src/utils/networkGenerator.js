import { saveHeatNodes, saveNodeHistory } from './db.js'

function generateId(prefix, index) {
  return `${prefix}-${String(index).padStart(4, '0')}`
}

export function generateNetwork(params) {
  const { 
    sourceCount = 1,
    zoneCount = 5,
    nodesPerZone = 100,
    branchDepth = 3,
    baseTemp = 95,
    baseFlowRate = 500
  } = params
  
  const nodes = []
  const connections = []
  let nodeIndex = 1
  let connectionIndex = 1
  
  for (let s = 0; s < sourceCount; s++) {
    const sourceId = generateId('src', s + 1)
    nodes.push({
      id: sourceId,
      type: 'source',
      name: `热源厂-${s + 1}`,
      temperature: baseTemp,
      flowRate: baseFlowRate,
      pressure: 1.2,
      zoneId: 'source',
      status: 'active',
      coords: { x: 500, y: 100 },
      metadata: {
        power: 1000000,
        efficiency: 0.95
      }
    })
    
    for (let z = 0; z < zoneCount; z++) {
      const zonePrefix = String.fromCharCode(65 + z)
      const mainNodeId = generateId('main', zonePrefix)
      
      nodes.push({
        id: mainNodeId,
        type: 'main',
        name: `主站-${zonePrefix}`,
        temperature: baseTemp - 2,
        flowRate: baseFlowRate / zoneCount,
        pressure: 1.0,
        zoneId: `zone-${zonePrefix}`,
        status: 'active',
        coords: {
          x: 100 + (z * 200),
          y: 200
        }
      })
      
      connections.push({
        id: generateId('conn', connectionIndex++),
        from: sourceId,
        to: mainNodeId,
        length: 2000 + Math.random() * 1000,
        diameter: 0.3,
        insulation: 0.08,
        flowRate: baseFlowRate / zoneCount
      })
      
      const queue = [{
        parentId: mainNodeId,
        depth: 1,
        x: 100 + (z * 200),
        y: 250
      }]
      
      const branchCount = Math.floor(nodesPerZone / (Math.pow(4, branchDepth) / 3))
      
      while (queue.length > 0) {
        const { parentId, depth, x, y } = queue.shift()
        
        if (depth >= branchDepth) {
          const endNodesCount = Math.floor(nodesPerZone / (zoneCount * Math.pow(4, branchDepth - 1)))
          
          for (let e = 0; e < endNodesCount; e++) {
            const endNodeId = generateId('end', nodeIndex++)
            const userFlowRate = (baseFlowRate / zoneCount) / (branchCount * endNodesCount)
            
            nodes.push({
              id: endNodeId,
              type: 'end',
              name: `终端用户-${nodeIndex}`,
              temperature: 0,
              flowRate: userFlowRate,
              pressure: 0.4,
              zoneId: `zone-${zonePrefix}`,
              status: 'active',
              coords: {
                x: x - 80 + (e * 40),
                y: y + 50 + Math.random() * 50
              },
              metadata: {
                buildingType: ['住宅', '商业', '办公楼'][Math.floor(Math.random() * 3)],
                area: 80 + Math.random() * 200,
                targetTemp: 22
              }
            })
            
            connections.push({
              id: generateId('conn', connectionIndex++),
              from: parentId,
              to: endNodeId,
              length: 50 + Math.random() * 100,
              diameter: 0.05,
              insulation: 0.03,
              flowRate: userFlowRate
            })
          }
          continue
        }
        
        const branches = 4
        
        for (let b = 0; b < branches; b++) {
          const branchId = generateId(depth === 1 ? 'sub' : 'dist', nodeIndex++)
          const branchFlowRate = (baseFlowRate / zoneCount) / (branchCount * Math.pow(branches, depth - 1))
          
          const newX = x - 120 + (b * 80)
          const newY = y + 80
          
          nodes.push({
            id: branchId,
            type: depth === 1 ? 'substation' : 'distribution',
            name: depth === 1 ? `换热站-${zonePrefix}-${b + 1}` : `分配站-${nodeIndex}`,
            temperature: 0,
            flowRate: branchFlowRate,
            pressure: 0.8 - depth * 0.1,
            zoneId: `zone-${zonePrefix}`,
            status: 'active',
            coords: { x: newX, y: newY }
          })
          
          connections.push({
            id: generateId('conn', connectionIndex++),
            from: parentId,
            to: branchId,
            length: 150 + Math.random() * 100,
            diameter: 0.15 / depth,
            insulation: 0.06 - depth * 0.01,
            flowRate: branchFlowRate
          })
          
          queue.push({
            parentId: branchId,
            depth: depth + 1,
            x: newX,
            y: newY
          })
        }
      }
    }
  }
  
  return { nodes, connections }
}

export async function initializeDemoNetwork(nodeCount = 10000) {
  const actualNodesPerZone = Math.floor(nodeCount / 5)
  const branchDepth = nodeCount > 1000 ? 4 : 3
  
  const { nodes, connections } = generateNetwork({
    sourceCount: 1,
    zoneCount: 5,
    nodesPerZone: actualNodesPerZone,
    branchDepth: branchDepth
  })
  
  await saveHeatNodes(nodes)
  
  const now = Date.now()
  const historyRecords = nodes.map((node, idx) => ({
    id: `${node.id}-${now}`,
    nodeId: node.id,
    timestamp: now,
    temperature: node.temperature || 60,
    flowRate: node.flowRate,
    pressure: node.pressure,
    heatLoad: node.flowRate * 4200 * (node.temperature || 60 - 20) / 3600
  }))
  
  await saveNodeHistory(historyRecords)
  
  return { nodes, connections }
}

export function generateHistoricalData(nodes, hours = 24) {
  const records = []
  const now = Date.now()
  const hourMs = 60 * 60 * 1000
  
  for (let h = 0; h < hours; h++) {
    const timestamp = now - (hours - h) * hourMs
    const timeFactor = Math.sin((h - 6) * Math.PI / 12) * 0.3 + 1
    
    for (const node of nodes) {
      const baseTemp = node.type === 'source' ? 95 : 60 + Math.random() * 10
      const baseFlow = node.flowRate * timeFactor
      
      records.push({
        id: `${node.id}-${timestamp}`,
        nodeId: node.id,
        timestamp: timestamp,
        temperature: parseFloat((baseTemp - h * 0.1).toFixed(2)),
        flowRate: parseFloat(baseFlow.toFixed(2)),
        pressure: parseFloat((node.pressure * timeFactor).toFixed(3)),
        heatLoad: parseFloat((baseFlow * 4200 * (baseTemp - 20) / 3600).toFixed(2))
      })
    }
  }
  
  return records
}

export default {
  generateNetwork,
  initializeDemoNetwork,
  generateHistoricalData
}
