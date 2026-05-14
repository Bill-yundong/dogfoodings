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
    <div class="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-100">
      <header class="bg-white/90 backdrop-blur-xl shadow-2xl sticky top-0 z-50 border-b border-slate-200/60">
        <div class="max-w-7xl mx-auto px-8 py-7">
          <div class="flex justify-between items-start lg:items-center flex-col lg:flex-row gap-6">
            <div>
              <h1 class="text-3xl lg:text-4xl font-extrabold bg-gradient-to-r from-blue-600 via-cyan-500 to-teal-500 bg-clip-text text-transparent flex items-center gap-4">
                <span class="text-4xl">🏗️</span>
                CranePulse 塔吊群防碰撞系统
              </h1>
              <p class="text-base text-slate-500 mt-4 flex flex-wrap items-center gap-5">
                <span class="inline-flex items-center gap-2 bg-blue-50 px-4 py-2 rounded-full border border-blue-100">
                  <span class="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse"></span>
                  <span class="text-blue-700 font-medium">吊运包络线对齐</span>
                </span>
                <span class="inline-flex items-center gap-2 bg-emerald-50 px-4 py-2 rounded-full border border-emerald-100">
                  <span class="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span class="text-emerald-700 font-medium">异步碰撞检测</span>
                </span>
                <span class="inline-flex items-center gap-2 bg-amber-50 px-4 py-2 rounded-full border border-amber-100">
                  <span class="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse"></span>
                  <span class="text-amber-700 font-medium">动能预警</span>
                </span>
                <span class="inline-flex items-center gap-2 bg-violet-50 px-4 py-2 rounded-full border border-violet-100">
                  <span class="w-2.5 h-2.5 rounded-full bg-violet-500 animate-pulse"></span>
                  <span class="text-violet-700 font-medium">IndexedDB 黑匣子</span>
                </span>
              </p>
            </div>
            <div class="flex items-center gap-7 flex-wrap">
              <div class="text-right bg-gradient-to-br from-slate-50 to-blue-50 px-7 py-5 rounded-2xl border-2 border-slate-200 shadow-lg min-w-[180px]">
                <div class="text-xs text-slate-400 uppercase tracking-widest font-bold mb-2">
                  会话 ID
                </div>
                <div class="text-xl font-mono font-bold text-slate-800">
                  #{store.sessionId().split('-')[1].slice(0, 8)}
                </div>
                <div class="text-sm text-slate-500 mt-3 pt-3 border-t border-slate-200/50">
                  <span class="text-2xl font-bold text-blue-600">{store.cranes().length}</span>
                  <span class="ml-2 text-slate-600">台塔吊运行中</span>
                </div>
              </div>
              <button
                onClick={store.isRunning() ? store.stopSimulation : store.startSimulation}
                class={`px-10 py-5 rounded-2xl font-bold text-white transition-all duration-300 transform hover:scale-105 active:scale-95 shadow-2xl ${
                  store.isRunning()
                    ? 'bg-gradient-to-r from-red-500 via-rose-500 to-pink-500 hover:from-red-600 hover:via-rose-600 hover:to-pink-600 shadow-red-500/40'
                    : 'bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 hover:from-emerald-600 hover:via-teal-600 hover:to-cyan-600 shadow-emerald-500/40'
                }`}
              >
                <span class="flex items-center gap-3 text-lg">
                  {store.isRunning() ? (
                    <>
                      <span class="w-3.5 h-3.5 rounded-full bg-white animate-ping shadow-lg"></span>
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

      <main class="max-w-7xl mx-auto px-8 py-14">
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-10">
          <div class="lg:col-span-2 space-y-10">
            <div class="bg-white/95 backdrop-blur-xl rounded-[2.5rem] shadow-2xl shadow-slate-200/70 p-10 border border-slate-200/60">
              <div class="flex justify-between items-start mb-10 flex-col md:flex-row gap-6">
                <div>
                  <h2 class="text-2xl font-extrabold text-slate-800 flex items-center gap-4">
                    <span class="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white text-2xl shadow-lg shadow-blue-500/30">
                      📍
                    </span>
                    作业区域可视化
                  </h2>
                  <p class="text-base text-slate-500 mt-4 ml-18 pl-4">
                    实时监控塔吊运行状态与吊运轨迹预测
                  </p>
                </div>
                <div class="flex items-center gap-4 px-7 py-4 bg-gradient-to-r from-slate-50 to-slate-100 rounded-2xl border-2 border-slate-200 shadow-md">
                  <span class={`w-5 h-5 rounded-full ${store.isRunning() ? 'bg-emerald-500 animate-pulse shadow-xl shadow-emerald-500/50' : 'bg-slate-400'}`}></span>
                  <span class={`text-base font-bold ${store.isRunning() ? 'text-emerald-600' : 'text-slate-500'}`}>
                    {store.isRunning() ? '🟢 运行中' : '⚪ 已停止'}
                  </span>
                </div>
              </div>
              <div class="bg-gradient-to-br from-slate-50/80 via-blue-50/50 to-cyan-50/30 rounded-[2rem] p-8 border-2 border-slate-200/60 shadow-inner">
                <CraneVisualizer cranes={store.cranes()} envelopes={store.envelopes()} />
              </div>
              <div class="mt-10 grid grid-cols-2 md:grid-cols-4 gap-6">
                <div class="bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 rounded-2xl p-7 text-center border-2 border-orange-200/60 hover:shadow-lg transition-shadow">
                  <div class="text-4xl font-extrabold text-orange-600">{store.collisionRisks().length}</div>
                  <div class="text-base text-orange-600/80 font-semibold mt-2">碰撞风险</div>
                </div>
                <div class="bg-gradient-to-br from-red-50 via-rose-50 to-pink-50 rounded-2xl p-7 text-center border-2 border-red-200/60 hover:shadow-lg transition-shadow">
                  <div class="text-4xl font-extrabold text-red-600">{store.alerts().filter(a => !a.acknowledged).length}</div>
                  <div class="text-base text-red-600/80 font-semibold mt-2">未处理警报</div>
                </div>
                <div class="bg-gradient-to-br from-blue-50 via-cyan-50 to-sky-50 rounded-2xl p-7 text-center border-2 border-blue-200/60 hover:shadow-lg transition-shadow">
                  <div class="text-4xl font-extrabold text-blue-600">{store.envelopes().size}</div>
                  <div class="text-base text-blue-600/80 font-semibold mt-2">活跃包络线</div>
                </div>
                <div class="bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 rounded-2xl p-7 text-center border-2 border-emerald-200/60 hover:shadow-lg transition-shadow">
                  <div class="text-4xl font-extrabold text-emerald-600">100ms</div>
                  <div class="text-base text-emerald-600/80 font-semibold mt-2">更新间隔</div>
                </div>
              </div>
            </div>

            <div class="bg-white/95 backdrop-blur-xl rounded-[2.5rem] shadow-2xl shadow-slate-200/70 border border-slate-200/60 overflow-hidden">
              <BlackBoxViewer />
            </div>
          </div>

          <div class="space-y-10">
            <div class="bg-white/95 backdrop-blur-xl rounded-[2.5rem] shadow-2xl shadow-slate-200/70 border border-slate-200/60 overflow-hidden">
              <CraneList cranes={store.cranes()} />
            </div>
            <div class="bg-white/95 backdrop-blur-xl rounded-[2.5rem] shadow-2xl shadow-slate-200/70 border border-slate-200/60 overflow-hidden">
              <AlertPanel
                alerts={store.alerts()}
                collisionRisks={store.collisionRisks()}
                onAcknowledge={store.acknowledgeAlert}
              />
            </div>
            <div class="bg-white/95 backdrop-blur-xl rounded-[2.5rem] shadow-2xl shadow-slate-200/70 p-10 border border-slate-200/60">
              <h3 class="text-2xl font-extrabold text-slate-800 mb-8 flex items-center gap-4">
                <span class="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center text-white text-2xl shadow-lg shadow-violet-500/30">
                  ℹ️
                </span>
                系统功能说明
              </h3>
              <div class="space-y-5">
                <div class="flex items-start gap-5 p-6 bg-blue-50/60 rounded-2xl border-2 border-blue-100 hover:bg-blue-50 hover:shadow-md transition-all duration-300">
                  <span class="text-3xl">🔵</span>
                  <div class="pt-1">
                    <span class="font-bold text-blue-800 text-lg block">吊运包络线</span>
                    <span class="text-sm text-blue-600/80 mt-2 block">基于当前运动状态，预测吊钩未来5秒的运动轨迹范围</span>
                  </div>
                </div>
                <div class="flex items-start gap-5 p-6 bg-emerald-50/60 rounded-2xl border-2 border-emerald-100 hover:bg-emerald-50 hover:shadow-md transition-all duration-300">
                  <span class="text-3xl">🟢</span>
                  <div class="pt-1">
                    <span class="font-bold text-emerald-800 text-lg block">异步碰撞检测</span>
                    <span class="text-sm text-emerald-600/80 mt-2 block">实时计算多台塔吊之间的最小距离，动态评估风险等级</span>
                  </div>
                </div>
                <div class="flex items-start gap-5 p-6 bg-amber-50/60 rounded-2xl border-2 border-amber-100 hover:bg-amber-50 hover:shadow-md transition-all duration-300">
                  <span class="text-3xl">🟠</span>
                  <div class="pt-1">
                    <span class="font-bold text-amber-800 text-lg block">动能反馈预警</span>
                    <span class="text-sm text-amber-600/80 mt-2 block">计算碰撞时的总动能，根据动能大小提供分级预警</span>
                  </div>
                </div>
                <div class="flex items-start gap-5 p-6 bg-violet-50/60 rounded-2xl border-2 border-violet-100 hover:bg-violet-50 hover:shadow-md transition-all duration-300">
                  <span class="text-3xl">🟣</span>
                  <div class="pt-1">
                    <span class="font-bold text-violet-800 text-lg block">黑匣子数据记录</span>
                    <span class="text-sm text-violet-600/80 mt-2 block">利用 IndexedDB 本地持久化存储所有塔吊历史运行轨迹数据</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer class="bg-white/80 backdrop-blur-xl border-t border-slate-200/60 mt-20">
        <div class="max-w-7xl mx-auto px-8 py-12 text-center">
          <p class="text-base text-slate-500 font-semibold">
            🏗️ CranePulse 塔吊群防碰撞系统 | 基于 SolidJS + TypeScript + IndexedDB 构建
          </p>
          <p class="text-sm text-slate-400 mt-4">
            为智慧工地提供全方位、全天候的安全保障服务
          </p>
        </div>
      </footer>
    </div>
  );
}

export default App;
