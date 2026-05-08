import { useState, useEffect, useCallback, useRef } from 'react';
import { Direction, TimeSlot } from '../types';
import { CellularAutomata } from '../simulation/cellAutomata';
import { database } from '../services/database';

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;
const CELL_SIZE = 5;

export function useSimulation() {
  const simulationRef = useRef(null);
  const animationRef = useRef(null);
  const lastUpdateRef = useRef(Date.now());

  const [isRunning, setIsRunning] = useState(false);
  const [simulationSpeed, setSimulationSpeed] = useState(2);
  const [vehicleSpawnRate, setVehicleSpawnRate] = useState(15);
  const [stats, setStats] = useState({});
  const [timeStep, setTimeStep] = useState(0);
  const [initialized, setInitialized] = useState(false);

  const initializeSimulation = useCallback((timeSlot) => {
    const sim = new CellularAutomata(CANVAS_WIDTH, CANVAS_HEIGHT, CELL_SIZE);
    
    const centerX = Math.floor(CANVAS_WIDTH / CELL_SIZE / 2);
    const centerY = Math.floor(CANVAS_HEIGHT / CELL_SIZE / 2);
    
    const configs = {
      [TimeSlot.MORNING_PEAK]: { greenTimeNS: 35, greenTimeEW: 20 },
      [TimeSlot.MIDDAY]: { greenTimeNS: 30, greenTimeEW: 25 },
      [TimeSlot.EVENING_PEAK]: { greenTimeNS: 20, greenTimeEW: 35 },
      [TimeSlot.NIGHT]: { greenTimeNS: 25, greenTimeEW: 25 }
    };
    const config = configs[timeSlot] || configs[TimeSlot.MIDDAY];
    
    sim.addIntersection('int_1', centerX, centerY, {
      greenTimeNS: config.greenTimeNS,
      greenTimeEW: config.greenTimeEW,
      yellowTime: 3
    });
    
    simulationRef.current = sim;
    setInitialized(true);
    
    return sim;
  }, []);

  const spawnVehicles = useCallback(() => {
    if (!simulationRef.current) return;
    
    const sim = simulationRef.current;
    const gridW = sim.gridWidth;
    const gridH = sim.gridHeight;
    
    if (Math.random() < vehicleSpawnRate / 100) {
      const directions = [Direction.NORTH, Direction.SOUTH, Direction.EAST, Direction.WEST];
      const dir = directions[Math.floor(Math.random() * directions.length)];
      
      let x, y;
      switch (dir) {
        case Direction.NORTH:
          x = Math.floor(gridW / 2) + (Math.random() > 0.5 ? 1 : -1);
          y = gridH - 2;
          break;
        case Direction.SOUTH:
          x = Math.floor(gridW / 2) + (Math.random() > 0.5 ? 1 : -1);
          y = 1;
          break;
        case Direction.EAST:
          x = 1;
          y = Math.floor(gridH / 2) + (Math.random() > 0.5 ? 1 : -1);
          break;
        case Direction.WEST:
          x = gridW - 2;
          y = Math.floor(gridH / 2) + (Math.random() > 0.5 ? 1 : -1);
          break;
      }
      
      sim.addVehicle(x, y, dir);
    }
  }, [vehicleSpawnRate]);

  const simulationLoop = useCallback((timeSlot) => {
    if (!isRunning || !simulationRef.current) return;

    const now = Date.now();
    const delta = now - lastUpdateRef.current;
    const updateInterval = 1000 / simulationSpeed;

    if (delta >= updateInterval) {
      spawnVehicles();
      
      const newStats = simulationRef.current.step();
      setStats({
        ...newStats,
        vehiclesInNetwork: simulationRef.current.vehicles.length
      });
      setTimeStep(simulationRef.current.timeStep);
      
      lastUpdateRef.current = now;
      
      if (simulationRef.current.timeStep % 100 === 0) {
        database.saveSimulationResult({
          timeStep: simulationRef.current.timeStep,
          stats: newStats,
          timeSlot
        });
      }
    }

    animationRef.current = requestAnimationFrame(() => simulationLoop(timeSlot));
  }, [isRunning, simulationSpeed, spawnVehicles]);

  const updateIntersectionConfigs = useCallback((newTimeSlot) => {
    if (!simulationRef.current) return;
    
    const configs = {
      [TimeSlot.MORNING_PEAK]: { greenTimeNS: 35, greenTimeEW: 20 },
      [TimeSlot.MIDDAY]: { greenTimeNS: 30, greenTimeEW: 25 },
      [TimeSlot.EVENING_PEAK]: { greenTimeNS: 20, greenTimeEW: 35 },
      [TimeSlot.NIGHT]: { greenTimeNS: 25, greenTimeEW: 25 }
    };
    const config = configs[newTimeSlot];
    
    for (const intersection of simulationRef.current.intersections.values()) {
      intersection.config.greenTimeNS = config.greenTimeNS;
      intersection.config.greenTimeEW = config.greenTimeEW;
      intersection.totalCycle = config.greenTimeNS + config.greenTimeEW + 6;
    }
  }, []);

  const toggleRunning = useCallback(() => {
    setIsRunning(prev => !prev);
  }, []);

  const resetSimulation = useCallback((timeSlot) => {
    setIsRunning(false);
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    initializeSimulation(timeSlot);
    setTimeStep(0);
    setStats({});
  }, [initializeSimulation]);

  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  return {
    simulationRef,
    isRunning,
    simulationSpeed,
    vehicleSpawnRate,
    stats,
    timeStep,
    initialized,
    setSimulationSpeed,
    setVehicleSpawnRate,
    initializeSimulation,
    simulationLoop,
    toggleRunning,
    resetSimulation,
    updateIntersectionConfigs
  };
}
