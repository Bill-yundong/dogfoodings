import { Component, createEffect } from 'solid-js';
import { DoorStatusPanel } from './presentation/components/panels/DoorStatusPanel';
import { FaultSignalPanel } from './presentation/components/panels/FaultSignalPanel';
import { FaultChainSimulatorPanel } from './presentation/components/panels/FaultChainSimulatorPanel';
import { DataStatsPanel } from './presentation/components/panels/DataStatsPanel';
import { actions } from './presentation/store';

const App: Component = () => {
  createEffect(() => {
    actions.initialize();
  });

  return (
    <div class="min-h-screen bg-gray-900 p-4">
      <header class="mb-6">
        <h1 class="text-3xl font-bold text-white">
          地铁屏蔽门监控系统
        </h1>
        <p class="text-gray-400 mt-1">
          基于 Clean Architecture 的分层架构 | IndexedDB 持久化存储 | 故障语义同步
        </p>
      </header>

      <div class="grid grid-cols-12 gap-4">
        <div class="col-span-8">
          <DoorStatusPanel />
        </div>
        
        <div class="col-span-4">
          <FaultChainSimulatorPanel />
        </div>
        
        <div class="col-span-6">
          <FaultSignalPanel />
        </div>
        
        <div class="col-span-6">
          <DataStatsPanel />
        </div>
      </div>

      <footer class="mt-8 text-center text-gray-500 text-sm">
        <p>核心层 → 基础设施层 → 应用层 → 表现层 → UI层</p>
        <p>异步逻辑门阵列模拟故障链传导 | 维保系统与行车控制模块语义同步</p>
      </footer>
    </div>
  );
};

export default App;
