import { TidalData, GeoLocation, Turbine } from '../types/tidal';

const WATER_DENSITY = 1025;

export const calculatePowerDensity = (velocityMagnitude: number): number => {
  return 0.5 * WATER_DENSITY * Math.pow(velocityMagnitude, 3);
};

export const calculateTurbinePower = (
  velocityMagnitude: number,
  turbine: Turbine
): number => {
  if (velocityMagnitude < turbine.cutInSpeed || velocityMagnitude > turbine.cutOutSpeed) {
    return 0;
  }
  
  const sweptArea = Math.PI * Math.pow(turbine.rotorDiameter / 2, 2);
  const availablePower = 0.5 * WATER_DENSITY * sweptArea * Math.pow(velocityMagnitude, 3);
  const actualPower = availablePower * turbine.efficiency;
  
  return Math.min(actualPower, turbine.ratedPower);
};

export const generateSyntheticTidalData = (
  location: GeoLocation,
  startTime: number,
  durationHours: number,
  intervalMinutes: number = 10
): TidalData[] => {
  const data: TidalData[] = [];
  const tidalPeriod = 12.42 * 60 * 60 * 1000;
  const steps = Math.floor((durationHours * 60) / intervalMinutes);
  const intervalMs = intervalMinutes * 60 * 1000;
  
  const latFactor = Math.sin(location.latitude * Math.PI / 180);
  const lonFactor = Math.cos(location.longitude * Math.PI / 180);
  const baseAmplitude = 1.5 + Math.abs(latFactor * lonFactor);
  const baseVelocity = 1.5 + Math.abs(latFactor) * 2;
  
  for (let i = 0; i < steps; i++) {
    const timestamp = startTime + i * intervalMs;
    const phase = (timestamp % tidalPeriod) / tidalPeriod * 2 * Math.PI;
    
    const waterLevel = baseAmplitude * Math.sin(phase) + 
                       baseAmplitude * 0.3 * Math.sin(2 * phase) +
                       baseAmplitude * 0.1 * Math.sin(3 * phase);
    
    const velocityMag = baseVelocity * Math.abs(Math.sin(phase + Math.PI / 4)) +
                    baseVelocity * 0.2 * Math.sin(3 * phase);
    
    const velocityDir = 180 + 180 * Math.sin(phase / 2 + location.longitude / 10);
    
    data.push({
      timestamp,
      waterLevel,
      velocity: {
        magnitude: Math.max(0.1, velocityMag),
        direction: velocityDir % 360
      }
    });
  }
  
  return data;
};

export const calculateVectorComponents = (magnitude: number, direction: number) => {
  const rad = direction * Math.PI / 180;
  return {
    u: magnitude * Math.cos(rad),
    v: magnitude * Math.sin(rad)
  };
};

export const calculateSpringNeapCycle = (timestamp: number): number => {
  const synodicMonth = 29.53 * 24 * 60 * 60 * 1000;
  const phase = (timestamp % synodicMonth) / synodicMonth * 2 * Math.PI;
  return (1 + Math.cos(phase)) / 2;
};

export const calculateCapacityFactor = (
  tidalData: TidalData[],
  turbine: Turbine
): number => {
  if (tidalData.length === 0) return 0;
  
  let totalEnergy = 0;
  let maxPossibleEnergy = 0;
  
  for (const data of tidalData) {
    totalEnergy += calculateTurbinePower(data.velocity.magnitude, turbine);
    maxPossibleEnergy += turbine.ratedPower;
  }
  
  return totalEnergy / maxPossibleEnergy;
};

export const calculateAnnualEnergyProduction = (
  tidalData: TidalData[],
  turbine: Turbine
): number => {
  const capacityFactor = calculateCapacityFactor(tidalData, turbine);
  const hoursInYear = 8760;
  return turbine.ratedPower * capacityFactor * hoursInYear;
};