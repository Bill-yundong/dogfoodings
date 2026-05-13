import { useState, useCallback } from 'react';
import type { Ship, Anchorage } from '../types';
import { db, initializeSampleData } from '../db';

export const useAppInitializer = () => {
  const [ships, setShips] = useState<Ship[]>([]);
  const [anchorages, setAnchorages] = useState<Anchorage[]>([]);
  const [selectedAnchorageId, setSelectedAnchorageId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const initializeData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      await initializeSampleData();
      
      const [shipsData, anchoragesData] = await Promise.all([
        db.getAllShips(),
        db.getAllAnchorages()
      ]);

      setShips(shipsData);
      setAnchorages(anchoragesData);
      
      if (anchoragesData.length > 0) {
        setSelectedAnchorageId(anchoragesData[0].id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '初始化失败');
      console.error('数据初始化错误:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
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
  };
};
