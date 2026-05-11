'use client';

import { useEffect, useState } from 'react';
import SeismicWaveform from '../components/SeismicWaveform';
import StressField from '../components/StressField';
import IntensityIndicator from '../components/IntensityIndicator';
import BuildingStatus from '../components/BuildingStatus';
import { useSeismicWorker } from '../hooks/useSeismicWorker';
import { syncManager } from '../lib/syncManager';
import { seismicDB } from '../lib/indexedDB';
import { BuildingSafetyStatus, SeismicDataPoint, Alert } from '../types/seismic';

export default function Home() {
  const { isReady, prediction, data, generateSyntheticData, setData } = useSeismicWorker();
  const [intensity, setIntensity] = useState(2.5);
  const [isSimulating, setIsSimulating] = useState(false);
  const [buildings, setBuildings] = useState<BuildingSafetyStatus[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [syncLatency, setSyncLatency] = useState(0);
  const [storedDataCount, setStoredDataCount] = useState(0);

  const stations = [
    { x: 0.2, y: 0.3, intensity: intensity / 10 },
    { x: 0.5, y: 0.5, intensity: (intensity + 1) / 10 },
    { x: 0.8, y: 0.6, intensity: (intensity - 0.5) / 10 },
  ];

  useEffect(() => {
    const sampleBuildings: BuildingSafetyStatus[] = [
      {
        buildingId: 'B001',
        buildingName: '科技大厦 A 座',
        currentIntensity: intensity,
        stressLevel: intensity * 8,
        safetyScore: Math.max(0, 95 - intensity * 6),
        alerts: intensity > 5 ? [{ id: 'a1', type: 'warning', message: '检测到应力异常波动', timestamp: Date.now() }] : [],
        lastUpdate: Date.now()
      },
      {
        buildingId: 'B002',
        buildingName: '商业中心 B 栋',
        currentIntensity: intensity * 0.9,
        stressLevel: intensity * 7,
        safetyScore: Math.max(0, 90 - intensity * 5),
        alerts: [],
        lastUpdate: Date.now()
      },
      {
        buildingId: 'B003',
        buildingName: '住宅楼 C 区',
        currentIntensity: intensity * 1.1,
        stressLevel: intensity * 9,
        safetyScore: Math.max(0, 85 - intensity * 7),
        alerts: intensity > 6 ? [{ id: 'a2', type: 'danger', message: '结构应力超过预警阈值', timestamp: Date.now() }] : [],
        lastUpdate: Date.now()
      }
    ];
    setBuildings(sampleBuildings);
  }, [intensity]);

  useEffect(() => {
    generateSyntheticData(15000, 100);
    loadStoredData();
    loadAlerts();
    measureLatency();

    const unsubscribeSeismic = syncManager.subscribe('seismic', (msg) => {
      if (msg.type === 'seismic_data') {
        setData(prev => [...prev.slice(-900), ...msg.payload.data].slice(-1000));
      }
    });

    const unsubscribeAlert = syncManager.subscribe('alert', (msg) => {
      if (msg.type === 'alert') {
        setAlerts(prev => [msg.payload, ...prev].slice(0, 10));
      }
    });

    return () => {
      unsubscribeSeismic();
      unsubscribeAlert();
    };
  }, [generateSyntheticData, setData]);

  const loadStoredData = async () => {
    try {
      const slices = await seismicDB.getWaveformSlicesByTimeRange(0, Date.now());
      setStoredDataCount(slices.length);
    } catch (e) {
      console.error('Failed to load stored data:', e);
    }
  };

  const loadAlerts = async () => {
    try {
      const storedAlerts = await seismicDB.getAlerts(10);
      setAlerts(storedAlerts);
    } catch (e) {
      console.error('Failed to load alerts:', e);
    }
  };

  const measureLatency = () => {
    const latency = syncManager.getLatency('seismic');
    setSyncLatency(latency);
  };

  const startSimulation = () => {
    setIsSimulating(true);
    
    let time = 0;
    const duration = 30000;
    const interval = setInterval(() => {
      time += 100;
      
      const progress = time / duration;
      const baseIntensity = 2 + Math.sin(progress * Math.PI) * 6;
      const noise = (Math.random() - 0.5) * 0.5;
      const newIntensity = Math.max(0, Math.min(12, baseIntensity + noise));
      
      setIntensity(newIntensity);

      if (Math.random() > 0.9 && time % 1000 === 0) {
        const newData: SeismicDataPoint[] = [];
        for (let i = 0; i < 50; i++) {
          const timestamp = Date.now() + i * 10;
          const magnitude = (Math.random() - 0.5) * 0.1 + Math.sin(time / 1000 + i) * (newIntensity / 10);
          newData.push({
            timestamp,
            x: magnitude * 0.8,
            y: magnitude * 0.6,
            z: magnitude * 0.4,
            magnitude: Math.abs(magnitude)
          });
        }
        syncManager.broadcastSeismicData('ST001', newData);
        loadStoredData();
      }

      if (newIntensity > 6 && Math.random() > 0.95) {
        syncManager.broadcastAlert({
          type: newIntensity > 8 ? 'danger' : 'warning',
          message: `检测到烈度 ${newIntensity.toFixed(1)} 级地震活动`
        });
        loadAlerts();
      }

      measureLatency();

      if (time >= duration) {
        clearInterval(interval);
        setIsSimulating(false);
      }
    }, 100);
  };

  const handleIntensityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setIntensity(parseFloat(e.target.value));
  };

  const clearData = async () => {
    await seismicDB.clearAll();
    setStoredDataCount(0);
    setAlerts([]);
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <header className="bg-gray-900 border-b border-gray-800 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-green-400 to-blue-500 bg-clip-text text-transparent">
              EismoLink
            </h1>
            <p className="text-sm text-gray-400">地震波应力场演变监测系统</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-xs text-gray-500">数据同步延迟</div>
              <div className="text-sm font-mono text-green-400">{syncLatency.toFixed(1)} ms</div>
            </div>
            <div className="text-right">
              <div className="text-xs text-gray-500">存储数据点</div>
              <div className="text-sm font-mono text-blue-400">{storedDataCount}</div>
            </div>
            <div className={`w-3 h-3 rounded-full ${isReady ? 'bg-green-500 animate-pulse' : 'bg-gray-500'}`} />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6">
        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-4">
            <IntensityIndicator intensity={intensity} />
          </div>

          <div className="col-span-8">
            <div className="bg-gray-900 rounded-xl p-6 border border-gray-700">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-white font-semibold">地震波应力场</h3>
                <span className="text-xs text-gray-500">实时模拟</span>
              </div>
              <StressField width={560} height={300} intensity={intensity / 5} stations={stations} />
            </div>
          </div>

          <div className="col-span-8">
            <div className="bg-gray-900 rounded-xl p-6 border border-gray-700">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-white font-semibold">地震波形数据</h3>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">采样率: 100 Hz</span>
                  {prediction && prediction.confidence > 0 && (
                    <span className="text-xs text-yellow-400">
                      置信度: {(prediction.confidence * 100).toFixed(0)}%
                    </span>
                  )}
                </div>
              </div>
              <SeismicWaveform
                data={data}
                width={560}
                height={200}
                pWaveTime={prediction?.pWaveArrival}
                sWaveTime={prediction?.sWaveArrival}
              />
              {prediction && prediction.timeDiff > 0 && (
                <div className="mt-4 grid grid-cols-3 gap-4">
                  <div className="bg-gray-800 rounded-lg p-3 text-center">
                    <div className="text-xs text-gray-400">P/S 波时差</div>
                    <div className="text-xl font-bold text-yellow-400">{prediction.timeDiff.toFixed(2)} s</div>
                  </div>
                  <div className="bg-gray-800 rounded-lg p-3 text-center">
                    <div className="text-xs text-gray-400">预估震级</div>
                    <div className="text-xl font-bold text-red-400">{prediction.estimatedMagnitude.toFixed(1)}</div>
                  </div>
                  <div className="bg-gray-800 rounded-lg p-3 text-center">
                    <div className="text-xs text-gray-400">数据点</div>
                    <div className="text-xl font-bold text-blue-400">{data.length}</div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="col-span-4 space-y-4">
            <div className="bg-gray-900 rounded-xl p-6 border border-gray-700">
              <h3 className="text-white font-semibold mb-4">模拟控制</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-gray-400 block mb-2">手动烈度调节</label>
                  <input
                    type="range"
                    min="0"
                    max="12"
                    step="0.1"
                    value={intensity}
                    onChange={handleIntensityChange}
                    className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                    disabled={isSimulating}
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>0</span>
                    <span>6</span>
                    <span>12</span>
                  </div>
                </div>

                <button
                  onClick={startSimulation}
                  disabled={isSimulating}
                  className={`w-full py-3 rounded-lg font-medium transition-all ${
                    isSimulating
                      ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                      : 'bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 text-white'
                  }`}
                >
                  {isSimulating ? '模拟进行中...' : '启动地震模拟'}
                </button>

                <button
                  onClick={clearData}
                  className="w-full py-2 rounded-lg text-sm bg-gray-800 hover:bg-gray-700 text-gray-300 transition-all"
                >
                  清除存储数据
                </button>
              </div>
            </div>

            <div className="bg-gray-900 rounded-xl p-6 border border-gray-700">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-white font-semibold">告警日志</h3>
                <span className="text-xs text-gray-500">{alerts.length} 条</span>
              </div>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {alerts.length === 0 ? (
                  <div className="text-center text-gray-500 text-sm py-4">暂无告警</div>
                ) : (
                  alerts.map((alert) => (
                    <div
                      key={alert.id}
                      className={`p-3 rounded-lg text-sm ${
                        alert.type === 'danger'
                          ? 'bg-red-500/10 border border-red-500/30 text-red-400'
                          : alert.type === 'warning'
                          ? 'bg-yellow-500/10 border border-yellow-500/30 text-yellow-400'
                          : 'bg-blue-500/10 border border-blue-500/30 text-blue-400'
                      }`}
                    >
                      <div className="font-medium">{alert.message}</div>
                      <div className="text-xs opacity-70 mt-1">
                        {new Date(alert.timestamp).toLocaleTimeString()}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="col-span-12">
            <BuildingStatus buildings={buildings} />
          </div>

          <div className="col-span-12">
            <div className="bg-gray-900 rounded-xl p-6 border border-gray-700">
              <h3 className="text-white font-semibold mb-4">系统架构</h3>
              <div className="grid grid-cols-4 gap-4">
                <div className="bg-gray-800 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-3 h-3 rounded-full bg-green-500" />
                    <span className="font-medium text-sm">Web Worker</span>
                  </div>
                  <p className="text-xs text-gray-400">
                    异步执行 P/S 波到达时差预测模型，避免阻塞主线程
                  </p>
                </div>
                <div className="bg-gray-800 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-3 h-3 rounded-full bg-blue-500" />
                    <span className="font-medium text-sm">IndexedDB</span>
                  </div>
                  <p className="text-xs text-gray-400">
                    本地存储地震台站的增量波形切片，支持灾后数据回溯
                  </p>
                </div>
                <div className="bg-gray-800 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-3 h-3 rounded-full bg-yellow-500" />
                    <span className="font-medium text-sm">BroadcastChannel</span>
                  </div>
                  <p className="text-xs text-gray-400">
                    台站与建筑结构安全系统间的毫秒级语义数据同步
                  </p>
                </div>
                <div className="bg-gray-800 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-3 h-3 rounded-full bg-purple-500" />
                    <span className="font-medium text-sm">Canvas 渲染</span>
                  </div>
                  <p className="text-xs text-gray-400">
                    震动烈度动态反馈与应力场实时演变可视化
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="bg-gray-900 border-t border-gray-800 px-6 py-4 mt-8">
        <div className="max-w-7xl mx-auto text-center text-gray-500 text-sm">
          EismoLink - 基于 Next.js 的地震波应力场演变监测系统
        </div>
      </footer>
    </div>
  );
}
