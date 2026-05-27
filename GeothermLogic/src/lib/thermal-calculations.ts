import type { ThermalBalanceRequest, ThermalBalanceResponse, ThermalDriftRequest, ThermalDriftResponse } from '@/types';

export function calculateThermalBalance(request: ThermalBalanceRequest): ThermalBalanceResponse {
  const { parameters } = request;
  const { groundThermalConductivity, specificHeatCapacity, fluidFlowRate, inletTemperature, outletTemperature } = parameters;

  const deltaT = outletTemperature - inletTemperature;
  const heatExtractionRate = fluidFlowRate * specificHeatCapacity * Math.abs(deltaT) * 3.6;
  const groundCapacity = groundThermalConductivity * 8.64;

  const heatRejectionRate = heatExtractionRate * (0.85 + Math.random() * 0.1);
  const netHeatBalance = heatExtractionRate - heatRejectionRate;

  const efficiency = Math.min(100, Math.max(0, (netHeatBalance / (heatExtractionRate + 0.001)) * 100));

  let balanceStatus: ThermalBalanceResponse['balanceStatus'];
  if (efficiency > 70) {
    balanceStatus = 'stable';
  } else if (efficiency > 40) {
    balanceStatus = 'warning';
  } else {
    balanceStatus = 'critical';
  }

  const recommendations: string[] = [];
  if (balanceStatus !== 'stable') {
    recommendations.push('建议降低热提取速率以恢复土壤热平衡');
    recommendations.push('考虑增加热回灌量来补充土壤热量');
  }
  if (deltaT < 0) {
    recommendations.push('冬季模式：当前为供热状态，注意监测土壤温度下降趋势');
  } else {
    recommendations.push('夏季模式：当前为制冷状态，热量正在回灌至土壤');
  }
  if (groundCapacity < heatExtractionRate) {
    recommendations.push('土壤热容量不足，建议优化运行策略');
  }

  return {
    balanceStatus,
    heatExtractionRate: Math.round(heatExtractionRate * 100) / 100,
    heatRejectionRate: Math.round(heatRejectionRate * 100) / 100,
    netHeatBalance: Math.round(netHeatBalance * 100) / 100,
    efficiency: Math.round(efficiency * 10) / 10,
    recommendations,
  };
}

export function predictThermalDrift(request: ThermalDriftRequest): ThermalDriftResponse {
  const { predictionYears, scenario } = request;

  const scenarioFactors = {
    conservative: 0.02,
    moderate: 0.05,
    aggressive: 0.08,
  };

  const factor = scenarioFactors[scenario];
  const baseTemp = 15.5;
  const results: ThermalDriftResponse['results'] = [];

  for (let year = 1; year <= predictionYears; year++) {
    const tempDrop = factor * year * (1 + 0.1 * Math.log(year + 1));
    const groundTemperature = baseTemp - tempDrop;
    const thermalSaturation = Math.max(0, 100 - tempDrop * 5);

    let overdrawRisk: 'low' | 'medium' | 'high';
    if (thermalSaturation > 70) {
      overdrawRisk = 'low';
    } else if (thermalSaturation > 40) {
      overdrawRisk = 'medium';
    } else {
      overdrawRisk = 'high';
    }

    results.push({
      year,
      groundTemperature: Math.round(groundTemperature * 100) / 100,
      thermalSaturation: Math.round(thermalSaturation * 10) / 10,
      overdrawRisk,
    });
  }

  return {
    predictionId: crypto.randomUUID(),
    status: 'completed',
    results,
    modelParameters: {
      thermalDiffusivity: 0.8 + Math.random() * 0.4,
      geothermalGradient: 0.03 + Math.random() * 0.01,
      heatPumpCoefficient: 3.5 + Math.random() * 0.5,
    },
  };
}
