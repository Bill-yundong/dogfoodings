export interface SimulationParameters {
  rootDepth: number;
  rootDensity: number;
  soilTemperature: number;
  soilMoisture: number;
  initialNitrogen: number;
  initialPhosphorus: number;
  initialPotassium: number;
  simulationDuration: number;
  timeStep: number;
  diffusionCoefficient: number;
  bulkFlowVelocity: number;
}

export interface SimulationResult {
  timestamps: number[];
  nitrogenUptake: number[];
  phosphorusUptake: number[];
  potassiumUptake: number[];
  waterUptake: number[];
  nutrientConcentration: {
    nitrogen: number[];
    phosphorus: number[];
    potassium: number[];
  };
  totalUptake: {
    nitrogen: number;
    phosphorus: number;
    potassium: number;
  };
}

class ReactiveTransportEngine {
  private parameters: SimulationParameters;
  private isRunning: boolean = false;

  constructor(parameters: SimulationParameters) {
    this.parameters = parameters;
  }

  private calculateDiffusionFlux(concentration: number, gradient: number): number {
    const temperatureFactor = Math.exp(-3000 / (this.parameters.soilTemperature + 273.15));
    const moistureFactor = Math.pow(this.parameters.soilMoisture / 0.3, 1.5);
    return this.parameters.diffusionCoefficient * temperatureFactor * moistureFactor * gradient;
  }

  private calculateRootUptake(
    nutrientConcentration: number,
    nutrientType: 'nitrogen' | 'phosphorus' | 'potassium'
  ): number {
    const kmValues = { nitrogen: 0.1, phosphorus: 0.05, potassium: 0.08 };
    const vmaxValues = { nitrogen: 5.0, phosphorus: 2.0, potassium: 3.5 };
    
    const km = kmValues[nutrientType];
    const vmax = vmaxValues[nutrientType];
    
    const temperatureEffect = 1 + 0.05 * (this.parameters.soilTemperature - 25);
    const moistureEffect = Math.pow(this.parameters.soilMoisture / 0.3, 0.8);
    const rootEffect = this.parameters.rootDensity * Math.sqrt(this.parameters.rootDepth / 100);
    
    const michaelisMenten = (vmax * nutrientConcentration) / (km + nutrientConcentration);
    
    return michaelisMenten * temperatureEffect * moistureEffect * rootEffect;
  }

  private calculateMassBalance(
    concentration: number,
    diffusionFlux: number,
    uptakeRate: number,
    dt: number
  ): number {
    const advectionFlux = this.parameters.bulkFlowVelocity * concentration;
    const netFlux = diffusionFlux - advectionFlux - uptakeRate;
    return concentration + netFlux * dt;
  }

  async runSimulation(onProgress?: (progress: number) => void): Promise<SimulationResult> {
    this.isRunning = true;
    
    const { simulationDuration, timeStep, initialNitrogen, initialPhosphorus, initialPotassium } = this.parameters;
    const numSteps = Math.floor(simulationDuration / timeStep);
    
    const timestamps: number[] = [];
    const nitrogenUptake: number[] = [];
    const phosphorusUptake: number[] = [];
    const potassiumUptake: number[] = [];
    const waterUptake: number[] = [];
    const nitrogenConc: number[] = [];
    const phosphorusConc: number[] = [];
    const potassiumConc: number[] = [];
    
    let nConc = initialNitrogen;
    let pConc = initialPhosphorus;
    let kConc = initialPotassium;
    
    let totalN = 0;
    let totalP = 0;
    let totalK = 0;
    
    for (let step = 0; step < numSteps && this.isRunning; step++) {
      const time = step * timeStep;
      timestamps.push(time);
      
      const nGradient = nConc > 0 ? nConc * 0.1 : 0;
      const pGradient = pConc > 0 ? pConc * 0.05 : 0;
      const kGradient = kConc > 0 ? kConc * 0.08 : 0;
      
      const nDiffusion = this.calculateDiffusionFlux(nConc, nGradient);
      const pDiffusion = this.calculateDiffusionFlux(pConc, pGradient);
      const kDiffusion = this.calculateDiffusionFlux(kConc, kGradient);
      
      const nUptake = this.calculateRootUptake(nConc, 'nitrogen') * timeStep;
      const pUptake = this.calculateRootUptake(pConc, 'phosphorus') * timeStep;
      const kUptake = this.calculateRootUptake(kConc, 'potassium') * timeStep;
      
      const waterUptakeRate = this.parameters.rootDensity * this.parameters.soilMoisture * 0.5 * timeStep;
      
      nConc = this.calculateMassBalance(nConc, nDiffusion, nUptake / timeStep, timeStep);
      pConc = this.calculateMassBalance(pConc, pDiffusion, pUptake / timeStep, timeStep);
      kConc = this.calculateMassBalance(kConc, kDiffusion, kUptake / timeStep, timeStep);
      
      nConc = Math.max(0, nConc);
      pConc = Math.max(0, pConc);
      kConc = Math.max(0, kConc);
      
      nitrogenUptake.push(nUptake);
      phosphorusUptake.push(pUptake);
      potassiumUptake.push(kUptake);
      waterUptake.push(waterUptakeRate);
      
      nitrogenConc.push(nConc);
      phosphorusConc.push(pConc);
      potassiumConc.push(kConc);
      
      totalN += nUptake;
      totalP += pUptake;
      totalK += kUptake;
      
      if (step % 10 === 0 && onProgress) {
        onProgress((step / numSteps) * 100);
      }
      
      if (step % 100 === 0) {
        await new Promise(resolve => setTimeout(resolve, 0));
      }
    }
    
    this.isRunning = false;
    
    return {
      timestamps,
      nitrogenUptake,
      phosphorusUptake,
      potassiumUptake,
      waterUptake,
      nutrientConcentration: {
        nitrogen: nitrogenConc,
        phosphorus: phosphorusConc,
        potassium: potassiumConc,
      },
      totalUptake: {
        nitrogen: totalN,
        phosphorus: totalP,
        potassium: totalK,
      },
    };
  }

  stopSimulation(): void {
    this.isRunning = false;
  }

  updateParameters(parameters: Partial<SimulationParameters>): void {
    this.parameters = { ...this.parameters, ...parameters };
  }
}

export default ReactiveTransportEngine;
