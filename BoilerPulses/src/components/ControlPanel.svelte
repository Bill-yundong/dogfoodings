<script>
  import { boilerState, mpcParams, semanticSyncState } from '../lib/stores/boilerStore.js';
  import { boilerSimulator } from '../lib/simulator/BoilerDataSimulator.js';
  import { mpcEngine } from '../lib/mpc/ModelPredictiveControl.js';
  import { semanticSync } from '../lib/sync/SemanticSynchronizer.js';

  let isOptimizing = false;
  let lastOptimizationResult = null;

  function handleControlChange(param, value) {
    boilerSimulator.setControlParameter(param, parseFloat(value));
    semanticSync.syncSetpointToEnergyMonitor(param, parseFloat(value));
  }

  async function runMPCOptimization() {
    isOptimizing = true;
    try {
      const state = $boilerState;
      const result = await mpcEngine.optimizeAsync(state);
      lastOptimizationResult = result;
      if ($mpcParams.isAutoMode) {
        boilerSimulator.applyMPCOptimization(result.optimalControls);
        Object.entries(result.optimalControls).forEach(([key, value]) => {
          semanticSync.syncSetpointToEnergyMonitor(key, value);
        });
      }
      mpcParams.update(params => ({
        ...params,
        lastOptimization: Date.now()
      }));
    } catch (error) {
      console.error('MPC optimization failed:', error);
    } finally {
      isOptimizing = false;
    }
  }

  function toggleAutoMode() {
    mpcParams.update(params => ({
      ...params,
      isAutoMode: !params.isAutoMode
    }));
  }

  const controlParams = [
    { id: 'fuelFlow', label: '燃料流量', unit: 't/h', min: 50, max: 100, step: 0.5, icon: '🔥' },
    { id: 'primaryAir', label: '一次风量', unit: 'kNm³/h', min: 60, max: 120, step: 1, icon: '💨' },
    { id: 'secondaryAir', label: '二次风量', unit: 'kNm³/h', min: 40, max: 80, step: 1, icon: '🌬️' },
    { id: 'inducedDraft', label: '引风机频率', unit: 'Hz', min: 30, max: 90, step: 0.5, icon: '⬇️' },
    { id: 'forcedDraft', label: '送风机频率', unit: 'Hz', min: 40, max: 100, step: 0.5, icon: '⬆️' }
  ];
</script>

