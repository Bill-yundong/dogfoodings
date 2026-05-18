import type { SensorData, FiberSensor } from '@/types';
import { generateId } from '@/utils/math';

const BELT_LENGTH = 100;
const SENSOR_COUNT = 20;

export function createDefaultSensors(): FiberSensor[] {
  const sensors: FiberSensor[] = [];
  for (let i = 0; i < SENSOR_COUNT; i++) {
    sensors.push({
      id: `sensor_${i.toString().padStart(3, '0')}`,
      name: `光纤传感器 ${i + 1}`,
      channel: i,
      position: (i / (SENSOR_COUNT - 1)) * BELT_LENGTH,
      samplingRate: 100,
      isActive: true,
      lastCalibration: Date.now() - 86400000 * 7,
    });
  }
  return sensors;
}

let simulationFrame = 0;
let anomalyPosition = -1;
let anomalyTimer = 0;

export function generateSensorData(sensors: FiberSensor[]): SensorData[] {
  simulationFrame++;
  
  if (anomalyTimer > 0) {
    anomalyTimer--;
    if (anomalyTimer === 0) {
      anomalyPosition = -1;
    }
  }
  
  if (simulationFrame % 300 === 0 && Math.random() > 0.7) {
    anomalyPosition = Math.random() * BELT_LENGTH;
    anomalyTimer = 60;
  }
  
  const data: SensorData[] = [];
  const timestamp = Date.now();
  
  for (const sensor of sensors) {
    if (!sensor.isActive) continue;
    
    const baseTension = 50 + Math.sin(simulationFrame * 0.02 + sensor.position * 0.1) * 10;
    const baseTemp = 45 + Math.sin(simulationFrame * 0.01 + sensor.position * 0.05) * 5;
    const baseVibration = 2 + Math.sin(simulationFrame * 0.05 + sensor.position * 0.2) * 1;
    
    let tension = baseTension + (Math.random() - 0.5) * 3;
    let temperature = baseTemp + (Math.random() - 0.5) * 2;
    let vibration = baseVibration + (Math.random() - 0.5) * 0.5;
    let strain = tension * 0.002 + (Math.random() - 0.5) * 0.001;
    
    if (anomalyPosition >= 0) {
      const dist = Math.abs(sensor.position - anomalyPosition);
      if (dist < 10) {
        const factor = 1 - dist / 10;
        tension += 30 * factor;
        vibration += 4 * factor;
        temperature += 15 * factor;
      }
    }
    
    data.push({
      id: generateId(),
      timestamp,
      sensorId: sensor.id,
      position: sensor.position,
      tension: Math.max(0, tension),
      temperature: Math.max(0, temperature),
      vibration: Math.max(0, vibration),
      strain: Math.max(0, strain),
    });
  }
  
  return data;
}

export function interpolateTensionProfile(
  sensorData: SensorData[],
  beltLength: number,
  resolution: number = 100
): number[] {
  const profile: number[] = [];
  const sortedData = [...sensorData].sort((a, b) => a.position - b.position);
  
  for (let i = 0; i < resolution; i++) {
    const pos = (i / (resolution - 1)) * beltLength;
    
    let lowerIdx = 0;
    let upperIdx = sortedData.length - 1;
    
    for (let j = 0; j < sortedData.length - 1; j++) {
      if (sortedData[j].position <= pos && sortedData[j + 1].position >= pos) {
        lowerIdx = j;
        upperIdx = j + 1;
        break;
      }
    }
    
    const lower = sortedData[lowerIdx];
    const upper = sortedData[upperIdx];
    const t = upper.position === lower.position
      ? 0
      : (pos - lower.position) / (upper.position - lower.position);
    
    const tension = lower.tension + (upper.tension - lower.tension) * t;
    profile.push(tension);
  }
  
  return profile;
}

export function interpolateTemperatureProfile(
  sensorData: SensorData[],
  beltLength: number,
  resolution: number = 100
): number[] {
  const profile: number[] = [];
  const sortedData = [...sensorData].sort((a, b) => a.position - b.position);
  
  for (let i = 0; i < resolution; i++) {
    const pos = (i / (resolution - 1)) * beltLength;
    
    let lowerIdx = 0;
    let upperIdx = sortedData.length - 1;
    
    for (let j = 0; j < sortedData.length - 1; j++) {
      if (sortedData[j].position <= pos && sortedData[j + 1].position >= pos) {
        lowerIdx = j;
        upperIdx = j + 1;
        break;
      }
    }
    
    const lower = sortedData[lowerIdx];
    const upper = sortedData[upperIdx];
    const t = upper.position === lower.position
      ? 0
      : (pos - lower.position) / (upper.position - lower.position);
    
    const temp = lower.temperature + (upper.temperature - lower.temperature) * t;
    profile.push(temp);
  }
  
  return profile;
}
