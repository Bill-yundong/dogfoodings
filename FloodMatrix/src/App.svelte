<script>
  import { onMount, onDestroy } from 'svelte';
  import FloodGrid from './components/FloodGrid.svelte';
  import ControlPanel from './components/ControlPanel.svelte';
  import StatsPanel from './components/StatsPanel.svelte';
  import SnapshotList from './components/SnapshotList.svelte';
  import { SimulationWorkerManager } from './workers/SimulationWorkerManager';
  import { snapshotDB } from './storage/FloodSnapshotDB';

  let config = {
    gridSize: 20,
    timeStep: 1,
    totalTime: 100,
    rainfallIntensity: 50
  };

  let grid = [];
  let nodes = [];
  let connections = [];
  let floodAreas = [];
  let snapshots = [];

  let progress = 0;
  let currentStep = 0;
  let totalSteps = 0;
  let isRunning = false;

  let workerManager = null;

  onMount(async () => {
    await snapshotDB.init();
    await loadSnapshots();

    workerManager = new SimulationWorkerManager({
      onInitialized: (data) => {
        grid = data.grid;
        nodes = data.nodes;
        connections = data.connections;
        floodAreas = [];
      },
      onProgress: (data) => {
        progress = data.progress;
        grid = data.grid;
        nodes = data.nodes;
        connections = data.connections;
        floodAreas = data.floodAreas || [];
        currentStep = data.currentStep;
        totalSteps = data.totalSteps;
      },
      onPaused: (data) => {
        isRunning = false;
        currentStep = data.currentStep;
        totalSteps = data.totalSteps;
      },
      onStopped: (data) => {
        isRunning = false;
        progress = 0;
        currentStep = 0;
        totalSteps = 0;
        grid = data.grid;
        nodes = data.nodes;
        connections = data.connections;
        floodAreas = data.floodAreas || [];
      },
      onComplete: (data) => {
        isRunning = false;
        grid = data.grid;
        nodes = data.nodes;
        connections = data.connections;
        floodAreas = data.floodAreas || [];
      },
      onError: (error) => {
        console.error('Simulation error:', error);
        isRunning = false;
      }
    });

    workerManager.init(config);
  });

  onDestroy(() => {
    if (workerManager) {
      workerManager.terminate();
    }
  });

  async function loadSnapshots() {
    try {
      snapshots = await snapshotDB.getAllSnapshots();
    } catch (error) {
      console.error('Failed to load snapshots:', error);
    }
  }

  function handleConfigChange(newConfig) {
    config = newConfig;
  }

  function handleStart() {
    if (workerManager) {
      isRunning = true;
      workerManager.start(config.totalTime);
    }
  }

  function handlePause() {
    if (workerManager) {
      workerManager.pause();
      isRunning = false;
    }
  }

  function handleStop() {
    if (workerManager) {
      workerManager.stop();
      isRunning = false;
      progress = 0;
      currentStep = 0;
      totalSteps = 0;
    }
  }

  function handleStep() {
    if (workerManager) {
      workerManager.step();
    }
  }

  function handleReset() {
    handleStop();
    if (workerManager) {
      workerManager.init(config);
    }
    floodAreas = [];
  }

  async function handleSaveSnapshot() {
    const snapshot = {
      id: `snapshot_${Date.now()}`,
      name: `模拟结果 ${new Date().toLocaleString('zh-CN')}`,
      timestamp: Date.now(),
      rainfallData: {
        id: `rain_${Date.now()}`,
        timestamp: Date.now(),
        duration: currentStep * config.timeStep,
        intensity: config.rainfallIntensity,
        area: '模拟区域'
      },
      simulationResult: {
        id: `result_${Date.now()}`,
        timestamp: Date.now(),
        config: { ...config },
        gridStates: grid,
        pipeFlows: new Map(),
        floodAreas: [...floodAreas]
      },
      trafficAlerts: [],
      drainageStatus: [],
      notes: ''
    };

    try {
      await snapshotDB.saveSnapshot(snapshot);
      await loadSnapshots();
      alert('快照保存成功！');
    } catch (error) {
      console.error('Failed to save snapshot:', error);
      alert('快照保存失败！');
    }
  }

  function handleLoadSnapshot(snapshot) {
    config = { ...snapshot.simulationResult.config };
    grid = snapshot.simulationResult.gridStates;
    floodAreas = snapshot.simulationResult.floodAreas;
    if (workerManager) {
      workerManager.init(config);
    }
  }

  async function handleDeleteSnapshot(id) {
    if (confirm('确定要删除这个快照吗？')) {
      try {
        await snapshotDB.deleteSnapshot(id);
        await loadSnapshots();
      } catch (error) {
        console.error('Failed to delete snapshot:', error);
      }
    }
  }
