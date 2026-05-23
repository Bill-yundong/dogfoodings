'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useMutation } from '@tanstack/react-query';
import {
  Zap, Clock, CheckCircle2, XCircle, PauseCircle,
  Play, Trash2, RefreshCw, BarChart3, Settings,
  ArrowUpRight, ArrowDownRight, Minus, Plus
} from 'lucide-react';
import { PageContainer } from '@/components/layout/page-container';
import { useSchedulerStore, useTripStore, useUIStore } from '@/lib/store';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import type { AlgorithmType, OptimizationGoal } from '@/lib/tsp/types';
import type { TransportMode } from '@/lib/types';

const statusColors = {
  queued: 'bg-gray-100 text-gray-600',
  running: 'bg-blue-100 text-blue-600',
  completed: 'bg-green-100 text-green-600',
  failed: 'bg-red-100 text-red-600',
  cancelled: 'bg-yellow-100 text-yellow-600',
  paused: 'bg-purple-100 text-purple-600',
};

const statusIcons = {
  queued: Clock,
  running: Zap,
  completed: CheckCircle2,
  failed: XCircle,
  cancelled: PauseCircle,
  paused: PauseCircle,
};

const statusLabels = {
  queued: '排队中',
  running: '运行中',
  completed: '已完成',
  failed: '失败',
  cancelled: '已取消',
  paused: '已暂停',
};

