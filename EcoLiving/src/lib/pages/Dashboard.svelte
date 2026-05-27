<script lang="ts">
  import { Zap, Clock, TrendingUp, AlertTriangle, Gauge, Activity, DollarSign, Cpu } from '@lucide/svelte';
  import StatCard from '@/lib/components/cards/StatCard.svelte';
  import AreaChart from '@/lib/components/charts/AreaChart.svelte';
  import DonutChart from '@/lib/components/charts/DonutChart.svelte';
  import DeviceCard from '@/lib/components/cards/DeviceCard.svelte';
  import SuggestionCard from '@/lib/components/cards/SuggestionCard.svelte';
  import { useEnergyStore } from '@/lib/stores/energyStore.svelte.ts';
  import { formatCost } from '@/lib/utils/formatters';
  import type { DeviceReading, Device } from '@/lib/types/energy';

  const store = useEnergyStore();

  const chartData = $derived(() => 
    store.energyTrend().map((t: { timestamp: number; total: number; standby: number }) => ({
      timestamp: t.timestamp,
      value: t.total,
      value2: t.standby,
    }))
  );

  const categoryBreakdown = $derived(() => {
    const breakdown: Record<string, number> = {};
    if (!store.currentReading) return [];
    
    store.currentReading.devices.forEach((d: DeviceReading) => {
      const device = store.devices.find((dev: Device) => dev.id === d.deviceId);
      if (device && d.power > 0) {
        const category = device.category;
        breakdown[category] = (breakdown[category] || 0) + d.power;
      }
    });

    const colors: Record<string, string> = {
      climate: '#3B82F6',
      kitchen: '#F59E0B',
      entertainment: '#8B5CF6',
      lighting: '#00D4AA',
      other: '#64748B',
    };

    const labels: Record<string, string> = {
      climate: '空调暖通',
      kitchen: '厨房电器',
      entertainment: '娱乐设备',
      lighting: '照明系统',
      other: '其他设备',
    };

    return Object.entries(breakdown).map(([category, value]: [string, number]) => ({
      label: labels[category] || category,
      value,
      color: colors[category] || '#64748B',
    }));
  });

  const topDevices = $derived(() => {
    if (!store.currentReading) return [];
    return [...store.currentReading.devices]
      .sort((a: DeviceReading, b: DeviceReading) => b.power - a.power)
      .slice(0, 4);
  });

  function handleToggle(deviceId: string, isOn: boolean) {
    store.toggleDevice(deviceId, isOn);
  }

  function handleSelectDevice(deviceId: string) {
    store.selectDevice(deviceId);
    store.navigate('/control');
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
      <h1 class="text-2xl font-bold text-slate-100 mb-1">节能中枢</h1>
      <p class="text-slate-400 text-sm">实时监控家庭能耗，智能识别浪费点</p>
    </div>
    <div class="flex items-center gap-3">
      <div class="glass-card px-4 py-2 flex items-center gap-2">
        <Activity size={16} class="text-primary-400 animate-pulse" />
        <span class="text-sm text-slate-300">系统运行中</span>
      </div>
    </div>
  </div>

  <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
    <StatCard
      title="实时功率"
      value={store.totalPower}
      unit="W"
      icon={Zap}
      color="#00D4AA"
      trend={-5.2}
      trendLabel="较昨日"
      delay={0}
    />
    <StatCard
      title="待机功耗"
      value={store.standbyPower}
      unit="W"
      icon={Clock}
      color="#F59E0B"
      trend={12.8}
      trendLabel="较昨日"
      delay={50}
    />
    <StatCard
      title="今日能耗"
      value={store.todayConsumption}
      unit="kWh"
      icon={TrendingUp}
      color="#3B82F6"
      delay={100}
    />
    <StatCard
      title="节能评分"
      value={store.efficiencyScore}
      unit="分"
      icon={Gauge}
      color="#8B5CF6"
      trend={3.5}
      trendLabel="较上周"
      delay={150}
    />
  </div>

  <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
    <div class="lg:col-span-2 glass-card p-5">
      <div class="flex items-center justify-between mb-4">
        <h3 class="font-semibold text-slate-100 flex items-center gap-2">
          <Activity size={18} class="text-primary-400" />
          能耗趋势
        </h3>
        <div class="flex items-center gap-4 text-xs">
          <span class="flex items-center gap-2">
            <span class="w-3 h-3 rounded-full bg-primary-500" />
            总功率
          </span>
          <span class="flex items-center gap-2">
            <span class="w-3 h-3 rounded-full bg-blue-500" style="border-radius: 0;" />
            待机功率
          </span>
        </div>
      </div>
      <AreaChart
        data={chartData()}
        height={250}
        color="#00D4AA"
        color2="#3B82F6"
        showGradient={true}
        showArea={true}
        showLine={true}
      />
    </div>

    <div class="glass-card p-5">
      <h3 class="font-semibold text-slate-100 mb-4 flex items-center gap-2">
        <Cpu size={18} class="text-primary-400" />
        分类能耗
      </h3>
      <DonutChart
        segments={categoryBreakdown()}
        size={180}
        thickness={20}
        showLabels={true}
      />
    </div>
  </div>

  <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
    <div class="lg:col-span-2 glass-card p-5">
      <div class="flex items-center justify-between mb-4">
        <h3 class="font-semibold text-slate-100 flex items-center gap-2">
          <Zap size={18} class="text-primary-400" />
          高功耗设备
        </h3>
        <button 
          class="text-sm text-primary-400 hover:text-primary-300 transition-colors"
          on:click={() => store.navigate('/control')}
        >
          查看全部 →
        </button>
      </div>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {#each topDevices() as deviceReading}
          {#if store.getDeviceById(deviceReading.deviceId)}
            {@const device = store.getDeviceById(deviceReading.deviceId)!}
            <DeviceCard
              device={device}
              reading={deviceReading}
              onToggle={handleToggle}
              onSelect={handleSelectDevice}
              selected={store.selectedDeviceId === device.id}
            />
          {/if}
        {/each}
      </div>
    </div>

    <div class="glass-card p-5">
      <div class="flex items-center justify-between mb-4">
        <h3 class="font-semibold text-slate-100 flex items-center gap-2">
          <DollarSign size={18} class="text-primary-400" />
          费用估算
        </h3>
      </div>
      <div class="space-y-4">
        <div class="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg">
          <span class="text-slate-400 text-sm">月度预估</span>
          <span class="text-xl font-bold text-primary-400 font-mono">
            {formatCost(store.estimatedCost())}
          </span>
        </div>
        <div class="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg">
          <span class="text-slate-400 text-sm">今日电费</span>
          <span class="text-lg font-semibold text-slate-200 font-mono">
            {formatCost(store.todayConsumption() * 0.56)}
          </span>
        </div>
        <div class="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg">
          <span class="text-slate-400 text-sm">运行设备</span>
          <span class="text-lg font-semibold text-slate-200">
            {store.activeDevicesCount()} / {store.devices.length}
          </span>
        </div>
        <div class="flex items-center justify-between p-3 bg-amber-500/10 rounded-lg border border-amber-500/30">
          <span class="text-amber-400 text-sm flex items-center gap-2">
            <AlertTriangle size={14} />
            待机设备
          </span>
          <span class="text-lg font-semibold text-amber-400">
            {store.standbyDevicesCount()} 台
          </span>
        </div>
      </div>
    </div>
  </div>

  {#if store.highPrioritySuggestions().length > 0}
    <div class="glass-card p-5">
      <div class="flex items-center justify-between mb-4">
        <h3 class="font-semibold text-slate-100 flex items-center gap-2">
          <AlertTriangle size={18} class="text-amber-400" />
          节能建议
          <span class="ml-2 px-2 py-0.5 bg-amber-500/20 text-amber-400 text-xs rounded-full">
            {store.highPrioritySuggestions().length} 条待处理
          </span>
        </h3>
        <button 
          class="text-sm text-primary-400 hover:text-primary-300 transition-colors"
          on:click={() => store.navigate('/detection')}
        >
          查看全部 →
        </button>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        {#each store.highPrioritySuggestions().slice(0, 2) as suggestion}
          <SuggestionCard
            suggestion={suggestion}
            onImplement={handleImplementSuggestion}
            onDismiss={handleDismissSuggestion}
          />
        {/each}
      </div>
    </div>
  {/if}
</div>
