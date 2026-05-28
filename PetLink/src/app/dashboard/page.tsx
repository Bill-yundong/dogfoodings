'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Heart,
  Thermometer,
  Activity,
  Wind,
  TrendingUp,
  Bell,
  Check,
  CheckCheck,
} from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import HealthScoreRing from '@/components/HealthScoreRing';
import VitalCard from '@/components/VitalCard';
import VitalsChart from '@/components/VitalsChart';
import AnomalyAlert from '@/components/AnomalyAlert';
import Modal from '@/components/Modal';
import { usePetLinkStore } from '@/lib/store';

export default function DashboardPage() {
  const { loadMockData, healthScore, vitalSigns, anomalies, isLoading, selectedPet, acknowledgeAnomaly } =
    usePetLinkStore();
  const [showNotifications, setShowNotifications] = useState(false);

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
                <button
                  onClick={() => setShowNotifications(true)}
                  className="p-3 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 transition-colors"
                >
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

      <Modal
        isOpen={showNotifications}
        onClose={() => setShowNotifications(false)}
        title="通知中心"
        maxWidth="max-w-xl"
      >
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm text-slate-500">
            {unacknowledgedAnomalies.length} 条未读预警
          </span>
          {unacknowledgedAnomalies.length > 0 && (
            <button
              onClick={() => {
                anomalies.forEach((a) => {
                  if (!a.acknowledged) acknowledgeAnomaly(a.id);
                });
              }}
              className="flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700 font-medium"
            >
              <CheckCheck className="w-4 h-4" />
              全部已读
            </button>
          )}
        </div>
        <div className="space-y-3 max-h-96 overflow-auto">
          {anomalies.length === 0 ? (
            <div className="text-center py-8">
              <Bell className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-slate-500">暂无通知</p>
            </div>
          ) : (
            anomalies.map((anomaly) => (
              <div
                key={anomaly.id}
                className={`p-4 rounded-xl border ${
                  anomaly.acknowledged
                    ? 'bg-slate-50 border-slate-100 opacity-60'
                    : anomaly.severity === 'high'
                    ? 'bg-red-50 border-red-200'
                    : anomaly.severity === 'medium'
                    ? 'bg-orange-50 border-orange-200'
                    : 'bg-yellow-50 border-yellow-200'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        anomaly.severity === 'high' ? 'bg-red-100 text-red-700' :
                        anomaly.severity === 'medium' ? 'bg-orange-100 text-orange-700' :
                        'bg-yellow-100 text-yellow-700'
                      }`}>
                        {anomaly.severity === 'high' ? '高风险' : anomaly.severity === 'medium' ? '中风险' : '低风险'}
                      </span>
                      <span className="text-xs text-slate-400">
                        {anomaly.type === 'gait' ? '步态异常' : anomaly.type === 'vital' ? '生理指标' : '行为异常'}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-slate-700">{anomaly.description}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {new Date(anomaly.timestamp).toLocaleString('zh-CN')}
                    </p>
                  </div>
                  {!anomaly.acknowledged && (
                    <button
                      onClick={() => acknowledgeAnomaly(anomaly.id)}
                      className="p-1.5 rounded-lg hover:bg-white/60 transition-colors text-slate-500 hover:text-primary-600"
                      title="标记已读"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </Modal>
    </div>
  );
}
