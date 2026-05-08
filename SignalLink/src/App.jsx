import { useState, useEffect, useCallback, useRef } from 'react';
import { Direction, TimeSlot } from './types';
import { CellularAutomata } from './simulation/cellAutomata';
import { trafficSystem } from './coordination/greenWave';
import { database } from './services/database';
import { RoadNetworkCanvas } from './components/RoadNetworkCanvas';
import { ControlPanel } from './components/ControlPanel';
import { StatsPanel } from './components/StatsPanel';
import { LogViewer } from './components/LogViewer';
import './App.css';

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;
const CELL_SIZE = 5;

function App() {
  const simulationRef = useRef(null);
  const animationRef = useRef(null);
  const lastUpdateRef = useRef(Date.now());

  const [isRunning, setIsRunning] = useState(false);
  const [timeSlot, setTimeSlot] = useState(TimeSlot.MIDDAY);
  const [simulationSpeed, setSimulationSpeed] = useState(2);
  const [vehicleSpawnRate, setVehicleSpawnRate] = useState(15);
  const [stats, setStats] = useState({});
  const [timeStep, setTimeStep] = useState(0);
  const [alignmentStatus, setAlignmentStatus] = useState(null);
  const [initialized, setInitialized] = useState(false);

  const initializeSimulation = useCallback(() => {
    const sim = new CellularAutomata(CANVAS_WIDTH, CANVAS_HEIGHT, CELL_SIZE);
    
    const centerX = Math.floor(CANVAS_WIDTH / CELL_SIZE / 2);
    const centerY = Math.floor(CANVAS_HEIGHT / CELL_SIZE / 2);
    
    sim.addIntersection('int_1', centerX, centerY, {
      greenTimeNS: 30,
      greenTimeEW: 25,
      yellowTime: 3
    });
    
    simulationRef.current = sim;
    
    trafficSystem.reset();
    trafficSystem.addRoadsideDevice('device_1', 'int_1', { x: centerX, y: centerY });
    
    const plan = trafficSystem.createGreenWavePlan(
      'green_wave_default',
      [{
        intersectionId: 'int_1',
        greenTimeNS: 30,
        greenTimeEW: 25
      }],
      timeSlot
    );
    
    trafficSystem.activatePlan(plan.id);
    trafficSystem.syncDevices();
    
    setInitialized(true);
  }, [timeSlot]);

  const spawnVehicles = useCallback(() => {
    if (!simulationRef.current) return;
    
    const sim = simulationRef.current;
    const gridW = sim.gridWidth;
    const gridH = sim.gridHeight;
    
    if (Math.random() < vehicleSpawnRate / 100) {
      const directions = [Direction.NORTH, Direction.SOUTH, Direction.EAST, Direction.WEST];
      const dir = directions[Math.floor(Math.random() * directions.length)];
      
      let x, y;
      switch (dir) {
        case Direction.NORTH:
          x = Math.floor(gridW / 2) + (Math.random() > 0.5 ? 1 : -1);
          y = gridH - 2;
          break;
        case Direction.SOUTH:
          x = Math.floor(gridW / 2) + (Math.random() > 0.5 ? 1 : -1);
          y = 1;
          break;
        case Direction.EAST:
          x = 1;
          y = Math.floor(gridH / 2) + (Math.random() > 0.5 ? 1 : -1);
          break;
        case Direction.WEST:
          x = gridW - 2;
          y = Math.floor(gridH / 2) + (Math.random() > 0.5 ? 1 : -1);
          break;
      }
      
      sim.addVehicle(x, y, dir);
    }
  }, [vehicleSpawnRate]);

  const simulationLoop = useCallback(() => {
    if (!isRunning || !simulationRef.current) return;

    const now = Date.now();
    const delta = now - lastUpdateRef.current;
    const updateInterval = 1000 / simulationSpeed;

    if (delta >= updateInterval) {
      spawnVehicles();
      
      const newStats = simulationRef.current.step();
      setStats({
        ...newStats,
        vehiclesInNetwork: simulationRef.current.vehicles.length
      });
      setTimeStep(simulationRef.current.timeStep);
      
      lastUpdateRef.current = now;
      
      if (simulationRef.current.timeStep % 100 === 0) {
        database.saveSimulationResult({
          timeStep: simulationRef.current.timeStep,
          stats: newStats,
          timeSlot
        });
      }
    }

    animationRef.current = requestAnimationFrame(simulationLoop);
  }, [isRunning, simulationSpeed, spawnVehicles, timeSlot]);

  useEffect(() => {
    if (!initialized) {
      initializeSimulation();
    }
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      trafficSystem.stopAutoSync();
    };
  }, [initialized, initializeSimulation]);

  useEffect(() => {
    if (isRunning) {
      lastUpdateRef.current = Date.now();
      animationRef.current = requestAnimationFrame(simulationLoop);
    } else if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isRunning, simulationLoop]);

  const handleToggleRunning = () => {
    setIsRunning(!isRunning);
  };

  const handleReset = () => {
    setIsRunning(false);
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    initializeSimulation();
    setTimeStep(0);
    setStats({});
    setAlignmentStatus(null);
  };

  const handleTimeSlotChange = (newTimeSlot) => {
    setTimeSlot(newTimeSlot);
    
    if (simulationRef.current) {
      for (const intersection of simulationRef.current.intersections.values()) {
        const configs = {
          [TimeSlot.MORNING_PEAK]: { greenTimeNS: 35, greenTimeEW: 20 },
          [TimeSlot.MIDDAY]: { greenTimeNS: 30, greenTimeEW: 25 },
          [TimeSlot.EVENING_PEAK]: { greenTimeNS: 20, greenTimeEW: 35 },
          [TimeSlot.NIGHT]: { greenTimeNS: 25, greenTimeEW: 25 }
        };
        const config = configs[newTimeSlot];
        intersection.config.greenTimeNS = config.greenTimeNS;
        intersection.config.greenTimeEW = config.greenTimeEW;
        intersection.totalCycle = config.greenTimeNS + config.greenTimeEW + 6;
      }
    }
    
    const plan = trafficSystem.createGreenWavePlan(
      `green_wave_${newTimeSlot}`,
      [{
        intersectionId: 'int_1',
        greenTimeNS: newTimeSlot === TimeSlot.EVENING_PEAK ? 20 : newTimeSlot === TimeSlot.MORNING_PEAK ? 35 : 30,
        greenTimeEW: newTimeSlot === TimeSlot.MORNING_PEAK ? 20 : newTimeSlot === TimeSlot.EVENING_PEAK ? 35 : 25
      }],
      newTimeSlot
    );
    trafficSystem.activatePlan(plan.id);
    trafficSystem.syncDevices();
  };

  const handleSyncDevices = () => {
    const results = trafficSystem.syncDevices();
    console.log('同步设备结果:', results);
    
    const alignments = trafficSystem.getAllAlignments();
    let allAligned = true;
    let totalDevices = 0;
    
    for (const deviceId in alignments) {
      totalDevices++;
      if (!alignments[deviceId].isAligned) {
        allAligned = false;
      }
      trafficSystem.saveAlignmentLog(deviceId, alignments[deviceId]);
    }
    
    setAlignmentStatus({
      allAligned,
      totalDevices
    });
  };

  const handleAlignDevices = () => {
    const alignments = trafficSystem.getAllAlignments();
    let allAligned = true;
    let totalDevices = 0;
    
    for (const deviceId in alignments) {
      totalDevices++;
      if (!alignments[deviceId].isAligned) {
        allAligned = false;
      }
      trafficSystem.saveAlignmentLog(deviceId, alignments[deviceId]);
    }
    
    setAlignmentStatus({
      allAligned,
      totalDevices
    });
  };

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
