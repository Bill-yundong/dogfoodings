import { writable, derived, type Readable, type Writable } from 'svelte/store';
import type { PantographContactState, TrackGeometryParameter, TrajectoryPoint, SystemStatus, Alert } from '../types';
import { indexeddb } from './indexeddb';
import { systemCoordination } from './systemCoordination';

function createPantographStore() {
  const { subscribe, update } = writable<PantographContactState[]>([]);

  return {
    subscribe,
    add: async (state: PantographContactState) => {
      update((states) => {
        const newStates = [...states, state].slice(-100);
        return newStates;
      });

      try {
        await indexeddb.addPantographState(state);
        await systemCoordination.synchronizeDisplacementData(state.trainId, state);
      } catch (error) {
        console.error('Error storing pantograph state:', error);
      }
    },
    clear: () => update(() => [])
  };
}

function createTrackStore() {
  const { subscribe, update } = writable<TrackGeometryParameter[]>([]);

  return {
    subscribe,
    add: async (param: TrackGeometryParameter) => {
      update((params) => {
        const newParams = [...params, param].slice(-200);
        return newParams;
      });

      try {
        await indexeddb.addTrackParameter(param);
      } catch (error) {
        console.error('Error storing track parameter:', error);
      }
    },
    addBatch: async (params: TrackGeometryParameter[]) => {
      update((existing) => {
        const newParams = [...existing, ...params].slice(-500);
        return newParams;
      });

      try {
        await indexeddb.addTrackParameters(params);
      } catch (error) {
        console.error('Error storing batch track parameters:', error);
      }
    },
    clear: () => update(() => [])
  };
}

function createTrajectoryStore() {
  const { subscribe, update, set } = writable<TrajectoryPoint[]>([]);

  return {
    subscribe,
    add: async (point: TrajectoryPoint) => {
      update((points) => {
        const newPoints = [...points, point].slice(-500);
        return newPoints;
      });

      try {
        await indexeddb.addTrajectoryPoint(point);
      } catch (error) {
        console.error('Error storing trajectory point:', error);
      }
    },
    clear: () => set([])
  };
}

function createAlertStore() {
  const { subscribe, update } = writable<Alert[]>([]);

  return {
    subscribe,
    add: (alert: Alert) => {
      update((alerts) => {
        const newAlerts = [alert, ...alerts].slice(-100);
        return newAlerts;
      });
    },
    acknowledge: (id: string) => {
      update((alerts) =>
        alerts.map((a) => (a.id === id ? { ...a, acknowledged: true } : a))
      );
    },
    clear: () => update(() => [])
  };
}

function createSystemStatusStore() {
  const { subscribe, update } = writable<SystemStatus>(systemCoordination.getSystemStatus());

  return {
    subscribe,
    refresh: async () => {
      const status = systemCoordination.getSystemStatus();
      status.databaseStatus.cacheUsage = await indexeddb.getDatabaseUsage();
      update(() => status);
    }
  };
}

export const pantographStates = createPantographStore();
export const trackParameters = createTrackStore();
export const trajectoryPoints = createTrajectoryStore();
export const alerts = createAlertStore();
export const systemStatus = createSystemStatusStore();
export const isMonitoring = writable(false);
export const currentTrainId = writable('TRAIN-001');

export const latestPantographState: Readable<PantographContactState | null> = derived(
  pantographStates,
  ($states) => $states.length > 0 ? $states[$states.length - 1] : null
);

export const latestTrackParameter: Readable<TrackGeometryParameter | null> = derived(
  trackParameters,
  ($params) => $params.length > 0 ? $params[$params.length - 1] : null
);

export const unacknowledgedAlerts: Readable<Alert[]> = derived(
  alerts,
  ($alerts) => $alerts.filter((a) => !a.acknowledged)
);

export const criticalAlerts: Readable<Alert[]> = derived(
  alerts,
  ($alerts) => $alerts.filter((a) => a.level === 'critical' || a.level === 'emergency')
);
