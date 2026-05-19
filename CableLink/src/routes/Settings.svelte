<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { realtimeStore } from '@/stores/realtime';
  import { getStorageStats, clearOldData } from '@/db';
  import { createSemanticMapper } from '@/alignment/mapping';
  import type { MappingRule } from '@/alignment/mapping';

  let activeTab = $state('cable');
  let storageStats = $state<{
    sensorRecords: number;
    alertRecords: number;
    predictionRecords: number;
    estimatedSizeMB: number;
  } | null>(null);
  let mappings = $state<MappingRule[]>([]);
  let isClearing = $state(false);

  const mapper = createSemanticMapper();

  const { cableParams, updateRate, setUpdateRate, setCableParams } = realtimeStore;

  const loadStorageStats = async () => {
    storageStats = await getStorageStats();
  };

  let intervalId: number | null = null;

  onMount(() => {
    loadStorageStats();
    mappings = mapper.getMappings();
    intervalId = window.setInterval(() => {
      loadStorageStats();
    }, 30000);
  });

  onDestroy(() => {
    if (intervalId) clearInterval(intervalId);
  });

  const handleClearOldData = async (days: number) => {
    if (!confirm(`确定要清除 ${days} 天前的历史数据吗？此操作不可撤销。`)) return;
    isClearing = true;
    try {
      await clearOldData(days);
      await loadStorageStats();
    } finally {
      isClearing = false;
    }
  };

  const updateCableParam = (key: keyof typeof $cableParams, value: number | string) => {
    setCableParams({ [key]: value } as any);
  };

  const tabs = [
    { id: 'cable', label: '海缆参数', icon: '🔌' },
    { id: 'thresholds', label: '告警阈值', icon: '⚠️' },
    { id: 'semantic', label: '语义映射', icon: '🔗' },
    { id: 'storage', label: '数据存储', icon: '💾' },
    { id: 'about', label: '关于系统', icon: 'ℹ️' }
  ];
</script>

