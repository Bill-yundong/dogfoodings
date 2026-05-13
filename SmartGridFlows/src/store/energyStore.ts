import { createSignal, createEffect, onCleanup } from 'solid-js';
import type { EnergyStation, CommandCenterData, WeatherCondition, Snapshot } from '../types/energy';
import { snapshotDB } from '../utils/snapshotDB';
import { solveMultiEnergyFlow, applyOptimizations } from '../utils/multiEnergyFlow';

function generateInitialStations(): EnergyStation[] {
  return [
    {
      id: 'station-001',
      name: '东区能源站',
      location: { lat: 39.9042, lng: 116.4074 },
      balance: {
        cooling: { current: 450, target: 500, capacity: 800, efficiency: 0.85 },
        heating: { current: 320, target: 350, capacity: 600, efficiency: 0.88 },
        electricity: { current: 280, target: 300, capacity: 500, efficiency: 0.92, renewableRatio: 0.35 },
        timestamp: Date.now(),
      },
      status: 'normal',
      lastUpdate: Date.now(),
    },
    {
      id: 'station-002',
      name: '西区能源站',
      location: { lat: 39.9142, lng: 116.3974 },
      balance: {
        cooling: { current: 520, target: 550, capacity: 900, efficiency: 0.82 },
        heating: { current: 380, target: 400, capacity: 700, efficiency: 0.85 },
        electricity: { current: 350, target: 380, capacity: 600, efficiency: 0.90, renewableRatio: 0.42 },
        timestamp: Date.now(),
      },
      status: 'normal',
      lastUpdate: Date.now(),
    },
    {
      id: 'station-003',
      name: '南区能源站',
      location: { lat: 39.8942, lng: 116.4174 },
      balance: {
        cooling: { current: 480, target: 520, capacity: 850, efficiency: 0.80 },
        heating: { current: 350, target: 380, capacity: 650, efficiency: 0.86 },
        electricity: { current: 310, target: 340, capacity: 550, efficiency: 0.88, renewableRatio: 0.38 },
        timestamp: Date.now(),
      },
      status: 'warning',
      lastUpdate: Date.now(),
    },
    {
      id: 'station-004',
      name: '北区能源站',
      location: { lat: 39.9242, lng: 116.3874 },
      balance: {
        cooling: { current: 420, target: 480, capacity: 750, efficiency: 0.87 },
        heating: { current: 290, target: 320, capacity: 550, efficiency: 0.90 },
        electricity: { current: 260, target: 290, capacity: 480, efficiency: 0.94, renewableRatio: 0.45 },
        timestamp: Date.now(),
      },
      status: 'normal',
      lastUpdate: Date.now(),
    },
  ];
}

function getInitialWeather(): WeatherCondition {
  return {
    temperature: 28,
    humidity: 65,
    solarRadiation: 450,
    windSpeed: 3.5,
    timestamp: Date.now(),
  };
}

function calculateTotalBalance(stations: EnergyStation[]) {
  return {
    cooling: {
      current: stations.reduce((sum, s) => sum + s.balance.cooling.current, 0),
      target: stations.reduce((sum, s) => sum + s.balance.cooling.target, 0),
      capacity: stations.reduce((sum, s) => sum + s.balance.cooling.capacity, 0),
      efficiency: stations.reduce((sum, s) => sum + s.balance.cooling.efficiency, 0) / stations.length,
    },
    heating: {
      current: stations.reduce((sum, s) => sum + s.balance.heating.current, 0),
      target: stations.reduce((sum, s) => sum + s.balance.heating.target, 0),
      capacity: stations.reduce((sum, s) => sum + s.balance.heating.capacity, 0),
      efficiency: stations.reduce((sum, s) => sum + s.balance.heating.efficiency, 0) / stations.length,
    },
    electricity: {
      current: stations.reduce((sum, s) => sum + s.balance.electricity.current, 0),
      target: stations.reduce((sum, s) => sum + s.balance.electricity.target, 0),
      capacity: stations.reduce((sum, s) => sum + s.balance.electricity.capacity, 0),
      efficiency: stations.reduce((sum, s) => sum + s.balance.electricity.efficiency, 0) / stations.length,
      renewableRatio: stations.reduce((sum, s) => sum + s.balance.electricity.renewableRatio, 0) / stations.length,
    },
    timestamp: Date.now(),
  };
}

function calculateCarbonMetrics(stations: EnergyStation[]) {
  let totalEmission = 0;
  let baselineEmission = 0;

  stations.forEach(station => {
    const { cooling, heating, electricity } = station.balance;
    totalEmission += cooling.current * 0.12 + heating.current * 0.18 + electricity.current * 0.25 * (1 - electricity.renewableRatio);
    baselineEmission += cooling.current * 0.15 + heating.current * 0.22 + electricity.current * 0.35;
  });

  return {
    carbonEmission: totalEmission,
    carbonReduction: baselineEmission - totalEmission,
  };
}

