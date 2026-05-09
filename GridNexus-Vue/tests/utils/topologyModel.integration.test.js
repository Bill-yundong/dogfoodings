import { describe, it, expect, beforeEach, vi } from 'vitest'
import topologyModel, { PowerNode, PowerConnection } from '@/utils/topologyModel.js'
import { SEMANTIC_TYPES } from '@/utils/semanticMapping.js'

describe('AsyncTopologyModel - 集成测试', () => {
  beforeEach(() => {
    topologyModel.nodes.clear()
    topologyModel.connections.clear()
    topologyModel.processingQueue = []
    topologyModel.isProcessing = false
  })

  describe('节点管理测试', () => {
    it('应该正确添加节点', () => {
      const node = new PowerNode('DC-001', SEMANTIC_TYPES.DISPATCH_CENTER, '调度中心', 5000)
      topologyModel.addNode(node)

      expect(topologyModel.nodes.size).toBe(1)
      expect(topologyModel.getNode('DC-001')).toBe(node)
    })

    it('应该正确移除节点及其关联连接', () => {
      const node1 = new PowerNode('DC-001', SEMANTIC_TYPES.DISPATCH_CENTER, '调度中心', 5000)
      const node2 = new PowerNode('SS-001', SEMANTIC_TYPES.SUBSTATION, '变电站', 1000)
      const conn = new PowerConnection('conn-1', 'DC-001', 'SS-001', 1200, 0.01)

      topologyModel.addNode(node1)
      topologyModel.addNode(node2)
      topologyModel.addConnection(conn)

      topologyModel.removeNode('DC-001')

      expect(topologyModel.nodes.size).toBe(1)
      expect(topologyModel.connections.size).toBe(0)
    })

    it('应该正确获取节点的关联连接', () => {
      const node1 = new PowerNode('DC-001', SEMANTIC_TYPES.DISPATCH_CENTER, '调度中心', 5000)
      const node2 = new PowerNode('SS-001', SEMANTIC_TYPES.SUBSTATION, '变电站', 1000)
      const conn1 = new PowerConnection('conn-1', 'DC-001', 'SS-001', 1200, 0.01)

      topologyModel.addNode(node1)
      topologyModel.addNode(node2)
      topologyModel.addConnection(conn1)

      const connections = topologyModel.getConnectionsForNode('DC-001')
      expect(connections.length).toBe(1)
      expect(connections[0].id).toBe('conn-1')
    })
  })

  describe('连接管理测试', () => {
    it('应该正确添加连接并建立父子关系', () => {
      const node1 = new PowerNode('DC-001', SEMANTIC_TYPES.DISPATCH_CENTER, '调度中心', 5000)
      const node2 = new PowerNode('SS-001', SEMANTIC_TYPES.SUBSTATION, '变电站', 1000)
      const conn = new PowerConnection('conn-1', 'DC-001', 'SS-001', 1200, 0.01)

      topologyModel.addNode(node1)
      topologyModel.addNode(node2)
      topologyModel.addConnection(conn)

      expect(topologyModel.connections.size).toBe(1)
      expect(node1.children).toContain('SS-001')
      expect(node2.parent).toBe('DC-001')
    })

    it('应该正确移除连接', () => {
      const conn = new PowerConnection('conn-1', 'DC-001', 'SS-001', 1200, 0.01)
      topologyModel.addConnection(conn)

      topologyModel.removeConnection('conn-1')

      expect(topologyModel.connections.size).toBe(0)
    })
  })

  describe('异步负荷更新测试', () => {
    it('应该正确异步更新节点负荷', async () => {
      const node = new PowerNode('SS-001', SEMANTIC_TYPES.SUBSTATION, '变电站', 1000)
      node.currentLoad = 500
      topologyModel.addNode(node)

      const updates = [
        { nodeId: 'SS-001', load: 700 }
      ]

      await topologyModel.updateLoadsAsync(updates)

      expect(node.currentLoad).toBe(700)
    })

    it('应该正确向上传播负荷变化', async () => {
      const parentNode = new PowerNode('DC-001', SEMANTIC_TYPES.DISPATCH_CENTER, '调度中心', 5000)
      const childNode = new PowerNode('SS-001', SEMANTIC_TYPES.SUBSTATION, '变电站', 1000)
      parentNode.currentLoad = 1000
      childNode.currentLoad = 500

      topologyModel.addNode(parentNode)
      topologyModel.addNode(childNode)
      parentNode.children.push('SS-001')
      childNode.parent = 'DC-001'

      const updates = [
        { nodeId: 'SS-001', load: 700 }
      ]

      await topologyModel.updateLoadsAsync(updates)

      expect(childNode.currentLoad).toBe(700)
      expect(parentNode.currentLoad).toBe(1200)
    })
  })

  describe('功率流计算测试', () => {
    it('应该正确计算功率流', async () => {
      const node1 = new PowerNode('DC-001', SEMANTIC_TYPES.DISPATCH_CENTER, '调度中心', 5000)
      const node2 = new PowerNode('SS-001', SEMANTIC_TYPES.SUBSTATION, '变电站', 1000)
      const conn = new PowerConnection('conn-1', 'DC-001', 'SS-001', 1200, 0.01)

      node1.currentLoad = 1000
      node2.currentLoad = 800

      topologyModel.addNode(node1)
      topologyModel.addNode(node2)
      topologyModel.addConnection(conn)

      const flows = await topologyModel.queueCalculateFlow()

      expect(flows.length).toBe(1)
      expect(flows[0].flow).toBe(800)
      expect(flows[0].ratio).toBeCloseTo(800 / 1200)
    })

    it('应该支持针对特定节点计算功率流', async () => {
      const node1 = new PowerNode('DC-001', SEMANTIC_TYPES.DISPATCH_CENTER, '调度中心', 5000)
      const node2 = new PowerNode('SS-001', SEMANTIC_TYPES.SUBSTATION, '变电站', 1000)
      const node3 = new PowerNode('SS-002', SEMANTIC_TYPES.SUBSTATION, '变电站2', 1000)
      const conn1 = new PowerConnection('conn-1', 'DC-001', 'SS-001', 1200, 0.01)
      const conn2 = new PowerConnection('conn-2', 'DC-001', 'SS-002', 1200, 0.01)

      node2.currentLoad = 800
      node3.currentLoad = 600

      topologyModel.addNode(node1)
      topologyModel.addNode(node2)
      topologyModel.addNode(node3)
      topologyModel.addConnection(conn1)
      topologyModel.addConnection(conn2)

      const flows = await topologyModel.queueCalculateFlow('SS-001')

      expect(flows.length).toBe(1)
      expect(flows[0].to).toBe('SS-001')
    })
  })

  describe('扩容决策分析测试', () => {
    it('应该正确识别过载节点', async () => {
      const node = new PowerNode('SS-001', SEMANTIC_TYPES.SUBSTATION, '变电站', 1000)
      node.currentLoad = 950
      topologyModel.addNode(node)

      const plan = await topologyModel.queueExpansionPlan({ targetRatio: 0.8 })

      expect(plan.overloadedNodes.length).toBe(1)
      expect(plan.overloadedNodes[0].nodeId).toBe('SS-001')
      expect(plan.overloadedNodes[0].currentRatio).toBeCloseTo(0.95)
    })

    it('应该生成正确的扩容建议', async () => {
      const node = new PowerNode('SS-001', SEMANTIC_TYPES.SUBSTATION, '变电站', 1000)
      node.currentLoad = 950
      topologyModel.addNode(node)

      const plan = await topologyModel.queueExpansionPlan({ targetRatio: 0.8 })

      expect(plan.recommendations.length).toBe(1)
      expect(plan.recommendations[0].recommendedCapacity).toBe(1188)
      expect(plan.recommendations[0].expansionAmount).toBeGreaterThan(0)
    })

    it('应该正确计算扩容成本', () => {
      const cost = topologyModel.calculateCost(SEMANTIC_TYPES.SUBSTATION, 100)
      expect(cost).toBe(3000000)
    })

    it('应该正确设置扩容优先级', async () => {
      const node1 = new PowerNode('SS-001', SEMANTIC_TYPES.SUBSTATION, '变电站1', 1000)
      const node2 = new PowerNode('SS-002', SEMANTIC_TYPES.SUBSTATION, '变电站2', 1000)
      const node3 = new PowerNode('SS-003', SEMANTIC_TYPES.SUBSTATION, '变电站3', 1000)

      node1.currentLoad = 970
      node2.currentLoad = 920
      node3.currentLoad = 850

      topologyModel.addNode(node1)
      topologyModel.addNode(node2)
      topologyModel.addNode(node3)

      const plan = await topologyModel.queueExpansionPlan({ targetRatio: 0.8 })

      const criticalNode = plan.recommendations.find(r => r.priority === 'critical')
      const highNode = plan.recommendations.find(r => r.priority === 'high')
      const mediumNode = plan.recommendations.find(r => r.priority === 'medium')

      expect(criticalNode.nodeId).toBe('SS-001')
      expect(highNode.nodeId).toBe('SS-002')
      expect(mediumNode.nodeId).toBe('SS-003')
    })
  })

  describe('最短路径查找测试', () => {
    it('应该正确找到两点间的最短路径', () => {
      const node1 = new PowerNode('A', SEMANTIC_TYPES.BUS, '节点A', 100)
      const node2 = new PowerNode('B', SEMANTIC_TYPES.BUS, '节点B', 100)
      const node3 = new PowerNode('C', SEMANTIC_TYPES.BUS, '节点C', 100)
      const node4 = new PowerNode('D', SEMANTIC_TYPES.BUS, '节点D', 100)

      const conn1 = new PowerConnection('conn-1', 'A', 'B', 100, 0.01)
      const conn2 = new PowerConnection('conn-2', 'B', 'C', 100, 0.01)
      const conn3 = new PowerConnection('conn-3', 'C', 'D', 100, 0.01)

      topologyModel.addNode(node1)
      topologyModel.addNode(node2)
      topologyModel.addNode(node3)
      topologyModel.addNode(node4)
      topologyModel.addConnection(conn1)
      topologyModel.addConnection(conn2)
      topologyModel.addConnection(conn3)

      const path = topologyModel.findShortestPath('A', 'D')

      expect(path).toEqual(['A', 'B', 'C', 'D'])
    })

    it('应该对不连通的节点返回null', () => {
      const node1 = new PowerNode('A', SEMANTIC_TYPES.BUS, '节点A', 100)
      const node2 = new PowerNode('B', SEMANTIC_TYPES.BUS, '节点B', 100)

      topologyModel.addNode(node1)
      topologyModel.addNode(node2)

      const path = topologyModel.findShortestPath('A', 'B')

      expect(path).toBeNull()
    })
  })

  describe('拓扑快照测试', () => {
    it('应该生成正确的拓扑快照', () => {
      const node = new PowerNode('SS-001', SEMANTIC_TYPES.SUBSTATION, '变电站', 1000)
      node.currentLoad = 800
      topologyModel.addNode(node)

      const conn = new PowerConnection('conn-1', 'DC-001', 'SS-001', 1200, 0.01)
      conn.currentFlow = 800
      topologyModel.addConnection(conn)

      const snapshot = topologyModel.getTopologySnapshot()

      expect(snapshot.nodes.length).toBe(1)
      expect(snapshot.nodes[0].id).toBe('SS-001')
      expect(snapshot.nodes[0].loadRatio).toBe(0.8)
      expect(snapshot.connections.length).toBe(1)
      expect(snapshot.timestamp).toBeDefined()
    })
  })

  describe('事件监听测试', () => {
    it('应该正确注册和触发事件', () => {
      let eventFired = false
      let receivedNode = null

      topologyModel.on('node:added', (node) => {
        eventFired = true
        receivedNode = node
      })

      const node = new PowerNode('SS-001', SEMANTIC_TYPES.SUBSTATION, '变电站', 1000)
      topologyModel.addNode(node)

      expect(eventFired).toBe(true)
      expect(receivedNode.id).toBe('SS-001')
    })

    it('应该正确注销事件监听', () => {
      let eventCount = 0

      const handler = () => {
        eventCount++
      }

      topologyModel.on('node:added', handler)
      topologyModel.off('node:added', handler)

      const node = new PowerNode('SS-001', SEMANTIC_TYPES.SUBSTATION, '变电站', 1000)
      topologyModel.addNode(node)

      expect(eventCount).toBe(0)
    })
  })
})
