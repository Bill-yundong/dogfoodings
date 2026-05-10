import type { SemanticMappingRule, MaintenanceRecord, FinancialRecord } from '../types';

class SemanticMappingService {
  private rules: SemanticMappingRule[] = [];
  private initialized = false;

  private defaultRules: SemanticMappingRule[] = [
    {
      id: 'rule-cost-material',
      maintenanceField: 'cost',
      financialField: 'amount',
      transformation: 'direct',
      bidirectional: true
    },
    {
      id: 'rule-action-type',
      maintenanceField: 'actionType',
      financialField: 'category',
      transformation: 'categorize',
      categoryMap: {
        'inspection': 'inspection_fee',
        'repair': 'maintenance_fee',
        'replacement': 'equipment_cost',
        'monitoring': 'inspection_fee'
      },
      bidirectional: true
    },
    {
      id: 'rule-execution-date',
      maintenanceField: 'executionDate',
      financialField: 'transactionDate',
      transformation: 'direct',
      bidirectional: true
    },
    {
      id: 'rule-description-remarks',
      maintenanceField: 'description',
      financialField: 'remarks',
      transformation: 'direct',
      bidirectional: true
    },
    {
      id: 'rule-id-reference',
      maintenanceField: 'id',
      financialField: 'referenceId',
      transformation: 'direct',
      bidirectional: true
    }
  ];

  async init(): Promise<void> {
    this.rules = [...this.defaultRules];
    this.initialized = true;
  }

  isInitialized(): boolean {
    return this.initialized;
  }

  async maintenanceToFinancial(record: MaintenanceRecord): Promise<FinancialRecord> {
    const financial: Partial<FinancialRecord> = {
      id: `FIN-${record.id}`,
      currency: 'CNY',
      budgetCode: this.generateBudgetCode(record),
      approvalStatus: 'pending'
    };

    for (const rule of this.rules) {
      const result = await this.applyTransformation(record, rule, 'maintenanceToFinancial');
      Object.assign(financial, result);
    }

    return financial as FinancialRecord;
  }

  async financialToMaintenance(record: FinancialRecord): Promise<Partial<MaintenanceRecord>> {
    const maintenance: Partial<MaintenanceRecord> = {};

    for (const rule of this.rules) {
      if (rule.bidirectional) {
        const result = await this.applyTransformation(record, rule, 'financialToMaintenance');
        Object.assign(maintenance, result);
      }
    }

    return maintenance;
  }

  private async applyTransformation(
    source: Record<string, unknown>,
    rule: SemanticMappingRule,
    direction: 'maintenanceToFinancial' | 'financialToMaintenance'
  ): Promise<Record<string, unknown>> {
    const sourceField = direction === 'maintenanceToFinancial'
      ? rule.maintenanceField
      : rule.financialField;
    const targetField = direction === 'maintenanceToFinancial'
      ? rule.financialField
      : rule.maintenanceField;

    const value = source[sourceField];
    if (value === undefined || value === null) {
      return {};
    }

    let transformedValue: unknown = value;

    switch (rule.transformation) {
      case 'direct':
        transformedValue = value;
        break;

      case 'scale':
        if (typeof value === 'number' && rule.scaleFactor) {
          transformedValue = direction === 'maintenanceToFinancial'
            ? value * rule.scaleFactor
            : value / rule.scaleFactor;
        }
        break;

      case 'categorize':
        if (rule.categoryMap) {
          if (direction === 'maintenanceToFinancial') {
            transformedValue = rule.categoryMap[value as string] || value;
          } else {
            const reverseMap = Object.fromEntries(
              Object.entries(rule.categoryMap).map(([k, v]) => [v, k])
            );
            transformedValue = reverseMap[value as string] || value;
          }
        }
        break;

      case 'custom':
        if (rule.customFormula) {
          transformedValue = await this.evaluateCustomFormula(value, rule.customFormula);
        }
        break;

      case 'aggregate':
        transformedValue = value;
        break;
    }

    return { [targetField]: transformedValue };
  }

  private async evaluateCustomFormula(value: unknown, formula: string): Promise<unknown> {
    try {
      const fn = new Function('value', `return ${formula}`);
      return fn(value);
    } catch {
      return value;
    }
  }

  private generateBudgetCode(record: MaintenanceRecord): string {
    const year = new Date(record.executionDate).getFullYear();
    const categoryMap: Record<string, string> = {
      'inspection': 'INS',
      'repair': 'RPR',
      'replacement': 'RPL',
      'monitoring': 'MON'
    };
    const category = categoryMap[record.actionType] || 'GEN';
    return `ROAD-${year}-${category}-${record.id.slice(-6).toUpperCase()}`;
  }

  getRules(): SemanticMappingRule[] {
    return [...this.rules];
  }

  addRule(rule: Omit<SemanticMappingRule, 'id'>): SemanticMappingRule {
    const newRule: SemanticMappingRule = {
      ...rule,
      id: `rule-${Date.now()}`
    };
    this.rules.push(newRule);
    return newRule;
  }

  updateRule(id: string, updates: Partial<SemanticMappingRule>): SemanticMappingRule | null {
    const index = this.rules.findIndex(r => r.id === id);
    if (index === -1) return null;
    this.rules[index] = { ...this.rules[index], ...updates };
    return this.rules[index];
  }

  removeRule(id: string): boolean {
    const index = this.rules.findIndex(r => r.id === id);
    if (index === -1) return false;
    this.rules.splice(index, 1);
    return true;
  }

  getFieldMappings(): { maintenance: string[]; financial: string[] } {
    const maintenanceFields = ['id', 'crackId', 'actionType', 'description', 'cost', 'materials', 'personnel', 'executionDate', 'nextInspectionDate'];
    const financialFields = ['id', 'referenceId', 'category', 'amount', 'currency', 'budgetCode', 'approvalStatus', 'transactionDate', 'vendor', 'invoiceNumber', 'remarks'];
    return { maintenance: maintenanceFields, financial: financialFields };
  }
}

export const semanticMappingService = new SemanticMappingService();
