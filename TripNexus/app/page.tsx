'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { Map, Route, Calendar, Database, Zap, Shield, ArrowRight, Plus, Clock, DollarSign, Gauge } from 'lucide-react';
import { PageContainer } from '@/components/layout/page-container';
import { useTripStore, useUIStore } from '@/lib/store';
import { formatDistance, formatDuration } from '@/lib/utils/helpers';

export default function HomePage() {
  const { trips, optimizationResults } = useTripStore();
  const { showToast } = useUIStore();

  const stats = [
    { label: '总行程数', value: trips.length, icon: Map, color: 'from-blue-500 to-cyan-500' },
    { label: '优化方案', value: optimizationResults.length, icon: Route, color: 'from-purple-500 to-pink-500' },
    { label: '节省距离', value: formatDistance(1256.8), icon: Zap, color: 'from-green-500 to-emerald-500' },
    { label: '节省时间', value: formatDuration(840), icon: Clock, color: 'from-orange-500 to-amber-500' },
  ];

  const features = [
    {
      icon: Route,
      title: '智能路径优化',
      description: '基于 TSP 算法，支持最近邻、遗传算法、模拟退火、蚁群算法多种优化策略',
      gradient: 'from-primary-500 to-cyan-500',
    },
    {
      icon: Calendar,
      title: '日程实时同步',
      description: '行程数据一键同步到个人日历，支持 iCal、Google Calendar、Outlook 等格式',
      gradient: 'from-purple-500 to-pink-500',
    },
    {
      icon: Database,
      title: '离线可靠存储',
      description: '基于 IndexedDB 的本地快照存储，CRDT 冲突解决，弱网环境下高度可靠',
      gradient: 'from-green-500 to-emerald-500',
    },
    {
      icon: Zap,
      title: '异步调度引擎',
      description: '多变量参数扫描，并行计算多方案对比，智能推荐最优出行方案',
      gradient: 'from-accent-500 to-orange-500',
    },
    {
      icon: Shield,
      title: '数据安全保障',
      description: '端到端加密，本地优先存储，隐私数据完全可控',
      gradient: 'from-indigo-500 to-blue-500',
    },
    {
      icon: Gauge,
      title: '多目标优化',
      description: '支持距离、时间、成本多维度均衡优化，满足不同出行需求',
      gradient: 'from-rose-500 to-red-500',
    },
  ];

  const algorithms = [
    { name: '最近邻算法', description: '快速启发式', speed: '极快', accuracy: '中等' },
    { name: '遗传算法', description: '进化优化', speed: '中等', accuracy: '良好' },
    { name: '模拟退火', description: '全局寻优', speed: '较慢', accuracy: '优秀' },
    { name: '蚁群算法', description: '群体智能', speed: '慢', accuracy: '优秀' },
  ];

  return (
    <PageContainer>
      <div className="max-w-7xl mx-auto space-y-12">
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary-600 via-primary-500 to-cyan-500 p-8 md:p-12 text-white">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48cGF0aCBkPSJNMzYgMzRjMC0yLjIgMS44LTQgNC00czQgMS44IDQgNC0xLjggNC00IDQtNC0xLjgtNC00em0tMTYgOGMwLTIuMiAxLjgtNCA0LTRzNCAxLjggNCA0LTEuOCA0LTQgNC00LTEuOC00LTR6bTAtMTZjMC0yLjIgMS44LTQgNC00czQgMS44IDQgNC0xLjggNC00IDQtNC0xLjgtNC00em0xNiAwYzAtMi4yIDEuOC00IDQtNHM0IDEuOCA0IDQtMS44IDQtNCA0LTQtMS44LTQtNHoiLz48L2c+PC9nPjwvc3ZnPg==')] opacity-50" />
          
          <div className="relative z-10 max-w-3xl">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <h1 className="text-4xl md:text-5xl font-display font-bold mb-4">
                智能多目的地
                <br />
                <span className="text-cyan-200">旅行路径规划</span>
              </h1>
              <p className="text-lg md:text-xl text-white/80 mb-8">
                基于 TSP 算法的智能路径优化引擎，支持多变量出行方案调度，
                离线快照存储，让您的每一次旅程都完美规划。
              </p>
              
              <div className="flex flex-wrap gap-4">
                <Link
                  href="/planner"
                  className="inline-flex items-center gap-2 px-8 py-4 bg-white text-primary-600 font-semibold rounded-2xl hover:shadow-xl transform hover:scale-105 transition-all duration-300"
                >
                  <Plus className="w-5 h-5" />
                  开始规划
                  <ArrowRight className="w-5 h-5" />
                </Link>
                <Link
                  href="/trips"
                  className="inline-flex items-center gap-2 px-8 py-4 bg-white/20 backdrop-blur text-white font-semibold rounded-2xl hover:bg-white/30 transition-all duration-300 border border-white/30"
                >
                  <Map className="w-5 h-5" />
                  查看行程
                </Link>
              </div>
            </motion.div>
          </div>
          
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="absolute -right-20 -bottom-20 w-80 h-80 hidden lg:block"
          >
            <div className="w-full h-full rounded-full bg-gradient-to-br from-white/20 to-transparent backdrop-blur-xl border border-white/30" />
          </motion.div>
        </section>

        <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {stats.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: index * 0.1 }}
              className="card"
            >
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center mb-4 shadow-lg`}>
                <stat.icon className="w-6 h-6 text-white" />
              </div>
              <p className="text-2xl md:text-3xl font-bold text-dark-800">{stat.value}</p>
              <p className="text-sm text-dark-500">{stat.label}</p>
            </motion.div>
          ))}
        </section>

        <section>
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl md:text-3xl font-display font-bold text-dark-800 mb-2">
                核心功能
              </h2>
              <p className="text-dark-500">全方位的旅行规划解决方案</p>
            </div>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="card group hover:-translate-y-2"
              >
                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center mb-6 shadow-lg group-hover:shadow-xl transition-shadow`}>
                  <feature.icon className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-xl font-bold text-dark-800 mb-3">{feature.title}</h3>
                <p className="text-dark-500 leading-relaxed">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </section>

        <section className="grid lg:grid-cols-2 gap-8">
          <div className="card">
            <h3 className="text-xl font-bold text-dark-800 mb-6">算法能力矩阵</h3>
            <div className="space-y-4">
              {algorithms.map((algo, index) => (
                <motion.div
                  key={algo.name}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.4, delay: index * 0.1 }}
                  className="flex items-center gap-4 p-4 rounded-xl bg-dark-50 hover:bg-primary-50 transition-colors"
                >
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary-500 to-cyan-500 flex items-center justify-center text-white font-bold">
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-dark-800">{algo.name}</p>
                    <p className="text-sm text-dark-500">{algo.description}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-primary-600">速度: {algo.speed}</p>
                    <p className="text-sm font-medium text-accent-600">精度: {algo.accuracy}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          <div className="card bg-gradient-to-br from-dark-800 to-dark-900 text-white">
            <h3 className="text-xl font-bold mb-6">优化目标对比</h3>
            <div className="space-y-6">
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-dark-300">最短距离</span>
                  <span className="font-mono">1,256 km</span>
                </div>
                <div className="h-3 bg-dark-700 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: '75%' }}
                    transition={{ duration: 1, delay: 0.3 }}
                    className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full"
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-dark-300">最短时间</span>
                  <span className="font-mono">14h 30m</span>
                </div>
                <div className="h-3 bg-dark-700 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: '65%' }}
                    transition={{ duration: 1, delay: 0.5 }}
                    className="h-full bg-gradient-to-r from-green-500 to-emerald-500 rounded-full"
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-dark-300">最低成本</span>
                  <span className="font-mono">¥1,850</span>
                </div>
                <div className="h-3 bg-dark-700 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: '55%' }}
                    transition={{ duration: 1, delay: 0.7 }}
                    className="h-full bg-gradient-to-r from-accent-500 to-orange-500 rounded-full"
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-dark-300">综合均衡</span>
                  <span className="font-mono">最优</span>
                </div>
                <div className="h-3 bg-dark-700 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: '90%' }}
                    transition={{ duration: 1, delay: 0.9 }}
                    className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="text-center py-12">
          <div className="max-w-2xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-display font-bold text-dark-800 mb-4">
              准备好开始您的完美旅程了吗？
            </h2>
            <p className="text-lg text-dark-500 mb-8">
              立即体验智能路径规划，让每一次出行都高效、省心、难忘。
            </p>
            <Link
              href="/planner"
              className="inline-flex items-center gap-2 px-10 py-5 bg-gradient-primary text-white font-semibold rounded-2xl hover:shadow-glow-lg transform hover:scale-105 transition-all duration-300 text-lg"
            >
              <Route className="w-6 h-6" />
              立即开始规划
              <ArrowRight className="w-6 h-6" />
            </Link>
          </div>
        </section>
      </div>
    </PageContainer>
  );
}
