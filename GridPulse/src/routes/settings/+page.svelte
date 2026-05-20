<script lang="ts">
  import { $state } from 'svelte';

  let settings = $state({
    frequencyThresholdHigh: 50.2,
    frequencyThresholdLow: 49.8,
    rocofThreshold: 1.0,
    stabilityMarginWarning: 0.3,
    stabilityMarginDanger: 0.15,
    autoRefreshInterval: 100,
    maxDataPoints: 5000,
    defaultSolverMethod: 'rk4',
    defaultTimeStep: 0.001,
    defaultSimulationTime: 20,
    theme: 'dark',
    notificationsEnabled: true,
    soundEnabled: false
  });

  const solverMethods = [
    { value: 'rk4', label: '四阶龙格-库塔 (RK4)' },
    { value: 'euler', label: '欧拉法' },
    { value: 'trapezoidal', label: '梯形法' }
  ];

  function saveSettings() {
    localStorage.setItem('gridpulse-settings', JSON.stringify(settings));
    alert('设置已保存');
  }

  function resetSettings() {
    if (confirm('确定要重置所有设置吗？')) {
      Object.assign(settings, {
        frequencyThresholdHigh: 50.2,
        frequencyThresholdLow: 49.8,
        rocofThreshold: 1.0,
        stabilityMarginWarning: 0.3,
        stabilityMarginDanger: 0.15,
        autoRefreshInterval: 100,
        maxDataPoints: 5000,
        defaultSolverMethod: 'rk4',
        defaultTimeStep: 0.001,
        defaultSimulationTime: 20,
        theme: 'dark',
        notificationsEnabled: true,
        soundEnabled: false
      });
    }
  }
</script>

<div class="max-w-4xl mx-auto space-y-6">
  <div class="card">
    <h3 class="text-lg font-bold text-white mb-6">告警阈值配置</h3>
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div>
        <label class="block text-sm text-dark-300 mb-2">频率上限阈值 (Hz)</label>
        <input 
          type="number" 
          class="input-field w-full"
          step="0.01"
          bind:value={settings.frequencyThresholdHigh}
        />
      </div>
      <div>
        <label class="block text-sm text-dark-300 mb-2">频率下限阈值 (Hz)</label>
        <input 
          type="number" 
          class="input-field w-full"
          step="0.01"
          bind:value={settings.frequencyThresholdLow}
        />
      </div>
      <div>
        <label class="block text-sm text-dark-300 mb-2">ROCOF 阈值 (Hz/s)</label>
        <input 
          type="number" 
          class="input-field w-full"
          step="0.1"
          bind:value={settings.rocofThreshold}
        />
      </div>
      <div>
        <label class="block text-sm text-dark-300 mb-2">稳定裕度预警阈值</label>
        <input 
          type="number" 
          class="input-field w-full"
          step="0.01"
          bind:value={settings.stabilityMarginWarning}
        />
      </div>
      <div>
        <label class="block text-sm text-dark-300 mb-2">稳定裕度危险阈值</label>
        <input 
          type="number" 
          class="input-field w-full"
          step="0.01"
          bind:value={settings.stabilityMarginDanger}
        />
      </div>
    </div>
  </div>

  <div class="card">
    <h3 class="text-lg font-bold text-white mb-6">求解器默认配置</h3>
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div>
        <label class="block text-sm text-dark-300 mb-2">默认数值积分方法</label>
        <select class="input-field w-full" bind:value={settings.defaultSolverMethod}>
          {#each solverMethods as method}
            <option value={method.value}>{method.label}</option>
          {/each}
        </select>
      </div>
      <div>
        <label class="block text-sm text-dark-300 mb-2">默认求解步长 (s)</label>
        <input 
          type="number" 
          class="input-field w-full"
          step="0.001"
          bind:value={settings.defaultTimeStep}
        />
      </div>
      <div>
        <label class="block text-sm text-dark-300 mb-2">默认仿真时长 (s)</label>
        <input 
          type="number" 
          class="input-field w-full"
          step="1"
          bind:value={settings.defaultSimulationTime}
        />
      </div>
    </div>
  </div>

  <div class="card">
    <h3 class="text-lg font-bold text-white mb-6">显示配置</h3>
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div>
        <label class="block text-sm text-dark-300 mb-2">自动刷新间隔 (ms)</label>
        <input 
          type="number" 
          class="input-field w-full"
          step="10"
          min="50"
          bind:value={settings.autoRefreshInterval}
        />
      </div>
      <div>
        <label class="block text-sm text-dark-300 mb-2">最大数据点数量</label>
        <input 
          type="number" 
          class="input-field w-full"
          step="100"
          min="100"
          bind:value={settings.maxDataPoints}
        />
      </div>
      <div>
        <label class="block text-sm text-dark-300 mb-2">主题</label>
        <select class="input-field w-full" bind:value={settings.theme}>
          <option value="dark">深色主题</option>
          <option value="light">浅色主题</option>
        </select>
      </div>
    </div>
  </div>

  <div class="card">
    <h3 class="text-lg font-bold text-white mb-6">通知配置</h3>
    <div class="space-y-4">
      <label class="flex items-center gap-3 cursor-pointer">
        <input 
          type="checkbox" 
          class="w-5 h-5 rounded bg-dark-700 border-dark-600 text-accent-500 focus:ring-accent-500"
          bind:checked={settings.notificationsEnabled}
        />
        <span class="text-white">启用桌面通知</span>
      </label>
      <label class="flex items-center gap-3 cursor-pointer">
        <input 
          type="checkbox" 
          class="w-5 h-5 rounded bg-dark-700 border-dark-600 text-accent-500 focus:ring-accent-500"
          bind:checked={settings.soundEnabled}
        />
        <span class="text-white">启用告警声音</span>
      </label>
    </div>
  </div>

  <div class="card">
    <h3 class="text-lg font-bold text-white mb-6">数据管理</h3>
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <button class="btn-secondary w-full">导出所有数据</button>
      <button class="btn-secondary w-full">导入数据</button>
      <button class="btn-secondary w-full text-yellow-400 border-yellow-500/30 hover:bg-yellow-500/10">
        清除仿真历史
      </button>
      <button class="btn-secondary w-full text-red-400 border-red-500/30 hover:bg-red-500/10">
        清除用户快照数据
      </button>
    </div>
  </div>

  <div class="card">
    <h3 class="text-lg font-bold text-white mb-6">系统信息</h3>
    <div class="space-y-2 text-sm">
      <div class="flex justify-between py-2 border-b border-dark-800">
        <span class="text-dark-400">应用版本</span>
        <span class="text-white font-mono">0.1.0</span>
      </div>
      <div class="flex justify-between py-2 border-b border-dark-800">
        <span class="text-dark-400">Svelte 版本</span>
        <span class="text-white font-mono">5.x</span>
      </div>
      <div class="flex justify-between py-2 border-b border-dark-800">
        <span class="text-dark-400">浏览器兼容性</span>
        <span class="text-green-400">Chrome 110+, Firefox 110+, Safari 16+</span>
      </div>
      <div class="flex justify-between py-2">
        <span class="text-dark-400">Web Worker 支持</span>
        <span class="text-green-400">已启用</span>
      </div>
    </div>
  </div>

  <div class="flex items-center justify-end gap-4">
    <button class="btn-secondary" onclick={resetSettings}>重置默认</button>
    <button class="btn-primary" onclick={saveSettings}>保存设置</button>
  </div>
</div>
