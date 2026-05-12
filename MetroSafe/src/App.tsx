import { Component, onMount } from 'solid-js';
import { actions } from './presentation/store';
import { DoorStatusPanel } from './presentation/components/panels/DoorStatusPanel';
import { FaultSignalPanel } from './presentation/components/panels/FaultSignalPanel';
import { FaultChainSimulatorPanel } from './presentation/components/panels/FaultChainSimulatorPanel';
import { DataStatsPanel } from './presentation/components/panels/DataStatsPanel';
import './App.css';

const App: Component = () => {
  onMount(async () => {
    await actions.initialize();
  });

  return (
    <div style={{ 'min-height': '100vh', background: '#f5f5f5', padding: '20px' }}>
      <div style={{ 'max-width': '1400px', margin: '0 auto' }}>
        <h1 style={{ margin: '0 0 20px 0', 'font-size': '24px', 'font-weight': 700, color: '#333' }}>
          屏蔽门监控系统 - Clean Architecture
        </h1>

        <div style={{ display: 'grid', 'grid-template-columns': 'repeat(2, 1fr)', gap: '20px' }}>
          <DoorStatusPanel />
          <FaultSignalPanel />
          <FaultChainSimulatorPanel />
          <DataStatsPanel />
        </div>
      </div>
    </div>
  );
};

export default App;