export default function SchedulerPage() {
  const { tasks, scanResults, cancelTask, cancelAllTasks, clearCompletedTasks, submitMultiVariableScan } = useSchedulerStore();
  const { locations } = useTripStore();
  const { showToast } = useUIStore();
  const [selectedAlgorithms, setSelectedAlgorithms] = useState<AlgorithmType[]>(['genetic', 'simulated_annealing']);
  const [selectedGoals, setSelectedGoals] = useState<OptimizationGoal[]>(['distance', 'time', 'balanced']);
  const [maxWorkers, setMaxWorkers] = useState(2);

  const algorithms: { id: AlgorithmType; name: string }[] = [
    { id: 'nearest_neighbor', name: '最近邻' },
    { id: 'genetic', name: '遗传算法' },
    { id: 'simulated_annealing', name: '模拟退火' },
    { id: 'ant_colony', name: '蚁群算法' },
  ];

  const goals: { id: OptimizationGoal; name: string }[] = [
    { id: 'distance', name: '最短距离' },
    { id: 'time', name: '最短时间' },
    { id: 'cost', name: '最低成本' },
    { id: 'balanced', name: '综合均衡' },
  ];

  const toggleAlgorithm = (algo: AlgorithmType) => {
    setSelectedAlgorithms(prev =>
      prev.includes(algo) ? prev.filter(a => a !== algo) : [...prev, algo]
    );
  };

  const toggleGoal = (goal: OptimizationGoal) => {
    setSelectedGoals(prev =>
      prev.includes(goal) ? prev.filter(g => g !== goal) : [...prev, goal]
    );
  };

  const scanMutation = useMutation({
    mutationFn: async () => {
      if (locations.length < 2) {
        throw new Error('请先添加至少2个地点');
      }
      if (selectedAlgorithms.length === 0 || selectedGoals.length === 0) {
        throw new Error('请至少选择一个算法和一个优化目标');
      }

      return await submitMultiVariableScan(
        locations,
        {
          algorithms: selectedAlgorithms,
          goals: selectedGoals,
          transportModes: ['driving'],
          compareCount: selectedAlgorithms.length * selectedGoals.length,
        },
        'driving' as TransportMode,
        'medium'
      );
    },
    onSuccess: (taskId) => {
      showToast('success', `多变量扫描任务已提交：${String(taskId).slice(0, 8)}`);
    },
    onError: (error) => {
      showToast('error', error instanceof Error ? error.message : '任务提交失败');
    },
  });

  const queuedCount = tasks.filter(t => t.status === 'queued' as const).length;
  const runningCount = tasks.filter(t => t.status === 'running' as const).length;
  const completedCount = tasks.filter(t => t.status === 'completed').length;
  const failedCount = tasks.filter(t => t.status === 'failed').length;

  return (
    <PageContainer>
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold text-dark-800">
              异步调度引擎
            </h1>
            <p className="text-dark-500 mt-1">
              管理计算任务，多变量参数扫描，并行优化方案对比
            </p>
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={() => clearCompletedTasks()}
              className="px-4 py-2 bg-dark-100 text-dark-600 rounded-xl hover:bg-dark-200 transition-colors flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              清除已完成
            </button>
            <button
              onClick={() => {
                if (confirm('确定要取消所有运行中的任务吗？')) {
                  cancelAllTasks();
                  showToast('info', '所有任务已取消');
                }
              }}
              className="px-4 py-2 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-colors flex items-center gap-2"
            >
              <XCircle className="w-4 h-4" />
              取消全部
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="card"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center">
                <Clock className="w-5 h-5 text-gray-600" />
              </div>
              <span className="text-sm text-dark-500">排队中</span>
            </div>
            <p className="text-3xl font-bold text-gray-700">{queuedCount}</p>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="card"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                <Zap className="w-5 h-5 text-blue-600" />
              </div>
              <span className="text-sm text-dark-500">运行中</span>
            </div>
            <p className="text-3xl font-bold text-blue-600">{runningCount}</p>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="card"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
              </div>
              <span className="text-sm text-dark-500">已完成</span>
            </div>
            <p className="text-3xl font-bold text-green-600">{completedCount}</p>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="card"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
                <XCircle className="w-5 h-5 text-red-600" />
              </div>
              <span className="text-sm text-dark-500">失败</span>
            </div>
            <p className="text-3xl font-bold text-red-600">{failedCount}</p>
          </motion.div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-6">
            <div className="card">
              <h3 className="text-lg font-bold text-dark-800 mb-4 flex items-center gap-2">
                <Settings className="w-5 h-5 text-primary-500" />
                多变量扫描配置
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-dark-700 mb-3">选择算法</label>
                  <div className="grid grid-cols-2 gap-2">
                    {algorithms.map((algo) => (
                      <button
                        key={algo.id}
                        onClick={() => toggleAlgorithm(algo.id)}
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                          selectedAlgorithms.includes(algo.id)
                            ? 'bg-primary-500 text-white shadow-md'
                            : 'bg-dark-50 text-dark-600 hover:bg-dark-100'
                        }`}
                      >
                        {algo.name}
                      </button>
                    ))}
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-dark-700 mb-3">优化目标</label>
                  <div className="grid grid-cols-2 gap-2">
                    {goals.map((goal) => (
                      <button
                        key={goal.id}
                        onClick={() => toggleGoal(goal.id)}
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                          selectedGoals.includes(goal.id)
                            ? 'bg-accent-500 text-white shadow-md'
                            : 'bg-dark-50 text-dark-600 hover:bg-dark-100'
                        }`}
                      >
                        {goal.name}
                      </button>
                    ))}
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-dark-700 mb-2">
                    并发 Worker 数量: {maxWorkers}
                  </label>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setMaxWorkers(Math.max(1, maxWorkers - 1))}
                      className="p-2 bg-dark-50 rounded-lg hover:bg-dark-100 transition-colors"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <div className="flex-1 h-2 bg-dark-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-primary-500 to-cyan-500 rounded-full transition-all"
                        style={{ width: `${(maxWorkers / 8) * 100}%` }}
                      />
                    </div>
                    <button
                      onClick={() => setMaxWorkers(Math.min(8, maxWorkers + 1))}
                      className="p-2 bg-dark-50 rounded-lg hover:bg-dark-100 transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                
                <div className="p-4 bg-primary-50 rounded-xl">
                  <p className="text-sm text-primary-700 mb-2">参数组合预览</p>
                  <p className="text-2xl font-bold text-primary-600">
                    {selectedAlgorithms.length * selectedGoals.length} 种组合
                  </p>
                  <p className="text-xs text-primary-600/80 mt-1">
                    {locations.length} 个目的地 · {maxWorkers} 并发
                  </p>
                </div>
                
                <button
                  onClick={() => scanMutation.mutate()}
                  disabled={scanMutation.isPending || locations.length < 2}
                  className="w-full btn-primary flex items-center justify-center gap-2"
                >
                  {scanMutation.isPending ? (
                    <>
                      <RefreshCw className="w-5 h-5 animate-spin" />
                      提交中...
                    </>
                  ) : (
                    <>
                      <Play className="w-5 h-5" />
                      开始多变量扫描
                    </>
                  )}
                </button>
                
                {locations.length < 2 && (
                  <p className="text-sm text-center text-amber-600 bg-amber-50 p-3 rounded-xl">
                    请先在路径规划页面添加至少 2 个地点
                  </p>
                )}
              </div>
            </div>

            {scanResults.length > 0 && (
              <div className="card">
                <h3 className="text-lg font-bold text-dark-800 mb-4 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-purple-500" />
                  扫描结果统计
                </h3>
                
                <div className="space-y-3">
                  {scanResults.slice(0, 5).map((result, index) => (
                    <motion.div
                      key={result.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="p-3 bg-dark-50 rounded-xl"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-dark-700">
                          {result.parameters?.algorithm || '未知'} · {result.parameters?.goal || '未知'}
                        </span>
                        <span className={`text-sm ${
                          result.rank === 1 ? 'text-green-600' : 
                          result.rank === 2 ? 'text-blue-600' : 'text-dark-500'
                        }`}>
                          #{result.rank || '-'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-dark-500">
                          距离: {((result.totalDistance || 0) / 1000).toFixed(1)}km
                        </span>
                        <span className="font-mono text-primary-600">
                          {(result.fitnessScore || 0).toFixed(2)}
                        </span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="lg:col-span-2 space-y-4">
            <div className="card">
              <h3 className="text-lg font-bold text-dark-800 mb-4 flex items-center gap-2">
                <RefreshCw className="w-5 h-5 text-accent-500" />
                任务队列
              </h3>
              
              {tasks.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-dark-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Zap className="w-8 h-8 text-dark-400" />
                  </div>
                  <p className="text-dark-500 mb-2">暂无任务</p>
                  <p className="text-sm text-dark-400">
                    配置参数后点击"开始多变量扫描"提交任务
                  </p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[600px] overflow-y-auto scrollbar-thin">
                  {[...tasks].reverse().map((task, index) => {
                    const StatusIcon = statusIcons[task.status as keyof typeof statusIcons];
                    
                    return (
                      <motion.div
                        key={task.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.03 }}
                        className={`p-4 rounded-xl border-2 transition-all ${
                          task.status === 'running' as const
                            ? 'border-primary-200 bg-primary-50/50'
                            : 'border-dark-100 bg-white hover:border-primary-100'
                        }`}>
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                              task.status === 'running' as const ? 'bg-primary-100' : 'bg-dark-100'
                            }`}>
                              <StatusIcon className={`w-5 h-5 ${
                                task.status === 'running' as const ? 'text-primary-600 animate-pulse' : 'text-dark-500'
                              }`} />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="font-semibold text-dark-800">
                                  {task.type === 'tsp_solve' ? '路径优化' : '多变量扫描'}
                                </p>
                                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[task.status as keyof typeof statusColors]}`}>
                                  {statusLabels[task.status as keyof typeof statusLabels]}
                                </span>
                              </div>
                              <p className="text-xs text-dark-500 font-mono">
                                ID: {task.id.slice(0, 12)}...
                              </p>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            {task.status === 'running' as const && (
                              <button
                                onClick={() => cancelTask(task.id)}
                                className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                                title="取消任务"
                              >
                                <XCircle className="w-4 h-4 text-red-400" />
                              </button>
                            )}
                          </div>
                        </div>
                        
                        {task.status === 'running' as const && (
                          <>
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm text-dark-600">
                                {task.progressMessage || '处理中...'}
                              </span>
                              <span className="text-sm font-semibold text-primary-600">
                                {task.progress}%
                              </span>
                            </div>
                            <div className="h-2 bg-dark-100 rounded-full overflow-hidden">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${task.progress}%` }}
                                className="h-full bg-gradient-to-r from-primary-500 to-cyan-500 rounded-full transition-all duration-300"
                              />
                            </div>
                          </>
                        )}
                        
                        {task.status === 'completed' && task.result !== undefined && task.result !== null && (
                          <div className="flex items-center gap-4 text-sm text-dark-600 bg-green-50 p-3 rounded-lg">
                            <span className="flex items-center gap-1">
                              <ArrowDownRight className="w-4 h-4 text-green-500" />
                              距离: {((task.result as { totalDistance?: number }).totalDistance || 0) / 1000}km
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-4 h-4 text-green-500" />
                              {Math.round(((task.result as { totalTime?: number }).totalTime || 0) / 60)}h
                            </span>
                            <span className="flex items-center gap-1">
                              <BarChart3 className="w-4 h-4 text-green-500" />
                              评分: {(task.result as { fitnessScore?: number }).fitnessScore?.toFixed(2) || 'N/A'}
                            </span>
                          </div>
                        )}
                        
                        {task.status === 'failed' && task.error && (
                          <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">
                            {task.error}
                          </p>
                        )}
                        
                        <div className="flex items-center justify-between mt-3 pt-3 border-t border-dark-100 text-xs text-dark-400">
                          <span>创建: {format(task.createdAt, 'MM/dd HH:mm', { locale: zhCN })}</span>
                          {task.completedAt && (
                            <span>完成: {format(task.completedAt, 'MM/dd HH:mm', { locale: zhCN })}</span>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </PageContainer>
  );
}
