import { RNGKEpsilonSolver } from '../turbulence/RNGKEpsilon';
import type { FlowField, Building } from '../turbulence/RNGKEpsilon';

export interface WindHazardMetrics {
  maxWindSpeed: number;
  avgWindSpeed: number;
  maxTurbulenceIntensity: number;
  avgTurbulenceIntensity: number;
  maxPressureCoefficient: number;
  avgPressureCoefficient: number;
  canyonAmplificationFactor: number;
  pedestrianLevelWindSpeed: number;
  buildingWindLoads: Array<{
    buildingId: string;
    maxLoad: number;
    avgLoad: number;
  }>;
}

export interface HazardZone {
  id: string;
  x: number;
  y: number;
  z: number;
  width: number;
  height: number;
  depth: number;
  hazardLevel: 'low' | 'medium' | 'high' | 'severe';
  primaryHazard: 'speed' | 'turbulence' | 'pressure' | 'canyon';
  severity: number;
  affectedBuildings: string[];
}

export interface AssessmentReport {
  id: string;
  timestamp: number;
  cityId: string;
  simulationId: string;
  overallRiskLevel: 'low' | 'medium' | 'high' | 'severe';
  metrics: WindHazardMetrics;
  hazardZones: HazardZone[];
  recommendations: string[];
  summary: string;
}

export class WindHazardEvaluator {
  private solver: RNGKEpsilonSolver;
  
  private readonly SPEED_THRESHOLDS = {
    low: 5,
    medium: 10,
    high: 15,
    severe: 20
  };
  
  private readonly TURBULENCE_THRESHOLDS = {
    low: 0.1,
    medium: 0.2,
    high: 0.3,
    severe: 0.5
  };
  
  private readonly PRESSURE_THRESHOLDS = {
    low: 50,
    medium: 100,
    high: 200,
    severe: 300
  };

  constructor() {
    this.solver = new RNGKEpsilonSolver();
  }

