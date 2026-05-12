import { Component, createEffect, createSignal } from 'solid-js';
import { EnergyBalance } from './components/EnergyBalance';
import { StationList } from './components/StationList';
import { SystemMetrics } from './components/SystemMetrics';
import { EnergyChart } from './components/EnergyChart';
import { energyStore } from './store/energyStore';
import { preloadTypicalDaySnapshots, energyDB } from './utils/indexedDB';
import { OperationalSnapshot } from './types/energy';

const App: Component = () => {
  const { startRealTimeSync, runOptimization, loadSnapshot } = energyStore;
  const [snapshots, setSnapshots] = createSignal<OperationalSnapshot[]>([]);
  const [showSnapshots, setShowSnapshots] = createSignal(false);

  createEffect(() => {
    preloadTypicalDaySnapshots();
    startRealTimeSync();
    loadSnapshots();
  });

  const loadSnapshots = async () => {
    const latest = await energyDB.getLatestSnapshots(10);
    setSnapshots(latest);
  };

  const handleLoadSnapshot = async (snapshot: OperationalSnapshot) => {
    await loadSnapshot(snapshot);
    setShowSnapshots(false);
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const weatherTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      typical_summer: '夏季',
      typical_winter: '冬季',
      typical_transition: '过渡',
    };
    return labels[type] || type;
  };

  return (
    <div class="min-h-screen bg-gray-100">
      <header class="bg-white shadow-sm">
        <div class="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div class="flex justify-between items-center">
            <div class="flex items-center space-x-3">
              <div class="w-10 h-10 bg-gradient-to-br from-blue-500 to-green-500 rounded-lg flex items-center justify-center">
                <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div>
                <h1 class="text-xl font-bold text-gray-900">SmartGridFlow</h1>
                <p class="text-sm text-gray-500">综合能源系统多能互补态势仿真</p>
              </div>
            </div>
            <div class="flex items-center space-x-3">
              <button
                onClick={() => setShowSnapshots(!showSnapshots())}
                class="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
              >
                历史快照 ({snapshots().length})
              </button>
              <button
                onClick={() => runOptimization()}
                class="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm font-medium flex items-center space-x-2"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span>立即优化</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <main class="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
        {showSnapshots() && (
          <div class="mb-6 bg-white rounded-lg shadow-md p-6">
            <div class="flex justify-between items-center mb-4">
              <h3 class="text-lg font-semibold text-gray-800">历史运行快照</h3>
              <button
                onClick={() => setShowSnapshots(false)}
                class="text-gray-400 hover:text-gray-600"
              >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            {snapshots().length > 0 ? (
              <div class="grid grid-cols-2 md:grid-cols-5 gap-3">
                {snapshots().map((snapshot) => (
                  <button
                    onClick={() => handleLoadSnapshot(snapshot)}
                    class="p-3 bg-gray-50 rounded-lg hover:bg-blue-50 transition-colors text-left border border-gray-200 hover:border-blue-300"
                  >
                    <div class="text-xs font-medium text-gray-900">{formatDate(snapshot.timestamp)}</div>
                    <div class="text-xs text-gray-500 mt-1">{weatherTypeLabel(snapshot.weatherType)}</div>
                    <div class="text-xs text-green-600 mt-1">效率: {(snapshot.optimizationScore * 100).toFixed(1)}%</div>
                  </button>
                ))}
              </div>
            ) : (
              <p class="text-gray-500 text-sm">暂无快照数据</p>
            )}
          </div>
        )}

        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div class="lg:col-span-2 space-y-6">
            <EnergyBalance />
            <StationList />
            <EnergyChart />
          </div>
          <div class="space-y-6">
            <SystemMetrics />
            
            <div class="bg-white rounded-lg shadow-md p-6">
              <h3 class="text-lg font-semibold text-gray-800 mb-4">系统状态</h3>
              <div class="space-y-3">
                <div class="flex items-center justify-between">
                  <span class="text-sm text-gray-600">实时同步</span>
                  <span class="flex items-center space-x-1">
                    <span class="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                    <span class="text-sm text-green-600">运行中</span>
                  </span>
                </div>
                <div class="flex items-center justify-between">
                  <span class="text-sm text-gray-600">数据对齐</span>
                  <span class="flex items-center space-x-1">
                    <span class="w-2 h-2 bg-green-500 rounded-full" />
                    <span class="text-sm text-green-600">已对齐</span>
                  </span>
                </div>
                <div class="flex items-center justify-between">
                  <span class="text-sm text-gray-600">在线能源站</span>
                  <span class="text-sm font-medium text-gray-900">3 / 3</span>
                </div>
                <div class="flex items-center justify-between">
                  <span class="text-sm text-gray-600">IndexedDB 缓存</span>
                  <span class="text-sm font-medium text-gray-900">已启用</span>
                </div>
              </div>
            </div>

            <div class="bg-gradient-to-br from-blue-500 to-green-500 rounded-lg shadow-md p-6 text-white">
              <h3 class="text-lg font-semibold mb-3">关于 SmartGridFlow</h3>
              <div class="space-y-2 text-sm opacity-90">
                <p>基于 SolidJS 的综合能源系统多能互补态势仿真平台。</p>
                <p>主要功能：</p>
                <ul class="list-disc list-inside space-y-1">
                  <li>冷热电三联供实时数据对齐</li>
                  <li>异步多能源潮流算法优化</li>
                  <li>典型气象日快照缓存</li>
                  <li>跨系统协同效能提升</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer class="bg-white border-t mt-8">
        <div class="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <p class="text-center text-sm text-gray-500">
            SmartGridFlow v1.0.0 - 智慧城区低碳运行综合能源仿真平台
          </p>
        </div>
      </footer>
    </div>
  );
};

export default App;
