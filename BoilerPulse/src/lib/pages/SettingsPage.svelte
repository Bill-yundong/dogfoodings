<script lang="ts">
  import { onMount } from 'svelte';
  import { getStorageInfo, clearDB } from '$lib/db';
  import { DEFAULT_THRESHOLDS, type DetectionThresholds } from '$lib/services/detector';
  import { anomalyDetector } from '$lib/services/detector';
  import { DEFAULT_MPC_CONFIG, type MPCConfig } from '$lib/services/mpc';
  import { mpcController } from '$lib/services/mpc';

  let storageInfo = $state({ used: 0, quota: 0, usageDetails: {} as Record<string, number> });
  let thresholds = $state<DetectionThresholds>({ ...DEFAULT_THRESHOLDS });
  let mpcConfig = $state<MPCConfig>({ ...DEFAULT_MPC_CONFIG });
  let saveStatus = $state('');

  const loadStorageInfo = async () => {
    storageInfo = await getStorageInfo();
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleClearDB = async () => {
    if (confirm('确定要清空所有本地存储数据吗？此操作不可恢复！')) {
      await clearDB();
      loadStorageInfo();
      alert('数据已清空');
    }
  };

  const saveThresholds = () => {
    anomalyDetector.updateThresholds(thresholds);
    saveStatus = '阈值已保存';
    setTimeout(() => (saveStatus = ''), 2000);
  };

  const saveMPCConfig = () => {
    mpcController.updateConfig(mpcConfig);
    saveStatus = 'MPC 配置已保存';
    setTimeout(() => (saveStatus = ''), 2000);
  };

  const resetThresholds = () => {
    thresholds = { ...DEFAULT_THRESHOLDS };
    anomalyDetector.updateThresholds(thresholds);
  };

  const resetMPCConfig = () => {
    mpcConfig = { ...DEFAULT_MPC_CONFIG };
    mpcController.updateConfig(mpcConfig);
  };

  onMount(() => {
    loadStorageInfo();
  });
</script>

<div class="p-6 h-full overflow-y-auto space-y-6">
  <div class="flex items-center justify-between">
    <h2 class="text-xl font-bold text-white">系统设置</h2>
    {#if saveStatus}
      <span class="text-sm text-emerald-400 bg-emerald-500/20 px-3 py-1 rounded-full">{saveStatus}</span>
    {/if}
  </div>

  <div class="grid grid-cols-2 gap-6">
    <div class="bg-slate-800/50 backdrop-blur border border-slate-700/50 rounded-xl p-5">
      <h3 class="text-lg font-semibold text-white mb-4">存储管理</h3>
      <div class="space-y-4">
        <div>
          <div class="flex justify-between mb-2">
            <span class="text-sm text-slate-400">已使用</span>
            <span class="text-sm font-mono text-white">{formatBytes(storageInfo.used)}</span>
          </div>
          <div class="flex justify-between mb-2">
            <span class="text-sm text-slate-400">总配额</span>
            <span class="text-sm font-mono text-white">{formatBytes(storageInfo.quota)}</span>
          </div>
          <div class="h-2 bg-slate-700 rounded-full overflow-hidden">
            <div
              class="h-full bg-blue-500 rounded-full transition-all"
              style={`width: ${storageInfo.quota > 0 ? (storageInfo.used / storageInfo.quota) * 100 : 0}%`}
            ></div>
          </div>
          <div class="text-xs text-slate-500 mt-1">
            {storageInfo.quota > 0 ? ((storageInfo.used / storageInfo.quota) * 100).toFixed(1) : 0}% 已使用
          </div>
        </div>

        <div class="pt-4 border-t border-slate-700/50">
          <button
            class="w-full px-4 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-500/30 rounded-lg text-sm font-medium transition-all"
            onclick={handleClearDB}
          >
            清空所有本地数据
          </button>
          <p class="text-xs text-slate-500 mt-2">
            此操作将删除所有历史快照、配置和分析数据。
          </p>
        </div>
      </div>
    </div>

    <div class="bg-slate-800/50 backdrop-blur border border-slate-700/50 rounded-xl p-5">
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-lg font-semibold text-white">异常检测阈值</h3>
        <button
          class="text-xs text-blue-400 hover:text-blue-300"
          onclick={resetThresholds}
        >
          重置默认
        </button>
      </div>
      <div class="space-y-4">
        <div>
          <div class="flex justify-between mb-2">
            <label for="oxygenMin" class="text-sm text-slate-400">氧含量下限</label>
            <input
              id="oxygenMin"
              type="number"
              step="0.1"
              bind:value={thresholds.oxygenMin}
              class="w-24 px-2 py-1 bg-slate-900/50 border border-slate-700 rounded text-sm text-white text-right font-mono focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>
        <div>
          <div class="flex justify-between mb-2">
            <label for="oxygenMax" class="text-sm text-slate-400">氧含量上限</label>
            <input
              id="oxygenMax"
              type="number"
              step="0.1"
              bind:value={thresholds.oxygenMax}
              class="w-24 px-2 py-1 bg-slate-900/50 border border-slate-700 rounded text-sm text-white text-right font-mono focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>
        <div>
          <div class="flex justify-between mb-2">
            <label for="efficiencyMin" class="text-sm text-slate-400">热效率下限</label>
            <input
              id="efficiencyMin"
              type="number"
              step="0.1"
              bind:value={thresholds.efficiencyMin}
              class="w-24 px-2 py-1 bg-slate-900/50 border border-slate-700 rounded text-sm text-white text-right font-mono focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>
        <div>
          <div class="flex justify-between mb-2">
            <label for="oxygenRate" class="text-sm text-slate-400">氧含量变化率阈值 (%/s)</label>
            <input
              id="oxygenRate"
              type="number"
              step="0.01"
              bind:value={thresholds.oxygenRateOfChange}
              class="w-24 px-2 py-1 bg-slate-900/50 border border-slate-700 rounded text-sm text-white text-right font-mono focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>
        <div>
          <div class="flex justify-between mb-2">
            <label for="fanDeviation" class="text-sm text-slate-400">风机转速偏差阈值 (%)</label>
            <input
              id="fanDeviation"
              type="number"
              step="0.1"
              bind:value={thresholds.fanSpeedDeviation}
              class="w-24 px-2 py-1 bg-slate-900/50 border border-slate-700 rounded text-sm text-white text-right font-mono focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>
        <button
          class="w-full px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition-all mt-4"
          onclick={saveThresholds}
        >
          保存阈值设置
        </button>
      </div>
    </div>

    <div class="col-span-2 bg-slate-800/50 backdrop-blur border border-slate-700/50 rounded-xl p-5">
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-lg font-semibold text-white">MPC 模型配置</h3>
        <button
          class="text-xs text-blue-400 hover:text-blue-300"
          onclick={resetMPCConfig}
        >
          重置默认
        </button>
      </div>
      <div class="grid grid-cols-3 gap-6">
        <div>
          <div class="flex justify-between mb-2">
            <label for="predHorizon" class="text-sm text-slate-400">预测时域 (分钟)</label>
            <input
              id="predHorizon"
              type="number"
              min="5"
              max="120"
              bind:value={mpcConfig.predictionHorizon}
              class="w-24 px-2 py-1 bg-slate-900/50 border border-slate-700 rounded text-sm text-white text-right font-mono focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>
        <div>
          <div class="flex justify-between mb-2">
            <label for="ctrlHorizon" class="text-sm text-slate-400">控制时域</label>
            <input
              id="ctrlHorizon"
              type="number"
              min="1"
              max="30"
              bind:value={mpcConfig.controlHorizon}
              class="w-24 px-2 py-1 bg-slate-900/50 border border-slate-700 rounded text-sm text-white text-right font-mono focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>
        <div>
          <div class="flex justify-between mb-2">
            <label for="mpcOxygenSet" class="text-sm text-slate-400">氧含量设定值 (%)</label>
            <input
              id="mpcOxygenSet"
              type="number"
              step="0.1"
              min="1"
              max="8"
              bind:value={mpcConfig.oxygenSetpoint}
              class="w-24 px-2 py-1 bg-slate-900/50 border border-slate-700 rounded text-sm text-white text-right font-mono focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>
        <div>
          <div class="flex justify-between mb-2">
            <label for="mpcLambda" class="text-sm text-slate-400">控制权重 λ</label>
            <input
              id="mpcLambda"
              type="number"
              step="0.01"
              bind:value={mpcConfig.lambda}
              class="w-24 px-2 py-1 bg-slate-900/50 border border-slate-700 rounded text-sm text-white text-right font-mono focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>
        <div>
          <div class="flex justify-between mb-2">
            <label for="fdMin" class="text-sm text-slate-400">送风机最小 (%)</label>
            <input
              id="fdMin"
              type="number"
              bind:value={mpcConfig.constraints.forcedDraftMin}
              class="w-24 px-2 py-1 bg-slate-900/50 border border-slate-700 rounded text-sm text-white text-right font-mono focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>
        <div>
          <div class="flex justify-between mb-2">
            <label for="fdMax" class="text-sm text-slate-400">送风机最大 (%)</label>
            <input
              id="fdMax"
              type="number"
              bind:value={mpcConfig.constraints.forcedDraftMax}
              class="w-24 px-2 py-1 bg-slate-900/50 border border-slate-700 rounded text-sm text-white text-right font-mono focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>
        <div>
          <div class="flex justify-between mb-2">
            <label for="idMin" class="text-sm text-slate-400">引风机最小 (%)</label>
            <input
              id="idMin"
              type="number"
              bind:value={mpcConfig.constraints.inducedDraftMin}
              class="w-24 px-2 py-1 bg-slate-900/50 border border-slate-700 rounded text-sm text-white text-right font-mono focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>
        <div>
          <div class="flex justify-between mb-2">
            <label for="idMax" class="text-sm text-slate-400">引风机最大 (%)</label>
            <input
              id="idMax"
              type="number"
              bind:value={mpcConfig.constraints.inducedDraftMax}
              class="w-24 px-2 py-1 bg-slate-900/50 border border-slate-700 rounded text-sm text-white text-right font-mono focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>
        <div>
          <div class="flex justify-between mb-2">
            <label for="damperMin" class="text-sm text-slate-400">风门最小 (%)</label>
            <input
              id="damperMin"
              type="number"
              bind:value={mpcConfig.constraints.damperMin}
              class="w-24 px-2 py-1 bg-slate-900/50 border border-slate-700 rounded text-sm text-white text-right font-mono focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>
      </div>
      <button
        class="w-full px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition-all mt-4"
        onclick={saveMPCConfig}
      >
        保存 MPC 配置
      </button>
    </div>

    <div class="col-span-2 bg-slate-800/50 backdrop-blur border border-slate-700/50 rounded-xl p-5">
      <h3 class="text-lg font-semibold text-white mb-4">关于系统</h3>
      <div class="grid grid-cols-2 gap-4 text-sm">
        <div>
          <span class="text-slate-500">系统名称</span>
          <p class="text-white font-medium mt-1">BoilerPulse</p>
        </div>
        <div>
          <span class="text-slate-500">版本</span>
          <p class="text-white font-medium mt-1 font-mono">0.1.0</p>
        </div>
        <div>
          <span class="text-slate-500">技术栈</span>
          <p class="text-white font-medium mt-1">Svelte 5 + TypeScript + Tailwind CSS</p>
        </div>
        <div>
          <span class="text-slate-500">存储</span>
          <p class="text-white font-medium mt-1">IndexedDB</p>
        </div>
        <div class="col-span-2">
          <span class="text-slate-500">功能描述</span>
          <p class="text-slate-300 mt-1 leading-relaxed">
            基于 Svelte 5 的大型锅炉燃烧效率智能调优系统，实现烟气氧含量数据在能耗监控与风机控制系统间的语义同步。
            利用异步模型预测控制 (MPC) 优化燃烧参数，配合 IndexedDB 存储历史燃烧异常的波形快照，
            支撑火电厂运行策略的跨系统复盘分析。
          </p>
        </div>
      </div>
    </div>
  </div>
</div>
