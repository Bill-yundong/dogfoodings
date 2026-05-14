'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import { Rack, PrecisionAC, TemperaturePoint, AirflowRisk, PUEStats } from '@/lib/types/datacenter';
import { generateMockRacks, generateMockACs } from '@/lib/data/mockData';
import { AsyncCFDEngine } from '@/lib/cfd/CFDEngine';
import { heatLoadSyncManager } from '@/lib/sync/HeatLoadSync';
import { indexedDBStore } from '@/lib/storage/IndexedDBStore';
import { calculatePUEStats } from '@/lib/utils/pueCalculator';
import PUEIndicator from '@/components/dashboard/PUEIndicator';
import HeatMap2D from '@/components/dashboard/HeatMap2D';
import RiskAlerts from '@/components/dashboard/RiskAlerts';
import ACStatus from '@/components/dashboard/ACStatus';

const TemperatureField3D = dynamic(
  () => import('@/components/three/TemperatureField3D'),
  { ssr: false }
);

export default function Home() {
  const [racks, setRacks] = useState<Rack[]>([]);
  const [acs, setAcs] = useState<PrecisionAC[]>([]);
  const [temperaturePoints, setTemperaturePoints] = useState<TemperaturePoint[]>([]);
  const [risks, setRisks] = useState<AirflowRisk[]>([]);
  const [pueStats, setPueStats] = useState<PUEStats>({
    currentPUE: 1.4,
    targetPUE: 1.4,
    dailyAverage: 1.4,
    weeklyAverage: 1.4,
    monthlyAverage: 1.4,
    trend: 'stable' as const
  });
  const [isCFDComputing, setIsCFDComputing] = useState(false);
  const [cfdProgress, setCfdProgress] = useState(0);
  const [isSyncConnected, setIsSyncConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  
  const isCFDComputingRef = useRef(false);

  useEffect(() => {
    const initialRacks = generateMockRacks();
    const initialAcs = generateMockACs();
    setRacks(initialRacks);
    setAcs(initialAcs);

    indexedDBStore.init().catch(() => {});

    computeCFD(initialRacks, initialAcs);

    heatLoadSyncManager.startRealTimeSimulation(initialRacks, initialAcs);
    setIsSyncConnected(heatLoadSyncManager.isSyncConnected());

    const handleHeatLoadUpdate = async () => {
      setRacks([...initialRacks]);
      setAcs([...initialAcs]);
      setLastUpdate(new Date());

      try {
        const snapshot = heatLoadSyncManager.generatePowerSnapshot(initialRacks, initialAcs);
        await indexedDBStore.addPowerSnapshot(snapshot);

        const snapshots = await indexedDBStore.getPowerSnapshots(100);
        setPueStats(calculatePUEStats(snapshots));
      } catch (e) {
        console.error('Error saving snapshot:', e);
      }
    };

    heatLoadSyncManager.on('heat_load_update', handleHeatLoadUpdate);

    return () => {
      heatLoadSyncManager.stopSimulation();
      heatLoadSyncManager.disconnect();
    };
  }, []);

  const computeCFD = useCallback(async (racksData: Rack[], acsData: PrecisionAC[]) => {
    if (isCFDComputingRef.current) return;
    
    isCFDComputingRef.current = true;
    setIsCFDComputing(true);
    setCfdProgress(0);

    try {
      const cfdEngine = new AsyncCFDEngine({
        gridSize: { x: 20, y: 8, z: 15 },
        iterations: 40,
        relaxationFactor: 0.3
      });

      const points = await cfdEngine.computeTemperatureField(
        racksData,
        acsData,
        (progress) => setCfdProgress(progress)
      );

      const detectedRisks = cfdEngine.detectAirflowRisks(points, racksData);

      setTemperaturePoints(points);
      setRisks(detectedRisks);

      if (detectedRisks.length > 0) {
        detectedRisks.forEach(async (risk) => {
          try {
            await indexedDBStore.addRiskAlert({
              id: risk.id,
              timestamp: Date.now(),
              type: risk.type,
              severity: risk.severity,
              description: risk.description
            });
          } catch (e) {
            console.error('Error saving risk alert:', e);
          }
        });
      }
    } catch (e) {
      console.error('CFD computation error:', e);
    } finally {
      isCFDComputingRef.current = false;
      setIsCFDComputing(false);
    }
  }, []);

  const handleRefreshCFD = () => {
    if (racks.length > 0 && acs.length > 0) {
      computeCFD(racks, acs);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        <header className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                <span className="text-4xl">❄️</span>
                CoolNexus 数据中心热管理平台
              </h1>
              <p className="text-white/60 mt-1">基于 CFD 的实时热负荷分布与能效优化系统</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-green-500/20 border border-green-500/30">
                <div className={`w-2 h-2 rounded-full ${isSyncConnected ? 'bg-green-500 animate-pulse' : 'bg-gray-500'}`} />
                <span className="text-sm text-green-400">
                  {isSyncConnected ? '实时同步中' : '连接断开'}
                </span>
              </div>
              {lastUpdate && (
                <div className="text-sm text-white/50">
                  最后更新: {lastUpdate.toLocaleTimeString()}
                </div>
              )}
            </div>
          </div>
        </header>

        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-3">
            <PUEIndicator stats={pueStats} />
            
            <div className="mt-6 p-6 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10">
              <h3 className="text-lg font-semibold text-white/80 mb-4">实时功率</h3>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-white/60">IT 负载</span>
                    <span className="text-blue-400 font-medium">
                      {(racks.reduce((sum, r) => sum + r.currentPower, 0) / 1000).toFixed(1)} kW
                    </span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div className="h-2 rounded-full bg-blue-500 transition-all duration-300" style={{ width: '65%' }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-white/60">制冷系统</span>
                    <span className="text-cyan-400 font-medium">
                      {(acs.reduce((sum, a) => sum + a.currentCooling, 0) / 1000).toFixed(1)} kW
                    </span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div className="h-2 rounded-full bg-cyan-500 transition-all duration-300" style={{ width: '45%' }} />
                  </div>
                </div>
                <div className="pt-2 border-t border-white/10">
                  <div className="flex justify-between">
                    <span className="text-white/60">总功耗</span>
                    <span className="text-white font-bold text-lg">
                      {((racks.reduce((sum, r) => sum + r.currentPower, 0) + 
                         acs.reduce((sum, a) => sum + a.currentCooling, 0)) / 1000).toFixed(1)} kW
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="col-span-6">
            <div className="p-6 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white/80">3D 温度场可视化</h3>
                <button
                  onClick={handleRefreshCFD}
                  disabled={isCFDComputing}
                  className="px-4 py-2 rounded-lg bg-blue-500/20 border border-blue-500/30 text-blue-400 text-sm
                    hover:bg-blue-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isCFDComputing ? `计算中 ${cfdProgress.toFixed(0)}%` : '重新计算 CFD'}
                </button>
              </div>
              
              <TemperatureField3D
                temperaturePoints={temperaturePoints}
                racks={racks}
                acs={acs}
                width={650}
                height={400}
              />
              
              <div className="flex justify-center gap-6 mt-4">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-blue-500/70" />
                  <span className="text-xs text-white/60">机柜</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-cyan-500/70" />
                  <span className="text-xs text-white/60">精密空调</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-gradient-to-r from-cyan-500 via-yellow-500 to-red-500" />
                  <span className="text-xs text-white/60">温度点云</span>
                </div>
              </div>
            </div>

            <div className="mt-6">
              <HeatMap2D racks={racks} />
            </div>
          </div>

          <div className="col-span-3">
            <RiskAlerts risks={risks} />
            
            <div className="mt-6">
              <ACStatus acs={acs} />
            </div>
          </div>
        </div>

        <footer className="mt-8 pt-6 border-t border-white/10 text-center">
          <p className="text-white/40 text-sm">
            CoolNexus © 2024 | 数据中心热管理与能效优化平台
          </p>
        </footer>
      </div>
    </main>
  );
}
