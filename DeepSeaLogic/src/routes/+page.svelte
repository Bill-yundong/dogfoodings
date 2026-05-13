<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { SimulationController } from '$lib/simulation/SimulationController';
  import type { SimulationState, ForceBalance } from '$lib/types';

  let simulation: SimulationController;
  let canvas: HTMLCanvasElement;
  let ctx: CanvasRenderingContext2D;
  let isRunning = false;
  let elapsedTime = 0;
  let particleCount = 0;
  let pumpCount = 0;
  let savedStates: SimulationState[] = [];
  let semanticParams: any[] = [];
  let selectedStakeholder: 'engineering' | 'environmental' = 'engineering';
  let selectedPumpForces: ForceBalance | null = null;

  onMount(async () => {
    simulation = new SimulationController();
    
    const canvasEl = document.getElementById('simulation-canvas') as HTMLCanvasElement;
    canvas = canvasEl;
    ctx = canvas.getContext('2d')!;
    
    simulation.onStatusUpdate((status) => {
      isRunning = status.running;
      elapsedTime = status.elapsedTime;
    });
    
    simulation.onParticleUpdate((particles) => {
      particleCount = particles.length;
      render();
    });
    
    simulation.onPumpUpdate((pumps) => {
      pumpCount = pumps.length;
    });

    semanticParams = simulation.getSemanticSync().getAllParameters();
    simulation.getSemanticSync().onSync((params) => {
      semanticParams = params;
    });

    await simulation.getStorage().init();
    await loadSavedStates();
    render();
  });

  onDestroy(() => {
    if (simulation) {
      simulation.stop();
    }
  });

  async function startSimulation() {
    await simulation.start();
  }

  function stopSimulation() {
    simulation.stop();
  }

  function resetSimulation() {
    simulation.reset();
    render();
  }

  async function createSnapshot() {
    await simulation.createSnapshot();
    await loadSavedStates();
  }

  async function loadSavedStates() {
    savedStates = await simulation.getStorage().getAllStates();
    savedStates = savedStates.sort((a, b) => b.timestamp - a.timestamp);
  }

  async function loadState(state: SimulationState) {
    await simulation.loadState(state);
    render();
  }

  async function deleteState(stateId: string) {
    await simulation.getStorage().deleteState(stateId);
    await loadSavedStates();
  }

  function setParameter(paramId: string, value: number) {
    if (selectedStakeholder === 'engineering') {
      simulation.getSemanticSync().setEngineeringValue(paramId, value);
    } else {
      simulation.getSemanticSync().setEnvironmentalValue(paramId, value);
    }
    semanticParams = simulation.getSemanticSync().getAllParameters();
  }

  function togglePump(pumpId: string) {
    simulation.getDynamicsEngine().togglePump(pumpId);
  }

  function showPumpForces(pumpId: string) {
    const current = simulation.getCurrent();
    selectedPumpForces = simulation.getDynamicsEngine().getForceBalance(pumpId, current);
  }

  function render() {
    if (!ctx || !simulation) return;

    ctx.fillStyle = '#0a1628';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = '#1e3a5f';
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= 100; i += 10) {
      ctx.beginPath();
      ctx.moveTo(i * canvas.width / 100, 0);
      ctx.lineTo(i * canvas.width / 100, canvas.height);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i * canvas.height / 100);
      ctx.lineTo(canvas.width, i * canvas.height / 100);
      ctx.stroke();
    }

    const particles = simulation.getSedimentSimulator().getParticles();
    particles.forEach((particle: any) => {
      const x = (particle.position.x / 100) * canvas.width;
      const y = (particle.position.y / 50) * canvas.height;
      const alpha = Math.min(1, particle.concentration);
      
      ctx.beginPath();
      ctx.arc(x, y, 2 + particle.size * 50, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(194, 178, 128, ${alpha * 0.7})`;
      ctx.fill();
    });

    const pumps = simulation.getDynamicsEngine().getPumps();
    pumps.forEach((pump: any) => {
      const x = (pump.position.x / 100) * canvas.width;
      const y = (pump.position.y / 50) * canvas.height;
      
      ctx.beginPath();
      ctx.rect(x - 15, y - 10, 30, 20);
      ctx.fillStyle = pump.isActive ? '#4fc3f7' : '#546e7a';
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1;
      ctx.stroke();
      
      ctx.fillStyle = '#fff';
      ctx.font = '10px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(pump.name.substring(0, 8), x, y + 25);
    });
  }

  function formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
</script>

<div class="app-container">
  <header class="app-header">
    <h1>🌊 Deep Sea Logic - 深海采矿作业仿真系统</h1>
    <div class="status-bar">
      <span class="status-indicator" class:active={isRunning}>
        {isRunning ? '● 运行中' : '○ 已停止'}
      </span>
      <span class="time-display">运行时间: {formatTime(elapsedTime)}</span>
      <span class="particle-count">沉积物粒子: {particleCount}</span>
      <span class="pump-count">泵组数量: {pumpCount}</span>
    </div>
  </header>

  <main class="main-content">
    <aside class="left-panel">
      <section class="panel-section">
        <h2>仿真控制</h2>
        <div class="control-buttons">
          <button on:click={startSimulation} disabled={isRunning} class="btn btn-primary">
            ▶ 开始
          </button>
          <button on:click={stopSimulation} disabled={!isRunning} class="btn btn-warning">
            ⏸ 暂停
          </button>
          <button on:click={resetSimulation} class="btn btn-danger">
            ↻ 重置
          </button>
          <button on:click={createSnapshot} class="btn btn-success">
            📷 创建快照
          </button>
        </div>
      </section>

      <section class="panel-section">
        <h2>语义参数同步</h2>
        <div class="stakeholder-tabs">
          <button 
            class:selected={selectedStakeholder === 'engineering'}
            on:click={() => selectedStakeholder = 'engineering'}
          >
            🔧 工程单位
          </button>
          <button 
            class:selected={selectedStakeholder === 'environmental'}
            on:click={() => selectedStakeholder = 'environmental'}
          >
            🌿 环保组织
          </button>
        </div>
        
        <div class="parameter-list">
          {#each semanticParams as param}
            <div class="parameter-item">
              <label>{param.name}</label>
              <div class="parameter-input">
                <input 
                  type="range" 
                  min={param.id === 'current-speed' ? 0 : 10}
                  max={param.id === 'current-speed' ? 2 : param.id === 'mining-depth' ? 6000 : 100}
                  step={param.id === 'current-speed' ? 0.1 : param.id === 'mining-depth' ? 100 : 1}
                  value={selectedStakeholder === 'engineering' ? param.engineeringValue : param.environmentalValue}
                  on:input={(e) => setParameter(param.id, parseFloat((e.target as HTMLInputElement).value))}
                />
                <span class="value-display">
                  {selectedStakeholder === 'engineering' 
                    ? param.engineeringValue.toFixed(1) + ' ' + param.engineeringUnit
                    : param.environmentalValue.toFixed(1) + ' ' + param.environmentalUnit
                  }
                </span>
              </div>
              <div class="sync-status" class:synced={param.isSynced}>
                {param.isSynced ? '✓ 已同步' : '✗ 未同步'}
              </div>
            </div>
          {/each}
        </div>
      </section>

      <section class="panel-section">
        <h2>泵组控制</h2>
        <div class="pump-list">
          {#each simulation?.getDynamicsEngine().getPumps() || [] as pump}
            <div class="pump-item">
              <span class="pump-name">{pump.name}</span>
              <button 
                class="toggle-btn"
                class:active={pump.isActive}
                on:click={() => togglePump(pump.id)}
              >
                {pump.isActive ? '运行中' : '已关闭'}
              </button>
              <button 
                class="info-btn"
                on:click={() => showPumpForces(pump.id)}
              >
                受力分析
              </button>
            </div>
          {/each}
        </div>
        
        {#if selectedPumpForces}
          <div class="force-analysis">
            <h3>受力平衡分析</h3>
            <div class="force-item">
              <span>重力:</span>
              <span>{selectedPumpForces.weight.y.toFixed(2)} N</span>
            </div>
            <div class="force-item">
              <span>浮力:</span>
              <span>{selectedPumpForces.buoyancy.y.toFixed(2)} N</span>
            </div>
            <div class="force-item">
              <span>阻力:</span>
              <span>({selectedPumpForces.drag.x.toFixed(2)}, {selectedPumpForces.drag.y.toFixed(2)}, {selectedPumpForces.drag.z.toFixed(2)}) N</span>
            </div>
            <div class="force-item">
              <span>流体力:</span>
              <span>({selectedPumpForces.currentForce.x.toFixed(2)}, {selectedPumpForces.currentForce.y.toFixed(2)}, {selectedPumpForces.currentForce.z.toFixed(2)}) N</span>
            </div>
            <div class="force-item">
              <span>张力:</span>
              <span>({selectedPumpForces.tension.x.toFixed(2)}, {selectedPumpForces.tension.y.toFixed(2)}, {selectedPumpForces.tension.z.toFixed(2)}) N</span>
            </div>
            <div class="force-item net-force">
              <span>合力:</span>
              <span>({selectedPumpForces.netForce.x.toFixed(2)}, {selectedPumpForces.netForce.y.toFixed(2)}, {selectedPumpForces.netForce.z.toFixed(2)}) N</span>
            </div>
          </div>
        {/if}
      </section>
    </aside>

    <section class="canvas-section">
      <canvas id="simulation-canvas" width="800" height="500"></canvas>
      <div class="canvas-legend">
        <div class="legend-item">
          <div class="legend-color" style="background: #4fc3f7"></div>
          <span>采矿泵组</span>
        </div>
        <div class="legend-item">
          <div class="legend-color" style="background: #c2b280"></div>
          <span>沉积物粒子</span>
        </div>
      </div>
    </section>

    <aside class="right-panel">
      <section class="panel-section">
        <h2>📊 保存的状态快照</h2>
        <div class="snapshot-list">
          {#if savedStates.length === 0}
            <p class="empty-message">暂无保存的快照</p>
          {:else}
            {#each savedStates.slice(0, 10) as state}
              <div class="snapshot-item">
                <div class="snapshot-info">
                  <span class="snapshot-time">
                    {new Date(state.timestamp).toLocaleTimeString()}
                  </span>
                  <span class="snapshot-meta">
                    {state.particles.length} 粒子 | {formatTime(state.elapsedTime)}
                  </span>
                </div>
                <div class="snapshot-actions">
                  <button class="btn-small" on:click={() => loadState(state)}>加载</button>
                  <button class="btn-small btn-danger" on:click={() => deleteState(state.id)}>删除</button>
                </div>
              </div>
            {/each}
          {/if}
        </div>
        <button on:click={loadSavedStates} class="btn btn-secondary refresh-btn">
          🔄 刷新列表
        </button>
      </section>

      <section class="panel-section">
        <h2>🌊 洋流参数</h2>
        <div class="info-grid">
          <div class="info-item">
            <span class="label">流速 X:</span>
            <span class="value">{simulation?.getCurrent().velocity.x.toFixed(2)} m/s</span>
          </div>
          <div class="info-item">
            <span class="label">流速 Y:</span>
            <span class="value">{simulation?.getCurrent().velocity.y.toFixed(2)} m/s</span>
          </div>
          <div class="info-item">
            <span class="label">流速 Z:</span>
            <span class="value">{simulation?.getCurrent().velocity.z.toFixed(2)} m/s</span>
          </div>
          <div class="info-item">
            <span class="label">湍流度:</span>
            <span class="value">{simulation?.getCurrent().turbulence.toFixed(2)}</span>
          </div>
          <div class="info-item">
            <span class="label">温度:</span>
            <span class="value">{simulation?.getCurrent().temperature}°C</span>
          </div>
          <div class="info-item">
            <span class="label">盐度:</span>
            <span class="value">{simulation?.getCurrent().salinity} PSU</span>
          </div>
        </div>
      </section>

      <section class="panel-section">
        <h2>📋 语义映射</h2>
        <div class="mapping-info">
          <p>系统自动在工程单位和环保组织之间进行参数语义转换：</p>
          <ul>
            <li>泵功率 (kW) ↔ 环境影响分数</li>
            <li>采矿深度 (m) ↔ 深度等级</li>
            <li>沉积物释放率 (kg/s) ↔ 悬浮沉积物浓度</li>
            <li>流速 (m/s) ↔ 扩散率因子</li>
            <li>环境阈值 (kg/m³) ↔ 生态安全等级</li>
          </ul>
        </div>
      </section>
    </aside>
  </main>
</div>

<style>
  .app-container {
    min-height: 100vh;
    background: linear-gradient(135deg, #0a1628 0%, #1a2744 100%);
    color: #e0e6ed;
    font-family: 'Segoe UI', system-ui, sans-serif;
  }

  .app-header {
    padding: 1rem 2rem;
    background: rgba(10, 22, 40, 0.9);
    border-bottom: 1px solid #1e3a5f;
    backdrop-filter: blur(10px);
  }

  .app-header h1 {
    margin: 0 0 1rem 0;
    font-size: 1.5rem;
    font-weight: 600;
    color: #4fc3f7;
  }

  .status-bar {
    display: flex;
    gap: 2rem;
    align-items: center;
    flex-wrap: wrap;
  }

  .status-indicator {
    color: #78909c;
    font-weight: 500;
  }

  .status-indicator.active {
    color: #66bb6a;
  }

  .time-display,
  .particle-count,
  .pump-count {
    font-family: monospace;
    background: rgba(79, 195, 247, 0.1);
    padding: 0.25rem 0.75rem;
    border-radius: 4px;
  }

  .main-content {
    display: grid;
    grid-template-columns: 320px 1fr 300px;
    gap: 1rem;
    padding: 1rem;
    min-height: calc(100vh - 120px);
  }

  .left-panel,
  .right-panel {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    overflow-y: auto;
  }

  .panel-section {
    background: rgba(30, 58, 95, 0.5);
    border-radius: 12px;
    padding: 1rem;
    border: 1px solid #1e3a5f;
  }

  .panel-section h2 {
    margin: 0 0 1rem 0;
    font-size: 1.1rem;
    color: #4fc3f7;
    border-bottom: 1px solid #1e3a5f;
    padding-bottom: 0.5rem;
  }

  .panel-section h3 {
    margin: 0 0 0.75rem 0;
    font-size: 0.95rem;
    color: #81d4fa;
  }

  .control-buttons {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.5rem;
  }

  .btn {
    padding: 0.6rem 1rem;
    border: none;
    border-radius: 6px;
    font-size: 0.9rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
  }

  .btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .btn-primary {
    background: linear-gradient(135deg, #4fc3f7 0%, #29b6f6 100%);
    color: #0a1628;
  }

  .btn-primary:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(79, 195, 247, 0.3);
  }

  .btn-warning {
    background: linear-gradient(135deg, #ffb74d 0%, #ffa726 100%);
    color: #0a1628;
  }

  .btn-danger {
    background: linear-gradient(135deg, #ef5350 0%, #e53935 100%);
    color: white;
  }

  .btn-success {
    background: linear-gradient(135deg, #66bb6a 0%, #43a047 100%);
    color: white;
  }

  .btn-secondary {
    background: rgba(120, 144, 156, 0.3);
    color: #e0e6ed;
    border: 1px solid #546e7a;
  }

  .btn-small {
    padding: 0.25rem 0.5rem;
    font-size: 0.8rem;
    border-radius: 4px;
    border: none;
    background: #4fc3f7;
    color: #0a1628;
    cursor: pointer;
  }

  .stakeholder-tabs {
    display: flex;
    gap: 0.5rem;
    margin-bottom: 1rem;
  }

  .stakeholder-tabs button {
    flex: 1;
    padding: 0.5rem;
    border: 1px solid #1e3a5f;
    background: transparent;
    color: #78909c;
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.2s;
  }

  .stakeholder-tabs button.selected {
    background: #4fc3f7;
    color: #0a1628;
    border-color: #4fc3f7;
  }

  .parameter-list {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .parameter-item label {
    display: block;
    font-size: 0.85rem;
    color: #b0bec5;
    margin-bottom: 0.25rem;
  }

  .parameter-input {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .parameter-input input[type="range"] {
    flex: 1;
    accent-color: #4fc3f7;
  }

  .value-display {
    font-family: monospace;
    font-size: 0.8rem;
    min-width: 100px;
    text-align: right;
    color: #4fc3f7;
  }

  .sync-status {
    font-size: 0.75rem;
    color: #ef5350;
    text-align: right;
  }

  .sync-status.synced {
    color: #66bb6a;
  }

  .pump-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .pump-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.5rem;
    background: rgba(79, 195, 247, 0.1);
    border-radius: 6px;
  }

  .pump-name {
    font-size: 0.85rem;
  }

  .toggle-btn {
    padding: 0.25rem 0.5rem;
    font-size: 0.75rem;
    border: none;
    border-radius: 4px;
    background: #546e7a;
    color: white;
    cursor: pointer;
  }

  .toggle-btn.active {
    background: #66bb6a;
  }

  .info-btn {
    padding: 0.25rem 0.5rem;
    font-size: 0.75rem;
    border: 1px solid #4fc3f7;
    border-radius: 4px;
    background: transparent;
    color: #4fc3f7;
    cursor: pointer;
    margin-left: 0.25rem;
  }

  .force-analysis {
    margin-top: 1rem;
    padding-top: 1rem;
    border-top: 1px solid #1e3a5f;
  }

  .force-item {
    display: flex;
    justify-content: space-between;
    padding: 0.25rem 0;
    font-size: 0.8rem;
    font-family: monospace;
  }

  .net-force {
    font-weight: bold;
    color: #4fc3f7;
    border-top: 1px dashed #1e3a5f;
    margin-top: 0.25rem;
    padding-top: 0.5rem;
  }

  .canvas-section {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
  }

  #simulation-canvas {
    border-radius: 12px;
    border: 2px solid #1e3a5f;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  }

  .canvas-legend {
    display: flex;
    gap: 1.5rem;
  }

  .legend-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.85rem;
  }

  .legend-color {
    width: 16px;
    height: 16px;
    border-radius: 4px;
  }

  .snapshot-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    max-height: 300px;
    overflow-y: auto;
  }

  .snapshot-item {
    padding: 0.5rem;
    background: rgba(79, 195, 247, 0.05);
    border-radius: 6px;
    border: 1px solid #1e3a5f;
  }

  .snapshot-info {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    margin-bottom: 0.5rem;
  }

  .snapshot-time {
    font-size: 0.85rem;
    font-weight: 500;
  }

  .snapshot-meta {
    font-size: 0.75rem;
    color: #78909c;
  }

  .snapshot-actions {
    display: flex;
    gap: 0.5rem;
  }

  .empty-message {
    text-align: center;
    color: #78909c;
    font-size: 0.85rem;
    padding: 1rem;
  }

  .refresh-btn {
    width: 100%;
    margin-top: 0.75rem;
  }

  .info-grid {
    display: grid;
    gap: 0.5rem;
  }

  .info-item {
    display: flex;
    justify-content: space-between;
    padding: 0.4rem 0;
    border-bottom: 1px solid rgba(30, 58, 95, 0.5);
    font-size: 0.85rem;
  }

  .info-item .label {
    color: #78909c;
  }

  .info-item .value {
    color: #4fc3f7;
    font-family: monospace;
  }

  .mapping-info {
    font-size: 0.8rem;
    line-height: 1.6;
  }

  .mapping-info ul {
    margin: 0.5rem 0 0 1.25rem;
    padding: 0;
  }

  .mapping-info li {
    margin: 0.25rem 0;
    color: #b0bec5;
  }
</style>
