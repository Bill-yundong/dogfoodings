import Dexie, { type Table } from 'dexie';
import type { ResponseSnapshot } from '../types';
import { ScenarioType } from '../types';

export interface StoredSnapshot extends Omit<ResponseSnapshot, 'timestamp' | 'scenario'> {
	id?: number;
	timestamp: number;
	scenario: string;
}

export interface SimulationStats {
	id?: number;
	simulationId: string;
	timestamp: number;
	totalHouseholds: number;
	respondingHouseholds: number;
	totalReduction: number;
	averageResponseTime: number;
	scenario: string;
	duration: number;
}

export interface HouseholdProfile {
	householdId: string;
	name: string;
	totalResponses: number;
	totalReduction: number;
	averageResponseProbability: number;
	lastActive: number;
}

class LoadLogicDatabase extends Dexie {
	snapshots!: Table<StoredSnapshot, number>;
	stats!: Table<SimulationStats, number>;
	profiles!: Table<HouseholdProfile, string>;

	constructor() {
		super('LoadLogicDB');

		this.version(1).stores({
			snapshots: '++id, timestamp, householdId, commandId, scenario, didRespond',
			stats: '++id, simulationId, timestamp, scenario',
			profiles: 'householdId, name, totalResponses, lastActive'
		});
	}

	async addSnapshot(snapshot: ResponseSnapshot): Promise<number> {
		const stored: StoredSnapshot = {
			...snapshot,
			timestamp: snapshot.timestamp.getTime(),
			scenario: snapshot.scenario.toString()
		};
		return await this.snapshots.add(stored);
	}

	async addSnapshots(snapshots: ResponseSnapshot[]): Promise<void> {
		const stored = snapshots.map(s => ({
			...s,
			timestamp: s.timestamp.getTime(),
			scenario: s.scenario.toString()
		}));
		await this.snapshots.bulkAdd(stored);
	}

	async getSnapshotsByHousehold(householdId: string, limit = 100): Promise<ResponseSnapshot[]> {
		const stored = await this.snapshots
			.where('householdId')
			.equals(householdId)
			.reverse()
			.sortBy('timestamp');

		return stored.slice(0, limit).map(this.convertToResponseSnapshot);
	}

	async getSnapshotsByScenario(scenario: ScenarioType, limit = 1000): Promise<ResponseSnapshot[]> {
		const stored = await this.snapshots
			.where('scenario')
			.equals(scenario.toString())
			.reverse()
			.sortBy('timestamp');

		return stored.slice(0, limit).map(this.convertToResponseSnapshot);
	}

	async getSnapshotsByTimeRange(startTime: Date, endTime: Date): Promise<ResponseSnapshot[]> {
		const stored = await this.snapshots
			.where('timestamp')
			.between(startTime.getTime(), endTime.getTime())
			.toArray();

		return stored.map(this.convertToResponseSnapshot);
	}

	async getRecentSnapshots(limit = 1000): Promise<ResponseSnapshot[]> {
		const stored = await this.snapshots
			.orderBy('timestamp')
			.reverse()
			.limit(limit)
			.toArray();

		return stored.map(this.convertToResponseSnapshot);
	}

	private convertToResponseSnapshot(stored: StoredSnapshot): ResponseSnapshot {
		return {
			...stored,
			timestamp: new Date(stored.timestamp),
			scenario: stored.scenario as ScenarioType
		};
	}

	async getSnapshotCount(): Promise<number> {
		return await this.snapshots.count();
	}

	async deleteSnapshotsOlderThan(date: Date): Promise<number> {
		return await this.snapshots
			.where('timestamp')
			.below(date.getTime())
			.delete();
	}

	async clearAllSnapshots(): Promise<void> {
		await this.snapshots.clear();
	}

	async addStats(stats: Omit<SimulationStats, 'id'>): Promise<number> {
		return await this.stats.add(stats as SimulationStats);
	}

	async getStatsByScenario(scenario: ScenarioType): Promise<SimulationStats[]> {
		return await this.stats
			.where('scenario')
			.equals(scenario.toString())
			.reverse()
			.sortBy('timestamp');
	}

	async getAllStats(limit = 100): Promise<SimulationStats[]> {
		return await this.stats
			.orderBy('timestamp')
			.reverse()
			.limit(limit)
			.toArray();
	}

	async updateHouseholdProfile(
		householdId: string,
		name: string,
		didRespond: boolean,
		reduction: number,
		responseProbability: number
	): Promise<void> {
		try {
			const existing = await this.profiles.get(householdId);

			if (existing) {
				await this.profiles.update(householdId, {
					totalResponses: existing.totalResponses + (didRespond ? 1 : 0),
					totalReduction: existing.totalReduction + reduction,
					averageResponseProbability:
						(existing.averageResponseProbability * existing.totalResponses + responseProbability) /
						(existing.totalResponses + 1),
					lastActive: Date.now()
				});
			} else {
				await this.profiles.put({
					householdId,
					name,
					totalResponses: didRespond ? 1 : 0,
					totalReduction: reduction,
					averageResponseProbability: responseProbability,
					lastActive: Date.now()
				});
			}
		} catch (error) {
			console.warn('Failed to update household profile:', error);
		}
	}

