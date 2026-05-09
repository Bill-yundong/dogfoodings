import { createContext, useContext, useReducer, useCallback, useEffect, type ReactNode } from 'react';
import type {
  VisibilityAnalysisResult,
  StreetPerceptionScore,
  RoadSegment,
  Building,
  Viewpoint,
  ModuleSyncState,
  SyncMapEntry
} from '../types';
import { cacheVisibilityResult, cachePerceptionScores, getVisibilityResult } from '../lib/roadNetworkCache';

interface VisibilitySyncState {
  visibilityResults: Map<string, VisibilityAnalysisResult>;
  perceptionScores: Map<string, StreetPerceptionScore>;
  roadSegments: Map<string, RoadSegment>;
  buildings: Building[];
  viewpoints: Viewpoint[];
  syncState: ModuleSyncState;
  selectedViewpointId: string | null;
  isAnalyzing: boolean;
  analysisProgress: number;
}

type SyncAction =
  | { type: 'SET_VISIBILITY_RESULT'; payload: VisibilityAnalysisResult }
  | { type: 'SET_PERCEPTION_SCORE'; payload: StreetPerceptionScore }
  | { type: 'SET_PERCEPTION_SCORES'; payload: StreetPerceptionScore[] }
  | { type: 'SET_ROAD_SEGMENTS'; payload: RoadSegment[] }
  | { type: 'SET_BUILDINGS'; payload: Building[] }
  | { type: 'SET_VIEWPOINTS'; payload: Viewpoint[] }
  | { type: 'ADD_VIEWPOINT'; payload: Viewpoint }
  | { type: 'START_SYNC' }
  | { type: 'FINISH_SYNC' }
  | { type: 'QUEUE_UPDATE'; payload: SyncMapEntry }
  | { type: 'CLEAR_QUEUE' }
  | { type: 'SELECT_VIEWPOINT'; payload: string | null }
  | { type: 'START_ANALYSIS' }
  | { type: 'SET_ANALYSIS_PROGRESS'; payload: number }
  | { type: 'FINISH_ANALYSIS' };

const initialState: VisibilitySyncState = {
  visibilityResults: new Map(),
  perceptionScores: new Map(),
  roadSegments: new Map(),
  buildings: [],
  viewpoints: [],
  syncState: {
    lastSyncTime: 0,
    pendingUpdates: [],
    isSynchronizing: false
  },
  selectedViewpointId: null,
  isAnalyzing: false,
  analysisProgress: 0
};

function syncReducer(state: VisibilitySyncState, action: SyncAction): VisibilitySyncState {
  switch (action.type) {
    case 'SET_VISIBILITY_RESULT': {
      const newResults = new Map(state.visibilityResults);
      newResults.set(action.payload.viewpointId, action.payload);
      return { ...state, visibilityResults: newResults };
    }

    case 'SET_PERCEPTION_SCORE': {
      const newScores = new Map(state.perceptionScores);
      newScores.set(action.payload.segmentId, action.payload);
      return { ...state, perceptionScores: newScores };
    }

    case 'SET_PERCEPTION_SCORES': {
      const newScores = new Map(state.perceptionScores);
      for (const score of action.payload) {
        newScores.set(score.segmentId, score);
      }
      return { ...state, perceptionScores: newScores };
    }

    case 'SET_ROAD_SEGMENTS': {
      const newSegments = new Map<string, RoadSegment>();
      for (const segment of action.payload) {
        newSegments.set(segment.id, segment);
      }
      return { ...state, roadSegments: newSegments };
    }

    case 'SET_BUILDINGS':
      return { ...state, buildings: action.payload };

    case 'SET_VIEWPOINTS':
      return { ...state, viewpoints: action.payload };

    case 'ADD_VIEWPOINT':
      return { ...state, viewpoints: [...state.viewpoints, action.payload] };

    case 'START_SYNC':
      return {
        ...state,
        syncState: { ...state.syncState, isSynchronizing: true }
      };

    case 'FINISH_SYNC':
      return {
        ...state,
        syncState: {
          ...state.syncState,
          isSynchronizing: false,
          lastSyncTime: Date.now()
        }
      };

    case 'QUEUE_UPDATE':
      return {
        ...state,
        syncState: {
          ...state.syncState,
          pendingUpdates: [...state.syncState.pendingUpdates, action.payload]
        }
      };

    case 'CLEAR_QUEUE':
      return {
        ...state,
        syncState: { ...state.syncState, pendingUpdates: [] }
      };

    case 'SELECT_VIEWPOINT':
      return { ...state, selectedViewpointId: action.payload };

    case 'START_ANALYSIS':
      return { ...state, isAnalyzing: true, analysisProgress: 0 };

    case 'SET_ANALYSIS_PROGRESS':
      return { ...state, analysisProgress: action.payload };

    case 'FINISH_ANALYSIS':
      return { ...state, isAnalyzing: false, analysisProgress: 100 };

    default:
      return state;
  }
}

