import { Component } from 'solid-js';
import { createAppStore } from './store';
import { HydrantMap } from './components/HydrantMap';
import { StatsPanel } from './components/StatsPanel';
import { ControlPanel } from './components/ControlPanel';
import { HydrantDetail } from './components/HydrantDetail';
import { ConflictList } from './components/ConflictList';
import './styles/index.css';

const App: Component = () => {
  const store = createAppStore();
  const { state, error } = store;

  return (
    <div class="app-container">
      <header class="header">
        <h1>消防水源压力分布映射系统</h1>
        <span class="subtitle">SolidJS · IndexedDB · 流体力学模拟 · 语义同步</span>
      </header>

      <aside class="left-panel">
        <div class="panel-section">
          <StatsPanel store={store} />
        </div>
        <div class="panel-section">
          <ControlPanel store={store} />
        </div>
      </aside>

      <main class="map-area">
        <HydrantMap store={store} mapContainerId="hydrant-map" />

        {state.isLoading && (
          <div class="loading-overlay">
            <div class="spinner" />
          </div>
        )}
      </main>

      <aside class="right-panel">
        <div class="panel-section">
          <HydrantDetail store={store} />
        </div>
        <div class="panel-section">
          <ConflictList store={store} />
        </div>
      </aside>

      {error() && <div class="error-message">{error()}</div>}
    </div>
  );
};

export default App;
