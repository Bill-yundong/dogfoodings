import { useState, useCallback } from 'react';
import { trafficSystem } from '../coordination/greenWave';

export function useDeviceSync() {
  const [alignmentStatus, setAlignmentStatus] = useState(null);

  const checkAlignments = useCallback(() => {
    const alignments = trafficSystem.getAllAlignments();
    let allAligned = true;
    let totalDevices = 0;
    
    for (const deviceId in alignments) {
      totalDevices++;
      if (!alignments[deviceId].isAligned) {
        allAligned = false;
      }
      trafficSystem.saveAlignmentLog(deviceId, alignments[deviceId]);
    }
    
    const status = {
      allAligned,
      totalDevices
    };
    
    setAlignmentStatus(status);
    return status;
  }, []);

  const syncDevices = useCallback(() => {
    const results = trafficSystem.syncDevices();
    console.log('同步设备结果:', results);
    
    return checkAlignments();
  }, [checkAlignments]);

  const clearAlignmentStatus = useCallback(() => {
    setAlignmentStatus(null);
  }, []);

  return {
    alignmentStatus,
    setAlignmentStatus,
    syncDevices,
    checkAlignments,
    clearAlignmentStatus
  };
}
