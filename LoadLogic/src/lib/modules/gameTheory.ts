import type { GameTheoryResult, GameStrategy } from '../types';
import { ScenarioType } from '../types';

export class AsyncGameTheory {
	private maxIterations = 1000;
	private convergenceThreshold = 1e-6;
	private learningRate = 0.1;

	constructor(options?: { maxIterations?: number; convergenceThreshold?: number; learningRate?: number }) {
		if (options?.maxIterations) this.maxIterations = options.maxIterations;
		if (options?.convergenceThreshold) this.convergenceThreshold = options.convergenceThreshold;
		if (options?.learningRate) this.learningRate = options.learningRate;
	}

	async analyzeScenario(scenario: ScenarioType, householdCount: number): Promise<GameTheoryResult> {
		const scenarioParams = this.getScenarioParameters(scenario);

		let householdStrategy = Math.random() * 0.5 + 0.3;
		let vppStrategy = Math.random() * 0.5 + 0.3;

		const strategies: GameStrategy[] = [];
		let iterations = 0;
		let converged = false;

		while (!converged && iterations < this.maxIterations) {
			await new Promise(resolve => setTimeout(resolve, 0));

			const householdUtility = this.calculateHouseholdUtility(householdStrategy, vppStrategy, scenarioParams);
			const vppUtility = this.calculateVPPUtility(householdStrategy, vppStrategy, scenarioParams);

			strategies.push({
				householdStrategy,
				vppStrategy,
				householdUtility,
				vppUtility,
				iteration: iterations
			});

			const newHouseholdStrategy = this.updateStrategy(householdStrategy, householdUtility, 'household');
			const newVPPStrategy = this.updateStrategy(vppStrategy, vppUtility, 'vpp');

			const delta = Math.abs(newHouseholdStrategy - householdStrategy) + Math.abs(newVPPStrategy - vppStrategy);

			householdStrategy = newHouseholdStrategy;
			vppStrategy = newVPPStrategy;

			converged = delta < this.convergenceThreshold;
			iterations++;
		}

		const nashEquilibrium = (householdStrategy + vppStrategy) / 2;
		const responseProbability = this.calculateResponseProbability(householdStrategy, scenarioParams);
		const expectedReduction = this.calculateExpectedReduction(responseProbability, householdCount, scenarioParams);

		return {
			scenario,
			nashEquilibrium,
			responseProbability,
			expectedReduction,
			householdPayoff: this.calculateHouseholdUtility(householdStrategy, vppStrategy, scenarioParams),
			vppPayoff: this.calculateVPPUtility(householdStrategy, vppStrategy, scenarioParams),
			convergenceIterations: iterations
		};
	}

	private getScenarioParameters(scenario: ScenarioType): {
		severity: number;
		incentiveFactor: number;
		penaltyFactor: number;
		reductionTarget: number;
		timePressure: number;
	} {
		switch (scenario) {
			case 'emergency':
				return { severity: 1.0, incentiveFactor: 2.0, penaltyFactor: 1.5, reductionTarget: 0.5, timePressure: 1.0 };
			case 'renewable_shortage':
				return { severity: 0.8, incentiveFactor: 1.5, penaltyFactor: 1.2, reductionTarget: 0.35, timePressure: 0.8 };
			case 'peak_shaving':
				return { severity: 0.6, incentiveFactor: 1.2, penaltyFactor: 1.0, reductionTarget: 0.25, timePressure: 0.6 };
			case 'market_price':
				return { severity: 0.4, incentiveFactor: 1.0, penaltyFactor: 0.8, reductionTarget: 0.15, timePressure: 0.4 };
			case 'maintenance':
				return { severity: 0.3, incentiveFactor: 0.8, penaltyFactor: 0.6, reductionTarget: 0.1, timePressure: 0.2 };
			default:
				return { severity: 0.5, incentiveFactor: 1.0, penaltyFactor: 1.0, reductionTarget: 0.2, timePressure: 0.5 };
		}
	}

