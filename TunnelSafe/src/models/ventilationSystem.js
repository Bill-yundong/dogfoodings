const VENTILATION_MODES = {
  AUTO: 'auto',
  MANUAL: 'manual',
  EMERGENCY: 'emergency',
  MAINTENANCE: 'maintenance'
};

const FAN_STATUS = {
  RUNNING: 'running',
  IDLE: 'idle',
  MAINTENANCE: 'maintenance',
  FAULT: 'fault'
};

const createFan = (id, zone, position) => ({
  id,
  zone,
  position,
  status: FAN_STATUS.IDLE,
  power: 0,
  maxPower: 100,
  flowRate: 0,
  maxFlowRate: 120,
  energyConsumption: 0,
  vibrationLevel: 0,
  temperature: 25,
  runtime: 0,
  lastMaintenance: Date.now()
});

export const initVentilationSystem = () => {
  const fans = [];
  const zones = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2', 'D1', 'D2', 'E1', 'E2'];
  
  zones.forEach((zone, index) => {
    fans.push(createFan(`FAN-${zone}-IN`, zone, { x: index * 10 + 2, y: 5 }));
    fans.push(createFan(`FAN-${zone}-OUT`, zone, { x: index * 10 + 8, y: 25 }));
  });
  
  return {
    mode: VENTILATION_MODES.AUTO,
    fans,
    systemFlowRate: 0,
    systemPressure: 0,
    totalEnergyConsumption: 0,
    targetAirChangeRate: 6,
    currentAirChangeRate: 0,
    lastUpdate: Date.now()
  };
};

const calculateFanFlow = (fan, targetPower) => {
  const power = Math.max(0, Math.min(fan.maxPower, targetPower));
  const flowRate = (power / fan.maxPower) * fan.maxFlowRate;
  const energyConsumption = power * 15;
  const vibrationLevel = power * 0.5 + Math.random() * 5;
  
  return {
    power,
    flowRate,
    energyConsumption,
    vibrationLevel,
    temperature: 25 + power * 0.5 + Math.random() * 3
  };
};

const updateFan = (fan, targetPower, timeDelta) => {
  const params = calculateFanFlow(fan, targetPower);
  
  return {
    ...fan,
    ...params,
    status: params.power > 5 ? FAN_STATUS.RUNNING : FAN_STATUS.IDLE,
    energyConsumption: fan.energyConsumption + params.energyConsumption * timeDelta / 3600,
    runtime: fan.runtime + (params.power > 0 ? timeDelta : 0)
  };
};

const autoControlStrategy = (system, environmentState, timeDelta) => {
  const { avgSmokeDensity, zoneSmokeDensity, temperature = 25 } = environmentState;
  
  const updates = {};
  const zones = Object.keys(zoneSmokeDensity || {});
  
  zones.forEach(zone => {
    const density = zoneSmokeDensity[zone] || 0;
    const tempFactor = Math.max(0, (temperature - 30) / 50);
    
    let targetPower = 0;
    
    if (density > 0.5) {
      targetPower = 100;
    } else if (density > 0.3) {
      targetPower = 80;
    } else if (density > 0.15) {
      targetPower = 60;
    } else if (density > 0.05) {
      targetPower = 40;
    } else if (tempFactor > 0.3) {
      targetPower = 30;
    } else {
      targetPower = 20;
    }
    
    updates[zone] = targetPower;
  });
  
  return updates;
};

const emergencyControlStrategy = (system, environmentState, timeDelta) => {
  const { zoneSmokeDensity, fireZones = [] } = environmentState;
  const updates = {};
  const zones = Object.keys(zoneSmokeDensity || {});
  
  zones.forEach(zone => {
    const hasActiveFire = fireZones.some(f => f.id.includes(zone) && f.stage !== 'extinguished');
    const density = zoneSmokeDensity[zone] || 0;
    
    if (hasActiveFire || density > 0.4) {
      updates[zone] = 100;
    } else if (density > 0.2) {
      updates[zone] = 80;
    } else {
      updates[zone] = 60;
    }
  });
  
  return updates;
};

