import { create } from 'zustand';
import type { WeldPoint, RealTimeData, Alert, SystemConfig, DeviceStatus } from '@/types';
import { generateRealTimeData, generateWeldPoint } from '@/lib/simulation';
import { addWeldPoint, addRealtimeData, addAlert, getWeldPointCount } from '@/lib/db';

interface MonitoringState {
  isRunning: boolean;
  selectedRobotId: string;
  realtimeData: Record<string, RealTimeData>;
  recentWeldPoints: WeldPoint[];
  alerts: Alert[];
  systemConfig: SystemConfig | null;
  robotStatuses: Record<string, DeviceStatus>;
  stats: {
    totalWeldPoints: number;
    todayWelds: number;
    highRiskCount: number;
    mediumRiskCount: number;
    lowRiskCount: number;
  };
}

interface MonitoringActions {
  startMonitoring: () => void;
  stopMonitoring: () => void;
  setSelectedRobot: (robotId: string) => void;
  addRealtimeDataPoint: (data: RealTimeData) => void;
  addWeldPointData: (point: WeldPoint) => void;
  addAlertData: (alert: Alert) => void;
  acknowledgeAlert: (alertId: string) => void;
  updateStats: () => void;
  setSystemConfig: (config: SystemConfig) => void;
}

const ROBOT_IDS = ['ROBOT-001', 'ROBOT-002', 'ROBOT-003'];

const initialState: MonitoringState = {
  isRunning: false,
  selectedRobotId: 'ROBOT-001',
  realtimeData: {},
  recentWeldPoints: [],
  alerts: [],
  systemConfig: null,
  robotStatuses: {
    'ROBOT-001': 'offline',
    'ROBOT-002': 'offline',
    'ROBOT-003': 'offline',
  },
  stats: {
    totalWeldPoints: 0,
    todayWelds: 0,
    highRiskCount: 0,
    mediumRiskCount: 0,
    lowRiskCount: 0,
  },
};

export const useMonitoringStore = create<MonitoringState & MonitoringActions>((set, get) => ({
  ...initialState,

  startMonitoring: () => {
    set({ isRunning: true });
    get().updateStats();
  },

  stopMonitoring: () => {
    set({ isRunning: false });
    set((state) => ({
      robotStatuses: Object.keys(state.robotStatuses).reduce((acc, key) => {
        acc[key] = 'offline';
        return acc;
      }, {} as Record<string, DeviceStatus>),
    }));
  },

  setSelectedRobot: (robotId: string) => {
    set({ selectedRobotId: robotId });
  },

  addRealtimeDataPoint: (data: RealTimeData) => {
    set((state) => ({
      realtimeData: {
        ...state.realtimeData,
        [data.robotId]: data,
      },
      robotStatuses: {
        ...state.robotStatuses,
        [data.robotId]: data.status,
      },
    }));
  },

  addWeldPointData: (point: WeldPoint) => {
    set((state) => {
      const newPoints = [point, ...state.recentWeldPoints].slice(0, 50);
      return {
        recentWeldPoints: newPoints,
        stats: {
          ...state.stats,
          totalWeldPoints: state.stats.totalWeldPoints + 1,
          todayWelds: state.stats.todayWelds + 1,
          highRiskCount: point.defectRisk === 'high' ? state.stats.highRiskCount + 1 : state.stats.highRiskCount,
          mediumRiskCount: point.defectRisk === 'medium' ? state.stats.mediumRiskCount + 1 : state.stats.mediumRiskCount,
          lowRiskCount: point.defectRisk === 'low' ? state.stats.lowRiskCount + 1 : state.stats.lowRiskCount,
        },
      };
    });
  },

  addAlertData: (alert: Alert) => {
    set((state) => ({
      alerts: [alert, ...state.alerts].slice(0, 100),
    }));
  },

  acknowledgeAlert: (alertId: string) => {
    set((state) => ({
      alerts: state.alerts.map((a) =>
        a.id === alertId ? { ...a, acknowledged: true } : a
      ),
    }));
  },

  updateStats: async () => {
    const count = await getWeldPointCount();
    set((state) => ({
      stats: {
        ...state.stats,
        totalWeldPoints: count,
      },
    }));
  },

  setSystemConfig: (config: SystemConfig) => {
    set({ systemConfig: config });
  },
}));

let monitoringInterval: ReturnType<typeof setInterval> | null = null;
let weldPointInterval: ReturnType<typeof setInterval> | null = null;

export function startDataSimulation() {
  const store = useMonitoringStore.getState();
  if (store.isRunning) return;

  store.startMonitoring();

  const previousData: Record<string, RealTimeData> = {};

  monitoringInterval = setInterval(() => {
    const state = useMonitoringStore.getState();
    if (!state.isRunning) return;

    ROBOT_IDS.forEach((robotId) => {
      const data = generateRealTimeData(robotId, previousData[robotId]);
      previousData[robotId] = data;
      state.addRealtimeDataPoint(data);
      addRealtimeData(data);

      if (data.status === 'error' || data.status === 'warning') {
        const alert: Alert = {
          id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          timestamp: data.timestamp,
          robotId: data.robotId,
          ruleId: 'stability_threshold',
          message: data.status === 'error' 
            ? `熔池稳定性严重异常: ${data.stability}%` 
            : `熔池稳定性下降: ${data.stability}%`,
          severity: data.status === 'error' ? 'critical' : 'warning',
          acknowledged: false,
          value: data.stability,
          threshold: 60,
        };
        state.addAlertData(alert);
        addAlert(alert);
      }
    });
  }, 500);

  weldPointInterval = setInterval(() => {
    const state = useMonitoringStore.getState();
    if (!state.isRunning) return;

    const point = generateWeldPoint();
    state.addWeldPointData(point);
    addWeldPoint(point);
  }, 3000);
}

export function stopDataSimulation() {
  if (monitoringInterval) {
    clearInterval(monitoringInterval);
    monitoringInterval = null;
  }
  if (weldPointInterval) {
    clearInterval(weldPointInterval);
    weldPointInterval = null;
  }
  useMonitoringStore.getState().stopMonitoring();
}
