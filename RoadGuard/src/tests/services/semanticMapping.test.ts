import { describe, it, expect, beforeEach } from 'vitest';
import { semanticMappingService } from '../../services/semanticMapping';
import { dataStore } from '../../services/dataStore';

describe('SemanticMapping Service', () => {
  beforeEach(async () => {
    await semanticMappingService.init();
    await dataStore.init();
  });

  describe('初始化测试', () => {
    it('应该成功初始化服务', () => {
      expect(semanticMappingService).toBeDefined();
      expect(semanticMappingService.isInitialized()).toBe(true);
    });

    it('初始化后应该有默认映射规则', () => {
      const rules = semanticMappingService.getRules();
      expect(rules.length).toBeGreaterThan(0);
    });
  });

  describe('养护记录转财务记录', () => {
    it('应该成功转换养护记录为财务记录', async () => {
      const maintenanceRecords = dataStore.getMaintenanceRecords();
      const record = maintenanceRecords[0];

      const financial = await semanticMappingService.maintenanceToFinancial(record);

      expect(financial).toBeDefined();
      expect(financial.id).toContain('FIN-');
      expect(financial.referenceId).toBe(record.id);
      expect(financial.amount).toBe(record.cost);
      expect(financial.currency).toBe('CNY');
      expect(financial.approvalStatus).toBe('pending');
      expect(financial.budgetCode).toBeDefined();
    });

    it('应该正确转换 actionType 为 category', async () => {
      const maintenanceRecords = dataStore.getMaintenanceRecords();
      const inspectionRecord = maintenanceRecords.find(r => r.actionType === 'inspection');

      if (inspectionRecord) {
        const financial = await semanticMappingService.maintenanceToFinancial(inspectionRecord);
        expect(financial.category).toBe('inspection_fee');
      }
    });

    it('应该正确映射执行日期到交易日期', async () => {
      const maintenanceRecords = dataStore.getMaintenanceRecords();
      const record = maintenanceRecords[0];

      const financial = await semanticMappingService.maintenanceToFinancial(record);
      expect(financial.transactionDate).toBe(record.executionDate);
    });
  });

  describe('财务记录转养护记录', () => {
    it('应该成功转换财务记录为养护记录字段', async () => {
      const maintenanceRecords = dataStore.getMaintenanceRecords();
      const originalRecord = maintenanceRecords[0];
      const financial = await semanticMappingService.maintenanceToFinancial(originalRecord);

      const converted = await semanticMappingService.financialToMaintenance(financial);

      expect(converted).toBeDefined();
      expect(converted.id).toBe(financial.referenceId);
      expect(converted.executionDate).toBe(financial.transactionDate);
    });
  });

  describe('映射规则管理', () => {
    it('getRules 应该返回所有映射规则', () => {
      const rules = semanticMappingService.getRules();
      expect(Array.isArray(rules)).toBe(true);
      expect(rules[0]).toHaveProperty('id');
      expect(rules[0]).toHaveProperty('maintenanceField');
      expect(rules[0]).toHaveProperty('financialField');
      expect(rules[0]).toHaveProperty('transformation');
    });

    it('addRule 应该成功添加新规则', () => {
      const initialRules = semanticMappingService.getRules();
      const newRule = {
        maintenanceField: 'testField',
        financialField: 'testFieldMapped',
        transformation: 'direct' as const,
        bidirectional: true
      };

      const addedRule = semanticMappingService.addRule(newRule);
      const finalRules = semanticMappingService.getRules();

      expect(finalRules.length).toBe(initialRules.length + 1);
      expect(addedRule.id).toBeDefined();
      expect(addedRule.maintenanceField).toBe(newRule.maintenanceField);
    });

    it('updateRule 应该成功更新现有规则', () => {
      const rules = semanticMappingService.getRules();
      const ruleToUpdate = rules[0];
      const updateData = { bidirectional: false };

      const updated = semanticMappingService.updateRule(ruleToUpdate.id, updateData);
      expect(updated).not.toBeNull();
      expect(updated?.bidirectional).toBe(false);
    });

    it('updateRule 传入不存在的ID应该返回 null', () => {
      const result = semanticMappingService.updateRule('non-existent-id', {});
      expect(result).toBeNull();
    });

    it('removeRule 应该成功删除规则', () => {
      const newRule = semanticMappingService.addRule({
        maintenanceField: 'toDelete',
        financialField: 'toDelete',
        transformation: 'direct',
        bidirectional: true
      });

      const initialRules = semanticMappingService.getRules();
      const result = semanticMappingService.removeRule(newRule.id);
      const finalRules = semanticMappingService.getRules();

      expect(result).toBe(true);
      expect(finalRules.length).toBe(initialRules.length - 1);
    });

    it('removeRule 传入不存在的ID应该返回 false', () => {
      const result = semanticMappingService.removeRule('non-existent-id');
      expect(result).toBe(false);
    });
  });

  describe('字段映射元数据', () => {
    it('getFieldMappings 应该返回正确的字段列表', () => {
      const mappings = semanticMappingService.getFieldMappings();

      expect(mappings).toHaveProperty('maintenance');
      expect(mappings).toHaveProperty('financial');
      expect(Array.isArray(mappings.maintenance)).toBe(true);
      expect(Array.isArray(mappings.financial)).toBe(true);
      expect(mappings.maintenance).toContain('id');
      expect(mappings.maintenance).toContain('cost');
      expect(mappings.maintenance).toContain('actionType');
      expect(mappings.financial).toContain('referenceId');
      expect(mappings.financial).toContain('amount');
      expect(mappings.financial).toContain('category');
    });
  });

  describe('转换类型测试', () => {
    it('应该支持 direct 类型转换', async () => {
      const maintenanceRecords = dataStore.getMaintenanceRecords();
      const record = maintenanceRecords[0];

      const financial = await semanticMappingService.maintenanceToFinancial(record);

      expect(financial.remarks).toBe(record.description);
    });

    it('应该支持 categorize 类型转换', async () => {
      const maintenanceRecords = dataStore.getMaintenanceRecords();
      const repairRecord = maintenanceRecords.find(r => r.actionType === 'repair');

      if (repairRecord) {
        const financial = await semanticMappingService.maintenanceToFinancial(repairRecord);
        expect(financial.category).toBe('maintenance_fee');
      }
    });
  });

  describe('预算编码生成', () => {
    it('生成的预算编码应该包含年份和类别信息', async () => {
      const maintenanceRecords = dataStore.getMaintenanceRecords();
      const record = maintenanceRecords[0];

      const financial = await semanticMappingService.maintenanceToFinancial(record);
      const year = new Date(record.executionDate).getFullYear();

      expect(financial.budgetCode).toContain(String(year));
      expect(financial.budgetCode).toContain('ROAD-');
    });
  });
});
