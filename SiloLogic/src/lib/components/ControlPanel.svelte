<script>
  import { $state } from 'svelte'

  let {
    onStart,
    onStop,
    onReset,
    onAddMaterial,
    isRunning = false,
    particleCount = 0
  } = $props()

  let selectedMaterial = $state('ore')
  let materialCount = $state(20)

  const materials = [
    { id: 'ore', name: '矿石', density: 2.8, radius: 12 },
    { id: 'gravel', name: '碎石', density: 2.2, radius: 10 },
    { id: 'sand', name: '沙子', density: 1.6, radius: 6 },
    { id: 'cement', name: '水泥', density: 3.1, radius: 4 },
    { id: 'coal', name: '煤炭', density: 1.3, radius: 8 }
  ]
</script>

<div class="control-panel">
  <h3>控制面板</h3>
  
  <div class="control-group">
    <label>添加物料</label>
    <select bind:value={selectedMaterial}>
      {#each materials as m}
        <option value={m.id}>{m.name} (密度: {m.density})</option>
      {/each}
    </select>
    
    <div class="input-row">
      <label>数量:</label>
      <input type="number" bind:value={materialCount} min="1" max="100" />
    </div>
    
    <button 
      class="btn btn-primary" 
      on:click={() => onAddMaterial(selectedMaterial, materialCount)}
      disabled={isRunning}
    >
      添加物料
    </button>
  </div>

  <div class="control-group">
    <label>模拟控制</label>
    <div class="button-group">
      <button 
        class="btn btn-success" 
        on:click={onStart}
        disabled={isRunning || particleCount === 0}
      >
        {isRunning ? '运行中...' : '开始模拟'}
      </button>
      <button 
        class="btn btn-warning" 
        on:click={onStop}
        disabled={!isRunning}
      >
        暂停
      </button>
      <button 
        class="btn btn-danger" 
        on:click={onReset}
      >
        重置
      </button>
    </div>
  </div>

  <div class="stats">
    <div class="stat-item">
      <span class="stat-label">粒子数量:</span>
      <span class="stat-value">{particleCount}</span>
    </div>
  </div>

  <style>
    .control-panel {
      background: linear-gradient(135deg, #1a1f3a 0%, #0f1428 100%);
      border-radius: 12px;
      padding: 20px;
      border: 1px solid #2d3748;
    }

    h3 {
      margin: 0 0 20px 0;
      color: #e2e8f0;
      font-size: 18px;
      font-weight: 600;
    }

    .control-group {
      margin-bottom: 20px;
    }

    .control-group label {
      display: block;
      margin-bottom: 8px;
      color: #94a3b8;
      font-size: 14px;
      font-weight: 500;
    }

    select, input {
      width: 100%;
      padding: 10px 12px;
      background: #1e293b;
      border: 1px solid #334155;
      border-radius: 6px;
      color: #e2e8f0;
      font-size: 14px;
      margin-bottom: 12px;
    }

    select:focus, input:focus {
      outline: none;
      border-color: #6366f1;
    }

    .input-row {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .input-row label {
      margin: 0;
      white-space: nowrap;
    }

    .input-row input {
      margin: 0;
    }

    .button-group {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .btn {
      padding: 10px 16px;
      border: none;
      border-radius: 6px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .btn-primary {
      background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
      color: white;
    }

    .btn-primary:hover:not(:disabled) {
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(99, 102, 241, 0.4);
    }

    .btn-success {
      background: linear-gradient(135deg, #10b981 0%, #059669 100%);
      color: white;
    }

    .btn-success:hover:not(:disabled) {
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4);
    }

    .btn-warning {
      background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
      color: white;
    }

    .btn-warning:hover:not(:disabled) {
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(245, 158, 11, 0.4);
    }

    .btn-danger {
      background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
      color: white;
    }

    .btn-danger:hover:not(:disabled) {
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(239, 68, 68, 0.4);
    }

    .stats {
      background: rgba(30, 41, 59, 0.5);
      border-radius: 8px;
      padding: 12px;
    }

    .stat-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .stat-label {
      color: #94a3b8;
      font-size: 14px;
    }

    .stat-value {
      color: #e2e8f0;
      font-size: 16px;
      font-weight: 600;
    }
  </style>
</div>
