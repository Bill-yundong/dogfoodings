<script lang="ts">
  import { AlertTriangle, CheckCircle, Clock, TrendingDown, Cpu, Brain, BarChart3, Filter, Search } from '@lucide/svelte';
  import WastePointCard from '@/lib/components/cards/WastePointCard.svelte';
  import SuggestionCard from '@/lib/components/cards/SuggestionCard.svelte';
  import WaveformChart from '@/lib/components/charts/WaveformChart.svelte';
  import StatCard from '@/lib/components/cards/StatCard.svelte';
  import { useEnergyStore } from '@/lib/stores/energyStore.svelte.ts';
  import { getWasteLevelColor } from '@/lib/utils/formatters';
  import type { LoadFeature, EnergySuggestion } from '@/lib/types/energy';

  const store = useEnergyStore();

  let filterLevel = $state<string>('all');
  let filterResolved = $state<boolean>(false);
  let searchQuery = $state('');
  let selectedWasteId = $state<string | null>(null);

  const levels = [
    { value: 'all', label: '全部' },
    { value: 'critical', label: '紧急' },
    { value: 'high', label: '严重' },
    { value: 'medium', label: '中度' },
    { value: 'low', label: '轻度' },
  ];

  const filteredWastePoints = $derived(() => {
    return store.wastePoints.filter((wp: LoadFeature) => {
      const matchesLevel = filterLevel === 'all' || wp.wasteLevel === filterLevel;
      const matchesResolved = filterResolved ? wp.resolved : !wp.resolved;
      const matchesSearch = wp.deviceName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        wp.description.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesLevel && matchesResolved && matchesSearch;
    });
  });

  const selectedWaste = $derived(() => 
    selectedWasteId ? store.wastePoints.find((w: LoadFeature) => w.id === selectedWasteId) : null
  );

  const stats = $derived(() => {
    const total = store.wastePoints.length;
    const unresolved = store.wastePoints.filter((w: LoadFeature) => !w.resolved).length;
    const critical = store.wastePoints.filter((w: LoadFeature) => w.wasteLevel === 'critical' && !w.resolved).length;
    const high = store.wastePoints.filter((w: LoadFeature) => w.wasteLevel === 'high' && !w.resolved).length;
    
    const totalSaving = store.suggestions
      .filter((s: EnergySuggestion) => !s.implemented)
      .reduce((sum: number, s: EnergySuggestion) => sum + s.potentialSaving, 0);
    
    return { total, unresolved, critical, high, totalSaving };
  });

  const anomalyIndices = $derived(() => {
    const wp = selectedWaste();
    if (!wp) return [];
    const threshold = wp.waveform.length * 0.7;
    return wp.waveform
      .map((v: number, i: number) => v > threshold ? i : -1)
      .filter((i: number) => i >= 0);
  });

  const levelDistribution = $derived(() => {
    const dist: Record<string, number> = { critical: 0, high: 0, medium: 0, low: 0 };
    store.wastePoints.forEach((wp: LoadFeature) => {
      if (!wp.resolved) {
        dist[wp.wasteLevel] = (dist[wp.wasteLevel] || 0) + 1;
      }
    });
    return [
      { label: '紧急', value: dist.critical, color: '#DC2626' },
      { label: '严重', value: dist.high, color: '#EF4444' },
      { label: '中度', value: dist.medium, color: '#F97316' },
      { label: '轻度', value: dist.low, color: '#F59E0B' },
    ];
  });

  function handleResolve(id: string) {
    store.resolveWastePoint(id);
  }

  function handleDismiss(id: string) {
    store.resolveWastePoint(id);
  }

  function handleSelectWaste(id: string) {
    selectedWasteId = selectedWasteId === id ? null : id;
  }

  function handleImplementSuggestion(id: string) {
    store.implementSuggestion(id);
  }

  function handleDismissSuggestion(id: string) {
    store.dismissSuggestion(id);
  }
</script>

