import { create } from 'zustand';
import type {
  SwingTrajectory,
  BiomechanicsMetrics,
  AlignmentResult,
  EngineStatus,
  CollectionStatus,
  KeypointFrame,
  SwingSnapshot,
} from '@/types';
import { engine } from '@/engine';
import { generateSwingSnapshot, generateBiomechanicsMetrics, generateAlignmentResult, generateSwingTrajectory } from '@/engine/mockData';

interface KineticProState {
  engineStatus: EngineStatus;
  collectionStatus: CollectionStatus;
  currentTrajectory: SwingTrajectory | null;
  currentMetrics: BiomechanicsMetrics | null;
  currentAlignment: AlignmentResult | null;
  currentFrames: KeypointFrame[];
  snapshots: SwingSnapshot[];
  isCollecting: boolean;
  playbackFrame: number;
  playbackSpeed: number;
  isPlaying: boolean;

  startCollection: () => void;
  stopCollection: () => void;
  saveSnapshot: () => void;
  deleteSnapshot: (id: string) => void;
  loadSnapshots: (snaps: SwingSnapshot[]) => void;
  setPlaybackFrame: (frame: number) => void;
  setPlaybackSpeed: (speed: number) => void;
  togglePlayback: () => void;
  loadDemoData: () => void;
}

export const useKineticStore = create<KineticProState>((set, get) => {
  engine.on('frame', (data) => {
    set(state => ({ currentFrames: [...state.currentFrames, data as KeypointFrame] }));
  });

  engine.on('trajectory', (data) => {
    set({ currentTrajectory: data as SwingTrajectory });
  });

  engine.on('metrics', (data) => {
    set({ currentMetrics: data as BiomechanicsMetrics });
  });

  engine.on('alignment', (data) => {
    set({ currentAlignment: data as AlignmentResult });
  });

  engine.on('status', (data) => {
    set({ engineStatus: data as EngineStatus });
  });

  engine.on('collection', (data) => {
    set({ collectionStatus: data as CollectionStatus });
  });

  return {
    engineStatus: { state: 'idle', queueSize: 0, throughput: 0, avgLatency: 0, lastFrameIndex: 0 },
    collectionStatus: { connected: false, fps: 0, alignmentScore: 0, engineLatency: 0 },
    currentTrajectory: null,
    currentMetrics: null,
    currentAlignment: null,
    currentFrames: [],
    snapshots: [],
    isCollecting: false,
    playbackFrame: 0,
    playbackSpeed: 1,
    isPlaying: false,

    startCollection: () => {
      set({
        isCollecting: true,
        currentFrames: [],
        currentTrajectory: null,
        currentMetrics: null,
        currentAlignment: null,
        playbackFrame: 0,
        isPlaying: false,
      });
      engine.start();
    },

    stopCollection: () => {
      engine.stop();
      set({ isCollecting: false });
    },

    saveSnapshot: () => {
      const { currentTrajectory, currentMetrics, currentAlignment, currentFrames } = get();
      if (!currentTrajectory || !currentMetrics) return;

      const snapshot: SwingSnapshot = {
        id: `snap_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        createdAt: Date.now(),
        trajectory: currentTrajectory,
        metrics: currentMetrics,
        alignment: currentAlignment || generateAlignmentResult(),
        keypointFrames: currentFrames,
        tags: ['practice', 'driver'],
        rating: currentMetrics.stabilityScore,
      };

      set(state => ({ snapshots: [snapshot, ...state.snapshots] }));
    },

    deleteSnapshot: (id: string) => {
      set(state => ({ snapshots: state.snapshots.filter(s => s.id !== id) }));
    },

    loadSnapshots: (snaps: SwingSnapshot[]) => {
      set({ snapshots: snaps });
    },

    setPlaybackFrame: (frame: number) => {
      set({ playbackFrame: frame });
    },

    setPlaybackSpeed: (speed: number) => {
      set({ playbackSpeed: speed });
    },

    togglePlayback: () => {
      set(state => ({ isPlaying: !state.isPlaying }));
    },

    loadDemoData: () => {
      const trajectory = generateSwingTrajectory();
      const metrics = generateBiomechanicsMetrics();
      const alignment = generateAlignmentResult();
      const frames = generateKeypointSnapshot();

      const snapshot: SwingSnapshot = {
        id: `snap_demo_${Date.now()}`,
        createdAt: Date.now() - 86400000,
        trajectory,
        metrics,
        alignment,
        keypointFrames: frames,
        tags: ['demo', 'driver'],
        rating: metrics.stabilityScore,
      };

      set({
        currentTrajectory: trajectory,
        currentMetrics: metrics,
        currentAlignment: alignment,
        currentFrames: frames,
        snapshots: [snapshot],
        collectionStatus: {
          connected: true,
          fps: 30,
          alignmentScore: alignment.alignmentScore,
          engineLatency: 10,
        },
        engineStatus: {
          state: 'idle',
          queueSize: 0,
          throughput: 120,
          avgLatency: 10,
          lastFrameIndex: 119,
        },
      });
    },
  };
});

function generateKeypointSnapshot(): KeypointFrame[] {
  return Array.from({ length: 120 }, (_, i) => ({
    timestamp: Date.now() - (120 - i) * 16,
    keypoints: [],
    confidence: 0.9 + Math.random() * 0.09,
    frameIndex: i,
  }));
}
