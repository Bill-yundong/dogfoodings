import type { Household, EnergySavingCommand, VPPStatus, ResponseSnapshot, ScenarioType } from '../types';
import { CommandStatus, CommandSeverity } from '../types';

export class VirtualPowerPlant {
	private households: Household[] = [];
	private activeCommands: EnergySavingCommand[] = [];
	private targetReduction = 0;

	constructor(households: Household[] = []) {
		this.households = households;
	}

	addHousehold(household: Household): void {
		this.households.push(household);
	}

	removeHousehold(householdId: string): void {
		this.households = this.households.filter(h => h.id !== householdId);
	}

	getHouseholds(): Household[] {
		return [...this.households];
	}

	getHouseholdById(id: string): Household | undefined {
		return this.households.find(h => h.id === id);
	}

	issueCommand(command: Omit<EnergySavingCommand, 'id' | 'timestamp' | 'status'>): EnergySavingCommand {
		const newCommand: EnergySavingCommand = {
			...command,
			id: crypto.randomUUID(),
			timestamp: new Date(),
			status: CommandStatus.PENDING
		};

		this.activeCommands.push(newCommand);
		this.targetReduction += command.targetReduction;

		return newCommand;
	}

	async executeCommand(commandId: string): Promise<ResponseSnapshot[]> {
		const command = this.activeCommands.find(c => c.id === commandId);
		if (!command) {
			throw new Error(`Command ${commandId} not found`);
		}

		command.status = CommandStatus.IN_PROGRESS;

		const snapshots: ResponseSnapshot[] = [];

		for (const household of this.households) {
			const snapshot = await this.processHouseholdResponse(household, command);
			snapshots.push(snapshot);
		}

		command.status = CommandStatus.COMPLETED;
		this.targetReduction -= command.targetReduction;

		return snapshots;
	}

	private async processHouseholdResponse(
		household: Household,
		command: EnergySavingCommand
	): Promise<ResponseSnapshot> {
		await new Promise(resolve => setTimeout(resolve, Math.random() * 100));

		const baselineLoad = household.currentLoad;
		const willRespond = Math.random() < household.responseProbability;

		let reducedLoad = 0;
		let actualLoad = baselineLoad;

		if (willRespond) {
			const reductionFactor = this.getReductionFactor(command.severity);
			reducedLoad = baselineLoad * reductionFactor * (0.5 + Math.random() * 0.5);
			actualLoad = baselineLoad - reducedLoad;

			household.hasResponded = true;
			household.lastResponseTime = new Date();
			household.currentLoad = actualLoad;
		}

		return {
			timestamp: new Date(),
			commandId: command.id,
			householdId: household.id,
			householdName: household.name,
			baselineLoad,
			actualLoad,
			reducedLoad,
			responseProbability: household.responseProbability,
			didRespond: willRespond,
			responseTime: Math.random() * 5000 + 500,
			scenario: this.mapSeverityToScenario(command.severity)
		};
	}

	private getReductionFactor(severity: CommandSeverity): number {
		switch (severity) {
			case CommandSeverity.LOW:
				return 0.1;
			case CommandSeverity.MEDIUM:
				return 0.25;
			case CommandSeverity.HIGH:
				return 0.4;
			case CommandSeverity.CRITICAL:
				return 0.6;
			default:
				return 0.15;
		}
	}

	private mapSeverityToScenario(severity: CommandSeverity): ScenarioType {
		switch (severity) {
			case CommandSeverity.LOW:
				return 'market_price' as ScenarioType;
			case CommandSeverity.MEDIUM:
				return 'peak_shaving' as ScenarioType;
			case CommandSeverity.HIGH:
				return 'renewable_shortage' as ScenarioType;
			case CommandSeverity.CRITICAL:
				return 'emergency' as ScenarioType;
			default:
				return 'maintenance' as ScenarioType;
		}
	}

	getStatus(): VPPStatus {
		const respondingHouseholds = this.households.filter(h => h.hasResponded).length;
		const currentReduction = this.households.reduce((sum, h) => sum + (h.baseLoad - h.currentLoad), 0);
		const avgProbability = this.households.reduce((sum, h) => sum + h.responseProbability, 0) / this.households.length;

		return {
			totalHouseholds: this.households.length,
			respondingHouseholds,
			targetReduction: this.targetReduction,
			currentReduction,
			averageResponseProbability: avgProbability,
			activeCommands: [...this.activeCommands.filter(c => c.status !== CommandStatus.COMPLETED)]
		};
	}

	updateResponseProbability(householdId: string, newProbability: number): void {
		const household = this.households.find(h => h.id === householdId);
		if (household) {
			household.responseProbability = Math.max(0, Math.min(1, newProbability));
		}
	}

	resetAllResponses(): void {
		this.households.forEach(h => {
			h.hasResponded = false;
			h.currentLoad = h.baseLoad;
		});
		this.activeCommands = [];
		this.targetReduction = 0;
	}

	getTotalLoad(): number {
		return this.households.reduce((sum, h) => sum + h.currentLoad, 0);
	}
}

export function createVPP(householdCount = 100): VirtualPowerPlant {
	const households = generateHouseholds(householdCount);
	return new VirtualPowerPlant(households);
}

export function generateHouseholds(count: number): Household[] {
	const householdNames = [
		'张先生家', '李女士家', '王先生家', '赵阿姨家', '陈先生家',
		'刘女士家', '周先生家', '吴阿姨家', '郑先生家', '孙女士家'
	];

	const households: Household[] = [];

	for (let i = 0; i < count; i++) {
		const baseLoad = 1.5 + Math.random() * 3.5;
		households.push({
			id: `household-${i + 1}`,
			name: householdNames[i % householdNames.length] + ` (${i + 1}号)`,
			baseLoad,
			currentLoad: baseLoad,
			responseProbability: 0.3 + Math.random() * 0.5,
			hasResponded: false,
			lastResponseTime: null,
			location: {
				latitude: 31.0 + Math.random() * 2.0,
				longitude: 120.0 + Math.random() * 3.0
			},
			appliances: generateAppliances()
		});
	}

	return households;
}

function generateAppliances(): Household['appliances'] {
	return [
		{ id: 'ac-1', name: '空调', type: 'air_conditioner' as const, power: 1.5, isOn: true, canShift: true },
		{ id: 'fridge-1', name: '冰箱', type: 'refrigerator' as const, power: 0.2, isOn: true, canShift: false },
		{ id: 'water-1', name: '热水器', type: 'water_heater' as const, power: 2.0, isOn: true, canShift: true },
		{ id: 'ev-1', name: '电动车', type: 'electric_vehicle' as const, power: 3.0, isOn: false, canShift: true },
		{ id: 'light-1', name: '照明', type: 'lighting' as const, power: 0.3, isOn: true, canShift: false }
	];
}
