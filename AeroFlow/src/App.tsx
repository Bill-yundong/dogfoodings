import { createSignal, createEffect, onMount, For, Show } from 'solid-js';
import { RNGKEpsilonSolver } from './lib/turbulence/RNGKEpsilon';
import { WindFieldVisualizer, DEFAULT_CONFIG } from './lib/visualization/WindFieldVisualizer';
import { WindHazardEvaluator } from './lib/assessment/WindHazardEvaluator';
import { windFieldDB } from './lib/database/WindFieldDB';
import './App.css';

function App() {
  const [flowField, setFlowField] = createSignal<any>(null);
  const [buildings, setBuildings] = createSignal<any[]>([]);
  const [isSimulating, setIsSimulating] = createSignal(false);
  const [inletVelocity, setInletVelocity] = createSignal(10);
  const [currentCity] = createSignal({
    id: 'city_shanghai',
    name: '上海市',
    dominantWindDirection: 45,
  });
  const [savedRecords, setSavedRecords] = createSignal<any[]>([]);
  const [assessmentReport, setAssessmentReport] = createSignal<any>(null);
  const [activeTab, setActiveTab] = createSignal<any>('visualization');
  const [visConfig, setVisConfig] = createSignal<any>(DEFAULT_CONFIG);
  const [initialized, setInitialized] = createSignal(false);

  let visualizer: WindFieldVisualizer | null = null;
  const solver = new RNGKEpsilonSolver();
  const evaluator = new WindHazardEvaluator();

  const initVisualizer = (element: HTMLDivElement) => {
    if (!visualizer && element) {
      visualizer = new WindFieldVisualizer(element, visConfig());
      if (buildings().length > 0) {
        visualizer.setBuildings(buildings());
      }
      if (flowField()) {
        visualizer.setFlowField(flowField()!);
      }
    }
  };

  onMount(async () => {
    try {
      generateSampleBuildings();
      await windFieldDB.init();
      await loadSavedRecords();
      setInitialized(true);
    } catch (error) {
      console.error('初始化失败:', error);
    }
  });

  createEffect(() => {
    if (visualizer && flowField()) {
      visualizer.setFlowField(flowField()!);
    }
  });

  createEffect(() => {
    if (visualizer) {
      visualizer.updateConfig(visConfig());
    }
  });

  const generateSampleBuildings = () => {
    const sampleBuildings = [
      { id: 'b1', x: 100, y: 100, z: 0, width: 40, depth: 40, height: 200 },
      { id: 'b2', x: 180, y: 100, z: 0, width: 35, depth: 35, height: 150 },
      { id: 'b3', x: 100, y: 200, z: 0, width: 50, depth: 45, height: 180 },
      { id: 'b4', x: 200, y: 180, z: 0, width: 45, depth: 40, height: 220 },
      { id: 'b5', x: 280, y: 120, z: 0, width: 38, depth: 38, height: 160 },
      { id: 'b6', x: 320, y: 250, z: 0, width: 55, depth: 50, height: 250 },
      { id: 'b7', x: 150, y: 300, z: 0, width: 42, depth: 42, height: 190 },
      { id: 'b8', x: 250, y: 320, z: 0, width: 48, depth: 45, height: 170 },
    ];
    setBuildings(sampleBuildings);
    solver.setBuildings(sampleBuildings);
  };

  const runSimulation = async () => {
    try {
      setIsSimulating(true);
      const nx = 50;
      const ny = 50;
      const nz = 30;
      const dx = 10;
      const dy = 10;
      const dz = 10;

      const field = solver.initFlowField(nx, ny, nz, dx, dy, dz, inletVelocity());
      await new Promise(resolve => setTimeout(resolve, 100));
      await solver.solve(field, 30);
      setFlowField(field);
      setIsSimulating(false);
    } catch (error) {
      console.error('模拟失败:', error);
      setIsSimulating(false);
    }
  };

  const runAssessment = () => {
    if (!flowField()) {
      alert('请先运行风场模拟');
      return;
    }

    const report = evaluator.evaluateWindField(
      flowField()!,
      buildings(),
      currentCity().id,
      `sim_${Date.now()}`
    );
    setAssessmentReport(report);
  };

  const saveToDatabase = async () => {
    if (!flowField()) {
      alert('请先运行风场模拟');
      return;
    }

    const record: Omit<any, 'id' | 'createdAt' | 'updatedAt'> = {
      cityId: currentCity().id,
      simulationId: `sim_${Date.now()}`,
      timestamp: Date.now(),
      name: `${currentCity().name} 风场模拟 - ${new Date().toLocaleString()}`,
      description: '城市建筑群微气候风环境模拟数据',
      inletVelocity: inletVelocity(),
      windDirection: currentCity().dominantWindDirection,
      buildings: buildings(),
      flowFieldData: windFieldDB.flowFieldToSerializable(flowField()!)
    };

    await windFieldDB.saveWindField(record);
    await loadSavedRecords();
    alert('保存成功！');
  };

  const loadSavedRecords = async () => {
    const records = await windFieldDB.getAllWindFields();
    setSavedRecords(records);
  };

  const loadRecord = async (record: any) => {
    const field = windFieldDB.serializableToFlowField(record.flowFieldData);
    setFlowField(field);
    setBuildings(record.buildings);
    solver.setBuildings(record.buildings);
    setInletVelocity(record.inletVelocity);
  };

  const deleteRecord = async (id: string) => {
    if (confirm('确定要删除这条记录吗？')) {
      await windFieldDB.deleteWindField(id);
      await loadSavedRecords();
    }
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'low': return '#22c55e';
      case 'medium': return '#eab308';
      case 'high': return '#f97316';
      case 'severe': return '#ef4444';
      default: return '#6b7280';
    }
  };

  return (
    <div class="app-container">
      <header class="header">
        <div class="header-content">
          <div class="logo">
            <h1>AeroFlow - 超高层建筑群微气候风环境模拟平台</h1>
          </div>
          <div class="city-info">
            <span class="city-name">{currentCity().name}</span>
            <span class="wind-info">主导风向: {currentCity().dominantWindDirection}°</span>
          </div>
        </div>
      </header>

      <div class="main-content">
        <aside class="sidebar">
          <div class="control-panel">
            <h3>模拟控制</h3>
            
            <div class="control-group">
              <label>入口风速 (m/s)</label>
              <input 
                type="range" 
                min="1" 
                max="30" 
                value={inletVelocity()} 
                onInput={(e: any) => setInletVelocity(Number(e.target.value))}
                disabled={isSimulating()}
              />
              <span class="value-display">{inletVelocity()} m/s</span>
            </div>

            <button 
              class="btn btn-primary" 
              onClick={runSimulation}
              disabled={isSimulating()}
            >
              {isSimulating() ? '计算中...' : '运行风场模拟'}
            </button>

            <Show when={flowField()}>
              <button class="btn btn-secondary" onClick={runAssessment}>
                生成风害评估报告
              </button>
              <button class="btn btn-outline" onClick={saveToDatabase}>
                保存到数据库
              </button>
            </Show>
          </div>

          <div class="control-panel">
            <h3>可视化选项</h3>
            
            <div class="checkbox-group">
              <label>
                <input 
                  type="checkbox" 
                  checked={visConfig().showVelocityVectors}
                  onChange={(e: any) => setVisConfig({...visConfig(), showVelocityVectors: e.target.checked})}
                />
                速度矢量
              </label>
              <label>
                <input 
                  type="checkbox" 
                  checked={visConfig().showPressureContours}
                  onChange={(e: any) => setVisConfig({...visConfig(), showPressureContours: e.target.checked})}
                />
                压力等值面
              </label>
            </div>
          </div>

          <div class="building-list">
            <h3>建筑列表 ({buildings().length})</h3>
            <div class="building-items">
              <For each={buildings()}>
                {(building) => (
                  <div class="building-item">
                    <span class="building-id">{building.id}</span>
                    <span class="building-height">H = {building.height}m</span>
                  </div>
                )}
              </For>
            </div>
          </div>
        </aside>

        <main class="content-area">
          <div class="tabs">
            <button 
              classList={{ 'tab-btn': true, 'active': activeTab() === 'visualization' }}
              onClick={() => setActiveTab('visualization')}
            >
              3D 可视化
            </button>
            <button 
              classList={{ 'tab-btn': true, 'active': activeTab() === 'assessment' }}
              onClick={() => setActiveTab('assessment')}
            >
              风害评估
            </button>
            <button 
              classList={{ 'tab-btn': true, 'active': activeTab() === 'database' }}
              onClick={() => setActiveTab('database')}
            >
              历史数据
            </button>
          </div>

          <div class="tab-content">
            <Show when={activeTab() === 'visualization'}>
              <div ref={initVisualizer} class="visualization-canvas"></div>
              
              <Show when={flowField()}>
                <div class="metrics-panel">
                  <div class="metric-card">
                    <span class="metric-label">最大风速</span>
                    <span class="metric-value">{Math.max(...Array.from(flowField()!.u.map((u: number, i: number) => 
                      Math.sqrt(u*u + flowField()!.v[i]*flowField()!.v[i] + flowField()!.w[i]*flowField()!.w[i])
                    ))).toFixed(1)} m/s</span>
                  </div>
                  <div class="metric-card">
                    <span class="metric-label">网格总数</span>
                    <span class="metric-value">{flowField()!.nx * flowField()!.ny * flowField()!.nz}</span>
                  </div>
                  <div class="metric-card">
                    <span class="metric-label">建筑数量</span>
                    <span class="metric-value">{buildings().length}</span>
                  </div>
                </div>
              </Show>

              <div class="legend-panel">
                <h4>风速色谱</h4>
                <div class="color-gradient">
                  <div class="gradient-bar"></div>
                  <div class="gradient-labels">
                    <span>0 m/s</span>
                    <span>10 m/s</span>
                    <span>20 m/s</span>
                  </div>
                </div>
              </div>
            </Show>

            <Show when={activeTab() === 'assessment'}>
              <Show when={assessmentReport()} fallback={
                <div class="empty-state">
                  <p>请先运行风场模拟，然后点击"生成风害评估报告"</p>
                </div>
              }>
                <div class="assessment-report">
                  <div class="report-header">
                    <h2>风环境安全评估报告</h2>
                    <div class="risk-badge" style={{ background: getRiskColor(assessmentReport()!.overallRiskLevel) }}>
                      {assessmentReport()!.overallRiskLevel === 'low' ? '低风险' :
                       assessmentReport()!.overallRiskLevel === 'medium' ? '中等风险' :
                       assessmentReport()!.overallRiskLevel === 'high' ? '高风险' : '严重风险'}
                    </div>
                  </div>

                  <div class="summary-section">
                    <h3>评估摘要</h3>
                    <p>{assessmentReport()!.summary}</p>
                  </div>

                  <div class="recommendations-section">
                    <h3>改善建议</h3>
                    <ul class="recommendations-list">
                      <For each={assessmentReport()!.recommendations}>
                        {(rec: string) => <li>{rec}</li>}
                      </For>
                    </ul>
                  </div>
                </div>
              </Show>
            </Show>

            <Show when={activeTab() === 'database'}>
              <div class="database-view">
                <div class="db-header">
                  <h2>风场模拟历史记录</h2>
                  <button class="btn btn-small" onClick={loadSavedRecords}>刷新</button>
                </div>
                
                <Show when={savedRecords().length === 0}>
                  <div class="empty-state">
                    <p>暂无保存的记录，运行模拟后点击"保存到数据库"</p>
                  </div>
                </Show>

                <div class="records-list">
                  <For each={savedRecords()}>
                    {(record) => (
                      <div class="record-card">
                        <div class="record-header">
                          <h4>{record.name}</h4>
                          <span class="record-date">{new Date(record.timestamp).toLocaleString()}</span>
                        </div>
                        <div class="record-meta">
                          <span>入口风速: {record.inletVelocity} m/s</span>
                          <span>建筑数量: {record.buildings.length}</span>
                        </div>
                        <div class="record-actions">
                          <button class="btn btn-small btn-secondary" onClick={() => loadRecord(record)}>
                            加载
                          </button>
                          <button class="btn btn-small btn-danger" onClick={() => deleteRecord(record.id!)}>
                            删除
                          </button>
                        </div>
                      </div>
                    )}
                  </For>
                </div>
              </div>
            </Show>
          </div>
        </main>
      </div>

      <footer class="footer">
        <p>AeroFlow v1.0 - 基于 RNG k-ε 模型的城市微气候风环境模拟系统</p>
      </footer>
    </div>
  );
}

export default App;
