import type { MappingRule, MappingResult, ParameterSet } from '../types';

export interface MappingContext {
  sourceSystem: string;
  targetSystem: string;
  parameters?: Record<string, unknown>;
}

export class SemanticMappingEngine {
  private rules: Map<string, MappingRule> = new Map();

  constructor(rules: MappingRule[] = []) {
    for (const rule of rules) {
      this.rules.set(rule.id, rule);
    }
  }

  public addRule(rule: MappingRule): void {
    this.rules.set(rule.id, rule);
  }

  public removeRule(ruleId: string): void {
    this.rules.delete(ruleId);
  }

  public getRules(): MappingRule[] {
    return Array.from(this.rules.values());
  }

  public getActiveRules(targetSystem: string): MappingRule[] {
    return this.getRules().filter(r => r.isActive && r.targetSystem === targetSystem);
  }

  public mapParameter(
    sourceField: string,
    sourceValue: unknown,
    context: MappingContext
  ): MappingResult {
    const rule = this.findRule(sourceField, context.targetSystem);

    if (!rule) {
      return {
        sourceValue,
        targetValue: sourceValue,
        success: false,
        error: `No mapping rule found for field: ${sourceField}`,
      };
    }

    try {
      const targetValue = this.applyTransform(rule, sourceValue, context);
      return {
        sourceValue,
        targetValue,
        success: true,
      };
    } catch (error) {
      return {
        sourceValue,
        targetValue: sourceValue,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  public mapParameterSet(
    parameterSet: ParameterSet,
    context: MappingContext
  ): Record<string, MappingResult> {
    const results: Record<string, MappingResult> = {};
    const paramMap = this.parameterSetToMap(parameterSet);

    for (const [field, value] of Object.entries(paramMap)) {
      results[field] = this.mapParameter(field, value, context);
    }

    return results;
  }

  public mapObject(
    sourceObject: Record<string, unknown>,
    context: MappingContext
  ): Record<string, MappingResult> {
    const results: Record<string, MappingResult> = {};

    for (const [field, value] of Object.entries(sourceObject)) {
      results[field] = this.mapParameter(field, value, context);
    }

    return results;
  }

  public transformToMESFormat(
    parameterSet: ParameterSet,
    targetSystem: string
  ): Record<string, unknown> {
    const context: MappingContext = {
      sourceSystem: 'moldnexus',
      targetSystem,
    };

    const results = this.mapParameterSet(parameterSet, context);
    const output: Record<string, unknown> = {};

    for (const [sourceField, result] of Object.entries(results)) {
      const rule = this.findRule(sourceField, targetSystem);
      if (rule && result.success) {
        output[rule.targetField] = result.targetValue;
      }
    }

    return output;
  }

  private findRule(sourceField: string, targetSystem: string): MappingRule | undefined {
    return this.getRules().find(
      r => r.sourceField === sourceField && r.targetSystem === targetSystem && r.isActive
    );
  }

  private applyTransform(
    rule: MappingRule,
    sourceValue: unknown,
    context: MappingContext
  ): unknown {
    switch (rule.transformType) {
      case 'direct':
        return sourceValue;

      case 'unit':
        return this.applyUnitTransform(sourceValue, rule.transformExpression);

      case 'formula':
        return this.applyFormulaTransform(sourceValue, rule.transformExpression, context);

      case 'enum':
        return this.applyEnumTransform(sourceValue, rule.transformExpression);

      case 'conditional':
        return this.applyConditionalTransform(sourceValue, rule.transformExpression, context);

      default:
        return sourceValue;
    }
  }

  private applyUnitTransform(sourceValue: unknown, expression: string): number {
    const numValue = Number(sourceValue);
    if (isNaN(numValue)) {
      throw new Error(`Cannot convert ${sourceValue} to number for unit transform`);
    }

    const [fromUnit, toUnit] = expression.split('->').map(s => s.trim());

    const conversionFactors: Record<string, number> = {
      'c->f': 9 / 5,
      'f->c': 5 / 9,
      'mm->cm': 0.1,
      'cm->mm': 10,
      'mm->m': 0.001,
      'm->mm': 1000,
      'bar->mpa': 0.1,
      'mpa->bar': 10,
      'kpa->bar': 0.01,
      'bar->kpa': 100,
      's->ms': 1000,
      'ms->s': 0.001,
    };

    const key = `${fromUnit.toLowerCase()}->${toUnit.toLowerCase()}`;
    const factor = conversionFactors[key];

    if (factor === undefined) {
      throw new Error(`Unknown unit conversion: ${expression}`);
    }

    if (fromUnit.toLowerCase() === 'c' && toUnit.toLowerCase() === 'f') {
      return numValue * 9 / 5 + 32;
    }
    if (fromUnit.toLowerCase() === 'f' && toUnit.toLowerCase() === 'c') {
      return (numValue - 32) * 5 / 9;
    }

    return numValue * factor;
  }

  private applyFormulaTransform(
    sourceValue: unknown,
    expression: string,
    context: MappingContext
  ): number {
    const numValue = Number(sourceValue);
    if (isNaN(numValue)) {
      throw new Error(`Cannot convert ${sourceValue} to number for formula transform`);
    }

    const sanitizedExpression = expression
      .replace(/\bx\b/gi, String(numValue))
      .replace(/\bvalue\b/gi, String(numValue));

    for (const [key, val] of Object.entries(context.parameters || {})) {
      const numVal = Number(val);
      if (!isNaN(numVal)) {
        sanitizedExpression.replace(new RegExp(`\\b${key}\\b`, 'gi'), String(numVal));
      }
    }

    if (!/^[\d\s+\-*/().%^]+$/.test(sanitizedExpression)) {
      throw new Error('Invalid expression for security reasons');
    }

    try {
      return Function(`"use strict"; return (${sanitizedExpression});`)();
    } catch {
      throw new Error(`Failed to evaluate expression: ${expression}`);
    }
  }

  private applyEnumTransform(sourceValue: unknown, expression: string): unknown {
    const mappings: Record<string, unknown> = {};

    const pairs = expression.split(';');
    for (const pair of pairs) {
      const [key, value] = pair.split(':').map(s => s.trim());
      if (key && value !== undefined) {
        mappings[key] = this.parseValue(value);
      }
    }

    const key = String(sourceValue);
    if (key in mappings) {
      return mappings[key];
    }

    throw new Error(`No enum mapping found for value: ${sourceValue}`);
  }

  private applyConditionalTransform(
    sourceValue: unknown,
    expression: string,
    _context: MappingContext
  ): unknown {
    const conditions = expression.split(';');

    for (const condition of conditions) {
      const [test, result] = condition.split('?').map(s => s.trim());

      if (!test || result === undefined) continue;

      if (test === 'default') {
        return this.parseValue(result);
      }

      const numValue = Number(sourceValue);
      const match = test.match(/([<>=!]+)\s*([\d.]+)/);

      if (match) {
        const [, operator, thresholdStr] = match;
        const threshold = Number(thresholdStr);

        let conditionMet = false;
        switch (operator) {
          case '>':
            conditionMet = numValue > threshold;
            break;
          case '<':
            conditionMet = numValue < threshold;
            break;
          case '>=':
            conditionMet = numValue >= threshold;
            break;
          case '<=':
            conditionMet = numValue <= threshold;
            break;
          case '==':
          case '=':
            conditionMet = numValue === threshold;
            break;
          case '!=':
            conditionMet = numValue !== threshold;
            break;
        }

        if (conditionMet) {
          return this.parseValue(result);
        }
      }
    }

    return sourceValue;
  }

  private parseValue(value: string): unknown {
    if (value === 'true') return true;
    if (value === 'false') return false;
    if (value === 'null') return null;
    if (value === 'undefined') return undefined;

    const num = Number(value);
    if (!isNaN(num)) return num;

    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) {
      return value.slice(1, -1);
    }

    return value;
  }

  private parameterSetToMap(parameterSet: ParameterSet): Record<string, number> {
    return {
      melt_temperature: parameterSet.meltTemperature,
      mold_temperature: parameterSet.moldTemperature,
      injection_speed: parameterSet.injectionSpeed,
      packing_pressure: parameterSet.packingPressure,
      packing_time: parameterSet.packingTime,
      cooling_time: parameterSet.coolingTime,
      viscosity: parameterSet.viscosity,
      surface_tension: parameterSet.surfaceTension,
      ...(parameterSet.customParams || {}),
    };
  }

  public validateRule(rule: MappingRule): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!rule.sourceField) {
      errors.push('Source field is required');
    }
    if (!rule.targetField) {
      errors.push('Target field is required');
    }
    if (!rule.transformType) {
      errors.push('Transform type is required');
    }
    if (!rule.transformExpression && rule.transformType !== 'direct') {
      errors.push('Transform expression is required for non-direct transforms');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}

export const defaultMappingRules: Omit<MappingRule, 'id' | 'createdAt' | 'updatedAt'>[] = [
  {
    sourceField: 'melt_temperature',
    targetField: 'MeltTemp',
    transformType: 'direct',
    transformExpression: '',
    sourceSystem: 'moldnexus',
    targetSystem: 'mes_siemens',
    isActive: true,
  },
  {
    sourceField: 'mold_temperature',
    targetField: 'MoldTemp',
    transformType: 'direct',
    transformExpression: '',
    sourceSystem: 'moldnexus',
    targetSystem: 'mes_siemens',
    isActive: true,
  },
  {
    sourceField: 'injection_speed',
    targetField: 'InjSpeed',
    transformType: 'unit',
    transformExpression: 'mm/s->m/min',
    sourceSystem: 'moldnexus',
    targetSystem: 'mes_siemens',
    isActive: true,
  },
  {
    sourceField: 'packing_pressure',
    targetField: 'PackPressure',
    transformType: 'unit',
    transformExpression: 'MPa->bar',
    sourceSystem: 'moldnexus',
    targetSystem: 'mes_siemens',
    isActive: true,
  },
  {
    sourceField: 'packing_time',
    targetField: 'PackTime',
    transformType: 'unit',
    transformExpression: 's->ms',
    sourceSystem: 'moldnexus',
    targetSystem: 'mes_siemens',
    isActive: true,
  },
  {
    sourceField: 'cooling_time',
    targetField: 'CoolTime',
    transformType: 'unit',
    transformExpression: 's->ms',
    sourceSystem: 'moldnexus',
    targetSystem: 'mes_siemens',
    isActive: true,
  },
  {
    sourceField: 'melt_temperature',
    targetField: 'temp_melt',
    transformType: 'direct',
    transformExpression: '',
    sourceSystem: 'moldnexus',
    targetSystem: 'mes_custom',
    isActive: true,
  },
  {
    sourceField: 'injection_speed',
    targetField: 'speed_category',
    transformType: 'conditional',
    transformExpression: '<50?low;<100?medium;default?high',
    sourceSystem: 'moldnexus',
    targetSystem: 'mes_custom',
    isActive: true,
  },
];
