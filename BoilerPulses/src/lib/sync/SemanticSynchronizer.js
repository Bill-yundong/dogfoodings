import { semanticSyncState, boilerState } from '../stores/boilerStore.js';

export class SemanticSynchronizer {
  constructor() {
    this.subscribers = new Map();
    this.syncQueue = [];
    this.isProcessing = false;
  }

  registerSubscriber(systemId, callback) {
    this.subscribers.set(systemId, callback);
  }

  unregisterSubscriber(systemId) {
    this.subscribers.delete(systemId);
  }

  async syncData(sourceSystem, targetSystem, dataType, payload) {
    const syncRecord = {
      id: crypto.randomUUID(),
      source: sourceSystem,
      target: targetSystem,
      type: dataType,
      payload,
      timestamp: Date.now(),
      status: 'pending'
    };
    this.syncQueue.push(syncRecord);
    this.updateSyncStatus(sourceSystem, 'syncing');
    this.updateSyncStatus(targetSystem, 'syncing');
    if (!this.isProcessing) {
      this.processQueue();
    }
    return syncRecord.id;
  }

  async processQueue() {
    if (this.syncQueue.length === 0) {
      this.isProcessing = false;
      return;
    }
    this.isProcessing = true;
    const record = this.syncQueue.shift();
    try {
      const semanticContext = this.buildSemanticContext(record);
      const success = await this.notifySubscriber(record.target, semanticContext);
      record.status = success ? 'completed' : 'failed';
      this.updateSyncStatus(record.target, success ? 'completed' : 'error');
    } catch (error) {
      record.status = 'error';
      record.error = error.message;
      this.updateSyncStatus(record.target, 'error');
    }
    setTimeout(() => this.processQueue(), 100);
  }

  buildSemanticContext(record) {
    const { type, payload } = record;
    const context = {
      ...record,
      semanticType: this.getSemanticType(type),
      ontology: this.getOntologyMapping(type),
      units: this.getUnits(type),
      quality: this.assessDataQuality(payload)
    };
    return context;
  }

  getSemanticType(dataType) {
    const types = {
      oxygen: 'combustion_process.flue_gas.oxygen_content',
      temperature: 'combustion_process.furnace.temperature',
      pressure: 'combustion_process.furnace.pressure',
      efficiency: 'performance.thermal_efficiency',
      setpoint: 'control.setpoint',
      command: 'control.command'
    };
    return types[dataType] || 'generic.data';
  }

  getOntologyMapping(dataType) {
    const mappings = {
      oxygen: {
        rdfsLabel: '烟气氧含量',
        qudtUnit: 'PERCENT',
        saRef: 'http://qudt.org/vocab/unit#PERCENT',
        hasRange: { min: 0, max: 21 }
      },
      temperature: {
        rdfsLabel: '炉膛温度',
        qudtUnit: 'DEG_C',
        saRef: 'http://qudt.org/vocab/unit#DEG_C',
        hasRange: { min: 0, max: 1500 }
      }
    };
    return mappings[dataType] || {};
  }

  getUnits(dataType) {
    const units = {
      oxygen: '%',
      temperature: '°C',
      pressure: 'Pa',
      efficiency: '%',
      flow: 't/h',
      frequency: 'Hz'
    };
    return units[dataType] || '';
  }

  assessDataQuality(payload) {
    let quality = 100;
    if (payload.value === null || payload.value === undefined) quality -= 50;
    if (payload.timestamp && Date.now() - payload.timestamp > 5000) quality -= 30;
    if (payload.outOfRange) quality -= 40;
    return Math.max(0, quality);
  }

  async notifySubscriber(systemId, context) {
    const callback = this.subscribers.get(systemId);
    if (!callback) return false;
    try {
      await callback(context);
      return true;
    } catch (error) {
      console.error(`Failed to notify ${systemId}:`, error);
      return false;
    }
  }

  updateSyncStatus(systemId, status) {
    semanticSyncState.update(state => ({
      ...state,
      [systemId]: {
        ...state[systemId],
        lastSync: Date.now(),
        status
      }
    }));
  }

  async syncOxygenToFanControl(oxygenValue) {
    return this.syncData('energyMonitor', 'fanControl', 'oxygen', {
      value: oxygenValue,
      timestamp: Date.now(),
      optimalRange: { min: 3.5, max: 5.0 }
    });
  }

  async syncSetpointToEnergyMonitor(setpointType, value) {
    return this.syncData('fanControl', 'energyMonitor', 'setpoint', {
      type: setpointType,
      value,
      timestamp: Date.now()
    });
  }
}

export const semanticSync = new SemanticSynchronizer();
