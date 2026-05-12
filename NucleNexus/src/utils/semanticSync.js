class SemanticSync {
  constructor(db) {
    this.db = db
    this.semanticMappings = {
      production: {
        waterIntakeFlow: 'waterFlow',
        coolingEfficiency: 'coolingRate',
        generatorOutput: 'powerOutput',
        equipmentStatus: 'deviceHealth'
      },
      safety: {
        riskLevel: 'warningLevel',
        blockageProbability: 'clogChance',
        emergencyStatus: 'alertState',
        responseTime: 'reactionWindow'
      }
    }
  }

  async sync() {
    const productionData = await this.db.getPendingProductionData()
    const safetyData = await this.db.getPendingSafetyData()

    const syncedProduction = await this.syncProductionData(productionData)
    const syncedSafety = await this.syncSafetyData(safetyData)

    await this.db.saveSyncLog({
      type: 'full_sync',
      productionSynced: syncedProduction,
      safetySynced: syncedSafety,
      status: 'success'
    })

    return {
      productionSynced: syncedProduction,
      safetySynced: syncedSafety,
      timestamp: new Date().toISOString()
    }
  }

  async syncProductionData(data) {
    let syncedCount = 0
    for (const item of data) {
      const semanticData = this.applySemanticMapping(item, 'production')
      const success = await this.sendToSafetySystem(semanticData)
      if (success) {
        await this.db.markAsSynced('productionData', item.id)
        syncedCount++
      }
    }
    return syncedCount
  }

  async syncSafetyData(data) {
    let syncedCount = 0
    for (const item of data) {
      const semanticData = this.applySemanticMapping(item, 'safety')
      const success = await this.sendToProductionSystem(semanticData)
      if (success) {
        await this.db.markAsSynced('safetyData', item.id)
        syncedCount++
      }
    }
    return syncedCount
  }

  applySemanticMapping(data, system) {
    const mappings = this.semanticMappings[system]
    const result = {}

    for (const [key, value] of Object.entries(data)) {
      if (mappings[key]) {
        result[mappings[key]] = value
      } else {
        result[key] = value
      }
    }

    result.semanticVersion = '1.0.0'
    result.sourceSystem = system
    result.translatedAt = new Date().toISOString()

    return result
  }

  async sendToSafetySystem(data) {
    return new Promise((resolve) => {
      setTimeout(() => {
        console.log('[SemanticSync] 数据已发送至安监指挥系统:', data)
        resolve(true)
      }, 100 + Math.random() * 200)
    })
  }

  async sendToProductionSystem(data) {
    return new Promise((resolve) => {
      setTimeout(() => {
        console.log('[SemanticSync] 数据已发送至生产部门:', data)
        resolve(true)
      }, 100 + Math.random() * 200)
    })
  }

  async sendWarningToBothSystems(warningData) {
    const productionWarning = this.applySemanticMapping(warningData, 'production')
    const safetyWarning = this.applySemanticMapping(warningData, 'safety')

    const productionSuccess = await this.sendToProductionSystem(productionWarning)
    const safetySuccess = await this.sendToSafetySystem(safetyWarning)

    return {
      productionSuccess,
      safetySuccess,
      timestamp: new Date().toISOString()
    }
  }

  createMigrationEvent(data, migrationType) {
    return {
      eventId: `migration_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: migrationType,
      data: {
        species: data.species || 'mixed',
        density: data.density,
        direction: data.direction || 'towards_intake',
        speed: data.speed
      },
      metadata: {
        source: 'ocean_sensors',
        confidence: data.confidence || 0.85,
        detectedAt: new Date().toISOString()
      },
      semanticTags: [
        'marine_organism',
        'migration_pattern',
        'cooling_water_intake',
        migrationType
      ]
    }
  }

  async broadcastMigrationEvent(data) {
    const event = this.createMigrationEvent(data, data.type)

    const results = await Promise.all([
      this.sendToProductionSystem(event),
      this.sendToSafetySystem(event)
    ])

    await this.db.saveSyncLog({
      type: 'migration_event',
      eventId: event.eventId,
      productionReceived: results[0],
      safetyReceived: results[1]
    })

    return {
      eventId: event.eventId,
      broadcastSuccess: results.every(r => r)
    }
  }

  reconcileData(productions, safety) {
    const reconciled = {}

    productions.forEach(p => {
      Object.entries(p).forEach(([key, value]) => {
        if (!reconciled[key]) {
          reconciled[key] = { values: [], sources: [] }
        }
        reconciled[key].values.push(value)
        reconciled[key].sources.push('production')
      })
    })

    safety.forEach(s => {
      Object.entries(s).forEach(([key, value]) => {
        const mappedKey = this.semanticMappings.safety[key] || key
        if (!reconciled[mappedKey]) {
          reconciled[mappedKey] = { values: [], sources: [] }
        }
        reconciled[mappedKey].values.push(value)
        reconciled[mappedKey].sources.push('safety')
      })
    })

    return reconciled
  }

  getSyncMetrics() {
    return {
      lastSync: localStorage.getItem('lastSyncTime'),
      syncCount: parseInt(localStorage.getItem('syncCount') || '0'),
      pendingProduction: 0,
      pendingSafety: 0
    }
  }

  updateSyncMetrics() {
    localStorage.setItem('lastSyncTime', new Date().toISOString())
    localStorage.setItem('syncCount', (parseInt(localStorage.getItem('syncCount') || '0') + 1).toString())
  }

  validateSemanticConsistency(data1, data2) {
    const inconsistencies = []

    const keys1 = Object.keys(data1).filter(k => !['timestamp', 'id', 'syncStatus'].includes(k))
    const keys2 = Object.keys(data2).filter(k => !['timestamp', 'id', 'syncStatus'].includes(k))

    keys1.forEach(key => {
      const mappedKey = this.semanticMappings.production[key] || 
                        this.semanticMappings.safety[key] || key
      if (keys2.includes(mappedKey)) {
        const val1 = data1[key]
        const val2 = data2[mappedKey]
        if (typeof val1 === 'number' && typeof val2 === 'number') {
          const diff = Math.abs(val1 - val2) / Math.max(val1, val2, 1)
          if (diff > 0.1) {
            inconsistencies.push({
              key,
              mappedKey,
              value1: val1,
              value2: val2,
              difference: diff
            })
          }
        }
      }
    })

    return {
      consistent: inconsistencies.length === 0,
      inconsistencies
    }
  }
}

export default SemanticSync