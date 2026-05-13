export interface WaveParams {
  waveHeight: number;
  wavePeriod: number;
  waterDepth: number;
  wavelength: number;
  waveNumber: number;
  angularFrequency: number;
  phaseSpeed: number;
  groupVelocity: number;
}

export interface EnergyFlowData {
  x: number;
  y: number;
  energyDensity: number;
  energyFlux: number;
  direction: number;
  breakingProbability: number;
  dissipationRate: number;
}

export interface SimulationResult {
  timestamp: number;
  waveParams: WaveParams;
  energyField: EnergyFlowData[];
  breakingZones: { x: number; y: number; intensity: number }[];
}

export class WaveTheoryEngine {
  private gravity: number = 9.81;
  private rho: number = 1025;
  private resolution: number = 50;

  async calculateWaveParameters(
    waveHeight: number,
    wavePeriod: number,
    waterDepth: number
  ): Promise<WaveParams> {
    await new Promise((resolve) => setTimeout(resolve, 10));

    const T = wavePeriod;
    const h = waterDepth;
    const omega = (2 * Math.PI) / T;

    let k = 0;
    let error = 1;
    const tolerance = 1e-10;
    let iterations = 0;

    k = Math.pow(omega, 2) / this.gravity;

    while (error > tolerance && iterations < 100) {
      const kh = k * h;
      const tanhKh = Math.tanh(kh);
      const f = this.gravity * k * tanhKh - omega * omega;
      const df = this.gravity * (tanhKh + kh * (1 - tanhKh * tanhKh));
      const kNew = k - f / df;
      error = Math.abs(kNew - k);
      k = kNew;
      iterations++;
    }

    const wavelength = (2 * Math.PI) / k;
    const phaseSpeed = omega / k;
    const kh = k * h;
    const n = 0.5 * (1 + (2 * kh) / Math.sinh(2 * kh));
    const groupVelocity = phaseSpeed * n;

    return {
      waveHeight,
      wavePeriod,
      waterDepth,
      wavelength,
      waveNumber: k,
      angularFrequency: omega,
      phaseSpeed,
      groupVelocity,
    };
  }

  async simulateEnergyFlow(
    params: WaveParams,
    domainWidth: number,
    domainHeight: number,
    time: number
  ): Promise<SimulationResult> {
    await new Promise((resolve) => setTimeout(resolve, 20));

    const energyField: EnergyFlowData[] = [];
    const breakingZones: { x: number; y: number; intensity: number }[] = [];

    const dx = domainWidth / this.resolution;
    const dy = domainHeight / this.resolution;

    const deepWaterDepth = params.wavelength / 2;

    for (let i = 0; i <= this.resolution; i++) {
      for (let j = 0; j <= this.resolution; j++) {
        const x = i * dx;
        const y = j * dy;

        const localDepth = this.calculateLocalDepth(
          y,
          domainHeight,
          params.waterDepth
        );

        const kh = params.waveNumber * localDepth;
        const eta =
          (params.waveHeight / 2) *
          Math.cos(params.waveNumber * x - params.angularFrequency * time);

        const energyPerUnitArea =
          0.125 * this.rho * this.gravity * params.waveHeight * params.waveHeight;

        const n = 0.5 * (1 + (2 * kh) / Math.sinh(2 * kh));
        const cg = params.phaseSpeed * n;
        const energyFlux = energyPerUnitArea * cg;

        const ursellNumber =
          (params.waveHeight * Math.pow(params.wavelength, 2)) /
          Math.pow(localDepth, 3);

        const breakingProbability = this.calculateBreakingProbability(
          ursellNumber,
          params.waveHeight,
          localDepth
        );

        const dissipationRate = breakingProbability * energyFlux * 0.3;

        if (breakingProbability > 0.3) {
          breakingZones.push({
            x,
            y,
            intensity: breakingProbability,
          });
        }

        energyField.push({
          x,
          y,
          energyDensity: energyPerUnitArea,
          energyFlux,
          direction: Math.atan2(
            Math.sin(params.waveNumber * x - params.angularFrequency * time),
            Math.cos(params.waveNumber * x - params.angularFrequency * time)
          ),
          breakingProbability,
          dissipationRate,
        });
      }
    }

    return {
      timestamp: time,
      waveParams: params,
      energyField,
      breakingZones,
    };
  }

  private calculateLocalDepth(
    y: number,
    domainHeight: number,
    maxDepth: number
  ): number {
    const normalizedY = y / domainHeight;
    const depthFactor = Math.pow(normalizedY, 1.5);
    return Math.max(0.5, maxDepth * depthFactor);
  }

  private calculateBreakingProbability(
    ursell: number,
    waveHeight: number,
    depth: number
  ): number {
    const steepness = waveHeight / depth;
    const breakingThreshold = 0.78;

    if (steepness >= breakingThreshold) {
      return 1.0;
    }

    const ursellFactor = Math.min(1.0, ursell / 100);
    const steepnessFactor = steepness / breakingThreshold;

    return Math.min(1.0, (ursellFactor + steepnessFactor) / 2);
  }

  async calculateShoreProtectionEffectiveness(
    params: WaveParams,
    structureHeight: number,
    structureWidth: number,
    structureType: "seawall" | "breakwater" | "revetment"
  ): Promise<{
    protectionIndex: number;
    waveTransmission: number;
    energyDissipation: number;
    overtoppingRate: number;
  }> {
    await new Promise((resolve) => setTimeout(resolve, 15));

    const freeboard = structureHeight - params.waveHeight;
    const relativeWidth = structureWidth / params.wavelength;

    let transmissionCoefficient: number;
    let dissipationCoefficient: number;

    switch (structureType) {
      case "seawall":
        transmissionCoefficient = Math.exp(-2.3 * relativeWidth);
        dissipationCoefficient = 0.8 * (1 - Math.exp(-1.5 * relativeWidth));
        break;
      case "breakwater":
        transmissionCoefficient = Math.exp(-3.0 * relativeWidth);
        dissipationCoefficient = 0.9 * (1 - Math.exp(-2.0 * relativeWidth));
        break;
      case "revetment":
        transmissionCoefficient = Math.exp(-1.8 * relativeWidth);
        dissipationCoefficient = 0.7 * (1 - Math.exp(-1.2 * relativeWidth));
        break;
      default:
        transmissionCoefficient = 0.5;
        dissipationCoefficient = 0.5;
    }

    const overtoppingRate =
      freeboard < 0
        ? 0.05 * this.rho * this.gravity * Math.pow(params.waveHeight, 2.5)
        : 0.001 *
          this.rho *
          this.gravity *
          Math.pow(params.waveHeight, 2) *
          Math.exp(-2 * freeboard / params.waveHeight);

    const protectionIndex =
      (1 - transmissionCoefficient) * (1 - Math.min(1, overtoppingRate / 1000));

    return {
      protectionIndex: Math.max(0, Math.min(1, protectionIndex)),
      waveTransmission: transmissionCoefficient,
      energyDissipation: dissipationCoefficient,
      overtoppingRate,
    };
  }

  async runExtremeConditionSimulation(
    baseParams: WaveParams,
    stormIntensity: number
  ): Promise<SimulationResult> {
    const extremeHeight = baseParams.waveHeight * (1 + stormIntensity * 0.5);
    const extremePeriod = baseParams.wavePeriod * (1 + stormIntensity * 0.2);

    const extremeParams = await this.calculateWaveParameters(
      extremeHeight,
      extremePeriod,
      baseParams.waterDepth
    );

    return this.simulateEnergyFlow(extremeParams, 1000, 500, 0);
  }
}

export const waveEngine = new WaveTheoryEngine();
