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
    <div class="min-h-screen bg-gray-50 flex flex-col">
      <header class="bg-gradient-to-r from-blue-700 via-blue-600 to-cyan-500 text-white shadow-2xl sticky top-0 z-50 flex-shrink-0">
        <div class="px-4 sm:px-6 lg:px-8 py-4 sm:py-5">
          <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h1 class="text-xl sm:text-2xl font-bold flex items-center gap-2 sm:gap-3">
                <span class="text-2xl sm:text-4xl">🏙️</span>
                智慧城区能源指挥中心
              </h1>
              <p class="text-blue-100 mt-1 text-sm sm:text-base">
                冷热电三联供 · 多能互补优化 · 低碳智慧运行
              </p>
            </div>
            <div class="text-left sm:text-right bg-white/10 backdrop-blur rounded-xl px-4 py-3">
              <div class="text-xs sm:text-sm text-blue-100">实时数据对齐</div>
              <div class="text-lg sm:text-xl font-semibold">
                {new Date(energyStore.commandCenterData().lastAlignment).toLocaleTimeString('zh-CN')}
              </div>
            </div>
          </div>
        </div>
      </header>

      <div class="flex flex-col lg:flex-row flex-1 min-h-0">
        <main class="flex-1 min-w-0 p-3 sm:p-4 lg:p-6">
          <CommandCenter
            data={energyStore.commandCenterData()}
            weather={energyStore.weather()}
          />
        </main>
        <aside class="lg:w-[420px] xl:w-[460px] 2xl:w-[500px] flex-shrink-0 bg-gray-100/50 p-3 sm:p-4 lg:p-6 border-t lg:border-t-0 lg:border-l border-gray-200 overflow-y-auto">
          <ControlPanel />
        </aside>
      </div>
    </div>
  );
};

export default App;
