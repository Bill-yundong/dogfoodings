'use client';

import { useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Heart,
  Thermometer,
  Activity,
  Wind,
  TrendingUp,
  Bell,
} from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import HealthScoreRing from '@/components/HealthScoreRing';
import VitalCard from '@/components/VitalCard';
import VitalsChart from '@/components/VitalsChart';
import AnomalyAlert from '@/components/AnomalyAlert';
import { usePetLinkStore } from '@/lib/store';

export default function DashboardPage() {
  const { loadMockData, healthScore, vitalSigns, anomalies, isLoading, selectedPet } =
    usePetLinkStore();

  useEffect(() => {
    loadMockData();
  }, [loadMockData]);

  const latestVitals = vitalSigns[vitalSigns.length - 1];

  if (isLoading || !selectedPet || !healthScore) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full" />
      </div>
    );
  }

  const unacknowledgedAnomalies = anomalies.filter((a) => !a.acknowledged);

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      <main className="flex-1 p-8 overflow-auto">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-between mb-8"
          >
            <div>
              <h1 className="font-poppins text-3xl font-bold text-slate-800">
                欢迎回来 👋
              </h1>
              <p className="text-slate-500 mt-1">
                这是 {selectedPet.name} 的健康概览
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="relative">
                <button className="p-3 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 transition-colors">
                  <Bell className="w-5 h-5 text-slate-600" />
                </button>
                {unacknowledgedAnomalies.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                    {unacknowledgedAnomalies.length}
                  </span>
                )}
              </div>
            </div>
          </motion.div>

          <div className="grid grid-cols-12 gap-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="col-span-4"
            >
              <div className="card p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-poppins font-semibold text-slate-800">
                    健康评分
                  </h2>
                  <div className="flex items-center gap-1 text-sm text-green-600">
                    <TrendingUp className="w-4 h-4" />
                    <span>+2.3%</span>
                  </div>
                </div>
                <div className="flex justify-center">
                  <HealthScoreRing score={healthScore.overall} />
                </div>
                <div className="grid grid-cols-3 gap-4 mt-6">
                  <div className="text-center">
                    <p className="text-lg font-poppins font-bold text-slate-800">
                      {Math.round(healthScore.vitality)}
                    </p>
                    <p className="text-xs text-slate-500">活力</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-poppins font-bold text-slate-800">
                      {Math.round(healthScore.mobility)}
                    </p>
                    <p className="text-xs text-slate-500">行动力</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-poppins font-bold text-slate-800">
                      {healthScore.behavior}
                    </p>
                    <p className="text-xs text-slate-500">行为</p>
                  </div>
                </div>
              </div>
            </motion.div>

            <div className="col-span-8">
              <div className="grid grid-cols-2 gap-6 mb-6">
                <VitalCard
                  icon={Heart}
                  label="心率"
                  value={Math.round(latestVitals?.heartRate || 0)}
                  unit="bpm"
                  trend="stable"
                  color="text-primary-600"
                  bgColor="bg-primary-50"
                />
                <VitalCard
                  icon={Thermometer}
                  label="体温"
                  value={(latestVitals?.temperature || 0).toFixed(1)}
                  unit="°C"
                  trend="stable"
                  color="text-accent-600"
                  bgColor="bg-accent-50"
                />
                <VitalCard
                  icon={Wind}
                  label="呼吸频率"
                  value={Math.round(latestVitals?.respiratoryRate || 0)}
                  unit="次/分"
                  trend="stable"
                  color="text-indigo-600"
                  bgColor="bg-indigo-50"
                />
                <VitalCard
                  icon={Activity}
                  label="活动量"
                  value={Math.round(latestVitals?.activityLevel || 0)}
                  unit="%"
                  trend="up"
                  color="text-purple-600"
                  bgColor="bg-purple-50"
                />
              </div>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="col-span-8"
            >
              <div className="card p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="font-poppins font-semibold text-slate-800">
                    24小时心率趋势
                  </h2>
                  <select className="px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-600 bg-white">
                    <option>最近24小时</option>
                    <option>最近7天</option>
                    <option>最近30天</option>
                  </select>
                </div>
                <VitalsChart data={vitalSigns} type="heartRate" />
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="col-span-4"
            >
              <div className="card p-6 h-full">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-poppins font-semibold text-slate-800">
                    异常预警
                  </h2>
                  {unacknowledgedAnomalies.length > 0 && (
                    <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-medium rounded-full">
                      {unacknowledgedAnomalies.length} 条新预警
                    </span>
                  )}
                </div>
                <div className="space-y-3 max-h-80 overflow-auto">
                  {anomalies.slice(0, 5).map((anomaly) => (
                    <AnomalyAlert key={anomaly.id} anomaly={anomaly} />
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </main>
    </div>
  );
}
