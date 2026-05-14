import { createSignal, onCleanup } from 'solid-js';
import type { CraneState, CraneEnvelope, CollisionRisk, WarningAlert } from '../types/crane';
import { envelopeGenerator } from '../utils/envelopeGenerator';
import { collisionDetector } from '../utils/collisionDetector';
import { blackBoxStore } from '../utils/blackBoxStore';

export function createCraneStore() {
  const [cranes, setCranes] = createSignal<CraneState[]>([]);
  const [envelopes, setEnvelopes] = createSignal<Map<string, CraneEnvelope>>(new Map());
  const [collisionRisks, setCollisionRisks] = createSignal<CollisionRisk[]>([]);
  const [alerts, setAlerts] = createSignal<WarningAlert[]>([]);
  const [isRunning, setIsRunning] = createSignal(false);
  const [sessionId, setSessionId] = createSignal<string>(`session-${Date.now()}`);
  const [lastUpdate, setLastUpdate] = createSignal<number>(Date.now());

  let simulationInterval: number | null = null;
  let blackBoxInterval: number | null = null;

  const addCrane = (crane: CraneState) => {
    setCranes(prev => [...prev, crane]);
  };

  const updateCrane = (id: string, updates: Partial<CraneState>) => {
    setCranes(prev => prev.map(c => 
      c.id === id ? { ...c, ...updates, timestamp: Date.now() } : c
    ));
  };

  const removeCrane = (id: string) => {
    setCranes(prev => prev.filter(c => c.id !== id));
    setEnvelopes(prev => {
      const newMap = new Map(prev);
      newMap.delete(id);
      return newMap;
    });
  };

  const generateEnvelopes = () => {
    const newEnvelopes = new Map<string, CraneEnvelope>();
    cranes().forEach(crane => {
      newEnvelopes.set(crane.id, envelopeGenerator.generateEnvelope(crane));
    });
    setEnvelopes(newEnvelopes);
  };

  const detectCollisions = async () => {
    const risks = await collisionDetector.detectCollisionsAsync(cranes(), envelopes());
    setCollisionRisks(risks);

    risks.forEach(risk => {
      if (risk.riskLevel === 'critical' || risk.riskLevel === 'high') {
        const alertExists = alerts().some(a => 
          a.craneId === risk.craneA && a.timestamp > Date.now() - 5000
        );
        if (!alertExists) {
          const newAlert: WarningAlert = {
            id: `alert-${Date.now()}-${Math.random()}`,
            craneId: risk.craneA,
            type: 'collision',
            level: risk.riskLevel === 'critical' ? 'emergency' : 'danger',
            message: collisionDetector.getWarningMessage(risk),
            timestamp: Date.now(),
            acknowledged: false
          };
          setAlerts(prev => [...prev, newAlert]);
        }
      }
    });
  };

  const saveBlackBoxRecord = async () => {
    try {
      const currentEnvelopes = envelopes();
      for (const crane of cranes()) {
        const envelope = currentEnvelopes.get(crane.id);
        if (envelope) {
          await blackBoxStore.addRecord(crane.id, crane, envelope, sessionId());
        }
      }
    } catch (error) {
      console.error('Failed to save black box record:', error);
    }
  };

  const simulateCraneMovements = () => {
    setCranes(prev => prev.map(crane => {
      const newAngle = crane.jibAngle + crane.rotationSpeed * 0.1 + (Math.random() - 0.5) * 2;
      const newTrolley = Math.max(5, Math.min(crane.jibLength - 5,
        crane.trolleyPosition + crane.trolleySpeed * 0.1 + (Math.random() - 0.5) * 0.5));
      const newHook = Math.max(2, Math.min(50,
        crane.hookHeight + crane.hoistSpeed * 0.1 + (Math.random() - 0.5) * 0.3));

      return {
        ...crane,
        jibAngle: newAngle,
        trolleyPosition: newTrolley,
        hookHeight: newHook,
        timestamp: Date.now()
      };
    }));
  };

  const startSimulation = () => {
    if (isRunning()) return;
    setIsRunning(true);
    setSessionId(`session-${Date.now()}`);

    simulationInterval = window.setInterval(() => {
      simulateCraneMovements();
      generateEnvelopes();
      detectCollisions();
      setLastUpdate(Date.now());
    }, 100);

    blackBoxInterval = window.setInterval(() => {
      saveBlackBoxRecord();
    }, 1000);
  };

  const stopSimulation = () => {
    setIsRunning(false);
    if (simulationInterval) {
      clearInterval(simulationInterval);
      simulationInterval = null;
    }
    if (blackBoxInterval) {
      clearInterval(blackBoxInterval);
      blackBoxInterval = null;
    }
  };

  const acknowledgeAlert = (alertId: string) => {
    setAlerts(prev => prev.map(a => 
      a.id === alertId ? { ...a, acknowledged: true } : a
    ));
  };

  const clearOldAlerts = () => {
    const cutoff = Date.now() - 30000;
    setAlerts(prev => prev.filter(a => a.timestamp > cutoff));
  };

  const initDemoCranes = () => {
    const demoCranes: CraneState[] = [
      {
        id: 'crane-001',
        name: '1#塔吊',
        position: { x: 0, y: 0, z: 60 },
        jibAngle: 45,
        jibLength: 60,
        trolleyPosition: 30,
        hookHeight: 20,
        loadWeight: 2000,
        rotationSpeed: 5,
        trolleySpeed: 0.3,
        hoistSpeed: 0.5,
        timestamp: Date.now()
      },
      {
        id: 'crane-002',
        name: '2#塔吊',
        position: { x: 80, y: 0, z: 55 },
        jibAngle: 180,
        jibLength: 55,
        trolleyPosition: 25,
        hookHeight: 15,
        loadWeight: 1500,
        rotationSpeed: -4,
        trolleySpeed: 0.2,
        hoistSpeed: -0.3,
        timestamp: Date.now()
      },
      {
        id: 'crane-003',
        name: '3#塔吊',
        position: { x: 40, y: 70, z: 50 },
        jibAngle: 270,
        jibLength: 50,
        trolleyPosition: 20,
        hookHeight: 25,
        loadWeight: 1800,
        rotationSpeed: 3,
        trolleySpeed: 0.25,
        hoistSpeed: 0.4,
        timestamp: Date.now()
      }
    ];
    setCranes(demoCranes);
    generateEnvelopes();
  };

  onCleanup(() => {
    stopSimulation();
  });

  return {
    cranes,
    envelopes,
    collisionRisks,
    alerts,
    isRunning,
    sessionId,
    lastUpdate,
    addCrane,
    updateCrane,
    removeCrane,
    generateEnvelopes,
    detectCollisions,
    startSimulation,
    stopSimulation,
    acknowledgeAlert,
    clearOldAlerts,
    initDemoCranes,
    saveBlackBoxRecord
  };
}

export type CraneStore = ReturnType<typeof createCraneStore>;
