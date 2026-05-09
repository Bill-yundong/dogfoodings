import { describe, it, expect } from 'vitest'
import { generateMockTopology, generateHistoricalSnapshots, generateDispatchData, generateSubstationReport, generateLoadTimeSeries } from '@/utils/mockData.js'

describe('MockData - 模拟数据生成器', () => {
  describe('generateMockTopology - 拓扑数据生成', () => {
    it('应该生成正确的拓扑结构', () => {
      const { nodes, connections } = generateMockTopology()

      expect(nodes.length).toBeGreaterThan(0)
      expect(connections.length).toBeGreaterThan(0)
    })

    it('应该包含调度中心节点', () => {
      const { nodes } = generateMockTopology()
      const dispatchCenter = nodes.find(n => n.type === 'dispatch_center')

      expect(dispatchCenter).toBeDefined()
      expect(dispatchCenter.name).toContain('调度中心')
    })

    it('应该包含变电站节点', () => {
      const { nodes } = generateMockTopology()
      const substations = nodes.filter(n => n.type === 'substation')

      expect(substations.length).toBe(5)
    })

    it('应该包含变压器节点', () => {
      const { nodes } = generateMockTopology()
      const transformers = nodes.filter(n => n.type === 'transformer')

      expect(transformers.length).toBe(10)
    })

    it('每个节点应该有正确的属性', () => {
      const { nodes } = generateMockTopology()

      nodes.forEach(node => {
        expect(node.id).toBeDefined()
        expect(node.type).toBeDefined()
        expect(node.name).toBeDefined()
        expect(node.capacity).toBeGreaterThanOrEqual(0)
        expect(node.currentLoad).toBeGreaterThanOrEqual(0)
        expect(node.parent).toBeDefined()
      })
    })

    it('每个连接应该有正确的属性', () => {
      const { connections } = generateMockTopology()

      connections.forEach(conn => {
        expect(conn.id).toBeDefined()
        expect(conn.from).toBeDefined()
        expect(conn.to).toBeDefined()
        expect(conn.capacity).toBeGreaterThan(0)
        expect(conn.impedance).toBeGreaterThanOrEqual(0)
      })
    })
  })

  describe('generateHistoricalSnapshots - 历史快照生成', () => {
    it('应该生成指定天数的快照数据', () => {
      const days = 3
      const snapshots = generateHistoricalSnapshots(days)

      const expectedCount = (days * 24 * 60) / 15
      expect(snapshots.length).toBe(expectedCount * 5)
    })

    it('每个快照应该包含正确的字段', () => {
      const snapshots = generateHistoricalSnapshots(1)

      snapshots.forEach(snapshot => {
        expect(snapshot.substationId).toBeDefined()
        expect(snapshot.type).toBe('load_snapshot')
        expect(snapshot.timestamp).toBeDefined()
        expect(snapshot.data).toBeDefined()
        expect(snapshot.data.load).toBeGreaterThan(0)
        expect(snapshot.data.capacity).toBeGreaterThan(0)
        expect(snapshot.data.ratio).toBeDefined()
      })
    })

    it('快照数据应该反映时间变化', () => {
      const snapshots = generateHistoricalSnapshots(1)

      const morningSnapshot = snapshots.find(s => {
        const hour = new Date(s.timestamp).getHours()
        return hour === 10
      })

      const nightSnapshot = snapshots.find(s => {
        const hour = new Date(s.timestamp).getHours()
        return hour === 2
      })

      expect(morningSnapshot.data.load).toBeGreaterThan(nightSnapshot.data.load)
    })
  })

  describe('generateDispatchData - 调度数据生成', () => {
    it('应该生成正确的调度数据', () => {
      const data = generateDispatchData()

      expect(data.dispatchLoad).toBeDefined()
      expect(data.dispatchVoltage).toBeDefined()
      expect(data.dispatchFrequency).toBeDefined()
      expect(data.timestamp).toBeDefined()
    })

    it('调度数据应该在合理范围内', () => {
      const data = generateDispatchData()

      expect(data.dispatchLoad).toBeGreaterThan(3000)
      expect(data.dispatchLoad).toBeLessThan(5000)
      expect(data.dispatchVoltage).toBeGreaterThan(200)
      expect(data.dispatchVoltage).toBeLessThan(250)
      expect(data.dispatchFrequency).toBeGreaterThan(49)
      expect(data.dispatchFrequency).toBeLessThan(51)
    })
  })

  describe('generateSubstationReport - 变电站报告生成', () => {
    it('应该为指定变电站生成报告', () => {
      const report = generateSubstationReport('SS-001')

      expect(report.actualLoad).toBeDefined()
      expect(report.transformerStatus).toBeDefined()
      expect(report.busVoltage).toBeDefined()
      expect(report.frequency).toBeDefined()
      expect(report.timestamp).toBeDefined()
    })

    it('报告数据应该在合理范围内', () => {
      const report = generateSubstationReport('SS-001')

      expect(report.actualLoad).toBeGreaterThan(0)
      expect(report.busVoltage).toBeGreaterThan(200)
      expect(report.busVoltage).toBeLessThan(250)
      expect(report.frequency).toBeGreaterThan(49)
      expect(report.frequency).toBeLessThan(51)
    })
  })

  describe('generateLoadTimeSeries - 负荷时序数据生成', () => {
    it('应该生成指定小时数的数据', () => {
      const hours = 12
      const data = generateLoadTimeSeries(hours)

      expect(data.length).toBe(hours)
    })

    it('每个数据点应该包含正确的字段', () => {
      const data = generateLoadTimeSeries(24)

      data.forEach(point => {
        expect(point.timestamp).toBeDefined()
        expect(point.time).toBeDefined()
        expect(point.load).toBeGreaterThan(0)
        expect(point.predicted).toBeGreaterThan(0)
        expect(point.capacity).toBeGreaterThan(0)
      })
    })

    it('负荷数据应该反映日内变化规律', () => {
      const data = generateLoadTimeSeries(24)

      const morningPeak = data.find(d => d.time === '10:00')
      const nightLow = data.find(d => d.time === '03:00')

      expect(morningPeak.load).toBeGreaterThan(nightLow.load)
    })

    it('预测值应该接近实际值', () => {
      const data = generateLoadTimeSeries(24)

      data.forEach(point => {
        const ratio = point.predicted / point.load
        expect(ratio).toBeGreaterThan(0.9)
        expect(ratio).toBeLessThan(1.2)
      })
    })
  })
})
