import { useEffect, useCallback } from 'react';
import { useSimulation } from './hooks/useSimulation';
import { useGreenWaveCoordination } from './hooks/useGreenWaveCoordination';
import { useDeviceSync } from './hooks/useDeviceSync';
import { RoadNetworkCanvas } from './components/RoadNetworkCanvas';
import { ControlPanel } from './components/ControlPanel';
import { StatsPanel } from './components/StatsPanel';
import { LogViewer } from './components/LogViewer';
import './App.css';

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;
const CELL_SIZE = 5;

function App() {
  const {
    simulationRef,
    isRunning,
    simulationSpeed,
    vehicleSpawnRate,
    stats,
    timeStep,
    initialized,
    setSimulationSpeed,
    setVehicleSpawnRate,
    initializeSimulation,
    simulationLoop,
    toggleRunning,
    resetSimulation,
    updateIntersectionConfigs
  } = useSimulation();

  const {
    timeSlot,
    initializeCoordination,
    changeTimeSlot
  } = useGreenWaveCoordination();

  const {
    alignmentStatus,
    syncDevices,
    checkAlignments,
    clearAlignmentStatus
  } = useDeviceSync();

  const initializeSystem = useCallback(() => {
    initializeSimulation(timeSlot);
    initializeCoordination(timeSlot);
  }, [initializeSimulation, initializeCoordination, timeSlot]);

  useEffect(() => {
    if (!initialized) {
      initializeSystem();
    }
  }, [initialized, initializeSystem]);

  useEffect(() => {
    if (isRunning) {
      simulationLoop(timeSlot);
    }
  }, [isRunning, simulationLoop, timeSlot]);

  const handleToggleRunning = useCallback(() => {
    toggleRunning();
  }, [toggleRunning]);

  const handleReset = useCallback(() => {
    resetSimulation(timeSlot);
    initializeCoordination(timeSlot);
    clearAlignmentStatus();
  }, [resetSimulation, initializeCoordination, timeSlot, clearAlignmentStatus]);

  const handleTimeSlotChange = useCallback((newTimeSlot) => {
    changeTimeSlot(newTimeSlot);
    updateIntersectionConfigs(newTimeSlot);
  }, [changeTimeSlot, updateIntersectionConfigs]);

  const handleSyncDevices = useCallback(() => {
    syncDevices();
  }, [syncDevices]);

  const handleAlignDevices = useCallback(() => {
    checkAlignments();
  }, [checkAlignments]);

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>SignalLink - 路网信控协同底座</h1>
        <p className="subtitle">绿波方案动态对齐 · 元胞自动机微观仿真 · IndexedDB 分时段日志存储</p>
      </header>

      <main className="main-content">
        <div className="left-panel">
          <ControlPanel
            isRunning={isRunning}
            onToggleRunning={handleToggleRunning}
            onReset={handleReset}
            timeSlot={timeSlot}
            onTimeSlotChange={handleTimeSlotChange}
            simulationSpeed={simulationSpeed}
            onSpeedChange={setSimulationSpeed}
            vehicleSpawnRate={vehicleSpawnRate}
            onSpawnRateChange={setVehicleSpawnRate}
            onSyncDevices={handleSyncDevices}
            onAlignDevices={handleAlignDevices}
            alignmentStatus={alignmentStatus}
          />
        </div>

        <div className="center-panel">
          <div className="canvas-container">
            <h3>路网仿真</h3>
            <RoadNetworkCanvas
              simulation={simulationRef.current}
              width={CANVAS_WIDTH}
              height={CANVAS_HEIGHT}
              cellSize={CELL_SIZE}
            />
            <div className="canvas-legend">
              <span style={{ color: '#4CAF50' }}>●</span> 行驶车辆
              <span style={{ color: '#2196F3', marginLeft: '15px' }}>●</span> 等待车辆
              <span style={{ color: '#4CAF50', marginLeft: '15px' }}>⬤</span> 绿灯
              <span style={{ color: '#FFC107', marginLeft: '15px' }}>⬤</span> 黄灯
              <span style={{ color: '#F44336', marginLeft: '15px' }}>⬤</span> 红灯
            </div>
          </div>
          
          <div className="stats-section">
            <StatsPanel stats={stats} timeStep={timeStep} />
          </div>
        </div>

        <div className="right-panel">
          <LogViewer />
        </div>
      </main>

      <footer className="app-footer">
        <p>基于 React + 异步元胞自动机 + IndexedDB 构建的路网信控协同系统</p>
      </footer>
    </div>
  );
}

export default App;
