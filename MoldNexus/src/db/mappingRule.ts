import { getDB } from './index';
import type { MappingRule } from '../types';

type StoredMappingRule = Omit<MappingRule, 'isActive'> & { isActive: number };

function toStoredRule(rule: MappingRule): StoredMappingRule {
  return { ...rule, isActive: rule.isActive ? 1 : 0 };
}

function fromStoredRule(stored: StoredMappingRule): MappingRule {
  return { ...stored, isActive: stored.isActive === 1 };
}

export async function createMappingRule(rule: Omit<MappingRule, 'id' | 'createdAt' | 'updatedAt'>): Promise<MappingRule> {
  const db = getDB();
  const now = Date.now();
  const newRule: MappingRule = {
    ...rule,
    id: crypto.randomUUID(),
    createdAt: now,
    updatedAt: now,
  };
  await db.add('mapping_rules', toStoredRule(newRule) as unknown as MappingRule);
  return newRule;
}

export async function getMappingRule(id: string): Promise<MappingRule | undefined> {
  const db = getDB();
  const stored = await db.get('mapping_rules', id) as unknown as StoredMappingRule | undefined;
  return stored ? fromStoredRule(stored) : undefined;
}

export async function listMappingRules(options?: { systemType?: string; isActive?: boolean }): Promise<MappingRule[]> {
  const db = getDB();
  let storedRules: StoredMappingRule[];

  if (options?.systemType) {
    storedRules = await db.getAllFromIndex('mapping_rules', 'by-systemType', options.systemType) as unknown as StoredMappingRule[];
  } else if (options?.isActive !== undefined) {
    storedRules = await db.getAllFromIndex('mapping_rules', 'by-isActive', options.isActive ? 1 : 0) as unknown as StoredMappingRule[];
  } else {
    storedRules = await db.getAll('mapping_rules') as unknown as StoredMappingRule[];
  }

  const rules = storedRules.map(fromStoredRule);
  return rules.sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function updateMappingRule(id: string, updates: Partial<MappingRule>): Promise<void> {
  const db = getDB();
  const stored = await db.get('mapping_rules', id) as unknown as StoredMappingRule | undefined;
  if (stored) {
    const existing = fromStoredRule(stored);
    const updated: MappingRule = {
      ...existing,
      ...updates,
      updatedAt: Date.now(),
    };
    await db.put('mapping_rules', toStoredRule(updated) as unknown as MappingRule);
  }
}

export async function deleteMappingRule(id: string): Promise<void> {
  const db = getDB();
  await db.delete('mapping_rules', id);
}

export async function getActiveRules(targetSystem: string): Promise<MappingRule[]> {
  const db = getDB();
  const storedRules = await db.getAllFromIndex('mapping_rules', 'by-isActive', 1) as unknown as StoredMappingRule[];
  return storedRules.map(fromStoredRule).filter(r => r.targetSystem === targetSystem);
}
