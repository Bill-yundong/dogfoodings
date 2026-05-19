import type {
  SolarPanel,
  RayTracingResult,
  PowerGeneration,
  MPPTData,
  MPPTRecord,
  ShadowRecord,
} from '@/types/solar';

const TEMPERATURE_COEFFICIENT = -0.004;
const SHADOW_LOSS_COEFFICIENT = 0.95;
const MPPT_BASE_EFFICIENCY = 0.98;
const CELL_TEMPERATURE_COEFFICIENT = 0.03;

export function calculatePanelTemperature(
  irradiance: number,
  ambientTemperature: number,
  windSpeed: number = 2
): number {
  const nomOperatingTemp = 47;
  const temperatureRise = (nomOperatingTemp - 20) * (irradiance / 800);
  const coolingEffect = windSpeed * 0.5;
  
  return ambientTemperature + temperatureRise - coolingEffect;
}

export function calculateTheoreticalPower(
  panel: SolarPanel,
  totalIrradiance: number,
  cellTemperature: number
): number {
  const tempCorrection = 1 + TEMPERATURE_COEFFICIENT * (cellTemperature - 25);
  const irradianceRatio = totalIrradiance / 1000;
  
  return panel.ratedPower * irradianceRatio * tempCorrection;
}

export function calculateShadowLoss(shadowCoverage: number): number {
  if (shadowCoverage <= 0) return 0;
  if (shadowCoverage >= 1) return 1;
  
  return shadowCoverage * SHADOW_LOSS_COEFFICIENT;
}

export function calculateTemperatureLoss(cellTemperature: number): number {
  const deltaT = cellTemperature - 25;
  if (deltaT <= 0) return 0;
  
  return Math.min(deltaT * Math.abs(TEMPERATURE_COEFFICIENT), 0.3);
}

export function calculateMPPTEfficiency(
  shadowCoverage: number,
  temperature: number,
  irradiance: number
): number {
  let efficiency = MPPT_BASE_EFFICIENCY;
  
  if (shadowCoverage > 0.3) {
    efficiency *= (1 - (shadowCoverage - 0.3) * 0.2);
  }
  
  if (irradiance < 200) {
    efficiency *= (0.9 + irradiance / 2000);
  }
  
  if (temperature > 60) {
    efficiency *= 0.95;
  }
  
  return Math.min(efficiency, 0.99);
}

export function calculateActualPower(
  theoreticalPower: number,
  shadowLoss: number,
  temperatureLoss: number,
  mpptEfficiency: number
): number {
  return theoreticalPower * (1 - shadowLoss) * (1 - temperatureLoss) * mpptEfficiency;
}

export function calculateMPPTData(
  panel: SolarPanel,
  irradiance: number,
  temperature: number,
  shadowCoverage: number
): MPPTData {
  const tempCoeff = TEMPERATURE_COEFFICIENT;
  const mpptEfficiency = calculateMPPTEfficiency(shadowCoverage, temperature, irradiance);
  
  const voc = 38.0 * (1 + tempCoeff * (temperature - 25));
  const isc = 9.5 * (irradiance / 1000) * (1 + tempCoeff * 0.5 * (temperature - 25));
  
  const fillFactor = 0.75 * (1 - shadowCoverage * 0.3);
  const maxPower = voc * isc * fillFactor * mpptEfficiency;
  
  const voltage = voc * 0.8;
  const current = maxPower / voltage;
  
  return {
    panelId: panel.id,
    voltage,
    current,
    maxPower,
    trackingEfficiency: mpptEfficiency,
    temperatureCoefficient: tempCoeff,
  };
}

