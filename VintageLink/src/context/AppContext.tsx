import React, { createContext, useContext, useReducer, useEffect, useCallback, useState } from 'react';
import type {
  WineLabel,
  CellarZone,
  WineBottle,
  SensorReading,
  Alert,
  MaturationModel,
  DrinkingWindow,
  SystemStatus,
  TabType,
} from '@/types';
import { db } from '@/db';
import { generateMockDataset } from '@/data/mockData';
import { simulationEngine } from '@/models/SimulationEngine';
import type { SimulationState, SimulationSpeed, SimulationEvent } from '@/models/SimulationEngine';

interface AppState {
  labels: WineLabel[];
  zones: CellarZone[];
  bottles: WineBottle[];
  readings: SensorReading[];
  alerts: Alert[];
  maturationModels: MaturationModel[];
  drinkingWindows: DrinkingWindow[];
  systemStatus: SystemStatus;
  activeTab: TabType;
  selectedZoneId: string | null;
  selectedWineId: string | null;
  isLoading: boolean;
  isInitialized: boolean;
  lastUpdate: number;
}

type AppAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_INITIALIZED'; payload: boolean }
  | { type: 'SET_LABELS'; payload: WineLabel[] }
  | { type: 'SET_ZONES'; payload: CellarZone[] }
  | { type: 'SET_BOTTLES'; payload: WineBottle[] }
  | { type: 'SET_READINGS'; payload: SensorReading[] }
  | { type: 'SET_ALERTS'; payload: Alert[] }
  | { type: 'SET_MATURATION_MODELS'; payload: MaturationModel[] }
  | { type: 'SET_DRINKING_WINDOWS'; payload: DrinkingWindow[] }
  | { type: 'SET_ACTIVE_TAB'; payload: TabType }
  | { type: 'SET_SELECTED_ZONE'; payload: string | null }
  | { type: 'SET_SELECTED_WINE'; payload: string | null }
  | { type: 'ADD_READING'; payload: SensorReading }
  | { type: 'RESOLVE_ALERT'; payload: string }
  | { type: 'UPDATE_SYSTEM_STATUS'; payload: Partial<SystemStatus> }
  | { type: 'UPDATE_LAST_UPDATE'; payload: number };

const initialState: AppState = {
  labels: [],
  zones: [],
  bottles: [],
  readings: [],
  alerts: [],
  maturationModels: [],
  drinkingWindows: [],
  systemStatus: {
    databaseReady: false,
    sensorCount: 0,
    wineCount: 0,
    activeAlerts: 0,
    lastSyncTime: 0,
  },
  activeTab: 'dashboard',
  selectedZoneId: null,
  selectedWineId: null,
  isLoading: true,
  isInitialized: false,
  lastUpdate: 0,
};

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'SET_INITIALIZED':
      return { ...state, isInitialized: action.payload };
    case 'SET_LABELS':
      return { ...state, labels: action.payload };
    case 'SET_ZONES':
      return { ...state, zones: action.payload, selectedZoneId: action.payload[0]?.id || null };
    case 'SET_BOTTLES':
      return { ...state, bottles: action.payload };
    case 'SET_READINGS':
      return { ...state, readings: action.payload };
    case 'SET_ALERTS':
      return {
        ...state,
        alerts: action.payload,
        systemStatus: {
          ...state.systemStatus,
          activeAlerts: action.payload.filter(a => !a.resolved).length,
        },
      };
    case 'SET_MATURATION_MODELS':
      return { ...state, maturationModels: action.payload };
    case 'SET_DRINKING_WINDOWS':
      return { ...state, drinkingWindows: action.payload };
    case 'SET_ACTIVE_TAB':
      return { ...state, activeTab: action.payload };
    case 'SET_SELECTED_ZONE':
      return { ...state, selectedZoneId: action.payload };
    case 'SET_SELECTED_WINE':
      return { ...state, selectedWineId: action.payload };
    case 'ADD_READING':
      return { ...state, readings: [...state.readings.slice(-1000), action.payload] };
    case 'RESOLVE_ALERT':
      return {
        ...state,
        alerts: state.alerts.map(a =>
          a.id === action.payload ? { ...a, resolved: true } : a
        ),
        systemStatus: {
          ...state.systemStatus,
          activeAlerts: state.systemStatus.activeAlerts - 1,
        },
      };
    case 'UPDATE_SYSTEM_STATUS':
      return {
        ...state,
        systemStatus: { ...state.systemStatus, ...action.payload },
      };
    case 'UPDATE_LAST_UPDATE':
      return {
        ...state,
        lastUpdate: action.payload,
      };
    default:
      return state;
  }
}

