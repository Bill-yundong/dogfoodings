import { useState, useEffect, useCallback, useRef } from 'react';
import { trafficDB } from '@/lib/database/indexedDB';
import { TrafficIndex, HistoricalRecord } from '@/lib/types/traffic';

export function useTrafficDB() {
  const [isInitialized, setIsInitialized] = useState(false);
  const [records, setRecords] = useState<HistoricalRecord[]>([]);
  const [recordCount, setRecordCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  
  const isInitializedRef = useRef(false);
  const recordsRef = useRef<HistoricalRecord[]>([]);

  useEffect(() => {
    isInitializedRef.current = isInitialized;
  }, [isInitialized]);

  useEffect(() => {
    recordsRef.current = records;
  }, [records]);

  const refreshRecentRecords = useCallback(async () => {
    if (!isInitializedRef.current) return;
    
    const now = Date.now();
    const sixHoursAgo = now - 6 * 60 * 60 * 1000;
    const result = await trafficDB.getRecordsByTimeRange(sixHoursAgo, now);
    setRecords(result);
  }, []);

  const updateCount = useCallback(async () => {
    if (!isInitializedRef.current) return;
    
    try {
      const count = await trafficDB.getRecordCount();
      setRecordCount(count);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get record count');
    }
  }, []);

  const init = useCallback(async () => {
    try {
      await trafficDB.init();
      setIsInitialized(true);
      isInitializedRef.current = true;
      await updateCount();
      await refreshRecentRecords();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to initialize database');
    }
  }, [updateCount, refreshRecentRecords]);

  const addRecord = useCallback(async (index: TrafficIndex): Promise<string | null> => {
    if (!isInitializedRef.current) return null;
    
    try {
      const id = await trafficDB.addRecord(index);
      await updateCount();
      await refreshRecentRecords();
      return id;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add record');
      return null;
    }
  }, [updateCount, refreshRecentRecords]);

  const getRecordsSince = useCallback(async (timestamp: number): Promise<HistoricalRecord[]> => {
    if (!isInitializedRef.current) return [];
    
    try {
      const result = await trafficDB.getRecordsSince(timestamp);
      setRecords(result);
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch records');
      return [];
    }
  }, []);

  const getRecordsByTimeRange = useCallback(async (
    startTime: number,
    endTime: number
  ): Promise<HistoricalRecord[]> => {
    if (!isInitializedRef.current) return [];
    
    try {
      const result = await trafficDB.getRecordsByTimeRange(startTime, endTime);
      setRecords(result);
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch records');
      return [];
    }
  }, []);

  const getIncrementalRecords = useCallback(async (
    fromTimestamp: number,
    batchSize: number = 100
  ): Promise<{ records: HistoricalRecord[]; hasMore: boolean; nextTimestamp: number }> => {
    if (!isInitializedRef.current) {
      return { records: [], hasMore: false, nextTimestamp: fromTimestamp };
    }
    
    try {
      const result = await trafficDB.getIncrementalRecords(fromTimestamp, batchSize);
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch incremental records');
      return { records: [], hasMore: false, nextTimestamp: fromTimestamp };
    }
  }, []);

  const getPeakRecords = useCallback(async (
    peakType: 'morning' | 'evening' | 'both' = 'both'
  ): Promise<HistoricalRecord[]> => {
    if (!isInitializedRef.current) return [];
    
    try {
      const result = await trafficDB.getPeakTrafficRecords(peakType);
      setRecords(result);
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch peak records');
      return [];
    }
  }, []);

  const compareWithHistorical = useCallback(async (
    currentIndex: TrafficIndex,
    historicalHours: number = 24
  ) => {
    if (!isInitializedRef.current) {
      return { current: currentIndex, historical: null, comparison: { overallChange: 0, hotspotChange: 0 } };
    }
    
    try {
      return await trafficDB.compareWithHistorical(currentIndex, historicalHours);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to compare with historical');
      return { current: currentIndex, historical: null, comparison: { overallChange: 0, hotspotChange: 0 } };
    }
  }, []);

  const cleanupOldRecords = useCallback(async (maxAgeDays: number = 30): Promise<number> => {
    if (!isInitializedRef.current) return 0;
    
    try {
      const deleted = await trafficDB.cleanupOldRecords(maxAgeDays);
      await updateCount();
      return deleted;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to cleanup records');
      return 0;
    }
  }, [updateCount]);

  const clearAllRecords = useCallback(async () => {
    if (!isInitializedRef.current) return;
    
    try {
      await trafficDB.clearAllRecords();
      await updateCount();
      setRecords([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to clear records');
    }
  }, [updateCount]);

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