	async bulkUpdateHouseholdProfiles(snapshots: ResponseSnapshot[]): Promise<void> {
		try {
			const householdIds = [...new Set(snapshots.map(s => s.householdId))];
			const existingProfiles = await this.profiles.bulkGet(householdIds);
			const profileMap = new Map<string, HouseholdProfile>();
			
			for (const profile of existingProfiles) {
				if (profile) {
					profileMap.set(profile.householdId, profile);
				}
			}

			const updates: HouseholdProfile[] = [];
			const snapshotMap = new Map<string, ResponseSnapshot[]>();
			
			for (const snapshot of snapshots) {
				if (!snapshotMap.has(snapshot.householdId)) {
					snapshotMap.set(snapshot.householdId, []);
				}
				snapshotMap.get(snapshot.householdId)!.push(snapshot);
			}

			for (const [householdId, householdSnapshots] of snapshotMap) {
				const latest = householdSnapshots[0];
				const existing = profileMap.get(householdId);

				if (existing) {
					let newResponses = existing.totalResponses;
					let newReduction = existing.totalReduction;
					let newAvgProb = existing.averageResponseProbability;

					for (const s of householdSnapshots) {
						if (s.didRespond) {
							newAvgProb = (newAvgProb * newResponses + s.responseProbability) / (newResponses + 1);
							newResponses++;
							newReduction += s.reducedLoad;
						}
					}

					updates.push({
						...existing,
						totalResponses: newResponses,
						totalReduction: newReduction,
						averageResponseProbability: newAvgProb,
						lastActive: Date.now()
					});
				} else {
					const didRespond = householdSnapshots.some(s => s.didRespond);
					const totalReduction = householdSnapshots.reduce((sum, s) => sum + s.reducedLoad, 0);
					const avgProb = householdSnapshots.reduce((sum, s) => sum + s.responseProbability, 0) / householdSnapshots.length;

					updates.push({
						householdId,
						name: latest.householdName,
						totalResponses: didRespond ? 1 : 0,
						totalReduction,
						averageResponseProbability: avgProb,
						lastActive: Date.now()
					});
				}
			}

			await this.profiles.bulkPut(updates);
		} catch (error) {
			console.warn('Bulk update failed:', error);
		}
	}

	async getTopResponders(limit = 10): Promise<HouseholdProfile[]> {
		return await this.profiles
			.orderBy('totalResponses')
			.reverse()
			.limit(limit)
			.toArray();
	}

	async getTopReducers(limit = 10): Promise<HouseholdProfile[]> {
		return await this.profiles
			.orderBy('totalReduction')
			.reverse()
			.limit(limit)
			.toArray();
	}

	async getAggregateStats(): Promise<{
		totalSnapshots: number;
		totalResponses: number;
		totalReduction: number;
		averageResponseRate: number;
		totalHouseholds: number;
	}> {
		const totalSnapshots = await this.snapshots.count();
		const allSnapshots = await this.snapshots.toArray();
		const totalResponses = allSnapshots.filter(s => s.didRespond).length;
		const totalReduction = allSnapshots.reduce((sum, s) => sum + s.reducedLoad, 0);

		const totalHouseholds = await this.profiles.count();

		return {
			totalSnapshots,
			totalResponses,
			totalReduction,
			averageResponseRate: totalSnapshots > 0 ? totalResponses / totalSnapshots : 0,
			totalHouseholds
		};
	}

	async getResponseRateByScenario(): Promise<Record<string, { total: number; responded: number; rate: number }>> {
		const snapshots = await this.snapshots.toArray();
		const scenarioStats: Record<string, { total: number; responded: number; rate: number }> = {};

		for (const s of snapshots) {
			if (!scenarioStats[s.scenario]) {
				scenarioStats[s.scenario] = { total: 0, responded: 0, rate: 0 };
			}
			scenarioStats[s.scenario].total++;
			if (s.didRespond) {
				scenarioStats[s.scenario].responded++;
			}
		}

		for (const key of Object.keys(scenarioStats)) {
			scenarioStats[key].rate = scenarioStats[key].responded / scenarioStats[key].total;
		}

		return scenarioStats;
	}

	async generateSampleData(householdCount: number, commandsPerHousehold: number): Promise<void> {
		try {
			const householdNames = [
				'张先生家', '李女士家', '王先生家', '赵阿姨家', '陈先生家',
				'刘女士家', '周先生家', '吴阿姨家', '郑先生家', '孙女士家'
			];

			const scenarios: ScenarioType[] = [
				ScenarioType.EMERGENCY,
				ScenarioType.RENEWABLE_SHORTAGE,
				ScenarioType.PEAK_SHAVING,
				ScenarioType.MARKET_PRICE,
				ScenarioType.MAINTENANCE
			];

			const snapshots: ResponseSnapshot[] = [];

			for (let h = 0; h < householdCount; h++) {
				const householdId = `household-${h + 1}`;
				const householdName = householdNames[h % householdNames.length] + ` (${h + 1}号)`;

				for (let c = 0; c < commandsPerHousehold; c++) {
					const responseProbability = 0.3 + Math.random() * 0.5;
					const didRespond = Math.random() < responseProbability;
					const baselineLoad = 1.5 + Math.random() * 3.5;

					snapshots.push({
						timestamp: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
						commandId: `command-${Math.floor(Math.random() * 1000) + 1}`,
						householdId,
						householdName,
						baselineLoad,
						actualLoad: didRespond ? baselineLoad * (0.5 + Math.random() * 0.4) : baselineLoad,
						reducedLoad: didRespond ? baselineLoad * (0.1 + Math.random() * 0.4) : 0,
						responseProbability,
						didRespond,
						responseTime: 100 + Math.random() * 900,
						scenario: scenarios[Math.floor(Math.random() * scenarios.length)]
					});
				}
			}

			await this.addSnapshots(snapshots);
			await this.bulkUpdateHouseholdProfiles(snapshots);
		} catch (error) {
			console.error('Failed to generate sample data:', error);
			throw error;
		}
	}
}

export const db = new LoadLogicDatabase();

export default db;
