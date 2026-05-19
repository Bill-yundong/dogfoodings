import { describe, it, expect } from 'vitest';
import {
  generateFrequentItemsets,
  generateAssociationRules,
  getAssociatedSkus,
  calculateCategoryAssociation,
} from '../associationAnalysis';
import type { SKU } from '@/types';

const createMockSKU = (id: string, category: string): SKU => ({
  id,
  name: `商品${id}`,
  category,
  dimensions: { length: 10, width: 10, height: 10 },
  weight: 1,
  turnoverRate: 5,
  lastInbound: new Date(),
  lastOutbound: new Date(),
  liquidityScore: 50,
  totalStock: 100,
  unit: '件',
});

describe('关联分析算法', () => {
  const skus: SKU[] = [
    createMockSKU('SKU-001', '电子产品'),
    createMockSKU('SKU-002', '电子产品'),
    createMockSKU('SKU-003', '服装'),
    createMockSKU('SKU-004', '食品'),
  ];

  describe('generateFrequentItemsets', () => {
    it('应识别高频单项集', () => {
      const orders = [
        { orderId: '1', skuIds: ['SKU-001', 'SKU-002'], timestamp: new Date() },
        { orderId: '2', skuIds: ['SKU-001'], timestamp: new Date() },
        { orderId: '3', skuIds: ['SKU-001', 'SKU-003'], timestamp: new Date() },
        { orderId: '4', skuIds: ['SKU-002'], timestamp: new Date() },
      ];
      const itemsets = generateFrequentItemsets(orders, skus, {
        minSupport: 0.25,
        minConfidence: 0.3,
        maxItemsPerItemset: 3,
      });
      expect(itemsets.get('SKU-001')).toBe(3);
      expect(itemsets.get('SKU-002')).toBe(2);
    });

    it('应识别高频双项集', () => {
      const orders = [
        { orderId: '1', skuIds: ['SKU-001', 'SKU-002'], timestamp: new Date() },
        { orderId: '2', skuIds: ['SKU-001', 'SKU-002'], timestamp: new Date() },
        { orderId: '3', skuIds: ['SKU-001', 'SKU-003'], timestamp: new Date() },
        { orderId: '4', skuIds: ['SKU-002', 'SKU-004'], timestamp: new Date() },
      ];
      const itemsets = generateFrequentItemsets(orders, skus, {
        minSupport: 0.25,
        minConfidence: 0.3,
        maxItemsPerItemset: 3,
      });
      expect(itemsets.get('SKU-001,SKU-002')).toBe(2);
    });

    it('应过滤低于最小支持度的项集', () => {
      const orders = [
        { orderId: '1', skuIds: ['SKU-001', 'SKU-002'], timestamp: new Date() },
        { orderId: '2', skuIds: ['SKU-003'], timestamp: new Date() },
        { orderId: '3', skuIds: ['SKU-004'], timestamp: new Date() },
        { orderId: '4', skuIds: ['SKU-001'], timestamp: new Date() },
      ];
      const itemsets = generateFrequentItemsets(orders, skus, {
        minSupport: 0.5,
        minConfidence: 0.3,
        maxItemsPerItemset: 3,
      });
      expect(itemsets.get('SKU-001,SKU-002')).toBeUndefined();
    });
  });

  describe('generateAssociationRules', () => {
    it('应生成有效的关联规则', () => {
      const orders = [
        { orderId: '1', skuIds: ['SKU-001', 'SKU-002'], timestamp: new Date() },
        { orderId: '2', skuIds: ['SKU-001', 'SKU-002'], timestamp: new Date() },
        { orderId: '3', skuIds: ['SKU-001'], timestamp: new Date() },
        { orderId: '4', skuIds: ['SKU-002'], timestamp: new Date() },
      ];
      const itemsets = generateFrequentItemsets(orders, skus, {
        minSupport: 0.25,
        minConfidence: 0.3,
        maxItemsPerItemset: 3,
      });
      const rules = generateAssociationRules(itemsets, orders, {
        minSupport: 0.25,
        minConfidence: 0.3,
        maxItemsPerItemset: 3,
      });
      expect(rules.length).toBeGreaterThan(0);
      rules.forEach((rule) => {
        expect(rule.confidence).toBeGreaterThanOrEqual(0.3);
        expect(rule.support).toBeGreaterThanOrEqual(0.25);
      });
    });

    it('规则应按置信度*支持度排序', () => {
      const orders = [
        { orderId: '1', skuIds: ['SKU-001', 'SKU-002'], timestamp: new Date() },
        { orderId: '2', skuIds: ['SKU-001', 'SKU-002'], timestamp: new Date() },
        { orderId: '3', skuIds: ['SKU-001', 'SKU-003'], timestamp: new Date() },
        { orderId: '4', skuIds: ['SKU-002'], timestamp: new Date() },
      ];
      const itemsets = generateFrequentItemsets(orders, skus, {
        minSupport: 0.25,
        minConfidence: 0.1,
        maxItemsPerItemset: 3,
      });
      const rules = generateAssociationRules(itemsets, orders, {
        minSupport: 0.25,
        minConfidence: 0.1,
        maxItemsPerItemset: 3,
      });
      for (let i = 1; i < rules.length; i++) {
        const prevScore = rules[i - 1].confidence * rules[i - 1].support;
        const currScore = rules[i].confidence * rules[i].support;
        expect(prevScore).toBeGreaterThanOrEqual(currScore);
      }
    });
  });

  describe('getAssociatedSkus', () => {
    it('应返回指定SKU的关联SKU', () => {
      const rules = [
        { skuId1: 'SKU-001', skuId2: 'SKU-002', confidence: 0.8, support: 0.4, lift: 1.5, orderCount: 80 },
        { skuId1: 'SKU-001', skuId2: 'SKU-003', confidence: 0.6, support: 0.3, lift: 1.2, orderCount: 60 },
        { skuId1: 'SKU-002', skuId2: 'SKU-004', confidence: 0.7, support: 0.35, lift: 1.3, orderCount: 70 },
      ];
      const associated = getAssociatedSkus('SKU-001', rules, 10);
      expect(associated).toHaveLength(2);
      expect(associated[0].skuId).toBe('SKU-002');
      expect(associated[1].skuId).toBe('SKU-003');
    });

    it('无关联时返回空数组', () => {
      const rules = [
        { skuId1: 'SKU-001', skuId2: 'SKU-002', confidence: 0.8, support: 0.4, lift: 1.5, orderCount: 80 },
      ];
      const associated = getAssociatedSkus('SKU-999', rules, 10);
      expect(associated).toHaveLength(0);
    });
  });

  describe('calculateCategoryAssociation', () => {
    it('应计算分类间的关联度', () => {
      const rules = [
        { skuId1: 'SKU-001', skuId2: 'SKU-002', confidence: 0.8, support: 0.4, lift: 1.5, orderCount: 80 },
        { skuId1: 'SKU-001', skuId2: 'SKU-003', confidence: 0.6, support: 0.3, lift: 1.2, orderCount: 60 },
      ];
      const categoryAssociations = calculateCategoryAssociation(rules, skus);
      expect(categoryAssociations.has('电子产品')).toBe(true);
      const electronicsMap = categoryAssociations.get('电子产品');
      expect(electronicsMap?.has('电子产品')).toBe(true);
      expect(electronicsMap?.has('服装')).toBe(true);
    });
  });
});
