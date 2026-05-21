import React, { useEffect, useRef, useState } from 'react';
import { HeaderBar } from '@/components/control-tower/HeaderBar';
import { ApronCanvas } from '@/components/control-tower/ApronCanvas';
import { EquipmentPanel } from '@/components/control-tower/EquipmentPanel';
import { AlertBar } from '@/components/control-tower/AlertBar';
import { CommandConsole } from '@/components/control-tower/CommandConsole';
import { KPIPanel } from '@/components/control-tower/KPIPanel';
import { SystemStatus } from '@/components/control-tower/SystemStatus';
import { useControlTowerStore } from '@/store/controlTower';
import { simulationDataGenerator } from '@/utils/simulation/dataGenerator';
import { conflictDetectionWorker } from '@/workers/conflictDetectionWorker';
import { indexedDBManager } from '@/utils/storage/indexedDB';
import { protocolManager } from '@/utils/protocol/protocolManager';

const ControlTowerPage: React.FC = () => {
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 });
  const frameCountRef = useRef(0);
  const lastFpsUpdateRef = useRef(performance.now());
  const animationFrameRef = useRef<number>();
  const [showSidebar, setShowSidebar] = useState(true);
  
  const {
    equipmentStates,
    commands,
    alerts,
    setEquipmentStates,
    updateEquipmentState,
    addAlert,
    updatePerformance,
    isSimulationRunning,
    simulationSpeed,
    setNetworkStatus,
    updateSyncStatus,
  } = useControlTowerStore();

  useEffect(() => {
    const initialEquipment = simulationDataGenerator.getEquipment();
    setEquipmentStates(initialEquipment);
    
    indexedDBManager.init().then(() => {
      indexedDBManager.saveEquipmentStates(initialEquipment);
    });
    
    protocolManager.syncWithNTP(Date.now());
  }, [setEquipmentStates]);

  useEffect(() => {
    const updateSize = () => {
      if (canvasContainerRef.current) {
        const rect = canvasContainerRef.current.getBoundingClientRect();
        setCanvasSize({
          width: rect.width,
          height: rect.height,
        });
      }
    };
    
    updateSize();
    window.addEventListener('resize', updateSize);
    
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  useEffect(() => {
    if (!isSimulationRunning) return;
    
    let lastTime = performance.now();
    let conflictCheckTimer = 0;
    let snapshotTimer = 0;
    let networkCheckTimer = 0;
    
    const simulate = (currentTime: number) => {
      const deltaTime = (currentTime - lastTime) / 1000;
      lastTime = currentTime;
      
      frameCountRef.current++;
      if (currentTime - lastFpsUpdateRef.current >= 1000) {
        const fps = frameCountRef.current * 1000 / (currentTime - lastFpsUpdateRef.current);
        updatePerformance(fps, Math.random() * 10 + 5);
        frameCountRef.current = 0;
        lastFpsUpdateRef.current = currentTime;
      }
      
      simulationDataGenerator.simulateStep(deltaTime * simulationSpeed);
      const updatedEquipment = simulationDataGenerator.getEquipment();
      updatedEquipment.forEach((eq) => updateEquipmentState(eq));
      
      conflictCheckTimer += deltaTime * 1000;
      if (conflictCheckTimer >= 500) {
        conflictCheckTimer = 0;
        
        const equipmentList = Array.from(equipmentStates.values());
        const commandList = Array.from(commands.values());
        
        if (equipmentList.length > 1) {
          conflictDetectionWorker.detectConflicts({
            equipmentStates: equipmentList,
            commands: commandList,
            predictionHorizon: 20,
            timeStep: 0.2,
          }).then((result) => {
            result.alerts.forEach((alert) => {
              const existingAlert = Array.from(alerts.values()).find(
                (a) => a.involvedEquipment.join(',') === alert.involvedEquipment.join(',') &&
                        a.type === alert.type &&
                        !a.resolved
              );
              if (!existingAlert) {
                addAlert(alert);
              }
            });
          });
        }
      }
      
      snapshotTimer += deltaTime * 1000;
      if (snapshotTimer >= 30000) {
        snapshotTimer = 0;
        const snapshot = {
          timestamp: Date.now(),
          equipmentStates: Array.from(equipmentStates.values()),
          activeCommands: Array.from(commands.values()).filter((c) => c.status === 'executing'),
          activeAlerts: Array.from(alerts.values()).filter((a) => !a.resolved),
          networkStatus: 'online' as const,
          checksum: '',
        };
        indexedDBManager.saveSnapshot(snapshot);
      }
      
      networkCheckTimer += deltaTime * 1000;
      if (networkCheckTimer >= 5000) {
        networkCheckTimer = 0;
        const networkRandom = Math.random();
        if (networkRandom > 0.95) {
          setNetworkStatus('offline');
        } else if (networkRandom > 0.85) {
          setNetworkStatus('weak');
        } else {
          setNetworkStatus('online');
        }
        updateSyncStatus(Math.floor(Math.random() * 10), Date.now());
      }
      
      animationFrameRef.current = requestAnimationFrame(simulate);
    };
    
    animationFrameRef.current = requestAnimationFrame(simulate);
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isSimulationRunning, simulationSpeed, equipmentStates, commands, alerts, updateEquipmentState, addAlert, updatePerformance, setNetworkStatus, updateSyncStatus]);

  const equipmentList = Array.from(equipmentStates.values());
  const stats = {
    total: equipmentList.length,
    moving: equipmentList.filter((e) => e.status === 'moving').length,
    working: equipmentList.filter((e) => e.status === 'working').length,
    idle: equipmentList.filter((e) => e.status === 'idle').length,
    error: equipmentList.filter((e) => e.status === 'error').length,
    charging: equipmentList.filter((e) => e.status === 'charging').length,
  };

  return (
    <div className="h-screen flex flex-col bg-[#0A1628] overflow-hidden">
      <HeaderBar />
      
      <div className="flex-1 flex overflow-hidden">
        <div className={`flex flex-col bg-[#0F2137] border-r border-[#2A4A6F] transition-all duration-300 ${showSidebar ? 'w-72' : 'w-0 overflow-hidden'}`}>
          <EquipmentPanel />
        </div>
        
        <button
          onClick={() => setShowSidebar(!showSidebar)}
          className="w-6 bg-[#152A47] hover:bg-[#1A3152] border-r border-[#2A4A6F] flex items-center justify-center text-[#5A7A9A] hover:text-[#00D4FF] transition-colors z-10"
        >
          {showSidebar ? '‹' : '›'}
        </button>
        
        <div className="flex-1 flex flex-col overflow-hidden">
          <KPIPanel stats={stats} />
          
          <div
            ref={canvasContainerRef}
            className="flex-1 relative grid-bg"
          >
            <ApronCanvas width={canvasSize.width} height={canvasSize.height} />
          </div>
          
          <div className="h-48 bg-[#0F2137] border-t border-[#2A4A6F]">
            <CommandConsole />
          </div>
        </div>
        
        <div className="w-80 bg-[#0F2137] border-l border-[#2A4A6F] flex flex-col">
          <div className="h-1/2 border-b border-[#2A4A6F] overflow-hidden">
            <AlertBar />
          </div>
          <div className="h-1/2 overflow-hidden">
            <SystemStatus />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ControlTowerPage;
