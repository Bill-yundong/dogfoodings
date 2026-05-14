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
    <div class="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100">
      <header class="bg-white/80 backdrop-blur-md shadow-lg sticky top-0 z-50 border-b border-slate-200/50">
        <div class="max-w-7xl mx-auto px-6 py-5">
          <div class="flex justify-between items-center">
            <div>
              <h1 class="text-3xl font-bold bg-gradient-to-r from-blue-600 via-cyan-600 to-teal-600 bg-clip-text text-transparent">
                🏗️ CranePulse 塔吊群防碰撞系统
              </h1>
              <p class="text-sm text-slate-500 mt-2 flex items-center gap-3">
                <span class="inline-flex items-center gap-1">
                  <span class="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                  吊运包络线对齐
                </span>
                <span class="inline-flex items-center gap-1">
                  <span class="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                  异步碰撞检测
                </span>
                <span class="inline-flex items-center gap-1">
                  <span class="w-1.5 h-1.5 rounded-full bg-orange-500"></span>
                  动能预警
                </span>
                <span class="inline-flex items-center gap-1">
                  <span class="w-1.5 h-1.5 rounded-full bg-purple-500"></span>
                  IndexedDB 黑匣子
                </span>
              </p>
            </div>
            <div class="flex items-center gap-6">
              <div class="text-right bg-slate-50 px-5 py-3 rounded-xl border border-slate-200">
                <div class="text-xs text-slate-500 uppercase tracking-wider">
                  会话 ID
                </div>
                <div class="text-lg font-mono font-semibold text-slate-700">
                  {store.sessionId().split('-')[1]}
                </div>
                <div class="text-sm text-slate-500 mt-1">
                  <span class="font-medium text-blue-600">{store.cranes().length}</span> 台塔吊运行中
                </div>
              </div>
              <button
                onClick={store.isRunning() ? store.stopSimulation : store.startSimulation}
                class={`px-8 py-3.5 rounded-2xl font-semibold text-white transition-all duration-300 transform hover:scale-105 active:scale-95 shadow-xl ${
                  store.isRunning()
                    ? 'bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 shadow-red-500/30'
                    : 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 shadow-emerald-500/30'
                }`}
              >
                <span class="flex items-center gap-2">
                  {store.isRunning() ? (
                    <>
                      <span class="w-2 h-2 rounded-full bg-white animate-ping"></span>
                      ⏹️ 停止仿真
                    </>
                  ) : (
                    <>
                      ▶️ 开始仿真
                    </>
                  )}
                </span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <main class="max-w-7xl mx-auto px-6 py-10">
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div class="lg:col-span-2 space-y-8">
            <div class="bg-white/90 backdrop-blur-sm rounded-3xl shadow-xl shadow-slate-200/50 p-8 border border-slate-200/50">
              <div class="flex justify-between items-center mb-8">
                <div>
                  <h2 class="text-xl font-bold text-slate-800 flex items-center gap-3">
                    <span class="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white text-lg">
                      📍
                    </span>
                    作业区域可视化
                  </h2>
                  <p class="text-sm text-slate-500 mt-2 ml-12 pl-1">实时监控塔吊运行状态与吊运轨迹</p>
                </div>
                <div class="flex items-center gap-3 px-5 py-3 bg-slate-50 rounded-2xl border border-slate-200">
                  <span class={`w-4 h-4 rounded-full ${store.isRunning() ? 'bg-emerald-500 animate-pulse shadow-lg shadow-emerald-500/50' : 'bg-slate-400'}`}></span>
                  <span class={`text-sm font-semibold ${store.isRunning() ? 'text-emerald-600' : 'text-slate-500'}`}>
                    {store.isRunning() ? '运行中' : '已停止'}
                  </span>
                </div>
              </div>
              <div class="bg-gradient-to-br from-slate-50 to-blue-50 rounded-2xl p-6 border border-slate-200">
                <CraneVisualizer cranes={store.cranes()} envelopes={store.envelopes()} />
              </div>
              <div class="mt-8 grid grid-cols-4 gap-4">
                <div class="bg-gradient-to-br from-orange-50 to-amber-50 rounded-2xl p-5 text-center border border-orange-200/50">
                  <div class="text-3xl font-bold text-orange-600">{store.collisionRisks().length}</div>
                  <div class="text-sm text-orange-600/70 font-medium mt-1">碰撞风险</div>
                </div>
                <div class="bg-gradient-to-br from-red-50 to-rose-50 rounded-2xl p-5 text-center border border-red-200/50">
                  <div class="text-3xl font-bold text-red-600">{store.alerts().filter(a => !a.acknowledged).length}</div>
                  <div class="text-sm text-red-600/70 font-medium mt-1">未处理警报</div>
                </div>
                <div class="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-2xl p-5 text-center border border-blue-200/50">
                  <div class="text-3xl font-bold text-blue-600">{store.envelopes().size}</div>
                  <div class="text-sm text-blue-600/70 font-medium mt-1">活跃包络线</div>
                </div>
                <div class="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl p-5 text-center border border-emerald-200/50">
                  <div class="text-3xl font-bold text-emerald-600">100ms</div>
                  <div class="text-sm text-emerald-600/70 font-medium mt-1">更新间隔</div>
                </div>
              </div>
            </div>

            <div class="bg-white/90 backdrop-blur-sm rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-200/50 overflow-hidden">
              <BlackBoxViewer />
            </div>
          </div>

          <div class="space-y-8">
            <div class="bg-white/90 backdrop-blur-sm rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-200/50 overflow-hidden">
              <CraneList cranes={store.cranes()} />
            </div>
            <div class="bg-white/90 backdrop-blur-sm rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-200/50 overflow-hidden">
              <AlertPanel
                alerts={store.alerts()}
                collisionRisks={store.collisionRisks()}
                onAcknowledge={store.acknowledgeAlert}
              />
            </div>
            <div class="bg-white/90 backdrop-blur-sm rounded-3xl shadow-xl shadow-slate-200/50 p-8 border border-slate-200/50">
              <h3 class="text-xl font-bold text-slate-800 mb-6 flex items-center gap-3">
                <span class="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-lg">
                  ℹ️
                </span>
                系统说明
              </h3>
              <div class="space-y-4">
                <div class="flex items-start gap-4 p-4 bg-blue-50/50 rounded-2xl border border-blue-100 hover:bg-blue-50 transition-colors">
                  <span class="text-2xl">🔵</span>
                  <div>
                    <span class="font-semibold text-blue-800 block">吊运包络线</span>
                    <span class="text-sm text-blue-600/70">预测吊钩未来5秒运动轨迹</span>
                  </div>
                </div>
                <div class="flex items-start gap-4 p-4 bg-emerald-50/50 rounded-2xl border border-emerald-100 hover:bg-emerald-50 transition-colors">
                  <span class="text-2xl">🟢</span>
                  <div>
                    <span class="font-semibold text-emerald-800 block">异步碰撞检测</span>
                    <span class="text-sm text-emerald-600/70">实时计算多塔吊间距离</span>
                  </div>
                </div>
                <div class="flex items-start gap-4 p-4 bg-orange-50/50 rounded-2xl border border-orange-100 hover:bg-orange-50 transition-colors">
                  <span class="text-2xl">🟠</span>
                  <div>
                    <span class="font-semibold text-orange-800 block">动能反馈</span>
                    <span class="text-sm text-orange-600/70">计算碰撞时的总动能</span>
                  </div>
                </div>
                <div class="flex items-start gap-4 p-4 bg-purple-50/50 rounded-2xl border border-purple-100 hover:bg-purple-50 transition-colors">
                  <span class="text-2xl">🟣</span>
                  <div>
                    <span class="font-semibold text-purple-800 block">黑匣子</span>
                    <span class="text-sm text-purple-600/70">IndexedDB 持久化存储轨迹数据</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer class="bg-white/60 backdrop-blur-sm border-t border-slate-200/50 mt-16">
        <div class="max-w-7xl mx-auto px-6 py-8 text-center">
          <p class="text-sm text-slate-500 font-medium">
            CranePulse 塔吊群防碰撞系统 | 基于 SolidJS + TypeScript + IndexedDB
          </p>
          <p class="text-xs text-slate-400 mt-2">
            为智慧工地提供全方位安全保障
          </p>
        </div>
      </footer>
    </div>
  );
}

export default App;
