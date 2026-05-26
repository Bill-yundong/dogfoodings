import { create } from 'zustand';
import type { GridSignal, ChargeSession, ChargeCurvePoint, V2GResponse, EnergyForecast } from '@/types';

interface EnergyState {
  gridSignals: GridSignal[];
  chargeSessions: ChargeSession[];
  chargeCurve: ChargeCurvePoint[];
  v2gResponses: V2GResponse[];
  forecasts: EnergyForecast[];
  currentLoad: number;
  totalEnergyUsed: number;
  totalV2GRevenue: number;
  setGridSignals: (signals: GridSignal[]) => void;
  setChargeSessions: (sessions: ChargeSession[]) => void;
  setChargeCurve: (curve: ChargeCurvePoint[]) => void;
  addV2GResponse: (response: V2GResponse) => void;
  setForecasts: (forecasts: EnergyForecast[]) => void;
  updateLoad: (load: number) => void;
  addEnergyUsed: (energy: number) => void;
  addV2GRevenue: (revenue: number) => void;
}

export const useEnergyStore = create<EnergyState>((set) => ({
  gridSignals: [],
  chargeSessions: [],
  chargeCurve: [],
  v2gResponses: [],
  forecasts: [],
  currentLoad: 65,
  totalEnergyUsed: 0,
  totalV2GRevenue: 0,

  setGridSignals: (signals) => set({ gridSignals: signals }),
  setChargeSessions: (sessions) => set({ chargeSessions: sessions }),
  setChargeCurve: (curve) => set({ chargeCurve: curve }),
  addV2GResponse: (response) =>
    set((state) => ({
      v2gResponses: [response, ...state.v2gResponses].slice(0, 100),
    })),
  setForecasts: (forecasts) => set({ forecasts }),
  updateLoad: (load) => set({ currentLoad: load }),
  addEnergyUsed: (energy) =>
    set((state) => ({
      totalEnergyUsed: state.totalEnergyUsed + energy,
    })),
  addV2GRevenue: (revenue) =>
    set((state) => ({
      totalV2GRevenue: state.totalV2GRevenue + revenue,
    })),
}));
