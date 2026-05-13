import type { EnergyStation, MultiEnergyFlowResult, OptimizationResult, WeatherCondition } from '../types/energy';

interface OptimizationConstraints {
  maxCoolingAdjustment: number;
  maxHeatingAdjustment: number;
  maxElectricityAdjustment: number;
  minEfficiency: number;
  maxCarbonEmission: number;
}

const DEFAULT_CONSTRAINTS: OptimizationConstraints = {
  maxCoolingAdjustment: 0.2,
  maxHeatingAdjustment: 0.2,
  maxElectricityAdjustment: 0.15,
  minEfficiency: 0.75,
  maxCarbonEmission: 1000,
};

function calculateCarbonEmission(station: EnergyStation): number {
  const { cooling, heating, electricity } = station.balance;
  const coolingEmission = cooling.current * 0.12;
  const heatingEmission = heating.current * 0.18;
  const electricityEmission = electricity.current * 0.25 * (1 - electricity.renewableRatio);
  return coolingEmission + heatingEmission + electricityEmission;
}

function calculateEfficiency(station: EnergyStation): number {
  const { cooling, heating, electricity } = station.balance;
  const totalLoad = cooling.current + heating.current + electricity.current;
  const totalCapacity = cooling.capacity + heating.capacity + electricity.capacity;
  const weightedEfficiency = (cooling.efficiency * cooling.current + 
                              heating.efficiency * heating.current + 
                              electricity.efficiency * electricity.current) / totalLoad;
  return weightedEfficiency * (totalLoad / totalCapacity);
}

function objectiveFunction(
  station: EnergyStation,
  adjustments: { cooling: number; heating: number; electricity: number },
  weather: WeatherCondition
): number {
  const { cooling, heating, electricity } = station.balance;
  
  const adjustedCooling = Math.max(0, Math.min(cooling.capacity, cooling.current * (1 + adjustments.cooling)));
  const adjustedHeating = Math.max(0, Math.min(heating.capacity, heating.current * (1 + adjustments.heating)));
  const adjustedElectricity = Math.max(0, Math.min(electricity.capacity, electricity.current * (1 + adjustments.electricity)));
  
  const coolingNeed = weather.temperature > 25 ? (weather.temperature - 25) * 0.1 : 0;
  const heatingNeed = weather.temperature < 18 ? (18 - weather.temperature) * 0.1 : 0;
  
  const coolingDeviation = Math.abs(adjustedCooling - cooling.target * (1 + coolingNeed));
  const heatingDeviation = Math.abs(adjustedHeating - heating.target * (1 + heatingNeed));
  const electricityDeviation = Math.abs(adjustedElectricity - electricity.target);
  
  const tempStation = {
    ...station,
    balance: {
      ...station.balance,
      cooling: { ...cooling, current: adjustedCooling },
      heating: { ...heating, current: adjustedHeating },
      electricity: { ...electricity, current: adjustedElectricity },
    },
  };
  
  const emission = calculateCarbonEmission(tempStation);
  const efficiency = calculateEfficiency(tempStation);
  
  return (
    0.3 * coolingDeviation +
    0.3 * heatingDeviation +
    0.2 * electricityDeviation +
    0.15 * emission +
    0.05 * (1 - efficiency)
  );
}

function checkConstraints(
  station: EnergyStation,
  adjustments: { cooling: number; heating: number; electricity: number },
  constraints: OptimizationConstraints
): boolean {
  if (Math.abs(adjustments.cooling) > constraints.maxCoolingAdjustment) return false;
  if (Math.abs(adjustments.heating) > constraints.maxHeatingAdjustment) return false;
  if (Math.abs(adjustments.electricity) > constraints.maxElectricityAdjustment) return false;
  
  const tempStation = {
    ...station,
    balance: {
      ...station.balance,
      cooling: { ...station.balance.cooling, current: station.balance.cooling.current * (1 + adjustments.cooling) },
      heating: { ...station.balance.heating, current: station.balance.heating.current * (1 + adjustments.heating) },
      electricity: { ...station.balance.electricity, current: station.balance.electricity.current * (1 + adjustments.electricity) },
    },
  };
  
  if (calculateEfficiency(tempStation) < constraints.minEfficiency) return false;
  if (calculateCarbonEmission(tempStation) > constraints.maxCarbonEmission) return false;
  
  return true;
}

