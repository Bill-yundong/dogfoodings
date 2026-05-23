import { create } from 'zustand';
import type { WeatherData, PlatformMetadata } from '@/types';
import { api } from '@/services/api';
import { mockWebSocket } from '@/services/websocket';

interface WeatherState {
  currentWeather: Record<string, WeatherData>;
  weatherHistory: Record<string, WeatherData[]>;
  platforms: PlatformMetadata[];
  selectedPlatformId: string;
  selectedPlatform: string;
  isLoading: boolean;
  isWsConnected: boolean;
  unsubscribeWs?: () => void;

  init: () => Promise<void>;
  selectPlatform: (id: string) => void;
  loadCurrentWeather: (platformId: string) => Promise<void>;
  loadWeatherHistory: (platformId: string, hours: number) => Promise<void>;
  connectWebSocket: () => void;
  disconnectWebSocket: () => void;
}

export const useWeatherStore = create<WeatherState>((set, get) => ({
  currentWeather: {},
  weatherHistory: {},
  platforms: [],
  selectedPlatformId: 'plat-001',
  selectedPlatform: 'plat-001',
  isLoading: false,
  isWsConnected: false,

  init: async () => {
    set({ isLoading: true });
    try {
      const platforms = await api.getPlatforms();
      set({ platforms });

      const defaultId = get().selectedPlatformId;
      if (platforms.length > 0) {
        const firstActive = platforms.find(p => p.status === 'active')?.id || platforms[0].id;
        set({ selectedPlatformId: defaultId || firstActive });
        await get().loadCurrentWeather(get().selectedPlatformId);
        await get().loadWeatherHistory(get().selectedPlatformId, 6);
      }
    } finally {
      set({ isLoading: false });
    }
  },

  selectPlatform: (id: string) => {
    set({ selectedPlatformId: id, selectedPlatform: id });
    get().loadCurrentWeather(id);
    get().loadWeatherHistory(id, 6);
  },

  loadCurrentWeather: async (platformId: string) => {
    try {
      const weather = await api.getCurrentWeather(platformId);
      set(state => ({
        currentWeather: { ...state.currentWeather, [platformId]: weather },
      }));
    } catch (e) {
      console.error('Failed to load weather:', e);
    }
  },

  loadWeatherHistory: async (platformId: string, hours: number) => {
    try {
      const endTime = Date.now();
      const startTime = endTime - hours * 3600000;
      const history = await api.getWeatherHistory(platformId, startTime, endTime);
      set(state => ({
        weatherHistory: { ...state.weatherHistory, [platformId]: history },
      }));
    } catch (e) {
      console.error('Failed to load weather history:', e);
    }
  },

  connectWebSocket: () => {
    if (get().isWsConnected) return;

    const unsubscribe = mockWebSocket.subscribe(message => {
      if (message.type === 'weather') {
        const weather = message.data as WeatherData;
        set(state => ({
          currentWeather: { ...state.currentWeather, [weather.platformId]: weather },
          weatherHistory: {
            ...state.weatherHistory,
            [weather.platformId]: [
              ...(state.weatherHistory[weather.platformId] || []).slice(-287),
              weather,
            ],
          },
        }));
      }
    });

    mockWebSocket.connect();
    set({ isWsConnected: true, unsubscribeWs: unsubscribe });
  },

  disconnectWebSocket: () => {
    get().unsubscribeWs?.();
    mockWebSocket.disconnect();
    set({ isWsConnected: false, unsubscribeWs: undefined });
  },
}));
