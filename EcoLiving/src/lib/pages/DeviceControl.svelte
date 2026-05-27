<script lang="ts">
  import { Zap, Power, Clock, Settings, Search, Filter, Grid3X3, List, RefreshCw } from '@lucide/svelte';
  import DeviceCard from '@/lib/components/cards/DeviceCard.svelte';
  import StatCard from '@/lib/components/cards/StatCard.svelte';
  import WaveformChart from '@/lib/components/charts/WaveformChart.svelte';
  import { useEnergyStore } from '@/lib/stores/energyStore.svelte.ts';
  import { formatPower, formatDuration } from '@/lib/utils/formatters';
  import type { Device } from '@/lib/types/energy';

  const store = useEnergyStore();

  let searchQuery = $state('');
  let filterCategory = $state<string>('all');
  let viewMode = $state<'grid' | 'list'>('grid');
  let showOnlySmart = $state(false);

  const categories = $derived(() => {
    const cats = new Set(store.devices.map((d: Device) => d.category));
    return ['all', ...cats];
  });

  const categoryLabels: Record<string, string> = {
    all: '全部',
    climate: '空调暖通',
    kitchen: '厨房电器',
    entertainment: '娱乐设备',
    lighting: '照明系统',
    other: '其他',
  };

  const filteredDevices = $derived(() => {
    return store.devices.filter((device: Device) => {
      const matchesSearch = device.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        device.location.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = filterCategory === 'all' || device.category === filterCategory;
      const matchesSmart = !showOnlySmart || device.isSmart;
      return matchesSearch && matchesCategory && matchesSmart;
    });
  });

  const selectedDevice = $derived(() => 
    store.selectedDeviceId ? store.getDeviceById(store.selectedDeviceId) : null
  );

  const selectedDeviceReading = $derived(() => 
    store.selectedDeviceId ? store.getDeviceReading(store.selectedDeviceId) : null
  );

  const selectedDeviceWaveform = $derived(() => {
    const reading = selectedDeviceReading();
    if (!reading) return [];
    const basePower = reading.power || 100;
    return Array.from({ length: 60 }, () => {
      const noise = (Math.random() - 0.5) * basePower * 0.2;
      return Math.max(0, basePower + noise);
    });
  });

  const deviceStats = $derived(() => {
    const total = store.devices.length;
    const smart = store.devices.filter((d: Device) => d.isSmart).length;
    const on = store.activeDevicesCount;
    const standby = store.standbyDevicesCount;
    return { total, smart, on, standby };
  });

  function handleToggle(deviceId: string, isOn: boolean) {
    store.toggleDevice(deviceId, isOn);
  }

  function handleSelectDevice(deviceId: string) {
    store.selectDevice(deviceId === store.selectedDeviceId ? null : deviceId);
  }

  function handleTurnAllOff() {
    store.devices.forEach((device: Device) => {
      if (device.isSmart && device.isOn) {
        store.toggleDevice(device.id, false);
      }
    });
  }

  function handleTurnAllOn() {
    store.devices.forEach((device: Device) => {
      if (device.isSmart && !device.isOn) {
        store.toggleDevice(device.id, true);
      }
    });
  }
</script>

