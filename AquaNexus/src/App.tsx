import React, { useState, useEffect, useCallback } from 'react';
import { Droplets, RefreshCw, Loader2, Database } from 'lucide-react';
import { MonitoringMap } from './components/MonitoringMap';
import { StatusPanel } from './components/StatusPanel';
import { CommandPanel } from './components/CommandPanel';
import { PointDetailModal } from './components/PointDetailModal';
import { MockDataGenerator } from './services/MockDataGenerator';
import { alignmentService } from './services/AlignmentService';
import { snapshotDB } from './services/SnapshotDatabase';
import { workerService } from './services/HydrodynamicsWorkerService';
import type { MonitoringPoint, ChemicalDriftTrajectory, DispatchCommand } from './types/hydrodynamics';

function App() {
  const [monitoringPoints, setMonitoringPoints] = useState<MonitoringPoint[]>([]);
  const [trajectories, setTrajectories] = useState<ChemicalDriftTrajectory[]>([]);
  const [selectedPoint, setSelectedPoint] = useState<MonitoringPoint | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isExecutingCommand, setIsExecutingCommand] = useState(false);
  const [networkStatus, setNetworkStatus] = useState(navigator.onLine);
  const [lastSnapshotTime, setLastSnapshotTime] = useState<number | null>(null);
  const [alignmentProgress, setAlignmentProgress] = useState(0);

  useEffect(() => {
    const initializeSystem = async () => {
      try {
        await snapshotDB.init();
        workerService.init();

        const points = MockDataGenerator.generateMonitoringPoints(100);
        const trajs = MockDataGenerator.generateChemicalTrajectories(5);

        setMonitoringPoints(points);
        setTrajectories(trajs);

        alignmentService.setEnvironmentalData(points);
        alignmentService.setMunicipalData(points.slice(0, 50));

        const latestSnapshot = await snapshotDB.getLatestSnapshot();
        if (latestSnapshot) {
          setLastSnapshotTime(latestSnapshot.metadata.timestamp);
        }

        await alignmentService.performAlignment(setAlignmentProgress);
      } catch (error) {
        console.error('Initialization error:', error);
      } finally {
        setIsInitializing(false);
      }
    };

    initializeSystem();

    const handleOnline = () => setNetworkStatus(true);
    const handleOffline = () => setNetworkStatus(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    const interval = setInterval(async () => {
      if (monitoringPoints.length > 0) {
        const updatedPoints = monitoringPoints.map((point) => ({
          ...point,
          lastUpdate: Date.now(),
          waterQuality: {
            ...point.waterQuality,
            temperature: point.waterQuality.temperature + (Math.random() - 0.5) * 0.5,
            dissolvedOxygen: Math.max(
              0,
              point.waterQuality.dissolvedOxygen + (Math.random() - 0.5) * 0.2
            ),
          },
        }));
        setMonitoringPoints(updatedPoints);
        alignmentService.setEnvironmentalData(updatedPoints);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [monitoringPoints]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const points = MockDataGenerator.generateMonitoringPoints(100);
      const trajs = MockDataGenerator.generateChemicalTrajectories(5);

      setMonitoringPoints(points);
      setTrajectories(trajs);

      alignmentService.setEnvironmentalData(points);

      const snapshot = MockDataGenerator.generateSystemSnapshot(points, trajs);
      await snapshotDB.saveSnapshot(snapshot);
      setLastSnapshotTime(snapshot.metadata.timestamp);

      await alignmentService.performAlignment(setAlignmentProgress);
    } catch (error) {
      console.error('Refresh error:', error);
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  const handleExecuteCommand = useCallback(
    async (command: DispatchCommand): Promise<boolean> => {
      setIsExecutingCommand(true);
      try {
        const success = await alignmentService.executeCommand(command);

        if (success) {
          try {
            await snapshotDB.init();
            const snapshot = MockDataGenerator.generateSystemSnapshot(monitoringPoints, trajectories);
            await snapshotDB.saveSnapshot(snapshot);
            setLastSnapshotTime(snapshot.metadata.timestamp);
          } catch (snapshotError) {
            console.warn('Failed to save snapshot, but command executed:', snapshotError);
          }
        }

        return success;
      } catch (error) {
        console.error('Command execution error:', error);
        return false;
      } finally {
        setIsExecutingCommand(false);
      }
    },
    [monitoringPoints, trajectories]
  );

  if (isInitializing) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Droplets className="w-12 h-12 text-aqua-400 animate-pulse" />
            <h1 className="text-3xl font-bold text-white">AquaNexus</h1>
          </div>
          <p className="text-slate-400 mb-4">城市水源地调度中枢正在初始化...</p>
          <div className="flex items-center justify-center gap-2 text-aqua-400">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>加载系统模块中...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <header className="bg-slate-800/50 backdrop-blur-sm border-b border-slate-700 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-aqua-500/20 rounded-xl flex items-center justify-center">
                <Droplets className="w-6 h-6 text-aqua-400" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">AquaNexus</h1>
                <p className="text-xs text-slate-400">城市水源地调度中枢 · 流体动力学语义模型</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="text-sm text-slate-400">系统对齐度</div>
                <div className="flex items-center gap-2">
                  <div className="w-24 bg-slate-700 rounded-full h-2">
                    <div
                      className="bg-aqua-400 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${alignmentService.getAlignmentScore()}%` }}
                    />
                  </div>
                  <span className="text-aqua-400 font-semibold text-sm">
                    {alignmentService.getAlignmentScore().toFixed(1)}%
                  </span>
                </div>
              </div>

              <button
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="flex items-center gap-2 px-4 py-2 bg-aqua-500 hover:bg-aqua-600 disabled:bg-slate-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
              >
                <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                <span className="text-sm font-medium">刷新数据</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-slate-100 mb-3 flex items-center gap-2">
                <Database className="w-5 h-5 text-aqua-400" />
                实时监测地图
              </h2>
              <MonitoringMap
                monitoringPoints={monitoringPoints}
                trajectories={trajectories}
                selectedPointId={selectedPoint?.id}
                onPointSelect={setSelectedPoint}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <StatusPanel
                networkStatus={networkStatus}
                alignmentStatus={alignmentService.getAlignmentStatus()}
                monitoringPoints={monitoringPoints}
                lastSnapshotTime={lastSnapshotTime}
              />
            </div>
          </div>

          <div className="space-y-6">
            <CommandPanel
              onExecuteCommand={handleExecuteCommand}
              isExecuting={isExecutingCommand}
            />

            <div className="bg-slate-800/80 rounded-xl p-4 border border-slate-700">
              <h3 className="text-lg font-semibold text-slate-100 mb-3 flex items-center gap-2">
                <Database className="w-5 h-5 text-aqua-400" />
                化学漂移轨迹
              </h3>
              <div className="space-y-2">
                {trajectories.map((traj) => (
                  <div
                    key={traj.id}
                    className="bg-slate-900/50 rounded-lg p-3 flex items-center justify-between"
                  >
                    <div>
                      <div className="text-sm font-medium text-slate-200">{traj.chemicalType}</div>
                      <div className="text-xs text-slate-500">
                        浓度: {(traj.concentration * 100).toFixed(1)}%
                      </div>
                    </div>
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        traj.riskLevel === 'extreme'
                          ? 'bg-red-500/20 text-red-400'
                          : traj.riskLevel === 'high'
                          ? 'bg-orange-500/20 text-orange-400'
                          : traj.riskLevel === 'medium'
                          ? 'bg-amber-500/20 text-amber-400'
                          : 'bg-emerald-500/20 text-emerald-400'
                      }`}
                    >
                      {traj.riskLevel === 'extreme'
                        ? '极高'
                        : traj.riskLevel === 'high'
                        ? '高'
                        : traj.riskLevel === 'medium'
                        ? '中'
                        : '低'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>

      <PointDetailModal point={selectedPoint} onClose={() => setSelectedPoint(null)} />

      <footer className="bg-slate-800/30 border-t border-slate-700 mt-12">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-500">
              AquaNexus v1.0.0 · 流体动力学语义模型调度系统
            </span>
            <span className="text-slate-500">
              Web Worker 异步处理 · IndexedDB 离线存储
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