export function processRayTracingResult(
  panel: SolarPanel,
  rayResult: RayTracingResult,
  ambientTemperature: number,
  timestamp: number
): {
  powerGeneration: PowerGeneration;
  mpptRecord: MPPTRecord;
  shadowRecords: ShadowRecord[];
} {
  const totalIrradiance = rayResult.directIrradiance + rayResult.diffuseIrradiance;
  const cellTemperature = calculatePanelTemperature(totalIrradiance, ambientTemperature);
  
  const theoreticalPower = calculateTheoreticalPower(panel, totalIrradiance, cellTemperature);
  const shadowLoss = calculateShadowLoss(rayResult.shadowCoverage);
  const temperatureLoss = calculateTemperatureLoss(cellTemperature);
  const mpptEfficiency = calculateMPPTEfficiency(
    rayResult.shadowCoverage,
    cellTemperature,
    totalIrradiance
  );
  
  const actualPower = calculateActualPower(
    theoreticalPower,
    shadowLoss,
    temperatureLoss,
    mpptEfficiency
  );
  
  const lossRate = theoreticalPower > 0 ? (theoreticalPower - actualPower) / theoreticalPower : 0;
  
  const mpptData = calculateMPPTData(
    panel,
    totalIrradiance,
    cellTemperature,
    rayResult.shadowCoverage
  );
  
  const generationId = `gen-${panel.id}-${timestamp}`;
  
  const powerGeneration: PowerGeneration = {
    id: generationId,
    panelId: panel.id,
    timestamp,
    irradiance: totalIrradiance,
    temperature: cellTemperature,
    outputPower: actualPower,
    theoreticalPower,
    lossRate,
    shadowLoss,
    temperatureLoss,
    mpptLoss: 1 - mpptEfficiency,
  };
  
  const mpptRecord: MPPTRecord = {
    id: `mppt-${generationId}`,
    generationId,
    voltage: mpptData.voltage,
    current: mpptData.current,
    maxPowerPoint: mpptData.maxPower,
    trackingEfficiency: mpptData.trackingEfficiency,
  };
  
  const shadowRecords: ShadowRecord[] = [];
  
  if (rayResult.shadowCoverage > 0) {
    shadowRecords.push({
      id: `shadow-${panel.id}-${timestamp}`,
      panelId: panel.id,
      buildingId: 'multiple',
      timestamp,
      coverageRate: rayResult.shadowCoverage,
      powerLoss: theoreticalPower * shadowLoss,
    });
  }
  
  return {
    powerGeneration,
    mpptRecord,
    shadowRecords,
  };
}

export interface RegionStatistics {
  totalPanels: number;
  totalTheoreticalPower: number;
  totalActualPower: number;
  averageEfficiency: number;
  totalLossRate: number;
  shadowLossTotal: number;
  temperatureLossTotal: number;
  mpptLossTotal: number;
}

export function calculateRegionStatistics(
  generations: PowerGeneration[]
): RegionStatistics {
  if (generations.length === 0) {
    return {
      totalPanels: 0,
      totalTheoreticalPower: 0,
      totalActualPower: 0,
      averageEfficiency: 0,
      totalLossRate: 0,
      shadowLossTotal: 0,
      temperatureLossTotal: 0,
      mpptLossTotal: 0,
    };
  }
  
  const totalPanels = generations.length;
  const totalTheoreticalPower = generations.reduce((sum, g) => sum + g.theoreticalPower, 0);
  const totalActualPower = generations.reduce((sum, g) => sum + g.outputPower, 0);
  const averageEfficiency = totalTheoreticalPower > 0 ? totalActualPower / totalTheoreticalPower : 0;
  const totalLossRate = 1 - averageEfficiency;
  
  const shadowLossTotal = generations.reduce((sum, g) => sum + g.shadowLoss * g.theoreticalPower, 0);
  const temperatureLossTotal = generations.reduce((sum, g) => sum + g.temperatureLoss * g.theoreticalPower, 0);
  const mpptLossTotal = generations.reduce((sum, g) => sum + g.mpptLoss * g.theoreticalPower, 0);
  
  return {
    totalPanels,
    totalTheoreticalPower,
    totalActualPower,
    averageEfficiency,
    totalLossRate,
    shadowLossTotal,
    temperatureLossTotal,
    mpptLossTotal,
  };
}

export interface MaintenanceSuggestion {
  panelId: string;
  type: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  estimatedBenefit: number;
}

