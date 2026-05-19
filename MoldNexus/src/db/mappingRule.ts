import { getDB } from './index';
import type { MappingRule } from '../types';

export async function createMappingRule(rule: Omit<MappingRule, 'id' | 'createdAt' | 'updatedAt'>): Promise<MappingRule> {
  const db = getDB();
  const now = Date.now();
  const newRule: MappingRule = {
    ...rule,
    id: crypto.randomUUID(),
    createdAt: now,
    updatedAt: now,
  };
  await db.add('mapping_rules', newRule);
  return newRule;
}

export async function getMappingRule(id: string): Promise<MappingRule | undefined> {
  const db = getDB();
  return db.get('mapping_rules', id);
}

export async function listMappingRules(options?: { systemType?: string; isActive?: boolean }): Promise<MappingRule[]> {
  const db = getDB();
  let rules: MappingRule[];

  if (options?.systemType) {
    rules = await db.getAllFromIndex('mapping_rules', 'by-systemType', options.systemType);
  } else if (options?.isActive !== undefined) {
    rules = await db.getAllFromIndex('mapping_rules', 'by-isActive', options.isActive ? 1 : 0);
  } else {
    rules = await db.getAll('mapping_rules');
  }

  return rules.sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function updateMappingRule(id: string, updates: Partial<MappingRule>): Promise<void> {
  const db = getDB();
  const rule = await db.get('mapping_rules', id);
  if (rule) {
    const updated: MappingRule = {
      ...rule,
      ...updates,
      updatedAt: Date.now(),
    };
    await db.put('mapping_rules', updated);
  }
}

export async function deleteMappingRule(id: string): Promise<void> {
  const db = getDB();
  await db.delete('mapping_rules', id);
}

export async function getActiveRules(targetSystem: string): Promise<MappingRule[]> {
  const db = getDB();
  const rules = await db.getAllFromIndex('mapping_rules', 'by-isActive', 1);
  return rules.filter(r => r.targetSystem === targetSystem);
}
