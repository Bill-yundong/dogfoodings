import type { Component } from 'solid-js';
import { DoorStatusPanel } from './components/DoorStatusPanel';
import { FaultSignalPanel } from './components/FaultSignalPanel';
import { FaultChainSimulatorPanel } from './components/FaultChainSimulator';
import { DataStatsPanel } from './components/DataStatsPanel';

const App: Component = () => {
  return (
    <div class="min-h-screen bg-gray-900 p-4">
      <header class="mb-6">
        <h1 class="text-3xl font-bold text-white">
          地铁屏蔽门监控系统
        </h1>
        <p class="text-gray-400 mt-1">
          基于 SolidJS + IndexedDB 的故障信号语义同步系统
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
        <p>异步逻辑门阵列模拟故障链传导 | IndexedDB 存储万级开关门循环特征数据</p>
        <p>维保系统与行车控制模块间的故障信号语义同步</p>
      </footer>
    </div>
  );
};

export default App;
