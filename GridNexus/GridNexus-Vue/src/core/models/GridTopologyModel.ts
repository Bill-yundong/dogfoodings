import type { GridNode, GridEdge, GridTopology, GridState, GridAlert } from '../types';

export class GridTopologyModel {
  private topology: GridTopology;

  constructor(initialTopology?: GridTopology) {
    this.topology = initialTopology || {
      nodes: [],
      edges: []
    };
  }

  // 添加节点
  addNode(node: GridNode): void {
    if (!this.topology.nodes.some(n => n.id === node.id)) {
      this.topology.nodes.push(node);
    }
  }

  // 添加边
  addEdge(edge: GridEdge): void {
    if (!this.topology.edges.some(e => e.id === edge.id)) {
      this.topology.edges.push(edge);
    }
  }

  // 获取拓扑
  getTopology(): GridTopology {
    return { ...this.topology };
  }

  // 计算节点负载率
  calculateNodeLoadFactor(nodeId: string): number {
    const node = this.topology.nodes.find(n => n.id === nodeId);
    if (!node) return 0;
    return node.currentLoad / node.capacity;
  }

  // 计算边的负载率
  calculateEdgeLoadFactor(edgeId: string): number {
    const edge = this.topology.edges.find(e => e.id === edgeId);
    if (!edge) return 0;
    return edge.currentFlow / edge.capacity;
  }

  // 生成运行状态快照
  generateStateSnapshot(): GridState {
    const totalLoad = this.topology.nodes
      .filter(node => node.type === 'load')
      .reduce((sum, node) => sum + node.currentLoad, 0);

    const totalGeneration = this.topology.nodes
      .filter(node => node.type === 'generator')
      .reduce((sum, node) => sum + node.currentLoad, 0);

    const loads = this.topology.nodes
      .filter(node => node.type === 'load')
      .map(node => node.currentLoad);

    const peakLoad = loads.length > 0 ? Math.max(...loads) : 0;
    const averageLoad = loads.length > 0 ? loads.reduce((sum, load) => sum + load, 0) / loads.length : 0;

    // 生成告警
    const alerts: GridAlert[] = [];
    
    // 检查节点负载
    this.topology.nodes.forEach(node => {
      const loadFactor = this.calculateNodeLoadFactor(node.id);
      if (loadFactor > 0.9) {
        alerts.push({
          id: `alert-${Date.now()}-${node.id}`,
          nodeId: node.id,
          type: 'critical',
          message: `${node.name} 负载率超过 90%`,
          timestamp: new Date().toISOString(),
          resolved: false
        });
      } else if (loadFactor > 0.7) {
        alerts.push({
          id: `alert-${Date.now()}-${node.id}`,
          nodeId: node.id,
          type: 'warning',
          message: `${node.name} 负载率超过 70%`,
          timestamp: new Date().toISOString(),
          resolved: false
        });
      }
    });

    // 检查边的负载
    this.topology.edges.forEach(edge => {
      const loadFactor = this.calculateEdgeLoadFactor(edge.id);
      if (loadFactor > 0.9) {
        alerts.push({
          id: `alert-${Date.now()}-${edge.id}`,
          nodeId: edge.source, // 关联到源节点
          type: 'critical',
          message: `线路 ${edge.source}->${edge.target} 负载率超过 90%`,
          timestamp: new Date().toISOString(),
          resolved: false
        });
      }
    });

    return {
      timestamp: new Date().toISOString(),
      topology: this.getTopology(),
      keyMetrics: {
        totalLoad,
        totalGeneration,
        peakLoad,
        averageLoad
      },
      alerts
    };
  }

  // 模拟拓扑变化
  simulateTopologyChange(): void {
    // 随机更新节点负载
    this.topology.nodes.forEach(node => {
      if (node.type === 'load' || node.type === 'generator') {
        const variation = (Math.random() - 0.5) * 0.2; // ±10%
        node.currentLoad = Math.max(0, Math.min(node.capacity, node.currentLoad * (1 + variation)));
      }
    });

    // 更新边的流量
    this.topology.edges.forEach(edge => {
      const sourceNode = this.topology.nodes.find(n => n.id === edge.source);
      if (sourceNode) {
        // 简单模拟：边的流量与源节点的负载相关
        edge.currentFlow = Math.min(edge.capacity, sourceNode.currentLoad * 0.8);
      }
    });
  }
}
