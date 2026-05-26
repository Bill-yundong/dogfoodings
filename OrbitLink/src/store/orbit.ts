import { create } from "zustand";
import type { ConjunctionEvent, Debris, ScanConfig } from "@/types/orbital";
import { TARGET_SPACECRAFT } from "@/orbital/catalog";
import { currentJd } from "@/utils/constants";

export interface LabConfig {
  stepSec: number;
  horizonHours: number;
  thresholdKm: number;
  pcThreshold: number;
  combinedRadiusM: number;
  covarianceScale: number;
  j2: boolean;
  j3: boolean;
}

export const defaultLabConfig: LabConfig = {
  stepSec: 60,
  horizonHours: 6,
  thresholdKm: 5,
  pcThreshold: 1e-4,
  combinedRadiusM: 20,
  covarianceScale: 1,
  j2: true,
  j3: false,
};

export const defaultScanConfig = (lab: LabConfig): ScanConfig => ({
  thresholdKm: lab.thresholdKm,
  pcThreshold: lab.pcThreshold,
  combinedRadiusM: lab.combinedRadiusM,
  covarianceScale: lab.covarianceScale,
});

interface OrbitStore {
  target: Debris;
  debris: Debris[];
  events: ConjunctionEvent[];
  selectedEventId: string | null;
  catalogReady: boolean;
  catalogCount: number;
  scanInProgress: boolean;
  scanProgress: number;
  scanThroughput: number;
  scanDurationMs: number;
  lastScanAt: number | null;
  currentJd: number;
  labConfig: LabConfig;

  setTarget: (d: Debris) => void;
  setDebris: (list: Debris[]) => void;
  setCatalogReady: (b: boolean) => void;
  setCatalogCount: (n: number) => void;
  setEvents: (e: ConjunctionEvent[]) => void;
  appendEvents: (e: ConjunctionEvent[]) => void;
  selectEvent: (id: string | null) => void;
  setScanInProgress: (b: boolean) => void;
  setScanProgress: (p: number) => void;
  setScanThroughput: (t: number) => void;
  setScanDurationMs: (t: number) => void;
  setLastScanAt: (t: number | null) => void;
  tickJd: (jd: number) => void;
  setLabConfig: (cfg: Partial<LabConfig>) => void;
}

export const useOrbitStore = create<OrbitStore>((set) => ({
  target: TARGET_SPACECRAFT,
  debris: [],
  events: [],
  selectedEventId: null,
  catalogReady: false,
  catalogCount: 0,
  scanInProgress: false,
  scanProgress: 0,
  scanThroughput: 0,
  scanDurationMs: 0,
  lastScanAt: null,
  currentJd: currentJd(),
  labConfig: defaultLabConfig,

  setTarget: (d) => set({ target: d }),
  setDebris: (list) => set({ debris: list }),
  setCatalogReady: (b) => set({ catalogReady: b }),
  setCatalogCount: (n) => set({ catalogCount: n }),
  setEvents: (e) => set({ events: e }),
  appendEvents: (e) =>
    set((s) => ({ events: [...s.events, ...e] })),
  selectEvent: (id) => set({ selectedEventId: id }),
  setScanInProgress: (b) => set({ scanInProgress: b }),
  setScanProgress: (p) => set({ scanProgress: p }),
  setScanThroughput: (t) => set({ scanThroughput: t }),
  setScanDurationMs: (t) => set({ scanDurationMs: t }),
  setLastScanAt: (t) => set({ lastScanAt: t }),
  tickJd: (jd) => set({ currentJd: jd }),
  setLabConfig: (cfg) =>
    set((s) => ({ labConfig: { ...s.labConfig, ...cfg } })),
}));
