import { EnergyData } from '../domain/types/energy';
import { CARBON_EMISSION_FACTORS } from '../domain/constants/energy';

export class CarbonService {
  calculateEmission(energyOutput: EnergyData, efficiency: number): number {
    const electricityEmission = energyOutput.electricity * CARBON_EMISSION_FACTORS.electricity;
    const heatingEmission = energyOutput.heating * CARBON_EMISSION_FACTORS.heating;
    const coolingEmission = energyOutput.cooling * CARBON_EMISSION_FACTORS.cooling;

    return (electricityEmission + heatingEmission + coolingEmission) / (0.5 + efficiency * 0.5);
  }

  calculateEmissionBreakdown(energyOutput: EnergyData): {
    electricity: number;
    heating: number;
    cooling: number;
    total: number;
  } {
    const electricity = energyOutput.electricity * CARBON_EMISSION_FACTORS.electricity;
    const heating = energyOutput.heating * CARBON_EMISSION_FACTORS.heating;
    const cooling = energyOutput.cooling * CARBON_EMISSION_FACTORS.cooling;

    return {
      electricity,
      heating,
      cooling,
      total: electricity + heating + cooling,
    };
  }
}

export const carbonService = new CarbonService();
