export interface Household {
	id: string;
	name: string;
	baseLoad: number;
	currentLoad: number;
	responseProbability: number;
	hasResponded: boolean;
	lastResponseTime: Date | null;
	location: {
		latitude: number;
		longitude: number;
	};
	appliances: Appliance[];
}

export interface Appliance {
	id: string;
	name: string;
	type: ApplianceType;
	power: number;
	isOn: boolean;
	canShift: boolean;
}

export enum ApplianceType {
	AIR_CONDITIONER = 'air_conditioner',
	REFRIGERATOR = 'refrigerator',
	WASHING_MACHINE = 'washing_machine',
	DRYER = 'dryer',
	WATER_HEATER = 'water_heater',
	ELECTRIC_VEHICLE = 'electric_vehicle',
	LIGHTING = 'lighting',
	OTHER = 'other'
}

export interface EnergySavingCommand {
	id: string;
	timestamp: Date;
	targetReduction: number;
	duration: number;
	severity: CommandSeverity;
	status: CommandStatus;
	source: 'VPP' | 'GRID' | 'MARKET';
}

export enum CommandSeverity {
	LOW = 'low',
	MEDIUM = 'medium',
	HIGH = 'high',
	CRITICAL = 'critical'
}

export enum CommandStatus {
	PENDING = 'pending',
	IN_PROGRESS = 'in_progress',
	COMPLETED = 'completed',
	FAILED = 'failed'
}

export interface ResponseSnapshot {
	id?: number;
	timestamp: Date;
	commandId: string;
	householdId: string;
	householdName: string;
	baselineLoad: number;
	actualLoad: number;
	reducedLoad: number;
	responseProbability: number;
	didRespond: boolean;
	responseTime: number;
	scenario: ScenarioType;
}

export enum ScenarioType {
	PEAK_SHAVING = 'peak_shaving',
	EMERGENCY = 'emergency',
	MARKET_PRICE = 'market_price',
	RENEWABLE_SHORTAGE = 'renewable_shortage',
	MAINTENANCE = 'maintenance'
}

export interface GameTheoryResult {
	scenario: ScenarioType;
	nashEquilibrium: number;
	responseProbability: number;
	expectedReduction: number;
	householdPayoff: number;
	vppPayoff: number;
	convergenceIterations: number;
}

export interface VPPStatus {
	totalHouseholds: number;
	respondingHouseholds: number;
	targetReduction: number;
	currentReduction: number;
	averageResponseProbability: number;
	activeCommands: EnergySavingCommand[];
}

export interface GameStrategy {
	householdStrategy: number;
	vppStrategy: number;
	householdUtility: number;
	vppUtility: number;
	iteration: number;
}
