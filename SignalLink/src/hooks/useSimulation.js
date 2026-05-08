import { useState, useEffect, useCallback, useRef } from 'react';
import { Direction, TimeSlot } from '../types';
import { CellularAutomata } from '../simulation/cellAutomata';
import { database } from '../services/database';

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;
const CELL_SIZE = 5;
const INTERSECTION_COUNT = 4;

export function useSimulation() {
  const simulationRef = useRef(null);
  const animationRef = useRef(null);
  const lastUpdateRef = useRef(Date.now());
  const intersectionConfigsRef = useRef([]);

  const [isRunning, setIsRunning] = useState(false);
  const [simulationSpeed, setSimulationSpeed] = useState(2);
  const [vehicleSpawnRate, setVehicleSpawnRate] = useState(15);
  const [stats, setStats] = useState({});
  const [timeStep, setTimeStep] = useState(0);
  const [initialized, setInitialized] = useState(false);
  const [intersectionCount, setIntersectionCount] = useState(INTERSECTION_COUNT);

  const getIntersectionPositions = useCallback((count, gridW, gridH) => {
    const positions = [];
    const centerY = Math.floor(gridH / 2);
    const spacing = Math.floor(gridW / (count + 1));
    
    for (let i = 0; i < count; i++) {
      positions.push({
        x: spacing * (i + 1),
        y: centerY,
        id: `int_${i + 1}`,
        index: i
      });
    }
    return positions;
  }, []);

  const getTimeSlotConfig = useCallback((timeSlot) => {
    const configs = {
      [TimeSlot.MORNING_PEAK]: { greenTimeNS: 35, greenTimeEW: 20 },
      [TimeSlot.MIDDAY]: { greenTimeNS: 30, greenTimeEW: 25 },
      [TimeSlot.EVENING_PEAK]: { greenTimeNS: 20, greenTimeEW: 35 },
      [TimeSlot.NIGHT]: { greenTimeNS: 25, greenTimeEW: 25 }
    };
    return configs[timeSlot] || configs[TimeSlot.MIDDAY];
  }, []);

  const initializeSimulation = useCallback((timeSlot, count = INTERSECTION_COUNT) => {
    const sim = new CellularAutomata(CANVAS_WIDTH, CANVAS_HEIGHT, CELL_SIZE);
    const config = getTimeSlotConfig(timeSlot);
    const positions = getIntersectionPositions(count, sim.gridWidth, sim.gridHeight);
    
    const intersectionConfigs = positions.map((pos, index) => ({
      ...pos,
      greenTimeNS: config.greenTimeNS,
      greenTimeEW: config.greenTimeEW,
      offset: 0
    }));
    
    intersectionConfigsRef.current = intersectionConfigs;
    
    intersectionConfigs.forEach((config) => {
      sim.addIntersection(config.id, config.x, config.y, {
        greenTimeNS: config.greenTimeNS,
        greenTimeEW: config.greenTimeEW,
        yellowTime: 3,
        offset: config.offset
      });
    });
    
    simulationRef.current = sim;
    setIntersectionCount(count);
    setInitialized(true);
    
    return sim;
  }, [getIntersectionPositions, getTimeSlotConfig]);

  const applyGreenWaveOffsets = useCallback((offsets) => {
    if (!simulationRef.current) return;
    
    const sim = simulationRef.current;
    const configs = intersectionConfigsRef.current;
    
    offsets.forEach((offset, index) => {
      if (index < configs.length) {
        const intersection = sim.intersections.get(configs[index].id);
        if (intersection) {
          intersection.setOffset(offset);
          configs[index].offset = offset;
        }
      }
    });
  }, []);

  const spawnVehicles = useCallback(() => {
    if (!simulationRef.current) return;
    
    const sim = simulationRef.current;
    const gridW = sim.gridWidth;
    const gridH = sim.gridHeight;
    const configs = intersectionConfigsRef.current;
    
    if (Math.random() < vehicleSpawnRate / 100) {
      const eastProb = 0.6;
      const isEastbound = Math.random() < eastProb;
      const dir = isEastbound ? Direction.EAST : Direction.WEST;
      
      const centerY = Math.floor(gridH / 2);
      const laneOffset = Math.random() > 0.5 ? 1 : -1;
      
      let x, y;
      if (dir === Direction.EAST) {
        x = 1;
        y = centerY + laneOffset;
      } else {
        x = gridW - 2;
        y = centerY + laneOffset;
      }
      
      if (configs.length > 1) {
        sim.addVehicle(x, y, dir);
      }
    }
    
    if (Math.random() < (vehicleSpawnRate / 100) * 0.3) {
      const configs = intersectionConfigsRef.current;
      if (configs.length === 0) return;
      
      const randomInt = configs[Math.floor(Math.random() * configs.length)];
      const dir = Math.random() > 0.5 ? Direction.NORTH : Direction.SOUTH;
      
      let x, y;
      if (dir === Direction.NORTH) {
        x = randomInt.x + (Math.random() > 0.5 ? 1 : -1);
        y = gridH - 2;
      } else {
        x = randomInt.x + (Math.random() > 0.5 ? 1 : -1);
        y = 1;
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
        vehiclesInNetwork: simulationRef.current.vehicles.length,
        intersectionCount: intersectionConfigsRef.current.length
      });
      setTimeStep(simulationRef.current.timeStep);
      
      lastUpdateRef.current = now;
      
      if (simulationRef.current.timeStep % 100 === 0) {
        database.saveSimulationResult({
          timeStep: simulationRef.current.timeStep,
          stats: newStats,
          timeSlot,
          intersectionCount: intersectionConfigsRef.current.length
        });
      }
    }

    animationRef.current = requestAnimationFrame(() => simulationLoop(timeSlot));
  }, [isRunning, simulationSpeed, spawnVehicles]);

  const updateIntersectionConfigs = useCallback((newTimeSlot) => {
    if (!simulationRef.current) return;
    
    const config = getTimeSlotConfig(newTimeSlot);
    
    for (const intersection of simulationRef.current.intersections.values()) {
      intersection.config.greenTimeNS = config.greenTimeNS;
      intersection.config.greenTimeEW = config.greenTimeEW;
      const yellowTime = intersection.config.yellowTime || 3;
      const redTime = intersection.config.redTime || 3;
      intersection.totalCycle = config.greenTimeNS + config.greenTimeEW + 2 * yellowTime + 2 * redTime;
    }
  }, [getTimeSlotConfig]);

  const toggleRunning = useCallback(() => {
    setIsRunning(prev => !prev);
  }, []);

  const resetSimulation = useCallback((timeSlot, count = INTERSECTION_COUNT) => {
    setIsRunning(false);
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    initializeSimulation(timeSlot, count);
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
    intersectionCount,
    intersectionConfigs: intersectionConfigsRef.current,
    setSimulationSpeed,
    setVehicleSpawnRate,
    setIntersectionCount,
    initializeSimulation,
    simulationLoop,
    toggleRunning,
    resetSimulation,
    updateIntersectionConfigs,
    applyGreenWaveOffsets
  };
}
