import { createSignal, createRoot } from 'solid-js';
import {
  EnergyStation,
  EnergyBalance,
  SyncStatus,
  WeatherData,
  WeatherType,
  OperationalSnapshot,
} from '../domain/types/energy';
import { DEFAULT_STATIONS, DEFAULT_DEMAND, SYNC_CONFIG } from '../domain/constants/energy';
import { energySolverService } from '../services/EnergySolverService';
import { weatherService } from '../services/WeatherService';
import { carbonService } from '../services/CarbonService';
import { snapshotService } from '../services/SnapshotService';

export function createEnergyStore() {
  const [stations, setStations] = createSignal<EnergyStation[]>([...DEFAULT_STATIONS]);
  const [demand, setDemand] = createSignal<EnergyBalance['demand']>({ ...DEFAULT_DEMAND });
  const [energyBalance, setEnergyBalance] = createSignal<EnergyBalance>({
    timestamp: Date.now(),
    supply: { cooling: 1060, heating: 860, electricity: 1580 },
    demand: { ...DEFAULT_DEMAND },
    surplus: { cooling: 160, heating: 110, electricity: 130 },
    deficit: { cooling: 0, heating: 0, electricity: 0 },
  });
  const [syncStatuses, setSyncStatuses] = createSignal<SyncStatus[]>(
    DEFAULT_STATIONS.map((s) => ({
      stationId: s.id,
      lastSync: Date.now(),
      latency: Math.floor(Math.random() * (SYNC_CONFIG.LATENCY_MAX - SYNC_CONFIG.LATENCY_MIN) + SYNC_CONFIG.LATENCY_MIN),
      status: 'synced' as const,
    }))
  );
  const [weatherData, setWeatherData] = createSignal<WeatherData>(
    weatherService.createWeatherData('typical_summer')
  );
  const [isOptimizing, setIsOptimizing] = createSignal(false);
  const [optimizationScore, setOptimizationScore] = createSignal(0.91);
  const [carbonEmission, setCarbonEmission] = createSignal(268.5);
  const [currentWeatherType, setCurrentWeatherType] = createSignal<WeatherType>('typical_summer');
  const [historyData, setHistoryData] = createSignal<
    { time: string; cooling: number; heating: number; electricity: number }[]
  >([]);
  const [snapshots, setSnapshots] = createSignal<OperationalSnapshot[]>([]);

  let dataSyncInterval: ReturnType<typeof setInterval> | null = null;
  let optimizationInterval: ReturnType<typeof setInterval> | null = null;
  let weatherUpdateInterval: ReturnType<typeof setInterval> | null = null;
  let historyUpdateInterval: ReturnType<typeof setInterval> | null = null;

  const updateEnergyBalance = (currentStations: EnergyStation[]) => {
    const totalSupply = currentStations.reduce(
      (sum, s) => ({
        cooling: sum.cooling + s.currentOutput.cooling,
        heating: sum.heating + s.currentOutput.heating,
        electricity: sum.electricity + s.currentOutput.electricity,
      }),
      { cooling: 0, heating: 0, electricity: 0 }
    );

    const currentDemand = demand();
    setEnergyBalance({
      timestamp: Date.now(),
      supply: totalSupply,
      demand: currentDemand,
      surplus: {
        cooling: Math.max(0, totalSupply.cooling - currentDemand.cooling),
        heating: Math.max(0, totalSupply.heating - currentDemand.heating),
        electricity: Math.max(0, totalSupply.electricity - currentDemand.electricity),
      },
      deficit: {
        cooling: Math.max(0, currentDemand.cooling - totalSupply.cooling),
        heating: Math.max(0, currentDemand.heating - totalSupply.heating),
        electricity: Math.max(0, currentDemand.electricity - totalSupply.electricity),
      },
    });
  };

  const startRealTimeSync = () => {
    dataSyncInterval = setInterval(() => {
      const updatedStations = stations().map((station) => {
        if (station.status !== 'online') return station;

        const outputVariation = {
          cooling: (Math.random() - 0.5) * 20,
          heating: (Math.random() - 0.5) * 15,
          electricity: (Math.random() - 0.5) * 25,
        };

        const newOutput = {
          cooling: Math.max(0, Math.min(station.capacity.cooling, station.currentOutput.cooling + outputVariation.cooling)),
          heating: Math.max(0, Math.min(station.capacity.heating, station.currentOutput.heating + outputVariation.heating)),
          electricity: Math.max(0, Math.min(station.capacity.electricity, station.currentOutput.electricity + outputVariation.electricity)),
        };

        return { ...station, currentOutput: newOutput };
      });

      setStations(updatedStations);
      updateEnergyBalance(updatedStations);

      setSyncStatuses((prev) =>
        prev.map((status) => ({
          ...status,
          lastSync: Date.now(),
          latency: Math.floor(
            Math.random() * (SYNC_CONFIG.LATENCY_MAX - SYNC_CONFIG.LATENCY_MIN) + SYNC_CONFIG.LATENCY_MIN
          ),
          status: (Math.random() > 0.05 ? 'synced' : 'syncing') as const,
        }))
      );
    }, SYNC_CONFIG.DATA_SYNC_INTERVAL);

    optimizationInterval = setInterval(async () => {
      await runOptimization();
    }, SYNC_CONFIG.OPTIMIZATION_INTERVAL);

    weatherUpdateInterval = setInterval(() => {
      setWeatherData((prev) => weatherService.simulateWeatherUpdate(prev));
    }, SYNC_CONFIG.WEATHER_UPDATE_INTERVAL);

    historyUpdateInterval = setInterval(() => {
      const now = new Date();
      const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
      const balance = energyBalance();
      setHistoryData((prev) => {
        const newData = [
          ...prev,
          {
            time: timeStr,
            cooling: balance.supply.cooling,
            heating: balance.supply.heating,
            electricity: balance.supply.electricity,
          },
        ];
        return newData.slice(-24);
      });
    }, SYNC_CONFIG.HISTORY_UPDATE_INTERVAL);

    for (let i = 0; i < 12; i++) {
      const time = new Date(Date.now() - (12 - i) * 60000);
      const timeStr = `${time.getHours().toString().padStart(2, '0')}:${time.getMinutes().toString().padStart(2, '0')}`;
      setHistoryData((prev) => [
        ...prev,
        {
          time: timeStr,
          cooling: 1000 + Math.random() * 100,
          heating: 800 + Math.random() * 80,
          electricity: 1500 + Math.random() * 150,
        },
      ]);
    }
  };

  const stopRealTimeSync = () => {
    if (dataSyncInterval) clearInterval(dataSyncInterval);
    if (optimizationInterval) clearInterval(optimizationInterval);
    if (weatherUpdateInterval) clearInterval(weatherUpdateInterval);
    if (historyUpdateInterval) clearInterval(historyUpdateInterval);
  };

  const runOptimization = async () => {
    setIsOptimizing(true);
    try {
      const weatherFactors = weatherService.calculateWeatherFactors(
        weatherData().temperature,
        weatherData().solarRadiation,
        weatherData().windSpeed
      );

      const result = await energySolverService.solveAsync(stations(), demand(), weatherFactors);

      setStations((prev) =>
        prev.map((station) => {
          const allocation = result.stationAllocations.find((a) => a.stationId === station.id);
          if (allocation) {
            return { ...station, currentOutput: allocation.output };
          }
          return station;
        })
      );

      setOptimizationScore(result.efficiency);
      setCarbonEmission(carbonService.calculateEmission(result.optimalOutput, result.efficiency));

      const snapshot: Omit<OperationalSnapshot, 'id'> = {
        weatherType: currentWeatherType(),
        timestamp: Date.now(),
        weatherData: weatherData(),
        energyBalance: energyBalance(),
        stations: stations(),
        optimizationScore: result.efficiency,
        carbonEmission: carbonService.calculateEmission(result.optimalOutput, result.efficiency),
      };
      await snapshotService.saveSnapshot(snapshot);
    } finally {
      setIsOptimizing(false);
    }
  };

  const loadSnapshot = async (snapshot: OperationalSnapshot) => {
    setWeatherData(snapshot.weatherData);
    setEnergyBalance(snapshot.energyBalance);
    setStations(snapshot.stations);
    setOptimizationScore(snapshot.optimizationScore);
    setCarbonEmission(snapshot.carbonEmission);
    setCurrentWeatherType(snapshot.weatherType);
  };

  const toggleStationStatus = (stationId: string) => {
    setStations((prev) =>
      prev.map((station) => {
        if (station.id === stationId) {
          const newStatus = station.status === 'online' ? 'offline' : 'online';
          return {
            ...station,
            status: newStatus,
            currentOutput:
              newStatus === 'offline' ? { cooling: 0, heating: 0, electricity: 0 } : station.currentOutput,
          };
        }
        return station;
      })
    );
  };

  const loadSnapshots = async () => {
    const latest = await snapshotService.getLatestSnapshots(10);
    setSnapshots(latest);
  };

  return {
    stations,
    demand,
    setDemand,
    energyBalance,
    syncStatuses,
    weatherData,
    isOptimizing,
    optimizationScore,
    carbonEmission,
    currentWeatherType,
    setCurrentWeatherType,
    historyData,
    snapshots,
    startRealTimeSync,
    stopRealTimeSync,
    runOptimization,
    loadSnapshot,
    toggleStationStatus,
    loadSnapshots,
  };
}

export const useEnergyStore = createRoot(createEnergyStore);
