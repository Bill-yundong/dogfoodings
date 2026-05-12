import type { Household, Appliance, EnergySavingCommand } from '../types';
import { ApplianceType } from '../types';

export class SmartEnergyModule {
	private household: Household;
	private optimizationLevel = 0.7;

	constructor(household: Household) {
		this.household = household;
	}

	getHousehold(): Household {
		return { ...this.household };
	}

	async processCommand(command: EnergySavingCommand): Promise<{
		reducedLoad: number;
		actualLoad: number;
		didRespond: boolean;
		responseTime: number;
		adjustedAppliances: Appliance[];
	}> {
		const startTime = Date.now();

		const willRespond = this.calculateResponseDecision(command);

		let reducedLoad = 0;
		let actualLoad = this.household.currentLoad;
		let adjustedAppliances: Appliance[] = [];

		if (willRespond) {
			const result = this.adjustAppliances(command);
			reducedLoad = result.reducedLoad;
			actualLoad = result.actualLoad;
			adjustedAppliances = result.adjustedAppliances;

			this.household.currentLoad = actualLoad;
			this.household.hasResponded = true;
			this.household.lastResponseTime = new Date();
		}

		const responseTime = Date.now() - startTime + Math.random() * 200;

		await new Promise(resolve => setTimeout(resolve, responseTime));

		return {
			reducedLoad,
			actualLoad,
			didRespond: willRespond,
			responseTime,
			adjustedAppliances
		};
	}

	private calculateResponseDecision(command: EnergySavingCommand): boolean {
		const baseProbability = this.household.responseProbability;
		const severityMultiplier = this.getSeverityMultiplier(command.severity);
		const finalProbability = baseProbability * severityMultiplier * this.optimizationLevel;

		return Math.random() < Math.min(finalProbability, 0.95);
	}

	private getSeverityMultiplier(severity: string): number {
		switch (severity) {
			case 'low':
				return 0.7;
			case 'medium':
				return 1.0;
			case 'high':
				return 1.3;
			case 'critical':
				return 1.5;
			default:
				return 1.0;
		}
	}

	private adjustAppliances(command: EnergySavingCommand): {
		reducedLoad: number;
		actualLoad: number;
		adjustedAppliances: Appliance[];
	} {
		const baselineLoad = this.household.currentLoad;
		const targetReductionRatio = this.getTargetReductionRatio(command.severity);
		const targetReduction = baselineLoad * targetReductionRatio;

		let reducedLoad = 0;
		const adjustedAppliances: Appliance[] = [];

		const priorityOrder = [
			ApplianceType.ELECTRIC_VEHICLE,
			ApplianceType.WATER_HEATER,
			ApplianceType.AIR_CONDITIONER,
			ApplianceType.WASHING_MACHINE,
			ApplianceType.DRYER,
			ApplianceType.LIGHTING,
			ApplianceType.REFRIGERATOR
		];

		for (const applianceType of priorityOrder) {
			if (reducedLoad >= targetReduction) break;

			const appliance = this.household.appliances.find(
				a => a.type === applianceType && a.isOn && a.canShift
			);

			if (appliance) {
				const reduction = this.reduceApplianceLoad(appliance, command.severity);
				reducedLoad += reduction;
				adjustedAppliances.push({ ...appliance });
			}
		}

		return {
			reducedLoad,
			actualLoad: baselineLoad - reducedLoad,
			adjustedAppliances
		};
	}

	private getTargetReductionRatio(severity: string): number {
		switch (severity) {
			case 'low':
				return 0.1;
			case 'medium':
				return 0.2;
			case 'high':
				return 0.35;
			case 'critical':
				return 0.5;
			default:
				return 0.15;
		}
	}

	private reduceApplianceLoad(appliance: Appliance, severity: string): number {
		const reductionFactors: Record<string, number> = {
			low: 0.3,
			medium: 0.5,
			high: 0.75,
			critical: 1.0
		};

		const factor = reductionFactors[severity] || 0.3;
		const reduction = appliance.power * factor;

		if (factor >= 0.9) {
			appliance.isOn = false;
		}

		return reduction;
	}

	setOptimizationLevel(level: number): void {
		this.optimizationLevel = Math.max(0, Math.min(1, level));
	}

	getOptimizationLevel(): number {
		return this.optimizationLevel;
	}

	getCurrentLoad(): number {
		return this.household.currentLoad;
	}

	getBaselineLoad(): number {
		return this.household.baseLoad;
	}

	getApplianceSummary(): Record<string, { count: number; totalPower: number; activePower: number }> {
		const summary: Record<string, { count: number; totalPower: number; activePower: number }> = {};

		for (const appliance of this.household.appliances) {
			if (!summary[appliance.type]) {
				summary[appliance.type] = { count: 0, totalPower: 0, activePower: 0 };
			}
			summary[appliance.type].count++;
			summary[appliance.type].totalPower += appliance.power;
			if (appliance.isOn) {
				summary[appliance.type].activePower += appliance.power;
			}
		}

		return summary;
	}

	resetToBaseline(): void {
		this.household.currentLoad = this.household.baseLoad;
		this.household.hasResponded = false;
		this.household.appliances.forEach(a => {
			if (a.type !== ApplianceType.REFRIGERATOR) {
				a.isOn = true;
			}
		});
	}

	estimateResponsePotential(): number {
		let potential = 0;

		for (const appliance of this.household.appliances) {
			if (appliance.canShift && appliance.isOn) {
				potential += appliance.power * 0.5;
			}
		}

		return potential;
	}
}

export function createSmartEnergyModule(household: Household): SmartEnergyModule {
	return new SmartEnergyModule(household);
}