<div class="control-panel">
  <div class="panel-header">
    <h2 class="text-xl font-bold text-white">风机控制系统</h2>
    <div class="flex items-center gap-3">
      <div class="sync-status">
        <span class="text-xs text-gray-400">能耗监控同步:</span>
        <span class="text-xs {$semanticSyncState.energyMonitor.status === 'completed' ? 'text-green-400' : 'text-yellow-400'}">
          {$semanticSyncState.energyMonitor.status === 'syncing' ? '同步中...' : '已同步'}
        </span>
      </div>
      <button
        class="auto-mode-btn {$mpcParams.isAutoMode ? 'active' : ''}"
        on:click={toggleAutoMode}
      >
        {$mpcParams.isAutoMode ? '✓ 自动模式' : '手动模式'}
      </button>
    </div>
  </div>

  <div class="control-grid">
    {#each controlParams as param}
      <div class="control-card">
        <div class="control-header">
          <span class="text-2xl">{param.icon}</span>
          <div>
            <div class="text-sm font-medium text-white">{param.label}</div>
            <div class="text-xs text-gray-500">{param.unit}</div>
          </div>
        </div>
        <div class="control-value">
          {$boilerState[param.id].toFixed(1)}
        </div>
        <input
          type="range"
          min={param.min}
          max={param.max}
          step={param.step}
          value={$boilerState[param.id]}
          on:input={(e) => handleControlChange(param.id, e.target.value)}
          disabled={$mpcParams.isAutoMode}
          class="control-slider"
        />
        <div class="control-range">
          <span class="text-xs text-gray-500">{param.min}</span>
          <span class="text-xs text-gray-500">{param.max}</span>
        </div>
      </div>
    {/each}
  </div>

  <div class="mpc-section">
    <div class="mpc-header">
      <h3 class="text-lg font-semibold text-white">MPC 模型预测控制</h3>
      <button
        class="optimize-btn"
        on:click={runMPCOptimization}
        disabled={isOptimizing}
      >
        {#if isOptimizing}
          <span class="animate-spin">⚙️</span> 优化中...
        {:else}
          🎯 执行优化
        {/if}
      </button>
    </div>

    <div class="mpc-params">
      <div class="param-item">
        <span class="text-sm text-gray-400">预测时域</span>
        <span class="text-sm text-white font-medium">{$mpcParams.predictionHorizon} 步</span>
      </div>
      <div class="param-item">
        <span class="text-sm text-gray-400">控制时域</span>
        <span class="text-sm text-white font-medium">{$mpcParams.controlHorizon} 步</span>
      </div>
      <div class="param-item">
        <span class="text-sm text-gray-400">氧含量权重</span>
        <span class="text-sm text-blue-400 font-medium">{$mpcParams.weights.oxygen}</span>
      </div>
      <div class="param-item">
        <span class="text-sm text-gray-400">效率权重</span>
        <span class="text-sm text-cyan-400 font-medium">{$mpcParams.weights.efficiency}</span>
      </div>
    </div>

    {#if lastOptimizationResult}
      <div class="optimization-result">
        <div class="result-header">
          <span class="text-sm font-medium text-green-400">✓ 优化完成</span>
          <span class="text-xs text-gray-500">
            {new Date($mpcParams.lastOptimization).toLocaleTimeString()}
          </span>
        </div>
        <div class="result-grid">
          <div class="result-item">
            <span class="text-xs text-gray-500">预测效率</span>
            <span class="text-lg font-bold text-cyan-400">
              {lastOptimizationResult.predictions[4]?.state.efficiency.toFixed(2)}%
            </span>
          </div>
          <div class="result-item">
            <span class="text-xs text-gray-500">目标氧含量</span>
            <span class="text-lg font-bold text-blue-400">
              {lastOptimizationResult.predictions[4]?.state.oxygen.toFixed(2)}%
            </span>
          </div>
          <div class="result-item">
            <span class="text-xs text-gray-500">成本函数</span>
            <span class="text-lg font-bold text-purple-400">
              {lastOptimizationResult.cost.toFixed(2)}
            </span>
          </div>
        </div>
      </div>
    {/if}
  </div>
</div>

<style>
  .control-panel {
    background: linear-gradient(135deg, rgba(15, 23, 42, 0.95) 0%, rgba(10, 14, 23, 0.98) 100%);
    border-radius: 1rem;
    padding: 1.5rem;
    border: 1px solid rgba(16, 185, 129, 0.1);
  }

  .panel-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1.5rem;
  }

  .sync-status {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.25rem 0.75rem;
    background: rgba(30, 41, 59, 0.8);
    border-radius: 9999px;
  }

  .auto-mode-btn {
    padding: 0.5rem 1rem;
    border-radius: 0.5rem;
    font-size: 0.875rem;
    font-weight: 500;
    transition: all 0.2s;
    border: 1px solid rgba(51, 65, 85, 0.5);
    background: rgba(30, 41, 59, 0.5);
    color: #94a3b8;
  }

  .auto-mode-btn.active {
    background: linear-gradient(135deg, #10b981 0%, #059669 100%);
    border-color: #10b981;
    color: white;
  }

  .control-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 1rem;
    margin-bottom: 1.5rem;
  }

  .control-card {
    background: rgba(30, 41, 59, 0.5);
    border: 1px solid rgba(51, 65, 85, 0.5);
    border-radius: 0.75rem;
    padding: 1rem;
  }

  .control-header {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin-bottom: 0.75rem;
  }

  .control-value {
    font-size: 1.75rem;
    font-weight: bold;
    color: #f1f5f9;
    margin-bottom: 0.75rem;
    font-variant-numeric: tabular-nums;
  }

  .control-slider {
    width: 100%;
    height: 6px;
    border-radius: 3px;
    background: #334155;
    outline: none;
    -webkit-appearance: none;
  }

  .control-slider::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
    cursor: pointer;
    box-shadow: 0 2px 8px rgba(59, 130, 246, 0.4);
  }

  .control-slider:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .control-range {
    display: flex;
    justify-content: space-between;
    margin-top: 0.5rem;
  }

  .mpc-section {
    background: rgba(30, 41, 59, 0.3);
    border: 1px solid rgba(59, 130, 246, 0.2);
    border-radius: 0.75rem;
    padding: 1.25rem;
  }

  .mpc-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
  }

  .optimize-btn {
    padding: 0.5rem 1.25rem;
    background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
    color: white;
    border: none;
    border-radius: 0.5rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .optimize-btn:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
  }

  .optimize-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }

  .mpc-params {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 1rem;
    margin-bottom: 1rem;
  }

  .param-item {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .optimization-result {
    background: rgba(16, 185, 129, 0.1);
    border: 1px solid rgba(16, 185, 129, 0.3);
    border-radius: 0.5rem;
    padding: 1rem;
  }

  .result-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.75rem;
  }

  .result-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 1rem;
  }

  .result-item {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }
</style>
