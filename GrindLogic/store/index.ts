import { create } from 'zustand';
import type {
  PowerSpectrumPoint,
  ProcessingParams,
  RoughnessPrediction,
  PartFingerprint,
  ParameterOptimizationResult,
  SystemConfig,
  RealtimeDataFrame,
} from '@/types';

interface AppState {
  isConnected: boolean;
  isProcessing: boolean;
  currentPart: string;
  currentBatch: string;
  realtimeData: PowerSpectrumPoint[];
  currentParams: ProcessingParams;
  latestPrediction: RoughnessPrediction | null;
  latestOptimization: ParameterOptimizationResult | null;
  fingerprints: PartFingerprint[];
  systemConfig: SystemConfig;
  recentPredictions: Array<{
    id: string;
    timestamp: number;
    partNumber: string;
    predictedRa: number;
    actualRa?: number;
    accuracy?: number;
    status: 'SUCCESS' | 'PENDING' | 'FAILED';
  }>;
  setConnected: (connected: boolean) => void;
  setProcessing: (processing: boolean) => void;
  setCurrentPart: (part: string) => void;
  setCurrentBatch: (batch: string) => void;
  addRealtimeData: (data: PowerSpectrumPoint[]) => void;
  clearRealtimeData: () => void;
  setCurrentParams: (params: ProcessingParams) => void;
  setLatestPrediction: (prediction: RoughnessPrediction | null) => void;
  setLatestOptimization: (optimization: ParameterOptimizationResult | null) => void;
  setFingerprints: (fingerprints: PartFingerprint[]) => void;
  addFingerprint: (fingerprint: PartFingerprint) => void;
  setSystemConfig: (config: SystemConfig) => void;
  addRecentPrediction: (prediction: {
    id: string;
    timestamp: number;
    partNumber: string;
    predictedRa: number;
    actualRa?: number;
    accuracy?: number;
    status: 'SUCCESS' | 'PENDING' | 'FAILED';
  }) => void;
  processRealtimeFrame: (frame: RealtimeDataFrame) => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  isConnected: true,
  isProcessing: false,
  currentPart: 'PART-2024-001',
  currentBatch: 'BATCH-2024-05-001',
  realtimeData: [],
  currentParams: {
    feedRate: 200,
    spindleSpeed: 5000,
    depthOfCut: 20,
    grindingWheelSpeed: 35,
    coolantPressure: 5.5,
  },
  latestPrediction: null,
  latestOptimization: null,
  fingerprints: [],
  systemConfig: {
    dataSource: {
      mesEndpoint: '',
      qmsEndpoint: '',
      websocketUrl: '',
      pollingInterval: 1000,
    },
    thresholds: {
      maxRa: 1.6,
      maxRz: 6.3,
      warningThreshold: 0.8,
      criticalThreshold: 1.2,
    },
    modelConfig: {
      activeModel: 'xgboost_v1.2.0',
      autoRetrain: true,
      retrainThreshold: 100,
    },
    displayConfig: {
      theme: 'dark',
      refreshRate: 1000,
      chartPoints: 1000,
    },
  },
  recentPredictions: [],

  setConnected: (connected) => set({ isConnected: connected }),
  setProcessing: (processing) => set({ isProcessing: processing }),
  setCurrentPart: (part) => set({ currentPart: part }),
  setCurrentBatch: (batch) => set({ currentBatch: batch }),

  addRealtimeData: (data) =>
    set((state) => {
      const maxPoints = state.systemConfig.displayConfig.chartPoints;
      const combined = [...state.realtimeData, ...data];
      return {
        realtimeData: combined.slice(-maxPoints),
      };
    }),

  clearRealtimeData: () => set({ realtimeData: [] }),

  setCurrentParams: (params) => set({ currentParams: params }),
  setLatestPrediction: (prediction) => set({ latestPrediction: prediction }),
  setLatestOptimization: (optimization) => set({ latestOptimization: optimization }),
  setFingerprints: (fingerprints) => set({ fingerprints }),

  addFingerprint: (fingerprint) =>
    set((state) => ({
      fingerprints: [fingerprint, ...state.fingerprints].slice(0, 100),
    })),

  setSystemConfig: (config) => set({ systemConfig: config }),

  addRecentPrediction: (prediction) =>
    set((state) => ({
      recentPredictions: [prediction, ...state.recentPredictions].slice(0, 20),
    })),

  processRealtimeFrame: (frame) => {
    const state = get();
    if (frame.type === 'POWER_SPECTRUM') {
      state.addRealtimeData(frame.payload);
    } else if (frame.type === 'PROCESSING_PARAMS') {
      state.setCurrentParams(frame.payload);
    }
  },
}));
