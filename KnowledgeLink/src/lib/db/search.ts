import { getDb } from './index';

const STOP_WORDS = new Set([
  'a', 'an', 'the', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
  'should', 'may', 'might', 'shall', 'can', 'to', 'of', 'in', 'for',
  'on', 'with', 'at', 'by', 'from', 'and', 'or', 'but', 'not', 'this', 'that'
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length > 0 && !STOP_WORDS.has(token));
}

export async function indexEntity(entityType: string, entityId: string, text: string): Promise<void> {
  const db = await getDb();
  const tokens = tokenize(text);
  const frequency = new Map<string, number>();

  for (const token of tokens) {
    frequency.set(token, (frequency.get(token) ?? 0) + 1);
  }

  await removeEntityIndex(entityType, entityId);

  const tx = db.transaction('searchIndex', 'readwrite');
  for (const [term, freq] of frequency) {
    await tx.store.add({
      id: crypto.randomUUID(),
      term,
      entityType,
      entityId,
      frequency: freq
    });
  }
  await tx.done;
}

export async function searchEntities(
  query: string,
  limit: number = 20
): Promise<{ entityType: string; entityId: string; score: number }[]> {
  const db = await getDb();
  const tokens = tokenize(query);
  const scores = new Map<string, { entityType: string; entityId: string; score: number }>();

  for (const token of tokens) {
    let cursor = await db.transaction('searchIndex').store.index('term').openCursor(token);
    while (cursor) {
      const entry = cursor.value;
      const key = `${entry.entityType}:${entry.entityId}`;
      const existing = scores.get(key);
      if (existing) {
        existing.score += entry.frequency;
      } else {
        scores.set(key, {
          entityType: entry.entityType,
          entityId: entry.entityId,
          score: entry.frequency
        });
      }
      cursor = await cursor.continue();
    }
  }

  return Array.from(scores.values())
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

export async function removeEntityIndex(entityType: string, entityId: string): Promise<void> {
  const db = await getDb();
  const tx = db.transaction('searchIndex', 'readwrite');
  const index = tx.store.index('entityId');
  let cursor = await index.openCursor(entityId);

  while (cursor) {
    const entry = cursor.value;
    if (entry.entityType === entityType) {
      await cursor.delete();
    }
    cursor = await cursor.continue();
  }

  await tx.done;
}
