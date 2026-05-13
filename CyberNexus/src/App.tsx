import type { Component } from 'solid-js';
import { createEffect, For } from 'solid-js';
import { createAppStore } from './app/store';
import { Dashboard } from './pages/Dashboard';
import { Analysis } from './pages/Analysis';
import { Fingerprints } from './pages/Fingerprints';
import { Settings } from './pages/Settings';

const App: Component = () => {
  const store = createAppStore();

  createEffect(() => {
    store.init();
  });

  const navItems = [
    { id: 'dashboard', label: '仪表盘', icon: '📊' },
    { id: 'analysis', label: '流量分析', icon: '🔍' },
    { id: 'fingerprints', label: '指纹库', icon: '🔐' },
    { id: 'settings', label: '设置', icon: '⚙️' },
  ] as const;

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
              <h1 class="text-xl font-bold text-white">CyberNexus</h1>
              <p class="text-xs text-gray-500">工业控制系统安全防御平台</p>
            </div>
          </div>

          <div class="flex items-center gap-4">
            <div class="flex items-center gap-2 text-sm">
              <span
                class={`w-2 h-2 rounded-full animate-pulse ${store.traffic.isProcessing() ? 'bg-yellow-400' : 'bg-green-400'}`}
              />
              <span class="text-gray-400">{store.traffic.isProcessing() ? '处理中...' : '系统正常'}</span>
            </div>
            <div class="flex items-center gap-3 text-sm">
              <span class="px-2 py-1 bg-blue-900/50 text-blue-300 rounded">
                特征: {store.statistics().totalFeatures}
              </span>
              <span class="px-2 py-1 bg-green-900/50 text-green-300 rounded">
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
            <For each={navItems}>
              {(item) => (
                <button
                  onClick={() => store.setActiveTab(item.id)}
                  class={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-left ${
                    store.activeTab() === item.id
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-400 hover:bg-gray-700 hover:text-gray-200'
                  }`}
                >
                  <span class="text-xl">{item.icon}</span>
                  <span class="font-medium">{item.label}</span>
                </button>
              )}
            </For>
          </div>

          <div class="mt-8 p-4 bg-gray-900/50 rounded-lg">
            <p class="text-xs text-gray-500 mb-2">实时告警</p>
            <div class="space-y-2 max-h-64 overflow-y-auto">
              <For each={store.alerts.alerts().slice(0, 5)}>
                {(alert) => (
                  <div
                    class={`text-xs p-2 rounded ${
                      alert.type === 'danger'
                        ? 'bg-red-900/30 text-red-300'
                        : alert.type === 'warning'
                        ? 'bg-yellow-900/30 text-yellow-300'
                        : 'bg-blue-900/30 text-blue-300'
                    }`}
                  >
                    {alert.message}
                  </div>
                )}
              </For>
              {store.alerts.alerts().length === 0 && (
                <p class="text-xs text-gray-500">暂无告警</p>
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
};

export default App;
