export function now(): number {
  return Date.now();
}

export function daysBetween(a: number, b: number): number {
  return Math.floor(Math.abs(b - a) / 86400000);
}

export function daysSince(timestamp: number): number {
  return daysBetween(timestamp, Date.now());
}

export function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString();
}

export function startOfDay(timestamp: number): number {
  const d = new Date(timestamp);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}
