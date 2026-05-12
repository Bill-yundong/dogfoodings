<script lang="ts">
	import { onMount } from 'svelte';
	import {
		householdCount,
		vppStatus,
		snapshots,
		gameTheoryResults,
		isSimulating,
		simulationProgress,
		stats,
		initializeVPP,
		runSimulation,
		resetSimulation,
		generateHistoricalData,
		loadHistoricalData
	} from '$lib/stores';
	import StatsCard from '$lib/components/StatsCard.svelte';
	import SimulationControls from '$lib/components/SimulationControls.svelte';
	import ResponseChart from '$lib/components/ResponseChart.svelte';
	import GameTheoryPanel from '$lib/components/GameTheoryPanel.svelte';
	import SnapshotTable from '$lib/components/SnapshotTable.svelte';

	let selectedSeverity: 'low' | 'medium' | 'high' | 'critical' = 'medium';

	onMount(async () => {
		await initializeVPP($householdCount);
		await loadHistoricalData();
	});

	async function handleRunSimulation() {
		await runSimulation('peak_shaving', selectedSeverity);
	}

	async function handleReset() {
		await resetSimulation();
	}

	async function handleGenerateData() {
		await generateHistoricalData(1000, 10);
		await loadHistoricalData();
	}

	async function handleHouseholdCountChange() {
		await initializeVPP($householdCount);
	}
</script>

<div class="min-h-screen bg-gray-50">
	<header class="bg-white shadow-sm border-b border-gray-200">
		<div class="max-w-7xl mx-auto px-4 py-6">
			<div class="flex items-center justify-between">
				<div>
					<h1 class="text-2xl font-bold text-gray-900">⚡ LoadLogic</h1>
					<p class="text-gray-500 mt-1">电力负荷需求响应模拟系统</p>
				</div>
				<div class="flex items-center gap-4">
					<div class="text-sm text-gray-600">
						家庭数量:
						<input
							type="number"
							bind:value={$householdCount}
							on:change={handleHouseholdCountChange}
							class="ml-2 w-20 px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-primary"
							min="10"
							max="10000"
						/>
					</div>
				</div>
			</div>
		</div>
	</header>

	<main class="max-w-7xl mx-auto px-4 py-8">
		{#if $isSimulating}
			<div class="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
				<div class="flex items-center gap-3">
					<div class="animate-spin w-5 h-5 border-2 border-primary border-t-transparent rounded-full" />
					<span class="text-primary font-medium">模拟运行中...</span>
				</div>
				<div class="mt-3 w-full bg-gray-200 rounded-full h-2">
					<div
						class="bg-primary h-2 rounded-full transition-all duration-300"
						style="width: {$simulationProgress}%"
					/>
				</div>
			</div>
		{/if}

		<section class="mb-8">
			<h2 class="text-lg font-semibold text-gray-800 mb-4">📊 实时状态</h2>
			<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
				<StatsCard
					title="总家庭数"
					value={$vppStatus?.totalHouseholds || 0}
					icon="🏠"
					color="blue"
				/>
				<StatsCard
					title="响应家庭数"
					value={$vppStatus?.respondingHouseholds || 0}
					icon="✅"
					color="green"
				/>
				<StatsCard
					title="平均响应概率"
					value="{(($vppStatus?.averageResponseProbability || 0) * 100).toFixed(1)}%"
					icon="📈"
					color="purple"
				/>
				<StatsCard
					title="总削减负荷"
					value="{$vppStatus?.currentReduction.toFixed(2) || 0} kW"
					icon="⚡"
					color="yellow"
				/>
			</div>
		</section>

		<section class="mb-8">
			<div class="card">
				<h2 class="text-lg font-semibold text-gray-800 mb-4">🎮 模拟控制</h2>
				<SimulationControls
					bind:selectedSeverity
					disabled={$isSimulating}
					on:run={handleRunSimulation}
					on:reset={handleReset}
					on:generate={handleGenerateData}
				/>
			</div>
		</section>

		<div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
			<section>
				<div class="card">
					<h2 class="text-lg font-semibold text-gray-800 mb-4">📉 响应分析</h2>
					<ResponseChart {snapshots} />
				</div>
			</section>

			<section>
				<div class="card">
					<h2 class="text-lg font-semibold text-gray-800 mb-4">🧠 博弈论分析</h2>
					<GameTheoryPanel {gameTheoryResults} />
				</div>
			</section>
		</div>

		<section class="mb-8">
			<div class="grid grid-cols-1 md:grid-cols-4 gap-4">
				<div class="stat-card">
					<p class="text-sm text-gray-500">总响应数</p>
					<p class="text-2xl font-bold text-gray-800">{$stats.totalResponses}</p>
				</div>
				<div class="stat-card">
					<p class="text-sm text-gray-500">响应率</p>
					<p class="text-2xl font-bold text-gray-800">{($stats.responseRate * 100).toFixed(1)}%</p>
				</div>
				<div class="stat-card">
					<p class="text-sm text-gray-500">总负荷削减</p>
					<p class="text-2xl font-bold text-gray-800">{$stats.totalReduction.toFixed(2)} kW</p>
				</div>
				<div class="stat-card">
					<p class="text-sm text-gray-500">平均响应时间</p>
					<p class="text-2xl font-bold text-gray-800">{$stats.averageResponseTime.toFixed(0)} ms</p>
				</div>
			</div>
		</section>

		<section>
			<div class="card">
				<h2 class="text-lg font-semibold text-gray-800 mb-4">📋 响应快照</h2>
				<SnapshotTable {snapshots} />
			</div>
		</section>
	</main>

	<footer class="bg-white border-t border-gray-200 mt-12">
		<div class="max-w-7xl mx-auto px-4 py-6 text-center text-gray-500 text-sm">
			<p>基于 Svelte 5 + IndexedDB + 异步博弈论模型</p>
			<p class="mt-1">© 2024 LoadLogic - 虚拟电厂需求响应模拟系统</p>
		</div>
	</footer>
</div>
