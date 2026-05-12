'use client';

import { useEffect, useState } from 'react';
import { StatusSummary } from '@/components/StatusSummary';
import { RiskCard } from '@/components/RiskCard';
import { CurrentChart } from '@/components/CurrentChart';
import { SyncLog } from '@/components/SyncLog';
import { MaintenanceTaskList } from '@/components/MaintenanceTaskList';
import { db, ensureDatabaseInitialized } from '@/lib/database';
import { FrequencyAnalyzer, createLeakageCurrentData } from '@/lib/frequencyAnalysis';
import { FlashoverPredictor, createMockEnvironmentalData } from '@/lib/flashoverPrediction';
import { semanticSynchronizer } from '@/lib/semanticSync';
import { Insulator, HealthRecord, SemanticSyncMessage, MaintenanceTask } from '@/types';

export default function Dashboard() {
  const [riskSummary, setRiskSummary] = useState({ total: 0, critical: 0, high: 0, medium: 0, low: 0 });
  const [highRiskInsulators, setHighRiskInsulators] = useState<Array<{ insulator: Insulator; record: HealthRecord }>>([]);
  const [syncMessages, setSyncMessages] = useState<SemanticSyncMessage[]>([]);
  const [maintenanceTasks, setMaintenanceTasks] = useState<MaintenanceTask[]>([]);
  const [currentData, setCurrentData] = useState<Array<{ time: string; value: number; harmonic: number }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      await ensureDatabaseInitialized();
      await loadData();
      
      const pollingInterval = semanticSynchronizer.startPolling(5000);
      
      const dataInterval = setInterval(() => {
        generatePredictionData();
      }, 10000);

      return () => {
        clearInterval(pollingInterval);
        clearInterval(dataInterval);
      };
    };

    init();
  }, []);

  const loadData = async () => {
    try {
      const summary = await db.getRiskSummary();
      setRiskSummary(summary);

      const allInsulators = await db.getAllInsulators();
      const highRisk = allInsulators.filter(i => i.status === 'critical' || i.status === 'warning').slice(0, 6);
      
      const recordsPromises = highRisk.map(async (insulator) => {
        const records = await db.getHealthRecordsByInsulator(insulator.id, 1);
        if (records.length > 0) {
          return { insulator, record: records[0] };
        }
        return null;
      });
      
      const records = (await Promise.all(recordsPromises)).filter(Boolean) as Array<{ insulator: Insulator; record: HealthRecord }>;
      setHighRiskInsulators(records);

      const messages = await db.getPendingSyncMessages();
      setSyncMessages(messages.slice(0, 10));

      const tasks = await db.getPendingMaintenanceTasks();
      setMaintenanceTasks(tasks);

      generateMockChartData();
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const generatePredictionData = async () => {
    try {
      const insulators = await db.getAllInsulators();
      const randomInsulator = insulators[Math.floor(Math.random() * insulators.length)];
      
      const analyzer = new FrequencyAnalyzer();
      const predictor = new FlashoverPredictor();

      const leakageData = createLeakageCurrentData(randomInsulator.id);
      const features = await analyzer.analyzeAsync(leakageData);
      const environmentalData = createMockEnvironmentalData();
      const prediction = await predictor.predictAsync(features, environmentalData);

      const healthRecord: HealthRecord = {
        id: `hr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        insulatorId: randomInsulator.id,
        timestamp: Date.now(),
        features,
        prediction,
        environmentalData,
        maintenanceRecommendation: predictor.generateMaintenanceRecommendation(prediction)
      };

      await semanticSynchronizer.sendPrediction('maintenance', 'dispatch', healthRecord);
      await loadData();
    } catch (error) {
      console.error('Error generating prediction:', error);
    }
  };

  const generateMockChartData = () => {
    const data: Array<{ time: string; value: number; harmonic: number }> = [];
    for (let i = 0; i < 50; i++) {
      const t = i / 50;
      data.push({
        time: `${(t * 100).toFixed(0)}ms`,
        value: Math.sin(2 * Math.PI * 50 * t) + 0.3 * Math.sin(2 * Math.PI * 150 * t),
        harmonic: 0.3 * Math.sin(2 * Math.PI * 150 * t)
      });
    }
    setCurrentData(data);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl">加载中...</div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">监控面板</h1>
        <p className="text-gray-600">实时监控特高压绝缘子污闪风险状态</p>
      </div>

      <div className="mb-6">
        <StatusSummary {...riskSummary} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="text-lg font-semibold mb-4">高风险设备预警</h3>
            {highRiskInsulators.length === 0 ? (
              <div className="text-center py-8 text-gray-500">暂无高风险设备</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {highRiskInsulators.map(({ insulator, record }) => (
                  <RiskCard
                    key={insulator.id}
                    insulatorName={insulator.name}
                    prediction={record.prediction}
                  />
                ))}
              </div>
            )}
          </div>

          <CurrentChart data={currentData} />
        </div>

        <div className="space-y-6">
          <MaintenanceTaskList tasks={maintenanceTasks} />
          <SyncLog messages={syncMessages} />
          
          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="text-lg font-semibold mb-4">系统状态</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">数据库连接</span>
                <span className="flex items-center text-success-600">
                  <span className="w-2 h-2 rounded-full bg-success-500 mr-2"></span>
                  正常
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">数据采集</span>
                <span className="flex items-center text-success-600">
                  <span className="w-2 h-2 rounded-full bg-success-500 mr-2"></span>
                  运行中
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">预测模型</span>
                <span className="flex items-center text-success-600">
                  <span className="w-2 h-2 rounded-full bg-success-500 mr-2"></span>
                  已加载
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">系统同步</span>
                <span className="flex items-center text-success-600">
                  <span className="w-2 h-2 rounded-full bg-success-500 mr-2"></span>
                  已连接
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}