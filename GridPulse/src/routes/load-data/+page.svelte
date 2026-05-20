<script lang="ts">
  import { $state } from 'svelte';
  import { 
    getUserSnapshots, 
    getUserSnapshotCount, 
    generateMockUserSnapshots,
    type UserSnapshot 
  } from '$lib/db/indexed-db';
  import ProgressBar from '$lib/components/ui/ProgressBar.svelte';

  let snapshots = $state<UserSnapshot[]>([]);
  let totalCount = $state(0);
  let isLoading = $state(true);
  let currentPage = $state(1);
  const pageSize = 20;
  let selectedPattern = $state<string>('all');

  const patternLabels: Record<string, string> = {
    'all': '全部',
    'morning-peak': '早峰型',
    'evening-peak': '晚峰型',
    'flat': '平稳型',
    'night-owl': '夜猫子型',
    'industrial': '工业型'
  };

  const patternColors: Record<string, string> = {
    'morning-peak': 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    'evening-peak': 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    'flat': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    'night-owl': 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    'industrial': 'bg-green-500/20 text-green-400 border-green-500/30'
  };

  async function loadData() {
    isLoading = true;
    try {
      const options = { limit: pageSize, offset: (currentPage - 1) * pageSize };
      if (selectedPattern !== 'all') {
        (options as any).patternType = selectedPattern;
      }
      
      snapshots.value = await getUserSnapshots(options);
      totalCount.value = await getUserSnapshotCount();
    } finally {
      isLoading = false;
    }
  }

  async function handleGenerateMockData() {
    isLoading = true;
    try {
      await generateMockUserSnapshots(1000);
      await loadData();
    } finally {
      isLoading = false;
    }
  }

  function formatDate(date: Date) {
    return new Date(date).toLocaleString('zh-CN');
  }

  function getFlexibilityColor(score: number) {
    return score > 0.7 ? 'text-green-400' : score > 0.4 ? 'text-yellow-400' : 'text-red-400';
  }

  onMount(() => {
    loadData();
  });

  $effect(() => {
    loadData();
  });
</script>

