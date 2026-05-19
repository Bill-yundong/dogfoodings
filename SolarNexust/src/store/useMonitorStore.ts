import { create } from 'zustand';
import type { PowerGeneration, Alert, SchedulingSuggestion, Region } from '@/types/solar';
import type { RegionStatistics } from '@/utils/mppt';

interface MonitorStore {
  currentPower: number;
  totalEnergyToday: number;
  totalEnergyMonth: number;
  averageEfficiency: number;
  peakPowerToday: number;
  powerHistory: Array<{ time: string; value: number }>;
  efficiencyHistory: Array<{ time: string; value: number }>;
  lossBreakdown: {
    shadowLoss: number;
    temperatureLoss: number;
    mpptLoss: number;
    otherLoss: number;
  };
  regionStats: Map<string, RegionStatistics>;
  alerts: Alert[];
  unreadAlerts: number;
  suggestions: SchedulingSuggestion[];
  
  setCurrentPower: (power: number) => void;
  setTotalEnergyToday: (energy: number) => void;
  setTotalEnergyMonth: (energy: number) => void;
  setAverageEfficiency: (eff: number) => void;
  setPeakPowerToday: (power: number) => void;
  addPowerHistory: (time: string, value: number) => void;
  addEfficiencyHistory: (time: string, value: number) => void;
  setLossBreakdown: (breakdown: Partial<MonitorStore['lossBreakdown']>) => void;
  setRegionStats: (regionId: string, stats: RegionStatistics) => void;
  addAlert: (alert: Alert) => void;
  acknowledgeAlert: (id: string) => void;
  clearAlerts: () => void;
  setSuggestions: (suggestions: SchedulingSuggestion[]) => void;
  updateFromGenerations: (generations: PowerGeneration[]) => void;
}

export const useMonitorStore = create<MonitorStore>((set) => ({
  currentPower: 0,
  totalEnergyToday: 0,
  totalEnergyMonth: 0,
  averageEfficiency: 0,
  peakPowerToday: 0,
  powerHistory: [],
  efficiencyHistory: [],
  lossBreakdown: {
    shadowLoss: 0,
    temperatureLoss: 0,
    mpptLoss: 0,
    otherLoss: 0,
  },
  regionStats: new Map(),
  alerts: [],
  unreadAlerts: 0,
  suggestions: [],
  
  setCurrentPower: (power) => set({ currentPower: power }),
  setTotalEnergyToday: (energy) => set({ totalEnergyToday: energy }),
  setTotalEnergyMonth: (energy) => set({ totalEnergyMonth: energy }),
  setAverageEfficiency: (eff) => set({ averageEfficiency: eff }),
  setPeakPowerToday: (power) => set({ peakPowerToday: power }),
  addPowerHistory: (time, value) =>
    set((prev) => ({
      powerHistory: [...prev.powerHistory.slice(-59), { time, value }],
    })),
  addEfficiencyHistory: (time, value) =>
    set((prev) => ({
      efficiencyHistory: [...prev.efficiencyHistory.slice(-59), { time, value }],
    })),
  setLossBreakdown: (breakdown) =>
    set((prev) => ({
      lossBreakdown: { ...prev.lossBreakdown, ...breakdown },
    })),
  setRegionStats: (regionId, stats) =>
    set((prev) => {
      const newStats = new Map(prev.regionStats);
      newStats.set(regionId, stats);
      return { regionStats: newStats };
    }),
  addAlert: (alert) =>
    set((prev) => ({
      alerts: [alert, ...prev.alerts.slice(0, 99)],
      unreadAlerts: prev.unreadAlerts + 1,
    })),
  acknowledgeAlert: (id) =>
    set((prev) => ({
      alerts: prev.alerts.map((a) => (a.id === id ? { ...a, acknowledged: true } : a)),
      unreadAlerts: Math.max(0, prev.unreadAlerts - 1),
    })),
  clearAlerts: () => set({ alerts: [], unreadAlerts: 0 }),
  setSuggestions: (suggestions) => set({ suggestions }),
  
  updateFromGenerations: (generations) => {
    if (generations.length === 0) return;
    
    const totalActual = generations.reduce((sum, g) => sum + g.outputPower, 0);
    const totalTheoretical = generations.reduce((sum, g) => sum + g.theoreticalPower, 0);
    const efficiency = totalTheoretical > 0 ? (totalActual / totalTheoretical) * 100 : 0;
    
    const shadowLossTotal = generations.reduce((sum, g) => sum + g.shadowLoss * g.theoreticalPower, 0);
    const tempLossTotal = generations.reduce((sum, g) => sum + g.temperatureLoss * g.theoreticalPower, 0);
    const mpptLossTotal = generations.reduce((sum, g) => sum + g.mpptLoss * g.theoreticalPower, 0);
    const otherLoss = totalTheoretical - totalActual - shadowLossTotal - tempLossTotal - mpptLossTotal;
    
    set((prev) => ({
      currentPower: totalActual,
      averageEfficiency: efficiency,
      peakPowerToday: Math.max(prev.peakPowerToday, totalActual),
      lossBreakdown: {
        shadowLoss: shadowLossTotal,
        temperatureLoss: tempLossTotal,
        mpptLoss: mpptLossTotal,
        otherLoss: Math.max(0, otherLoss),
      },
    }));
  },
}));
