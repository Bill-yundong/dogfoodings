import { useState, useEffect, useRef, useCallback } from 'react';
import { SortCoordinatorEngine } from '../engines/SortCoordinatorEngine';
import { Package, ConveyorNode, PerformanceMetrics, ErrorEvent, PLCStatus } from '../types';

export function useSortingSystem() {
  const engineRef = useRef<SortCoordinatorEngine | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [selectedPackageId, setSelectedPackageId] = useState<string | null>(null);

  const [packages, setPackages] = useState<Package[]>([]);
  const [nodes, setNodes] = useState<ConveyorNode[]>([]);
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    throughput: 0,
    averageSortTime: 0,
    errorRate: 0,
    utilizationRate: 0,
    totalPackages: 0,
    sortedPackages: 0,
    averageLatency: 0,
    alignmentRate: 0
  });
  const [errors, setErrors] = useState<ErrorEvent[]>([]);
  const [plcStatus, setPlcStatus] = useState<PLCStatus[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  useEffect(() => {
    const engine = new SortCoordinatorEngine();
    engineRef.current = engine;

    engine.setOnStateChange(() => {
      if (!engineRef.current) return;
      setPackages(engineRef.current.getPackages());
      setMetrics(engineRef.current.getMetrics());
      setErrors(engineRef.current.getErrors());
      setIsRunning(engineRef.current.getIsRunning());
    });

    setNodes(engine.getNodes());
    setPlcStatus(engine.getPLCStatus());
    setIsInitialized(true);

    return () => engine.destroy();
  }, []);

  const start = useCallback(() => {
    engineRef.current?.start();
  }, []);

  const stop = useCallback(() => {
    engineRef.current?.stop();
  }, []);

  const reset = useCallback(() => {
    engineRef.current?.reset();
    setSelectedPackageId(null);
  }, []);

  const selectedPackage = packages.find(p => p.id === selectedPackageId) || null;

  return {
    isInitialized,
    packages,
    nodes,
    metrics,
    errors,
    plcStatus,
    isRunning,
    selectedPackageId,
    selectedPackage,
    setSelectedPackageId,
    start,
    stop,
    reset
  };
}

export default useSortingSystem;
