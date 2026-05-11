import { describe, it, expect, beforeEach } from 'vitest';
import { dataStore } from '../../services/dataStore';

describe('DataStore Service', () => {
  beforeEach(async () => {
    await dataStore.init();
  });

  describe('初始化测试', () => {
    it('应该成功初始化服务', () => {
      expect(dataStore).toBeDefined();
    });

    it('初始化后应该有裂缝数据', () => {
      const cracks = dataStore.getCracks();
      expect(cracks.length).toBeGreaterThan(0);
    });

    it('初始化后应该有养护记录数据', () => {
      const records = dataStore.getMaintenanceRecords();
      expect(records.length).toBeGreaterThan(0);
    });
  });

  describe('裂缝数据查询', () => {
    it('getCracks 应该返回所有裂缝数据', () => {
      const cracks = dataStore.getCracks();
      expect(Array.isArray(cracks)).toBe(true);
      expect(cracks[0]).toHaveProperty('id');
      expect(cracks[0]).toHaveProperty('coordinate');
      expect(cracks[0]).toHaveProperty('severity');
      expect(cracks[0]).toHaveProperty('roadSection');
    });

    it('getCrackById 应该根据ID返回正确的裂缝', () => {
      const cracks = dataStore.getCracks();
      const firstCrack = cracks[0];
      const foundCrack = dataStore.getCrackById(firstCrack.id);
      expect(foundCrack).toEqual(firstCrack);
    });

    it('getCrackById 传入不存在的ID应该返回 undefined', () => {
      const result = dataStore.getCrackById('non-existent-id');
      expect(result).toBeUndefined();
    });

    it('getCracksByRoadSection 应该按路段筛选裂缝', () => {
      const cracks = dataStore.getCracks();
      const section = cracks[0].roadSection;
      const filtered = dataStore.getCracksByRoadSection(section);
      expect(filtered.every(c => c.roadSection === section)).toBe(true);
    });

    it('getCracksBySeverity 应该按严重程度筛选裂缝', () => {
      const filtered = dataStore.getCracksBySeverity('high');
      expect(filtered.every(c => c.severity === 'high')).toBe(true);
    });
  });

  describe('养护记录查询', () => {
    it('getMaintenanceRecords 应该返回所有养护记录', () => {
      const records = dataStore.getMaintenanceRecords();
      expect(Array.isArray(records)).toBe(true);
      expect(records[0]).toHaveProperty('id');
      expect(records[0]).toHaveProperty('actionType');
      expect(records[0]).toHaveProperty('cost');
    });

    it('getMaintenanceRecordById 应该根据ID返回正确的记录', () => {
      const records = dataStore.getMaintenanceRecords();
      const firstRecord = records[0];
      const foundRecord = dataStore.getMaintenanceRecordById(firstRecord.id);
      expect(foundRecord).toEqual(firstRecord);
    });

    it('getMaintenanceByCrackId 应该返回关联裂缝的所有养护记录', () => {
      const records = dataStore.getMaintenanceRecords();
      if (records.length > 0) {
        const crackId = records[0].crackId;
        const filtered = dataStore.getMaintenanceByCrackId(crackId);
        expect(filtered.every(r => r.crackId === crackId)).toBe(true);
      }
    });
  });

  describe('财务记录管理', () => {
    it('addFinancialRecord 应该成功添加财务记录', () => {
      const initialRecords = dataStore.getFinancialRecords();
      const newRecord = {
        id: 'FIN-TEST-001',
        referenceId: 'REF-001',
        category: 'material_cost',
        amount: 1000,
        currency: 'CNY',
        budgetCode: 'TEST-001',
        approvalStatus: 'pending',
        transactionDate: '2026-01-01'
      };
      dataStore.addFinancialRecord(newRecord);
      const finalRecords = dataStore.getFinancialRecords();
      expect(finalRecords.length).toBe(initialRecords.length + 1);
      expect(finalRecords.find(r => r.id === newRecord.id)).toEqual(newRecord);
    });
  });

  describe('统计数据', () => {
    it('getStatistics 应该返回正确的统计信息', () => {
      const stats = dataStore.getStatistics();
      const cracks = dataStore.getCracks();
      const maintenance = dataStore.getMaintenanceRecords();

      expect(stats).toHaveProperty('totalCracks');
      expect(stats).toHaveProperty('criticalCracks');
      expect(stats).toHaveProperty('maintenanceCost');
      expect(stats).toHaveProperty('pendingApprovals');
      expect(stats.totalCracks).toBe(cracks.length);
      expect(stats.criticalCracks).toBe(cracks.filter(c => c.severity === 'critical').length);
      expect(stats.maintenanceCost).toBe(maintenance.reduce((sum, r) => sum + r.cost, 0));
    });
  });
});
