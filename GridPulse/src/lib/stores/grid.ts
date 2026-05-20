import { writable, derived, get } from 'svelte/store';
import type { SystemStatus, Alert, GridSystem, Generator } from '$lib/types';

export function createGridStore() {
  const systemStatus = writable<SystemStatus>({
    currentFrequency: 50.0,
    frequencyDeviation: 0.0,
    totalGeneration: 100,
    totalLoad: 98,
    spinningReserve: 15,
    stabilityMargin: 0.35,
    systemState: 'normal',
    lastUpdate: new Date()
  });

  const alerts = writable<Alert[]>([
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

  const gridSystem = writable<GridSystem>({
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
      
      systemStatus.update(status => ({
        ...status,
        currentFrequency: Math.round(newFreq * 1000) / 1000,
        frequencyDeviation: Math.round((newFreq - baseFreq) * 1000) / 1000,
        totalLoad: 95 + Math.random() * 10,
        totalGeneration: status.totalLoad + (Math.random() - 0.5) * 2,
        spinningReserve: Math.max(5, 15 + (Math.random() - 0.5) * 5),
        stabilityMargin: Math.max(0.1, 0.35 + (Math.random() - 0.5) * 0.1),
        lastUpdate: new Date()
      }));
      
      const status = get(systemStatus);
      const dev = Math.abs(status.frequencyDeviation);
      if (dev > 0.2) {
        systemStatus.update(s => ({ ...s, systemState: 'emergency' }));
      } else if (dev > 0.1) {
        systemStatus.update(s => ({ ...s, systemState: 'alert' }));
      } else {
        systemStatus.update(s => ({ ...s, systemState: 'normal' }));
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
    alerts.update(list => {
      const newList = [
        {
          ...alert,
          id: `alert-${Date.now()}`,
          timestamp: new Date(),
          acknowledged: false
        },
        ...list
      ];
      return newList.slice(0, 50);
    });
  }

  function acknowledgeAlert(id: string) {
    alerts.update(list => 
      list.map(a => a.id === id ? { ...a, acknowledged: true } : a)
    );
  }

  const unacknowledgedCount = derived(alerts, $alerts => 
    $alerts.filter(a => !a.acknowledged).length
  );
  
  const totalInertia = derived(gridSystem, $grid =>
    $grid.generators
      .filter(g => g.status === 'online')
      .reduce((sum, g) => sum + g.inertia * (g.ratedPower / $grid.totalCapacity), 0)
  );

  const onlineGeneration = derived(gridSystem, $grid =>
    $grid.generators
      .filter(g => g.status === 'online')
      .reduce((sum, g) => sum + g.ratedPower, 0)
  );

  startSimulation();

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
