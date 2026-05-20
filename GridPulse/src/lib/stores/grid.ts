import { $state, $derived, $effect } from 'svelte';
import type { SystemStatus, Alert, GridSystem, Generator } from '$lib/types';

export function createGridStore() {
  const systemStatus = $state<SystemStatus>({
    currentFrequency: 50.0,
    frequencyDeviation: 0.0,
    totalGeneration: 100,
    totalLoad: 98,
    spinningReserve: 15,
    stabilityMargin: 0.35,
    systemState: 'normal',
    lastUpdate: new Date()
  });

  const alerts = $state<Alert[]>([
    {
      id: 'alert-1',
      type: 'frequency',
      severity: 'info',
      message: '系统频率稳定运行中',
      timestamp: new Date(Date.now() - 300000),
      acknowledged: true
    },
    {
      id: 'alert-2',
      type: 'stability',
      severity: 'warning',
      message: '区域负荷增长较快，建议增加旋转备用',
      timestamp: new Date(Date.now() - 60000),
      acknowledged: false
    }
  ]);

  const gridSystem = $state<GridSystem>({
    id: 'grid-001',
    name: '示范微电网系统',
    baseFrequency: 50,
    totalCapacity: 200,
    generators: [
      { id: 'gen-1', systemId: 'grid-001', type: 'synchronous', ratedPower: 50, inertia: 4.0, damping: 1.5, droop: 0.05, status: 'online' },
      { id: 'gen-2', systemId: 'grid-001', type: 'wind', ratedPower: 40, inertia: 2.0, damping: 1.0, droop: 0.03, status: 'online' },
      { id: 'gen-3', systemId: 'grid-001', type: 'solar', ratedPower: 60, inertia: 0, damping: 0.5, droop: 0, status: 'online' },
      { id: 'gen-4', systemId: 'grid-001', type: 'synchronous', ratedPower: 50, inertia: 4.5, damping: 1.8, droop: 0.05, status: 'online' }
    ],
    loads: [],
    buses: []
  });

  let updateInterval: ReturnType<typeof setInterval> | null = null;

  function startSimulation() {
    if (updateInterval) return;
    
    updateInterval = setInterval(() => {
      const baseFreq = 50;
      const noise = (Math.random() - 0.5) * 0.02;
      const freqDrift = Math.sin(Date.now() / 10000) * 0.03;
      const newFreq = baseFreq + noise + freqDrift;
      
      systemStatus.currentFrequency = Math.round(newFreq * 1000) / 1000;
      systemStatus.frequencyDeviation = Math.round((newFreq - baseFreq) * 1000) / 1000;
      systemStatus.totalLoad = 95 + Math.random() * 10;
      systemStatus.totalGeneration = systemStatus.totalLoad + (Math.random() - 0.5) * 2;
      systemStatus.spinningReserve = Math.max(5, 15 + (Math.random() - 0.5) * 5);
      systemStatus.stabilityMargin = Math.max(0.1, 0.35 + (Math.random() - 0.5) * 0.1);
      systemStatus.lastUpdate = new Date();
      
      const dev = Math.abs(systemStatus.frequencyDeviation);
      if (dev > 0.2) {
        systemStatus.systemState = 'emergency';
      } else if (dev > 0.1) {
        systemStatus.systemState = 'alert';
      } else {
        systemStatus.systemState = 'normal';
      }
    }, 100);
  }

  function stopSimulation() {
    if (updateInterval) {
      clearInterval(updateInterval);
      updateInterval = null;
    }
  }

  function addAlert(alert: Omit<Alert, 'id' | 'timestamp' | 'acknowledged'>) {
    alerts.unshift({
      ...alert,
      id: `alert-${Date.now()}`,
      timestamp: new Date(),
      acknowledged: false
    });
    
    if (alerts.length > 50) {
      alerts.pop();
    }
  }

  function acknowledgeAlert(id: string) {
    const alert = alerts.find(a => a.id === id);
    if (alert) {
      alert.acknowledged = true;
    }
  }

  const unacknowledgedCount = $derived(alerts.filter(a => !a.acknowledged).length);
  
  const totalInertia = $derived(
    gridSystem.generators
      .filter(g => g.status === 'online')
      .reduce((sum, g) => sum + g.inertia * (g.ratedPower / gridSystem.totalCapacity), 0)
  );

  const onlineGeneration = $derived(
    gridSystem.generators
      .filter(g => g.status === 'online')
      .reduce((sum, g) => sum + g.ratedPower, 0)
  );

  $effect(() => {
    startSimulation();
    return () => stopSimulation();
  });

  return {
    systemStatus,
    alerts,
    gridSystem,
    unacknowledgedCount,
    totalInertia,
    onlineGeneration,
    startSimulation,
    stopSimulation,
    addAlert,
    acknowledgeAlert
  };
}

export const gridStore = createGridStore();
