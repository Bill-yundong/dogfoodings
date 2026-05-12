import type { Ship, Anchorage, WeatherCondition, AnchorStatus } from '../types';
import { catenaryModel } from '../models/catenary';
import { db } from '../db';

export interface OptimizationResult {
  shipId: string;
  recommendedAnchorage: string;
  recommendedScope: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  holdingPower: number;
  environmentalForce: number;
  priorityScore: number;
}

export interface EvacuationPlan {
  shipOrders: {
    shipId: string;
    order: number;
    targetAnchorage: string;
    estimatedTime: number;
  }[];
  totalEstimatedTime: number;
  riskAssessment: string;
}

export class TyphoonOptimizer {
  private readonly TYPHOON_WIND_THRESHOLD = 25;
  private readonly CRITICAL_WIND_THRESHOLD = 40;

  calculateShipPriority(
    ship: Ship,
    currentStatus: AnchorStatus | undefined,
    weather: WeatherCondition
  ): number {
    let priority = 0;

    if (currentStatus) {
      const riskScores: Record<string, number> = {
        critical: 100,
        high: 70,
        medium: 40,
        low: 10
      };
      priority += riskScores[currentStatus.dragRisk];
    }

    priority += ship.grossTonnage / 1000;
    priority += ship.length / 10;

    if (weather.windSpeed > this.CRITICAL_WIND_THRESHOLD) {
      priority += 50;
    } else if (weather.windSpeed > this.TYPHOON_WIND_THRESHOLD) {
      priority += 30;
    }

    return priority;
  }

  async optimizeShipPlacement(
    ship: Ship,
    anchorages: Anchorage[],
    weather: WeatherCondition,
    currentSpeed: number,
    currentDirection: number
  ): Promise<OptimizationResult[]> {
    const results: OptimizationResult[] = [];

    for (const anchorage of anchorages) {
      for (let scope = 4; scope <= 8; scope += 0.5) {
        const status = await catenaryModel.simulateAnchorStability(
          ship,
          anchorage,
          weather,
          currentSpeed,
          currentDirection,
          scope
        );

        const forces = catenaryModel.calculateEnvironmentalForces(
          ship,
          weather,
          currentSpeed,
          currentDirection
        );

        results.push({
          shipId: ship.id,
          recommendedAnchorage: anchorage.id,
          recommendedScope: scope,
          riskLevel: status.dragRisk,
          holdingPower: status.holdingPower,
          environmentalForce: forces.horizontalForce,
          priorityScore: this.calculateShipPriority(ship, status, weather)
        });
      }
    }

    return results.sort((a, b) => {
      const riskOrder: Record<string, number> = { low: 0, medium: 1, high: 2, critical: 3 };
      if (riskOrder[a.riskLevel] !== riskOrder[b.riskLevel]) {
        return riskOrder[a.riskLevel] - riskOrder[b.riskLevel];
      }
      return b.holdingPower / b.environmentalForce - a.holdingPower / a.environmentalForce;
    });
  }

  async generateEvacuationPlan(
    ships: Ship[],
    anchorages: Anchorage[],
    weather: WeatherCondition,
    currentSpeed: number,
    currentDirection: number
  ): Promise<EvacuationPlan> {
    const shipOptimizations: { ship: Ship; bestOption: OptimizationResult }[] = [];

    for (const ship of ships) {
      const optimizations = await this.optimizeShipPlacement(
        ship,
        anchorages,
        weather,
        currentSpeed,
        currentDirection
      );
      shipOptimizations.push({
        ship,
        bestOption: optimizations[0]
      });
    }

    const sortedShips = shipOptimizations.sort((a, b) =>
      b.bestOption.priorityScore - a.bestOption.priorityScore
    );

    const anchorageUsage: Map<string, number> = new Map();
    anchorages.forEach(a => anchorageUsage.set(a.id, 0));

    const shipOrders = sortedShips.map((item, index) => {
      const targetAnchorage = item.bestOption.recommendedAnchorage;
      const usage = anchorageUsage.get(targetAnchorage) || 0;
      anchorageUsage.set(targetAnchorage, usage + 1);

      return {
        shipId: item.ship.id,
        order: index + 1,
        targetAnchorage,
        estimatedTime: (index + 1) * 30
      };
    });

    const highRiskCount = shipOptimizations.filter(
      s => s.bestOption.riskLevel === 'high' || s.bestOption.riskLevel === 'critical'
    ).length;

    let riskAssessment = '低风险';
    if (highRiskCount > ships.length * 0.5) {
      riskAssessment = '危急 - 需要立即疏散';
    } else if (highRiskCount > ships.length * 0.2) {
      riskAssessment = '高风险 - 建议尽快疏散';
    } else if (highRiskCount > 0) {
      riskAssessment = '中等风险 - 准备疏散';
    }

    return {
      shipOrders,
      totalEstimatedTime: shipOrders.length * 30,
      riskAssessment
    };
  }

  recommendScopeAdjustment(
    currentScope: number,
    weather: WeatherCondition,
    geologyType: string
  ): number {
    let recommendedScope = currentScope;

    if (weather.windSpeed > this.CRITICAL_WIND_THRESHOLD) {
      recommendedScope = Math.max(recommendedScope, 7);
    } else if (weather.windSpeed > this.TYPHOON_WIND_THRESHOLD) {
      recommendedScope = Math.max(recommendedScope, 6);
    }

    if (geologyType === 'sand' || geologyType === 'rock') {
      recommendedScope += 1;
    }

    return Math.min(Math.max(recommendedScope, 4), 10);
  }

  async getHistoricalRiskAnalysis(anchorageId: string, days: number = 7): Promise<any> {
    const records = await db.getTidalRecordsByAnchorage(anchorageId, days * 24);
    
    if (records.length === 0) {
      return null;
    }

    const avgCurrentSpeed = records.reduce((sum, r) => sum + r.currentSpeed, 0) / records.length;
    const maxCurrentSpeed = Math.max(...records.map(r => r.currentSpeed));
    const avgHeight = records.reduce((sum, r) => sum + r.height, 0) / records.length;

    return {
      avgCurrentSpeed,
      maxCurrentSpeed,
      avgHeight,
      recordCount: records.length,
      riskIndicator: maxCurrentSpeed > 1.5 ? 'high' : maxCurrentSpeed > 1.0 ? 'medium' : 'low'
    };
  }
}

export const typhoonOptimizer = new TyphoonOptimizer();
