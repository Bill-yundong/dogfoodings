import type { Ship, Anchorage, WeatherCondition, AnchorStatus, SemanticSyncMessage } from './index';
import type { EvacuationPlan } from '../services/typhoonOptimizer';

export interface AppState {
  ships: Ship[];
  anchorages: Anchorage[];
  selectedAnchorageId: string;
  anchorStatuses: Map<string, AnchorStatus>;
  weather: WeatherCondition;
  currentSpeed: number;
  messages: SemanticSyncMessage[];
  evacuationPlan: EvacuationPlan | null;
  isLoading: boolean;
  error: string | null;
}

export interface AppActions {
  setShips: (ships: Ship[]) => void;
  setAnchorages: (anchorages: Anchorage[]) => void;
  setSelectedAnchorageId: (id: string) => void;
  setAnchorStatus: (shipId: string, status: AnchorStatus) => void;
  setWeather: (weather: WeatherCondition) => void;
  setCurrentSpeed: (speed: number) => void;
  addMessage: (message: SemanticSyncMessage) => void;
  setEvacuationPlan: (plan: EvacuationPlan | null) => void;
  clearEvacuationPlan: () => void;
  setIsLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  initializeData: () => Promise<void>;
  simulateAnchorStability: (shipId: string) => Promise<void>;
  simulateAllShips: () => Promise<void>;
  generateEvacuationPlan: () => Promise<void>;
}

export interface AppContextType extends AppState, AppActions {}

export type UseAnchorSimulationReturn = {
  simulateSingle: (shipId: string) => Promise<void>;
  simulateAll: () => Promise<void>;
  isSimulating: boolean;
};

export type UseSemanticSyncReturn = {
  messages: SemanticSyncMessage[];
  sendStatusUpdate: (shipId: string, status: AnchorStatus) => Promise<void>;
  sendAlert: (shipId: string, alertType: string, severity: string, description: string) => Promise<void>;
  sendCommand: (targetShipId: string, command: string, parameters: any) => Promise<void>;
};
