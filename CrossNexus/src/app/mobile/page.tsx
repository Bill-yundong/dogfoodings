'use client';

import { useEffect, useState, useCallback } from 'react';
import { useTrafficSimulation } from '@/hooks/useTrafficSimulation';
import { useTrafficDB } from '@/hooks/useTrafficDB';
import { useTrafficAlignment } from '@/hooks/useTrafficAlignment';
import { TrafficGrid } from '@/components/TrafficGrid';
import { TrafficIndex } from '@/lib/types/traffic';

export default function MobilePage() {
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
    init: initDB,
    addRecord,
  } = useTrafficDB();

  const {
    syncState,
    updateMobileDevice,
    updateCommandCenter,
  } = useTrafficAlignment();

  const [lastManualSync, setLastManualSync] = useState<number>(0);

  useEffect(() => {
    initDB();
    initSimulation({ vehicleDensity: 0.8 });
  }, []);

  useEffect(() => {
    if (trafficIndex) {
      updateMobileDevice(trafficIndex);
      
      if (syncState.commandCenter) {
        updateCommandCenter(syncState.commandCenter);
      }
    }
  }, [trafficIndex]);

  useEffect(() => {
    if (!dbInitialized || !trafficIndex) return;
    
    const interval = setInterval(() => {
      addRecord(trafficIndex);
    }, 5000);

    return () => clearInterval(interval);
  }, [dbInitialized, trafficIndex, addRecord]);

  const handleManualSync = useCallback(() => {
    if (trafficIndex) {
      updateMobileDevice(trafficIndex);
      setLastManualSync(Date.now());
    }
  }, [trafficIndex, updateMobileDevice]);

  const getOverallColor = (value: number): string => {
    if (value < 25) return 'text-traffic-green';
    if (value < 50) return 'text-traffic-yellow';
    if (value < 75) return 'text-orange-500';
    return 'text-traffic-red';
  };

  const getOverallBg = (value: number): string => {
    if (value < 25) return 'bg-traffic-green/10 border-traffic-green/30';
    if (value < 50) return 'bg-traffic-yellow/10 border-traffic-yellow/30';
    if (value < 75) return 'bg-orange-500/10 border-orange-500/30';
    return 'bg-traffic-red/10 border-traffic-red/30';
  };

  const formatTime = (timestamp: number): string => {
    if (timestamp === 0) return '未同步';
    return new Date(timestamp).toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  return (
    <main className="min-h-screen bg-slate-950 max-w-md mx-auto">
      <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-10">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${isRunning ? 'bg-traffic-green animate-pulse' : 'bg-slate-500'}`}></div>
              <h1 className="text-lg font-bold text-white">交警移动端</h1>
            </div>
            <div className="text-xs text-slate-400">
              步数: {stepCount}
            </div>
          </div>
        </div>
      </header>

      <div className="px-4 py-4 space-y-4">
        <div className={`rounded-2xl p-6 border ${
          trafficIndex 
            ? getOverallBg(trafficIndex.overall)
            : 'bg-slate-800 border-slate-700'
        }`}>
          <div className="text-sm text-slate-400 mb-2">当前拥堵指数</div>
          {trafficIndex ? (
            <>
              <div className={`text-6xl font-bold ${getOverallColor(trafficIndex.overall)}`}>
                {trafficIndex.overall}
              </div>
              <div className="text-sm text-slate-500 mt-1">/ 100</div>
              
              <div className="grid grid-cols-2 gap-4 mt-6 pt-4 border-t border-slate-700">
                <div>
                  <div className="text-xs text-slate-400">拥堵热点</div>
                  <div className="text-xl font-semibold text-white">
                    {trafficIndex.hotspots.length}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-slate-400">更新时间</div>
                  <div className="text-sm font-medium text-slate-300">
                    {formatTime(trafficIndex.timestamp)}
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="py-8 text-center text-slate-500 animate-pulse">
              等待数据...
            </div>
          )}
        </div>

        <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-white">同步状态</span>
            <div className={`flex items-center gap-1 text-xs ${
              syncState.isAligned ? 'text-traffic-green' : 'text-traffic-yellow'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${
                syncState.isAligned ? 'bg-traffic-green' : 'bg-traffic-yellow animate-pulse'
              }`}></span>
              {syncState.isAligned ? '已对齐' : '同步中'}
            </div>
          </div>
          
          <div className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-400">最后同步:</span>
              <span className="text-slate-300">{formatTime(syncState.lastSyncTime)}</span>
            </div>
            {lastManualSync > 0 && (
              <div className="flex justify-between">
                <span className="text-slate-400">手动同步:</span>
                <span className="text-slate-300">{formatTime(lastManualSync)}</span>
              </div>
            )}
          </div>
          
          <button
            onClick={handleManualSync}
            disabled={!trafficIndex}
            className="w-full mt-3 px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-lg transition-colors text-sm font-medium"
          >
            立即同步
          </button>
        </div>

        <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-white">仿真控制</span>
            <span className={`text-xs px-2 py-0.5 rounded-full ${
              isRunning 
                ? 'bg-traffic-green/20 text-traffic-green' 
                : 'bg-slate-700 text-slate-400'
            }`}>
              {isRunning ? '运行中' : '已暂停'}
            </span>
          </div>
          
          <div className="flex gap-2">
            {!isRunning ? (
              <button
                onClick={start}
                className="flex-1 px-4 py-3 bg-traffic-green/20 text-traffic-green hover:bg-traffic-green/30 rounded-lg transition-colors font-medium"
              >
                ▶ 开始
              </button>
            ) : (
              <button
                onClick={stop}
                className="flex-1 px-4 py-3 bg-red-900/50 text-red-400 hover:bg-red-900/70 rounded-lg transition-colors font-medium"
              >
                ⏸ 暂停
              </button>
            )}
            <button
              onClick={() => reset()}
              className="px-4 py-3 bg-slate-700 text-slate-300 hover:bg-slate-600 rounded-lg transition-colors"
            >
              ↺
            </button>
          </div>
        </div>

        <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
          <div className="text-sm font-medium text-white mb-3">交通热力图</div>
          <div className="overflow-x-auto">
            <TrafficGrid grid={grid} cellSize={12} />
          </div>
          
          <div className="flex flex-wrap gap-3 mt-3">
            <div className="flex items-center gap-1">
              <span className="w-3 h-3 rounded bg-traffic-green"></span>
              <span className="text-xs text-slate-400">畅通</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-3 h-3 rounded bg-traffic-yellow"></span>
              <span className="text-xs text-slate-400">缓行</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-3 h-3 rounded bg-orange-500"></span>
              <span className="text-xs text-slate-400">拥堵</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-3 h-3 rounded bg-traffic-red"></span>
              <span className="text-xs text-slate-400">严重</span>
            </div>
          </div>
        </div>

        {trafficIndex && trafficIndex.hotspots.length > 0 && (
          <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-white">拥堵热点</span>
              <span className="text-xs text-traffic-red bg-traffic-red/10 px-2 py-0.5 rounded-full">
                {trafficIndex.hotspots.length} 处
              </span>
            </div>
            
            <div className="space-y-2 max-h-48 overflow-auto scrollbar-thin">
              {trafficIndex.hotspots.slice(0, 10).map((hotspot, index) => (
                <div 
                  key={index}
                  className="flex items-center justify-between p-2 bg-slate-900/50 rounded-lg"
                >
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${
                      hotspot.level >= 3 ? 'bg-traffic-red animate-pulse' : 
                      hotspot.level >= 2 ? 'bg-orange-500' : 'bg-traffic-yellow'
                    }`}></div>
                    <span className="text-sm text-slate-300">
                      坐标 ({hotspot.x}, {hotspot.y})
                    </span>
                  </div>
                  <span className={`text-xs font-medium ${
                    hotspot.level >= 3 ? 'text-traffic-red' : 
                    hotspot.level >= 2 ? 'text-orange-500' : 'text-traffic-yellow'
                  }`}>
                    {hotspot.level >= 3 ? '严重拥堵' : 
                     hotspot.level >= 2 ? '拥堵' : '缓行'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="bg-slate-800/30 rounded-xl p-4 border border-slate-700/50">
          <div className="text-xs text-slate-500 space-y-1">
            <div>数据库: {dbInitialized ? 'IndexedDB 已就绪' : '初始化中'}</div>
            <div>同步机制: 增量同步 + 加权融合</div>
          </div>
        </div>
      </div>
    </main>
  );
}