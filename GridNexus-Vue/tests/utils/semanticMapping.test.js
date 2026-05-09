import { describe, it, expect, beforeEach } from 'vitest'
import semanticMapper, { SEMANTIC_TYPES, DATA_CATEGORIES, MEASUREMENT_UNITS } from '@/utils/semanticMapping.js'

describe('SemanticMapper - 语义映射模块', () => {

  describe('基础功能测试', () => {
    it('应该正确初始化默认映射规则', () => {
      const mappings = semanticMapper.listMappings()
      expect(mappings.length).toBeGreaterThan(0)
    })

    it('应该包含正确的语义类型定义', () => {
      expect(SEMANTIC_TYPES.DISPATCH_CENTER).toBe('dispatch_center')
      expect(SEMANTIC_TYPES.SUBSTATION).toBe('substation')
      expect(SEMANTIC_TYPES.TRANSFORMER).toBe('transformer')
    })

    it('应该包含正确的数据类别定义', () => {
      expect(DATA_CATEGORIES.REAL_TIME).toBe('real_time')
      expect(DATA_CATEGORIES.HISTORICAL).toBe('historical')
      expect(DATA_CATEGORIES.COMMAND).toBe('command')
    })

    it('应该包含正确的计量单位定义', () => {
      expect(MEASUREMENT_UNITS.MW).toBe('MW')
      expect(MEASUREMENT_UNITS.KV).toBe('kV')
      expect(MEASUREMENT_UNITS.HZ).toBe('Hz')
    })
  })

  describe('调度中心 -> 变电站映射测试', () => {
    it('应该正确映射调度负荷数据', () => {
      const dispatchData = {
        dispatchLoad: 3850,
        dispatchVoltage: 220,
        dispatchFrequency: 50.02
      }

      const result = semanticMapper.map(
        SEMANTIC_TYPES.DISPATCH_CENTER,
        SEMANTIC_TYPES.SUBSTATION,
        DATA_CATEGORIES.REAL_TIME,
        dispatchData
      )

      expect(result.data.receivedLoad).toBe(3850)
      expect(result.data.referenceVoltage).toBe(220)
      expect(result.data.targetFrequency).toBe(50.02)
      expect(result.errors.length).toBe(0)
    })

    it('应该正确添加映射后的单位信息', () => {
      const dispatchData = {
        dispatchLoad: 3850,
        dispatchVoltage: 220
      }

      const result = semanticMapper.map(
        SEMANTIC_TYPES.DISPATCH_CENTER,
        SEMANTIC_TYPES.SUBSTATION,
        DATA_CATEGORIES.REAL_TIME,
        dispatchData
      )

      expect(result.data.receivedLoad_unit).toBe('MW')
      expect(result.data.referenceVoltage_unit).toBe('kV')
    })

    it('应该校验频率范围 - 合法值', () => {
      const dispatchData = {
        dispatchLoad: 3850,
        dispatchVoltage: 220,
        dispatchFrequency: 50.0
      }

      const result = semanticMapper.map(
        SEMANTIC_TYPES.DISPATCH_CENTER,
        SEMANTIC_TYPES.SUBSTATION,
        DATA_CATEGORIES.REAL_TIME,
        dispatchData
      )

      expect(result.errors.length).toBe(0)
    })

    it('应该校验频率范围 - 非法值应被标记', () => {
      const dispatchData = {
        dispatchLoad: 3850,
        dispatchVoltage: 220,
        dispatchFrequency: 48.0
      }

      const result = semanticMapper.map(
        SEMANTIC_TYPES.DISPATCH_CENTER,
        SEMANTIC_TYPES.SUBSTATION,
        DATA_CATEGORIES.REAL_TIME,
        dispatchData
      )

      expect(result.errors.length).toBeGreaterThan(0)
      expect(result.errors[0].field).toBe('dispatchFrequency')
    })
  })

  describe('变电站 -> 调度中心映射测试', () => {
    it('应该正确映射变电站上报数据', () => {
      const substationData = {
        actualLoad: 920,
        transformerStatus: 0,
        busVoltage: 221.5,
        frequency: 50.01
      }

      const result = semanticMapper.map(
        SEMANTIC_TYPES.SUBSTATION,
        SEMANTIC_TYPES.DISPATCH_CENTER,
        DATA_CATEGORIES.REAL_TIME,
        substationData
      )

      expect(result.data.reportedLoad).toBe(920)
      expect(result.data.measuredVoltage).toBe(221.5)
      expect(result.data.measuredFrequency).toBe(50.01)
    })

    it('应该正确转换变压器状态', () => {
      const substationData = {
        actualLoad: 920,
        transformerStatus: 1,
        busVoltage: 221.5,
        frequency: 50.01
      }

      const result = semanticMapper.map(
        SEMANTIC_TYPES.SUBSTATION,
        SEMANTIC_TYPES.DISPATCH_CENTER,
        DATA_CATEGORIES.REAL_TIME,
        substationData
      )

      expect(result.data.transformerState).toBe('warning')
    })

    it('应该校验电压值 - 非法值应被拒绝', () => {
      const substationData = {
        actualLoad: 920,
        transformerStatus: 0,
        busVoltage: -10,
        frequency: 50.01
      }

      const result = semanticMapper.map(
        SEMANTIC_TYPES.SUBSTATION,
        SEMANTIC_TYPES.DISPATCH_CENTER,
        DATA_CATEGORIES.REAL_TIME,
        substationData
      )

      expect(result.errors.length).toBeGreaterThan(0)
    })
  })

  describe('变压器 -> 变电站映射测试', () => {
    it('应该正确映射变压器功率数据', () => {
      const transformerData = {
        activePower: 450,
        reactivePower: 120,
        apparentPower: 465,
        tapPosition: 5,
        temperature: 65
      }

      const result = semanticMapper.map(
        SEMANTIC_TYPES.TRANSFORMER,
        SEMANTIC_TYPES.SUBSTATION,
        DATA_CATEGORIES.REAL_TIME,
        transformerData
      )

      expect(result.data.transformerActivePower).toBe(450)
      expect(result.data.transformerReactivePower).toBe(120)
      expect(result.data.transformerApparentPower).toBe(465)
      expect(result.data.transformerTap).toBe(5)
      expect(result.data.transformerTemp).toBe(65)
    })

    it('应该包含正确的单位信息', () => {
      const transformerData = {
        activePower: 450,
        reactivePower: 120,
        apparentPower: 465
      }

      const result = semanticMapper.map(
        SEMANTIC_TYPES.TRANSFORMER,
        SEMANTIC_TYPES.SUBSTATION,
        DATA_CATEGORIES.REAL_TIME,
        transformerData
      )

      expect(result.data.transformerActivePower_unit).toBe('MW')
      expect(result.data.transformerReactivePower_unit).toBe('MVAR')
      expect(result.data.transformerApparentPower_unit).toBe('MVA')
    })
  })

  describe('映射注册与查询测试', () => {
    it('应该能注册新的映射规则', () => {
      const initialCount = semanticMapper.listMappings().length

      semanticMapper.registerMapping({
        source: SEMANTIC_TYPES.GENERATOR,
        target: SEMANTIC_TYPES.SUBSTATION,
        category: DATA_CATEGORIES.REAL_TIME,
        fields: {
          outputPower: {
            targetField: 'generatorOutput',
            unit: 'MW',
            transform: (val) => val * 0.95,
            validation: (val) => val >= 0
          }
        }
      })

      expect(semanticMapper.listMappings().length).toBe(initialCount + 1)
    })

    it('应该能获取指定映射', () => {
      const mapping = semanticMapper.getMapping(
        SEMANTIC_TYPES.DISPATCH_CENTER,
        SEMANTIC_TYPES.SUBSTATION,
        DATA_CATEGORIES.REAL_TIME
      )

      expect(mapping).toBeDefined()
      expect(mapping.source).toBe(SEMANTIC_TYPES.DISPATCH_CENTER)
      expect(mapping.target).toBe(SEMANTIC_TYPES.SUBSTATION)
    })
  })

  describe('数据校验测试', () => {
    it('应该能验证有效数据', () => {
      const validData = {
        dispatchLoad: 3850,
        dispatchVoltage: 220,
        dispatchFrequency: 50.0
      }

      const result = semanticMapper.validate(
        validData,
        SEMANTIC_TYPES.DISPATCH_CENTER,
        DATA_CATEGORIES.REAL_TIME
      )

      expect(result.valid).toBe(true)
      expect(result.errors.length).toBe(0)
    })

    it('应该能验证无效数据', () => {
      const invalidData = {
        dispatchLoad: -100,
        dispatchVoltage: 2000,
        dispatchFrequency: 60.0
      }

      const result = semanticMapper.validate(
        invalidData,
        SEMANTIC_TYPES.DISPATCH_CENTER,
        DATA_CATEGORIES.REAL_TIME
      )

      expect(result.valid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
    })
  })

  describe('元数据测试', () => {
    it('应该在映射结果中包含正确的元数据', () => {
      const dispatchData = {
        dispatchLoad: 3850
      }

      const result = semanticMapper.map(
        SEMANTIC_TYPES.DISPATCH_CENTER,
        SEMANTIC_TYPES.SUBSTATION,
        DATA_CATEGORIES.REAL_TIME,
        dispatchData,
        { substationId: 'SS-001' }
      )

      expect(result.metadata.source).toBe(SEMANTIC_TYPES.DISPATCH_CENTER)
      expect(result.metadata.target).toBe(SEMANTIC_TYPES.SUBSTATION)
      expect(result.metadata.category).toBe(DATA_CATEGORIES.REAL_TIME)
      expect(result.metadata.context.substationId).toBe('SS-001')
      expect(result.metadata.timestamp).toBeDefined()
    })
  })
})
