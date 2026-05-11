import { createSignal, createEffect, onCleanup } from 'solid-js';
import { Terrain3D } from './components/Terrain3D';
import { ElevationService } from './services/ElevationService';
import { SimulationService } from './services/SimulationService';
import { CommandDispatcher } from './services/CommandDispatcher';
import { OfflineStorage } from './services/OfflineStorage';
import { TerrainPoint, FirePoint, Command, RescueUnit } from './types';
import './App.css';

const elevationService = new ElevationService(100);
const simulationService = new SimulationService();
const commandDispatcher = new CommandDispatcher();
const offlineStorage = new OfflineStorage();

export function App() {
  const [terrain, setTerrain] = createSignal<TerrainPoint[][]>([]);
  const [fires, setFires] = createSignal<FirePoint[]>([]);
  const [commands, setCommands] = createSignal<Command[]>([]);
  const [units, setUnits] = createSignal<RescueUnit[]>([]);
  const [simulationTime, setSimulationTime] = createSignal(0);
  const [isSimulating, setIsSimulating] = createSignal(false);
  const [selectedCommandType, setSelectedCommandType] = createSignal<Command['type']>('contain');
  const [selectedPriority, setSelectedPriority] = createSignal<Command['priority']>('high');
  const [initialized, setInitialized] = createSignal(false);

  createEffect(async () => {
    if (initialized()) return;
    
    const terrainData = await elevationService.fetchElevationData(35, 110);
    setTerrain(terrainData);

    const initialFires: FirePoint[] = [
      { id: 'fire-1', x: 500, y: 500, intensity: 0.9, temperature: 950, spreadRate: 0 },
      { id: 'fire-2', x: 450, y: 550, intensity: 0.7, temperature: 850, spreadRate: 0 }
    ];
    setFires(initialFires);

    await simulationService.init(terrainData, initialFires);

    simulationService.onUpdate((state) => {
      setFires(state.fires);
      setSimulationTime(state.time);
    });

    commandDispatcher.registerCenter('center-alpha', (cmd) => {
      console.log('Alpha 中心收到指令:', cmd);
    });
    commandDispatcher.registerCenter('center-beta', (cmd) => {
      console.log('Beta 中心收到指令:', cmd);
    });

    commandDispatcher.onCommand((cmd) => {
      setCommands(prev => [...prev, cmd]);
    });
    commandDispatcher.onUnitsUpdate((newUnits) => {
      setUnits(newUnits);
    });

    setUnits(commandDispatcher.getAllUnits());

    await offlineStorage.init();
    const offlineData = await offlineStorage.syncOfflineData();
    console.log('离线数据:', offlineData);

    setInitialized(true);

    onCleanup(() => {
      simulationService.destroy();
    });
  });

  const toggleSimulation = () => {
    console.log('点击开始/暂停', initialized(), isSimulating());
    if (!initialized()) return;
    
    if (isSimulating()) {
      simulationService.stop();
    } else {
      simulationService.start();
    }
    setIsSimulating(!isSimulating());
  };

  const addFire = () => {
    console.log('点击添加火点', initialized());
    if (!initialized()) return;
    
    const x = 300 + Math.random() * 400;
    const y = 300 + Math.random() * 400;
    simulationService.addFire(x, y, 0.8);
  };

  const clearFires = () => {
    console.log('点击清除火点', initialized());
    if (!initialized()) return;
    
    simulationService.clearFires();
    setFires([]);
  };

  const dispatchCommand = () => {
    console.log('点击分发指令', initialized(), selectedCommandType(), selectedPriority());
    if (!initialized()) return;
    
    const fire = fires()[0];
    if (!fire) return;

    commandDispatcher.dispatch({
      type: selectedCommandType(),
      priority: selectedPriority(),
      target: { x: fire.x, y: fire.y },
      fromCenter: 'center-alpha',
      toCenter: 'center-beta'
    });
  };

  const saveCurrentPlan = async () => {
    if (!initialized()) return;
    
    await offlineStorage.savePlan({
      id: `plan-${Date.now()}`,
      name: `救援方案 ${new Date().toLocaleString()}`,
      units: commandDispatcher.getAllUnits(),
      commands: commands(),
      scenario: '森林火灾响应'
    });
    alert('方案已保存到本地存储');
  };

  return (
    <div class="app-container">
      <header class="header">
        <h1>🔥 PyroLink - 森林扑救响应底座</h1>
        <div class="header-stats">
          <span>模拟时间: {simulationTime().toFixed(1)}s</span>
          <span>火点数量: {fires().length}</span>
          <span>救援单位: {units().length}</span>
        </div>
      </header>

      <div class="main-content">
        <aside class="control-panel">
          <section class="panel-section">
            <h3>模拟控制</h3>
            <div class="button-group">
              <button 
                class={`btn ${isSimulating() ? 'btn-danger' : 'btn-primary'}`}
                onClick={toggleSimulation}
              >
                {isSimulating() ? '⏸ 暂停' : '▶ 开始'}
              </button>
              <button class="btn btn-warning" onClick={addFire}>
                ＋ 添加火点
              </button>
              <button class="btn btn-secondary" onClick={clearFires}>
                ✕ 清除
              </button>
            </div>
          </section>

          <section class="panel-section">
            <h3>指挥调度</h3>
            <div class="form-group">
              <label>指令类型:</label>
              <select 
                value={selectedCommandType()} 
                onChange={(e) => setSelectedCommandType(e.currentTarget.value as Command['type'])}
              >
                <option value="contain">围控火势</option>
                <option value="deploy">部署力量</option>
                <option value="evacuate">人员疏散</option>
                <option value="monitor">监测监控</option>
              </select>
            </div>
            <div class="form-group">
              <label>优先级:</label>
              <select 
                value={selectedPriority()} 
                onChange={(e) => setSelectedPriority(e.currentTarget.value as Command['priority'])}
              >
                <option value="critical">紧急</option>
                <option value="high">高</option>
                <option value="medium">中</option>
                <option value="low">低</option>
              </select>
            </div>
            <button class="btn btn-primary btn-full" onClick={dispatchCommand}>
              📡 分发指令
            </button>
            <button class="btn btn-success btn-full" style={{ marginTop: '8px' }} onClick={saveCurrentPlan}>
              💾 保存方案
            </button>
          </section>

          <section class="panel-section">
            <h3>救援单位状态</h3>
            <div class="unit-list">
              {units().map(unit => (
                <div class="unit-item" classList={{ 
                  'unit-deployed': unit.status === 'deployed',
                  'unit-enroute': unit.status === 'en_route'
                }}>
                  <span class="unit-icon">
                    {unit.type === 'firefighter' ? '👨‍🚒' : 
                     unit.type === 'helicopter' ? '🚁' : 
                     unit.type === 'truck' ? '🚒' : '💧'}
                  </span>
                  <span class="unit-name">{unit.name}</span>
                  <span class="unit-status">{unit.status === 'available' ? '待命' : 
                                             unit.status === 'en_route' ? '途中' : '已部署'}</span>
                </div>
              ))}
            </div>
          </section>

          <section class="panel-section">
            <h3>指令队列</h3>
            <div class="command-list">
              {commands().slice(-5).reverse().map(cmd => (
                <div class="command-item">
                  <span class="command-type">{cmd.type}</span>
                  <span class="command-status">{cmd.status === 'pending' ? '待处理' : 
                                                cmd.status === 'acknowledged' ? '已确认' : '已完成'}</span>
                </div>
              ))}
            </div>
          </section>
        </aside>

        <main class="viewer-container">
          <Terrain3D terrain={terrain()} fires={fires()} />
          <div class="viewer-overlay">
            <div class="info-card">
              <h4>系统状态</h4>
              <p>地形网格: 100×100</p>
              <p>渲染引擎: Three.js</p>
              <p>计算模式: Web Worker</p>
              <p>离线存储: IndexedDB</p>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
