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
    <div class="min-h-screen bg-gray-50">
      <div class="flex flex-col lg:flex-row">
        <div class="flex-1">
          <CommandCenter
            data={energyStore.commandCenterData()}
            weather={energyStore.weather()}
          />
        </div>
        <div class="lg:w-96 p-6 bg-gray-100">
          <ControlPanel />
        </div>
      </div>
    </div>
  );
};

export default App;
