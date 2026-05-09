export async function generateHash(data: unknown): Promise<string> {
  const jsonString = JSON.stringify(data);
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(jsonString);
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}
