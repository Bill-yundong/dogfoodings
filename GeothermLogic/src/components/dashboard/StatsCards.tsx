'use client';

import { motion } from 'framer-motion';
import { Database, Thermometer, Gauge, AlertTriangle } from 'lucide-react';
import { useAppStore } from '@/store/use-app-store';

export default function StatsCards() {
  const { systemStats } = useAppStore();

  const stats = [
    {
      title: '总换热孔数',
      value: systemStats.totalBoreholes.toLocaleString(),
      subValue: `活跃 ${systemStats.activeBoreholes.toLocaleString()}`,
      icon: Database,
      color: 'text-primary-500',
      bgGradient: 'from-primary-900/30 to-primary-800/10',
      borderColor: 'border-primary-800/30',
    },
    {
      title: '平均地温',
      value: `${systemStats.avgGroundTemp.toFixed(1)}°C`,
      subValue: '土壤浅层温度',
      icon: Thermometer,
      color: 'text-accent-500',
      bgGradient: 'from-accent-900/30 to-accent-800/10',
      borderColor: 'border-accent-800/30',
    },
    {
      title: '热平衡状态',
      value: systemStats.thermalBalanceStatus === 'stable' ? '稳定' : systemStats.thermalBalanceStatus === 'warning' ? '警告' : '危险',
      subValue: '系统运行状态',
      icon: Gauge,
      color: systemStats.thermalBalanceStatus === 'stable' ? 'text-green-500' : systemStats.thermalBalanceStatus === 'warning' ? 'text-yellow-500' : 'text-red-500',
      bgGradient: 'from-gray-800/50 to-gray-700/10',
      borderColor: 'border-gray-700/30',
    },
    {
      title: '透支风险',
      value: systemStats.overdrawRisk === 'low' ? '低' : systemStats.overdrawRisk === 'medium' ? '中' : '高',
      subValue: '土壤热透支预测',
      icon: AlertTriangle,
      color: systemStats.overdrawRisk === 'low' ? 'text-green-500' : systemStats.overdrawRisk === 'medium' ? 'text-yellow-500' : 'text-red-500',
      bgGradient: 'from-gray-800/50 to-gray-700/10',
      borderColor: 'border-gray-700/30',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {stats.map((stat, index) => (
        <motion.div
          key={stat.title}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
          className={`bg-gradient-to-br ${stat.bgGradient} rounded-xl border ${stat.borderColor} p-6 hover:shadow-lg hover:shadow-black/20 transition-all duration-300`}
        >
          <div className="flex items-start justify-between mb-4">
            <stat.icon className={`w-8 h-8 ${stat.color}`} />
            <span className="text-xs text-gray-500">实时</span>
          </div>
          <p className="text-3xl font-bold text-white mb-1">{stat.value}</p>
          <p className="text-sm text-gray-400">{stat.title}</p>
          <p className="text-xs text-gray-500 mt-2">{stat.subValue}</p>
        </motion.div>
      ))}
    </div>
  );
}
