import { create } from 'zustand';
import type {
  RobotModel,
  RobotPose,
  Obstacle,
  SimulationStatus,
  CollisionWarning,
  DataFrame,
  APFParameters,
} from '@/types/robot';
import { defaultRobotModels, createInitialJoints } from '@/lib/robotics/robotModel';
import { forwardKinematics } from '@/lib/robotics/kinematics';
import { defaultAPFParameters } from '@/lib/planning/potentialField';
import { DataAlignmentBuffer, createDataFrame } from '@/lib/sync/dataAlignment';
import { robotDB } from '@/lib/storage/indexedDB';

interface SimulationState {
  status: SimulationStatus;
  simulationTime: number;
  frameNumber: number;
  speedMultiplier: number;
  fps: number;

  robotModels: RobotModel[];
  robotPoses: Map<string, RobotPose>;
  robotTargets: Map<string, { position: [number, number, number] }>;

  obstacles: Obstacle[];

  collisionWarnings: CollisionWarning[];
  apfParameters: APFParameters;

  masterDataFrames: DataFrame[];
  monitorDataFrames: DataFrame[];
  dataAlignmentBuffer: DataAlignmentBuffer;
  isDataAligned: boolean;
  maxDeviation: number;

  storedSnapshotCount: number;

  selectedRobotId: string | null;
  showTrajectories: boolean;
  showCollisionZones: boolean;

  actions: {
    start: () => void;
    pause: () => void;
    reset: () => void;
    setSpeed: (speed: number) => void;
    updateFrame: (deltaTime: number) => void;
    setRobotTarget: (robotId: string, position: [number, number, number]) => void;
    addObstacle: (obstacle: Obstacle) => void;
    removeObstacle: (id: string) => void;
    selectRobot: (id: string | null) => void;
    toggleTrajectories: () => void;
    toggleCollisionZones: () => void;
    updateAPFParams: (params: Partial<APFParameters>) => void;
    syncSnapshotCount: () => Promise<void>;
  };
}

const createInitialPoses = (models: RobotModel[]): Map<string, RobotPose> => {
  const poses = new Map<string, RobotPose>();
  const now = Date.now();

  for (const model of models) {
    const joints = createInitialJoints();
    const { position, orientation } = forwardKinematics(
      model.dhParameters,
      joints,
      model.basePosition
    );

    poses.set(model.id, {
      robotId: model.id,
      timestamp: now,
      frameNumber: 0,
      joints,
      jointStates: joints.map(j => ({ position: j, velocity: 0, effort: 0 })),
      endEffector: { position, orientation },
    });
  }

  return poses;
};

const createInitialTargets = (models: RobotModel[]): Map<string, { position: [number, number, number] }> => {
  const targets = new Map<string, { position: [number, number, number] }>();

  for (const model of models) {
    targets.set(model.id, {
      position: [
        model.basePosition[0],
        0.8,
        model.basePosition[2] + 1.5,
      ],
    });
  }

  return targets;
};

const defaultObstacles: Obstacle[] = [
  {
    id: 'obs-1',
    type: 'box',
    position: [0, 0.3, 0],
    size: [0.6, 0.6, 0.6],
    color: '#64748b',
  },
  {
    id: 'obs-2',
    type: 'cylinder',
    position: [-1.5, 0.4, 1.5],
    size: [0.4, 0.8, 0.4],
    color: '#94a3b8',
  },
];

export const useSimulationStore = create<SimulationState>((set, get) => ({
  status: 'idle',
  simulationTime: 0,
  frameNumber: 0,
  speedMultiplier: 1.0,
  fps: 60,

  robotModels: defaultRobotModels,
  robotPoses: createInitialPoses(defaultRobotModels),
  robotTargets: createInitialTargets(defaultRobotModels),

  obstacles: defaultObstacles,

  collisionWarnings: [],
  apfParameters: defaultAPFParameters,

  masterDataFrames: [],
  monitorDataFrames: [],
  dataAlignmentBuffer: new DataAlignmentBuffer(),
  isDataAligned: true,
  maxDeviation: 0,

  storedSnapshotCount: 0,

  selectedRobotId: defaultRobotModels[0]?.id || null,
  showTrajectories: true,
  showCollisionZones: false,

  actions: {
    start: () => set({ status: 'running' }),
    pause: () => set({ status: 'paused' }),
    reset: () => {
      const models = get().robotModels;
      set({
        status: 'idle',
        simulationTime: 0,
        frameNumber: 0,
        robotPoses: createInitialPoses(models),
        collisionWarnings: [],
        masterDataFrames: [],
        monitorDataFrames: [],
        isDataAligned: true,
        maxDeviation: 0,
      });
      get().dataAlignmentBuffer.clear();
    },
    setSpeed: (speed: number) => set({ speedMultiplier: speed }),
    updateFrame: (deltaTime: number) => {
      const state = get();
      if (state.status !== 'running') return;

      const newFrameNumber = state.frameNumber + 1;
      const newSimulationTime = state.simulationTime + deltaTime * state.speedMultiplier;

      set({
        frameNumber: newFrameNumber,
        simulationTime: newSimulationTime,
        fps: Math.round(1 / deltaTime),
      });
    },
    setRobotTarget: (robotId: string, position: [number, number, number]) => {
      const targets = new Map(get().robotTargets);
      targets.set(robotId, { position });
      set({ robotTargets: targets });
    },
    addObstacle: (obstacle: Obstacle) => {
      set(state => ({ obstacles: [...state.obstacles, obstacle] }));
    },
    removeObstacle: (id: string) => {
      set(state => ({
        obstacles: state.obstacles.filter(o => o.id !== id),
      }));
    },
    selectRobot: (id: string | null) => set({ selectedRobotId: id }),
    toggleTrajectories: () => set(state => ({ showTrajectories: !state.showTrajectories })),
    toggleCollisionZones: () => set(state => ({ showCollisionZones: !state.showCollisionZones })),
    updateAPFParams: (params: Partial<APFParameters>) => {
      set(state => ({
        apfParameters: { ...state.apfParameters, ...params },
      }));
    },
    syncSnapshotCount: async () => {
      const count = await robotDB.getTotalSnapshotCount();
      set({ storedSnapshotCount: count });
    },
  },
}));
