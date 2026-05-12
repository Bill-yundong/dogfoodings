<script lang="ts">
	import type { ResponseSnapshot } from '$lib/types';
	import type { Writable } from 'svelte/store';

	export let snapshots: Writable<ResponseSnapshot[]>;

	let page = 1;
	const pageSize = 20;

	$: paginated = $snapshots.slice((page - 1) * pageSize, page * pageSize);
	$: totalPages = Math.ceil($snapshots.length / pageSize);
</script>

{#if $snapshots.length > 0}
	<div class="overflow-x-auto">
		<table class="w-full text-sm">
			<thead>
				<tr class="border-b border-gray-200">
					<th class="text-left py-2 px-3">家庭</th>
					<th class="text-left py-2 px-3">响应状态</th>
					<th class="text-right py-2 px-3">基线负荷</th>
					<th class="text-right py-2 px-3">实际负荷</th>
					<th class="text-right py-2 px-3">削减负荷</th>
					<th class="text-right py-2 px-3">响应概率</th>
					<th class="text-right py-2 px-3">响应时间</th>
				</tr>
			</thead>
			<tbody>
				{#each paginated as snapshot}
					<tr class="border-b border-gray-100 hover:bg-gray-50">
						<td class="py-2 px-3 font-medium">{snapshot.householdName}</td>
						<td class="py-2 px-3">
							{#if snapshot.didRespond}
								<span class="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs">已响应</span>
							{:else}
								<span class="px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs">未响应</span>
							{/if}
						</td>
						<td class="py-2 px-3 text-right">{snapshot.baselineLoad.toFixed(2)} kW</td>
						<td class="py-2 px-3 text-right">{snapshot.actualLoad.toFixed(2)} kW</td>
						<td class="py-2 px-3 text-right font-medium text-green-600">{snapshot.reducedLoad.toFixed(2)} kW</td>
						<td class="py-2 px-3 text-right">{(snapshot.responseProbability * 100).toFixed(1)}%</td>
						<td class="py-2 px-3 text-right">{snapshot.responseTime.toFixed(0)} ms</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>

	{#if totalPages > 1}
		<div class="flex justify-between items-center mt-4 pt-4 border-t border-gray-200">
			<p class="text-sm text-gray-500">
				显示 {(page - 1) * pageSize + 1} - {Math.min(page * pageSize, $snapshots.length)} 条，共 {$snapshots.length} 条
			</p>
			<div class="flex gap-2">
				<button
					class="px-3 py-1 bg-gray-100 rounded hover:bg-gray-200 disabled:opacity-50"
					disabled={page === 1}
					on:click={() => page--}
				>
					上一页
				</button>
				<span class="px-3 py-1">{page} / {totalPages}</span>
				<button
					class="px-3 py-1 bg-gray-100 rounded hover:bg-gray-200 disabled:opacity-50"
					disabled={page === totalPages}
					on:click={() => page++}
				>
					下一页
				</button>
			</div>
		</div>
	{/if}
{:else}
	<div class="text-center py-12 text-gray-500">
		<p class="text-4xl mb-2">📋</p>
		<p>暂无快照数据</p>
		<p class="text-sm mt-1">运行模拟或生成历史数据以查看结果</p>
	</div>
{/if}
