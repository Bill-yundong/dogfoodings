'use client';

import { useEffect, useState, useCallback } from 'react';
import { WeldPoint, AlignmentStatus as AlignmentStatusType } from '@/types/welding';
import { fluctuationEngine } from '@/lib/fluctuationEngine';
import { dataAlignmentEngine } from '@/lib/dataAlignment';
import { indexedDBManager } from '@/lib/indexedDB';
import { WaveformChart } from '@/components/WaveformChart';
import { QualityGauge } from '@/components/QualityGauge';
import { DefectAlert } from '@/components/DefectAlert';
import { AlignmentStatus } from '@/components/AlignmentStatus';
import { WeldPointList } from '@/components/WeldPointList';
import { SimulationControls } from '@/components/SimulationControls';
import { StatsOverview } from '@/components/StatsOverview';

export default function Home() {
  const [weldPoints, setWeldPoints] = useState<WeldPoint[]>([]);
  const [selectedPoint, setSelectedPoint] = useState<WeldPoint | null>(null);
  const [currentQuality, setCurrentQuality] = useState(95.5);
  const [currentStability, setCurrentStability] = useState(92.3);
  const [alignmentStatus, setAlignmentStatus] = useState<AlignmentStatusType>({
    robotTimestamp: Date.now(),
    qcTimestamp: Date.now(),
    latency: 12,
    synchronized: true,
    drift: 0,
  });
  const [alignmentConfidence, setAlignmentConfidence] = useState(94.5);
  const [isRunning, setIsRunning] = useState(false);
  const [dbCount, setDbCount] = useState(0);

  useEffect(() => {
    initDB();
    loadWeldPoints();
  }, []);

  const initDB = async () => {
    await indexedDBManager.init();
    updateCount();
  };

  const updateCount = async () => {
    const count = await indexedDBManager.getWeldPointCount();
    setDbCount(count);
  };

  const loadWeldPoints = async () => {
    const points = await indexedDBManager.getRecentWeldPoints(50);
    setWeldPoints(points);
    if (points.length > 0) {
      setSelectedPoint(points[0]);
    }
  };

  const addWeldPoint = useCallback(async (hasDefect: boolean = false) => {
    const weldPoint = await fluctuationEngine.simulateWeldFormation(3000, hasDefect);
    
    for (let i = 0; i < 10; i++) {
      const robotData = weldPoint.waveformSlice.filter(w => w.type === 'current').map(w => ({
        id: `robot-${Date.now()}-${i}`,
        timestamp: w.timestamp,
        temperature: 1500 + Math.random() * 200,
        current: w.value,
        voltage: 25 + Math.random() * 5,
        wireFeedSpeed: 8 + Math.random() * 2,
        gasFlowRate: 15 + Math.random() * 3,
        poolWidth: 8 + Math.random() * 2,
        poolDepth: 3 + Math.random() * 1,
        oscillationFrequency: 50 + Math.random() * 10,
        oscillationAmplitude: 2 + Math.random() * 0.5,
      }));
      
      const qcData = robotData.map(d => ({
        ...d,
        id: `qc-${d.id}`,
        temperature: d.temperature + (Math.random() - 0.5) * 20,
      }));

      robotData.forEach(d => dataAlignmentEngine.pushRobotData(d));
      qcData.forEach(d => dataAlignmentEngine.pushQCData(d));
    }

    const newAlignmentStatus = dataAlignmentEngine.performAlignment();
    setAlignmentStatus(newAlignmentStatus);
    setAlignmentConfidence(dataAlignmentEngine.getAlignmentConfidence());

    await indexedDBManager.saveWeldPoint(weldPoint);
    await updateCount();

    setWeldPoints(prev => [weldPoint, ...prev].slice(0, 50));
    setCurrentQuality(weldPoint.qualityScore);
    setCurrentStability(weldPoint.features.stabilityIndex);
    setSelectedPoint(weldPoint);
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isRunning) {
      interval = setInterval(() => {
        const hasDefect = Math.random() < 0.15;
        addWeldPoint(hasDefect);
      }, 2000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRunning, addWeldPoint]);

  const stats = {
    totalWelds: weldPoints.length,
    avgQuality: weldPoints.length > 0
      ? weldPoints.reduce((sum, p) => sum + p.qualityScore, 0) / weldPoints.length
      : 0,
    defectRate: weldPoints.length > 0
      ? (weldPoints.filter(p => p.defectRisk.level !== 'none').length / weldPoints.length) * 100
      : 0,
    avgStability: weldPoints.length > 0
      ? weldPoints.reduce((sum, p) => sum + p.features.stabilityIndex, 0) / weldPoints.length
      : 0,
  };

  const handleReset = async () => {
    fluctuationEngine.reset();
    dataAlignmentEngine.reset();
    setWeldPoints([]);
    setSelectedPoint(null);
    setCurrentQuality(95.5);
    setCurrentStability(92.3);
    setIsRunning(false);
    setDbCount(0);
    await indexedDBManager.clearOldData(Date.now());
  };

  return (
    <main className="min-h-screen bg-gray-950 grid-pattern">
      <div className="container mx-auto p-6">
        <header className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">WeldNexus</h1>
              <p className="text-gray-400">自动化机器人焊接质量实时监控系统</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${isRunning ? 'bg-green-500 animate-pulse' : 'bg-gray-500'}`} />
                <span className="text-sm text-gray-400">
                  {isRunning ? '监控运行中' : '监控已停止'}
                </span>
              </div>
            </div>
          </div>
        </header>

        <div className="mb-6">
          <StatsOverview
            totalWelds={stats.totalWelds}
            avgQuality={stats.avgQuality}
            defectRate={stats.defectRate}
            avgStability={stats.avgStability}
            trend={stats.avgQuality > 85 ? 'up' : stats.avgQuality > 70 ? 'stable' : 'down'}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <div className="lg:col-span-2">
            {selectedPoint && (
              <WaveformChart
                data={selectedPoint.waveformSlice.slice(0, 100)}
                title="实时焊接波形监控"
              />
            )}
            {!selectedPoint && (
              <div className="h-64 bg-gray-900 rounded-lg flex items-center justify-center">
                <p className="text-gray-500">选择一个焊点查看波形数据</p>
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <QualityGauge value={currentQuality} title="焊接质量" />
            <QualityGauge value={currentStability} title="熔池稳定性" />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <div>
            <AlignmentStatus
              status={alignmentStatus}
              confidence={alignmentConfidence}
            />
          </div>
          <div>
            {selectedPoint && (
              <DefectAlert risk={selectedPoint.defectRisk} />
            )}
            {!selectedPoint && (
              <div className="p-4 bg-gray-800 rounded-lg h-full flex items-center justify-center">
                <p className="text-gray-500">选择焊点查看风险评估</p>
              </div>
            )}
          </div>
          <div>
            <SimulationControls
              isRunning={isRunning}
              weldPointCount={dbCount}
              onToggle={() => setIsRunning(!isRunning)}
              onReset={handleReset}
              onAddNormal={() => addWeldPoint(false)}
              onAddDefect={() => addWeldPoint(true)}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <WeldPointList
            points={weldPoints}
            onSelect={setSelectedPoint}
            selectedId={selectedPoint?.id}
          />
          <div className="bg-gray-800 rounded-lg p-4">
            <h3 className="font-semibold text-white mb-4">系统功能说明</h3>
            <div className="space-y-4 text-sm">
              <div className="p-3 bg-gray-900 rounded-lg">
                <h4 className="font-medium text-blue-400 mb-1">熔池数据实时对齐</h4>
                <p className="text-gray-400">
                  通过互相关算法实现机器人控制器与质控系统间的毫秒级时间同步，确保数据一致性。
                </p>
              </div>
              <div className="p-3 bg-gray-900 rounded-lg">
                <h4 className="font-medium text-green-400 mb-1">异步波动特征解析</h4>
                <p className="text-gray-400">
                  基于FFT谐波分析提取熔池波动特征，实时预测气孔、裂纹等缺陷风险。
                </p>
              </div>
              <div className="p-3 bg-gray-900 rounded-lg">
                <h4 className="font-medium text-purple-400 mb-1">IndexedDB 海量存储</h4>
                <p className="text-gray-400">
                  本地存储支持万级焊点特征波形切片，实现工业级数据持久化。
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
