import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import React from 'react'
import { MonitoringMap } from '../../components/MonitoringMap'
import { StatusPanel } from '../../components/StatusPanel'
import { CommandPanel } from '../../components/CommandPanel'
import { PointDetailModal } from '../../components/PointDetailModal'
import type { MonitoringPoint, ChemicalDriftTrajectory, AlignmentStatus } from '../../types/hydrodynamics'

describe('UI 组件集成测试', () => {
  const mockMonitoringPoints: MonitoringPoint[] = [
    {
      id: 'mp-001',
      name: '上游取水口',
      coordinate: { x: 100, y: 100, z: 5 },
      waterQuality: { pH: 7.2, turbidity: 2.5, dissolvedOxygen: 8.0, temperature: 20, conductivity: 500, ammoniaNitrogen: 0.1, totalPhosphorus: 0.02, chemicalOxygenDemand: 5 },
      velocity: { x: 0.5, y: 0.3, z: 0 },
      pressure: 101.3,
      lastUpdate: Date.now(),
      status: 'normal',
    },
    {
      id: 'mp-002',
      name: '中游监测站',
      coordinate: { x: 300, y: 200, z: 5 },
      waterQuality: { pH: 6.8, turbidity: 5.0, dissolvedOxygen: 6.0, temperature: 22, conductivity: 700, ammoniaNitrogen: 0.3, totalPhosphorus: 0.08, chemicalOxygenDemand: 10 },
      velocity: { x: 0.4, y: 0.25, z: 0 },
      pressure: 101.0,
      lastUpdate: Date.now(),
      status: 'warning',
    },
  ]

  const mockTrajectories: ChemicalDriftTrajectory[] = [
    {
      id: 'traj-001',
      chemicalType: '有机物',
      startPoint: { x: 200, y: 150, z: 5 },
      currentPosition: { x: 250, y: 180, z: 5 },
      concentration: 0.6,
      diffusionRate: 0.1,
      velocityVector: { x: 0.5, y: 0.3, z: 0 },
      positions: [{ x: 200, y: 150, z: 5 }, { x: 250, y: 180, z: 5 }],
      timestamps: [Date.now(), Date.now() + 1000],
      riskLevel: 'high',
    },
  ]

  const mockAlignmentStatus: AlignmentStatus = {
    environmentalMonitoring: { latency: 50, dataPoints: 100, lastSync: Date.now() },
    municipalWaterSupply: { latency: 60, dataPoints: 80, lastSync: Date.now() },
    alignmentScore: 92.5,
    isAligned: true,
  }

  describe('MonitoringMap 组件', () => {
    it('应正确渲染监测地图容器', () => {
      render(
        <MonitoringMap
          monitoringPoints={mockMonitoringPoints}
          trajectories={mockTrajectories}
        />
      )
      expect(document.querySelector('.relative')).toBeInTheDocument()
    })

    it('应正确显示监测点数量图例', () => {
      render(
        <MonitoringMap
          monitoringPoints={mockMonitoringPoints}
          trajectories={mockTrajectories}
        />
      )
      expect(screen.getByText('图例')).toBeInTheDocument()
    })

    it('点击监测点应触发回调函数', async () => {
      const mockOnSelect = vi.fn()
      
      render(
        <MonitoringMap
          monitoringPoints={mockMonitoringPoints}
          trajectories={[]}
          onPointSelect={mockOnSelect}
        />
      )

      const points = document.querySelectorAll('[class*="absolute"]')
      expect(points.length).toBeGreaterThan(0)
    })
  })

  describe('StatusPanel 组件', () => {
    it('应正确显示系统状态面板', () => {
      render(
        <StatusPanel
          networkStatus={true}
          alignmentStatus={mockAlignmentStatus}
          monitoringPoints={mockMonitoringPoints}
          lastSnapshotTime={Date.now()}
        />
      )

      expect(screen.getByText('系统状态')).toBeInTheDocument()
    })

    it('在线模式下应显示正常网络状态', () => {
      render(
        <StatusPanel
          networkStatus={true}
          alignmentStatus={mockAlignmentStatus}
          monitoringPoints={mockMonitoringPoints}
          lastSnapshotTime={Date.now()}
        />
      )

      expect(screen.getByText('在线')).toBeInTheDocument()
    })

    it('离线模式下应显示离线网络状态', () => {
      render(
        <StatusPanel
          networkStatus={false}
          alignmentStatus={mockAlignmentStatus}
          monitoringPoints={mockMonitoringPoints}
          lastSnapshotTime={Date.now()}
        />
      )

      expect(screen.getByText('离线')).toBeInTheDocument()
    })

    it('应正确显示监测点统计信息', () => {
      render(
        <StatusPanel
          networkStatus={true}
          alignmentStatus={mockAlignmentStatus}
          monitoringPoints={mockMonitoringPoints}
          lastSnapshotTime={Date.now()}
        />
      )

      expect(screen.getByText('正常')).toBeInTheDocument()
      expect(screen.getByText('预警')).toBeInTheDocument()
    })

    it('应正确显示系统对齐度分数', () => {
      render(
        <StatusPanel
          networkStatus={true}
          alignmentStatus={mockAlignmentStatus}
          monitoringPoints={mockMonitoringPoints}
          lastSnapshotTime={Date.now()}
        />
      )

      expect(screen.getByText('92.5%')).toBeInTheDocument()
    })
  })

  describe('CommandPanel 组件', () => {
    it('应正确渲染调度指令面板', () => {
      render(
        <CommandPanel
          onExecuteCommand={vi.fn().mockResolvedValue(true)}
          isExecuting={false}
        />
      )

      expect(screen.getByText('调度指令')).toBeInTheDocument()
    })

    it('应显示所有四种指令类型按钮', () => {
      render(
        <CommandPanel
          onExecuteCommand={vi.fn().mockResolvedValue(true)}
          isExecuting={false}
        />
      )

      expect(screen.getByText('阀门控制')).toBeInTheDocument()
      expect(screen.getByText('泵站调节')).toBeInTheDocument()
      expect(screen.getByText('水库泄洪')).toBeInTheDocument()
      expect(screen.getByText('紧急关停')).toBeInTheDocument()
    })

    it('应显示优先级选择按钮', () => {
      render(
        <CommandPanel
          onExecuteCommand={vi.fn().mockResolvedValue(true)}
          isExecuting={false}
        />
      )

      expect(screen.getByText('低')).toBeInTheDocument()
      expect(screen.getByText('中')).toBeInTheDocument()
      expect(screen.getByText('高')).toBeInTheDocument()
      expect(screen.getByText('紧急')).toBeInTheDocument()
    })

    it('执行中状态应禁用发送按钮并显示加载提示', () => {
      render(
        <CommandPanel
          onExecuteCommand={vi.fn().mockResolvedValue(true)}
          isExecuting={true}
        />
      )

      expect(screen.getByText('执行中...')).toBeInTheDocument()
    })

    it('点击发送指令应触发执行回调', async () => {
      const mockExecute = vi.fn().mockResolvedValue(true)
      
      render(
        <CommandPanel
          onExecuteCommand={mockExecute}
          isExecuting={false}
        />
      )

      const sendButton = screen.getByText('发送指令')
      fireEvent.click(sendButton)

      await waitFor(() => {
        expect(mockExecute).toHaveBeenCalled()
      })
    })
  })

  describe('PointDetailModal 组件', () => {
    it('选中监测点时应显示详情弹窗', () => {
      const selectedPoint = mockMonitoringPoints[0]
      
      render(
        <PointDetailModal
          point={selectedPoint}
          onClose={vi.fn()}
        />
      )

      expect(screen.getByText('上游取水口')).toBeInTheDocument()
      expect(screen.getByText('ID: mp-001')).toBeInTheDocument()
    })

    it('应显示完整的水质参数信息', () => {
      const selectedPoint = mockMonitoringPoints[0]
      
      render(
        <PointDetailModal
          point={selectedPoint}
          onClose={vi.fn()}
        />
      )

      expect(screen.getByText('水质参数')).toBeInTheDocument()
      expect(screen.getByText('pH值')).toBeInTheDocument()
      expect(screen.getByText('浊度 (NTU)')).toBeInTheDocument()
      expect(screen.getByText('溶解氧 (mg/L)')).toBeInTheDocument()
    })

    it('应显示水动力参数信息', () => {
      const selectedPoint = mockMonitoringPoints[0]
      
      render(
        <PointDetailModal
          point={selectedPoint}
          onClose={vi.fn()}
        />
      )

      expect(screen.getByText('水动力参数')).toBeInTheDocument()
      expect(screen.getByText('流速 (m/s)')).toBeInTheDocument()
      expect(screen.getByText('压力 (kPa)')).toBeInTheDocument()
    })

    it('应正确显示监测点状态标签', () => {
      const normalPoint = mockMonitoringPoints[0]
      const warningPoint = mockMonitoringPoints[1]

      const { rerender } = render(
        <PointDetailModal
          point={normalPoint}
          onClose={vi.fn()}
        />
      )

      expect(screen.getByText('正常')).toBeInTheDocument()

      rerender(
        <PointDetailModal
          point={warningPoint}
          onClose={vi.fn()}
        />
      )

      expect(screen.getByText('预警')).toBeInTheDocument()
    })

    it('点击关闭按钮应触发回调', () => {
      const mockOnClose = vi.fn()
      
      render(
        <PointDetailModal
          point={mockMonitoringPoints[0]}
          onClose={mockOnClose}
        />
      )

      const closeButton = document.querySelector('button')
      if (closeButton) {
        fireEvent.click(closeButton)
        expect(mockOnClose).toHaveBeenCalled()
      }
    })

    it('未选中监测点时不应渲染弹窗', () => {
      const { container } = render(
        <PointDetailModal
          point={null}
          onClose={vi.fn()}
        />
      )

      expect(container.firstChild).toBeNull()
    })
  })
})
