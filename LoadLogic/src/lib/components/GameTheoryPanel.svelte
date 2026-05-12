<script lang="ts">
	import type { GameTheoryResult } from '$lib/types';
	import type { Writable } from 'svelte/store';

	export let gameTheoryResults: Writable<Record<string, GameTheoryResult> | null>;

	const scenarioLabels: Record<string, string> = {
		emergency: '紧急情况',
		renewable_shortage: '可再生能源短缺',
		peak_shaving: '削峰填谷',
		market_price: '市场电价',
		maintenance: '电网维护'
	};

	const scenarioColors: Record<string, string> = {
		emergency: 'bg-red-100 text-red-800 border-red-200',
		renewable_shortage: 'bg-orange-100 text-orange-800 border-orange-200',
		peak_shaving: 'bg-blue-100 text-blue-800 border-blue-200',
		market_price: 'bg-green-100 text-green-800 border-green-200',
		maintenance: 'bg-purple-100 text-purple-800 border-purple-200'
	};
</script>

{#if $gameTheoryResults}
	<div class="space-y-3">
		{#each Object.entries($gameTheoryResults) as [key, result]}
			<div class="p-3 rounded-lg border {scenarioColors[key] || 'bg-gray-100'}">
				<div class="flex justify-between items-start mb-2">
					<h3 class="font-semibold">{scenarioLabels[key] || key}</h3>
					<span class="text-xs bg-white/50 px-2 py-1 rounded">
						纳什均衡: {(result.nashEquilibrium * 100).toFixed(1)}%
					</span>
				</div>
				<div class="grid grid-cols-2 gap-2 text-sm">
					<div>
						<p class="opacity-70">响应概率</p>
						<p class="font-medium">{(result.responseProbability * 100).toFixed(1)}%</p>
					</div>
					<div>
						<p class="opacity-70">预期削减</p>
						<p class="font-medium">{result.expectedReduction.toFixed(2)} kW</p>
					</div>
					<div>
						<p class="opacity-70">家庭收益</p>
						<p class="font-medium">{result.householdPayoff.toFixed(1)}</p>
					</div>
					<div>
						<p class="opacity-70">VPP收益</p>
						<p class="font-medium">{result.vppPayoff.toFixed(1)}</p>
					</div>
				</div>
			</div>
		{/each}
	</div>
{:else}
	<div class="text-center py-8 text-gray-500">
		<p class="text-4xl mb-2">🧮</p>
		<p>运行模拟以获取博弈论分析结果</p>
	</div>
{/if}