async function optimizeStation(
  station: EnergyStation,
  weather: WeatherCondition,
  constraints: OptimizationConstraints,
  maxIterations: number = 50
): Promise<OptimizationResult> {
  return new Promise((resolve) => {
    setTimeout(() => {
      let bestAdjustments = { cooling: 0, heating: 0, electricity: 0 };
      let bestObjective = Infinity;
      
      const learningRate = 0.01;
      
      for (let i = 0; i < maxIterations; i++) {
        const currentObjective = objectiveFunction(station, bestAdjustments, weather);
        
        if (currentObjective < bestObjective) {
          bestObjective = currentObjective;
        }
        
        const epsilon = 0.001;
        
        const coolingGrad = (
          objectiveFunction(station, { ...bestAdjustments, cooling: bestAdjustments.cooling + epsilon }, weather) -
          currentObjective
        ) / epsilon;
        
        const heatingGrad = (
          objectiveFunction(station, { ...bestAdjustments, heating: bestAdjustments.heating + epsilon }, weather) -
          currentObjective
        ) / epsilon;
        
        const electricityGrad = (
          objectiveFunction(station, { ...bestAdjustments, electricity: bestAdjustments.electricity + epsilon }, weather) -
          currentObjective
        ) / epsilon;
        
        const newAdjustments = {
          cooling: Math.max(-constraints.maxCoolingAdjustment, Math.min(constraints.maxCoolingAdjustment, bestAdjustments.cooling - learningRate * coolingGrad)),
          heating: Math.max(-constraints.maxHeatingAdjustment, Math.min(constraints.maxHeatingAdjustment, bestAdjustments.heating - learningRate * heatingGrad)),
          electricity: Math.max(-constraints.maxElectricityAdjustment, Math.min(constraints.maxElectricityAdjustment, bestAdjustments.electricity - learningRate * electricityGrad)),
        };
        
        if (checkConstraints(station, newAdjustments, constraints)) {
          bestAdjustments = newAdjustments;
        }
      }
      
      resolve({
        stationId: station.id,
        adjustments: bestAdjustments,
        objectiveValue: bestObjective,
        constraintsSatisfied: checkConstraints(station, bestAdjustments, constraints),
      });
    }, Math.random() * 10);
  });
}

export async function solveMultiEnergyFlow(
  stations: EnergyStation[],
  weather: WeatherCondition,
  constraints: OptimizationConstraints = DEFAULT_CONSTRAINTS,
  maxIterations: number = 50
): Promise<MultiEnergyFlowResult> {
  const optimizationPromises = stations.map(station => 
    optimizeStation(station, weather, constraints, maxIterations)
  );
  
  const optimizations = await Promise.all(optimizationPromises);
  
  let totalEfficiency = 0;
  let totalCarbonSaved = 0;
  
  stations.forEach((station, index) => {
    const optimization = optimizations[index];
    
    const adjustedStation = {
      ...station,
      balance: {
        ...station.balance,
        cooling: { ...station.balance.cooling, current: station.balance.cooling.current * (1 + optimization.adjustments.cooling) },
        heating: { ...station.balance.heating, current: station.balance.heating.current * (1 + optimization.adjustments.heating) },
        electricity: { ...station.balance.electricity, current: station.balance.electricity.current * (1 + optimization.adjustments.electricity) },
      },
    };
    
    const originalEmission = calculateCarbonEmission(station);
    const adjustedEmission = calculateCarbonEmission(adjustedStation);
    totalCarbonSaved += originalEmission - adjustedEmission;
    
    totalEfficiency += calculateEfficiency(adjustedStation);
  });
  
  return {
    optimizations,
    totalEfficiency: totalEfficiency / stations.length,
    carbonSaved: totalCarbonSaved,
    convergence: true,
    iterations: maxIterations,
  };
}

export function applyOptimizations(
  stations: EnergyStation[],
  optimizations: OptimizationResult[]
): EnergyStation[] {
  return stations.map(station => {
    const optimization = optimizations.find(o => o.stationId === station.id);
    if (!optimization) return station;
    
    return {
      ...station,
      balance: {
        ...station.balance,
        cooling: {
          ...station.balance.cooling,
          current: station.balance.cooling.current * (1 + optimization.adjustments.cooling),
        },
        heating: {
          ...station.balance.heating,
          current: station.balance.heating.current * (1 + optimization.adjustments.heating),
        },
        electricity: {
          ...station.balance.electricity,
          current: station.balance.electricity.current * (1 + optimization.adjustments.electricity),
        },
        timestamp: Date.now(),
      },
      lastUpdate: Date.now(),
    };
  });
}
