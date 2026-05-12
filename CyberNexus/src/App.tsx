import { createEffect } from 'solid-js';
import { useSecurityStore } from './store/useSecurityStore';
import { Dashboard } from './components/Dashboard';
import { Analysis } from './components/Analysis';
import { Fingerprints } from './components/Fingerprints';
import { Settings } from './components/Settings';

function App() {
  const store = useSecurityStore();

  createEffect(() => {
    store.init();
  });

  const navItems = [
    { id: 'dashboard', label: '仪表盘', icon: '📊' },
    { id: 'analysis', label: '流量分析', icon: '🔍' },
    { id: 'fingerprints', label: '指纹库', icon: '🔐' },
    { id: 'settings', label: '设置', icon: '⚙️' },
  ];

  const renderContent = () => {
    switch (store.activeTab()) {
      case 'dashboard':
        return <Dashboard store={store} />;
      case 'analysis':
        return <Analysis store={store} />;
      case 'fingerprints':
        return <Fingerprints store={store} />;
      case 'settings':
        return <Settings store={store} />;
      default:
        return <Dashboard store={store} />;
    }
  };

  return (
    <div class="min-h-screen bg-gray-900 text-white">
      <header class="bg-gray-800 border-b border-gray-700 px-6 py-4">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <span class="text-3xl">🛡️</span>
            <div>
              <h1 class="text-xl font-bold text-gray-100">CyberNexus</h1>
              <p class="text-xs text-gray-500">工业控制系统安全防御平台</p>
            </div>
          </div>

          <div class="flex items-center gap-4">
            <div class="flex items-center gap-2 text-sm">
              <span class={`w-2 h-2 rounded-full ${store.isProcessing() ? 'bg-yellow-400 animate-pulse' : 'bg-green-400'}`} />
              <span class="text-gray-400">{store.isProcessing() ? '处理中...' : '系统正常'}</span>
            </div>
            <div class="flex items-center gap-3 text-sm">
              <span class="px-2 py-1 bg-blue-900/50 text-blue-300 rounded">
                特征: {store.statistics().totalFeatures}
              </span>
              <span class="px-2 py-1 bg-purple-900/50 text-purple-300 rounded">
                指纹: {store.statistics().totalFingerprints}
              </span>
              {store.statistics().aptClusterCount > 0 && (
                <span class="px-2 py-1 bg-red-900/50 text-red-300 rounded animate-pulse">
                  APT: {store.statistics().aptClusterCount}
                </span>
              )}
            </div>
          </div>
        </div>
      </header>

      <div class="flex">
        <nav class="w-56 min-h-screen bg-gray-800 border-r border-gray-700 p-4">
          <div class="space-y-2">
            {navItems.map((item) => (
              <button
                onClick={() => store.setActiveTab(item.id as any)}
                class={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-left ${
                  store.activeTab() === item.id
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-400 hover:bg-gray-700 hover:text-gray-200'
                }`}
              >
                <span class="text-xl">{item.icon}</span>
                <span class="font-medium">{item.label}</span>
              </button>
            ))}
          </div>

          <div class="mt-8 p-4 bg-gray-900/50 rounded-lg">
            <p class="text-xs text-gray-500 mb-2">实时告警</p>
            <div class="space-y-2 max-h-40 overflow-y-auto">
              {store.alerts().slice(0, 5).map((alert) => (
                <div
                  class={`text-xs p-2 rounded ${
                    alert.type === 'danger'
                      ? 'bg-red-900/50 text-red-300'
                      : alert.type === 'warning'
                      ? 'bg-yellow-900/50 text-yellow-300'
                      : 'bg-blue-900/50 text-blue-300'
                  }`}
                >
                  {alert.message}
                </div>
              ))}
              {store.alerts().length === 0 && (
                <p class="text-xs text-gray-600">暂无告警</p>
              )}
            </div>
          </div>
        </nav>

        <main class="flex-1 overflow-auto">
          {renderContent()}
        </main>
      </div>

      <footer class="bg-gray-800 border-t border-gray-700 px-6 py-3">
        <div class="flex items-center justify-between text-xs text-gray-500">
          <span>CyberNexus v1.0.0 - 工业控制系统安全防御平台</span>
          <span>基于 SolidJS + TypeScript + IndexedDB</span>
        </div>
      </footer>
    </div>
  );
}

export default App;
