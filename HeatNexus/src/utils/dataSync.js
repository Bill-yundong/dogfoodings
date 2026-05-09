import { saveNodeHistory, getLatestNodeHistory } from './db.js'

export class DataSyncManager {
  constructor(options = {}) {
    this.syncInterval = options.syncInterval || 5000
    this.heartbeatInterval = options.heartbeatInterval || 30000
    this.maxRetries = options.maxRetries || 3
    this.syncTimers = new Map()
    this.onDataUpdate = options.onDataUpdate || null
    this.onSyncStatus = options.onSyncStatus || null
  }

  generateNodeUpdate(node, baseSimulation = null) {
    const now = Date.now()
    const timeVariation = Math.sin(now / 3600000) * 0.1 + 1
    
    let temp, flow, pressure
    
    if (baseSimulation && baseSimulation[node.id]) {
      const sim = baseSimulation[node.id]
      temp = sim.outletTemp * (0.95 + Math.random() * 0.1)
      flow = sim.flowRate * timeVariation
      pressure = (node.pressure || 0.5) * (0.9 + Math.random() * 0.2)
    } else {
      temp = (node.temperature || 60) * (0.9 + Math.random() * 0.2)
      flow = (node.flowRate || 10) * timeVariation
      pressure = (node.pressure || 0.5) * (0.9 + Math.random() * 0.2)
    }

    const heatLoad = flow * 4200 * (temp - 20) / 3600

    return {
      id: `${node.id}-${now}`,
      nodeId: node.id,
      timestamp: now,
      temperature: parseFloat(temp.toFixed(2)),
      flowRate: parseFloat(flow.toFixed(2)),
      pressure: parseFloat(pressure.toFixed(3)),
      heatLoad: parseFloat(heatLoad.toFixed(2)),
      syncStatus: 'synced',
      latency: Math.floor(Math.random() * 100)
    }
  }

  simulateDelay() {
    return new Promise(resolve => {
      setTimeout(resolve, Math.random() * 100 + 20)
    })
  }

  async syncNodeData(node, baseSimulation) {
    const update = this.generateNodeUpdate(node, baseSimulation)
    
    await this.simulateDelay()
    
    await saveNodeHistory([update])
    
    return update
  }

  async batchSyncNodes(nodes, baseSimulation, batchSize = 50) {
    const results = []
    const startTime = Date.now()

    for (let i = 0; i < nodes.length; i += batchSize) {
      const batch = nodes.slice(i, i + batchSize)
      
      const batchPromises = batch.map(node => 
        this.syncNodeData(node, baseSimulation)
      )
      
      const batchResults = await Promise.all(batchPromises)
      results.push(...batchResults)
      
      await new Promise(resolve => setTimeout(resolve, 0))
    }

    const endTime = Date.now()
    
    return {
      count: results.length,
      duration: endTime - startTime,
      updates: results
    }
  }

  startRealTimeSync(nodes, baseSimulation, onUpdate) {
    const timerId = setInterval(async () => {
      try {
        const syncResult = await this.batchSyncNodes(nodes, baseSimulation)
        
        if (this.onDataUpdate) {
          this.onDataUpdate(syncResult)
        }
        
        if (onUpdate) {
          onUpdate(syncResult)
        }
        
        if (this.onSyncStatus) {
          this.onSyncStatus({
            status: 'synced',
            lastSync: Date.now(),
            count: syncResult.count
          })
        }
      } catch (error) {
        console.error('Data sync error:', error)
        
        if (this.onSyncStatus) {
          this.onSyncStatus({
            status: 'error',
            error: error.message,
            lastSync: Date.now()
          })
        }
      }
    }, this.syncInterval)

    return timerId
  }

  stopRealTimeSync(timerId) {
    if (timerId) {
      clearInterval(timerId)
    }
  }

  async calculateAlignmentMetrics(nodeId, referenceData) {
    const history = await getLatestNodeHistory(nodeId, 100)
    
    if (history.length === 0) {
      return {
        nodeId,
        dataPoints: 0,
        alignmentScore: 0,
        avgTempDeviation: 0,
        avgFlowDeviation: 0,
        heatLoadDeviation: 0
      }
    }

    let tempDeviationSum = 0
    let flowDeviationSum = 0
    let heatLoadDeviationSum = 0
    let alignedCount = 0

    for (const record of history) {
      if (referenceData) {
        const refTemp = referenceData.outletTemp
        const refFlow = referenceData.flowRate
        const refHeatLoad = refFlow * 4200 * (refTemp - 20) / 3600

        tempDeviationSum += Math.abs(record.temperature - refTemp)
        flowDeviationSum += Math.abs(record.flowRate - refFlow)
        heatLoadDeviationSum += Math.abs(record.heatLoad - refHeatLoad)

        if (Math.abs(record.temperature - refTemp) < 2 &&
            Math.abs(record.flowRate - refFlow) < refFlow * 0.1) {
          alignedCount++
        }
      } else {
        tempDeviationSum += 0
        flowDeviationSum += 0
        heatLoadDeviationSum += 0
        alignedCount++
      }
    }

    return {
      nodeId,
      dataPoints: history.length,
      alignmentScore: (alignedCount / history.length) * 100,
      avgTempDeviation: parseFloat((tempDeviationSum / history.length).toFixed(4)),
      avgFlowDeviation: parseFloat((flowDeviationSum / history.length).toFixed(4)),
      heatLoadDeviation: parseFloat((heatLoadDeviationSum / history.length).toFixed(4))
    }
  }

  async calculateNetworkAlignment(nodes, simulationResults) {
    const metrics = []
    
    for (const node of nodes) {
      const simData = simulationResults[node.id]
      const nodeMetric = await this.calculateAlignmentMetrics(node.id, simData)
      metrics.push(nodeMetric)
    }

    const avgAlignment = metrics.reduce((sum, m) => sum + m.alignmentScore, 0) / metrics.length
    const avgTempDeviation = metrics.reduce((sum, m) => sum + m.avgTempDeviation, 0) / metrics.length
    const avgFlowDeviation = metrics.reduce((sum, m) => sum + m.avgFlowDeviation, 0) / metrics.length

    return {
      networkMetrics: metrics,
      avgAlignment: parseFloat(avgAlignment.toFixed(2)),
      avgTempDeviation: parseFloat(avgTempDeviation.toFixed(4)),
      avgFlowDeviation: parseFloat(avgFlowDeviation.toFixed(4)),
      timestamp: Date.now()
    }
  }
}

export const createSyncManager = (options = {}) => {
  return new DataSyncManager(options)
}

export default {
  DataSyncManager,
  createSyncManager
}
