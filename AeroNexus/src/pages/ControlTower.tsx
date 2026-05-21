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
  const [showLeftPanel, setShowLeftPanel] = useState(true);
  const [showRightPanel, setShowRightPanel] = useState(true);
  
  const {
    equipmentStates,
    commands,
    alerts,
    setEquipmentStates,
    updateEquipmentState,
    updateCommand,
    addAlert,
    updatePerformance,
    isSimulationRunning,
    simulationSpeed,
    setNetworkStatus,
    updateSyncStatus,
  } = useControlTowerStore();

  useEffect(() => {
    const storeCommands = Array.from(commands.values());
    const generatorCommands = simulationDataGenerator.getCommands();
    
    storeCommands.forEach((cmd) => {
      const existing = generatorCommands.find((c) => c.id === cmd.id);
      if (!existing) {
        simulationDataGenerator.addCommand(cmd);
      } else if (existing.status !== cmd.status || existing.progress !== cmd.progress) {
        simulationDataGenerator.updateCommand(cmd.id, {
          status: cmd.status,
          progress: cmd.progress,
          executedAt: cmd.executedAt,
        });
      }
    });
  }, [commands]);

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
          width: Math.max(rect.width, 400),
          height: Math.max(rect.height, 300),
        });
      }
    };
    
    updateSize();
    window.addEventListener('resize', updateSize);
    
    return () => window.removeEventListener('resize', updateSize);
  }, [showLeftPanel, showRightPanel]);

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
      
      const updatedCommands = simulationDataGenerator.getCommands();
      updatedCommands.forEach((cmd) => {
        const existing = commands.get(cmd.id);
        if (existing && (existing.progress !== cmd.progress || existing.status !== cmd.status)) {
          updateCommand(cmd);
        }
      });
      
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
  }, [isSimulationRunning, simulationSpeed, equipmentStates, commands, alerts, updateEquipmentState, updateCommand, addAlert, updatePerformance, setNetworkStatus, updateSyncStatus]);

  const equipmentList = Array.from(equipmentStates.values());
  const stats = {
    total: equipmentList.length,
    moving: equipmentList.filter((e) => e.status === 'moving').length,
    working: equipmentList.filter((e) => e.status === 'working').length,
    idle: equipmentList.filter((e) => e.status === 'idle').length,
    error: equipmentList.filter((e) => e.status === 'error').length,
    charging: equipmentList.filter((e) => e.status === 'charging').length,
  };

  const LEFT_PANEL_WIDTH = 256;
  const RIGHT_PANEL_WIDTH = 288;
  const TOGGLE_WIDTH = 20;

  return (
    <div className="h-screen w-screen flex flex-col bg-[#0A1628] overflow-hidden">
      <HeaderBar />
      
      <div className="flex-1 flex overflow-hidden">
        {showLeftPanel && (
          <div 
            className="flex-shrink-0 bg-[#0F2137] border-r border-[#2A4A6F] flex flex-col overflow-hidden"
            style={{ width: LEFT_PANEL_WIDTH }}
          >
            <EquipmentPanel />
          </div>
        )}
        
        <button
          onClick={() => setShowLeftPanel(!showLeftPanel)}
          className="flex-shrink-0 bg-[#152A47] hover:bg-[#1A3152] border-r border-[#2A4A6F] flex items-center justify-center text-[#5A7A9A] hover:text-[#00D4FF] transition-colors group"
          style={{ width: TOGGLE_WIDTH }}
          title={showLeftPanel ? '收起设备面板' : '展开设备面板'}
        >
          <span className="text-lg font-bold transition-transform group-hover:scale-125">
            {showLeftPanel ? '‹' : '›'}
          </span>
        </button>
        
        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
          <div className="flex-shrink-0 bg-[#0F2137] border-b border-[#2A4A6F]" style={{ height: 56 }}>
            <KPIPanel stats={stats} />
          </div>
          
          <div
            ref={canvasContainerRef}
            className="flex-1 relative grid-bg overflow-hidden"
          >
            <ApronCanvas width={canvasSize.width} height={canvasSize.height} />
          </div>
          
          <div className="flex-shrink-0 bg-[#0F2137] border-t border-[#2A4A6F] overflow-hidden" style={{ height: 160 }}>
            <CommandConsole />
          </div>
        </div>
        
        <button
          onClick={() => setShowRightPanel(!showRightPanel)}
          className="flex-shrink-0 bg-[#152A47] hover:bg-[#1A3152] border-l border-[#2A4A6F] flex items-center justify-center text-[#5A7A9A] hover:text-[#00D4FF] transition-colors group"
          style={{ width: TOGGLE_WIDTH }}
          title={showRightPanel ? '收起状态面板' : '展开状态面板'}
        >
          <span className="text-lg font-bold transition-transform group-hover:scale-125">
            {showRightPanel ? '›' : '‹'}
          </span>
        </button>
        
        {showRightPanel && (
          <div 
            className="flex-shrink-0 bg-[#0F2137] border-l border-[#2A4A6F] flex flex-col overflow-hidden"
            style={{ width: RIGHT_PANEL_WIDTH }}
          >
            <div className="flex-1 border-b border-[#2A4A6F] overflow-hidden" style={{ minHeight: 0 }}>
              <AlertBar />
            </div>
            <div className="flex-1 overflow-hidden" style={{ minHeight: 0 }}>
              <SystemStatus />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ControlTowerPage;
