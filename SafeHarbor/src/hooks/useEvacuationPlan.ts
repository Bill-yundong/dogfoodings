import { useState, useCallback } from 'react';
import type { Ship, Anchorage, WeatherCondition } from '../types';
import type { EvacuationPlan } from '../services/typhoonOptimizer';
import { typhoonOptimizer } from '../services/typhoonOptimizer';

export const useEvacuationPlan = (
  ships: Ship[],
  anchorages: Anchorage[],
  weather: WeatherCondition,
  currentSpeed: number
) => {
  const [evacuationPlan, setEvacuationPlan] = useState<EvacuationPlan | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const generatePlan = useCallback(async () => {
    if (ships.length === 0 || anchorages.length === 0) {
      return;
    }

    try {
      setIsGenerating(true);
      const plan = await typhoonOptimizer.generateEvacuationPlan(
        ships,
        anchorages,
        weather,
        currentSpeed,
        180
      );
      setEvacuationPlan(plan);
    } catch (error) {
      console.error('生成疏散方案失败:', error);
    } finally {
      setIsGenerating(false);
    }
  }, [ships, anchorages, weather, currentSpeed]);

  const clearPlan = useCallback(() => {
    setEvacuationPlan(null);
  }, []);

  return {
    evacuationPlan,
    setEvacuationPlan,
    generatePlan,
    clearPlan,
    isGenerating
  };
};
