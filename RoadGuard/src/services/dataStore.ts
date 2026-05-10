import type { CrackPoint, MaintenanceRecord, FinancialRecord } from '../types';

class DataStoreService {
  private cracks: CrackPoint[] = [];
  private maintenanceRecords: MaintenanceRecord[] = [];
  private financialRecords: FinancialRecord[] = [];

  async init(): Promise<void> {
    this.generateMockData();
  }

  private generateMockData(): void {
    const roadSections = ['A-001', 'A-002', 'B-001', 'B-002', 'C-001'];
    const severities: CrackPoint['severity'][] = ['low', 'medium', 'high', 'critical'];

    for (let i = 0; i < 25; i++) {
      const crack: CrackPoint = {
        id: `CRK-${String(i + 1).padStart(4, '0')}`,
        coordinate: {
          x: Math.random() * 1000,
          y: Math.random() * 500,
          timestamp: Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000
        },
        width: Math.random() * 50 + 5,
        length: Math.random() * 200 + 20,
        depth: Math.random() * 30 + 2,
        severity: severities[Math.floor(Math.random() * severities.length)],
        detectionDate: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        roadSection: roadSections[Math.floor(Math.random() * roadSections.length)]
      };
      this.cracks.push(crack);
    }

    const actionTypes: MaintenanceRecord['actionType'][] = ['inspection', 'repair', 'replacement', 'monitoring'];
    const descriptions = [
      '常规路面检查',
      '裂缝修补作业',
      '路面局部更换',
      '定期病害监测',
      '紧急维修处理'
    ];
    const materials = ['沥青混合料', '密封胶', '改性沥青', '冷补料'];
    const personnel = ['张工', '李工', '王工', '赵工'];

    for (let i = 0; i < 15; i++) {
      const crack = this.cracks[Math.floor(Math.random() * this.cracks.length)];
      const record: MaintenanceRecord = {
        id: `MNT-${String(i + 1).padStart(4, '0')}`,
        crackId: crack.id,
        actionType: actionTypes[Math.floor(Math.random() * actionTypes.length)],
        description: descriptions[Math.floor(Math.random() * descriptions.length)],
        cost: Math.floor(Math.random() * 50000) + 1000,
        materials: [materials[Math.floor(Math.random() * materials.length)]],
        personnel: [personnel[Math.floor(Math.random() * personnel.length)]],
        executionDate: new Date(Date.now() - Math.random() * 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        nextInspectionDate: new Date(Date.now() + Math.random() * 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      };
      this.maintenanceRecords.push(record);
    }
  }

  getCracks(): CrackPoint[] {
    return [...this.cracks];
  }

  getCrackById(id: string): CrackPoint | undefined {
    return this.cracks.find(c => c.id === id);
  }

  getMaintenanceRecords(): MaintenanceRecord[] {
    return [...this.maintenanceRecords];
  }

  getMaintenanceRecordById(id: string): MaintenanceRecord | undefined {
    return this.maintenanceRecords.find(m => m.id === id);
  }

  getFinancialRecords(): FinancialRecord[] {
    return [...this.financialRecords];
  }

  addFinancialRecord(record: FinancialRecord): void {
    this.financialRecords.push(record);
  }

  getCracksByRoadSection(section: string): CrackPoint[] {
    return this.cracks.filter(c => c.roadSection === section);
  }

  getCracksBySeverity(severity: CrackPoint['severity']): CrackPoint[] {
    return this.cracks.filter(c => c.severity === severity);
  }

  getMaintenanceByCrackId(crackId: string): MaintenanceRecord[] {
    return this.maintenanceRecords.filter(m => m.crackId === crackId);
  }

  getStatistics(): {
    totalCracks: number;
    criticalCracks: number;
    maintenanceCost: number;
    pendingApprovals: number;
  } {
    return {
      totalCracks: this.cracks.length,
      criticalCracks: this.cracks.filter(c => c.severity === 'critical').length,
      maintenanceCost: this.maintenanceRecords.reduce((sum, r) => sum + r.cost, 0),
      pendingApprovals: this.financialRecords.filter(f => f.approvalStatus === 'pending').length
    };
  }
}

export const dataStore = new DataStoreService();
