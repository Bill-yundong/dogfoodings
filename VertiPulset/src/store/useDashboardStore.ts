import { create } from 'zustand';
import type { Flight, Runway, Aircraft, Alert, WeatherData, KPIData } from '@/types';

interface DashboardState {
  flights: Flight[];
  runways: Runway[];
  aircraft: Aircraft[];
  alerts: Alert[];
  weather: WeatherData;
  kpis: KPIData[];
  lastUpdate: Date;
  isLoading: boolean;
  setFlights: (flights: Flight[]) => void;
  setRunways: (runways: Runway[]) => void;
  setAircraft: (aircraft: Aircraft[]) => void;
  addAlert: (alert: Alert) => void;
  setWeather: (weather: WeatherData) => void;
  setKPIs: (kpis: KPIData[]) => void;
  setLoading: (loading: boolean) => void;
  updateRealTimeData: () => void;
}

export const useDashboardStore = create<DashboardState>((set, get) => ({
  flights: [],
  runways: [],
  aircraft: [],
  alerts: [],
  weather: {
    timestamp: new Date(),
    temperature: 25,
    windSpeed: 5,
    windDirection: 180,
    visibility: 10,
    precipitation: 0,
  },
  kpis: [],
  lastUpdate: new Date(),
  isLoading: false,

  setFlights: (flights) => set({ flights }),
  setRunways: (runways) => set({ runways }),
  setAircraft: (aircraft) => set({ aircraft }),
  addAlert: (alert) => set((state) => ({
    alerts: [alert, ...state.alerts].slice(0, 100),
  })),
  setWeather: (weather) => set({ weather }),
  setKPIs: (kpis) => set({ kpis }),
  setLoading: (loading) => set({ isLoading: loading }),

  updateRealTimeData: () => {
    set({ lastUpdate: new Date() });
  },
}));
