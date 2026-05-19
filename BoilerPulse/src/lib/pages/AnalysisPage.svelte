<script lang="ts">
  import { onMount } from 'svelte';
  import { getRecentSnapshots, getSnapshotsByTimeRange } from '$lib/db/snapshot';
  import type { WaveformSnapshot } from '$lib/types';

  let snapshots = $state<WaveformSnapshot[]>([]);
  let timeRange = $state('7d');
  let selectedTriggerType = $state<string>('all');

  const triggerTypes = [
    { id: 'all', label: '全部类型' },
    { id: 'oxygen_low', label: '氧含量过低' },
    { id: 'oxygen_high', label: '氧含量过高' },
    { id: 'oxygen_rapid_change', label: '氧含量突变' },
    { id: 'oxygen_drift', label: '氧含量漂移' },
    { id: 'efficiency_low', label: '效率过低' },
    { id: 'fan_mismatch', label: '风机转速偏差' }
  ];

  const timeRanges = [
    { id: '1h', label: '最近1小时', ms: 60 * 60 * 1000 },
    { id: '6h', label: '最近6小时', ms: 6 * 60 * 60 * 1000 },
    { id: '24h', label: '最近24小时', ms: 24 * 60 * 60 * 1000 },
    { id: '7d', label: '最近7天', ms: 7 * 24 * 60 * 60 * 1000 },
    { id: '30d', label: '最近30天', ms: 30 * 24 * 60 * 60 * 1000 }
  ];

  const filteredSnapshots = $derived(() => {
    let result = snapshots;
    if (selectedTriggerType !== 'all') {
      result = result.filter((s) => s.triggerType === selectedTriggerType);
    }
    return result;
  });

  const stats = $derived(() => {
    const data = filteredSnapshots();
    const triggerCount: Record<string, number> = {};
    let totalDuration = 0;

    data.forEach((s) => {
      triggerCount[s.triggerType] = (triggerCount[s.triggerType] || 0) + 1;
      totalDuration += s.endTime - s.startTime;
    });

    return {
      total: data.length,
      triggerCount,
      avgDuration: data.length > 0 ? totalDuration / data.length / 1000 : 0
    };
  });

  const loadData = async () => {
    const range = timeRanges.find((r) => r.id === timeRange);
    if (range) {
      const endTime = Date.now();
      const startTime = endTime - range.ms;
      snapshots = await getSnapshotsByTimeRange(startTime, endTime);
    }
  };

  const exportData = () => {
    const data = filteredSnapshots();
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `boilerpulse-analysis-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getTriggerLabel = (type: string) => {
    return triggerTypes.find((t) => t.id === type)?.label || type;
  };

  const getSeverityColor = (type: string) => {
    if (type.includes('low') || type === 'efficiency_low') return 'text-red-400';
    if (type.includes('high') || type.includes('rapid')) return 'text-amber-400';
    return 'text-blue-400';
  };

  onMount(() => {
    loadData();
  });
</script>

<div class="p-6 h-full overflow-y-auto space-y-6">
  <div class="flex items-center justify-between">
    <h2 class="text-xl font-bold text-white">复盘分析</h2>
    <div class="flex items-center gap-3">
      <select
        bind:value={timeRange}
        onchange={loadData}
        class="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-blue-500"
      >
        {#each timeRanges as range}
          <option value={range.id}>{range.label}</option>
        {/each}
      </select>
      <button
        class="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition-all"
        onclick={exportData}
      >
        导出数据
      </button>
    </div>
  </div>

  <div class="grid grid-cols-4 gap-4">
    <div class="bg-slate-800/50 backdrop-blur border border-slate-700/50 rounded-xl p-5">
      <div class="text-slate-400 text-sm mb-2">异常事件总数</div>
      <div class="text-3xl font-bold font-mono text-white">{stats().total}</div>
    </div>
    <div class="bg-slate-800/50 backdrop-blur border border-slate-700/50 rounded-xl p-5">
      <div class="text-slate-400 text-sm mb-2">平均持续时间</div>
      <div class="text-3xl font-bold font-mono text-blue-400">{stats().avgDuration.toFixed(1)}s</div>
    </div>
    <div class="bg-slate-800/50 backdrop-blur border border-slate-700/50 rounded-xl p-5">
      <div class="text-slate-400 text-sm mb-2">事件类型数</div>
      <div class="text-3xl font-bold font-mono text-emerald-400">{Object.keys(stats().triggerCount).length}</div>
    </div>
    <div class="bg-slate-800/50 backdrop-blur border border-slate-700/50 rounded-xl p-5">
      <div class="text-slate-400 text-sm mb-2">筛选结果</div>
      <div class="text-3xl font-bold font-mono text-amber-400">{filteredSnapshots().length}</div>
    </div>
  </div>

  <div class="grid grid-cols-3 gap-6">
    <div class="col-span-1 bg-slate-800/50 backdrop-blur border border-slate-700/50 rounded-xl p-5">
      <h3 class="text-lg font-semibold text-white mb-4">类型筛选</h3>
      <div class="space-y-2">
        {#each triggerTypes as type}
          <button
            class={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all ${
              selectedTriggerType === type.id
                ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                : 'hover:bg-slate-700/50 text-slate-300'
            }`}
            onclick={() => (selectedTriggerType = type.id)}
          >
            <span class="flex items-center justify-between">
              <span>{type.label}</span>
              <span class="text-xs text-slate-500">
                {type.id === 'all' ? stats().total : stats().triggerCount[type.id] || 0}
              </span>
            </span>
          </button>
        {/each}
      </div>
    </div>

    <div class="col-span-2 bg-slate-800/50 backdrop-blur border border-slate-700/50 rounded-xl p-5">
      <h3 class="text-lg font-semibold text-white mb-4">事件类型分布</h3>
      <div class="space-y-3">
        {#each Object.entries(stats().triggerCount) as [type, count]}
          <div>
            <div class="flex items-center justify-between mb-1">
              <span class={`text-sm ${getSeverityColor(type)}`}>{getTriggerLabel(type)}</span>
              <span class="text-sm text-slate-400 font-mono">{count}</span>
            </div>
            <div class="h-2 bg-slate-700 rounded-full overflow-hidden">
              <div
                class={`h-full rounded-full ${
                  type.includes('low') || type === 'efficiency_low'
                    ? 'bg-red-500'
                    : type.includes('high') || type.includes('rapid')
                      ? 'bg-amber-500'
                      : 'bg-blue-500'
                }`}
                style={`width: ${(count / stats().total) * 100}%`}
              ></div>
            </div>
          </div>
        {/each}
        {#if Object.keys(stats().triggerCount).length === 0}
          <div class="flex flex-col items-center justify-center py-12 text-slate-500">
            <div class="text-4xl mb-2">📊</div>
            <div>暂无数据</div>
          </div>
        {/if}
      </div>
    </div>
  </div>

  <div class="bg-slate-800/50 backdrop-blur border border-slate-700/50 rounded-xl p-5">
    <h3 class="text-lg font-semibold text-white mb-4">异常事件列表</h3>
    <div class="overflow-x-auto">
      <table class="w-full">
        <thead>
          <tr class="text-left text-sm text-slate-400 border-b border-slate-700">
            <th class="pb-3 font-medium">时间</th>
            <th class="pb-3 font-medium">类型</th>
            <th class="pb-3 font-medium">持续时间</th>
            <th class="pb-3 font-medium">通道数</th>
            <th class="pb-3 font-medium">标签</th>
            <th class="pb-3 font-medium">备注</th>
          </tr>
        </thead>
        <tbody class="text-sm">
          {#each filteredSnapshots() as snapshot (snapshot.id)}
            <tr class="border-b border-slate-700/50 hover:bg-slate-700/20">
              <td class="py-3 text-slate-300 font-mono text-xs">
                {new Date(snapshot.startTime).toLocaleString('zh-CN')}
              </td>
              <td class="py-3">
                <span class={getSeverityColor(snapshot.triggerType)}>
                  {getTriggerLabel(snapshot.triggerType)}
                </span>
              </td>
              <td class="py-3 text-slate-400 font-mono">
                {((snapshot.endTime - snapshot.startTime) / 1000).toFixed(1)}s
              </td>
              <td class="py-3 text-slate-400">{snapshot.channels.length}</td>
              <td class="py-3">
                {#if snapshot.tags.length > 0}
                  <div class="flex flex-wrap gap-1">
                    {#each snapshot.tags.slice(0, 2) as tag}
                      <span class="px-2 py-0.5 bg-blue-600/20 rounded text-xs text-blue-400">{tag}</span>
                    {/each}
                    {#if snapshot.tags.length > 2}
                      <span class="text-xs text-slate-500">+{snapshot.tags.length - 2}</span>
                    {/if}
                  </div>
                {:else}
                  <span class="text-slate-600">-</span>
                {/if}
              </td>
              <td class="py-3 text-slate-400 max-w-xs truncate">
                {snapshot.notes || '-'}
              </td>
            </tr>
          {/each}
          {#if filteredSnapshots().length === 0}
            <tr>
              <td colspan="6" class="py-8 text-center text-slate-500">
                暂无符合条件的异常事件
              </td>
            </tr>
          {/if}
        </tbody>
      </table>
    </div>
  </div>
</div>
