<script lang="ts">
	import { createEventDispatcher } from 'svelte';

	export let selectedSeverity: 'low' | 'medium' | 'high' | 'critical';
	export let disabled = false;

	const dispatch = createEventDispatcher();

	const severityLabels: Record<string, string> = {
		low: '低',
		medium: '中',
		high: '高',
		critical: '紧急'
	};
</script>

<div class="space-y-4">
	<div class="flex flex-wrap gap-4 items-center">
		<div class="flex items-center gap-2">
			<span class="text-sm text-gray-600">指令级别:</span>
			<select
				bind:value={selectedSeverity}
				class="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary"
				{disabled}
			>
				{#each Object.entries(severityLabels) as [key, label]}
					<option value={key}>{label}</option>
				{/each}
			</select>
		</div>

		<button
			class="btn btn-primary"
			disabled={disabled}
			on:click={() => dispatch('run')}
		>
			🚀 运行模拟
		</button>

		<button
			class="btn bg-gray-100 text-gray-700 hover:bg-gray-200"
			disabled={disabled}
			on:click={() => dispatch('reset')}
		>
			🔄 重置
		</button>

		<button
			class="btn bg-secondary text-white hover:bg-secondary/90"
			disabled={disabled}
			on:click={() => dispatch('generate')}
		>
			📊 生成历史数据
		</button>
	</div>
</div>
