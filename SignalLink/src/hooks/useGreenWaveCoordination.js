import { useState, useCallback, useEffect } from 'react';
import { TimeSlot } from '../types';
import { trafficSystem } from '../coordination/greenWave';

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;
const CELL_SIZE = 5;
const INTERSECTION_COUNT = 4;

export function useGreenWaveCoordination() {
  const [timeSlot, setTimeSlot] = useState(TimeSlot.MIDDAY);
  const [activePlan, setActivePlan] = useState(null);

  const getIntersectionPositions = useCallback((count, gridW, gridH) => {
    const positions = [];
    const centerY = Math.floor(gridH / 2);
    const spacing = Math.floor(gridW / (count + 1));
    
    for (let i = 0; i < count; i++) {
      positions.push({
        x: spacing * (i + 1),
        y: centerY,
        id: `int_${i + 1}`,
        deviceId: `device_${i + 1}`,
        index: i
      });
    }
    return positions;
  }, []);

  const getTimeSlotConfig = useCallback((targetTimeSlot) => {
    const configs = {
      [TimeSlot.MORNING_PEAK]: { greenTimeNS: 35, greenTimeEW: 20, cycleLength: 120 },
      [TimeSlot.MIDDAY]: { greenTimeNS: 30, greenTimeEW: 25, cycleLength: 100 },
      [TimeSlot.EVENING_PEAK]: { greenTimeNS: 20, greenTimeEW: 35, cycleLength: 130 },
      [TimeSlot.NIGHT]: { greenTimeNS: 25, greenTimeEW: 25, cycleLength: 80 }
    };
    return configs[targetTimeSlot] || configs[TimeSlot.MIDDAY];
  }, []);

  const initializeCoordination = useCallback((initialTimeSlot = TimeSlot.MIDDAY, count = INTERSECTION_COUNT) => {
    trafficSystem.reset();
    
    const gridW = Math.floor(CANVAS_WIDTH / CELL_SIZE);
    const gridH = Math.floor(CANVAS_HEIGHT / CELL_SIZE);
    const positions = getIntersectionPositions(count, gridW, gridH);
    
    positions.forEach((pos) => {
      trafficSystem.addRoadsideDevice(pos.deviceId, pos.id, { x: pos.x, y: pos.y });
    });
    
    const plan = createPlanForTimeSlot(initialTimeSlot, count);
    const activatedPlan = trafficSystem.activatePlan(plan.id);
    trafficSystem.syncDevices();
    
    setActivePlan(activatedPlan);
    setTimeSlot(initialTimeSlot);
    
    return { plan: activatedPlan, positions };
  }, [getIntersectionPositions]);

  const createPlanForTimeSlot = useCallback((targetTimeSlot, count = INTERSECTION_COUNT) => {
    const config = getTimeSlotConfig(targetTimeSlot);
    const gridW = Math.floor(CANVAS_WIDTH / CELL_SIZE);
    const gridH = Math.floor(CANVAS_HEIGHT / CELL_SIZE);
    const positions = getIntersectionPositions(count, gridW, gridH);
    
    const intersections = positions.map((pos, index) => ({
      intersectionId: pos.id,
      greenTimeNS: config.greenTimeNS,
      greenTimeEW: config.greenTimeEW,
      index
    }));
    
    return trafficSystem.createGreenWavePlan(
      `green_wave_${targetTimeSlot}_${count}int`,
      intersections,
      targetTimeSlot
    );
  }, [getIntersectionPositions, getTimeSlotConfig]);

  const calculateGreenWaveOffsets = useCallback((plan, count = INTERSECTION_COUNT) => {
    if (!plan || !plan.intersections) {
      return Array(count).fill(0);
    }
    
    return plan.intersections.map(int => int.offset || 0);
  }, []);

  const changeTimeSlot = useCallback((newTimeSlot, count = INTERSECTION_COUNT) => {
    setTimeSlot(newTimeSlot);
    
    const plan = createPlanForTimeSlot(newTimeSlot, count);
    const activatedPlan = trafficSystem.activatePlan(plan.id);
    trafficSystem.syncDevices();
    
    setActivePlan(activatedPlan);
    
    const offsets = calculateGreenWaveOffsets(activatedPlan, count);
    
    return { plan: activatedPlan, offsets };
  }, [createPlanForTimeSlot, calculateGreenWaveOffsets]);

  const applyGreenWaveToSimulation = useCallback((applyOffsetsFn) => {
    if (!activePlan) return [];
    
    const offsets = calculateGreenWaveOffsets(activePlan);
    
    if (typeof applyOffsetsFn === 'function') {
      applyOffsetsFn(offsets);
    }
    
    return offsets;
  }, [activePlan, calculateGreenWaveOffsets]);

  useEffect(() => {
    return () => {
      trafficSystem.stopAutoSync();
    };
  }, []);

  return {
    timeSlot,
    setTimeSlot,
    activePlan,
    initializeCoordination,
    changeTimeSlot,
    createPlanForTimeSlot,
    calculateGreenWaveOffsets,
    applyGreenWaveToSimulation,
    trafficSystem
  };
}
