import React, { useState, useEffect, useRef, useCallback } from 'react';
import { VoronoiCanvas } from './components/VoronoiCanvas';
import { ControlPanel } from './components/ControlPanel';
import { DroneList } from './components/DroneList';
import { DroneSwarmService } from './services/DroneSwarmService';
import { dbStore } from './store/indexedDB';
import { syncService } from './services/SemanticSyncService';
import { Point } from './types';

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;

export const App: React.FC = () => {
  const [droneCount, setDroneCount] = useState(5);
  const [drones, setDrones] = useState([]);
  const [cells, setCells] = useState([]);
  const [waypoints, setWaypoints] = useState<Map<string, Point[]>>(new Map());
  const [isRunning, setIsRunning] = useState(false);
  const [isPatrolling, setIsPatrolling] = useState(false);
  const [totalCoverage, setTotalCoverage] = useState(0);
  const [selectedDrone, setSelectedDrone] = useState<string | null>(null);

  const swarmServiceRef = useRef<DroneSwarmService | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    const init = async () => {
      await dbStore.init();
      swarmServiceRef.current = new DroneSwarmService(CANVAS_WIDTH, CANVAS_HEIGHT);
    };
    init();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (swarmServiceRef.current) {
        swarmServiceRef.current.destroy();
      }
      syncService.destroy();
    };
  }, []);

  const updateState = useCallback(() => {
    if (!swarmServiceRef.current) return;

    setDrones([...swarmServiceRef.current.getAllDrones()]);
    setCells([...swarmServiceRef.current.getCells()]);
    
    const newWaypoints = new Map<string, Point[]>();
    swarmServiceRef.current.getAllDrones().forEach(drone => {
      const wp = swarmServiceRef.current?.getWaypoints(drone.id) || [];
      newWaypoints.set(drone.id, [...wp]);
    });
    setWaypoints(newWaypoints);
    
    setTotalCoverage(swarmServiceRef.current.getTotalCoverage());
  }, []);

  const handleStartSimulation = async () => {
    if (!swarmServiceRef.current) return;
    
    swarmServiceRef.current.initializeDrones(droneCount, CANVAS_WIDTH, CANVAS_HEIGHT);
    await swarmServiceRef.current.updateVoronoi();
    swarmServiceRef.current.startSimulation();
    syncService.startAutoSync();
    setIsRunning(true);

    const animate = () => {
      updateState();
      animationFrameRef.current = requestAnimationFrame(animate);
    };
    animate();
  };

  const handleStopSimulation = () => {
    if (!swarmServiceRef.current) return;
    
    swarmServiceRef.current.stopSimulation();
    syncService.stopAutoSync();
    setIsRunning(false);
    setIsPatrolling(false);
    
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
  };

  const handleStartPatrolling = () => {
    if (!swarmServiceRef.current) return;
    swarmServiceRef.current.startPatrolling();
    setIsPatrolling(true);
  };

  const handleStopPatrolling = () => {
    if (!swarmServiceRef.current) return;
    swarmServiceRef.current.stopPatrolling();
    setIsPatrolling(false);
  };

  const handleRecalculateVoronoi = async () => {
    if (!swarmServiceRef.current) return;
    await swarmServiceRef.current.updateVoronoi();
    updateState();
  };

  const handleSyncNow = async () => {
    await syncService.createSyncSnapshot();
    updateState();
  };

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#0F172A',
      padding: '20px',
    }}>
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
      }}>
        <h1 style={{
          color: '#38BDF8',
          margin: '0 0 20px 0',
          fontSize: '24px',
          textAlign: 'center',
        }}>
          🚁 DronePulse - 无人机蜂群区域巡航指挥系统
        </h1>

        <div style={{
          display: 'flex',
          gap: '20px',
          alignItems: 'flex-start',
          justifyContent: 'center',
          flexWrap: 'wrap',
        }}>
          <VoronoiCanvas
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            drones={drones}
            cells={cells}
            waypoints={waypoints}
          />

          <div>
            <ControlPanel
              droneCount={droneCount}
              isRunning={isRunning}
              isPatrolling={isPatrolling}
              totalCoverage={totalCoverage}
              drones={drones}
              onDroneCountChange={setDroneCount}
              onStartSimulation={handleStartSimulation}
              onStopSimulation={handleStopSimulation}
              onStartPatrolling={handleStartPatrolling}
              onStopPatrolling={handleStopPatrolling}
              onRecalculateVoronoi={handleRecalculateVoronoi}
              onSyncNow={handleSyncNow}
            />
            
            <DroneList
              drones={drones}
              selectedDrone={selectedDrone}
              onSelectDrone={setSelectedDrone}
            />
          </div>
        </div>

        <div style={{
          marginTop: '20px',
          padding: '16px',
          backgroundColor: '#1E293B',
          borderRadius: '8px',
          color: '#94A3B8',
          fontSize: '13px',
        }}>
          <h3 style={{ margin: '0 0 10px 0', color: '#E2E8F0' }}>功能说明</h3>
          <ul style={{ margin: '0', paddingLeft: '20px' }}>
            <li><strong style={{ color: '#38BDF8' }}>Voronoi 剖分:</strong> 动态计算每个无人机的责任区域，优化覆盖效率</li>
            <li><strong style={{ color: '#10B981' }}>航迹规划:</strong> 在每个 Voronoi 单元内生成蛇形巡逻路径，确保区域全覆盖</li>
            <li><strong style={{ color: '#F59E0B' }}>状态同步:</strong> 使用 IndexedDB 持久化存储所有节点状态，支持数据快照和恢复</li>
            <li><strong style={{ color: '#8B5CF6' }}>语义通信:</strong> 指挥中心与各保障模块通过消息总线实现实时状态同步</li>
            <li><strong style={{ color: '#06B6D4' }}>自动充电:</strong> 电量低于 20% 时自动进入充电状态，充至 95% 恢复巡逻</li>
          </ul>
        </div>
      </div>
    </div>
  );
};
