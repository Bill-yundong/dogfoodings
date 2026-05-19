import { describe, it, expect } from 'vitest';
import { liquidityEngine } from '../engines/liquidityEngine';
import { generateSKUs } from '../db/mockData';

describe('LiquidityEngine - 流动性分析引擎', () => {
  describe('calculateLiquidity - 计算流动性评分', () => {
    it('应该返回 0-100 之间的数值', () => {
      const skus = generateSKUs(100);
      const score = liquidityEngine.calculateLiquidity(skus[0], skus);
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    });

    it('出入库次数越高，流动性评分越高', () => {
      const skus = generateSKUs(100);
      const highActivitySKU = { ...skus[0], inCount: 500, outCount: 400 };
      const lowActivitySKU = { ...skus[1], inCount: 10, outCount: 5 };
      
      const highScore = liquidityEngine.calculateLiquidity(highActivitySKU, skus);
      const lowScore = liquidityEngine.calculateLiquidity(lowActivitySKU, skus);
      
      expect(highScore).toBeGreaterThan(lowScore);
    });
  });

  describe('analyzeSKU - 分析单个 SKU', () => {
    it('应该返回完整的分析结果', () => {
      const skus = generateSKUs(100);
      const analysis = liquidityEngine.analyzeSKU(skus[0], skus, []);
      
      expect(analysis).toHaveProperty('overallScore');
      expect(analysis).toHaveProperty('categoryRank');
      expect(analysis).toHaveProperty('categoryTotal');
      expect(analysis).toHaveProperty('trend');
      expect(analysis).toHaveProperty('trendStrength');
      expect(analysis).toHaveProperty('heatLevel');
      expect(analysis).toHaveProperty('recommendations');
      
      expect(analysis.overallScore).toBeGreaterThanOrEqual(0);
      expect(analysis.overallScore).toBeLessThanOrEqual(100);
      expect(analysis.categoryRank).toBeGreaterThanOrEqual(0);
      expect(analysis.categoryTotal).toBeGreaterThan(0);
      expect(['increasing', 'decreasing', 'stable']).toContain(analysis.trend);
      expect(analysis.recommendations.length).toBeGreaterThan(0);
    });

    it('分类排名应该在有效范围内', () => {
      const skus = generateSKUs(100);
      const analysis = liquidityEngine.analyzeSKU(skus[0], skus, []);
      
      expect(analysis.categoryRank).toBeGreaterThanOrEqual(1);
      expect(analysis.categoryRank).toBeLessThanOrEqual(analysis.categoryTotal);
    });
  });

  describe('getCategoryStats - 获取分类统计', () => {
    it('应该返回所有分类的统计信息', () => {
      const skus = generateSKUs(500);
      const stats = liquidityEngine.getCategoryStats(skus);
      
      expect(stats.length).toBe(6);
      
      stats.forEach(stat => {
        expect(stat).toHaveProperty('category');
        expect(stat).toHaveProperty('totalSKUs');
        expect(stat).toHaveProperty('avgLiquidity');
        expect(stat).toHaveProperty('highCount');
        expect(stat).toHaveProperty('mediumCount');
        expect(stat).toHaveProperty('lowCount');
        
        expect(stat.totalSKUs).toBeGreaterThan(0);
        expect(stat.avgLiquidity).toBeGreaterThanOrEqual(0);
        expect(stat.avgLiquidity).toBeLessThanOrEqual(100);
        expect(stat.highCount + stat.mediumCount + stat.lowCount).toBe(stat.totalSKUs);
      });
    });
  });

  describe('getLiquidityDistribution - 获取流动性分布', () => {
    it('应该返回正确的分布数据', () => {
      const skus = generateSKUs(1000);
      const distribution = liquidityEngine.getLiquidityDistribution(skus);
      
      expect(distribution.length).toBeGreaterThan(0);
      
      distribution.forEach(item => {
        expect(item).toHaveProperty('range');
        expect(item).toHaveProperty('count');
        expect(item).toHaveProperty('percentage');
        expect(item.count).toBeGreaterThanOrEqual(0);
        expect(item.percentage).toBeGreaterThanOrEqual(0);
        expect(item.percentage).toBeLessThanOrEqual(100);
      });
    });
  });

  describe('getTopSKUs - 获取热门 SKU', () => {
    it('应该按流动性降序返回指定数量的 SKU', () => {
      const skus = generateSKUs(100);
      const top10 = liquidityEngine.getTopSKUs(skus, 10);
      
      expect(top10.length).toBe(10);
      
      for (let i = 0; i < top10.length - 1; i++) {
        const scoreA = liquidityEngine.calculateLiquidity(top10[i], skus);
        const scoreB = liquidityEngine.calculateLiquidity(top10[i + 1], skus);
        expect(scoreA).toBeGreaterThanOrEqual(scoreB);
      }
    });

    it('当请求数量超过总数量时，返回所有 SKU', () => {
      const skus = generateSKUs(50);
      const top100 = liquidityEngine.getTopSKUs(skus, 100);
      
      expect(top100.length).toBe(50);
    });
  });

  describe('性能测试', () => {
    it('分析 1000 个 SKU 应该在合理时间内完成', () => {
      const skus = generateSKUs(1000);
      const startTime = Date.now();
      
      for (let i = 0; i < 100; i++) {
        liquidityEngine.calculateLiquidity(skus[i], skus);
      }
      
      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(1000);
    });
  });
});
