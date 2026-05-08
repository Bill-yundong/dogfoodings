import { useState, useCallback, useEffect } from 'react';
import { TimeSlot } from '../types';
import { trafficSystem } from '../coordination/greenWave';

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;
const CELL_SIZE = 5;

export function useGreenWaveCoordination() {
  const [timeSlot, setTimeSlot] = useState(TimeSlot.MIDDAY);

  const initializeCoordination = useCallback((initialTimeSlot = TimeSlot.MIDDAY) => {
    trafficSystem.reset();
    
    const centerX = Math.floor(CANVAS_WIDTH / CELL_SIZE / 2);
    const centerY = Math.floor(CANVAS_HEIGHT / CELL_SIZE / 2);
    
    trafficSystem.addRoadsideDevice('device_1', 'int_1', { x: centerX, y: centerY });
    
    const plan = createPlanForTimeSlot(initialTimeSlot);
    trafficSystem.activatePlan(plan.id);
    trafficSystem.syncDevices();
    
    setTimeSlot(initialTimeSlot);
  }, []);

  const createPlanForTimeSlot = useCallback((targetTimeSlot) => {
    const configs = {
      [TimeSlot.MORNING_PEAK]: { greenTimeNS: 35, greenTimeEW: 20 },
      [TimeSlot.MIDDAY]: { greenTimeNS: 30, greenTimeEW: 25 },
      [TimeSlot.EVENING_PEAK]: { greenTimeNS: 20, greenTimeEW: 35 },
      [TimeSlot.NIGHT]: { greenTimeNS: 25, greenTimeEW: 25 }
    };
    const config = configs[targetTimeSlot];
    
    return trafficSystem.createGreenWavePlan(
      `green_wave_${targetTimeSlot}`,
      [{
        intersectionId: 'int_1',
        greenTimeNS: config.greenTimeNS,
        greenTimeEW: config.greenTimeEW
      }],
      targetTimeSlot
    );
  }, []);

  const changeTimeSlot = useCallback((newTimeSlot) => {
    setTimeSlot(newTimeSlot);
    
    const plan = createPlanForTimeSlot(newTimeSlot);
    trafficSystem.activatePlan(plan.id);
    trafficSystem.syncDevices();
  }, [createPlanForTimeSlot]);

  useEffect(() => {
    return () => {
      trafficSystem.stopAutoSync();
    };
  }, []);

  return {
    timeSlot,
    setTimeSlot,
    initializeCoordination,
    changeTimeSlot,
    createPlanForTimeSlot,
    trafficSystem
  };
}
