import { describe, it, expect } from 'vitest';
import { AssociationEngine } from '../engines/associationEngine';
import { generateSKUs } from '../db/mockData';

describe('AssociationEngine - 关联分析引擎', () => {
  const engine = new AssociationEngine(0.05, 0.3);
  const skus = generateSKUs(100);

  describe('analyzeTransactions - 挖掘关联规则', () => {
    it('应该返回关联规则列表', () => {
      const transactions = skus.map(sku => [sku.id, ...sku.associatedSKUs.slice(0, 3)]);
      const rules = engine.analyzeTransactions(transactions);
      
      expect(rules).toBeDefined();
      expect(Array.isArray(rules)).toBe(true);
    });

    it('每条规则应该包含完整信息', () => {
      const transactions = skus.map(sku => [sku.id, ...sku.associatedSKUs.slice(0, 3)]);
      const rules = engine.analyzeTransactions(transactions);
      
      rules.forEach(rule => {
        expect(rule).toHaveProperty('antecedent');
        expect(rule).toHaveProperty('consequent');
        expect(rule).toHaveProperty('support');
        expect(rule).toHaveProperty('confidence');
        expect(rule).toHaveProperty('lift');
        
        expect(Array.isArray(rule.antecedent)).toBe(true);
        expect(Array.isArray(rule.consequent)).toBe(true);
        expect(rule.antecedent.length).toBeGreaterThan(0);
        expect(rule.consequent.length).toBeGreaterThan(0);
        expect(rule.support).toBeGreaterThanOrEqual(0);
        expect(rule.support).toBeLessThanOrEqual(1);
        expect(rule.confidence).toBeGreaterThanOrEqual(0);
        expect(rule.confidence).toBeLessThanOrEqual(1);
        expect(rule.lift).toBeGreaterThanOrEqual(0);
      });
    });

    it('较高的最小支持度应该返回较少的规则', () => {
      const transactions = skus.map(sku => [sku.id, ...sku.associatedSKUs.slice(0, 3)]);
      const engineLowSupport = new AssociationEngine(0.01, 0.3);
      const engineHighSupport = new AssociationEngine(0.1, 0.3);
      
      const rulesLowSupport = engineLowSupport.analyzeTransactions(transactions);
      const rulesHighSupport = engineHighSupport.analyzeTransactions(transactions);
      
      expect(rulesLowSupport.length).toBeGreaterThanOrEqual(rulesHighSupport.length);
    });

    it('较高的最小置信度应该返回较少的规则', () => {
      const transactions = skus.map(sku => [sku.id, ...sku.associatedSKUs.slice(0, 3)]);
      const engineLowConfidence = new AssociationEngine(0.05, 0.2);
      const engineHighConfidence = new AssociationEngine(0.05, 0.8);
      
      const rulesLowConfidence = engineLowConfidence.analyzeTransactions(transactions);
      const rulesHighConfidence = engineHighConfidence.analyzeTransactions(transactions);
      
      expect(rulesLowConfidence.length).toBeGreaterThanOrEqual(rulesHighConfidence.length);
    });
  });

  describe('getAssociatedSKUs - 获取关联 SKU', () => {
    it('应该返回与目标 SKU 关联的其他 SKU', () => {
      const targetSKUId = skus[0].id;
      const transactions = skus.map(sku => [sku.id, ...sku.associatedSKUs.slice(0, 3)]);
      const rules = engine.analyzeTransactions(transactions);
      const associated = engine.getAssociatedSKUs(targetSKUId, rules, 5);
      
      expect(Array.isArray(associated)).toBe(true);
      associated.forEach(skuId => {
        expect(typeof skuId).toBe('string');
        expect(skuId).not.toBe(targetSKUId);
      });
    });

    it('应该最多返回指定数量的结果', () => {
      const targetSKUId = skus[0].id;
      const transactions = skus.map(sku => [sku.id, ...sku.associatedSKUs.slice(0, 3)]);
      const rules = engine.analyzeTransactions(transactions);
      const associated = engine.getAssociatedSKUs(targetSKUId, rules, 3);
      
      expect(associated.length).toBeLessThanOrEqual(3);
    });
  });

  describe('边界条件', () => {
    it('空交易列表应该返回空规则', () => {
      const rules = engine.analyzeTransactions([]);
      expect(rules.length).toBe(0);
    });

    it('单元素交易应该返回空规则', () => {
      const transactions = [['A'], ['B'], ['C']];
      const rules = engine.analyzeTransactions(transactions);
      expect(rules.length).toBe(0);
    });

    it('不存在的 SKU 应该返回空关联', () => {
      const transactions = skus.map(sku => [sku.id, ...sku.associatedSKUs.slice(0, 3)]);
      const rules = engine.analyzeTransactions(transactions);
      const associated = engine.getAssociatedSKUs('NON_EXISTENT', rules, 5);
      expect(associated.length).toBe(0);
    });
  });

  describe('性能测试', () => {
    it('挖掘 100 条交易应该在 500ms 内完成', () => {
      const transactions = skus.map(sku => [sku.id, ...sku.associatedSKUs.slice(0, 3)]);
      const startTime = Date.now();
      
      engine.analyzeTransactions(transactions);
      
      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(500);
    });
  });
});