<div class="space-y-6">
  <div class="flex items-center justify-between">
    <div>
      <h1 class="text-2xl font-bold text-slate-100 mb-1">负荷特征识别</h1>
      <p class="text-slate-400 text-sm">智能识别隐性浪费点，提供优化建议</p>
    </div>
    <div class="flex items-center gap-3">
      <div class="glass-card px-4 py-2 flex items-center gap-2">
        <Brain size={16} class="text-primary-400 animate-pulse" />
        <span class="text-sm text-slate-300">AI 识别引擎运行中</span>
      </div>
    </div>
  </div>

  <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
    <StatCard
      title="待处理浪费点"
      value={stats().unresolved}
      unit="个"
      icon={AlertTriangle}
      color="#EF4444"
      delay={0}
    />
    <StatCard
      title="紧急浪费点"
      value={stats().critical}
      unit="个"
      icon={AlertTriangle}
      color="#DC2626"
      delay={50}
    />
    <StatCard
      title="预计节省"
      value={stats().totalSaving}
      unit="kWh/月"
      icon={TrendingDown}
      color="#10B981"
      delay={100}
    />
    <StatCard
      title="节能建议"
      value={store.suggestions.filter((s: EnergySuggestion) => !s.implemented).length}
      unit="条"
      icon={Brain}
      color="#8B5CF6"
      delay={150}
    />
  </div>

  <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
    <div class="lg:col-span-2 space-y-6">
      <div class="glass-card p-5">
        <div class="flex flex-wrap items-center gap-4 mb-4">
          <div class="relative flex-1 min-w-[200px]">
            <Search size={18} class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="搜索浪费点..."
              class="w-full pl-10 pr-4 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-primary-500 transition-colors"
              bind:value={searchQuery}
            />
          </div>
          <div class="flex items-center gap-2">
            <Filter size={16} class="text-slate-500" />
            <select
              class="bg-slate-800/50 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-primary-500"
              bind:value={filterLevel}
            >
              {#each levels as level}
                <option value={level.value}>{level.label}</option>
              {/each}
            </select>
          </div>
          <label class="flex items-center gap-2 cursor-pointer">
            <input 
              type="checkbox" 
              class="w-4 h-4 rounded border-slate-600 bg-slate-800 text-primary-500 focus:ring-primary-500"
              bind:checked={filterResolved}
            />
            <span class="text-sm text-slate-400">显示已处理</span>
          </label>
        </div>

        <div class="space-y-4 max-h-[600px] overflow-y-auto pr-2">
          {#if filteredWastePoints().length > 0}
            {#each filteredWastePoints() as wastePoint}
              <div on:click={() => handleSelectWaste(wastePoint.id)}>
                <WastePointCard
                  wastePoint={wastePoint}
                  onResolve={handleResolve}
                  onDismiss={handleDismiss}
                />
              </div>
            {/each}
          {:else}
            <div class="text-center py-12">
              <div class="w-16 h-16 mx-auto mb-4 rounded-full bg-green-500/10 flex items-center justify-center">
                <CheckCircle size={32} class="text-green-500" />
              </div>
              <h3 class="text-lg font-medium text-slate-300 mb-2">太棒了！</h3>
              <p class="text-slate-500">当前没有待处理的浪费点</p>
            </div>
          {/if}
        </div>
      </div>

      <div class="glass-card p-5">
        <h3 class="font-semibold text-slate-100 mb-4 flex items-center gap-2">
          <Brain size={18} class="text-primary-400" />
          智能节能建议
          <span class="ml-2 px-2 py-0.5 bg-primary-500/20 text-primary-400 text-xs rounded-full">
            {store.suggestions.filter((s: EnergySuggestion) => !s.implemented).length} 条
          </span>
        </h3>
        <div class="space-y-4 max-h-[400px] overflow-y-auto pr-2">
          {#if store.suggestions.filter((s: EnergySuggestion) => !s.implemented).length > 0}
            {#each store.suggestions.filter((s: EnergySuggestion) => !s.implemented) as suggestion}
              <SuggestionCard
                suggestion={suggestion}
                onImplement={handleImplementSuggestion}
                onDismiss={handleDismissSuggestion}
              />
            {/each}
          {:else}
            <div class="text-center py-8">
              <div class="w-12 h-12 mx-auto mb-3 rounded-full bg-green-500/10 flex items-center justify-center">
                <CheckCircle size={24} class="text-green-500" />
              </div>
              <p class="text-slate-500">所有建议已执行，用能状态良好</p>
            </div>
          {/if}
        </div>
      </div>
    </div>

    <div class="space-y-6">
      {#if selectedWaste()}
        <div class="glass-card p-5 animate-fade-in-up">
          <h3 class="font-semibold text-slate-100 mb-4 flex items-center gap-2">
            <BarChart3 size={18} class="text-primary-400" />
            负荷波形分析
          </h3>
          
          <div class="mb-4">
            <h4 class="text-sm font-medium text-slate-300 mb-2">{selectedWaste()?.deviceName}</h4>
            <p class="text-sm text-slate-400">{selectedWaste()?.description}</p>
          </div>

          <div class="mb-4">
            <WaveformChart
              data={selectedWaste()?.waveform || []}
              height={120}
              color="#00D4AA"
              anomalyColor="#EF4444"
              anomalies={anomalyIndices()}
            />
          </div>

          <div class="grid grid-cols-2 gap-3 mb-4">
            <div class="p-3 bg-slate-800/50 rounded-lg text-center">
              <span class="text-xs text-slate-500">异常评分</span>
              <p class="text-xl font-bold text-red-400 font-mono mt-1">
                {selectedWaste()?.anomalyScore.toFixed(1)}
              </p>
            </div>
            <div class="p-3 bg-slate-800/50 rounded-lg text-center">
              <span class="text-xs text-slate-500">置信度</span>
              <p class="text-xl font-bold text-primary-400 font-mono mt-1">
                {((selectedWaste()?.confidence || 0) * 100).toFixed(0)}%
              </p>
            </div>
            <div class="p-3 bg-slate-800/50 rounded-lg text-center">
              <span class="text-xs text-slate-500">模式匹配</span>
              <p class="text-xl font-bold text-blue-400 font-mono mt-1">
                {((selectedWaste()?.patternMatch || 0) * 100).toFixed(0)}%
              </p>
            </div>
            <div class="p-3 bg-slate-800/50 rounded-lg text-center">
              <span class="text-xs text-slate-500">浪费等级</span>
              <p 
                class="text-xl font-bold font-mono mt-1"
                style="color: {selectedWaste() ? getWasteLevelColor(selectedWaste()!.wasteLevel) : '#64748B'};"
              >
                {selectedWaste()?.wasteLevel === 'critical' ? '紧急' :
                 selectedWaste()?.wasteLevel === 'high' ? '严重' :
                 selectedWaste()?.wasteLevel === 'medium' ? '中度' : '轻度'}
              </p>
            </div>
          </div>

          <div class="p-4 bg-slate-800/50 rounded-lg">
            <div class="flex items-center gap-2 mb-2">
              <Clock size={14} class="text-slate-500" />
              <span class="text-xs text-slate-500">检测时间</span>
            </div>
            <p class="text-sm text-slate-300">
              {selectedWaste() ? new Date(selectedWaste()!.timestamp).toLocaleString('zh-CN') : '--'}
            </p>
          </div>
        </div>
      {/if}

      <div class="glass-card p-5">
        <h3 class="font-semibold text-slate-100 mb-4 flex items-center gap-2">
          <Cpu size={18} class="text-primary-400" />
          浪费等级分布
        </h3>
        <div class="space-y-3">
          {#each levelDistribution() as item}
            <div>
              <div class="flex items-center justify-between mb-1">
                <span class="text-sm text-slate-400">{item.label}</span>
                <span class="text-sm font-mono" style="color: {item.color};">{item.value}</span>
              </div>
              <div class="progress-bar">
                <div 
                  class="progress-bar-fill"
                  style="width: {Math.max(5, (item.value / Math.max(stats().unresolved, 1)) * 100)}%; background: {item.color};"
                />
              </div>
            </div>
          {/each}
        </div>
      </div>

      <div class="glass-card p-5">
        <h3 class="font-semibold text-slate-100 mb-4 flex items-center gap-2">
          <Brain size={18} class="text-primary-400" />
          识别引擎状态
        </h3>
        <div class="space-y-3">
          <div class="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg">
            <span class="text-sm text-slate-400">特征提取</span>
            <span class="flex items-center gap-2">
              <span class="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span class="text-sm text-green-400">活跃</span>
            </span>
          </div>
          <div class="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg">
            <span class="text-sm text-slate-400">模式匹配</span>
            <span class="flex items-center gap-2">
              <span class="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span class="text-sm text-green-400">活跃</span>
            </span>
          </div>
          <div class="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg">
            <span class="text-sm text-slate-400">异常检测</span>
            <span class="flex items-center gap-2">
              <span class="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span class="text-sm text-green-400">活跃</span>
            </span>
          </div>
          <div class="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg">
            <span class="text-sm text-slate-400">建议生成</span>
            <span class="flex items-center gap-2">
              <span class="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span class="text-sm text-green-400">活跃</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>
