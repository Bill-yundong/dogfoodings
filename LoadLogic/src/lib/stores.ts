import { writable, derived, get } from 'svelte/store';
import type { VPPStatus, ResponseSnapshot, GameTheoryResult, Household } from './types';
import { CommandSeverity } from './types';
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
	const averageResponseTime = responded.reduce((sum, s) => sum + s.responseTime, 0) / (responded.length || 1);

	return {
		totalResponses: responded.length,
		responseRate: responded.length / $snapshots.length,
		totalReduction,
		averageResponseTime
	};
});

export async function initializeVPP(count: number): Promise<void> {
	try {
		const newVPP = createVPP(count);
		vpp.set(newVPP);
		vppStatus.set(newVPP.getStatus());
	} catch (error) {
		console.error('Failed to initialize VPP:', error);
	}
}

export async function runSimulation(scenario: string, severity: 'low' | 'medium' | 'high' | 'critical'): Promise<void> {
	const $vpp = get(vpp);
	if (!$vpp) {
		console.warn('VPP not initialized, reinitializing...');
		await initializeVPP(get(householdCount));
		return;
	}

	isSimulating.set(true);
	simulationProgress.set(0);

	try {
		const severityMap: Record<string, CommandSeverity> = {
			low: CommandSeverity.LOW,
			medium: CommandSeverity.MEDIUM,
			high: CommandSeverity.HIGH,
			critical: CommandSeverity.CRITICAL
		};

		const command = $vpp.issueCommand({
			targetReduction: 0.3 * get(householdCount),
			duration: 3600,
			severity: severityMap[severity],
			source: 'VPP'
		});

		simulationProgress.set(30);
		await new Promise(resolve => setTimeout(resolve, 500));

		const results = await $vpp.executeCommand(command.id);

		simulationProgress.set(70);
		await new Promise(resolve => setTimeout(resolve, 300));

		try {
			await db.addSnapshots(results);
			await db.bulkUpdateHouseholdProfiles(results);
		} catch (dbError) {
			console.warn('Database operation failed, continuing without persistence:', dbError);
		}

		snapshots.set(results);
		vppStatus.set($vpp.getStatus());

		const analyzer = createGameTheoryAnalyzer();
		const scenarioResults = await analyzer.analyzeAllScenarios(get(householdCount));
		gameTheoryResults.set(scenarioResults);

		simulationProgress.set(100);
		await new Promise(resolve => setTimeout(resolve, 200));
	} catch (error) {
		console.error('Simulation failed:', error);
	} finally {
		isSimulating.set(false);
	}
}

export async function resetSimulation(): Promise<void> {
	try {
		const $vpp = get(vpp);
		if ($vpp) {
			$vpp.resetAllResponses();
			vppStatus.set($vpp.getStatus());
		}
		snapshots.set([]);
		gameTheoryResults.set(null);
	} catch (error) {
		console.error('Reset failed:', error);
	}
}

export async function generateHistoricalData(householdCount: number, commandsPerHousehold: number): Promise<void> {
	isSimulating.set(true);
	simulationProgress.set(0);

	try {
		await db.generateSampleData(householdCount, commandsPerHousehold);
		simulationProgress.set(50);
		await loadHistoricalData();
		simulationProgress.set(100);
	} catch (error) {
		console.error('Failed to generate historical data:', error);
	} finally {
		isSimulating.set(false);
	}
}

export async function loadHistoricalData(): Promise<void> {
	try {
		const recent = await db.getRecentSnapshots(1000);
		snapshots.set(recent);
	} catch (error) {
		console.warn('Failed to load historical data:', error);
		snapshots.set([]);
	}
}

export function updateResponseProbability(householdId: string, probability: number): void {
	const $vpp = get(vpp);
	if ($vpp) {
		$vpp.updateResponseProbability(householdId, probability);
		vppStatus.set($vpp.getStatus());
	}
}
