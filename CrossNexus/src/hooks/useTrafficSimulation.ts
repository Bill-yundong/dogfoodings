import { useState, useEffect, useCallback, useRef } from 'react';
import { TrafficSimulation } from '@/lib/simulation/cellular-automaton';
import { TrafficIndex, SimulationConfig, GridCell, Intersection } from '@/lib/types/traffic';

const DEFAULT_CONFIG: SimulationConfig = {
  gridWidth: 24,
  gridHeight: 20,
  vehicleDensity: 0.8,
  maxSpeed: 2,
  lightCycleDuration: 30,
  simulationSpeed: 500,
};

export function useTrafficSimulation() {
  const [simulation, setSimulation] = useState<TrafficSimulation | null>(null);
  const [trafficIndex, setTrafficIndex] = useState<TrafficIndex | null>(null);
  const [grid, setGrid] = useState<GridCell[][]>([]);
  const [intersections, setIntersections] = useState<Intersection[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [stepCount, setStepCount] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const initSimulation = useCallback((config?: Partial<SimulationConfig>) => {
    const simConfig = { ...DEFAULT_CONFIG, ...config };
    const newSimulation = new TrafficSimulation(simConfig);
    
    setSimulation(newSimulation);
    setGrid(newSimulation.getGrid());
    setIntersections(newSimulation.getIntersections());
    setTrafficIndex(newSimulation.getTrafficIndex());
    setStepCount(0);
  }, []);

  const updateSimulationState = useCallback((sim: TrafficSimulation) => {
    setGrid(sim.getGrid());
    setIntersections(sim.getIntersections());
    setTrafficIndex(sim.getTrafficIndex());
    setStepCount(sim.getStepCount());
  }, []);

  const step = useCallback(async () => {
    if (!simulation) return;
    
    await simulation.step();
    updateSimulationState(simulation);
  }, [simulation, updateSimulationState]);

  const start = useCallback(() => {
    if (!simulation || isRunning) return;
    
    simulation.start();
    setIsRunning(true);
    
    const config = simulation.getConfig();
    intervalRef.current = setInterval(async () => {
      if (simulation.getIsRunning()) {
        await simulation.step();
        updateSimulationState(simulation);
      }
    }, config.simulationSpeed);
  }, [simulation, isRunning, updateSimulationState]);

  const stop = useCallback(() => {
    if (!simulation) return;
    
    simulation.stop();
    setIsRunning(false);
    
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, [simulation]);

  const reset = useCallback((config?: Partial<SimulationConfig>) => {
    stop();
    initSimulation(config);
  }, [stop, initSimulation]);

  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return {
    simulation,
    trafficIndex,
    grid,
    intersections,
    isRunning,
    stepCount,
    initSimulation,
    step,
    start,
    stop,
    reset,
  };
}