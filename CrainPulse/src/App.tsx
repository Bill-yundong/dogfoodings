import { createEffect, onMount } from 'solid-js';
import { createCraneStore } from './store/craneStore';
import { CraneVisualizer } from './components/CraneVisualizer';
import { CraneList } from './components/CraneList';
import { AlertPanel } from './components/AlertPanel';
import { BlackBoxViewer } from './components/BlackBoxViewer';
import './index.css';

function App() {
  const store = createCraneStore();

  onMount(() => {
    store.initDemoCranes();
  });

  createEffect(() => {
    if (store.alerts().length > 50) {
      store.clearOldAlerts();
    }
  });

  return (
    <div class="min-h-screen bg-gray-100">
      <header class="bg-white shadow-sm">
        <div class="max-w-7xl mx-auto px-4 py-4">
          <div class="flex justify-between items-center">
            <div>
              <h1 class="text-2xl font-bold text-gray-800">
                🏗️ CranePulse 塔吊群防碰撞系统
              </h1>
              <p class="text-sm text-gray-500 mt-1">
                吊运包络线对齐 | 异步碰撞检测 | 动能预警 | IndexedDB 黑匣子
              </p>
            </div>
            <div class="flex items-center gap-4">
              <div class="text-right">
                <div class="text-sm text-gray-500">
                  会话: {store.sessionId().split('-')[1]}
                </div>
                <div class="text-sm text-gray-500">
                  塔吊: {store.cranes().length} 台
                </div>
              </div>
              <button
                onClick={store.isRunning() ? store.stopSimulation : store.startSimulation}
                class={`px-6 py-2 rounded-lg font-medium text-white transition-all ${
                  store.isRunning()
                    ? 'bg-red-500 hover:bg-red-600'
                    : 'bg-green-500 hover:bg-green-600'
                }`}
              >
                {store.isRunning() ? '⏹️ 停止仿真' : '▶️ 开始仿真'}
              </button>
            </div>
          </div>
        </div>
      </header>

      <main class="max-w-7xl mx-auto px-4 py-6">
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div class="lg:col-span-2">
            <div class="bg-white rounded-lg shadow p-4">
              <div class="flex justify-between items-center mb-4">
                <h2 class="text-lg font-semibold text-gray-800">作业区域可视化</h2>
                <div class="flex items-center gap-2">
                  <span class={`w-3 h-3 rounded-full ${store.isRunning() ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></span>
                  <span class="text-sm text-gray-600">
                    {store.isRunning() ? '运行中' : '已停止'}
                  </span>
                </div>
              </div>
              <CraneVisualizer cranes={store.cranes()} envelopes={store.envelopes()} />
              <div class="mt-4 p-3 bg-gray-50 rounded-lg">
                <div class="grid grid-cols-4 gap-4 text-sm">
                  <div class="text-center">
                    <div class="font-medium text-gray-700">{store.collisionRisks().length}</div>
                    <div class="text-gray-500">碰撞风险</div>
                  </div>
                  <div class="text-center">
                    <div class="font-medium text-gray-700">{store.alerts().filter(a => !a.acknowledged).length}</div>
                    <div class="text-gray-500">未处理警报</div>
                  </div>
                  <div class="text-center">
                    <div class="font-medium text-gray-700">{store.envelopes().size}</div>
                    <div class="text-gray-500">活跃包络线</div>
                  </div>
                  <div class="text-center">
                    <div class="font-medium text-gray-700">100ms</div>
                    <div class="text-gray-500">更新间隔</div>
                  </div>
                </div>
              </div>
            </div>

            <div class="mt-6">
              <BlackBoxViewer />
            </div>
          </div>

          <div class="space-y-6">
            <CraneList cranes={store.cranes()} />
            <AlertPanel
              alerts={store.alerts()}
              collisionRisks={store.collisionRisks()}
              onAcknowledge={store.acknowledgeAlert}
            />
            <div class="bg-white rounded-lg shadow p-4">
              <h3 class="text-lg font-semibold mb-3 text-gray-800">系统说明</h3>
              <div class="space-y-2 text-sm text-gray-600">
                <div class="flex items-start gap-2">
                  <span class="text-blue-500">🔵</span>
                  <span><strong>吊运包络线:</strong> 预测吊钩未来5秒运动轨迹</span>
                </div>
                <div class="flex items-start gap-2">
                  <span class="text-green-500">🟢</span>
                  <span><strong>异步碰撞检测:</strong> 实时计算多塔吊间距离</span>
                </div>
                <div class="flex items-start gap-2">
                  <span class="text-orange-500">🟠</span>
                  <span><strong>动能反馈:</strong> 计算碰撞时的总动能</span>
                </div>
                <div class="flex items-start gap-2">
                  <span class="text-purple-500">🟣</span>
                  <span><strong>黑匣子:</strong> IndexedDB 持久化存储轨迹数据</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer class="bg-white border-t mt-8">
        <div class="max-w-7xl mx-auto px-4 py-4 text-center text-sm text-gray-500">
          CranePulse 塔吊群防碰撞系统 | 基于 SolidJS + TypeScript + IndexedDB
        </div>
      </footer>
    </div>
  );
}

export default App;