<div class="p-6 space-y-6">
  <div>
    <h1 class="text-2xl font-bold text-white">系统设置</h1>
    <p class="text-gray-400 mt-1">系统参数配置与管理</p>
  </div>

  <div class="flex flex-wrap gap-2 border-b border-gray-700 pb-2" role="tablist">
    {#each tabs as tab}
      <button
        role="tab"
        aria-selected={activeTab === tab.id}
        onclick={() => activeTab = tab.id}
        class={`px-4 py-2 rounded-t-lg text-sm font-medium transition-colors ${
          activeTab === tab.id
            ? 'bg-space-light text-tech-cyan border-b-2 border-tech-cyan'
            : 'text-gray-400 hover:text-white'
        }`}
      >
        <span class="mr-2">{tab.icon}</span>
        {tab.label}
      </button>
    {/each}
  </div>

  {#if activeTab === 'cable'}
    <div class="panel-glow p-6">
      <h3 class="text-lg font-semibold text-white mb-6">海缆物理参数</h3>
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div>
          <label class="block text-sm text-gray-400 mb-2" for="cable-name">海缆名称</label>
          <input
            id="cable-name"
            type="text"
            value={$cableParams.name}
            onchange={(e) => setCableParams({ name: (e.target as HTMLInputElement).value })}
            class="w-full px-4 py-2 bg-space-light border border-tech-cyan/30 rounded-lg text-white focus:outline-none focus:border-tech-cyan"
          />
        </div>
        <div>
          <label class="block text-sm text-gray-400 mb-2" for="cable-length">海缆长度 (m)</label>
          <input
            id="cable-length"
            type="number"
            value={$cableParams.length}
            onchange={(e) => updateCableParam('length', Number((e.target as HTMLInputElement).value))}
            class="w-full px-4 py-2 bg-space-light border border-tech-cyan/30 rounded-lg text-white focus:outline-none focus:border-tech-cyan"
          />
        </div>
        <div>
          <label class="block text-sm text-gray-400 mb-2" for="max-current">额定电流 (A)</label>
          <input
            id="max-current"
            type="number"
            value={$cableParams.maxCurrent}
            onchange={(e) => updateCableParam('maxCurrent', Number((e.target as HTMLInputElement).value))}
            class="w-full px-4 py-2 bg-space-light border border-tech-cyan/30 rounded-lg text-white focus:outline-none focus:border-tech-cyan"
          />
        </div>
        <div>
          <label class="block text-sm text-gray-400 mb-2" for="max-temp">最高允许温度 (°C)</label>
          <input
            id="max-temp"
            type="number"
            value={$cableParams.maxTemperature}
            onchange={(e) => updateCableParam('maxTemperature', Number((e.target as HTMLInputElement).value))}
            class="w-full px-4 py-2 bg-space-light border border-tech-cyan/30 rounded-lg text-white focus:outline-none focus:border-tech-cyan"
          />
        </div>
        <div>
          <label class="block text-sm text-gray-400 mb-2" for="thermal-resistance">热阻系数 (K·m/W)</label>
          <input
            id="thermal-resistance"
            type="number"
            step="0.01"
            value={$cableParams.thermalResistance}
            onchange={(e) => updateCableParam('thermalResistance', Number((e.target as HTMLInputElement).value))}
            class="w-full px-4 py-2 bg-space-light border border-tech-cyan/30 rounded-lg text-white focus:outline-none focus:border-tech-cyan"
          />
        </div>
        <div>
          <label class="block text-sm text-gray-400 mb-2" for="ambient-temp">环境温度 (°C)</label>
          <input
            id="ambient-temp"
            type="number"
            step="0.1"
            value={$cableParams.ambientTemperature}
            onchange={(e) => updateCableParam('ambientTemperature', Number((e.target as HTMLInputElement).value))}
            class="w-full px-4 py-2 bg-space-light border border-tech-cyan/30 rounded-lg text-white focus:outline-none focus:border-tech-cyan"
          />
        </div>
        <div>
          <label class="block text-sm text-gray-400 mb-2" for="conductor-resistance">导体电阻 (Ω/km)</label>
          <input
            id="conductor-resistance"
            type="number"
            step="0.001"
            value={$cableParams.conductorResistance}
            onchange={(e) => updateCableParam('conductorResistance', Number((e.target as HTMLInputElement).value))}
            class="w-full px-4 py-2 bg-space-light border border-tech-cyan/30 rounded-lg text-white focus:outline-none focus:border-tech-cyan"
          />
        </div>
        <div>
          <label class="block text-sm text-gray-400 mb-2" for="update-rate">数据更新频率 (ms)</label>
          <input
            id="update-rate"
            type="number"
            min="100"
            max="5000"
            step="100"
            value={$updateRate}
            onchange={(e) => setUpdateRate(Number((e.target as HTMLInputElement).value))}
            class="w-full px-4 py-2 bg-space-light border border-tech-cyan/30 rounded-lg text-white focus:outline-none focus:border-tech-cyan"
          />
        </div>
      </div>
    </div>
  {/if}

  {#if activeTab === 'thresholds'}
    <div class="panel-glow p-6">
      <h3 class="text-lg font-semibold text-white mb-6">告警阈值配置</h3>
      <div class="space-y-6">
        <div class="p-4 bg-space-light/50 rounded-lg">
          <h4 class="font-medium text-white mb-4">温度告警阈值</h4>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label class="block text-sm text-gray-400 mb-2" for="temp-info">信息级 (°C)</label>
              <input id="temp-info" type="number" value={Math.round($cableParams.maxTemperature * 0.75)} class="w-full px-3 py-2 bg-space-dark border border-gray-600 rounded text-white" />
            </div>
            <div>
              <label class="block text-sm text-gray-400 mb-2" for="temp-warning">警告级 (°C)</label>
              <input id="temp-warning" type="number" value={Math.round($cableParams.maxTemperature * 0.85)} class="w-full px-3 py-2 bg-space-dark border border-gray-600 rounded text-white" />
            </div>
            <div>
              <label class="block text-sm text-gray-400 mb-2" for="temp-danger">严重级 (°C)</label>
              <input id="temp-danger" type="number" value={Math.round($cableParams.maxTemperature * 0.95)} class="w-full px-3 py-2 bg-space-dark border border-gray-600 rounded text-white" />
            </div>
          </div>
        </div>
        <div class="p-4 bg-space-light/50 rounded-lg">
          <h4 class="font-medium text-white mb-4">电流告警阈值</h4>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label class="block text-sm text-gray-400 mb-2" for="current-info">信息级 (A)</label>
              <input id="current-info" type="number" value={Math.round($cableParams.maxCurrent * 0.75)} class="w-full px-3 py-2 bg-space-dark border border-gray-600 rounded text-white" />
            </div>
            <div>
              <label class="block text-sm text-gray-400 mb-2" for="current-warning">警告级 (A)</label>
              <input id="current-warning" type="number" value={Math.round($cableParams.maxCurrent * 0.85)} class="w-full px-3 py-2 bg-space-dark border border-gray-600 rounded text-white" />
            </div>
            <div>
              <label class="block text-sm text-gray-400 mb-2" for="current-danger">严重级 (A)</label>
              <input id="current-danger" type="number" value={Math.round($cableParams.maxCurrent * 0.95)} class="w-full px-3 py-2 bg-space-dark border border-gray-600 rounded text-white" />
            </div>
          </div>
        </div>
        <button class="btn-primary">保存配置</button>
      </div>
    </div>
  {/if}

  {#if activeTab === 'semantic'}
    <div class="panel-glow p-6">
      <h3 class="text-lg font-semibold text-white mb-6">语义映射规则</h3>
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="text-left text-gray-400 border-b border-gray-700">
              <th class="py-3 px-4 font-medium">源系统</th>
              <th class="py-3 px-4 font-medium">源字段</th>
              <th class="py-3 px-4 font-medium">目标字段</th>
              <th class="py-3 px-4 font-medium">转换规则</th>
              <th class="py-3 px-4 font-medium">数据类型</th>
            </tr>
          </thead>
          <tbody>
            {#each mappings as mapping}
              <tr class="border-b border-gray-800 hover:bg-space-light/30">
                <td class="py-3 px-4 text-tech-cyan">{mapping.sourceSystem}</td>
                <td class="py-3 px-4 font-mono text-gray-300">{mapping.sourcePath}</td>
                <td class="py-3 px-4 font-mono text-safe-green">{mapping.targetPath}</td>
                <td class="py-3 px-4 font-mono text-warning-orange">{mapping.transformation}</td>
                <td class="py-3 px-4">
                  <span class="badge badge-info">{mapping.dataType}</span>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    </div>
  {/if}

  {#if activeTab === 'storage'}
    <div class="space-y-6">
      {#if storageStats}
        <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div class="panel p-4">
            <p class="text-xs text-gray-400 mb-1">传感器数据</p>
            <p class="text-2xl font-bold text-tech-cyan font-mono">{storageStats.sensorRecords.toLocaleString()}</p>
            <p class="text-xs text-gray-500">条记录</p>
          </div>
          <div class="panel p-4">
            <p class="text-xs text-gray-400 mb-1">告警数据</p>
            <p class="text-2xl font-bold text-warning-orange font-mono">{storageStats.alertRecords.toLocaleString()}</p>
            <p class="text-xs text-gray-500">条记录</p>
          </div>
          <div class="panel p-4">
            <p class="text-xs text-gray-400 mb-1">预测数据</p>
            <p class="text-2xl font-bold text-safe-green font-mono">{storageStats.predictionRecords.toLocaleString()}</p>
            <p class="text-xs text-gray-500">条记录</p>
          </div>
          <div class="panel p-4">
            <p class="text-xs text-gray-400 mb-1">存储占用</p>
            <p class="text-2xl font-bold text-white font-mono">{storageStats.estimatedSizeMB.toFixed(2)}</p>
            <p class="text-xs text-gray-500">MB</p>
          </div>
        </div>
      {/if}

      <div class="panel-glow p-6">
        <h3 class="text-lg font-semibold text-white mb-4">数据清理</h3>
        <p class="text-gray-400 mb-4">定期清理历史数据可以释放存储空间，提高系统性能。</p>
        <div class="flex flex-wrap gap-3">
          <button
            onclick={() => handleClearOldData(7)}
            disabled={isClearing}
            class="btn-secondary text-sm"
          >
            清除 7 天前数据
          </button>
          <button
            onclick={() => handleClearOldData(30)}
            disabled={isClearing}
            class="btn-secondary text-sm"
          >
            清除 30 天前数据
          </button>
          <button
            onclick={() => handleClearOldData(90)}
            disabled={isClearing}
            class="btn-danger text-sm"
          >
            清除 90 天前数据
          </button>
        </div>
        <p class="text-xs text-gray-500 mt-4">⚠️ 数据清理操作不可撤销，请谨慎操作。</p>
      </div>
    </div>
  {/if}

  {#if activeTab === 'about'}
    <div class="panel-glow p-6">
      <div class="text-center py-8">
        <div class="w-20 h-20 rounded-2xl bg-gradient-to-br from-deep-sea to-tech-cyan flex items-center justify-center text-4xl font-bold text-white mx-auto mb-6">
          C
        </div>
        <h2 class="text-3xl font-bold text-white mb-2">CableLink</h2>
        <p class="text-gray-400 mb-6">海底电缆温升负载预测系统</p>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-2xl mx-auto text-left">
          <div class="p-4 bg-space-light/50 rounded-lg">
            <p class="text-xs text-gray-400 mb-1">版本</p>
            <p class="text-lg font-semibold text-white">0.1.0</p>
          </div>
          <div class="p-4 bg-space-light/50 rounded-lg">
            <p class="text-xs text-gray-400 mb-1">技术栈</p>
            <p class="text-lg font-semibold text-white">Svelte 5</p>
          </div>
          <div class="p-4 bg-space-light/50 rounded-lg">
            <p class="text-xs text-gray-400 mb-1">构建时间</p>
            <p class="text-lg font-semibold text-white">{new Date().toLocaleDateString('zh-CN')}</p>
          </div>
        </div>
        <p class="text-sm text-gray-500 mt-8">
          © 2024 CableLink Team. 基于多重物理场耦合的海底电缆温度预测系统。
        </p>
      </div>
    </div>
  {/if}
</div>
