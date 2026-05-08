import { useEffect, useCallback, useState } from 'react';
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
const INTERSECTION_COUNT = 4;

function App() {
  const {
    simulationRef,
    isRunning,
    simulationSpeed,
    vehicleSpawnRate,
    stats,
    timeStep,
    initialized,
    intersectionCount,
    setSimulationSpeed,
    setVehicleSpawnRate,
    setIntersectionCount,
    initializeSimulation,
    simulationLoop,
    toggleRunning,
    resetSimulation,
    updateIntersectionConfigs,
    applyGreenWaveOffsets
  } = useSimulation();

  const {
    timeSlot,
    activePlan,
    initializeCoordination,
    changeTimeSlot,
    calculateGreenWaveOffsets,
    trafficSystem
  } = useGreenWaveCoordination();

  const {
    alignmentStatus,
    syncDevices,
    checkAlignments,
    clearAlignmentStatus
  } = useDeviceSync();

  const [selectedIntersectionCount, setSelectedIntersectionCount] = useState(INTERSECTION_COUNT);

  const initializeSystem = useCallback(() => {
    initializeSimulation(timeSlot, selectedIntersectionCount);
    initializeCoordination(timeSlot, selectedIntersectionCount);
  }, [initializeSimulation, initializeCoordination, timeSlot, selectedIntersectionCount]);

  const applyGreenWaveToSimulation = useCallback(() => {
    if (!activePlan) return;
    
    const offsets = calculateGreenWaveOffsets(activePlan, selectedIntersectionCount);
    applyGreenWaveOffsets(offsets);
  }, [activePlan, calculateGreenWaveOffsets, applyGreenWaveOffsets, selectedIntersectionCount]);

  useEffect(() => {
    if (!initialized) {
      initializeSystem();
    }
  }, [initialized, initializeSystem]);

  useEffect(() => {
    if (initialized && activePlan) {
      applyGreenWaveToSimulation();
    }
  }, [initialized, activePlan, applyGreenWaveToSimulation]);

  useEffect(() => {
    if (isRunning) {
      simulationLoop(timeSlot);
    }
  }, [isRunning, simulationLoop, timeSlot]);

  const handleToggleRunning = useCallback(() => {
    toggleRunning();
  }, [toggleRunning]);

  const handleReset = useCallback(() => {
    resetSimulation(timeSlot, selectedIntersectionCount);
    initializeCoordination(timeSlot, selectedIntersectionCount);
    clearAlignmentStatus();
  }, [resetSimulation, initializeCoordination, timeSlot, selectedIntersectionCount, clearAlignmentStatus]);

  const handleTimeSlotChange = useCallback((newTimeSlot) => {
    const { plan, offsets } = changeTimeSlot(newTimeSlot, selectedIntersectionCount);
    updateIntersectionConfigs(newTimeSlot);
    
    if (offsets && offsets.length > 0) {
      applyGreenWaveOffsets(offsets);
    }
  }, [changeTimeSlot, updateIntersectionConfigs, applyGreenWaveOffsets, selectedIntersectionCount]);

  const handleIntersectionCountChange = useCallback((count) => {
    setSelectedIntersectionCount(count);
    setIntersectionCount(count);
  }, [setIntersectionCount]);

  const handleSyncDevices = useCallback(() => {
    syncDevices();
    applyGreenWaveToSimulation();
  }, [syncDevices, applyGreenWaveToSimulation]);

  const handleAlignDevices = useCallback(() => {
    checkAlignments();
  }, [checkAlignments]);

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>SignalLink - 路网信控协同底座</h1>
        <p className="subtitle">
          {selectedIntersectionCount}个路口线性路网 · 绿波方案动态对齐 · 元胞自动机微观仿真 · IndexedDB 分时段日志存储
        </p>
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
          
          <div className="extra-controls" style={{
            marginTop: '16px',
            padding: '16px',
            backgroundColor: '#fff',
            borderRadius: '8px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}>
            <h4 style={{ margin: '0 0 12px 0', color: '#333' }}>路口数量设置</h4>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {[2, 3, 4, 5].map((count) => (
                <button
                  key={count}
                  onClick={() => handleIntersectionCountChange(count)}
                  style={{
                    padding: '8px 16px',
                    border: '2px solid #ddd',
                    borderRadius: '6px',
                    backgroundColor: selectedIntersectionCount === count ? '#667eea' : '#fff',
                    color: selectedIntersectionCount === count ? '#fff' : '#333',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                    fontSize: '14px'
                  }}
                >
                  {count}个路口
                </button>
              ))}
            </div>
            <p style={{ marginTop: '12px', fontSize: '12px', color: '#666' }}>
              更改路口数量后需要点击"重置"按钮生效
            </p>
          </div>
          
          {activePlan && (
            <div className="green-wave-info" style={{
              marginTop: '16px',
              padding: '16px',
              backgroundColor: '#fff',
              borderRadius: '8px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
            }}>
              <h4 style={{ margin: '0 0 12px 0', color: '#333' }}>绿波方案信息</h4>
              <div style={{ fontSize: '13px', color: '#666', lineHeight: '1.6' }}>
                <p><strong>方案ID:</strong> {activePlan.id}</p>
                <p><strong>周期长度:</strong> {activePlan.cycleLength} 步</p>
                <p><strong>路口数量:</strong> {activePlan.intersections?.length || 0}</p>
                <p><strong>优先方向:</strong> {activePlan.priorityDirection}</p>
                <div style={{ marginTop: '10px', padding: '10px', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
                  <strong>绿波偏移量:</strong>
                  <div style={{ marginTop: '6px', fontSize: '12px' }}>
                    {activePlan.intersections?.map((int, index) => (
                      <div key={index}>
                        路口{index + 1}: {int.offset?.toFixed(1) || 0} 步
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="center-panel">
          <div className="canvas-container">
            <h3>路网仿真 ({selectedIntersectionCount}个路口线性路网)</h3>
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
        <p>基于 React + 异步元胞自动机 + IndexedDB 构建的多路口绿波协同系统</p>
      </footer>
    </div>
  );
}

export default App;
