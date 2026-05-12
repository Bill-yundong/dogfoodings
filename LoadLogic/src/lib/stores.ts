import { writable, derived, get } from 'svelte/store';
import type { VPPStatus, ResponseSnapshot, GameTheoryResult, Household } from './types';
import { VirtualPowerPlant, createVPP } from './modules/vpp';
import { createGameTheoryAnalyzer } from './modules/gameTheory';
import { db } from './modules/database';

export const householdCount = writable(100);
export const vpp = writable<VirtualPowerPlant | null>(null);
export const vppStatus = writable<VPPStatus | null>(null);
export const snapshots = writable<ResponseSnapshot[]>([]);
export const gameTheoryResults = writable<Record<string, GameTheoryResult> | null>(null);
export const isSimulating = writable(false);
export const simulationProgress = writable(0);
export const selectedScenario = writable<string>('peak_shaving');

export const stats = derived(snapshots, $snapshots => {
	if ($snapshots.length === 0) {
		return {
			totalResponses: 0,
			responseRate: 0,
			totalReduction: 0,
			averageResponseTime: 0
		};
	}

	const responded = $snapshots.filter(s => s.didRespond);
	const totalReduction = responded.reduce((sum, s) => sum + s.reducedLoad, 0);
	const avgResponseTime = responded.reduce((sum, s) => sum + s.responseTime, 0) / (responded.length || 1);

	return {
		totalResponses: responded.length,
		responseRate: responded.length / $snapshots.length,
		totalReduction,
		averageResponseTime
	};
});

export async function initializeVPP(count: number): Promise<void> {
	const newVPP = createVPP(count);
	vpp.set(newVPP);
	vppStatus.set(newVPP.getStatus());
}

export async function runSimulation(scenario: string, severity: 'low' | 'medium' | 'high' | 'critical'): Promise<void> {
	const $vpp = get(vpp);
	if (!$vpp) return;

	isSimulating.set(true);
	simulationProgress.set(0);

	const command = $vpp.issueCommand({
		targetReduction: 0.3 * get(householdCount),
		duration: 3600,
		severity,
		source: 'VPP'
	});

	simulationProgress.set(30);
	await new Promise(resolve => setTimeout(resolve, 500));

	const results = await $vpp.executeCommand(command.id);

	simulationProgress.set(70);
	await new Promise(resolve => setTimeout(resolve, 300));

	await db.addSnapshots(results);
	for (const snapshot of results) {
		await db.updateHouseholdProfile(
			snapshot.householdId,
			snapshot.householdName,
			snapshot.didRespond,
			snapshot.reducedLoad,
			snapshot.responseProbability
		);
	}

	snapshots.set(results);
	vppStatus.set($vpp.getStatus());

	const analyzer = createGameTheoryAnalyzer();
	const scenarioResults = await analyzer.analyzeAllScenarios(get(householdCount));
	gameTheoryResults.set(scenarioResults);

	simulationProgress.set(100);
	await new Promise(resolve => setTimeout(resolve, 200));
	isSimulating.set(false);
}

export async function resetSimulation(): Promise<void> {
	const $vpp = get(vpp);
	if ($vpp) {
		$vpp.resetAllResponses();
		vppStatus.set($vpp.getStatus());
	}
	snapshots.set([]);
}

export async function generateHistoricalData(householdCount: number, commandsPerHousehold: number): Promise<void> {
	isSimulating.set(true);
	await db.generateSampleData(householdCount, commandsPerHousehold);
	isSimulating.set(false);
}

export async function loadHistoricalData(): Promise<void> {
	const recent = await db.getRecentSnapshots(1000);
	snapshots.set(recent);
}

export function updateResponseProbability(householdId: string, probability: number): void {
	const $vpp = get(vpp);
	if ($vpp) {
		$vpp.updateResponseProbability(householdId, probability);
		vppStatus.set($vpp.getStatus());
	}
}
