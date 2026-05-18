import { SKU, SKUSnapshot, Location } from '../types';

export interface LiquidityConfig {
  inWeight: number;
  outWeight: number;
  recencyWeight: number;
  alpha: number;
}

const DEFAULT_CONFIG: LiquidityConfig = {
  inWeight: 0.3,
  outWeight: 0.5,
  recencyWeight: 0.2,
  alpha: 0.3
};

export interface LiquidityAnalysis {
  overallScore: number;
  trend: 'increasing' | 'stable' | 'decreasing';
  trendStrength: number;
  heatLevel: number;
  categoryRank: number;
  categoryTotal: number;
  recommendations: string[];
}

export interface CategoryStats {
  category: string;
  avgLiquidity: number;
  totalSKUs: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
}

export class LiquidityEngine {
  private config: LiquidityConfig;

  constructor(config?: Partial<LiquidityConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  public calculateLiquidity(sku: SKU, allSKUs: SKU[]): number {
    const maxIn = Math.max(...allSKUs.map(s => s.inCount), 1);
    const maxOut = Math.max(...allSKUs.map(s => s.outCount), 1);

    const normalizedIn = sku.inCount / maxIn;
    const normalizedOut = sku.outCount / maxOut;

    const now = Date.now();
    const daysSinceLastMove = (now - sku.lastMoveTime) / (1000 * 60 * 60 * 24);
    const recencyScore = Math.max(0, 1 - daysSinceLastMove / 30);

    const score =
      normalizedIn * this.config.inWeight +
      normalizedOut * this.config.outWeight +
      recencyScore * this.config.recencyWeight;

    return Math.min(100, Math.max(0, score * 100));
  }

  public calculateHeatLevel(liquidityScore: number): number {
    if (liquidityScore >= 80) return 5;
    if (liquidityScore >= 60) return 4;
    if (liquidityScore >= 40) return 3;
    if (liquidityScore >= 20) return 2;
    if (liquidityScore >= 5) return 1;
    return 0;
  }

  public analyzeSKU(sku: SKU, allSKUs: SKU[], snapshots: SKUSnapshot[]): LiquidityAnalysis {
    const categorySKUs = allSKUs.filter(s => s.category === sku.category);
    const categoryLiquidities = categorySKUs.map(s => this.calculateLiquidity(s, allSKUs));
    categoryLiquidities.sort((a, b) => b - a);

    const skuLiquidity = this.calculateLiquidity(sku, allSKUs);
    const categoryRank = categoryLiquidities.indexOf(skuLiquidity) + 1;

    const skuSnapshots = snapshots.filter(s => s.skuId === sku.id).sort((a, b) => a.timestamp - b.timestamp);
    const { trend, trendStrength } = this.analyzeTrend(skuSnapshots);

    const recommendations = this.generateRecommendations(sku, skuLiquidity, trend);

    return {
      overallScore: skuLiquidity,
      trend,
      trendStrength,
      heatLevel: this.calculateHeatLevel(skuLiquidity),
      categoryRank,
      categoryTotal: categorySKUs.length,
      recommendations
    };
  }

  private analyzeTrend(snapshots: SKUSnapshot[]): { trend: 'increasing' | 'stable' | 'decreasing'; trendStrength: number } {
    if (snapshots.length < 2) {
      return { trend: 'stable', trendStrength: 0 };
    }

    const values = snapshots.map(s => s.liquidityScore);
    const n = values.length;

    let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
    for (let i = 0; i < n; i++) {
      sumX += i;
      sumY += values[i];
      sumXY += i * values[i];
      sumXX += i * i;
    }

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const avgY = sumY / n;
    const normalizedSlope = avgY > 0 ? slope / avgY : 0;

    let trend: 'increasing' | 'stable' | 'decreasing' = 'stable';
    if (normalizedSlope > 0.05) trend = 'increasing';
    else if (normalizedSlope < -0.05) trend = 'decreasing';

    return {
      trend,
      trendStrength: Math.min(1, Math.abs(normalizedSlope) * 10)
    };
  }

  private generateRecommendations(sku: SKU, liquidity: number, trend: string): string[] {
    const recommendations: string[] = [];

    if (liquidity >= 80) {
      recommendations.push('高流动性商品，建议放置在低位、靠近出入口的货位');
      recommendations.push('考虑增加安全库存以应对高需求');
    } else if (liquidity >= 50) {
      recommendations.push('中等流动性商品，可放置在中层货位');
    } else if (liquidity >= 20) {
      recommendations.push('低流动性商品，可放置在高层或远离出入口的货位');
    } else {
      recommendations.push('极低流动性商品，考虑清理库存或促销');
      recommendations.push('可放置在最不便利的货位以节省优质空间');
    }

    if (trend === 'increasing') {
      recommendations.push('流动性呈上升趋势，建议调整存储位置到更便利的区域');
    } else if (trend === 'decreasing') {
      recommendations.push('流动性呈下降趋势，可考虑调整到较远处货位');
    }

    if (sku.associatedSKUs.length > 0) {
      recommendations.push(`与 ${sku.associatedSKUs.length} 个 SKU 存在关联，建议邻近存储`);
    }

    return recommendations;
  }

  public getCategoryStats(skus: SKU[]): CategoryStats[] {
    const categoryMap = new Map<string, SKU[]>();

    for (const sku of skus) {
      if (!categoryMap.has(sku.category)) {
        categoryMap.set(sku.category, []);
      }
      categoryMap.get(sku.category)!.push(sku);
    }

    const stats: CategoryStats[] = [];

    for (const [category, categorySKUs] of categoryMap) {
      const liquidities = categorySKUs.map(s => this.calculateLiquidity(s, skus));
      const avgLiquidity = liquidities.reduce((a, b) => a + b, 0) / liquidities.length;

      stats.push({
        category,
        avgLiquidity,
        totalSKUs: categorySKUs.length,
        highCount: liquidities.filter(l => l >= 60).length,
        mediumCount: liquidities.filter(l => l >= 20 && l < 60).length,
        lowCount: liquidities.filter(l => l < 20).length
      });
    }

    return stats.sort((a, b) => b.avgLiquidity - a.avgLiquidity);
  }

  public getTopSKUs(skus: SKU[], limit: number = 10): SKU[] {
    return [...skus]
      .sort((a, b) => this.calculateLiquidity(b, skus) - this.calculateLiquidity(a, skus))
      .slice(0, limit);
  }

  public getBottomSKUs(skus: SKU[], limit: number = 10): SKU[] {
    return [...skus]
      .sort((a, b) => this.calculateLiquidity(a, skus) - this.calculateLiquidity(b, skus))
      .slice(0, limit);
  }

  public updateLiquidityScores(skus: SKU[]): SKU[] {
    return skus.map(sku => ({
      ...sku,
      liquidityScore: this.calculateLiquidity(sku, skus),
      heatLevel: this.calculateHeatLevel(this.calculateLiquidity(sku, skus))
    }));
  }

  public generateSnapshot(sku: SKU): SKUSnapshot {
    return {
      skuId: sku.id,
      timestamp: Date.now(),
      liquidityScore: sku.liquidityScore,
      inCount: sku.inCount,
      outCount: sku.outCount
    };
  }

  public generateBatchSnapshots(skus: SKU[]): SKUSnapshot[] {
    return skus.map(sku => this.generateSnapshot(sku));
  }

  public getLiquidityDistribution(skus: SKU[]): { range: string; count: number; percentage: number }[] {
    const ranges = [
      { min: 0, max: 20, label: '0-20' },
      { min: 20, max: 40, label: '20-40' },
      { min: 40, max: 60, label: '40-60' },
      { min: 60, max: 80, label: '60-80' },
      { min: 80, max: 101, label: '80-100' }
    ];

    const liquidities = skus.map(s => this.calculateLiquidity(s, skus));
    const total = liquidities.length;

    return ranges.map(range => {
      const count = liquidities.filter(l => l >= range.min && l < range.max).length;
      return {
        range: range.label,
        count,
        percentage: total > 0 ? (count / total) * 100 : 0
      };
    });
  }

  public calculateOptimalLocation(sku: SKU, locations: Location[]): Location | undefined {
    const heatLevel = this.calculateHeatLevel(this.calculateLiquidity(sku, []));
    
    const matchingLocations = locations.filter(
      l => l.status === 'empty' && Math.abs(l.heatLevel - heatLevel) <= 1
    );

    if (matchingLocations.length === 0) {
      return locations.find(l => l.status === 'empty');
    }

    return matchingLocations.sort((a, b) => {
      const aHeatDiff = Math.abs(a.heatLevel - heatLevel);
      const bHeatDiff = Math.abs(b.heatLevel - heatLevel);
      if (aHeatDiff !== bHeatDiff) return aHeatDiff - bHeatDiff;
      return a.level - b.level;
    })[0];
  }
}

export const liquidityEngine = new LiquidityEngine();