interface VisibilitySyncContextType {
  state: VisibilitySyncState;
  setVisibilityResult: (result: VisibilityAnalysisResult) => void;
  setPerceptionScores: (scores: StreetPerceptionScore[]) => void;
  setRoadSegments: (segments: RoadSegment[]) => void;
  setBuildings: (buildings: Building[]) => void;
  setViewpoints: (viewpoints: Viewpoint[]) => void;
  addViewpoint: (viewpoint: Viewpoint) => void;
  selectViewpoint: (viewpointId: string | null) => void;
  syncModules: (sourceModule: 'urban-design' | 'traffic-assessment') => Promise<void>;
  loadCachedVisibility: (viewpointId: string) => Promise<boolean>;
  getAllPerceptionScores: () => StreetPerceptionScore[];
  getAllVisibilityResults: () => VisibilityAnalysisResult[];
  getAllRoadSegments: () => RoadSegment[];
}

const VisibilitySyncContext = createContext<VisibilitySyncContextType | null>(null);

export function VisibilitySyncProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(syncReducer, initialState);

  const setVisibilityResult = useCallback((result: VisibilityAnalysisResult) => {
    dispatch({ type: 'SET_VISIBILITY_RESULT', payload: result });
    cacheVisibilityResult(result);
  }, []);

  const setPerceptionScores = useCallback((scores: StreetPerceptionScore[]) => {
    dispatch({ type: 'SET_PERCEPTION_SCORES', payload: scores });
    cachePerceptionScores(scores);
  }, []);

  const setRoadSegments = useCallback((segments: RoadSegment[]) => {
    dispatch({ type: 'SET_ROAD_SEGMENTS', payload: segments });
  }, []);

  const setBuildings = useCallback((buildings: Building[]) => {
    dispatch({ type: 'SET_BUILDINGS', payload: buildings });
  }, []);

  const setViewpoints = useCallback((viewpoints: Viewpoint[]) => {
    dispatch({ type: 'SET_VIEWPOINTS', payload: viewpoints });
  }, []);

  const addViewpoint = useCallback((viewpoint: Viewpoint) => {
    dispatch({ type: 'ADD_VIEWPOINT', payload: viewpoint });
  }, []);

  const selectViewpoint = useCallback((viewpointId: string | null) => {
    dispatch({ type: 'SELECT_VIEWPOINT', payload: viewpointId });
  }, []);

  const syncModules = useCallback(
    async (sourceModule: 'urban-design' | 'traffic-assessment') => {
      dispatch({ type: 'START_SYNC' });

      const entries: SyncMapEntry[] = [
        {
          sourceModule,
          dataType: 'visibility',
          dataId: 'batch',
          timestamp: Date.now(),
          version: 1
        },
        {
          sourceModule,
          dataType: 'perception',
          dataId: 'batch',
          timestamp: Date.now(),
          version: 1
        },
        {
          sourceModule,
          dataType: 'network',
          dataId: 'batch',
          timestamp: Date.now(),
          version: 1
        }
      ];

      for (const entry of entries) {
        dispatch({ type: 'QUEUE_UPDATE', payload: entry });
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      dispatch({ type: 'CLEAR_QUEUE' });
      dispatch({ type: 'FINISH_SYNC' });
    },
    []
  );

  const loadCachedVisibility = useCallback(
    async (viewpointId: string): Promise<boolean> => {
      const cached = await getVisibilityResult(viewpointId);
      if (cached) {
        dispatch({ type: 'SET_VISIBILITY_RESULT', payload: cached });
        return true;
      }
      return false;
    },
    []
  );

  const getAllPerceptionScores = useCallback(() => {
    return Array.from(state.perceptionScores.values());
  }, [state.perceptionScores]);

  const getAllVisibilityResults = useCallback(() => {
    return Array.from(state.visibilityResults.values());
  }, [state.visibilityResults]);

  const getAllRoadSegments = useCallback(() => {
    return Array.from(state.roadSegments.values());
  }, [state.roadSegments]);

  useEffect(() => {
    let mounted = true;

    async function initCache() {
      if (!mounted) return;
      for (const vp of state.viewpoints) {
        await loadCachedVisibility(vp.id);
      }
    }

    if (state.viewpoints.length > 0) {
      initCache();
    }

    return () => {
      mounted = false;
    };
  }, [state.viewpoints.length, loadCachedVisibility]);

  const value: VisibilitySyncContextType = {
    state,
    setVisibilityResult,
    setPerceptionScores,
    setRoadSegments,
    setBuildings,
    setViewpoints,
    addViewpoint,
    selectViewpoint,
    syncModules,
    loadCachedVisibility,
    getAllPerceptionScores,
    getAllVisibilityResults,
    getAllRoadSegments
  };

  return (
    <VisibilitySyncContext.Provider value={value}>
      {children}
    </VisibilitySyncContext.Provider>
  );
}

export function useVisibilitySync(): VisibilitySyncContextType {
  const context = useContext(VisibilitySyncContext);
  if (!context) {
    throw new Error('useVisibilitySync must be used within a VisibilitySyncProvider');
  }
  return context;
}
