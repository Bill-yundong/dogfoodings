import type { Debris, OrbitalElements } from "../types/orbital";
import { classifyOrbit, EARTH_RADIUS_KM } from "../utils/constants";
import { periodFromSma } from "./twobody";

const DEFAULT_NAMES = [
  "IRIDIUM 33 DEB",
  "FENGYUN 1C DEB",
  "COSMOS 2251 DEB",
  "H2A R/B",
  "ARIANE 42P R/B",
  "PROTON-M DEB",
  "DELTA 2 R/B",
  "CZ-4B DEB",
  "ATLAS V CENTAUR",
  "BREEZE-M R/B",
  "ISS DEB",
  "HUBBLE DEB",
  "TANK DEB",
  "FAIRING DEB",
  "BOOSTER DEB",
  "PAYLOAD ADAPTER",
  "SOLAR PANEL",
  "MULTI-LAYER INSULATION",
  "UPPER STAGE",
  "DEBRIS OBJECT",
];

function rand(min: number, max: number) {
  return Math.random() * (max - min) + min;
}

function randInt(min: number, max: number) {
  return Math.floor(rand(min, max + 1));
}

const orbitColorByClass: Record<string, string> = {
  LEO: "#38bdf8",
  MEO: "#a78bfa",
  GEO: "#facc15",
  HEO: "#f472b6",
  UNCLASSIFIED: "#64748b",
};

function pickOrbitProfile(): { alt: number; e: number; i: number } {
  const r = Math.random();
  if (r < 0.65) {
    return { alt: rand(300, 1500), e: rand(0, 0.08), i: rand(15, 100) };
  }
  if (r < 0.85) {
    return { alt: rand(5000, 20000), e: rand(0, 0.25), i: rand(0, 90) };
  }
  if (r < 0.95) {
    return { alt: rand(35500, 35900), e: rand(0, 0.02), i: rand(0, 8) };
  }
  return { alt: rand(20000, 50000), e: rand(0.3, 0.7), i: rand(0, 90) };
}

export function generateSyntheticCatalog(count: number): Debris[] {
  const list: Debris[] = [];
  for (let i = 0; i < count; i++) {
    const { alt, e, i } = pickOrbitProfile();
    const sma = EARTH_RADIUS_KM + alt;
    const raan = rand(0, 360);
    const argp = rand(0, 360);
    const nu = rand(0, 360);
    const elements: OrbitalElements = {
      semiMajorAxisKm: sma,
      eccentricity: e,
      inclinationDeg: i,
      raanDeg: raan,
      argPerigeeDeg: argp,
      trueAnomalyDeg: nu,
    };
    const orbitClass = classifyOrbit(sma);
    const period = periodFromSma(sma);
    const rcs = Math.pow(10, rand(-2.5, 1));
    const name = `${DEFAULT_NAMES[i % DEFAULT_NAMES.length]} ${randInt(1000, 9999)}`;
    list.push({
      noradId: `SYN${String(10000 + i).slice(1)}`,
      name,
      elements,
      periodMin: period,
      rcsM2: rcs,
      epochJd: 2460000 + Math.random() * 365,
      orbitClass,
      color: orbitColorByClass[orbitClass],
    });
  }
  return list;
}

export const TARGET_SPACECRAFT: Debris = {
  noradId: "TARGET-01",
  name: "ORBITLINK DEMO SAT",
  elements: {
    semiMajorAxisKm: EARTH_RADIUS_KM + 550,
    eccentricity: 0.0012,
    inclinationDeg: 51.64,
    raanDeg: 130.4,
    argPerigeeDeg: 270.1,
    trueAnomalyDeg: 42.3,
  },
  periodMin: periodFromSma(EARTH_RADIUS_KM + 550),
  rcsM2: 3.5,
  epochJd: 2460310.5,
  orbitClass: "LEO",
  color: "#22d3ee",
};
