<script>
  import { boilerState, combustionQuality } from '../lib/stores/boilerStore.js';
  import { mpcEngine } from '../lib/mpc/ModelPredictiveControl.js';
  import { boilerSimulator } from '../lib/simulator/BoilerDataSimulator.js';
  import GaugeMeter from './GaugeMeter.svelte';

  let suggestions = [];

  function updateSuggestions() {
    suggestions = mpcEngine.generateOptimizationSuggestions($boilerState);
  }

  function applySuggestion(suggestion) {
    if (suggestion.action) {
      Object.entries(suggestion.action).forEach(([key, value]) => {
        const currentValue = $boilerState[key];
        boilerSimulator.setControlParameter(key, currentValue + value);
      });
    }
    updateSuggestions();
  }

  $: {
    $boilerState;
    updateSuggestions();
  }

  const priorityColors = {
    high: 'border-red-500/50 bg-red-500/10',
    medium: 'border-yellow-500/50 bg-yellow-500/10',
    low: 'border-blue-500/50 bg-blue-500/10'
  };

  const priorityLabels = {
    high: '高优先级',
    medium: '中优先级',
    low: '建议'
  };

  const typeIcons = {
    air: '💨',
    fuel: '🔥',
    emission: '🌿'
  };
</script>

<div class="efficiency-panel">
  <div class="panel-header">
    <h2 class="text-xl font-bold text-white">热效率反馈中心</h2>
    <div class="status-badge">
      <span class="text-sm text-gray-400">燃烧状态:</span>
      <span class="text-sm font-medium {$combustionQuality.overall >= 80 ? 'text-green-400' : $combustionQuality.overall >= 60 ? 'text-yellow-400' : 'text-red-400'}">
        {$combustionQuality.overall >= 80 ? '优秀' : $combustionQuality.overall >= 60 ? '良好' : '需优化'}
      </span>
    </div>
  </div>

  <div class="efficiency-grid">
    <div class="gauge-card">
      <GaugeMeter
        value={$boilerState.efficiency}
        min={70}
        max={100}
        label="热效率"
        unit="%"
        thresholds={{ warning: 88, danger: 80 }}
      />
      <div class="gauge-info">
        <div class="info-item">
          <span class="text-xs text-gray-500">设计效率</span>
          <span class="text-sm text-white">96.5%</span>
        </div>
        <div class="info-item">
          <span class="text-xs text-gray-500">当前偏差</span>
          <span class="text-sm text-yellow-400">{(96.5 - $boilerState.efficiency).toFixed(2)}%</span>
        </div>
      </div>
    </div>

    <div class="metrics-card">
      <h3 class="text-sm font-semibold text-gray-400 mb-4">能效指标</h3>
      <div class="metric-list">
        <div class="metric-item">
          <div class="metric-header">
            <span class="text-gray-300">排烟热损失</span>
            <span class="text-red-400 font-medium">5.2%</span>
          </div>
          <div class="h-1.5 bg-gray-700 rounded-full overflow-hidden">
            <div class="h-full bg-red-500 rounded-full" style="width: 52%"></div>
          </div>
        </div>
        <div class="metric-item">
          <div class="metric-header">
            <span class="text-gray-300">化学不完全燃烧</span>
            <span class="text-yellow-400 font-medium">1.8%</span>
          </div>
          <div class="h-1.5 bg-gray-700 rounded-full overflow-hidden">
            <div class="h-full bg-yellow-500 rounded-full" style="width: 30%"></div>
          </div>
        </div>
        <div class="metric-item">
          <div class="metric-header">
            <span class="text-gray-300">机械不完全燃烧</span>
            <span class="text-green-400 font-medium">0.5%</span>
          </div>
          <div class="h-1.5 bg-gray-700 rounded-full overflow-hidden">
            <div class="h-full bg-green-500 rounded-full" style="width: 10%"></div>
          </div>
        </div>
        <div class="metric-item">
          <div class="metric-header">
            <span class="text-gray-300">散热损失</span>
            <span class="text-blue-400 font-medium">0.8%</span>
          </div>
          <div class="h-1.5 bg-gray-700 rounded-full overflow-hidden">
            <div class="h-full bg-blue-500 rounded-full" style="width: 15%"></div>
          </div>
        </div>
      </div>
    </div>

    <div class="optimization-card">
      <h3 class="text-sm font-semibold text-gray-400 mb-4">燃烧优化建议</h3>
      <div class="suggestions-list">
        {#if suggestions.length === 0}
          <div class="no-suggestions">
            <span class="text-4xl mb-2">✨</span>
            <span class="text-sm text-gray-500">燃烧状态良好，暂无需优化</span>
          </div>
        {:else}
          {#each suggestions as suggestion (suggestion.message)}
            <div class="suggestion-item {priorityColors[suggestion.priority]}">
              <div class="flex items-start gap-3">
                <span class="text-2xl">{typeIcons[suggestion.type] || '💡'}</span>
                <div class="flex-1">
                  <div class="flex items-center gap-2 mb-1">
                    <span class="text-xs px-2 py-0.5 rounded-full {suggestion.priority === 'high' ? 'bg-red-500/20 text-red-400' : suggestion.priority === 'medium' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-blue-500/20 text-blue-400'}">
                      {priorityLabels[suggestion.priority]}
                    </span>
                  </div>
                  <p class="text-sm text-gray-300 mb-2">{suggestion.message}</p>
                  {#if suggestion.action}
                    <div class="flex flex-wrap gap-2 mb-2">
                      {#each Object.entries(suggestion.action) as [key, value]}
                        <span class="text-xs px-2 py-1 bg-gray-700/50 rounded text-gray-400">
                          {key}: {value > 0 ? '+' : ''}{value}
                        </span>
                      {/each}
                    </div>
                  {/if}
                  <button
                    class="apply-btn"
                    on:click={() => applySuggestion(suggestion)}
                  >
                    应用建议
                  </button>
                </div>
              </div>
            </div>
          {/each}
        {/if}
      </div>
    </div>
  </div>
</div>

<style>
  .efficiency-panel {
    background: linear-gradient(135deg, rgba(15, 23, 42, 0.95) 0%, rgba(10, 14, 23, 0.98) 100%);
    border-radius: 1rem;
    padding: 1.5rem;
    border: 1px solid rgba(6, 182, 212, 0.1);
  }

  .panel-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1.5rem;
  }

  .status-badge {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.25rem 0.75rem;
    background: rgba(30, 41, 59, 0.8);
    border-radius: 9999px;
  }

  .efficiency-grid {
    display: grid;
    grid-template-columns: 1fr 1fr 1.5fr;
    gap: 1.5rem;
  }

  .gauge-card,
  .metrics-card,
  .optimization-card {
    background: rgba(30, 41, 59, 0.5);
    border: 1px solid rgba(51, 65, 85, 0.5);
    border-radius: 0.75rem;
    padding: 1.25rem;
  }

  .gauge-info {
    display: flex;
    justify-content: space-around;
    margin-top: 0.5rem;
    padding-top: 1rem;
    border-top: 1px solid rgba(51, 65, 85, 0.5);
  }

  .info-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.25rem;
  }

  .metric-list {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .metric-item {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .metric-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .suggestions-list {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    max-height: 300px;
    overflow-y: auto;
  }

  .suggestion-item {
    border: 1px solid;
    border-radius: 0.5rem;
    padding: 1rem;
  }

  .apply-btn {
    padding: 0.375rem 0.75rem;
    background: rgba(59, 130, 246, 0.2);
    border: 1px solid rgba(59, 130, 246, 0.3);
    color: #60a5fa;
    border-radius: 0.375rem;
    font-size: 0.75rem;
    cursor: pointer;
    transition: all 0.2s;
  }

  .apply-btn:hover {
    background: rgba(59, 130, 246, 0.3);
  }

  .no-suggestions {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 2rem;
    text-align: center;
  }
</style>
