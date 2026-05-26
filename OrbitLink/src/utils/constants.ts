export const MU_EARTH_KM3_S2 = 398600.4418;
export const EARTH_RADIUS_KM = 6378.137;
export const J2000_JD = 2451545.0;
export const SECONDS_PER_DAY = 86400;
export const SECONDS_PER_MINUTE = 60;
export const MINUTES_PER_DAY = 1440;
export const DEG2RAD = Math.PI / 180;
export const RAD2DEG = 180 / Math.PI;
export const EARTH_J2 = 1.08262668e-3;
export const EARTH_J3 = -2.53265e-6;

export function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

export function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

export function formatEta(seconds: number): string {
  const abs = Math.abs(seconds);
  if (abs < 60) return `${seconds.toFixed(1)} s`;
  if (abs < 3600) return `${(seconds / 60).toFixed(1)} min`;
  if (abs < 86400) return `${(seconds / 3600).toFixed(2)} h`;
  return `${(seconds / 86400).toFixed(2)} d`;
}

export function jdToIso(jd: number): string {
  const unix = (jd - 2440587.5) * 86400 * 1000;
  const d = new Date(unix);
  return d.toISOString().replace("T", " ").slice(0, 19) + " UTC";
}

export function currentJd(): number {
  return Date.now() / (86400 * 1000) + 2440587.5;
}

export function mod2pi(x: number) {
  const tau = Math.PI * 2;
  return ((x % tau) + tau) % tau;
}

export function classifyOrbit(semiMajorAxisKm: number): "LEO" | "MEO" | "GEO" | "HEO" | "UNCLASSIFIED" {
  const alt = semiMajorAxisKm - EARTH_RADIUS_KM;
  if (alt < 0) return "UNCLASSIFIED";
  if (alt < 2000) return "LEO";
  if (alt < 35000) return "MEO";
  if (alt < 36200 && alt > 35400) return "GEO";
  if (alt >= 36000) return "GEO";
  return "HEO";
}