	private calculateHouseholdUtility(
		householdStrategy: number,
		vppStrategy: number,
		params: ReturnType<typeof this.getScenarioParameters>
	): number {
		const baseUtility = 100;

		const comfortLoss = householdStrategy * 30 * (1 + params.severity * 0.5);
		const incentive = householdStrategy * vppStrategy * 50 * params.incentiveFactor;
		const penalty = (1 - householdStrategy) * vppStrategy * 20 * params.penaltyFactor;
		const riskReduction = householdStrategy * params.severity * 15;

		return baseUtility - comfortLoss + incentive - penalty + riskReduction;
	}

	private calculateVPPUtility(
		householdStrategy: number,
		vppStrategy: number,
		params: ReturnType<typeof this.getScenarioParameters>
	): number {
		const baseUtility = 100;

		const reductionAchieved = householdStrategy * vppStrategy * params.reductionTarget;
		const costSaving = reductionAchieved * 200;
		const incentiveCost = vppStrategy * householdStrategy * 30 * params.incentiveFactor;
		const gridPenalty = (1 - reductionAchieved / params.reductionTarget) * 50 * params.severity;
		const reputation = householdStrategy * 20;

		return baseUtility + costSaving - incentiveCost - gridPenalty + reputation;
	}

	private updateStrategy(currentStrategy: number, utility: number, role: 'household' | 'vpp'): number {
		const gradient = role === 'household'
			? this.calculateHouseholdGradient(currentStrategy, utility)
			: this.calculateVPPGradient(currentStrategy, utility);

		const momentum = 0.9;
		const newStrategy = currentStrategy + this.learningRate * momentum * gradient;

		return Math.max(0, Math.min(1, newStrategy));
	}

	private calculateHouseholdGradient(strategy: number, utility: number): number {
		const epsilon = 1e-4;
		const utilityPlus = this.calculateHouseholdUtility(
			strategy + epsilon,
			0.5,
			{ severity: 0.5, incentiveFactor: 1.0, penaltyFactor: 1.0, reductionTarget: 0.2, timePressure: 0.5 }
		);
		const utilityMinus = this.calculateHouseholdUtility(
			strategy - epsilon,
			0.5,
			{ severity: 0.5, incentiveFactor: 1.0, penaltyFactor: 1.0, reductionTarget: 0.2, timePressure: 0.5 }
		);
		return (utilityPlus - utilityMinus) / (2 * epsilon);
	}

	private calculateVPPGradient(strategy: number, utility: number): number {
		const epsilon = 1e-4;
		const utilityPlus = this.calculateVPPUtility(
			0.5,
			strategy + epsilon,
			{ severity: 0.5, incentiveFactor: 1.0, penaltyFactor: 1.0, reductionTarget: 0.2, timePressure: 0.5 }
		);
		const utilityMinus = this.calculateVPPUtility(
			0.5,
			strategy - epsilon,
			{ severity: 0.5, incentiveFactor: 1.0, penaltyFactor: 1.0, reductionTarget: 0.2, timePressure: 0.5 }
		);
		return (utilityPlus - utilityMinus) / (2 * epsilon);
	}

	private calculateResponseProbability(householdStrategy: number, params: ReturnType<typeof this.getScenarioParameters>): number {
		const baseProbability = 0.5;
		const strategyFactor = householdStrategy;
		const severityFactor = params.severity * 0.3;
		const incentiveFactor = params.incentiveFactor * 0.2;

		let probability = baseProbability * (0.5 + 0.5 * strategyFactor) + severityFactor + incentiveFactor;

		return Math.max(0.1, Math.min(0.95, probability));
	}