</script>

<div class="app">
  <header class="header">
    <h1>🌊 FloodMatrix - 内涝灾害精细化治理系统</h1>
    <p class="subtitle">基于降雨径流建模的城市内涝模拟与决策支持平台</p>
  </header>

  <main class="main-content">
    <div class="left-panel">
      <ControlPanel
        {config}
        {isRunning}
        {progress}
        {currentStep}
        {totalSteps}
        on:configChange={(e) => handleConfigChange(e.detail)}
        on:start={handleStart}
        on:pause={handlePause}
        on:stop={handleStop}
        on:step={handleStep}
        on:reset={handleReset}
        on:saveSnapshot={handleSaveSnapshot}
      />
      <SnapshotList
        snapshots={snapshots}
        on:load={(e) => handleLoadSnapshot(e.detail)}
        on:delete={(e) => handleDeleteSnapshot(e.detail)}
      />
    </div>

    <div class="center-panel">
      <div class="grid-wrapper">
        <h3>🗺️ 内涝演化模拟</h3>
        <FloodGrid {grid} {nodes} {connections} {floodAreas} cellSize={22} />
      </div>
    </div>

    <div class="right-panel">
      <StatsPanel {floodAreas} {grid} {nodes} />
      <div class="info-card">
        <h3>ℹ️ 系统说明</h3>
        <ul>
          <li><strong>降雨径流建模</strong>：实时计算各区域积水深度</li>
          <li><strong>管网拓扑模拟</strong>：Web Worker 异步执行，不阻塞UI</li>
          <li><strong>IndexedDB 存储</strong>：持久化历史模拟快照</li>
          <li><strong>防汛调度支持</strong>：为决策提供数据支撑</li>
        </ul>
      </div>
    </div>
  </main>

  <footer class="footer">
    <p>FloodMatrix © 2024 - 城市内涝精细化治理解决方案</p>
  </footer>
</div>

<style>
  .app {
    min-height: 100vh;
    background: linear-gradient(135deg, #0a1929 0%, #0f172a 50%, #1e293b 100%);
    color: #e2e8f0;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  }

  .header {
    text-align: center;
    padding: 24px 20px;
    border-bottom: 1px solid #334155;
    background: rgba(15, 23, 42, 0.8);
    backdrop-filter: blur(10px);
  }

  .header h1 {
    margin: 0 0 8px 0;
    font-size: 1.6rem;
    font-weight: 700;
    background: linear-gradient(90deg, #60a5fa, #a78bfa);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  .subtitle {
    margin: 0;
    font-size: 0.9rem;
    color: #94a3b8;
  }

  .main-content {
    display: grid;
    grid-template-columns: 300px 1fr 300px;
    gap: 20px;
    padding: 20px;
    max-width: 1600px;
    margin: 0 auto;
  }

  .left-panel,
  .right-panel {
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  .center-panel {
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  .grid-wrapper {
    width: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  .grid-wrapper h3 {
    margin: 0 0 15px 0;
    font-size: 1.1rem;
    color: #60a5fa;
  }

  .info-card {
    background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
    border-radius: 12px;
    padding: 20px;
    border: 1px solid #334155;
  }

  .info-card h3 {
    margin: 0 0 15px 0;
    font-size: 1.1rem;
    color: #60a5fa;
  }

  .info-card ul {
    margin: 0;
    padding-left: 20px;
    font-size: 0.85rem;
    color: #94a3b8;
    line-height: 1.8;
  }

  .info-card li {
    margin-bottom: 8px;
  }

  .info-card strong {
    color: #cbd5e1;
  }

  .footer {
    text-align: center;
    padding: 16px;
    border-top: 1px solid #334155;
    color: #64748b;
    font-size: 0.8rem;
  }

  .footer p {
    margin: 0;
  }

  @media (max-width: 1200px) {
    .main-content {
      grid-template-columns: 1fr;
    }
  }
</style>