<div class="space-y-6">
  <div class="flex items-center justify-between">
    <div>
      <h1 class="text-2xl font-bold text-slate-100 mb-1">智能用电控制</h1>
      <p class="text-slate-400 text-sm">远程控制家电设备，优化用电方案</p>
    </div>
    <div class="flex items-center gap-3">
      <button 
        class="btn-secondary text-sm flex items-center gap-2"
        on:click={handleTurnAllOn}
      >
        <Power size={16} />
        全部开启
      </button>
      <button 
        class="btn-primary text-sm flex items-center gap-2"
        on:click={handleTurnAllOff}
      >
        <Power size={16} />
        一键节电
      </button>
    </div>
  </div>

  <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
    <StatCard
      title="设备总数"
      value={deviceStats().total}
      unit="台"
      icon={Zap}
      color="#00D4AA"
      delay={0}
    />
    <StatCard
      title="智能设备"
      value={deviceStats().smart}
      unit="台"
      icon={Settings}
      color="#3B82F6"
      delay={50}
    />
    <StatCard
      title="运行中"
      value={deviceStats().on}
      unit="台"
      icon={Power}
      color="#10B981"
      delay={100}
    />
    <StatCard
      title="待机中"
      value={deviceStats().standby}
      unit="台"
      icon={Clock}
      color="#F59E0B"
      delay={150}
    />
  </div>

  {#if selectedDevice()}
    <div class="glass-card p-5 animate-fade-in-up">
      <div class="flex items-start justify-between mb-4">
        <div class="flex items-center gap-4">
          <div 
            class="w-14 h-14 rounded-xl flex items-center justify-center"
            style="background: #00D4AA20;"
          >
            <Zap size={28} class="text-primary-400" />
          </div>
          <div>
            <h3 class="text-xl font-bold text-slate-100">{selectedDevice()?.name}</h3>
            <p class="text-slate-400 text-sm">{selectedDevice()?.location}</p>
          </div>
        </div>
        <button 
          class="btn-secondary text-sm px-4 py-2"
          on:click={() => store.selectDevice(null)}
        >
          关闭详情
        </button>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div class="md:col-span-2">
          <h4 class="text-sm font-medium text-slate-300 mb-3">实时负荷波形</h4>
          <WaveformChart
            data={selectedDeviceWaveform()}
            height={150}
            color="#00D4AA"
          />
        </div>
        <div class="space-y-3">
          <div class="p-4 bg-slate-800/50 rounded-lg">
            <span class="text-slate-400 text-sm">当前功率</span>
            <p class="text-2xl font-bold text-primary-400 font-mono mt-1">
              {selectedDeviceReading() ? formatPower(selectedDeviceReading()!.power) : '--'}
            </p>
          </div>
          <div class="p-4 bg-slate-800/50 rounded-lg">
            <span class="text-slate-400 text-sm">额定功率</span>
            <p class="text-xl font-semibold text-slate-200 font-mono mt-1">
              {selectedDevice()?.ratedPower} W
            </p>
          </div>
          {#if selectedDeviceReading()?.isStandby}
            <div class="p-4 bg-amber-500/10 rounded-lg border border-amber-500/30">
              <span class="text-amber-400 text-sm">待机时长</span>
              <p class="text-xl font-semibold text-amber-400 mt-1">
                {selectedDeviceReading()?.standbyDuration 
                  ? formatDuration(selectedDeviceReading()!.standbyDuration) 
                  : '--'}
              </p>
            </div>
          {/if}
          <div class="p-4 bg-slate-800/50 rounded-lg">
            <span class="text-slate-400 text-sm">设备状态</span>
            <p class="text-lg font-semibold mt-1">
              {#if selectedDeviceReading()?.isOn && !selectedDeviceReading()?.isStandby}
                <span class="text-green-400">运行中</span>
              {:else if selectedDeviceReading()?.isStandby}
                <span class="text-amber-400">待机</span>
              {:else}
                <span class="text-slate-500">已关闭</span>
              {/if}
            </p>
          </div>
        </div>
      </div>
    </div>
  {/if}

  <div class="glass-card p-4">
    <div class="flex flex-wrap items-center gap-4">
      <div class="relative flex-1 min-w-[200px]">
        <Search size={18} class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
        <input
          type="text"
          placeholder="搜索设备名称或位置..."
          class="w-full pl-10 pr-4 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-primary-500 transition-colors"
          bind:value={searchQuery}
        />
      </div>

      <div class="flex items-center gap-2">
        <Filter size={16} class="text-slate-500" />
        <select
          class="bg-slate-800/50 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-primary-500"
          bind:value={filterCategory}
        >
          {#each categories() as cat}
            <option value={cat}>{categoryLabels[cat] || cat}</option>
          {/each}
        </select>
      </div>

      <label class="flex items-center gap-2 cursor-pointer">
        <input 
          type="checkbox" 
          class="w-4 h-4 rounded border-slate-600 bg-slate-800 text-primary-500 focus:ring-primary-500"
          bind:checked={showOnlySmart}
        />
        <span class="text-sm text-slate-400">仅显示智能设备</span>
      </label>

      <div class="flex items-center gap-1 bg-slate-800/50 rounded-lg p-1">
        <button
          class="p-2 rounded-md transition-colors"
          class:bg-slate-700={viewMode === 'grid'}
          class:text-slate-400={viewMode !== 'grid'}
          class:text-slate-200={viewMode === 'grid'}
          on:click={() => viewMode = 'grid'}
        >
          <Grid3X3 size={18} />
        </button>
        <button
          class="p-2 rounded-md transition-colors"
          class:bg-slate-700={viewMode === 'list'}
          class:text-slate-400={viewMode !== 'list'}
          class:text-slate-200={viewMode === 'list'}
          on:click={() => viewMode = 'list'}
        >
          <List size={18} />
        </button>
      </div>
    </div>
  </div>

  {#if filteredDevices().length > 0}
    <div 
      class={viewMode === 'grid' 
        ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4' 
        : 'space-y-3'}
    >
      {#each filteredDevices() as device}
        <DeviceCard
          device={device}
          reading={store.getDeviceReading(device.id)}
          onToggle={handleToggle}
          onSelect={handleSelectDevice}
          selected={store.selectedDeviceId === device.id}
        />
      {/each}
    </div>
  {:else}
    <div class="glass-card p-12 text-center">
      <div class="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-800 flex items-center justify-center">
        <Search size={28} class="text-slate-600" />
      </div>
      <h3 class="text-lg font-medium text-slate-300 mb-2">未找到匹配的设备</h3>
      <p class="text-slate-500">尝试调整搜索条件或筛选器</p>
    </div>
  {/if}

  <div class="glass-card p-5">
    <h3 class="font-semibold text-slate-100 mb-4 flex items-center gap-2">
      <RefreshCw size={18} class="text-primary-400" />
      语义同步总线状态
    </h3>
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div class="p-4 bg-slate-800/50 rounded-lg text-center">
        <div class="w-3 h-3 mx-auto mb-2 rounded-full bg-green-500 animate-pulse" />
        <span class="text-sm text-slate-400">数据采集器</span>
        <p class="text-xs text-green-400 mt-1">{(store.engineStatus as Record<string, string>)['dataCollector'] || '运行中'}</p>
      </div>
      <div class="p-4 bg-slate-800/50 rounded-lg text-center">
        <div class="w-3 h-3 mx-auto mb-2 rounded-full bg-green-500 animate-pulse" />
        <span class="text-sm text-slate-400">待机追踪器</span>
        <p class="text-xs text-green-400 mt-1">{(store.engineStatus as Record<string, string>)['standbyTracker'] || '运行中'}</p>
      </div>
      <div class="p-4 bg-slate-800/50 rounded-lg text-center">
        <div class="w-3 h-3 mx-auto mb-2 rounded-full bg-green-500 animate-pulse" />
        <span class="text-sm text-slate-400">负荷识别引擎</span>
        <p class="text-xs text-green-400 mt-1">{(store.engineStatus as Record<string, string>)['loadRecognizer'] || '运行中'}</p>
      </div>
      <div class="p-4 bg-slate-800/50 rounded-lg text-center">
        <div class="w-3 h-3 mx-auto mb-2 rounded-full bg-green-500 animate-pulse" />
        <span class="text-sm text-slate-400">建议引擎</span>
        <p class="text-xs text-green-400 mt-1">{(store.engineStatus as Record<string, string>)['suggestionEngine'] || '运行中'}</p>
      </div>
    </div>
  </div>
</div>
