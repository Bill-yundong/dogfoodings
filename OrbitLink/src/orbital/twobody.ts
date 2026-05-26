import {
  DEG2RAD,
  EARTH_J2,
  EARTH_J3,
  EARTH_RADIUS_KM,
  MU_EARTH_KM3_S2,
  RAD2DEG,
  mod2pi,
} from "../utils/constants";
import type { EphemerisPoint, OrbitalElements, StateVector } from "../types/orbital";

export function periodFromSma(smaKm: number): number {
  return 2 * Math.PI * Math.sqrt((smaKm * smaKm * smaKm) / MU_EARTH_KM3_S2) / 60;
}

export function meanMotionFromSma(smaKm: number): number {
  return Math.sqrt(MU_EARTH_KM3_S2 / (smaKm * smaKm * smaKm));
}

export function solveKepler(M: number, e: number, tol = 1e-9): number {
  let E = M + e * Math.sin(M);
  for (let i = 0; i < 50; i++) {
    const f = E - e * Math.sin(E) - M;
    const fp = 1 - e * Math.cos(E);
    const dE = f / fp;
    E -= dE;
    if (Math.abs(dE) < tol) break;
  }
  return E;
}

export function elementsToState(el: OrbitalElements): StateVector {
  const a = el.semiMajorAxisKm;
  const e = el.eccentricity;
  const i = el.inclinationDeg * DEG2RAD;
  const Om = el.raanDeg * DEG2RAD;
  const w = el.argPerigeeDeg * DEG2RAD;
  const nu = el.trueAnomalyDeg * DEG2RAD;

  const p = a * (1 - e * e);
  const r = p / (1 + e * Math.cos(nu));

  const cosN = Math.cos(nu);
  const sinN = Math.sin(nu);
  const cosO = Math.cos(Om);
  const sinO = Math.sin(Om);
  const cosI = Math.cos(i);
  const sinI = Math.sin(i);
  const cosW = Math.cos(w);
  const sinW = Math.sin(w);

  const rPqw: [number, number, number] = [r * cosN, r * sinN, 0];
  const vPqwFactor = Math.sqrt(MU_EARTH_KM3_S2 / p);
  const vPqw: [number, number, number] = [
    -vPqwFactor * sinN,
    vPqwFactor * (e + cosN),
    0,
  ];

  const c1 = cosO * cosW - sinO * sinW * cosI;
  const c2 = -cosO * sinW - sinO * cosW * cosI;
  const c3 = sinO * sinI;
  const c4 = sinO * cosW + cosO * sinW * cosI;
  const c5 = -sinO * sinW + cosO * cosW * cosI;
  const c6 = -cosO * sinI;
  const c7 = sinW * sinI;
  const c8 = cosW * sinI;
  const c9 = cosI;

  const positionKm: [number, number, number] = [
    c1 * rPqw[0] + c2 * rPqw[1] + c3 * rPqw[2],
    c4 * rPqw[0] + c5 * rPqw[1] + c6 * rPqw[2],
    c7 * rPqw[0] + c8 * rPqw[1] + c9 * rPqw[2],
  ];
  const velocityKmS: [number, number, number] = [
    c1 * vPqw[0] + c2 * vPqw[1] + c3 * vPqw[2],
    c4 * vPqw[0] + c5 * vPqw[1] + c6 * vPqw[2],
    c7 * vPqw[0] + c8 * vPqw[1] + c9 * vPqw[2],
  ];

  return { positionKm, velocityKmS };
}

export function j2RaanRate(el: OrbitalElements): number {
  const a = el.semiMajorAxisKm;
  const e = el.eccentricity;
  const i = el.inclinationDeg * DEG2RAD;
  const n = meanMotionFromSma(a);
  const p = a * (1 - e * e);
  const factor = -1.5 * EARTH_J2 * (EARTH_RADIUS_KM / p) ** 2 * n * Math.cos(i);
  return factor;
}

export function j2ArgpRate(el: OrbitalElements): number {
  const a = el.semiMajorAxisKm;
  const e = el.eccentricity;
  const i = el.inclinationDeg * DEG2RAD;
  const n = meanMotionFromSma(a);
  const p = a * (1 - e * e);
  const factor =
    0.75 *
    EARTH_J2 *
    (EARTH_RADIUS_KM / p) ** 2 *
    n *
    (5 * Math.cos(i) ** 2 - 1);
  return factor;
}

export function propagateAnalytical(
  el0: OrbitalElements,
  dtSec: number,
  opts: { j2?: boolean; j3?: boolean } = {}
): StateVector {
  const a = el0.semiMajorAxisKm;
  const e = el0.eccentricity;
  const i = el0.inclinationDeg * DEG2RAD;
  const n = meanMotionFromSma(a);
  const M0 = meanAnomalyFromTrue(el0.trueAnomalyDeg * DEG2RAD, e);
  const M = mod2pi(M0 + n * dtSec);
  const E = solveKepler(M, e);
  const nu = trueAnomalyFromEccentric(E, e);

  let raan = el0.raanDeg * DEG2RAD;
  let argp = el0.argPerigeeDeg * DEG2RAD;
  if (opts.j2) {
    raan += j2RaanRate(el0) * dtSec;
    argp += j2ArgpRate(el0) * dtSec;
  }
  if (opts.j3) {
    const p = a * (1 - e * e);
    const j3Raan =
      -0.375 *
      EARTH_J3 *
      (EARTH_RADIUS_KM / p) ** 3 *
      n *
      Math.sin(i) *
      (1 + 0.75 * e * e);
    const j3Argp =
      0.375 *
      EARTH_J3 *
      (EARTH_RADIUS_KM / p) ** 3 *
      n *
      Math.cos(i) *
      (1 - 5 * Math.sin(i) ** 2 / (1 - e * e));
    raan += j3Raan * dtSec;
    argp += j3Argp * dtSec;
  }

  const elNext: OrbitalElements = {
    semiMajorAxisKm: a,
    eccentricity: e,
    inclinationDeg: el0.inclinationDeg,
    raanDeg: raan * RAD2DEG,
    argPerigeeDeg: argp * RAD2DEG,
    trueAnomalyDeg: nu * RAD2DEG,
  };
  return elementsToState(elNext);
}

function meanAnomalyFromTrue(nu: number, e: number): number {
  const cosN = Math.cos(nu);
  const sinN = Math.sin(nu);
  const E = Math.atan2(
    Math.sqrt(1 - e * e) * sinN,
    e + cosN
  );
  return mod2pi(E - e * Math.sin(E));
}

function trueAnomalyFromEccentric(E: number, e: number): number {
  const cosE = Math.cos(E);
  const sinE = Math.sin(E);
  return Math.atan2(Math.sqrt(1 - e * e) * sinE, cosE - e);
}

export function generateEphemeris(
  el0: OrbitalElements,
  startJd: number,
  endJd: number,
  stepSec: number,
  opts: { j2?: boolean; j3?: boolean } = {}
): EphemerisPoint[] {
  const total = Math.max(1, Math.floor(((endJd - startJd) * 86400) / stepSec));
  const pts: EphemerisPoint[] = [];
  for (let k = 0; k <= total; k++) {
    const dt = k * stepSec;
    const jd = startJd + dt / 86400;
    const sv = propagateAnalytical(el0, dt, opts);
    pts.push({
      epochJd: jd,
      positionKm: sv.positionKm,
      velocityKmS: sv.velocityKmS,
    });
  }
  return pts;
}
