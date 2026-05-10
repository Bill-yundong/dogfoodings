'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useTrafficSimulation } from '@/hooks/useTrafficSimulation';
import { useTrafficDB } from '@/hooks/useTrafficDB';
import { useTrafficAlignment } from '@/hooks/useTrafficAlignment';
import { TrafficGrid } from '@/components/TrafficGrid';
import { TrafficIndexCard } from '@/components/TrafficIndexCard';
import { HistoricalDataPanel } from '@/components/HistoricalDataPanel';
import { TrafficIndex } from '@/lib/types/traffic';

export default function HomePage() {
  const {
    trafficIndex,
    grid,
    isRunning,
    stepCount,
    initSimulation,
    start,
    stop,
    reset,
  } = useTrafficSimulation();

  const {
    isInitialized: dbInitialized,
    records,
    recordCount,
    init: initDB,
    addRecord,
    getRecordsByTimeRange,
    getPeakRecords,
    clearAllRecords,
  } = useTrafficDB();

  const {
    syncState,
    updateCommandCenter,
    updateMobileDevice,
    mergeIndices,
  } = useTrafficAlignment();

  const [mobileIndex, setMobileIndex] = useState<TrafficIndex | null>(null);
  const [density, setDensity] = useState(0.8);
  const [autoSync, setAutoSync] = useState(true);
  
  const trafficIndexRef = useRef<TrafficIndex | null>(null);
  const isRunningRef = useRef(false);
  const dbInitializedRef = useRef(false);

  useEffect(() => {
    trafficIndexRef.current = trafficIndex;
  }, [trafficIndex]);

  useEffect(() => {
    isRunningRef.current = isRunning;
  }, [isRunning]);

  useEffect(() => {
    dbInitializedRef.current = dbInitialized;
  }, [dbInitialized]);

  useEffect(() => {
    initDB();
    initSimulation({ vehicleDensity: density });
  }, []);

  useEffect(() => {
    if (trafficIndex) {
      updateCommandCenter(trafficIndex);
      
      if (autoSync) {
        const mobileVariant = addNoiseToIndex(trafficIndex);
        setMobileIndex(mobileVariant);
        updateMobileDevice(mobileVariant);
      }
    }
  }, [trafficIndex, autoSync]);

  useEffect(() => {
    if (!dbInitialized) return;
    
    const interval = setInterval(() => {
      if (isRunningRef.current && trafficIndexRef.current) {
        addRecord(trafficIndexRef.current);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [dbInitialized, addRecord]);

  const addNoiseToIndex = (index: TrafficIndex): TrafficIndex => {
    const noise = Math.floor(Math.random() * 10) - 5;
    const newOverall = Math.max(0, Math.min(100, index.overall + noise));
    
    return {
      ...index,
      timestamp: Date.now(),
      overall: newOverall,
      hotspots: index.hotspots.slice(0, Math.max(1, index.hotspots.length - Math.floor(Math.random() * 2))),
    };
  };

  const handleStart = useCallback(() => {
    start();
  }, [start]);

  const handleStop = useCallback(() => {
    stop();
  }, [stop]);

  const handleReset = useCallback(() => {
    reset({ vehicleDensity: density });
  }, [reset, density]);

  const handleDensityChange = useCallback((newDensity: number) => {
    setDensity(newDensity);
  }, []);

  const handleApplyDensity = useCallback(() => {
    reset({ vehicleDensity: density });
  }, [reset, density]);

  const handleFetchTimeRange = useCallback(async (hours: number) => {
    const now = Date.now();
    const start = now - hours * 60 * 60 * 1000;
    return await getRecordsByTimeRange(start, now);
  }, [getRecordsByTimeRange]);

  const getSyncStatus = (): 'synced' | 'out-of-sync' | 'unknown' => {
    if (!syncState.commandCenter || !syncState.mobileDevice) {
      return 'unknown';
    }
    return syncState.isAligned ? 'synced' : 'out-of-sync';
  };

  const formatTime = (timestamp: number): string => {
    if (timestamp === 0) return '未同步';
    return new Date(timestamp).toLocaleTimeString('zh-CN');
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-950 to-slate-900">
      <header className="bg-slate-900/80 backdrop-blur-sm border-b border-slate-800 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                <span className="text-traffic-green">●</span>
                CrossNexus
                <span className="text-base font-normal text-slate-400 ml-2">
                  核心城区情报级拥堵治理系统
                </span>
              </h1>
              <p className="text-sm text-slate-500 mt-1">
                异步元胞自动机仿真 · IndexedDB 历史回溯 · 指挥中心与移动端动态对齐
              </p>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="text-sm text-slate-400">
                仿真步数: <span className="text-white font-mono">{stepCount}</span>
              </div>
              <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                isRunning 
                  ? 'bg-traffic-green/20 text-traffic-green' 
                  : 'bg-slate-700 text-slate-400'
              }`}>
                {isRunning ? '运行中' : '已暂停'}
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="bg-slate-800/50 rounded-lg p-4 mb-6 border border-slate-700">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex gap-2">
              {!isRunning ? (
                <button
                  onClick={handleStart}
                  className="px-4 py-2 bg-traffic-green/20 text-traffic-green hover:bg-traffic-green/30 rounded-lg transition-colors font-medium"
                >
                  ▶ 开始仿真
                </button>
              ) : (
                <button
                  onClick={handleStop}
                  className="px-4 py-2 bg-red-900/50 text-red-400 hover:bg-red-900/70 rounded-lg transition-colors font-medium"
                >
                  ⏸ 暂停仿真
                </button>
              )}
              <button
                onClick={handleReset}
                className="px-4 py-2 bg-slate-700 text-slate-300 hover:bg-slate-600 rounded-lg transition-colors"
              >
                ↺ 重置
              </button>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-sm text-slate-400">车辆密度:</label>
              <input
                type="range"
                min="0.1"
                max="1.5"
                step="0.1"
                value={density}
                onChange={(e) => handleDensityChange(parseFloat(e.target.value))}
                className="w-32 accent-blue-500"
              />
              <span className="text-sm text-white font-mono w-10">{density.toFixed(1)}</span>
              <button
                onClick={handleApplyDensity}
                className="px-2 py-1 bg-blue-600 text-white hover:bg-blue-500 rounded text-sm transition-colors"
              >
                应用
              </button>
            </div>

            <div className="flex items-center gap-2 ml-auto">
              <label className="text-sm text-slate-400">移动端模拟同步:</label>
              <button
                onClick={() => setAutoSync(!autoSync)}
                className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                  autoSync
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-700 text-slate-400'
                }`}
              >
                {autoSync ? '已启用' : '已禁用'}
              </button>
            </div>

            <div className="flex items-center gap-2 px-3 py-1 bg-slate-900/50 rounded">
              <span className="text-sm text-slate-400">数据库:</span>
              <span className={`text-sm ${dbInitialized ? 'text-traffic-green' : 'text-traffic-yellow'}`}>
                {dbInitialized ? '已就绪' : '初始化中'}
              </span>
              <span className="text-xs text-slate-500">({recordCount} 条记录)</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                核心城区交通仿真网格
              </h2>
              <div className="overflow-x-auto">
                <TrafficGrid grid={grid} cellSize={18} />
              </div>
              
              <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t border-slate-700">
                <div className="flex items-center gap-2">
                  <span className="w-4 h-4 rounded bg-traffic-green"></span>
                  <span className="text-sm text-slate-400">畅通</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-4 h-4 rounded bg-traffic-yellow"></span>
                  <span className="text-sm text-slate-400">缓行</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-4 h-4 rounded bg-orange-500"></span>
                  <span className="text-sm text-slate-400">拥堵</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-4 h-4 rounded bg-traffic-red"></span>
                  <span className="text-sm text-slate-400">严重拥堵</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-4 h-4 rounded border-2 border-yellow-400 bg-slate-600"></span>
                  <span className="text-sm text-slate-400">路口</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-4 h-4 rounded bg-slate-700"></span>
                  <span className="text-sm text-slate-400">建筑</span>
                </div>
              </div>
            </div>

            <HistoricalDataPanel
              records={records}
              recordCount={recordCount}
              onFetchPeak={getPeakRecords}
              onFetchTimeRange={handleFetchTimeRange}
              onClearAll={clearAllRecords}
            />
          </div>

          <div className="space-y-6">
            <div className="space-y-4">
              <TrafficIndexCard
                title="指挥中心"
                trafficIndex={syncState.commandCenter}
                syncStatus={getSyncStatus()}
              />
              <TrafficIndexCard
                title="交警移动端"
                trafficIndex={mobileIndex || syncState.mobileDevice}
                syncStatus={getSyncStatus()}
              />
            </div>

            <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${
                  syncState.isAligned ? 'bg-traffic-green' : 'bg-traffic-yellow animate-pulse'
                }`}></span>
                同步状态
              </h3>
              
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">对齐状态:</span>
                  <span className={`font-medium ${
                    syncState.isAligned ? 'text-traffic-green' : 'text-traffic-yellow'
                  }`}>
                    {syncState.isAligned ? '已对齐' : '未对齐'}
                  </span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">最后同步时间:</span>
                  <span className="text-white font-mono text-sm">
                    {formatTime(syncState.lastSyncTime)}
                  </span>
                </div>

                {syncState.commandCenter && syncState.mobileDevice && (
                  <>
                    <div className="pt-3 border-t border-slate-700">
                      <div className="text-sm text-slate-400 mb-2">指数差异:</div>
                      <div className="flex items-center gap-2">
                        <span className="text-2xl font-bold text-white">
                          {Math.abs(syncState.commandCenter.overall - syncState.mobileDevice.overall)}
                        </span>
                        <span className="text-slate-500">点</span>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-700">
                      <button
                        onClick={() => {
                          if (syncState.commandCenter && syncState.mobileDevice) {
                            const merged = mergeIndices(
                              syncState.commandCenter,
                              syncState.mobileDevice
                            );
                            updateCommandCenter(merged);
                            setMobileIndex(merged);
                            updateMobileDevice(merged);
                          }
                        }}
                        className="w-full px-3 py-2 bg-purple-600/20 text-purple-400 hover:bg-purple-600/30 rounded transition-colors text-sm"
                      >
                          手动对齐（权重融合）
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
              <h3 className="text-lg font-semibold text-white mb-4">系统信息</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-400">仿真引擎:</span>
                  <span className="text-slate-300">异步元胞自动机</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">数据存储:</span>
                  <span className="text-slate-300">IndexedDB</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">同步机制:</span>
                  <span className="text-slate-300">增量同步融合</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">数据保留:</span>
                  <span className="text-slate-300">30天</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}