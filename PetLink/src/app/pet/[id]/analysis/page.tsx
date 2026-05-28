'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Sidebar from '@/components/Sidebar';
import { usePetLinkStore } from '@/lib/store';
import { gaitDetector } from '@/lib/gaitAnalysis';
import {
  Activity,
  TrendingUp,
  AlertTriangle,
  Zap,
  Target,
  Clock,
  ChevronRight,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts';

export default function AnalysisPage({ params }: { params: { id: string } }) {
  const { loadMockData, gaitData, selectedPet, anomalies } = usePetLinkStore();
  const [trend, setTrend] = useState<{ trend: string; change: number } | null>(null);

  useEffect(() => {
    loadMockData();
  }, [loadMockData]);

  useEffect(() => {
    if (gaitData.length > 0) {
      const result = gaitDetector.detectTrend(gaitData);
      setTrend(result);
    }
  }, [gaitData]);

  if (!selectedPet) return null;

  const gaitChartData = gaitData.map((item, index) => ({
    day: `Day ${index + 1}`,
    steps: item.stepCount,
    symmetry: item.symmetryScore,
    cadence: item.cadence,
  }));

  const latestGait = gaitData[gaitData.length - 1];
  const gaitAnomalies = anomalies.filter((a) => a.type === 'gait');

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high':
        return 'text-red-600 bg-red-50';
      case 'medium':
        return 'text-orange-600 bg-orange-50';
      default:
        return 'text-yellow-600 bg-yellow-50';
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      <main className="flex-1 p-8 overflow-auto">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <h1 className="font-poppins text-3xl font-bold text-slate-800">
              步态行为分析
            </h1>
            <p className="text-slate-500 mt-1">
              AI 步态异常检测与健康趋势分析
            </p>
          </motion.div>

          <div className="grid grid-cols-4 gap-6 mb-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="card p-6"
            >
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 bg-primary-50 rounded-xl flex items-center justify-center">
                  <Activity className="w-6 h-6 text-primary-600" />
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  trend?.trend === 'improving' ? 'bg-green-100 text-green-700' :
                  trend?.trend === 'declining' ? 'bg-red-100 text-red-700' :
                  'bg-slate-100 text-slate-700'
                }`}>
                  {trend?.trend === 'improving' ? '↑ 改善' :
                   trend?.trend === 'declining' ? '↓ 下降' : '→ 稳定'}
                </span>
              </div>
              <div className="mt-4">
                <p className="text-3xl font-poppins font-bold text-slate-800">
                  {latestGait?.stepCount.toLocaleString() || 0}
                </p>
                <p className="text-sm text-slate-500">今日步数</p>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="card p-6"
            >
              <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center">
                <Target className="w-6 h-6 text-indigo-600" />
              </div>
              <div className="mt-4">
                <p className="text-3xl font-poppins font-bold text-slate-800">
                  {latestGait?.symmetryScore.toFixed(1) || 0}%
                </p>
                <p className="text-sm text-slate-500">步态对称性</p>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="card p-6"
            >
              <div className="w-12 h-12 bg-purple-50 rounded-xl flex items-center justify-center">
                <Zap className="w-6 h-6 text-purple-600" />
              </div>
              <div className="mt-4">
                <p className="text-3xl font-poppins font-bold text-slate-800">
                  {Math.round(latestGait?.cadence || 0)}
                </p>
                <p className="text-sm text-slate-500">步频 (步/分)</p>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="card p-6"
            >
              <div className="w-12 h-12 bg-red-50 rounded-xl flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <div className="mt-4">
                <p className="text-3xl font-poppins font-bold text-slate-800">
                  {gaitAnomalies.filter((a) => !a.acknowledged).length}
                </p>
                <p className="text-sm text-slate-500">待处理异常</p>
              </div>
            </motion.div>
          </div>

          <div className="grid grid-cols-2 gap-6 mb-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="card p-6"
            >
              <h2 className="font-poppins font-semibold text-slate-800 mb-6">
                步数趋势
              </h2>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={gaitChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                    <XAxis dataKey="day" tick={{ fill: '#94A3B8', fontSize: 11 }} />
                    <YAxis tick={{ fill: '#94A3B8', fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="steps" fill="#14B8A6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="card p-6"
            >
              <h2 className="font-poppins font-semibold text-slate-800 mb-6">
                步态对称性趋势
              </h2>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={gaitChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                    <XAxis dataKey="day" tick={{ fill: '#94A3B8', fontSize: 11 }} />
                    <YAxis domain={[70, 100]} tick={{ fill: '#94A3B8', fontSize: 11 }} />
                    <Tooltip />
                    <Line
                      type="monotone"
                      dataKey="symmetry"
                      stroke="#6366F1"
                      strokeWidth={2}
                      dot={{ fill: '#6366F1', r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="card p-6"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-poppins font-semibold text-slate-800">
                AI 步态分析记录
              </h2>
              <span className="text-sm text-slate-500">
                基于 DTW 动态时间规整算法
              </span>
            </div>
            <div className="space-y-4">
              {gaitAnomalies.map((anomaly) => (
                <div
                  key={anomaly.id}
                  className="flex items-center justify-between p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${getSeverityColor(anomaly.severity)}`}>
                      <AlertTriangle className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-medium text-slate-800">{anomaly.description}</p>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="flex items-center gap-1 text-xs text-slate-500">
                          <Clock className="w-3 h-3" />
                          {new Date(anomaly.timestamp).toLocaleDateString('zh-CN')}
                        </span>
                        <span className="text-xs text-slate-500">
                          置信度: {Math.round(anomaly.confidence * 100)}%
                        </span>
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-400" />
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </main>
    </div>
  );
}
