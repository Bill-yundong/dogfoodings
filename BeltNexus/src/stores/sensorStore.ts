import { createStore } from 'solid-js/store';
import type { SensorData, FiberSensor } from '@/types';

interface SensorStoreState {
  sensors: FiberSensor[];
  recentData: Map<string, SensorData[]>;
  latestData: Map<string, SensorData>;
  isStreaming: boolean;
}

const initialState: SensorStoreState = {
  sensors: [],
  recentData: new Map(),
  latestData: new Map(),
  isStreaming: false,
};

export const [sensorState, setSensorState] = createStore<SensorStoreState>(initialState);

export function setSensors(sensors: FiberSensor[]) {
  setSensorState('sensors', sensors);
}

export function addSensorData(data: SensorData) {
  setSensorState('latestData', (prev) => {
    const next = new Map(prev);
    next.set(data.sensorId, data);
    return next;
  });
  
  setSensorState('recentData', (prev) => {
    const next = new Map(prev);
    const arr = next.get(data.sensorId) || [];
    arr.push(data);
    if (arr.length > 100) {
      arr.shift();
    }
    next.set(data.sensorId, arr);
    return next;
  });
}

export function addSensorDataBatch(data: SensorData[]) {
  data.forEach((d) => addSensorData(d));
}

export function setStreaming(streaming: boolean) {
  setSensorState('isStreaming', streaming);
}

export function getSensorRecentData(sensorId: string): SensorData[] {
  return sensorState.recentData.get(sensorId) || [];
}

export function getSensorLatestData(sensorId: string): SensorData | undefined {
  return sensorState.latestData.get(sensorId);
}
