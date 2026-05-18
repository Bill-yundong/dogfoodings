'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Activity, TrendingUp, Cpu, Gauge, Clock, AlertTriangle, CheckCircle } from 'lucide-react';
import { StatCard } from '@/components/StatCard';
import { PowerSpectrumChart } from '@/components/PowerSpectrumChart';
import { useAppStore } from '@/store';
import { generatePowerSpectrumData, generateRealtimePowerSpectrumPoint } from '@/lib/mock';
import { extractPowerSpectrumFeatures } from '@/lib/fractal';
import { predictRoughness } from '@/lib/prediction';

export default function Dashboard() {
  const {
    realtimeData,
    currentParams,
    latestPrediction,
    addRealtimeData,
    setLatestPrediction,
    systemConfig,
  } = useAppStore();

  const [isLive, setIsLive] = useState(true);
  const [dataIndex, setDataIndex] = useState(0);

  useEffect(() => {
    const initialData = generatePowerSpectrumData(5, 200);
    addRealtimeData(initialData);
    setDataIndex(initialData.length);

    const { fractal, statistical } = extractPowerSpectrumFeatures(initialData);
    const prediction = predictRoughness(fractal, statistical, currentParams);
    setLatestPrediction(prediction);
  }, [addRealtimeData, currentParams, setLatestPrediction]);

  useEffect(() => {
    if (!isLive) return;

    const interval = setInterval(() => {
      const newPoints: any[] = [];
      for (let i = 0; i < 10; i++) {
        newPoints.push(generateRealtimePowerSpectrumPoint(Date.now(), dataIndex + i));
      }
      addRealtimeData(newPoints);
      setDataIndex((prev) => prev + 10);

      if (dataIndex > 0 && dataIndex % 100 === 0) {
        const currentData = useAppStore.getState().realtimeData.slice(-500);
        const { fractal, statistical } = extractPowerSpectrumFeatures(currentData);
        const prediction = predictRoughness(fractal, statistical, currentParams);
        setLatestPrediction(prediction);
      }
    }, 500);

    return () => clearInterval(interval);
  }, [isLive, dataIndex, addRealtimeData, currentParams, setLatestPrediction]);

  const stats = [
    {
      title: '预测表面粗糙度 Ra',
      value: latestPrediction?.predictedRa.toFixed(3) || '--',
      unit: 'μm',
      icon: Gauge,
      trend: { value: -12.5, isPositive: true },
      status: latestPrediction && latestPrediction.predictedRa < 1.2 ? 'normal' : latestPrediction && latestPrediction.predictedRa < 1.6 ? 'warning' : 'critical' as any,
    },
    {
      title: '加工进给速度',
      value: currentParams.feedRate,
      unit: 'mm/min',
      icon: TrendingUp,
      trend: { value: 0, isPositive: true },
    },
    {
      title: '主轴转速',
      value: currentParams.spindleSpeed,
      unit: 'rpm',
      icon: Cpu,
      trend: { value: 0, isPositive: true },
    },
    {
      title: '系统运行时间',
      value: '126',
      unit: '小时',
      icon: Clock,
      trend: { value: 8.3, isPositive: true },
    },
  ];

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-2xl font-bold text-white font-display">实时监控面板</h1>
          <p className="text-dark-400 mt-1">精密磨削过程功率谱数据实时监控与分析</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsLive(!isLive)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
              isLive
                ? 'bg-accent-500/20 text-accent-400 border border-accent-500/30'
                : 'bg-dark-700 text-dark-300 border border-dark-600'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${isLive ? 'bg-accent-400 animate-pulse' : 'bg-dark-500'}`} />
            {isLive ? '实时采集中' : '已暂停'}
          </button>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <StatCard key={stat.title} {...stat} delay={i * 0.1} />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="lg:col-span-2 glass-card p-5"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Activity className="w-5 h-5 text-primary-400" />
              <h2 className="text-lg font-semibold text-white">实时功率谱密度</h2>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-dark-400">数据点:</span>
              <span className="text-accent-400 font-mono">{realtimeData.length}</span>
            </div>
          </div>
          <PowerSpectrumChart data={realtimeData} height={350} />
        </motion.div>

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="space-y-4"
        >
          <div className="glass-card p-5">
            <h3 className="text-sm font-semibold text-white mb-4">加工状态概览</h3>
            <div className="space-y-3">
              {[
                { label: '当前零件', value: useAppStore.getState().currentPart, icon: Cpu },
                { label: '当前批次', value: useAppStore.getState().currentBatch, icon: Activity },
                { label: '加工状态', value: '进行中', icon: CheckCircle, color: 'text-accent-400' },
                { label: '预测置信度', value: latestPrediction ? `${(latestPrediction.confidence * 100).toFixed(1)}%` : '--', icon: Gauge },
              ].map((item, i) => (
                <div key={item.label} className="flex items-center justify-between p-2 rounded-lg hover:bg-dark-700/30 transition-colors">
                  <div className="flex items-center gap-2">
                    <item.icon className="w-4 h-4 text-dark-400" />
                    <span className="text-sm text-dark-300">{item.label}</span>
                  </div>
                  <span className={`text-sm font-medium ${item.color || 'text-white'}`}>{item.value}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="glass-card p-5">
            <h3 className="text-sm font-semibold text-white mb-4">质量指标</h3>
            <div className="space-y-4">
              {[
                { label: '表面粗糙度 Ra', value: latestPrediction?.predictedRa || 0, max: 1.6, unit: 'μm' },
                { label: '表面粗糙度 Rz', value: latestPrediction?.predictedRz || 0, max: 6.3, unit: 'μm' },
                { label: '加工效率', value: 78, max: 100, unit: '%' },
              ].map((metric, i) => (
                <div key={metric.label}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-dark-400">{metric.label}</span>
                    <span className="text-white font-medium">
                      {metric.value.toFixed(typeof metric.value === 'number' && metric.value < 10 ? 3 : 0)} {metric.unit}
                    </span>
                  </div>
                  <div className="h-2 bg-dark-700 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min((metric.value / metric.max) * 100, 100)}%` }}
                      transition={{ delay: 0.7 + i * 0.1, duration: 1, ease: 'easeOut' }}
                      className={`h-full rounded-full ${
                        metric.value / metric.max > 0.9
                          ? 'bg-warning-500'
                          : metric.value / metric.max > 0.7
                          ? 'bg-primary-500'
                          : 'bg-accent-500'
                      }`}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>

      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.7 }}
        className="glass-card p-5"
      >
        <h3 className="text-sm font-semibold text-white mb-4">最近预测记录</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-xs text-dark-400 border-b border-dark-700">
                <th className="pb-3 font-medium">时间</th>
                <th className="pb-3 font-medium">零件编号</th>
                <th className="pb-3 font-medium">预测 Ra</th>
                <th className="pb-3 font-medium">实测 Ra</th>
                <th className="pb-3 font-medium">准确率</th>
                <th className="pb-3 font-medium">状态</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {[
                { time: '14:32:15', part: 'PART-1000', predicted: 0.421, actual: 0.438, accuracy: 96.1 },
                { time: '13:28:42', part: 'PART-0999', predicted: 0.652, actual: 0.671, accuracy: 97.2 },
                { time: '12:15:08', part: 'PART-0998', predicted: 0.518, actual: 0.492, accuracy: 95.0 },
                { time: '11:02:33', part: 'PART-0997', predicted: 0.834, actual: 0.886, accuracy: 94.1 },
                { time: '10:45:21', part: 'PART-0996', predicted: 0.387, actual: 0.379, accuracy: 97.9 },
              ].map((item, i) => (
                <tr key={i} className="border-b border-dark-700/50 hover:bg-dark-700/20 transition-colors">
                  <td className="py-3 text-dark-300">{item.time}</td>
                  <td className="py-3 text-white font-mono">{item.part}</td>
                  <td className="py-3 text-primary-400">{item.predicted.toFixed(3)} μm</td>
                  <td className="py-3 text-accent-400">{item.actual.toFixed(3)} μm</td>
                  <td className="py-3">
                    <span className={item.accuracy > 95 ? 'text-accent-400' : item.accuracy > 85 ? 'text-primary-400' : 'text-warning-400'}>
                      {item.accuracy.toFixed(1)}%
                    </span>
                  </td>
                  <td className="py-3">
                    <span className={`badge ${item.predicted < 1.2 ? 'badge-pass' : item.predicted < 1.6 ? 'badge-pending' : 'badge-fail'}`}>
                      {item.predicted < 1.2 ? '合格' : item.predicted < 1.6 ? '待验证' : '告警'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
}
