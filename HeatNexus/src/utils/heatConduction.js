export function calculateTemperatureDrop(params) {
  const { 
    inletTemp, 
    flowRate, 
    pipeLength, 
    ambientTemp, 
    pipeDiameter = 0.1,
    insulationThickness = 0.05,
    insulationConductivity = 0.04,
    heatCapacity = 4200,
    density = 1000
  } = params
  
  const k = insulationConductivity
  const R1 = pipeDiameter / 2
  const R2 = R1 + insulationThickness
  
  const thermalResistance = Math.log(R2 / R1) / (2 * Math.PI * k)
  
  const massFlowRate = flowRate * density / 3600
  const UA = 1 / (thermalResistance / pipeLength)
  
  const mcp = massFlowRate * heatCapacity
  const ratio = Math.exp(-UA / mcp)
  
  const outletTemp = ambientTemp + (inletTemp - ambientTemp) * ratio
  const tempDrop = inletTemp - outletTemp
  
  const heatLoss = massFlowRate * heatCapacity * tempDrop
  
  return {
    outletTemp: parseFloat(outletTemp.toFixed(4)),
    tempDrop: parseFloat(tempDrop.toFixed(4)),
    heatLoss: parseFloat(heatLoss.toFixed(4)),
    thermalResistance: parseFloat((thermalResistance * pipeLength).toFixed(6))
  }
}

export function calculatePressureDrop(params) {
  const { 
    flowRate, 
    pipeLength, 
    pipeDiameter = 0.1,
    viscosity = 0.001,
    roughness = 0.0001,
    density = 1000
  } = params
  
  const velocity = flowRate / (3600 * Math.PI * (pipeDiameter / 2) ** 2)
  const reynoldsNumber = (density * velocity * pipeDiameter) / viscosity
  
  let frictionFactor
  if (reynoldsNumber < 2000) {
    frictionFactor = 64 / reynoldsNumber
  } else {
    frictionFactor = 0.3164 * Math.pow(reynoldsNumber, -0.25)
  }
  
  const pressureDrop = frictionFactor * (pipeLength / pipeDiameter) * (density * velocity ** 2) / 2
  
  return {
    velocity: parseFloat(velocity.toFixed(4)),
    reynoldsNumber: parseFloat(reynoldsNumber.toFixed(2)),
    frictionFactor: parseFloat(frictionFactor.toFixed(6)),
    pressureDrop: parseFloat(pressureDrop.toFixed(4))
  }
}

export async function asyncHeatConductionSimulation(nodes, connections, sourceNodeId) {
  const visited = new Set()
  const queue = [sourceNodeId]
  const results = {}
  
  const nodeMap = new Map(nodes.map(n => [n.id, n]))
  
  const connectionMap = new Map()
  for (const conn of connections) {
    if (!connectionMap.has(conn.from)) {
      connectionMap.set(conn.from, [])
    }
    connectionMap.get(conn.from).push(conn)
  }
  
  while (queue.length > 0) {
    const currentId = queue.shift()
    
    if (visited.has(currentId)) continue
    visited.add(currentId)
    
    const currentNode = nodeMap.get(currentId)
    if (!currentNode) continue
    
    if (currentId === sourceNodeId) {
      results[currentId] = {
        nodeId: currentId,
        inletTemp: currentNode.temperature || 90,
        outletTemp: currentNode.temperature || 90,
        tempDrop: 0,
        heatLoss: 0,
        pressureDrop: 0,
        flowRate: currentNode.flowRate || 100
      }
    }
    
    const outgoingConnections = connectionMap.get(currentId) || []
    
    for (const conn of outgoingConnections) {
      const targetNode = nodeMap.get(conn.to)
      if (!targetNode) continue
      
      if (!visited.has(conn.to)) {
        queue.push(conn.to)
      }
      
      const currentResult = results[currentId]
      if (!currentResult) continue
      
      const heatResult = calculateTemperatureDrop({
        inletTemp: currentResult.outletTemp,
        flowRate: conn.flowRate || currentResult.flowRate,
        pipeLength: conn.length,
        ambientTemp: 10,
        pipeDiameter: conn.diameter,
        insulationThickness: conn.insulation
      })
      
      const pressureResult = calculatePressureDrop({
        flowRate: conn.flowRate || currentResult.flowRate,
        pipeLength: conn.length,
        pipeDiameter: conn.diameter
      })
      
      results[conn.to] = {
        nodeId: conn.to,
        inletTemp: currentResult.outletTemp,
        outletTemp: heatResult.outletTemp,
        tempDrop: heatResult.tempDrop,
        heatLoss: heatResult.heatLoss,
        pressureDrop: pressureResult.pressureDrop,
        flowRate: conn.flowRate || currentResult.flowRate,
        connectionId: conn.id
      }
      
      await new Promise(resolve => setTimeout(resolve, 0))
    }
  }
  
  return results
}

export function calculateHeatBalance(nodes, simulationResults) {
  const sourceNodes = nodes.filter(n => n.type === 'source')
  const endNodes = nodes.filter(n => n.type === 'end')
  
  let totalSupplyHeat = 0
  let totalHeatLoss = 0
  let totalEndHeat = 0
  
  for (const source of sourceNodes) {
    const result = simulationResults[source.id]
    if (result) {
      totalSupplyHeat += result.flowRate * 1000 * 4200 * 
        (source.temperature - 20) / 3600000
    }
  }
  
  for (const end of endNodes) {
    const result = simulationResults[end.id]
    if (result) {
      totalHeatLoss += result.heatLoss
      totalEndHeat += result.flowRate * 1000 * 4200 * 
        (result.outletTemp - 20) / 3600000
    }
  }
  
  const balanceRatio = totalSupplyHeat > 0 
    ? (totalEndHeat / totalSupplyHeat) * 100 
    : 0
  
  return {
    totalSupplyHeat: parseFloat(totalSupplyHeat.toFixed(4)),
    totalHeatLoss: parseFloat(totalHeatLoss.toFixed(4)),
    totalEndHeat: parseFloat(totalEndHeat.toFixed(4)),
    balanceRatio: parseFloat(balanceRatio.toFixed(2))
  }
}

export function calculateNodeHeatLoad(node, supplyTemp, returnTemp = 40) {
  const { flowRate = 0, heatCapacity = 4200, density = 1000 } = node
  
  const massFlowRate = flowRate * density / 3600
  const heatLoad = massFlowRate * heatCapacity * (supplyTemp - returnTemp) / 1000
  
  return {
    heatLoad: parseFloat(heatLoad.toFixed(4)),
    powerKW: parseFloat((heatLoad / 3600).toFixed(4))
  }
}

export default {
  calculateTemperatureDrop,
  calculatePressureDrop,
  asyncHeatConductionSimulation,
  calculateHeatBalance,
  calculateNodeHeatLoad
}
