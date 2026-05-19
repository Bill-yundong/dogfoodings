import { useEffect, useState } from 'react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { Zap, Sun, TrendingUp, Thermometer, Activity, DollarSign } from 'lucide-react';
import { motion } from 'framer-motion';
import { StatCard } from '@/components/dashboard/StatCard';
import { useMonitorStore } from '@/store/useMonitorStore';
import { useSimulationStore } from '@/store/useSimulationStore';
import { initDB, powerGenerationDB } from '@/utils/db';
import { calculateRegionStatistics } from '@/utils/mppt';

const COLORS = ['#64FFDA', '#FF6B35', '#FFD93D', '#4ECDC4', '#45B7D1'];

export default function Monitoring() {
  const {
    currentPower,
    averageEfficiency,
    peakPowerToday,
    powerHistory,
    efficiencyHistory,
    lossBreakdown,
    updateFromGenerations,
  } = useMonitorStore();
  
  const { panels, powerGenerations } = useSimulationStore();
  const [selectedPeriod, setSelectedPeriod] = useState<'day' | 'week' | 'month'>('day');
  
  useEffect(() => {
    const loadData = async () => {
      await initDB();
    };
    
    loadData();
  }, []);
  
  useEffect(() => {
    if (powerGenerations.length > 0) {
      updateFromGenerations(powerGenerations);
    }
  }, [powerGenerations, updateFromGenerations]);
  
  const regionStats = calculateRegionStatistics(powerGenerations);
  
  const pieData = [
    { name: '阴影损耗', value: lossBreakdown.shadowLoss, color: '#FF6B35' },
    { name: '温度损耗', value: lossBreakdown.temperatureLoss, color: '#FFD93D' },
    { name: 'MPPT损耗', value: lossBreakdown.mpptLoss, color: '#45B7D1' },
    { name: '其他损耗', value: lossBreakdown.otherLoss, color: '#95A5A6' },
  ];
  
  const totalLoss = lossBreakdown.shadowLoss + lossBreakdown.temperatureLoss + lossBreakdown.mpptLoss + lossBreakdown.otherLoss;
  
  const efficiencyData = efficiencyHistory.slice(-24).map((item) => ({
    name: item.time,
    效率: item.value,
  }));
  
  return (
    <div className="h-full overflow-auto p-6">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="max-w-7xl mx-auto"
      >
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">能效监控</h1>
          <p className="text-slate-400">实时监控光伏发电效率与损耗分析</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard
            title="当前功率"
            value={`${(currentPower / 1000).toFixed(2)} kW`}
            subtitle={`${panels.length} 块光伏板运行中`}
            icon={Zap}
            color="emerald"
            trend={{ value: 5.2, isPositive: true }}
          />
          <StatCard
            title="发电效率"
            value={`${averageEfficiency.toFixed(1)}%`}
            subtitle="系统平均转换效率"
            icon={Sun}
            color="cyan"
            trend={{ value: 2.1, isPositive: true }}
          />
          <StatCard
            title="今日峰值"
            value={`${(peakPowerToday / 1000).toFixed(2)} kW`}
            subtitle="今日最高发电功率"
            icon={TrendingUp}
            color="yellow"
          />
          <StatCard
            title="预计收益"
            value={`¥${(currentPower / 1000 * 24 * 0.6).toFixed(0)}`}
            subtitle="按当前功率估算日收益"
            icon={DollarSign}
            color="orange"
          />
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="lg:col-span-2 bg-slate-900/50 backdrop-blur-md rounded-2xl border border-slate-700/50 p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">功率趋势</h2>
              <div className="flex gap-2">
                {(['day', 'week', 'month'] as const).map((period) => (
                  <button
                    key={period}
                    onClick={() => setSelectedPeriod(period)}
                    className={`px-3 py-1 rounded-lg text-sm transition-all ${
                      selectedPeriod === period
                        ? 'bg-cyan-500 text-white'
                        : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                    }`}
                  >
                    {period === 'day' ? '日' : period === 'week' ? '周' : '月'}
                  </button>
                ))}
              </div>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={powerHistory.slice(-24)}>
                  <defs>
                    <linearGradient id="powerGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#64FFDA" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#64FFDA" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="time" stroke="#64748b" fontSize={12} />
                  <YAxis stroke="#64748b" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      border: '1px solid #334155',
                      borderRadius: '8px',
                      color: '#fff',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="#64FFDA"
                    strokeWidth={2}
                    fill="url(#powerGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-slate-900/50 backdrop-blur-md rounded-2xl border border-slate-700/50 p-6"
          >
            <h2 className="text-lg font-semibold text-white mb-4">损耗分布</h2>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      border: '1px solid #334155',
                      borderRadius: '8px',
                      color: '#fff',
                    }}
                    formatter={(value: number) => [`${(value / 1000).toFixed(2)} kW`, '损耗']}
                  />
                  <Legend
                    formatter={(value) => <span className="text-slate-300 text-sm">{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-2 text-center">
              <p className="text-sm text-slate-400">
                总损耗: <span className="text-red-400 font-mono">{(totalLoss / 1000).toFixed(2)} kW</span>
              </p>
            </div>
          </motion.div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-slate-900/50 backdrop-blur-md rounded-2xl border border-slate-700/50 p-6"
          >
            <h2 className="text-lg font-semibold text-white mb-4">效率趋势</h2>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={efficiencyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="name" stroke="#64748b" fontSize={12} />
                  <YAxis stroke="#64748b" fontSize={12} domain={[0, 100]} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      border: '1px solid #334155',
                      borderRadius: '8px',
                      color: '#fff',
                    }}
                    formatter={(value: number) => [`${value.toFixed(1)}%`, '效率']}
                  />
                  <Line
                    type="monotone"
                    dataKey="效率"
                    stroke="#4ECDC4"
                    strokeWidth={2}
                    dot={{ fill: '#4ECDC4', r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-slate-900/50 backdrop-blur-md rounded-2xl border border-slate-700/50 p-6"
          >
            <h2 className="text-lg font-semibold text-white mb-4">区域统计</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-xl">
                <span className="text-slate-400">运行面板数</span>
                <span className="text-white font-mono">{regionStats.totalPanels}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-xl">
                <span className="text-slate-400">理论总理论功率</span>
                <span className="text-white font-mono">{(regionStats.totalTheoreticalPower / 1000).toFixed(2)} kW</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-xl">
                <span className="text-slate-400">实际输出功率</span>
                <span className="text-emerald-400 font-mono">{(regionStats.totalActualPower / 1000).toFixed(2)} kW</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-xl">
                <span className="text-slate-400">平均效率</span>
                <span className="text-cyan-400 font-mono">{(regionStats.averageEfficiency * 100).toFixed(1)}%</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-xl">
                <span className="text-slate-400">总损耗率</span>
                <span className="text-red-400 font-mono">{(regionStats.totalLossRate * 100).toFixed(1)}%</span>
              </div>
            </div>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}
