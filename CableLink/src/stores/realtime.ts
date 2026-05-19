import { writable, get, derived, type Readable, type Writable } from 'svelte/store';
import type { TemperaturePoint, ThermalFieldData, PredictionResult, CableParameters } from '@/types';
import { calculateTemperatureDistribution } from '@/engine/thermal';
import { insertSensorDataBatch } from '@/db/sensor';

export interface RealtimeStore {
  sensorData: Writable<TemperaturePoint[]>;
  thermalField: Writable<ThermalFieldData | null>;
  latestPrediction: Writable<PredictionResult | null>;
  cableParams: Writable<CableParameters>;
  systemStatus: Writable<'connected' | 'disconnected' | 'error'>;
  updateRate: Writable<number>;
  maxTemperature: Readable<number>;
  avgTemperature: Readable<number>;
  avgCurrent: Readable<number>;
  hotspotLocation: Readable<{ distance: number; temperature: number } | null>;
  setUpdateRate: (rate: number) => void;
  setCableParams: (params: Partial<CableParameters>) => void;
  destroy: () => void;
}

function createRealtimeStore(): RealtimeStore {
  const sensorData = writable<TemperaturePoint[]>([]);
  const thermalField = writable<ThermalFieldData | null>(null);
  const latestPrediction = writable<PredictionResult | null>(null);
  const cableParams = writable<CableParameters>({
    id: 'cable-001',
    name: '跨海能源链路A段',
    length: 5000,
    maxCurrent: 1200,
    maxTemperature: 90,
    thermalResistance: 0.35,
    ambientTemperature: 12,
    conductorResistance: 0.02,
    dielectricLoss: 0.001
  });
  const systemStatus = writable<'connected' | 'disconnected' | 'error'>('connected');
  const updateRate = writable(1000);

  const maxTemperature = derived(sensorData, $data => {
    if ($data.length === 0) return 0;
    return Math.max(...$data.map(d => d.temperature));
  });

  const avgTemperature = derived(sensorData, $data => {
    if ($data.length === 0) return 0;
    return $data.reduce((sum, d) => sum + d.temperature, 0) / $data.length;
  });

  const avgCurrent = derived(sensorData, $data => {
    if ($data.length === 0) return 0;
    return $data.reduce((sum, d) => sum + d.current, 0) / $data.length;
  });

  const hotspotLocation = derived(sensorData, $data => {
    if ($data.length === 0) return null;
    const maxPoint = $data.reduce((max, d) => d.temperature > max.temperature ? d : max);
    return {
      distance: maxPoint.position.distance,
      temperature: maxPoint.temperature
    };
  });

  let sensorCount = 20;
  let animationFrameId: number | null = null;
  let lastUpdateTime = 0;

  function initializeSensorData(): void {
    const now = Date.now();
    const data: TemperaturePoint[] = [];
    const params = get(cableParams);

    for (let i = 0; i < sensorCount; i++) {
      const distance = (i / (sensorCount - 1)) * params.length;
      const baseTemp = params.ambientTemperature + 25 + Math.sin(distance / 500) * 10;

      data.push({
        timestamp: now,
        sensorId: `SNS-${String(i + 1).padStart(3, '0')}`,
        position: {
          distance,
          depth: 50 + Math.sin(distance / 800) * 20
        },
        temperature: baseTemp + (Math.random() - 0.5) * 2,
        current: 800 + Math.sin(distance / 600) * 150 + (Math.random() - 0.5) * 50,
        voltage: 220 + (Math.random() - 0.5) * 5,
        ambientTemp: params.ambientTemperature + (Math.random() - 0.5) * 2
      });
    }

    sensorData.set(data);
    updateThermalField();
  }

  function startSimulation(): void {
    const update = () => {
      const now = Date.now();
      if (now - lastUpdateTime >= get(updateRate)) {
        updateSensorData();
        lastUpdateTime = now;
      }
      animationFrameId = requestAnimationFrame(update);
    };
    animationFrameId = requestAnimationFrame(update);
  }

  function updateSensorData(): void {
    const now = Date.now();
    const timeFactor = now / 10000;
    const params = get(cableParams);
    const currentData = get(sensorData);

    const newData = currentData.map((point, i) => {
      const distance = point.position.distance;
      const loadVariation = 0.8 + 0.2 * Math.sin(timeFactor + distance / 1000);
      const baseCurrent = 800 + Math.sin(timeFactor * 0.5 + distance / 600) * 200;
      const current = baseCurrent * loadVariation;

      const resistiveHeating = (current / 1000) ** 2 * params.conductorResistance * 100;
      const baseTemp = params.ambientTemperature + 20 + resistiveHeating + Math.sin(timeFactor + distance / 400) * 8;
      const noise = (Math.random() - 0.5) * 1.5;

      const hotspotEffect = i === 10 || i === 11 ? 8 + Math.sin(timeFactor * 0.8) * 3 : 0;

      return {
        ...point,
        timestamp: now,
        temperature: Math.max(params.ambientTemperature, baseTemp + noise + hotspotEffect),
        current,
        voltage: 220 + (Math.random() - 0.5) * 3
      };
    });

    sensorData.set(newData);
    updateThermalField();

    if (Math.random() < 0.1) {
      persistData();
    }
  }

  function updateThermalField(): void {
    const field = calculateTemperatureDistribution(get(sensorData), get(cableParams), 0.1);
    thermalField.set(field);
  }

  async function persistData(): Promise<void> {
    try {
      await insertSensorDataBatch(get(sensorData));
    } catch (e) {
      console.warn('Failed to persist sensor data:', e);
    }
  }

  function setUpdateRateFunc(rate: number): void {
    updateRate.set(Math.max(100, Math.min(5000, rate)));
  }

  function setCableParamsFunc(params: Partial<CableParameters>): void {
    cableParams.update(current => ({ ...current, ...params }));
  }

  function destroyFunc(): void {
    if (animationFrameId !== null) {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
    }
  }

  initializeSensorData();
  startSimulation();

  return {
    sensorData,
    thermalField,
    latestPrediction,
    cableParams,
    systemStatus,
    updateRate,
    maxTemperature,
    avgTemperature,
    avgCurrent,
    hotspotLocation,
    setUpdateRate: setUpdateRateFunc,
    setCableParams: setCableParamsFunc,
    destroy: destroyFunc
  };
}

export const realtimeStore = createRealtimeStore();
