import { EnergyData, EnergyStation, OptimizationResult } from '../types/energy';

export class MultiEnergyFlowSolver {
  private maxIterations: number;
  private convergenceTolerance: number;
  private learningRate: number;

  constructor(maxIterations: number = 100, convergenceTolerance: number = 1e-6, learningRate: number = 0.01) {
    this.maxIterations = maxIterations;
    this.convergenceTolerance = convergenceTolerance;
    this.learningRate = learningRate;
  }

  async solveAsync(
    stations: EnergyStation[],
    demand: EnergyData,
    weatherFactors: { cooling: number; heating: number; electricity: number }
  ): Promise<OptimizationResult> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const result = this.optimizeEnergyFlow(stations, demand, weatherFactors);
        resolve(result);
      }, 10);
    });
  }

  private optimizeEnergyFlow(
    stations: EnergyStation[],
    demand: EnergyData,
    weatherFactors: { cooling: number; heating: number; electricity: number }
  ): OptimizationResult {
    const onlineStations = stations.filter(s => s.status === 'online');
    const totalCapacity = this.sumEnergyData(onlineStations.map(s => this.multiplyEnergyData(s.capacity, s.efficiency)));

    let currentAllocations = onlineStations.map(s => ({
      stationId: s.id,
      output: { ...s.currentOutput },
    }));

    let iterations = 0;
    let previousCost = Infinity;
    let convergence = false;

    while (iterations < this.maxIterations && !convergence) {
      const totalOutput = this.sumEnergyData(currentAllocations.map(a => a.output));
      const balance = this.calculateBalance(totalOutput, demand);
      const cost = this.calculateCost(totalOutput, demand, balance, weatherFactors);
      const gradients = this.calculateGradients(onlineStations, currentAllocations, demand, balance, weatherFactors);

      currentAllocations = this.updateAllocations(currentAllocations, gradients, onlineStations);

      if (Math.abs(cost - previousCost) < this.convergenceTolerance) {
        convergence = true;
      }

      previousCost = cost;
      iterations++;
    }

    const optimalOutput = this.sumEnergyData(currentAllocations.map(a => a.output));
    const efficiency = this.calculateEfficiency(optimalOutput, totalCapacity, demand);

    return {
      optimalOutput,
      stationAllocations: currentAllocations,
      cost: previousCost,
      efficiency,
      convergence,
      iterations,
    };
  }

  private sumEnergyData(data: EnergyData[]): EnergyData {
    return data.reduce(
      (sum, d) => ({
        cooling: sum.cooling + d.cooling,
        heating: sum.heating + d.heating,
        electricity: sum.electricity + d.electricity,
      }),
      { cooling: 0, heating: 0, electricity: 0 }
    );
  }

  private multiplyEnergyData(data: EnergyData, factor: EnergyData): EnergyData {
    return {
      cooling: data.cooling * factor.cooling,
      heating: data.heating * factor.heating,
      electricity: data.electricity * factor.electricity,
    };
  }

  private calculateBalance(supply: EnergyData, demand: EnergyData): EnergyData {
    return {
      cooling: supply.cooling - demand.cooling,
      heating: supply.heating - demand.heating,
      electricity: supply.electricity - demand.electricity,
    };
  }

  private calculateCost(
    supply: EnergyData,
    demand: EnergyData,
    balance: EnergyData,
    weatherFactors: { cooling: number; heating: number; electricity: number }
  ): number {
    const surplusPenalty = Math.max(0, balance.cooling) * 0.5 * weatherFactors.cooling +
                          Math.max(0, balance.heating) * 0.5 * weatherFactors.heating +
                          Math.max(0, balance.electricity) * 0.5 * weatherFactors.electricity;

    const deficitPenalty = Math.max(0, -balance.cooling) * 2.0 * weatherFactors.cooling +
                           Math.max(0, -balance.heating) * 2.0 * weatherFactors.heating +
                           Math.max(0, -balance.electricity) * 2.0 * weatherFactors.electricity;

    const operationalCost = (supply.cooling * 0.8 + supply.heating * 0.6 + supply.electricity * 1.2);

    return surplusPenalty + deficitPenalty + operationalCost;
  }

  private calculateGradients(
    stations: EnergyStation[],
    allocations: { stationId: string; output: EnergyData }[],
    demand: EnergyData,
    balance: EnergyData,
    weatherFactors: { cooling: number; heating: number; electricity: number }
  ): { stationId: string; gradient: EnergyData }[] {
    return stations.map((station, index) => {
      const allocation = allocations[index];
      const gradient: EnergyData = { cooling: 0, heating: 0, electricity: 0 };

      gradient.cooling = (balance.cooling > 0 ? 0.5 : -2.0) * weatherFactors.cooling + 0.8;
      gradient.heating = (balance.heating > 0 ? 0.5 : -2.0) * weatherFactors.heating + 0.6;
      gradient.electricity = (balance.electricity > 0 ? 0.5 : -2.0) * weatherFactors.electricity + 1.2;

      if (allocation.output.cooling >= station.capacity.cooling) {
        gradient.cooling = Math.abs(gradient.cooling);
      }
      if (allocation.output.heating >= station.capacity.heating) {
        gradient.heating = Math.abs(gradient.heating);
      }
      if (allocation.output.electricity >= station.capacity.electricity) {
        gradient.electricity = Math.abs(gradient.electricity);
      }

      return { stationId: station.id, gradient };
    });
  }

  private updateAllocations(
    allocations: { stationId: string; output: EnergyData }[],
    gradients: { stationId: string; gradient: EnergyData }[],
    stations: EnergyStation[]
  ): { stationId: string; output: EnergyData }[] {
    return allocations.map((allocation, index) => {
      const station = stations[index];
      const gradient = gradients[index];

      const newOutput = {
        cooling: Math.max(0, Math.min(station.capacity.cooling, allocation.output.cooling - gradient.gradient.cooling * this.learningRate * 100)),
        heating: Math.max(0, Math.min(station.capacity.heating, allocation.output.heating - gradient.gradient.heating * this.learningRate * 100)),
        electricity: Math.max(0, Math.min(station.capacity.electricity, allocation.output.electricity - gradient.gradient.electricity * this.learningRate * 100)),
      };

      return {
        stationId: allocation.stationId,
        output: newOutput,
      };
    });
  }

  private calculateEfficiency(output: EnergyData, capacity: EnergyData, demand: EnergyData): number {
    const coolingRatio = demand.cooling > 0 ? Math.min(output.cooling / demand.cooling, 1) : 1;
    const heatingRatio = demand.heating > 0 ? Math.min(output.heating / demand.heating, 1) : 1;
    const electricityRatio = demand.electricity > 0 ? Math.min(output.electricity / demand.electricity, 1) : 1;

    const capacityUtilization = (
      (output.cooling / Math.max(capacity.cooling, 1)) +
      (output.heating / Math.max(capacity.heating, 1)) +
      (output.electricity / Math.max(capacity.electricity, 1))
    ) / 3;

    return (coolingRatio + heatingRatio + electricityRatio) / 3 * 0.7 + capacityUtilization * 0.3;
  }

  async solveForMultipleTimePoints(
    stations: EnergyStation[],
    demands: EnergyData[],
    weatherFactors: { cooling: number; heating: number; electricity: number }[]
  ): Promise<OptimizationResult[]> {
    const results: OptimizationResult[] = [];
    
    for (let i = 0; i < demands.length; i++) {
      const result = await this.solveAsync(stations, demands[i], weatherFactors[i]);
      results.push(result);
      
      stations = stations.map((station, idx) => {
        const allocation = result.stationAllocations[idx];
        if (allocation) {
          return { ...station, currentOutput: allocation.output };
        }
        return station;
      });
    }

    return results;
  }
}

export const energyFlowSolver = new MultiEnergyFlowSolver();

export function calculateWeatherFactors(temperature: number, solarRadiation: number, windSpeed: number) {
  const coolingFactor = temperature > 25 ? 1 + (temperature - 25) * 0.05 : 0.5;
  const heatingFactor = temperature < 15 ? 1 + (15 - temperature) * 0.03 : 0.5;
  const electricityFactor = 1 + (solarRadiation / 1000) * (-0.2) + (windSpeed / 10) * (-0.1);

  return { cooling: coolingFactor, heating: heatingFactor, electricity: electricityFactor };
}

export function calculateCarbonEmission(energyOutput: EnergyData, efficiency: number): number {
  const electricityEmission = energyOutput.electricity * 0.5;
  const heatingEmission = energyOutput.heating * 0.3;
  const coolingEmission = energyOutput.cooling * 0.25;

  return (electricityEmission + heatingEmission + coolingEmission) / (0.5 + efficiency * 0.5);
}
