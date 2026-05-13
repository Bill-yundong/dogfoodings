import React, { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import type { AppContextType } from '../types/store';
import type { WeatherCondition, AnchorStatus } from '../types';
import { useAppInitializer } from '../hooks/useAppInitializer';
import { useAnchorSimulation } from '../hooks/useAnchorSimulation';
import { useSemanticSync } from '../hooks/useSemanticSync';
import { useEvacuationPlan } from '../hooks/useEvacuationPlan';
import { DEFAULT_WEATHER, DEFAULT_CURRENT_SPEED } from '../constants';

const AppContext = createContext<AppContextType | undefined>(undefined);

interface AppProviderProps {
  children: ReactNode;
}

export const AppProvider: React.FC<AppProviderProps> = ({ children }) => {
  const {
    ships,
    setShips,
    anchorages,
    setAnchorages,
    selectedAnchorageId,
    setSelectedAnchorageId,
    isLoading,
    setIsLoading,
    error,
    setError,
    initializeData
  } = useAppInitializer();

  const [anchorStatuses, setAnchorStatusesState] = useState<Map<string, AnchorStatus>>(new Map());
  const [weather, setWeather] = useState<WeatherCondition>(DEFAULT_WEATHER);
  const [currentSpeed, setCurrentSpeed] = useState(DEFAULT_CURRENT_SPEED);

  const { messages, addMessage } = useSemanticSync();

  const setAnchorStatus = useCallback((shipId: string, status: AnchorStatus) => {
    setAnchorStatusesState(prev => new Map(prev).set(shipId, status));
  }, []);

  const { simulateSingle, simulateAll } = useAnchorSimulation(
    ships,
    anchorages,
    selectedAnchorageId,
    weather,
    currentSpeed,
    setAnchorStatus
  );

  const { evacuationPlan, setEvacuationPlan, generatePlan, clearPlan } = useEvacuationPlan(
    ships,
    anchorages,
    weather,
    currentSpeed
  );

  const contextValue: AppContextType = {
    ships,
    anchorages,
    selectedAnchorageId,
    anchorStatuses,
    weather,
    currentSpeed,
    messages,
    evacuationPlan,
    isLoading,
    error,
    setShips,
    setAnchorages,
    setSelectedAnchorageId,
    setAnchorStatus,
    setWeather,
    setCurrentSpeed,
    addMessage,
    setEvacuationPlan,
    clearEvacuationPlan: clearPlan,
    setIsLoading,
    setError,
    initializeData,
    simulateAnchorStability: simulateSingle,
    simulateAllShips: simulateAll,
    generateEvacuationPlan: generatePlan
  };

  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = (): AppContextType => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};
