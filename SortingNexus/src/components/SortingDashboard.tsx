import React, { useState, useEffect, useRef, useCallback } from 'react';
import { SortingCoordinator } from '../engine/SortingCoordinator';
import { Package, ConveyorNode, PLCStatus, PerformanceMetrics } from '../types/core';
import { TopologyVisualizer } from './TopologyVisualizer';
import { MetricsPanel } from './MetricsPanel';
import { PLCStatusPanel } from './PLCStatusPanel';
import { ErrorLogPanel } from './ErrorLogPanel';
import { PackageDetails } from './PackageDetails';
import { ControlPanel } from './ControlPanel';
import { FeatureHighlights } from './FeatureHighlights';
import { ErrorEvent } from '../engine/ErrorRecovery';

export const SortingDashboard: React.FC = () => {
  const coordinatorRef = useRef<SortingCoordinator | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [selectedPackageId, setSelectedPackageId] = useState<string | null>(null);

  const [packages, setPackages] = useState<Package[]>([]);
  const [nodes, setNodes] = useState<ConveyorNode[]>([]);
  const [plcStatusList, setPlcStatusList] = useState<PLCStatus[]>([]);
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    throughput: 0,
    averageSortTime: 0,
    errorRate: 0,
    utilizationRate: 0,
    totalPackages: 0,
    sortedPackages: 0
  });
  const [errors, setErrors] = useState<ErrorEvent[]>([]);
  const [averageLatency, setAverageLatency] = useState(0);

  useEffect(() => {
    const initCoordinator = async () => {
      const coordinator = new SortingCoordinator();
      await coordinator.init();
      
      coordinatorRef.current = coordinator;
      setNodes(coordinator.getNodes());
      setPlcStatusList(coordinator.getPlcStatus());
      setIsInitialized(true);

      coordinator.setStateChangeHandler((state) => {
        setPackages(state.packages);
        setMetrics(state.metrics);
        setErrors(state.errors as unknown as ErrorEvent[]);
        setAverageLatency(coordinator.getAverageLatency());
      });
    };

    initCoordinator();

    return () => {
      coordinatorRef.current?.destroy();
    };
  }, []);

  const handleStart = useCallback(() => {
    if (coordinatorRef.current) {
      coordinatorRef.current.start();
      setIsRunning(true);
    }
  }, []);

  const handleStop = useCallback(() => {
    if (coordinatorRef.current) {
      coordinatorRef.current.stop();
      setIsRunning(false);
    }
  }, []);

  const handleReset = useCallback(async () => {
    if (coordinatorRef.current) {
      handleStop();
      await coordinatorRef.current.reset();
      setPackages([]);
      setErrors([]);
      setSelectedPackageId(null);
      setPlcStatusList(coordinatorRef.current.getPlcStatus());
    }
  }, [handleStop]);

  const selectedPackage = packages.find(p => p.id === selectedPackageId) || null;

  if (!isInitialized) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4 animate-spin">⚙️</div>
          <h2 className="text-xl text-gray-400">系统初始化中...</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto px-4 py-6">
        <header className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 via-cyan-400 to-purple-400 bg-clip-text text-transparent">
                📦 SortingNexus
              </h1>
              <p className="text-gray-500 mt-1">快递分拣吞吐建模与控制系统</p>
            </div>
            <ControlPanel
              isRunning={isRunning}
              onStart={handleStart}
              onStop={handleStop}
              onReset={handleReset}
            />
          </div>
        </header>

        <section className="mb-6">
          <MetricsPanel metrics={metrics} averageLatency={averageLatency} />
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-3">
            <section className="bg-gray-800 rounded-xl p-4 border border-gray-700">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-300 flex items-center gap-2">
                  <span className="text-2xl">🔍</span> 传送带拓扑图
                </h2>
                <div className="flex items-center gap-4 text-sm text-gray-500">
                  <span className="flex items-center gap-1">
                    <span className="w-3 h-3 rounded-full bg-green-400"></span> 入口
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-3 h-3 rounded-full bg-purple-500"></span> 交叉带
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-3 h-3 rounded-full bg-orange-400"></span> 滑槽
                  </span>
                </div>
              </div>
              <TopologyVisualizer
                nodes={nodes}
                packages={packages}
                selectedPackageId={selectedPackageId}
                onPackageClick={setSelectedPackageId}
              />
            </section>

            <FeatureHighlights />
          </div>

          <div className="lg:col-span-1 space-y-6">
            <PackageDetails pkg={selectedPackage} />
            <PLCStatusPanel plcStatusList={plcStatusList} nodes={nodes} />
            <ErrorLogPanel errors={errors} />
          </div>
        </div>

        <footer className="mt-8 pt-6 border-t border-gray-800 text-center text-gray-600 text-sm">
          <p>SortingNexus © 2024 - 智能快递分拣系统</p>
        </footer>
      </div>
    </div>
  );
};

export default SortingDashboard;
