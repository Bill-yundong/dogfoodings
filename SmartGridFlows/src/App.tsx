import type { Component } from 'solid-js';
import { createEffect } from 'solid-js';
import CommandCenter from './components/CommandCenter';
import ControlPanel from './components/ControlPanel';
import { energyStore } from './store/energyStore';
import { snapshotDB } from './utils/snapshotDB';

const App: Component = () => {
  createEffect(() => {
    snapshotDB.init().then(() => {
      console.log('IndexedDB 初始化完成');
    });

    energyStore.startRealTimeAlignment(5000);
    energyStore.startDataSimulation(3000);

    return () => {
      energyStore.stopRealTimeAlignment();
      energyStore.stopDataSimulation();
    };
  });

  return (
    <div class="min-h-screen bg-gray-100">
      <header class="bg-gradient-to-r from-blue-700 to-cyan-600 text-white shadow-xl sticky top-0 z-50">
        <div class="px-6 py-5">
          <div class="flex items-center justify-between">
            <div>
              <h1 class="text-2xl font-bold flex items-center gap-3">
                <span class="text-4xl">🏙️</span>
                智慧城区能源指挥中心
              </h1>
              <p class="text-blue-100 mt-2 text-base">
                冷热电三联供 · 多能互补优化 · 低碳智慧运行
              </p>
            </div>
            <div class="text-right hidden sm:block">
              <div class="text-sm text-blue-100">实时数据对齐</div>
              <div class="text-xl font-semibold">
                {new Date(energyStore.commandCenterData().lastAlignment).toLocaleTimeString('zh-CN')}
              </div>
            </div>
          </div>
        </div>
      </header>

      <div class="flex flex-col xl:flex-row">
        <main class="flex-1 p-6 overflow-x-hidden">
          <CommandCenter
            data={energyStore.commandCenterData()}
            weather={energyStore.weather()}
          />
        </main>
        <aside class="xl:w-96 w-full p-6 bg-white border-l border-gray-200 shadow-lg">
          <ControlPanel />
        </aside>
      </div>
    </div>
  );
};

export default App;
