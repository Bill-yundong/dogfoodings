import type { EphemerisPoint } from "../types/orbital";

export interface ConjunctionCandidate {
  tcaEpochJd: number;
  missDistanceKm: number;
  relativeVelocityKmS: number;
  targetState: EphemerisPoint;
  debrisState: EphemerisPoint;
}

function dist(a: [number, number, number], b: [number, number, number]) {
  const dx = a[0] - b[0];
  const dy = a[1] - b[1];
  const dz = a[2] - b[2];
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

function relVel(a: [number, number, number], b: [number, number, number]) {
  const dx = a[0] - b[0];
  const dy = a[1] - b[1];
  const dz = a[2] - b[2];
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

export function findClosestApproach(
  targetEph: EphemerisPoint[],
  debrisEph: EphemerisPoint[],
  thresholdKm: number
): ConjunctionCandidate | null {
  let best: ConjunctionCandidate | null = null;
  const len = Math.min(targetEph.length, debrisEph.length);
  for (let i = 0; i < len; i++) {
    const t = targetEph[i];
    const d = debrisEph[i];
    const miss = dist(t.positionKm, d.positionKm);
    if (miss < thresholdKm) {
      if (!best || miss < best.missDistanceKm) {
        best = {
          tcaEpochJd: t.epochJd,
          missDistanceKm: miss,
          relativeVelocityKmS: relVel(t.velocityKmS, d.velocityKmS),
          targetState: t,
          debrisState: d,
        };
      }
    }
  }
  return best;
}

export function findAllConjunctions(
  targetEph: EphemerisPoint[],
  debrisEph: EphemerisPoint[],
  thresholdKm: number,
  minSeparationSec = 600
): ConjunctionCandidate[] {
  const events: ConjunctionCandidate[] = [];
  const len = Math.min(targetEph.length, debrisEph.length);
  let lastJd = -Infinity;
  for (let i = 0; i < len; i++) {
    const t = targetEph[i];
    const d = debrisEph[i];
    const miss = dist(t.positionKm, d.positionKm);
    if (miss < thresholdKm && (t.epochJd - lastJd) * 86400 > minSeparationSec) {
      events.push({
        tcaEpochJd: t.epochJd,
        missDistanceKm: miss,
        relativeVelocityKmS: relVel(t.velocityKmS, d.velocityKmS),
        targetState: t,
        debrisState: d,
      });
      lastJd = t.epochJd;
    }
  }
  events.sort((a, b) => a.missDistanceKm - b.missDistanceKm);
  return events;
}
