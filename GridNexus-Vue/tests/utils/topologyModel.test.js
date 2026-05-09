import { describe, it, expect, beforeEach } from 'vitest'
import { PowerNode, PowerConnection } from '@/utils/topologyModel.js'
import { SEMANTIC_TYPES } from '@/utils/semanticMapping.js'

describe('AsyncTopologyModel - 异步拓扑模型', () => {

  describe('PowerNode - 电力节点类', () => {
    it('应该正确创建节点实例', () => {
      const node = new PowerNode('node-1', SEMANTIC_TYPES.SUBSTATION, '测试变电站', 1000)

      expect(node.id).toBe('node-1')
      expect(node.type).toBe(SEMANTIC_TYPES.SUBSTATION)
      expect(node.name).toBe('测试变电站')
      expect(node.capacity).toBe(1000)
      expect(node.currentLoad).toBe(0)
      expect(node.status).toBe('normal')
    })

    it('应该正确计算负载率', () => {
      const node = new PowerNode('node-1', SEMANTIC_TYPES.SUBSTATION, '测试变电站', 1000)
      node.currentLoad = 500

      expect(node.getLoadRatio()).toBe(0.5)
    })

    it('应该正确判断过载状态', () => {
      const node = new PowerNode('node-1', SEMANTIC_TYPES.SUBSTATION, '测试变电站', 1000)

      node.currentLoad = 850
      expect(node.isOverloaded()).toBe(false)

      node.currentLoad = 950
      expect(node.isOverloaded()).toBe(true)
    })

    it('应该正确计算可用容量', () => {
      const node = new PowerNode('node-1', SEMANTIC_TYPES.SUBSTATION, '测试变电站', 1000)
      node.currentLoad = 700

      expect(node.getAvailableCapacity()).toBe(300)
    })

    it('应该正确处理零容量情况', () => {
      const node = new PowerNode('node-1', SEMANTIC_TYPES.SUBSTATION, '测试变电站', 0)
      node.currentLoad = 100

      expect(node.getLoadRatio()).toBe(0)
      expect(node.getAvailableCapacity()).toBe(0)
    })
  })

  describe('PowerConnection - 电力连接类', () => {
    it('应该正确创建连接实例', () => {
      const conn = new PowerConnection('conn-1', 'node-1', 'node-2', 500, 0.01)

      expect(conn.id).toBe('conn-1')
      expect(conn.from).toBe('node-1')
      expect(conn.to).toBe('node-2')
      expect(conn.capacity).toBe(500)
      expect(conn.impedance).toBe(0.01)
      expect(conn.currentFlow).toBe(0)
      expect(conn.status).toBe('active')
    })

    it('应该正确计算流量比例', () => {
      const conn = new PowerConnection('conn-1', 'node-1', 'node-2', 500, 0.01)
      conn.currentFlow = 250

      expect(conn.getFlowRatio()).toBe(0.5)
    })

    it('应该正确处理零容量情况', () => {
      const conn = new PowerConnection('conn-1', 'node-1', 'node-2', 0, 0.01)
      conn.currentFlow = 100

      expect(conn.getFlowRatio()).toBe(0)
    })
  })
})
