import { useState, useCallback } from 'react';
import type { Ship, Anchorage, WeatherCondition, AnchorStatus } from '../types';
import { catenaryModel } from '../models/catenary';
import { db } from '../db';
import { semanticSynchronizer } from '../services/semanticSync';
import { DRAG_RISK_LEVELS } from '../constants';

export const useAnchorSimulation = (
  ships: Ship[],
  anchorages: Anchorage[],
  selectedAnchorageId: string,
  weather: WeatherCondition,
  currentSpeed: number,
  onStatusUpdate: (shipId: string, status: AnchorStatus) => void
) => {
  const [isSimulating, setIsSimulating] = useState(false);

  const simulateSingle = useCallback(async (shipId: string) => {
    const ship = ships.find(s => s.id === shipId);
    const anchorage = anchorages.find(a => a.id === selectedAnchorageId);
    
    if (!ship || !anchorage) {
      console.warn('船舶或锚地未找到');
      return;
    }

    try {
      setIsSimulating(true);
      
      const status = await catenaryModel.simulateAnchorStability(
        ship,
        anchorage,
        weather,
        currentSpeed,
        180,
        6
      );

      onStatusUpdate(shipId, status);
      await db.addAnchorStatus(status);
      
      const syncMessage = semanticSynchronizer.createMessage(
        'ship',
        'status_update',
        {
          shipId,
          anchorStatus: status,
          syncTime: new Date().toISOString()
        }
      );
      await semanticSynchronizer.sendMessage(syncMessage);
      
      if (status.dragRisk === DRAG_RISK_LEVELS.HIGH || status.dragRisk === DRAG_RISK_LEVELS.CRITICAL) {
        const alertMessage = semanticSynchronizer.createMessage(
          'monitoring',
          'alert',
          {
            shipId,
            alertType: 'DRAG_RISK',
            severity: status.dragRisk,
            description: `船舶走锚风险等级: ${status.dragRisk}`,
            timestamp: Date.now()
          }
        );
        await semanticSynchronizer.sendMessage(alertMessage);
      }
    } catch (error) {
      console.error('模拟失败:', error);
    } finally {
      setIsSimulating(false);
    }
  }, [ships, anchorages, selectedAnchorageId, weather, currentSpeed, onStatusUpdate]);

  const simulateAll = useCallback(async () => {
    for (const ship of ships) {
      await simulateSingle(ship.id);
    }
  }, [ships, simulateSingle]);

  return {
    simulateSingle,
    simulateAll,
    isSimulating
  };
};
