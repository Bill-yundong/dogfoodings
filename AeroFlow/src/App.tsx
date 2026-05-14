import { Component, createSignal, createEffect, onMount, Show, For } from 'solid-js';
import { RNGKEpsilonSolver, FlowField, Building } from './lib/turbulence/RNGKEpsilon';
import { WindFieldVisualizer, VisualizationConfig, DEFAULT_CONFIG } from './lib/visualization/WindFieldVisualizer';
import { WindHazardEvaluator, AssessmentReport } from './lib/assessment/WindHazardEvaluator';
import { windFieldDB, WindFieldRecord, CityInfo } from './lib/database/WindFieldDB';
import './App.css';

const App: Component = () => {
  const [flowField, setFlowField] = createSignal<FlowField | null>(null);
  const [buildings, setBuildings] = createSignal<Building[]>([]);
  const [isSimulating, setIsSimulating] = createSignal(false);
  const [simulationProgress, setSimulationProgress] = createSignal(0);
  const [inletVelocity, setInletVelocity] = createSignal(10);
  const [gridResolution, setGridResolution] = createSignal(50);
  const [currentCity, setCurrentCity] = createSignal<CityInfo>({
    id: 'city_shanghai',
    name: '上海市',
    country: '中国',
    latitude: 31.2304,
    longitude: 121.4737,
    timezone: 'Asia/Shanghai',
    dominantWindDirection: 45,
    averageWindSpeed: 3.5
  });
  const [savedRecords, setSavedRecords] = createSignal<WindFieldRecord[]>([]);
  const [assessmentReport, setAssessmentReport] = createSignal<AssessmentReport | null>(null);
  const [activeTab, setActiveTab] = createSignal<'visualization' | 'assessment' | 'database'>('visualization');
  const [visConfig, setVisConfig] = createSignal<VisualizationConfig>(DEFAULT_CONFIG);

  let visualizerContainer: HTMLDivElement | undefined;
  let visualizer: WindFieldVisualizer | null = null;
  const solver = new RNGKEpsilonSolver();
  const evaluator = new WindHazardEvaluator();

  onMount(async () => {
    try {
      await windFieldDB.init();
      await loadSavedRecords();
      generateSampleBuildings();
    } catch (error) {
      console.error('数据库初始化失败:', error);
    }
  });

  const cleanup = () => {
    if (visualizer) {
      visualizer.destroy();
      visualizer = null;
    }
  };

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
    const sampleBuildings: Building[] = [
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
      setSimulationProgress(0);

      const nx = gridResolution();
      const ny = gridResolution();
      const nz = Math.floor(gridResolution() * 0.6);
      const dx = 10;
      const dy = 10;
      const dz = 10;

      setSimulationProgress(10);
      await new Promise(resolve => setTimeout(resolve, 50));

      const field = solver.initFlowField(nx, ny, nz, dx, dy, dz, inletVelocity());
      setSimulationProgress(30);

      await new Promise(resolve => setTimeout(resolve, 50));
      setSimulationProgress(50);

      await solver.solve(field, 30);
      setSimulationProgress(80);

      setFlowField(field);
      setSimulationProgress(100);
      
      await new Promise(resolve => setTimeout(resolve, 300));
      setIsSimulating(false);
    } catch (error) {
      console.error('模拟失败:', error);
      setIsSimulating(false);
      alert('模拟失败: ' + (error as Error).message);
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

    const record: Omit<WindFieldRecord, 'id' | 'createdAt' | 'updatedAt'> = {
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

  const loadRecord = async (record: WindFieldRecord) => {
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

  const getRiskText = (level: string) => {
    switch (level) {
      case 'low': return '低风险';
      case 'medium': return '中等风险';
      case 'high': return '高风险';
      case 'severe': return '严重风险';
      default: return '未知';
    }
  };

  return (
    <div class="app-container">
      <header class="header">
        <div class="header-content">
          <div class="logo">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
              <path d="M16 2L4 8V16C4 23.732 10.748 30 16 30C21.252 30 28 23.732 28 16V8L16 2Z" fill="#3b82f6"/>
              <path d="M16 8L20 10L16 14L12 10L16 8Z" fill="#93c5fd"/>
              <path d="M10 16L16 20L22 16" stroke="white" stroke-width="2" stroke-linecap="round"/>
            </svg>
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
                onInput={(e) => setInletVelocity(Number(e.target.value))}
                disabled={isSimulating()}
              />
              <span class="value-display">{inletVelocity()} m/s</span>
            </div>

            <div class="control-group">
              <label>网格分辨率</label>
              <select 
                value={gridResolution()} 
                onChange={(e) => setGridResolution(Number(e.target.value))}
                disabled={isSimulating()}
              >
                <option value="30">低 (30×30)</option>
                <option value="50">中 (50×50)</option>
                <option value="80">高 (80×80)</option>
              </select>
            </div>

            <button 
              class="btn btn-primary" 
              onClick={runSimulation}
              disabled={isSimulating()}
            >
              {isSimulating() ? '计算中...' : '运行风场模拟'}
            </button>

            <Show when={isSimulating()}>
              <div class="progress-bar">
                <div class="progress-fill" style={{ width: `${simulationProgress()}%` }}></div>
              </div>
            </Show>

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
                  onChange={(e) => setVisConfig({...visConfig(), showVelocityVectors: e.target.checked})}
                />
                速度矢量
              </label>
              <label>
                <input 
                  type="checkbox" 
                  checked={visConfig().showPressureContours}
                  onChange={(e) => setVisConfig({...visConfig(), showPressureContours: e.target.checked})}
                />
                压力等值面
              </label>
              <label>
                <input 
                  type="checkbox" 
                  checked={visConfig().showTurbulence}
                  onChange={(e) => setVisConfig({...visConfig(), showTurbulence: e.target.checked})}
                />
                湍流粒子
              </label>
              <label>
                <input 
                  type="checkbox" 
                  checked={visConfig().showBuildings}
                  onChange={(e) => setVisConfig({...visConfig(), showBuildings: e.target.checked})}
                />
                建筑模型
              </label>
            </div>

            <div class="control-group">
              <label>矢量缩放</label>
              <input 
                type="range" 
                min="1" 
                max="10" 
                step="0.5"
                value={visConfig().vectorScale}
                onInput={(e) => setVisConfig({...visConfig(), vectorScale: Number(e.target.value)})}
              />
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
                    <span class="metric-value">{Math.max(...Array.from(flowField()!.u.map((u, i) => 
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
                  <div class="metric-card">
                    <span class="metric-label">模拟区域</span>
                    <span class="metric-value">{flowField()!.nx * flowField()!.dx}m × {flowField()!.ny * flowField()!.dy}m</span>
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
                  <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="1.5">
                    <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                  </svg>
                  <p>请先运行风场模拟，然后点击"生成风害评估报告"</p>
                </div>
              }>
                <div class="assessment-report">
                  <div class="report-header">
                    <h2>风环境安全评估报告</h2>
                    <div class="risk-badge" style={{ background: getRiskColor(assessmentReport()!.overallRiskLevel) }}>
                      {getRiskText(assessmentReport()!.overallRiskLevel)}
                    </div>
                  </div>

                  <div class="summary-section">
                    <h3>评估摘要</h3>
                    <p>{assessmentReport()!.summary}</p>
                  </div>

                  <div class="metrics-grid">
                    <div class="metric-item">
                      <span class="metric-name">最大风速</span>
                      <span class="metric-number">{assessmentReport()!.metrics.maxWindSpeed.toFixed(1)} m/s</span>
                    </div>
                    <div class="metric-item">
                      <span class="metric-name">平均风速</span>
                      <span class="metric-number">{assessmentReport()!.metrics.avgWindSpeed.toFixed(1)} m/s</span>
                    </div>
                    <div class="metric-item">
                      <span class="metric-name">最大湍流强度</span>
                      <span class="metric-number">{(assessmentReport()!.metrics.maxTurbulenceIntensity * 100).toFixed(1)}%</span>
                    </div>
                    <div class="metric-item">
                      <span class="metric-name">峡谷放大系数</span>
                      <span class="metric-number">{assessmentReport()!.metrics.canyonAmplificationFactor.toFixed(2)}x</span>
                    </div>
                    <div class="metric-item">
                      <span class="metric-name">行人层风速</span>
                      <span class="metric-number">{assessmentReport()!.metrics.pedestrianLevelWindSpeed.toFixed(1)} m/s</span>
                    </div>
                    <div class="metric-item">
                      <span class="metric-name">风险区域数量</span>
                      <span class="metric-number">{assessmentReport()!.hazardZones.length}</span>
                    </div>
                  </div>

                  <Show when={assessmentReport()!.hazardZones.length > 0}>
                    <div class="zones-section">
                      <h3>风险区域分布</h3>
                      <div class="zones-list">
                        <For each={assessmentReport()!.hazardZones}>
                          {(zone) => (
                            <div class="zone-card" style={{ borderLeftColor: getRiskColor(zone.hazardLevel) }}>
                              <div class="zone-header">
                                <span class="zone-id">{zone.id}</span>
                                <span class="zone-level" style={{ background: getRiskColor(zone.hazardLevel) }}>
                                  {getRiskText(zone.hazardLevel)}
                                </span>
                              </div>
                              <div class="zone-details">
                                <p>位置: ({zone.x.toFixed(0)}, {zone.y.toFixed(0)}, {zone.z.toFixed(0)})</p>
                                <p>尺寸: {zone.width.toFixed(0)}m × {zone.depth.toFixed(0)}m × {zone.height.toFixed(0)}m</p>
                                <p>主要风险: {zone.primaryHazard === 'speed' ? '高速风' : 
                                             zone.primaryHazard === 'turbulence' ? '强湍流' :
                                             zone.primaryHazard === 'pressure' ? '高压差' : '峡谷效应'}</p>
                                <Show when={zone.affectedBuildings.length > 0}>
                                  <p>影响建筑: {zone.affectedBuildings.join(', ')}</p>
                                </Show>
                              </div>
                            </div>
                          )}
                        </For>
                      </div>
                    </div>
                  </Show>

                  <div class="recommendations-section">
                    <h3>改善建议</h3>
                    <ul class="recommendations-list">
                      <For each={assessmentReport()!.recommendations}>
                        {(rec) => <li>{rec}</li>}
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
                    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="1.5">
                      <path d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4"/>
                    </svg>
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
                          <span>网格: {record.flowFieldData.nx}×{record.flowFieldData.ny}</span>
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
        <p>AeroFlow v1.0 - 基于 RNG k-ε 模型的城市微气候风环境模拟系统 | Powered by SolidJS & Three.js</p>
      </footer>
    </div>
  );
};

export default App;
