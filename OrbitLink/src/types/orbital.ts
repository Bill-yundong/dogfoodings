export type OrbitClass = "LEO" | "MEO" | "GEO" | "HEO" | "UNCLASSIFIED";

export interface OrbitalElements {
  semiMajorAxisKm: number;
  eccentricity: number;
  inclinationDeg: number;
  raanDeg: number;
  argPerigeeDeg: number;
  trueAnomalyDeg: number;
}

export interface StateVector {
  positionKm: [number, number, number];
  velocityKmS: [number, number, number];
}

export interface Debris {
  noradId: string;
  name: string;
  elements: OrbitalElements;
  periodMin: number;
  rcsM2: number;
  epochJd: number;
  tleLine1?: string;
  tleLine2?: string;
  orbitClass: OrbitClass;
  color?: string;
}

export interface ConjunctionEvent {
  id: string;
  targetNorad: string;
  debrisNorad: string;
  debrisName: string;
  tcaEpochJd: number;
  missDistanceKm: number;
  relativeVelocityKmS: number;
  collisionProbability: number;
  mahalanobis: number;
  severity: 0 | 1 | 2 | 3;
  targetState?: StateVector;
  debrisState?: StateVector;
}

export interface EphemerisPoint {
  epochJd: number;
  positionKm: [number, number, number];
  velocityKmS: [number, number, number];
}

export interface PropagationConfig {
  startJd: number;
  endJd: number;
  stepSec: number;
  includePerturbations: boolean;
  j2Perturbation: boolean;
  j3Perturbation: boolean;
}

export interface ScanConfig {
  thresholdKm: number;
  pcThreshold: number;
  combinedRadiusM: number;
  covarianceScale: number;
}