<div class="space-y-6">
  <div class="flex items-center justify-between">
    <div>
      <h3 class="text-lg font-bold text-white">用户用能特征快照</h3>
      <p class="text-sm text-dark-400">共 {totalCount} 条记录</p>
    </div>
    <div class="flex items-center gap-3">
      <select 
        class="input-field"
        bind:value={selectedPattern}
        onchange={() => { currentPage = 1; loadData(); }}
      >
        {#each Object.entries(patternLabels) as [value, label]}
          <option value={value}>{label}</option>
        {/each}
      </select>
      <button class="btn-secondary" onclick={handleGenerateMockData} disabled={isLoading}>
        生成模拟数据 (1000条)
      </button>
    </div>
  </div>

  <div class="grid grid-cols-1 md:grid-cols-5 gap-4">
    {#each Object.entries(patternLabels).filter(([k]) => k !== 'all') as [type, label]}
      <div class="card">
        <p class="text-sm text-dark-400">{label}</p>
        <p class="text-2xl font-bold text-white mt-1">
          {snapshots.filter(s => s.patternType === type).length}
        </p>
      </div>
    {/each}
  </div>

  <div class="card">
    {#if isLoading}
      <div class="flex items-center justify-center py-12">
        <svg class="animate-spin w-8 h-8 text-accent-400" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      </div>
    {:else}
      <div class="overflow-x-auto">
        <table class="w-full">
          <thead>
            <tr class="text-left text-dark-400 text-sm border-b border-dark-700">
              <th class="pb-3">用户ID</th>
              <th class="pb-3">用电模式</th>
              <th class="pb-3">峰荷 (kW)</th>
              <th class="pb-3">平均负荷 (kW)</th>
              <th class="pb-3">负荷率</th>
              <th class="pb-3">柔性评分</th>
              <th class="pb-3">快照时间</th>
            </tr>
          </thead>
          <tbody class="text-sm">
            {#each snapshots as snapshot}
              <tr class="border-b border-dark-800 hover:bg-dark-800/30">
                <td class="py-3 font-mono text-accent-400">{snapshot.userId}</td>
                <td class="py-3">
                  <span class={`px-2 py-1 rounded-full text-xs border ${patternColors[snapshot.patternType] || ''}`}>
                    {patternLabels[snapshot.patternType] || snapshot.patternType}
                  </span>
                </td>
                <td class="py-3 font-mono">{snapshot.loadFeatures.peakLoad.toFixed(2)}</td>
                <td class="py-3 font-mono">{snapshot.loadFeatures.averageLoad.toFixed(2)}</td>
                <td class="py-3">
                  <div class="w-24">
                    <ProgressBar 
                      value={snapshot.loadFeatures.loadFactor * 100} 
                      showValue={false}
                      color="accent"
                    />
                  </div>
                </td>
                <td class={`py-3 font-mono ${getFlexibilityColor(snapshot.flexibilityScore)}`}>
                  {(snapshot.flexibilityScore * 100).toFixed(0)}%
                </td>
                <td class="py-3 text-dark-400">{formatDate(snapshot.timestamp)}</td>
              </tr>
            {/each}
            {#if snapshots.length === 0}
              <tr>
                <td colspan="7" class="py-12 text-center text-dark-500">
                  暂无数据，点击"生成模拟数据"创建测试数据
                </td>
              </tr>
            {/if}
          </tbody>
        </table>
      </div>

      <div class="flex items-center justify-between mt-4 pt-4 border-t border-dark-700">
        <p class="text-sm text-dark-400">
          显示 {(currentPage - 1) * pageSize + 1} - {Math.min(currentPage * pageSize, totalCount)} 条
        </p>
        <div class="flex items-center gap-2">
          <button 
            class="btn-secondary px-3 py-1"
            onclick={() => { currentPage--; loadData(); }}
            disabled={currentPage <= 1}
          >
            上一页
          </button>
          <span class="text-sm text-dark-400">
            第 {currentPage} / {Math.ceil(totalCount / pageSize)} 页
          </span>
          <button 
            class="btn-secondary px-3 py-1"
            onclick={() => { currentPage++; loadData(); }}
            disabled={currentPage * pageSize >= totalCount}
          >
            下一页
          </button>
        </div>
      </div>
    {/if}
  </div>

  {#if snapshots.length > 0}
    <div class="card">
      <h3 class="text-lg font-bold text-white mb-4">24小时用电曲线 - {snapshots[0]?.userId}</h3>
      <div class="h-64 relative">
        <svg viewBox="0 0 800 200" class="w-full h-full">
          <defs>
            <linearGradient id="lineGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stop-color="#06b6d4" stop-opacity="0.3"/>
              <stop offset="100%" stop-color="#06b6d4" stop-opacity="0"/>
            </linearGradient>
          </defs>
          
          {#each [0, 25, 50, 75, 100] as tick}
            <line 
              x1="50" 
              y1={20 + (160 * tick / 100)} 
              x2="780" 
              y2={20 + (160 * tick / 100)} 
              stroke="rgba(6, 182, 212, 0.1)" 
              stroke-width="1"
            />
          {/each}
          
          {#if snapshots[0]}
            {#const data = snapshots[0].loadFeatures.hourlyConsumption}
            {#const maxVal = Math.max(...data)}
            {#const points = data.map((val, i) => `${50 + (i * 730 / 23)},${180 - (val / maxVal) * 160}`).join(' ')}
            
            <polygon 
              points={`50,180 ${points} 780,180`} 
              fill="url(#lineGradient)"
            />
            <polyline 
              points={points} 
              fill="none" 
              stroke="#06b6d4" 
              stroke-width="2"
            />
            
            {#each data as val, i}
              <circle 
                cx={50 + (i * 730 / 23)} 
                cy={180 - (val / maxVal) * 160} 
                r="3" 
                fill="#06b6d4"
              />
            {/each}
            
            {#each Array.from({ length: 9 }, (_, i) => i * 3) as hour}
              <text 
                x={50 + (hour * 730 / 23)} 
                y="195" 
                text-anchor="middle" 
                fill="#64748b" 
                font-size="10"
              >
                {hour}:00
              </text>
            {/each}
          {/if}
        </svg>
      </div>
    </div>
  {/if}
</div>