function calculateEfficiencyScore(stations: EnergyStation[]): number {
  let totalScore = 0;
  stations.forEach(station => {
    const { cooling, heating, electricity } = station.balance;
    const loadUtilization = (cooling.current + heating.current + electricity.current) / (cooling.capacity + heating.capacity + electricity.capacity);
    const avgEfficiency = (cooling.efficiency + heating.efficiency + electricity.efficiency) / 3;
    totalScore += loadUtilization * avgEfficiency * 100;
  });
  return totalScore / stations.length;
}

function createEnergyStore() {
  const [stations, setStations] = createSignal<EnergyStation[]>(generateInitialStations());
  const [weather, setWeather] = createSignal<WeatherCondition>(getInitialWeather());
  const [isOptimizing, setIsOptimizing] = createSignal(false);
  const [lastOptimization, setLastOptimization] = createSignal<number | null>(null);

  const [commandCenterData, setCommandCenterData] = createSignal<CommandCenterData>(() => {
    const initialStations = generateInitialStations();
    const carbonMetrics = calculateCarbonMetrics(initialStations);
    return {
      stations: initialStations,
      totalBalance: calculateTotalBalance(initialStations),
      ...carbonMetrics,
      efficiencyScore: calculateEfficiencyScore(initialStations),
      lastAlignment: Date.now(),
    };
  });

  createEffect(() => {
    const currentStations = stations();
    const carbonMetrics = calculateCarbonMetrics(currentStations);
    setCommandCenterData({
      stations: currentStations,
      totalBalance: calculateTotalBalance(currentStations),
      ...carbonMetrics,
      efficiencyScore: calculateEfficiencyScore(currentStations),
      lastAlignment: Date.now(),
    });
  });

  async function alignData() {
    setStations(prev => prev.map(station => ({
      ...station,
      lastUpdate: Date.now(),
      balance: { ...station.balance, timestamp: Date.now() },
    })));
    setCommandCenterData(prev => ({ ...prev, lastAlignment: Date.now() }));
  }

  async function runOptimization() {
    setIsOptimizing(true);
    try {
      const result = await solveMultiEnergyFlow(stations(), weather());
      const optimizedStations = applyOptimizations(stations(), result.optimizations);
      setStations(optimizedStations);
      setLastOptimization(Date.now());
      return result;
    } finally {
      setIsOptimizing(false);
    }
  }

  function updateWeather(newWeather: Partial<WeatherCondition>) {
    setWeather(prev => ({ ...prev, ...newWeather, timestamp: Date.now() }));
  }

  function simulateDataFluctuation() {
    setStations(prev => prev.map(station => {
      const fluctuation = () => (Math.random() - 0.5) * 0.05;
      return {
        ...station,
        balance: {
          ...station.balance,
          cooling: {
            ...station.balance.cooling,
            current: Math.max(0, station.balance.cooling.current * (1 + fluctuation())),
          },
          heating: {
            ...station.balance.heating,
            current: Math.max(0, station.balance.heating.current * (1 + fluctuation())),
          },
          electricity: {
            ...station.balance.electricity,
            current: Math.max(0, station.balance.electricity.current * (1 + fluctuation())),
          },
          timestamp: Date.now(),
        },
        lastUpdate: Date.now(),
      };
    }));
  }

  async function saveCurrentSnapshot(weatherType: Snapshot['weatherType']): Promise<void> {
    const snapshot: Snapshot = {
      id: `snapshot-${Date.now()}`,
      weatherType,
      weather: weather(),
      commandCenterData: commandCenterData(),
      timestamp: Date.now(),
      createdAt: Date.now(),
    };
    await snapshotDB.saveSnapshot(snapshot);
    await snapshotDB.clearOldSnapshots(100);
  }

  let alignmentInterval: number | null = null;
  let fluctuationInterval: number | null = null;

  function startRealTimeAlignment(intervalMs: number = 5000) {
    if (alignmentInterval) clearInterval(alignmentInterval);
    alignmentInterval = window.setInterval(alignData, intervalMs);
  }

  function startDataSimulation(intervalMs: number = 3000) {
    if (fluctuationInterval) clearInterval(fluctuationInterval);
    fluctuationInterval = window.setInterval(simulateDataFluctuation, intervalMs);
  }

  function stopRealTimeAlignment() {
    if (alignmentInterval) {
      clearInterval(alignmentInterval);
      alignmentInterval = null;
    }
  }

  function stopDataSimulation() {
    if (fluctuationInterval) {
      clearInterval(fluctuationInterval);
      fluctuationInterval = null;
    }
  }

  onCleanup(() => {
    stopRealTimeAlignment();
    stopDataSimulation();
  });

  return {
    stations,
    weather,
    commandCenterData,
    isOptimizing,
    lastOptimization,
    alignData,
    runOptimization,
    updateWeather,
    saveCurrentSnapshot,
    startRealTimeAlignment,
    startDataSimulation,
    stopRealTimeAlignment,
    stopDataSimulation,
  };
}

export const energyStore = createEnergyStore();
