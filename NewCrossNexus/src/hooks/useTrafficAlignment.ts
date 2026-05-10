import { useState, useEffect, useCallback } from 'react';
import { trafficAlignment, TrafficAlignment } from '@/lib/sync/traffic-alignment';
import { TrafficIndex, SyncState, AlignmentMessage } from '@/lib/types/traffic';

export function useTrafficAlignment() {
  const [syncState, setSyncState] = useState<SyncState>(trafficAlignment.getSyncState());

  useEffect(() => {
    trafficAlignment.setAlignmentCallback((state) => {
      setSyncState({ ...state });
    });

    return () => {
      trafficAlignment.setAlignmentCallback(null);
    };
  }, []);

  const updateCommandCenter = useCallback((index: TrafficIndex) => {
    trafficAlignment.updateCommandCenterIndex(index);
  }, []);

  const updateMobileDevice = useCallback((index: TrafficIndex) => {
    trafficAlignment.updateMobileDeviceIndex(index);
  }, []);

  const createSyncMessage = useCallback((
    source: 'command-center' | 'mobile',
    trafficIndex: TrafficIndex,
    type: 'request' | 'response' | 'update' = 'update'
  ): AlignmentMessage => {
    return trafficAlignment.createSyncMessage(source, trafficIndex, type);
  }, []);

  const processMessage = useCallback(async (message: AlignmentMessage) => {
    await trafficAlignment.processMessage(message);
  }, []);

  const mergeIndices = useCallback((
    index1: TrafficIndex,
    index2: TrafficIndex,
    weight1: number = 0.5,
    weight2: number = 0.5
  ): TrafficIndex => {
    return trafficAlignment.mergeTrafficIndices(index1, index2, weight1, weight2);
  }, []);

  const startAutoSync = useCallback((
    getCCIndex: () => TrafficIndex | null,
    getMobileIndex: () => TrafficIndex | null
  ) => {
    trafficAlignment.startAutoSync(getCCIndex, getMobileIndex);
  }, []);

  const stopAutoSync = useCallback(() => {
    trafficAlignment.stopAutoSync();
  }, []);

  const setSyncInterval = useCallback((interval: number) => {
    trafficAlignment.setSyncInterval(interval);
  }, []);

  const reset = useCallback(() => {
    trafficAlignment.reset();
    setSyncState(trafficAlignment.getSyncState());
  }, []);

  return {
    syncState,
    updateCommandCenter,
    updateMobileDevice,
    createSyncMessage,
    processMessage,
    mergeIndices,
    startAutoSync,
    stopAutoSync,
    setSyncInterval,
    reset,
  };
}