export function generateMaintenanceSuggestions(
  panels: SolarPanel[],
  generations: PowerGeneration[],
  shadowRecords: ShadowRecord[]
): MaintenanceSuggestion[] {
  const suggestions: MaintenanceSuggestion[] = [];
  const panelMap = new Map(panels.map((p) => [p.id, p]));
  
  for (const gen of generations) {
    const panel = panelMap.get(gen.panelId);
    if (!panel) continue;
    
    if (gen.lossRate > 0.4) {
      const avgShadow = shadowRecords
        .filter((s) => s.panelId === gen.panelId)
        .reduce((sum, s) => sum + s.coverageRate, 0) / 
        Math.max(shadowRecords.filter((s) => s.panelId === gen.panelId).length, 1);
      
      if (avgShadow > 0.3) {
        suggestions.push({
          panelId: gen.panelId,
          type: 'shadow_optimization',
          description: '该光伏板长期受阴影遮挡，建议考虑修剪周围树木或调整安装位置',
          priority: gen.lossRate > 0.6 ? 'high' : 'medium',
          estimatedBenefit: gen.theoreticalPower * gen.lossRate * 8760 * 0.5,
        });
      } else if (gen.temperatureLoss > 0.15) {
        suggestions.push({
          panelId: gen.panelId,
          type: 'cooling_maintenance',
          description: '该光伏板工作温度过高，建议检查通风状况或进行清洁维护',
          priority: 'medium',
          estimatedBenefit: gen.theoreticalPower * gen.temperatureLoss * 8760 * 0.3,
        });
      } else if (gen.mpptLoss > 0.05) {
        suggestions.push({
          panelId: gen.panelId,
          type: 'inverter_check',
          description: 'MPPT追踪效率偏低，建议检查逆变器工作状态',
          priority: 'low',
          estimatedBenefit: gen.theoreticalPower * gen.mpptLoss * 8760 * 0.8,
        });
      }
    }
    
    if (panel.status === 'degraded') {
      suggestions.push({
        panelId: gen.panelId,
        type: 'panel_replacement',
        description: '光伏板性能衰减严重，建议评估更换',
        priority: 'high',
        estimatedBenefit: gen.theoreticalPower * 0.2 * 8760,
      });
    }
    
    if (panel.status === 'fault') {
      suggestions.push({
        panelId: gen.panelId,
        type: 'fault_repair',
        description: '光伏板故障，需立即维修',
        priority: 'critical',
        estimatedBenefit: gen.theoreticalPower * 8760,
      });
    }
  }
  
  return suggestions.sort((a, b) => b.estimatedBenefit - a.estimatedBenefit);
}

export interface HourlyForecast {
  hour: number;
  expectedPower: number;
  expectedEfficiency: number;
  expectedLoss: number;
}

export function forecastNext24Hours(
  panel: SolarPanel,
  historicalData: PowerGeneration[],
  latitude: number,
  longitude: number
): HourlyForecast[] {
  const forecast: HourlyForecast[] = [];
  const now = Date.now();
  
  const avgEfficiency = historicalData.length > 0
    ? historicalData.reduce((sum, d) => sum + (d.outputPower / Math.max(d.theoreticalPower, 0.001)), 0) / historicalData.length
    : 0.85;
  
  for (let i = 0; i < 24; i++) {
    const forecastTime = now + i * 60 * 60 * 1000;
    const date = new Date(forecastTime);
    const hour = date.getHours();
    
    const dayOfYear = Math.floor((forecastTime - new Date(date.getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24));
    const declination = 23.45 * Math.sin(2 * Math.PI * (284 + dayOfYear) / 365) * Math.PI / 180;
    const latRad = latitude * Math.PI / 180;
    const hourAngle = (hour - 12) * 15 * Math.PI / 180;
    
    const solarAltitude = Math.asin(
      Math.sin(latRad) * Math.sin(declination) +
      Math.cos(latRad) * Math.cos(declination) * Math.cos(hourAngle)
    ) * 180 / Math.PI;
    
    let irradiance = 0;
    if (solarAltitude > 0) {
      const airMass = 1 / Math.sin(solarAltitude * Math.PI / 180);
      const transmittance = Math.exp(-0.1 * airMass);
      irradiance = 1361 * transmittance * Math.sin(solarAltitude * Math.PI / 180);
    }
    
    const tempEstimate = 25 + (solarAltitude > 0 ? solarAltitude * 0.3 : 0);
    const tempCorrection = 1 + TEMPERATURE_COEFFICIENT * (tempEstimate - 25);
    const theoreticalPower = panel.ratedPower * (irradiance / 1000) * tempCorrection;
    
    const expectedPower = theoreticalPower * avgEfficiency;
    const expectedEfficiency = avgEfficiency;
    const expectedLoss = theoreticalPower - expectedPower;
    
    forecast.push({
      hour: i,
      expectedPower: Math.max(0, expectedPower),
      expectedEfficiency: Math.max(0, expectedEfficiency),
      expectedLoss: Math.max(0, expectedLoss),
    });
  }
  
  return forecast;
}
