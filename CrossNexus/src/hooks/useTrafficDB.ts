import { useState, useEffect, useCallback } from 'react';
import { trafficDB, TrafficDatabase } from '@/lib/database/indexedDB';
import { TrafficIndex, HistoricalRecord } from '@/lib/types/traffic';

export function useTrafficDB() {
  const [isInitialized, setIsInitialized] = useState(false);
  const [records, setRecords] = useState<HistoricalRecord[]>([]);
  const [recordCount, setRecordCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const init = useCallback(async () => {
    try {
      await trafficDB.init();
      setIsInitialized(true);
      await updateCount();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to initialize database');
    }
  }, []);

  const addRecord = useCallback(async (index: TrafficIndex): Promise<string | null> => {
    if (!isInitialized) return null;
    
    try {
      const id = await trafficDB.addRecord(index);
      await updateCount();
      return id;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add record');
      return null;
    }
  }, [isInitialized]);

  const getRecordsSince = useCallback(async (timestamp: number): Promise<HistoricalRecord[]> => {
    if (!isInitialized) return [];
    
    try {
      const result = await trafficDB.getRecordsSince(timestamp);
      setRecords(result);
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch records');
      return [];
    }
  }, [isInitialized]);

  const getRecordsByTimeRange = useCallback(async (
    startTime: number,
    endTime: number
  ): Promise<HistoricalRecord[]> => {
    if (!isInitialized) return [];
    
    try {
      const result = await trafficDB.getRecordsByTimeRange(startTime, endTime);
      setRecords(result);
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch records');
      return [];
    }
  }, [isInitialized]);

  const getIncrementalRecords = useCallback(async (
    fromTimestamp: number,
    batchSize: number = 100
  ): Promise<{ records: HistoricalRecord[]; hasMore: boolean; nextTimestamp: number }> => {
    if (!isInitialized) {
      return { records: [], hasMore: false, nextTimestamp: fromTimestamp };
    }
    
    try {
      const result = await trafficDB.getIncrementalRecords(fromTimestamp, batchSize);
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch incremental records');
      return { records: [], hasMore: false, nextTimestamp: fromTimestamp };
    }
  }, [isInitialized]);

  const getPeakRecords = useCallback(async (
    peakType: 'morning' | 'evening' | 'both' = 'both'
  ): Promise<HistoricalRecord[]> => {
    if (!isInitialized) return [];
    
    try {
      const result = await trafficDB.getPeakTrafficRecords(peakType);
      setRecords(result);
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch peak records');
      return [];
    }
  }, [isInitialized]);

  const compareWithHistorical = useCallback(async (
    currentIndex: TrafficIndex,
    historicalHours: number = 24
  ) => {
    if (!isInitialized) {
      return { current: currentIndex, historical: null, comparison: { overallChange: 0, hotspotChange: 0 } };
    }
    
    try {
      return await trafficDB.compareWithHistorical(currentIndex, historicalHours);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to compare with historical');
      return { current: currentIndex, historical: null, comparison: { overallChange: 0, hotspotChange: 0 } };
    }
  }, [isInitialized]);

  const updateCount = useCallback(async () => {
    if (!isInitialized) return;
    
    try {
      const count = await trafficDB.getRecordCount();
      setRecordCount(count);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get record count');
    }
  }, [isInitialized]);

  const cleanupOldRecords = useCallback(async (maxAgeDays: number = 30): Promise<number> => {
    if (!isInitialized) return 0;
    
    try {
      const deleted = await trafficDB.cleanupOldRecords(maxAgeDays);
      await updateCount();
      return deleted;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to cleanup records');
      return 0;
    }
  }, [isInitialized, updateCount]);

  const clearAllRecords = useCallback(async () => {
    if (!isInitialized) return;
    
    try {
      await trafficDB.clearAllRecords();
      await updateCount();
      setRecords([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to clear records');
    }
  }, [isInitialized, updateCount]);

  return {
    isInitialized,
    records,
    recordCount,
    error,
    init,
    addRecord,
    getRecordsSince,
    getRecordsByTimeRange,
    getIncrementalRecords,
    getPeakRecords,
    compareWithHistorical,
    cleanupOldRecords,
    clearAllRecords,
  };
}