export const ventilationSystem = {
  VENTILATION_MODES,
  FAN_STATUS,
  
  initVentilationSystem,
  
  async simulateStep(system, environmentState, timeDelta = 0.1) {
    await new Promise(resolve => setTimeout(resolve, 5));
    
    let powerUpdates = {};
    
    switch (system.mode) {
      case VENTILATION_MODES.AUTO:
        powerUpdates = autoControlStrategy(system, environmentState, timeDelta);
        break;
      case VENTILATION_MODES.EMERGENCY:
        powerUpdates = emergencyControlStrategy(system, environmentState, timeDelta);
        break;
      case VENTILATION_MODES.MANUAL:
        if (system.manualPowerSettings) {
          powerUpdates = system.manualPowerSettings;
        }
        break;
    }
    
    const updatedFans = system.fans.map(fan => {
      const targetPower = powerUpdates[fan.zone] || 20;
      return updateFan(fan, targetPower, timeDelta);
    });
    
    const systemFlowRate = updatedFans.reduce((sum, f) => sum + f.flowRate, 0);
    const systemPressure = (systemFlowRate / updatedFans.length) * 0.5;
    const totalEnergyConsumption = updatedFans.reduce((sum, f) => sum + f.energyConsumption, 0);
    const currentAirChangeRate = systemFlowRate / 1000;
    
    return {
      ...system,
      fans: updatedFans,
      systemFlowRate,
      systemPressure,
      totalEnergyConsumption,
      currentAirChangeRate,
      lastUpdate: Date.now()
    };
  },
  
  setMode(system, mode, manualSettings = null) {
    const updates = { mode };
    if (mode === VENTILATION_MODES.MANUAL && manualSettings) {
      updates.manualPowerSettings = manualSettings;
    }
    return { ...system, ...updates };
  },
  
  setManualPower(system, zone, power) {
    const manualPowerSettings = { ...system.manualPowerSettings, [zone]: power };
    return { ...system, manualPowerSettings };
  },
  
  getVentilationFlow(system, direction = { x: 1, y: 0 }) {
    return {
      flowRate: system.systemFlowRate / system.fans.length,
      direction,
      pressure: system.systemPressure
    };
  },
  
  getZoneFlowRate(system, zone) {
    const zoneFans = system.fans.filter(f => f.zone === zone);
    return zoneFans.reduce((sum, f) => sum + f.flowRate, 0);
  },
  
  getSystemStats(system) {
    const runningFans = system.fans.filter(f => f.status === FAN_STATUS.RUNNING).length;
    const idleFans = system.fans.filter(f => f.status === FAN_STATUS.IDLE).length;
    const maintenanceFans = system.fans.filter(f => f.status === FAN_STATUS.MAINTENANCE).length;
    const faultFans = system.fans.filter(f => f.status === FAN_STATUS.FAULT).length;
    
    const avgPower = system.fans.reduce((sum, f) => sum + f.power, 0) / system.fans.length;
    const avgVibration = system.fans.reduce((sum, f) => sum + f.vibrationLevel, 0) / system.fans.length;
    
    return {
      mode: system.mode,
      totalFans: system.fans.length,
      runningFans,
      idleFans,
      maintenanceFans,
      faultFans,
      systemFlowRate: system.systemFlowRate,
      systemPressure: system.systemPressure,
      avgPower,
      avgVibration,
      totalEnergyConsumption: system.totalEnergyConsumption,
      currentAirChangeRate: system.currentAirChangeRate,
      targetAirChangeRate: system.targetAirChangeRate
    };
  },
  
  validateLogic(system, environmentState) {
    const issues = [];
    const warnings = [];
    
    const faultFans = system.fans.filter(f => f.status === FAN_STATUS.FAULT);
    if (faultFans.length > 0) {
      issues.push({
        type: 'fan_fault',
        message: `${faultFans.length} 台风机处于故障状态`,
        fans: faultFans.map(f => f.id)
      });
    }
    
    const highVibrationFans = system.fans.filter(f => f.vibrationLevel > 80);
    if (highVibrationFans.length > 0) {
      warnings.push({
        type: 'high_vibration',
        message: `${highVibrationFans.length} 台风机振动异常`,
        fans: highVibrationFans.map(f => ({ id: f.id, vibration: f.vibrationLevel }))
      });
    }
    
    if (environmentState.avgSmokeDensity > 0.3) {
      const underPoweredFans = system.fans.filter(f => f.power < 70);
      if (underPoweredFans.length > system.fans.length * 0.3) {
        issues.push({
          type: 'insufficient_ventilation',
          message: '烟雾浓度过高，但通风系统响应不足',
          recommendation: '建议切换到紧急模式'
        });
      }
    }
    
    return {
      isValid: issues.length === 0,
      issues,
      warnings
    };
  }
};

export default ventilationSystem;
