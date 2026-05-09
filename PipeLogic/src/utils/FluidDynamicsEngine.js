class FluidDynamicsEngine {
  constructor() {
    this.viscosity = 0.001 // 水的粘度
    this.density = 1000 // 水的密度
  }
  
  async simulate(pipelineData) {
    const pressureData = {}
    
    // 模拟压力分布
    for (const node of pipelineData) {
      // 基础压力
      let pressure = node.pressure
      
      // 模拟压力损失（基于流量和管径）
      const pressureLoss = (node.flow * node.flow) / (node.diameter * node.diameter)
      pressure -= pressureLoss * 0.1
      
      // 随机波动
      pressure += (Math.random() - 0.5) * 0.5
      
      // 确保压力不为负
      pressure = Math.max(0, pressure)
      
      pressureData[node.id] = pressure
    }
    
    // 模拟压力传播
    for (let i = 0; i < 10; i++) {
      for (const node of pipelineData) {
        // 寻找相邻节点
        const neighbors = this.findNeighbors(node, pipelineData)
        if (neighbors.length > 0) {
          // 计算邻居平均压力
          const avgPressure = neighbors.reduce((sum, n) => sum + (pressureData[n.id] || n.pressure), 0) / neighbors.length
          // 压力传播
          pressureData[node.id] = pressureData[node.id] * 0.7 + avgPressure * 0.3
        }
      }
    }
    
    return pressureData
  }
  
  detectLeaks(pressureData, pipelineData) {
    const leakPoints = []
    
    // 检测压力异常点
    for (const node of pipelineData) {
      const pressure = pressureData[node.id] || node.pressure
      
      // 寻找相邻节点
      const neighbors = this.findNeighbors(node, pipelineData)
      if (neighbors.length > 0) {
        // 计算邻居平均压力
        const avgPressure = neighbors.reduce((sum, n) => sum + (pressureData[n.id] || n.pressure), 0) / neighbors.length
        
        // 如果当前节点压力明显低于邻居，可能是渗漏点
        if (pressure < avgPressure - 2) {
          leakPoints.push({
            id: node.id,
            x: node.x,
            y: node.y,
            pressure: pressure,
            neighborPressure: avgPressure,
            intensity: (avgPressure - pressure) / 2 // 渗漏强度
          })
        }
      }
    }
    
    return leakPoints
  }
  
  findNeighbors(node, pipelineData) {
    const neighbors = []
    const threshold = 50 // 邻居距离阈值
    
    for (const otherNode of pipelineData) {
      if (node.id !== otherNode.id) {
        const distance = Math.sqrt(
          Math.pow(node.x - otherNode.x, 2) + Math.pow(node.y - otherNode.y, 2)
        )
        if (distance < threshold) {
          neighbors.push(otherNode)
        }
      }
    }
    
    return neighbors
  }
}

export default FluidDynamicsEngine