interface AppContextType {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
  initializeData: () => Promise<void>;
  getLabelById: (id: string) => WineLabel | undefined;
  getBottleById: (id: string) => WineBottle | undefined;
  getZoneById: (id: string) => CellarZone | undefined;
  getReadingsByZone: (zoneId: string) => SensorReading[];
  getMaturationByWine: (wineId: string) => MaturationModel | undefined;
  getWindowByWine: (wineId: string) => DrinkingWindow | undefined;
  getWinesByZone: (zoneId: string) => { bottle: WineBottle; label: WineLabel }[];
  simulationState: SimulationState;
  simulationEvents: SimulationEvent[];
  startSimulation: (speed?: SimulationSpeed) => void;
  stopSimulation: () => void;
  setSimulationSpeed: (speed: SimulationSpeed) => void;
  resetSimulation: () => Promise<void>;
}

const AppContext = createContext<AppContextType | null>(null);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(appReducer, initialState);
  const [simulationState, setSimulationState] = useState<SimulationState>(simulationEngine.getState());
  const [simulationEvents, setSimulationEvents] = useState<SimulationEvent[]>([]);

  const getLabelById = useCallback(
    (id: string) => state.labels.find(l => l.id === id),
    [state.labels]
  );

  const getBottleById = useCallback(
    (id: string) => state.bottles.find(b => b.id === id),
    [state.bottles]
  );

  const getZoneById = useCallback(
    (id: string) => state.zones.find(z => z.id === id),
    [state.zones]
  );

  const getReadingsByZone = useCallback(
    (zoneId: string) =>
      state.readings.filter(r => r.zoneId === zoneId).sort((a, b) => a.timestamp - b.timestamp),
    [state.readings]
  );

  const getMaturationByWine = useCallback(
    (wineId: string) => state.maturationModels.find(m => m.wineId === wineId),
    [state.maturationModels]
  );

  const getWindowByWine = useCallback(
    (wineId: string) => state.drinkingWindows.find(w => w.wineId === wineId),
    [state.drinkingWindows]
  );

  const getWinesByZone = useCallback(
    (zoneId: string) => {
      const zoneBottles = state.bottles.filter(b => b.location.zoneId === zoneId);
      return zoneBottles
        .map(bottle => {
          const label = getLabelById(bottle.labelId);
          return label ? { bottle, label } : null;
        })
        .filter(Boolean) as { bottle: WineBottle; label: WineLabel }[];
    },
    [state.bottles, getLabelById]
  );

  const initializeData = useCallback(async () => {
    dispatch({ type: 'SET_LOADING', payload: true });

    try {
      await db.init();

      const existingLabels = await db.getAllWineLabels();
      const systemInitialized = await db.getMetadata<boolean>('systemInitialized');

      let labels: WineLabel[] = [];
      let zones: CellarZone[] = [];
      let bottles: WineBottle[] = [];
      let allReadings: SensorReading[] = [];
      let alerts: Alert[] = [];
      let maturationModels: MaturationModel[] = [];
      let drinkingWindows: DrinkingWindow[] = [];

      if (existingLabels.length === 0 || !systemInitialized) {
        const mockData = await generateMockDataset();

        await db.bulkAddWineLabels(mockData.labels);
        await Promise.all(mockData.zones.map(z => db.addCellarZone(z)));
        await db.bulkAddWineBottles(mockData.bottles);
        await db.bulkAddSensorReadings(mockData.readings);
        await Promise.all(mockData.alerts.map(a => db.addAlert(a)));
        await Promise.all(mockData.maturationModels.map(m => db.addMaturationModel(m)));
        await Promise.all(mockData.drinkingWindows.map(w => db.addDrinkingWindow(w)));
        await db.setMetadata('systemInitialized', true);

        labels = mockData.labels;
        zones = mockData.zones;
        bottles = mockData.bottles;
        allReadings = mockData.readings;
        alerts = mockData.alerts;
        maturationModels = mockData.maturationModels;
        drinkingWindows = mockData.drinkingWindows;
      } else {
        [labels, zones, bottles, alerts, drinkingWindows] = await Promise.all([
          db.getAllWineLabels(),
          db.getAllCellarZones(),
          db.getAllWineBottles(),
          db.getActiveAlerts(),
          db.getAllDrinkingWindows(),
        ]);

        const [maturationModelsResult, readingsResult] = await Promise.all([
          Promise.all(bottles.map(b => db.getMaturationModel(b.id))).then(r =>
            r.filter(Boolean) as MaturationModel[]
          ),
          Promise.all(
            zones.map(zone =>
              db.getSensorReadingsByZone(zone.id, Date.now() - 86400000 * 30, Date.now())
            )
          ),
        ]);

        maturationModels = maturationModelsResult;
        allReadings = readingsResult.flat();
      }

      dispatch({ type: 'SET_LABELS', payload: labels });
      dispatch({ type: 'SET_ZONES', payload: zones });
      dispatch({ type: 'SET_BOTTLES', payload: bottles });
      dispatch({ type: 'SET_READINGS', payload: allReadings });
      dispatch({ type: 'SET_ALERTS', payload: alerts });
      dispatch({ type: 'SET_MATURATION_MODELS', payload: maturationModels });
      dispatch({ type: 'SET_DRINKING_WINDOWS', payload: drinkingWindows });

      const sensorCount = zones.reduce((sum, z) => sum + z.sensorIds.length, 0);
      const activeAlerts = alerts.filter(a => !a.resolved).length;

      dispatch({
        type: 'UPDATE_SYSTEM_STATUS',
        payload: {
          databaseReady: true,
          sensorCount,
          wineCount: bottles.length,
          activeAlerts,
          lastSyncTime: Date.now(),
        },
      });

      dispatch({ type: 'SET_INITIALIZED', payload: true });
      dispatch({ type: 'UPDATE_LAST_UPDATE', payload: Date.now() });
    } catch (error) {
      console.error('Failed to initialize data:', error);
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [state.zones, state.alerts, state.bottles]);

  useEffect(() => {
    initializeData();
  }, [initializeData]);

  useEffect(() => {
    if (!state.isInitialized) return;

    simulationEngine.setCallbacks({
      onSensorReading: (reading) => {
        dispatch({ type: 'ADD_READING', payload: reading });
        dispatch({ type: 'UPDATE_LAST_UPDATE', payload: Date.now() });
      },
      onAlert: (alert) => {
        dispatch({ type: 'SET_ALERTS', payload: [...state.alerts, alert] });
      },
      onMaturationUpdate: (model) => {
        dispatch({
          type: 'SET_MATURATION_MODELS',
          payload: state.maturationModels.map(m => m.wineId === model.wineId ? model : m),
        });
      },
      onDrinkingWindowUpdate: (window) => {
        dispatch({
          type: 'SET_DRINKING_WINDOWS',
          payload: state.drinkingWindows.map(w => w.wineId === window.wineId ? window : w),
        });
      },
    });

    simulationEngine.initialize(state.zones, state.bottles, state.labels);

    const unsub = simulationEngine.subscribe((newState) => {
      setSimulationState(newState);
      setSimulationEvents(newState.eventLog);
    });

    return () => {
      unsub();
      simulationEngine.destroy();
    };
  }, [state.isInitialized]);

  const startSimulation = useCallback((speed?: SimulationSpeed) => {
    simulationEngine.start(speed || '1x');
  }, []);

  const stopSimulation = useCallback(() => {
    simulationEngine.stop();
  }, []);

  const setSimulationSpeed = useCallback((speed: SimulationSpeed) => {
    simulationEngine.setSpeed(speed);
  }, []);

  const resetSimulation = useCallback(async () => {
    await simulationEngine.reset();
  }, []);

  return (
    <AppContext.Provider
      value={{
        state,
        dispatch,
        initializeData,
        getLabelById,
        getBottleById,
        getZoneById,
        getReadingsByZone,
        getMaturationByWine,
        getWindowByWine,
        getWinesByZone,
        simulationState,
        simulationEvents,
        startSimulation,
        stopSimulation,
        setSimulationSpeed,
        resetSimulation,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = (): AppContextType => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
