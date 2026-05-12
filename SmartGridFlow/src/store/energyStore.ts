import { createSignal, createEffect, onCleanup } from 'solid-js';
import { EnergyStation, EnergyBalance, SyncStatus, WeatherData, OperationalSnapshot, WeatherType } from '../types/energy';
import { energyFlowSolver, calculateWeatherFactors, calculateCarbonEmission } from '../utils/energyFlowSolver';
import { energyDB } from '../utils/indexedDB';

function createEnergyStore() {
  const [stations, setStations] = createSignal<EnergyStation[]>([
    {
      id: 'station-1',
      name: '北区能源站',
      location: { lat: 39.92, lng: 116.46 },
      capacity: { cooling: 500, heating: 400, electricity: 700 },
      currentOutput: { cooling: 420, heating: 320, electricity: 620 },
      efficiency: { cooling: 0.85, heating: 0.82, electricity: 0.91 },
      status: 'online',
    },
    {
      id: 'station-2',
      name: '南区能源站',
      location: { lat: 39.88, lng: 116.42 },
      capacity: { cooling: 400, heating: 350, electricity: 600 },
      currentOutput: { cooling: 360, heating: 300, electricity: 540 },
      efficiency: { cooling: 0.88, heating: 0.85, electricity: 0.93 },
      status: 'online',
    },
    {
      id: 'station-3',
      name: '东区能源站',
      location: { lat: 39.90, lng: 116.50 },
      capacity: { cooling: 350, heating: 300, electricity: 500 },
      currentOutput: { cooling: 280, heating: 240, electricity: 420 },
      efficiency: { cooling: 0.82, heating: 0.80, electricity: 0.88 },
      status: 'online',
    },
  ]);

  const [demand, setDemand] = createSignal({ cooling: 900, heating: 750, electricity: 1450 });

  const [energyBalance, setEnergyBalance] = createSignal<EnergyBalance>({
    timestamp: Date.now(),
    supply: { cooling: 1060, heating: 860, electricity: 1580 },
    demand: { cooling: 900, heating: 750, electricity: 1450 },
    surplus: { cooling: 160, heating: 110, electricity: 130 },
    deficit: { cooling: 0, heating: 0, electricity: 0 },
  });

  const [syncStatuses, setSyncStatuses] = createSignal<SyncStatus[]>([
    { stationId: 'station-1', lastSync: Date.now(), latency: 45, status: 'synced' },
    { stationId: 'station-2', lastSync: Date.now(), latency: 52, status: 'synced' },
    { stationId: 'station-3', lastSync: Date.now(), latency: 38, status: 'synced' },
  ]);

  const [weatherData, setWeatherData] = createSignal<WeatherData>({
    temperature: 28,
    humidity: 60,
    solarRadiation: 720,
    windSpeed: 3.2,
    timestamp: Date.now(),
  });

  const [isOptimizing, setIsOptimizing] = createSignal(false);
  const [optimizationScore, setOptimizationScore] = createSignal(0.91);
  const [carbonEmission, setCarbonEmission] = createSignal(268.5);
  const [currentWeatherType, setCurrentWeatherType] = createSignal<WeatherType>('typical_summer');
  const [historyData, setHistoryData] = createSignal<{ time: string; cooling: number; heating: number; electricity: number }[]>([]);

  let syncInterval: ReturnType<typeof setInterval> | null = null;
  let optimizationInterval: ReturnType<typeof setInterval> | null = null;
  let weatherInterval: ReturnType<typeof setInterval> | null = null;
  let historyUpdateInterval: ReturnType<typeof setInterval> | null = null;

  const startRealTimeSync = () => {
    syncInterval = setInterval(async () => {
      const updatedStations = stations().map(station => {
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

      const totalSupply = updatedStations.reduce(
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

      setSyncStatuses(prev => prev.map(status => ({
        ...status,
        lastSync: Date.now(),
        latency: Math.floor(30 + Math.random() * 40),
        status: Math.random() > 0.05 ? 'synced' : 'syncing' as const,
      })));
    }, 2000);

    optimizationInterval = setInterval(async () => {
      await runOptimization();
    }, 10000);

    weatherInterval = setInterval(() => {
      setWeatherData(prev => ({
        ...prev,
        temperature: prev.temperature + (Math.random() - 0.5) * 0.5,
        humidity: Math.max(30, Math.min(80, prev.humidity + (Math.random() - 0.5) * 2)),
        solarRadiation: Math.max(100, Math.min(1000, prev.solarRadiation + (Math.random() - 0.5) * 30)),
        windSpeed: Math.max(1, Math.min(10, prev.windSpeed + (Math.random() - 0.5) * 0.5)),
        timestamp: Date.now(),
      }));
    }, 5000);

    historyUpdateInterval = setInterval(() => {
      const now = new Date();
      const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
      const balance = energyBalance();
      setHistoryData(prev => {
        const newData = [...prev, {
          time: timeStr,
          cooling: balance.supply.cooling,
          heating: balance.supply.heating,
          electricity: balance.supply.electricity,
        }];
        return newData.slice(-24);
      });
    }, 60000);

    for (let i = 0; i < 12; i++) {
      const time = new Date(Date.now() - (12 - i) * 60000);
      const timeStr = `${time.getHours().toString().padStart(2, '0')}:${time.getMinutes().toString().padStart(2, '0')}`;
      setHistoryData(prev => [...prev, {
        time: timeStr,
        cooling: 1000 + Math.random() * 100,
        heating: 800 + Math.random() * 80,
        electricity: 1500 + Math.random() * 150,
      }]);
    }
  };

  const stopRealTimeSync = () => {
    if (syncInterval) clearInterval(syncInterval);
    if (optimizationInterval) clearInterval(optimizationInterval);
    if (weatherInterval) clearInterval(weatherInterval);
    if (historyUpdateInterval) clearInterval(historyUpdateInterval);
  };

  const runOptimization = async () => {
    setIsOptimizing(true);
    try {
      const weatherFactors = calculateWeatherFactors(
        weatherData().temperature,
        weatherData().solarRadiation,
        weatherData().windSpeed
      );

      const result = await energyFlowSolver.solveAsync(
        stations(),
        demand(),
        weatherFactors
      );

      setStations(prev => prev.map(station => {
        const allocation = result.stationAllocations.find(a => a.stationId === station.id);
        if (allocation) {
          return { ...station, currentOutput: allocation.output };
        }
        return station;
      }));

      setOptimizationScore(result.efficiency);
      setCarbonEmission(calculateCarbonEmission(result.optimalOutput, result.efficiency));

      const snapshot: Omit<OperationalSnapshot, 'id'> = {
        weatherType: currentWeatherType(),
        timestamp: Date.now(),
        weatherData: weatherData(),
        energyBalance: energyBalance(),
        stations: stations(),
        optimizationScore: result.efficiency,
        carbonEmission: calculateCarbonEmission(result.optimalOutput, result.efficiency),
      };
      await energyDB.saveSnapshot(snapshot);

    } catch (error) {
      console.error('Optimization failed:', error);
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
    setStations(prev => prev.map(station => {
      if (station.id === stationId) {
        const newStatus = station.status === 'online' ? 'offline' : 'online';
        return {
          ...station,
          status: newStatus,
          currentOutput: newStatus === 'offline' ? { cooling: 0, heating: 0, electricity: 0 } : station.currentOutput,
        };
      }
      return station;
    }));
  };

  onCleanup(() => {
    stopRealTimeSync();
  });

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
    startRealTimeSync,
    stopRealTimeSync,
    runOptimization,
    loadSnapshot,
    toggleStationStatus,
  };
}

export const energyStore = createEnergyStore();