	private calculateExpectedReduction(
		responseProbability: number,
		householdCount: number,
		params: ReturnType<typeof this.getScenarioParameters>
	): number {
		const avgHouseholdLoad = 2.5;
		const totalLoad = avgHouseholdLoad * householdCount;
		const reductionPerResponse = params.reductionTarget * avgHouseholdLoad;

		return responseProbability * householdCount * reductionPerResponse;
	}

	async analyzeAllScenarios(householdCount: number): Promise<Record<ScenarioType, GameTheoryResult>> {
		const scenarios: ScenarioType[] = [
			ScenarioType.EMERGENCY,
			ScenarioType.RENEWABLE_SHORTAGE,
			ScenarioType.PEAK_SHAVING,
			ScenarioType.MARKET_PRICE,
			ScenarioType.MAINTENANCE
		];

		const results: Partial<Record<ScenarioType, GameTheoryResult>> = {};

		for (const scenario of scenarios) {
			results[scenario] = await this.analyzeScenario(scenario, householdCount);
		}

		return results as Record<ScenarioType, GameTheoryResult>;
	}

	calculateNashEquilibriumForTwoPlayers(payoffMatrix: number[][][]): { player1: number; player2: number } {
		let p1Strategy = 0.5;
		let p2Strategy = 0.5;

		for (let i = 0; i < this.maxIterations; i++) {
			const p1Payoff0 = p2Strategy * payoffMatrix[0][0][0] + (1 - p2Strategy) * payoffMatrix[0][1][0];
			const p1Payoff1 = p2Strategy * payoffMatrix[1][0][0] + (1 - p2Strategy) * payoffMatrix[1][1][0];

			const p2Payoff0 = p1Strategy * payoffMatrix[0][0][1] + (1 - p1Strategy) * payoffMatrix[0][1][1];
			const p2Payoff1 = p1Strategy * payoffMatrix[1][0][1] + (1 - p1Strategy) * payoffMatrix[1][1][1];

			const p1Gradient = p1Payoff1 - p1Payoff0;
			const p2Gradient = p2Payoff1 - p2Payoff0;

			p1Strategy = Math.max(0, Math.min(1, p1Strategy + this.learningRate * p1Gradient));
			p2Strategy = Math.max(0, Math.min(1, p2Strategy + this.learningRate * p2Gradient));

			if (Math.abs(p1Gradient) < this.convergenceThreshold && Math.abs(p2Gradient) < this.convergenceThreshold) {
				break;
			}
		}

		return { player1: p1Strategy, player2: p2Strategy };
	}

	generateEvolutionaryStableStrategy(populationSize: number, generations: number): number[] {
		let population = Array(populationSize).fill(0).map(() => Math.random());

		for (let gen = 0; gen < generations; gen++) {
			const fitness = population.map(strategy =>
				this.calculateHouseholdUtility(strategy, 0.5, {
					severity: 0.5,
					incentiveFactor: 1.0,
					penaltyFactor: 1.0,
					reductionTarget: 0.2,
					timePressure: 0.5
				})
			);

			const totalFitness = fitness.reduce((a, b) => a + b, 0);
			const probabilities = fitness.map(f => f / totalFitness);

			const newPopulation: number[] = [];
			for (let i = 0; i < populationSize; i++) {
				const parent = this.selectByProbability(probabilities);
				let child = population[parent] + (Math.random() - 0.5) * 0.1;
				child = Math.max(0, Math.min(1, child));
				newPopulation.push(child);
			}

			population = newPopulation;
		}

		return population;
	}

	private selectByProbability(probabilities: number[]): number {
		const r = Math.random();
		let cumulative = 0;
		for (let i = 0; i < probabilities.length; i++) {
			cumulative += probabilities[i];
			if (r < cumulative) return i;
		}
		return probabilities.length - 1;
	}
}

export function createGameTheoryAnalyzer(): AsyncGameTheory {
	return new AsyncGameTheory();
}

export const standardPayoffMatrix: number[][][] = [
	[[100, 100], [40, 120]],
	[[120, 40], [60, 60]]
];
