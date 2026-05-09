export const SEMANTIC_TYPES = {
  DISPATCH_CENTER: 'dispatch_center',
  SUBSTATION: 'substation',
  TRANSFORMER: 'transformer',
  BUS: 'bus',
  FEEDER: 'feeder',
  LOAD: 'load',
  GENERATOR: 'generator'
}

export const DATA_CATEGORIES = {
  REAL_TIME: 'real_time',
  PREDICTIVE: 'predictive',
  HISTORICAL: 'historical',
  COMMAND: 'command',
  ALARM: 'alarm'
}

export const MEASUREMENT_UNITS = {
  MW: 'MW',
  MVA: 'MVA',
  MVAR: 'MVAR',
  KV: 'kV',
  A: 'A',
  HZ: 'Hz',
  DEGREE: '°'
}

class SemanticMapper {
  constructor() {
    this.mappings = new Map()
    this.registry = new Map()
    this.initDefaultMappings()
  }

  initDefaultMappings() {
    this.registerMapping({
      source: SEMANTIC_TYPES.DISPATCH_CENTER,
      target: SEMANTIC_TYPES.SUBSTATION,
      category: DATA_CATEGORIES.REAL_TIME,
      fields: {
        dispatchLoad: {
          targetField: 'receivedLoad',
          unit: MEASUREMENT_UNITS.MW,
          transform: (val) => val,
          validation: (val) => val >= 0
        },
        dispatchVoltage: {
          targetField: 'referenceVoltage',
          unit: MEASUREMENT_UNITS.KV,
          transform: (val) => val,
          validation: (val) => val > 0 && val < 1000
        },
        dispatchFrequency: {
          targetField: 'targetFrequency',
          unit: MEASUREMENT_UNITS.HZ,
          transform: (val) => val,
          validation: (val) => val >= 49.5 && val <= 50.5
        }
      }
    })

    this.registerMapping({
      source: SEMANTIC_TYPES.SUBSTATION,
      target: SEMANTIC_TYPES.DISPATCH_CENTER,
      category: DATA_CATEGORIES.REAL_TIME,
      fields: {
        actualLoad: {
          targetField: 'reportedLoad',
          unit: MEASUREMENT_UNITS.MW,
          transform: (val) => val,
          validation: (val) => val >= 0
        },
        transformerStatus: {
          targetField: 'transformerState',
          transform: this.transformTransformerStatus,
          validation: (val) => ['normal', 'warning', 'fault', 'offline'].includes(val)
        },
        busVoltage: {
          targetField: 'measuredVoltage',
          unit: MEASUREMENT_UNITS.KV,
          transform: (val) => val,
          validation: (val) => val > 0
        },
        frequency: {
          targetField: 'measuredFrequency',
          unit: MEASUREMENT_UNITS.HZ,
          transform: (val) => val,
          validation: (val) => val >= 45 && val <= 55
        }
      }
    })

    this.registerMapping({
      source: SEMANTIC_TYPES.TRANSFORMER,
      target: SEMANTIC_TYPES.SUBSTATION,
      category: DATA_CATEGORIES.REAL_TIME,
      fields: {
        activePower: {
          targetField: 'transformerActivePower',
          unit: MEASUREMENT_UNITS.MW,
          transform: (val) => val,
          validation: (val) => true
        },
        reactivePower: {
          targetField: 'transformerReactivePower',
          unit: MEASUREMENT_UNITS.MVAR,
          transform: (val) => val,
          validation: (val) => true
        },
        apparentPower: {
          targetField: 'transformerApparentPower',
          unit: MEASUREMENT_UNITS.MVA,
          transform: (val) => val,
          validation: (val) => val >= 0
        },
        tapPosition: {
          targetField: 'transformerTap',
          transform: (val) => val,
          validation: (val) => Number.isInteger(val)
        },
        temperature: {
          targetField: 'transformerTemp',
          unit: '°C',
          transform: (val) => val,
          validation: (val) => val > -50 && val < 200
        }
      }
    })
  }

  transformTransformerStatus(status) {
    const statusMap = {
      0: 'normal',
      1: 'warning',
      2: 'fault',
      3: 'offline',
      'running': 'normal',
      'warning': 'warning',
      'fault': 'fault',
      'stop': 'offline'
    }
    return statusMap[status] || status
  }

  registerMapping(mapping) {
    const key = `${mapping.source}:${mapping.target}:${mapping.category}`
    this.mappings.set(key, mapping)
    return this
  }

  getMapping(source, target, category) {
    const key = `${source}:${target}:${category}`
    return this.mappings.get(key)
  }

  map(sourceType, targetType, category, data, context = {}) {
    const mapping = this.getMapping(sourceType, targetType, category)
    if (!mapping) {
      throw new Error(`No mapping found for ${sourceType} -> ${targetType} (${category})`)
    }

    const result = {}
    const errors = []

    Object.entries(mapping.fields).forEach(([sourceField, fieldConfig]) => {
      if (data.hasOwnProperty(sourceField)) {
        try {
          const value = data[sourceField]
          
          if (fieldConfig.validation && !fieldConfig.validation(value)) {
            errors.push({
              field: sourceField,
              value,
              message: `Validation failed for ${sourceField}`
            })
            return
          }

          const transformedValue = fieldConfig.transform 
            ? fieldConfig.transform(value, context) 
            : value

          result[fieldConfig.targetField] = transformedValue
          
          if (fieldConfig.unit) {
            result[`${fieldConfig.targetField}_unit`] = fieldConfig.unit
          }
        } catch (err) {
          errors.push({
            field: sourceField,
            message: err.message
          })
        }
      }
    })

    return {
      data: result,
      errors,
      metadata: {
        source: sourceType,
        target: targetType,
        category,
        timestamp: Date.now(),
        context
      }
    }
  }

  reverseMap(targetType, sourceType, category, data, context = {}) {
    const mapping = this.getMapping(sourceType, targetType, category)
    if (!mapping) {
      throw new Error(`No mapping found for reverse ${sourceType} -> ${targetType} (${category})`)
    }

    const result = {}
    const reverseFieldMap = new Map()

    Object.entries(mapping.fields).forEach(([sourceField, fieldConfig]) => {
      reverseFieldMap.set(fieldConfig.targetField, {
        sourceField,
        config: fieldConfig
      })
    })

    Object.entries(data).forEach(([targetField, value]) => {
      const fieldInfo = reverseFieldMap.get(targetField)
      if (fieldInfo) {
        result[fieldInfo.sourceField] = value
      }
    })

    return {
      data: result,
      metadata: {
        source: targetType,
        target: sourceType,
        category,
        timestamp: Date.now(),
        context,
        reverse: true
      }
    }
  }

  validate(data, sourceType, category) {
    const mappings = Array.from(this.mappings.values()).filter(
      m => m.source === sourceType && m.category === category
    )

    if (mappings.length === 0) {
      return { valid: false, errors: [`No mappings found for ${sourceType} (${category})`] }
    }

    const errors = []
    mappings.forEach(mapping => {
      Object.entries(mapping.fields).forEach(([sourceField, fieldConfig]) => {
        if (data.hasOwnProperty(sourceField)) {
          const value = data[sourceField]
          if (fieldConfig.validation && !fieldConfig.validation(value)) {
            errors.push({
              field: sourceField,
              value,
              message: `Validation failed for ${sourceField}`
            })
          }
        }
      })
    })

    return {
      valid: errors.length === 0,
      errors
    }
  }

  listMappings() {
    return Array.from(this.mappings.values())
  }
}

export const semanticMapper = new SemanticMapper()
export default semanticMapper
