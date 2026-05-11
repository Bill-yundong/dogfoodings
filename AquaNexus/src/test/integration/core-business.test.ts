import { describe, it, expect, beforeEach, vi } from 'vitest'
import { WaterQualityCalculator, SpatialInterpolator, ChemicalDriftSimulator, HydrodynamicFieldGenerator } from '../../models/HydrodynamicSemanticModel'
import type { WaterQualityParam, MonitoringPoint, ChemicalDriftTrajectory, DispatchCommand } from '../../types/hydrodynamics'

describe('核心业务场景集成测试', () => {
  describe('场景1: 水质监测与质量评分', () => {
    it('应正确计算正常水质的质量分数', () => {
      const goodQuality: WaterQualityParam = {
        pH: 7.0,
        turbidity: 2.0,
        dissolvedOxygen: 8.0,
        temperature: 20.0,
        conductivity: 500,
        ammoniaNitrogen: 0.1,
        totalPhosphorus: 0.02,
        chemicalOxygenDemand: 5.0,
      }

      const score = WaterQualityCalculator.calculateQualityScore(goodQuality)
      const status = WaterQualityCalculator.getStatusFromScore(score)

      expect(score).toBeGreaterThan(80)
      expect(status).toBe('normal')
    })

    it('应正确识别临界水质状态', () => {
      const poorQuality: WaterQualityParam = {
        pH: 5.5,
        turbidity: 15.0,
        dissolvedOxygen: 3.0,
        temperature: 35.0,
        conductivity: 2000,
        ammoniaNitrogen: 1.5,
        totalPhosphorus: 0.5,
        chemicalOxygenDemand: 25.0,
      }

      const score = WaterQualityCalculator.calculateQualityScore(poorQuality)
      const status = WaterQualityCalculator.getStatusFromScore(score)

      expect(score).toBeLessThan(60)
      expect(status).toBeOneOf(['critical', 'offline'])
    })

    it('应支持多监测点水质插值计算', () => {
      const points: WaterQualityParam[] = [
        { pH: 7.0, turbidity: 2.0, dissolvedOxygen: 8.0, temperature: 20, conductivity: 500, ammoniaNitrogen: 0.1, totalPhosphorus: 0.02, chemicalOxygenDemand: 5 },
        { pH: 7.2, turbidity: 3.0, dissolvedOxygen: 7.5, temperature: 22, conductivity: 550, ammoniaNitrogen: 0.15, totalPhosphorus: 0.03, chemicalOxygenDemand: 6 },
      ]

      const interpolated = WaterQualityCalculator.interpolateQuality(points, [0.5, 0.5])

      expect(interpolated.pH).toBeCloseTo(7.1)
      expect(interpolated.turbidity).toBeCloseTo(2.5)
    })
  })

  describe('场景2: 空间插值与地理计算', () => {
    it('应执行反距离加权插值', () => {
      const target = { x: 5, y: 5, z: 0 }
      const points = [
        { coordinate: { x: 0, y: 0, z: 0 }, value: 100 },
        { coordinate: { x: 10, y: 10, z: 0 }, value: 50 },
      ]

      const result = SpatialInterpolator.inverseDistanceWeighting(target, points)

      expect(result).toBeGreaterThan(50)
      expect(result).toBeLessThan(100)
    })

    it('应执行克里金插值', () => {
      const target = { x: 5, y: 5, z: 0 }
      const points = [
        { coordinate: { x: 0, y: 0, z: 0 }, value: 100 },
        { coordinate: { x: 10, y: 10, z: 0 }, value: 50 },
      ]

      const result = SpatialInterpolator.krigingInterpolation(target, points)

      expect(result).toBeGreaterThan(50)
      expect(result).toBeLessThan(100)
    })
  })

  describe('场景3: 化学漂移轨迹模拟', () => {
    let simulator: ChemicalDriftSimulator

    beforeEach(() => {
      simulator = new ChemicalDriftSimulator()
    })

    it('应模拟污染物在流场中的传播', () => {
      const field = HydrodynamicFieldGenerator.generateEmptyField(
        { x: 10, y: 10, z: 5 },
        100,
        Date.now()
      )

      const trajectory: ChemicalDriftTrajectory = {
        id: 'test-drift',
        chemicalType: '重金属',
        startPoint: { x: 500, y: 500, z: 5 },
        currentPosition: { x: 500, y: 500, z: 5 },
        concentration: 0.8,
        diffusionRate: 0.1,
        velocityVector: { x: 0.5, y: 0.3, z: 0 },
        positions: [{ x: 500, y: 500, z: 5 }],
        timestamps: [Date.now()],
        riskLevel: 'extreme',
      }

      const config = {
        timeSteps: 50,
        diffusionCoefficient: 0.1,
        advectionCoefficient: 1.0,
        decayRate: 0.01,
        boundaryConditions: [],
      }

      const result = simulator.simulate(trajectory, field, config)

      expect(result.positions.length).toBeGreaterThan(trajectory.positions.length)
      expect(result.concentration).toBeLessThanOrEqual(trajectory.concentration)
    })

    it('应根据浓度正确计算风险等级', () => {
      const field = HydrodynamicFieldGenerator.generateEmptyField(
        { x: 10, y: 10, z: 5 },
        100,
        Date.now()
      )

      const lowRiskTrajectory: ChemicalDriftTrajectory = {
        id: 'low-risk',
        chemicalType: '有机物',
        startPoint: { x: 500, y: 500, z: 5 },
        currentPosition: { x: 500, y: 500, z: 5 },
        concentration: 0.1,
        diffusionRate: 0.1,
        velocityVector: { x: 0.5, y: 0.3, z: 0 },
        positions: [{ x: 500, y: 500, z: 5 }],
        timestamps: [Date.now()],
        riskLevel: 'low',
      }

      const config = {
        timeSteps: 10,
        diffusionCoefficient: 0.1,
        advectionCoefficient: 1.0,
        decayRate: 0.001,
        boundaryConditions: [],
      }

      const result = simulator.simulate(lowRiskTrajectory, field, config)
      expect(result.riskLevel).toBe('low')
    })
  })

  describe('场景4: 流体动力学场生成', () => {
    it('应生成空的水动力场结构', () => {
      const field = HydrodynamicFieldGenerator.generateEmptyField(
        { x: 20, y: 20, z: 10 },
        50,
        Date.now()
      )

      expect(field.gridSize.x).toBe(20)
      expect(field.gridSize.y).toBe(20)
      expect(field.gridSize.z).toBe(10)
      expect(field.cellSize).toBe(50)
      expect(field.velocityField.length).toBe(20 * 20 * 10 * 3)
    })

    it('应初始化流场速度向量', () => {
      let field = HydrodynamicFieldGenerator.generateEmptyField(
        { x: 10, y: 10, z: 5 },
        100,
        Date.now()
      )

      field = HydrodynamicFieldGenerator.initializeVelocityField(field, {
        x: 1.0,
        y: 0.5,
        z: 0,
      })

      const nonZeroCount = Array.from(field.velocityField).filter((v) => v !== 0).length
      expect(nonZeroCount).toBeGreaterThan(0)
    })

    it('应根据监测点更新流场', () => {
      let field = HydrodynamicFieldGenerator.generateEmptyField(
        { x: 5, y: 5, z: 2 },
        100,
        Date.now()
      )

      const monitoringPoints: MonitoringPoint[] = [
        {
          id: 'mp-1',
          name: '监测点1',
          coordinate: { x: 200, y: 200, z: 50 },
          waterQuality: { pH: 7.0, turbidity: 2.0, dissolvedOxygen: 8.0, temperature: 20, conductivity: 500, ammoniaNitrogen: 0.1, totalPhosphorus: 0.02, chemicalOxygenDemand: 5 },
          velocity: { x: 1.5, y: 0.8, z: 0.1 },
          pressure: 101.3,
          lastUpdate: Date.now(),
          status: 'normal',
        },
      ]

      field = HydrodynamicFieldGenerator.updateFieldFromMonitoringPoints(field, monitoringPoints)

      expect(field).toBeDefined()
    })
  })

  describe('场景5: 调度命令执行', () => {
    it('应验证调度命令数据结构完整性', () => {
      const command: DispatchCommand = {
        id: 'cmd-001',
        type: 'valve_control',
        targetId: 'valve-main-01',
        parameters: { flow: 75, pressure: 80 },
        timestamp: Date.now(),
        issuer: 'operator-test',
        status: 'pending',
        priority: 'high',
      }

      expect(command.id).toBeDefined()
      expect(command.type).toBeOneOf(['valve_control', 'pump_adjustment', 'reservoir_release', 'emergency_shutdown'])
      expect(command.priority).toBeOneOf(['low', 'medium', 'high', 'critical'])
      expect(command.status).toBe('pending')
      expect(command.parameters.flow).toBe(75)
    })

    it('应支持所有类型的调度命令', () => {
      const commandTypes: DispatchCommand['type'][] = [
        'valve_control',
        'pump_adjustment',
        'reservoir_release',
        'emergency_shutdown',
      ]

      commandTypes.forEach((type) => {
        const command: DispatchCommand = {
          id: `cmd-${type}`,
          type,
          targetId: 'target-001',
          parameters: {},
          timestamp: Date.now(),
          issuer: 'system',
          status: 'pending',
          priority: 'medium',
        }
        expect(command.type).toBe(type)
      })
    })
  })
})
