import { useEffect, useRef } from 'react';
import { useWarehouseStore } from '@/store/useWarehouseStore';

export function useRealTimeData(intervalMs: number = 3000) {
  const { simulateRealTimeUpdate } = useWarehouseStore();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      simulateRealTimeUpdate();
    }, intervalMs);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [intervalMs, simulateRealTimeUpdate]);
}

export function useInitData() {
  const { initData, loading, error } = useWarehouseStore();

  useEffect(() => {
    initData();
  }, [initData]);

  return { loading, error };
}

export function useEfficiencyMetrics(days: number = 7) {
  const { stackers, inboundTasks } = useWarehouseStore();
  const metrics = useRef<Array<{ timestamp: Date; metricType: string; value: number }>>([]);

  useEffect(() => {
    const data: Array<{ timestamp: Date; metricType: string; value: number }> = [];
    const now = Date.now();

    for (let i = days * 24; i >= 0; i -= 2) {
      const timestamp = new Date(now - i * 60 * 60 * 1000);
      const hourFactor = Math.sin((i / 24) * Math.PI * 2) * 0.2 + 0.8;

      data.push({
        timestamp,
        metricType: 'throughput',
        value: Math.floor((40 + Math.random() * 60) * hourFactor),
      });

      data.push({
        timestamp,
        metricType: 'utilization',
        value: Math.floor(55 + Math.random() * 35),
      });

      data.push({
        timestamp,
        metricType: 'efficiency',
        value: Math.floor(
          stackers.reduce((sum, s) => sum + s.efficiency, 0) / Math.max(1, stackers.length)
        ),
      });

      data.push({
        timestamp,
        metricType: 'fragmentation',
        value: Math.floor(10 + Math.random() * 20),
      });
    }

    metrics.current = data;
  }, [days, stackers, inboundTasks]);

  return metrics.current;
}

export function useLocationHeatmap(aisle: number = 1) {
  const { locations } = useWarehouseStore();
  const filtered = locations.filter((l) => l.aisle === aisle);

  const maxRack = Math.max(...filtered.map((l) => l.rack), 1);
  const maxLevel = Math.max(...filtered.map((l) => l.level), 1);
  const maxSlot = Math.max(...filtered.map((l) => l.slot), 1);

  const grid: Array<Array<Array<{ location: typeof locations[0] | null; heatLevel: number; status: string }>>> = [];

  for (let rack = 1; rack <= maxRack; rack++) {
    grid[rack] = [];
    for (let level = 1; level <= maxLevel; level++) {
      grid[rack][level] = [];
      for (let slot = 1; slot <= maxSlot; slot++) {
        const loc = filtered.find(
          (l) => l.rack === rack && l.level === level && l.slot === slot
        );
        grid[rack][level][slot] = {
          location: loc || null,
          heatLevel: loc?.heatLevel || 0,
          status: loc?.status || 'empty',
        };
      }
    }
  }

  return {
    grid,
    maxRack,
    maxLevel,
    maxSlot,
    locations: filtered,
  };
}
