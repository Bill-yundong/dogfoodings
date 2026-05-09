import { create } from 'zustand';
import { fireEvolutionModel, initTunnelGrid } from '../models/fireEvolution';
import { ventilationSystem, initVentilationSystem } from '../models/ventilationSystem';
import {
  initDB,
  generateLightingNodes,
  getLightingStats,
  updateLightingNodesInBatch,
  createSnapshot,
  getRecentLogs,
  addEventLog,
  getAllLightingNodes
} from '../services/indexedDB';

const TUNNEL_ZONES = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2', 'D1', 'D2', 'E1', 'E2'];

const initialZoneData = () => {
  const data = {};
  TUNNEL_ZONES.forEach(zone => {
    data[zone] = {
      smokeDensity: 0,
      temperature: 25,
      ventilationFlow: 0,
      lightingLevel: 100,
      status: 'safe'
    };
  });
  return data;
};

const useTunnelStore = create((set, get) => ({
  isInitialized: false,
  isRunning: false,
  simulationSpeed: 1,
  simulationTime: 0,
  
  environment: {
    tunnelGrid: null,
    fireZones: [],
    avgSmokeDensity: 0,
    zoneSmokeDensity: {},
    suppressionLevel: 0,
    temperature: 25
  },
  
  ventilation: null,
  ventilationFlow: {
    flowRate: 30,
    direction: { x: 1, y: 0 },
    pressure: 0
  },
  
  lighting: {
    totalNodes: 0,
    stats: {},
    nodes: []
  },
  
  zoneData: initialZoneData(),
  
  logs: [],
  
  validationResults: {
    fire: { isValid: true, issues: [], warnings: [] },
    ventilation: { isValid: true, issues: [], warnings: [] }
  },
  
  history: {
    smokeDensity: [],
    flowRate: [],
    timestamps: []
  },
  
  activeTab: 'monitor',
  
  init: async () => {
    await initDB();
    
    const existingNodes = await getAllLightingNodes();
    if (existingNodes.length === 0) {
      await generateLightingNodes(10000);
      await addEventLog('system', '初始化 10000 个照明节点');
    }
    
    const lightingStats = await getLightingStats();
    const logs = await getRecentLogs(20);
    
    const tunnelGrid = initTunnelGrid(100, 30, 2);
    const ventSystem = initVentilationSystem();
    
    set({
      isInitialized: true,
      environment: {
        tunnelGrid,
        fireZones: [],
        avgSmokeDensity: 0,
        zoneSmokeDensity: {},
        suppressionLevel: 0,
        temperature: 25
      },
      ventilation: ventSystem,
      lighting: {
        totalNodes: lightingStats.total,
        stats: lightingStats,
        nodes: []
      },
      logs
    });
    
    await addEventLog('system', '隧道安全环境模拟系统已初始化');
  },
  
  startSimulation: () => {
    set({ isRunning: true });
    addEventLog('control', '模拟已启动');
  },
  
  pauseSimulation: () => {
    set({ isRunning: false });
    addEventLog('control', '模拟已暂停');
  },
  
  resetSimulation: async () => {
    const tunnelGrid = initTunnelGrid(100, 30, 2);
    const ventSystem = initVentilationSystem();
    
    set({
      isRunning: false,
      simulationTime: 0,
      environment: {
        tunnelGrid,
        fireZones: [],
        avgSmokeDensity: 0,
        zoneSmokeDensity: {},
        suppressionLevel: 0,
        temperature: 25
      },
      ventilation: ventSystem,
      zoneData: initialZoneData(),
      history: {
        smokeDensity: [],
        flowRate: [],
        timestamps: []
      }
    });
    
    await addEventLog('control', '模拟已重置');
  },
  
  setSimulationSpeed: (speed) => {
    set({ simulationSpeed: speed });
  },
  
  setActiveTab: (tab) => {
    set({ activeTab: tab });
  },
  
  triggerFire: async (zone) => {
    const zoneIndex = TUNNEL_ZONES.indexOf(zone);
    const fireX = zoneIndex * 10 + 5;
    const fireY = 15;
    
    const newFire = fireEvolutionModel.createFireZone(`FIRE-${zone}`, fireX, fireY);
    
    set(state => ({
      environment: {
        ...state.environment,
        fireZones: [...state.environment.fireZones, newFire]
      }
    }));
    
    await addEventLog('fire', `区域 ${zone} 检测到火灾`, { zone, fireX, fireY });
    await updateLightingNodesInBatch(zone, { status: 'alert', brightness: 50 });
  },
  
  extinguishFire: async (zone) => {
    set(state => ({
      environment: {
        ...state.environment,
        fireZones: state.environment.fireZones.map(f => 
          f.id === `FIRE-${zone}` ? { ...f, stage: 'decay' } : f
        )
      }
    }));
    
    await addEventLog('fire', `区域 ${zone} 启动灭火程序`, { zone });
  },
  
  setSuppressionLevel: (level) => {
    set(state => ({
      environment: {
        ...state.environment,
        suppressionLevel: level
      }
    }));
  },
  
  setVentilationMode: async (mode, manualSettings = null) => {
    set(state => ({
      ventilation: ventilationSystem.setMode(state.ventilation, mode, manualSettings)
    }));
    await addEventLog('ventilation', `通风系统切换到 ${mode} 模式`);
  },
  
  setManualVentilationPower: (zone, power) => {
    set(state => ({
      ventilation: ventilationSystem.setManualPower(state.ventilation, zone, power)
    }));
  },
  
  simulateStep: async (timeDelta = 0.1) => {
    const state = get();
    if (!state.isRunning || !state.isInitialized) return;
    
    const { environment, ventilation, simulationSpeed } = state;
    const actualDelta = timeDelta * simulationSpeed;
    
    const fireResult = await fireEvolutionModel.simulateStep(
      environment.fireZones,
      environment.tunnelGrid,
      state.ventilationFlow,
      actualDelta,
      environment.suppressionLevel
    );
    
    const ventFlow = ventilationSystem.getVentilationFlow(ventilation);
    const ventResult = await ventilationSystem.simulateStep(
      ventilation,
      {
        avgSmokeDensity: fireResult.avgSmokeDensity,
        zoneSmokeDensity: fireResult.zoneSmokeDensity,
        fireZones: fireResult.fireZones,
        temperature: environment.temperature
      },
      actualDelta
    );
    
    const newVentilationFlow = ventilationSystem.getVentilationFlow(ventResult);
    
    const fireValidation = fireEvolutionModel.validateLogic(
      fireResult.fireZones,
      newVentilationFlow,
      Date.now()
    );
    
    const ventValidation = ventilationSystem.validateLogic(
      ventResult,
      { avgSmokeDensity: fireResult.avgSmokeDensity }
    );
    
    const zoneData = { ...get().zoneData };
    TUNNEL_ZONES.forEach(zone => {
      const density = fireResult.zoneSmokeDensity[zone] || 0;
      const flow = ventilationSystem.getZoneFlowRate(ventResult, zone);
      
      zoneData[zone] = {
        smokeDensity: density,
        temperature: 25 + density * 200,
        ventilationFlow: flow,
        lightingLevel: Math.max(10, 100 - density * 80),
        status: fireEvolutionModel.getSmokeStatus(density)
      };
    });
    
    const now = Date.now();
    const history = { ...get().history };
    history.smokeDensity.push(fireResult.avgSmokeDensity);
    history.flowRate.push(ventResult.systemFlowRate);
    history.timestamps.push(now);
    
    const maxHistory = 200;
    if (history.smokeDensity.length > maxHistory) {
      history.smokeDensity.shift();
      history.flowRate.shift();
      history.timestamps.shift();
    }
    
    const logs = await getRecentLogs(30);
    
    set({
      simulationTime: state.simulationTime + actualDelta,
      environment: {
        ...environment,
        fireZones: fireResult.fireZones,
        tunnelGrid: fireResult.grid,
        avgSmokeDensity: fireResult.avgSmokeDensity,
        zoneSmokeDensity: fireResult.zoneSmokeDensity
      },
      ventilation: ventResult,
      ventilationFlow: newVentilationFlow,
      zoneData,
      history,
      logs,
      validationResults: {
        fire: fireValidation,
        ventilation: ventValidation
      }
    });
    
    if (fireValidation.warnings.length > 0) {
      for (const warning of fireValidation.warnings) {
        await addEventLog('warning', warning.message, warning);
      }
    }
    
    if (fireValidation.issues.length > 0) {
      for (const issue of fireValidation.issues) {
        await addEventLog('error', issue.message, issue);
      }
    }
  },
  
  createSnapshot: async (type = 'full') => {
    const state = get();
    const nodes = await getAllLightingNodes();
    
    const snapshotData = {
      environment: state.environment,
      ventilation: state.ventilation,
      nodes: nodes.slice(0, 500),
      zoneData: state.zoneData,
      simulationTime: state.simulationTime
    };
    
    const snapshot = await createSnapshot(type, snapshotData);
    await addEventLog('system', `创建快照: ${snapshot.snapshotId}`, { nodeCount: nodes.length });
    
    return snapshot;
  },
  
  refreshLightingStats: async () => {
    const stats = await getLightingStats();
    set(state => ({
      lighting: {
        ...state.lighting,
        stats
      }
    }));
  },
  
  addLog: async (type, message, metadata = {}) => {
    await addEventLog(type, message, metadata);
    const logs = await getRecentLogs(30);
    set({ logs });
  }
}));

export default useTunnelStore;
