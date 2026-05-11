<script>
  import { createEventDispatcher } from 'svelte';

  const dispatch = createEventDispatcher();

  export let config = {
    gridSize: 20,
    timeStep: 1,
    totalTime: 100,
    rainfallIntensity: 50
  };

  export let isRunning = false;
  export let progress = 0;
  export let currentStep = 0;
  export let totalSteps = 0;

  function updateConfig(key, value) {
    config = { ...config, [key]: value };
    dispatch('configChange', config);
  }

  function handleStart() {
    dispatch('start');
  }

  function handlePause() {
    dispatch('pause');
  }

  function handleStop() {
    dispatch('stop');
  }

  function handleStep() {
    dispatch('step');
  }

  function handleReset() {
    dispatch('reset');
  }

  function handleSaveSnapshot() {
    dispatch('saveSnapshot');
  }
</script>

<div class="control-panel">
  <h3>⚙️ 模拟控制</h3>

  <div class="config-section">
    <h4>参数配置</h4>
    <div class="config-item">
      <label>网格大小: {config.gridSize}×{config.gridSize}</label>
      <input
        type="range"
        min="10"
        max="30"
        bind:value={config.gridSize}
        on:input={() => updateConfig('gridSize', config.gridSize)}
        disabled={isRunning}
      />
    </div>
    <div class="config-item">
      <label>降雨强度: {config.rainfallIntensity} mm/h</label>
      <input
        type="range"
        min="10"
        max="150"
        bind:value={config.rainfallIntensity}
        on:input={() => updateConfig('rainfallIntensity', config.rainfallIntensity)}
      />
    </div>
    <div class="config-item">
      <label>模拟步数: {config.totalTime}</label>
      <input
        type="range"
        min="50"
        max="500"
        bind:value={config.totalTime}
        on:input={() => updateConfig('totalTime', config.totalTime)}
        disabled={isRunning}
      />
    </div>
  </div>

  <div class="progress-section">
    <h4>模拟进度</h4>
    <div class="progress-bar">
      <div class="progress-fill" style="width: {progress}%"></div>
    </div>
    <p class="progress-text">{currentStep} / {totalSteps} 步</p>
  </div>

  <div class="button-group">
    {#if !isRunning}
      <button class="btn-primary" on:click={handleStart}>▶ 开始</button>
    {:else}
      <button class="btn-warning" on:click={handlePause}>⏸ 暂停</button>
    {/if}
    <button class="btn-secondary" on:click={handleStep} disabled={isRunning}>⏩ 单步</button>
    <button class="btn-danger" on:click={handleStop}>⏹ 停止</button>
    <button class="btn-secondary" on:click={handleReset}>🔄 重置</button>
    <button class="btn-success" on:click={handleSaveSnapshot}>💾 保存快照</button>
  </div>
</div>

<style>
  .control-panel {
    background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
    border-radius: 12px;
    padding: 20px;
    color: #e2e8f0;
    border: 1px solid #334155;
  }

  h3 {
    margin: 0 0 20px 0;
    font-size: 1.2rem;
    color: #60a5fa;
  }

  h4 {
    margin: 15px 0 10px 0;
    font-size: 0.9rem;
    color: #94a3b8;
  }

  .config-section {
    margin-bottom: 20px;
  }

  .config-item {
    margin-bottom: 15px;
  }

  .config-item label {
    display: block;
    margin-bottom: 5px;
    font-size: 0.85rem;
  }

  .config-item input[type="range"] {
    width: 100%;
    accent-color: #3b82f6;
  }

  .config-item input:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .progress-section {
    margin-bottom: 20px;
  }

  .progress-bar {
    width: 100%;
    height: 8px;
    background: #334155;
    border-radius: 4px;
    overflow: hidden;
  }

  .progress-fill {
    height: 100%;
    background: linear-gradient(90deg, #3b82f6, #60a5fa);
    transition: width 0.3s ease;
  }

  .progress-text {
    text-align: center;
    margin-top: 8px;
    font-size: 0.85rem;
    color: #94a3b8;
  }

  .button-group {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 10px;
  }

  button {
    padding: 10px 15px;
    border: none;
    border-radius: 6px;
    font-size: 0.85rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .btn-primary {
    background: linear-gradient(135deg, #3b82f6, #2563eb);
    color: white;
  }

  .btn-primary:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
  }

  .btn-warning {
    background: linear-gradient(135deg, #f59e0b, #d97706);
    color: white;
  }

  .btn-warning:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(245, 158, 11, 0.4);
  }

  .btn-secondary {
    background: linear-gradient(135deg, #64748b, #475569);
    color: white;
  }

  .btn-secondary:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(100, 116, 139, 0.4);
  }

  .btn-danger {
    background: linear-gradient(135deg, #ef4444, #dc2626);
    color: white;
  }

  .btn-danger:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(239, 68, 68, 0.4);
  }

  .btn-success {
    background: linear-gradient(135deg, #22c55e, #16a34a);
    color: white;
    grid-column: span 2;
  }

  .btn-success:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(34, 197, 94, 0.4);
  }
</style>