  evaluateWindField(
    flowField: FlowField,
    buildings: Building[],
    cityId: string,
    simulationId: string
  ): AssessmentReport {
    const metrics = this.calculateMetrics(flowField, buildings);
    const hazardZones = this.identifyHazardZones(flowField, buildings);
    const overallRisk = this.determineOverallRisk(metrics, hazardZones);
    const recommendations = this.generateRecommendations(metrics, hazardZones);
    const summary = this.generateSummary(metrics, hazardZones, overallRisk);

    return {
      id: `assessment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      cityId,
      simulationId,
      overallRiskLevel: overallRisk,
      metrics,
      hazardZones,
      recommendations,
      summary
    };
  }

  private calculateMetrics(flowField: FlowField, buildings: Building[]): WindHazardMetrics {
    const { nx, ny, nz, u, v, w, k, pressure } = flowField;
    let totalSpeed = 0;
    let maxSpeed = 0;
    let totalTurbulence = 0;
    let maxTurbulence = 0;
    let totalPressure = 0;
    let maxPressure = 0;
    let pedestrianSpeed = 0;
    let pedestrianCount = 0;
    
    const pedestrianHeight = Math.floor(2 / flowField.dz);

    for (let k_idx = 0; k_idx < nz; k_idx++) {
      for (let j = 0; j < ny; j++) {
        for (let i = 0; i < nx; i++) {
          const idx = k_idx * nx * ny + j * nx + i;
          const speed = Math.sqrt(u[idx] * u[idx] + v[idx] * v[idx] + w[idx] * w[idx]);
          
          totalSpeed += speed;
          maxSpeed = Math.max(maxSpeed, speed);
          
          const turbulenceIntensity = speed > 0.1 ? Math.sqrt(2 * k[idx] / 3) / speed : 0;
          totalTurbulence += turbulenceIntensity;
          maxTurbulence = Math.max(maxTurbulence, turbulenceIntensity);
          
          totalPressure += Math.abs(pressure[idx]);
          maxPressure = Math.max(maxPressure, Math.abs(pressure[idx]));
          
          if (k_idx <= pedestrianHeight) {
            pedestrianSpeed += speed;
            pedestrianCount++;
          }
        }
      }
    }

    const totalPoints = nx * ny * nz;
    const canyonEffect = this.analyzeStreetCanyonEffect(flowField, buildings);
    const buildingWindLoads = this.calculateBuildingWindLoads(buildings, flowField);

    return {
      maxWindSpeed: maxSpeed,
      avgWindSpeed: totalSpeed / totalPoints,
      maxTurbulenceIntensity: maxTurbulence,
      avgTurbulenceIntensity: totalTurbulence / totalPoints,
      maxPressureCoefficient: maxPressure,
      avgPressureCoefficient: totalPressure / totalPoints,
      canyonAmplificationFactor: canyonEffect.velocityAmplification,
      pedestrianLevelWindSpeed: pedestrianCount > 0 ? pedestrianSpeed / pedestrianCount : 0,
      buildingWindLoads
    };
  }

  private analyzeStreetCanyonEffect(flowField: FlowField, buildings: Building[]): {
    velocityAmplification: number;
    turbulenceIncrease: number;
  } {
    if (buildings.length < 2) {
      return { velocityAmplification: 1.0, turbulenceIncrease: 1.0 };
    }

    let canyonCount = 0;
    let totalAmp = 0;
    let totalTurb = 0;

    for (let i = 0; i < buildings.length; i++) {
      for (let j = i + 1; j < buildings.length; j++) {
        const b1 = buildings[i];
        const b2 = buildings[j];
        
        const dx = Math.abs(b1.x - b2.x);
        const dy = Math.abs(b1.y - b2.y);
        const avgHeight = (b1.height + b2.height) / 2;
        const canyonWidth = Math.max(dx, dy);
        
        if (canyonWidth > 0 && canyonWidth < avgHeight * 3) {
          const hRatio = avgHeight / canyonWidth;
          const amplification = 1.0 + 0.4 * (1 - Math.exp(-hRatio / 2));
          const turbIncrease = 1.0 + 0.6 * (1 - Math.exp(-hRatio / 1.5));
          
          totalAmp += amplification;
          totalTurb += turbIncrease;
          canyonCount++;
        }
      }
    }

    return {
      velocityAmplification: canyonCount > 0 ? totalAmp / canyonCount : 1.0,
      turbulenceIncrease: canyonCount > 0 ? totalTurb / canyonCount : 1.0
    };
  }

  private calculateBuildingWindLoads(buildings: Building[], flowField: FlowField): Array<{
    buildingId: string;
    maxLoad: number;
    avgLoad: number;
  }> {
    const airDensity = 1.225;
    
    return buildings.map(building => {
      let totalLoad = 0;
      let maxLoad = 0;
      let sampleCount = 0;
      
      if (building.surfacePressure) {
        building.surfacePressure.forEach(pressure => {
          const load = 0.5 * airDensity * pressure * pressure;
          totalLoad += load;
          maxLoad = Math.max(maxLoad, load);
          sampleCount++;
        });
      }

      return {
        buildingId: building.id,
        maxLoad: maxLoad,
        avgLoad: sampleCount > 0 ? totalLoad / sampleCount : 0
      };
    });
  }

  private identifyHazardZones(flowField: FlowField, buildings: Building[]): HazardZone[] {
    const zones: HazardZone[] = [];
    const { nx, ny, nz, dx, dy, dz, u, v, w, k } = flowField;
    const gridSize = 10;
    
    for (let blockX = 0; blockX < nx; blockX += gridSize) {
      for (let blockY = 0; blockY < ny; blockY += gridSize) {
        for (let blockZ = 0; blockZ < nz; blockZ += gridSize) {
          let blockMaxSpeed = 0;
          let blockMaxTurb = 0;
          let blockMaxPressure = 0;
          
          for (let i = blockX; i < Math.min(blockX + gridSize, nx); i++) {
            for (let j = blockY; j < Math.min(blockY + gridSize, ny); j++) {
              for (let k_idx = blockZ; k_idx < Math.min(blockZ + gridSize, nz); k_idx++) {
                const idx = k_idx * nx * ny + j * nx + i;
                const speed = Math.sqrt(u[idx] * u[idx] + v[idx] * v[idx] + w[idx] * w[idx]);
                const turbulence = speed > 0.1 ? Math.sqrt(2 * k[idx] / 3) / speed : 0;
                const pressure = Math.abs(flowField.pressure[idx]);
                
                blockMaxSpeed = Math.max(blockMaxSpeed, speed);
                blockMaxTurb = Math.max(blockMaxTurb, turbulence);
                blockMaxPressure = Math.max(blockMaxPressure, pressure);
              }
            }
          }

          const speedLevel = this.getHazardLevel(blockMaxSpeed, this.SPEED_THRESHOLDS);
          const turbLevel = this.getHazardLevel(blockMaxTurb, this.TURBULENCE_THRESHOLDS);
          const pressureLevel = this.getHazardLevel(blockMaxPressure, this.PRESSURE_THRESHOLDS);
          
          const levels = [speedLevel, turbLevel, pressureLevel];
          const maxLevelIdx = Math.max(...levels.map(l => this.levelToIndex(l)));
          const maxLevel = this.indexToLevel(maxLevelIdx);
          
          if (maxLevelIdx >= 2) {
            const affectedBuildings = buildings.filter(b => {
              const cx = blockX * dx + (gridSize * dx) / 2;
              const cy = blockY * dy + (gridSize * dy) / 2;
              const cz = blockZ * dz + (gridSize * dz) / 2;
              
              return Math.abs(b.x - cx) < gridSize * dx &&
                     Math.abs(b.y - cy) < gridSize * dy &&
                     Math.abs(b.z - cz) < gridSize * dz;
            }).map(b => b.id);

            let primaryHazard: HazardZone['primaryHazard'] = 'speed';
            if (turbLevel === maxLevel) primaryHazard = 'turbulence';
            else if (pressureLevel === maxLevel) primaryHazard = 'pressure';

            zones.push({
              id: `zone_${blockX}_${blockY}_${blockZ}`,
              x: blockX * dx,
              y: blockY * dy,
              z: blockZ * dz,
              width: gridSize * dx,
              height: gridSize * dz,
              depth: gridSize * dy,
              hazardLevel: maxLevel,
              primaryHazard,
              severity: maxLevelIdx / 3,
              affectedBuildings
            });
          }
        }
      }
    }

    return zones;
  }

  private levelToIndex(level: string): number {
    switch (level) {
      case 'low': return 0;
      case 'medium': return 1;
      case 'high': return 2;
      case 'severe': return 3;
      default: return 0;
    }
  }

  private indexToLevel(index: number): 'low' | 'medium' | 'high' | 'severe' {
    switch (index) {
      case 0: return 'low';
      case 1: return 'medium';
      case 2: return 'high';
      default: return 'severe';
    }
  }

  private getHazardLevel(value: number, thresholds: { low: number; medium: number; high: number; severe: number }): string {
    if (value >= thresholds.severe) return 'severe';
    if (value >= thresholds.high) return 'high';
    if (value >= thresholds.medium) return 'medium';
    return 'low';
  }

  private determineOverallRisk(metrics: WindHazardMetrics, zones: HazardZone[]): 'low' | 'medium' | 'high' | 'severe' {
    const severeZones = zones.filter(z => z.hazardLevel === 'severe').length;
    const highZones = zones.filter(z => z.hazardLevel === 'high').length;
    
    if (severeZones > 0 || metrics.maxWindSpeed > this.SPEED_THRESHOLDS.severe) {
      return 'severe';
    }
    if (highZones > 2 || metrics.maxWindSpeed > this.SPEED_THRESHOLDS.high) {
      return 'high';
    }
    if (zones.length > 0 || metrics.maxWindSpeed > this.SPEED_THRESHOLDS.medium) {
      return 'medium';
    }
    return 'low';
  }

  private generateRecommendations(metrics: WindHazardMetrics, zones: HazardZone[]): string[] {
    const recommendations: string[] = [];
    
    if (metrics.maxWindSpeed > this.SPEED_THRESHOLDS.high) {
      recommendations.push('实施街道层面的风障或防风植被，降低高速风区风险');
      recommendations.push('在行人高度区域安装风速监测预警系统');
    }
    
    if (metrics.canyonAmplificationFactor > 1.3) {
      recommendations.push('街道峡谷效应显著，建议调整建筑间距或采用流线型立面设计');
      recommendations.push('在高层建筑底部设置挑檐或中庭结构，分散气流');
    }
    
    if (metrics.maxTurbulenceIntensity > this.TURBULENCE_THRESHOLDS.high) {
      recommendations.push('高湍流区域需优化建筑布局，避免锐角型建筑形态');
      recommendations.push('安装建筑表面风压监测系统，实时评估结构安全');
    }
    
    if (metrics.pedestrianLevelWindSpeed > 10) {
      recommendations.push('行人层面风速超标，建议设置防风走廊和遮蔽区域');
      recommendations.push('优化公共空间设计，避开强风影响区域');
    }
    
    if (metrics.buildingWindLoads.some(b => b.maxLoad > 1000)) {
      recommendations.push('部分建筑风荷载超出设计标准，建议进行结构加固评估');
      recommendations.push('考虑安装风荷载阻尼器或调谐质量阻尼器');
    }
    
    const severeZones = zones.filter(z => z.hazardLevel === 'severe');
    if (severeZones.length > 0) {
      recommendations.push(`识别到 ${severeZones.length} 个严重风险区域，需优先进行工程干预`);
    }
    
    if (recommendations.length === 0) {
      recommendations.push('当前风环境状况良好，建议定期监测维护');
    }
    
    return recommendations;
  }

  private generateSummary(
    metrics: WindHazardMetrics,
    zones: HazardZone[],
    overallRisk: 'low' | 'medium' | 'high' | 'severe'
  ): string {
    const zoneCount = zones.length;
    const severeZones = zones.filter(z => z.hazardLevel === 'severe').length;
    
    return `本次风环境评估覆盖整个城市区域，整体风险等级为"${this.getRiskText(overallRisk)}"。` +
           `最大风速达到 ${metrics.maxWindSpeed.toFixed(1)} m/s，` +
           `行人层面平均风速 ${metrics.pedestrianLevelWindSpeed.toFixed(1)} m/s。` +
           `识别到 ${zoneCount} 个风险区域，其中 ${severeZones} 个为严重风险区。` +
           `街道峡谷放大系数为 ${metrics.canyonAmplificationFactor.toFixed(2)}，` +
           `表明建筑群布局对风场有${metrics.canyonAmplificationFactor > 1.2 ? '显著' : '一定'}的加速效应。` +
           `建议根据评估报告采取相应的工程措施和管理策略，保障城市风环境安全。`;
  }

  private getRiskText(level: 'low' | 'medium' | 'high' | 'severe'): string {
    switch (level) {
      case 'low': return '低风险';
      case 'medium': return '中等风险';
      case 'high': return '高风险';
      case 'severe': return '严重风险';
    }
  }

  getThresholds() {
    return {
      speed: this.SPEED_THRESHOLDS,
      turbulence: this.TURBULENCE_THRESHOLDS,
      pressure: this.PRESSURE_THRESHOLDS
    };
  }
}
