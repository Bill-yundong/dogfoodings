'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useMutation } from '@tanstack/react-query';
import { 
  Route, Zap, Clock, DollarSign, Scale, 
  Car, Bus, Footprints, Bike,
  Play, Pause, RotateCcw, CheckCircle2,
  Settings, ChevronDown, ChevronUp
} from 'lucide-react';
import { useTripStore, useSchedulerStore, useUIStore } from '@/lib/store';
import type { TransportMode } from '@/lib/types';
import type { AlgorithmType, OptimizationGoal } from '@/lib/tsp/types';

interface OptimizationPanelProps {
  onOptimize?: () => void;
}

const algorithms = [
  { id: 'nearest_neighbor' as AlgorithmType, name: '最近邻算法', description: '快速启发式，适合小规模', speed: '⚡ 极快' },
  { id: 'genetic' as AlgorithmType, name: '遗传算法', description: '进化优化，全局寻优', speed: '⚡ 中等' },
  { id: 'simulated_annealing' as AlgorithmType, name: '模拟退火', description: '概率搜索，精度高', speed: '⚡ 较慢' },
  { id: 'ant_colony' as AlgorithmType, name: '蚁群算法', description: '群体智能，复杂路网', speed: '⚡ 慢' },
];

const optimizationGoals = [
  { id: 'distance' as OptimizationGoal, name: '最短距离', icon: Route, color: 'text-blue-500', bg: 'bg-blue-50' },
  { id: 'time' as OptimizationGoal, name: '最短时间', icon: Clock, color: 'text-green-500', bg: 'bg-green-50' },
  { id: 'cost' as OptimizationGoal, name: '最低成本', icon: DollarSign, color: 'text-accent-500', bg: 'bg-accent-50' },
  { id: 'balanced' as OptimizationGoal, name: '综合均衡', icon: Scale, color: 'text-purple-500', bg: 'bg-purple-50' },
];

const transportModes = [
  { id: 'driving' as TransportMode, name: '驾车', icon: Car, speed: '60 km/h' },
  { id: 'transit' as TransportMode, name: '公共交通', icon: Bus, speed: '35 km/h' },
  { id: 'walking' as TransportMode, name: '步行', icon: Footprints, speed: '5 km/h' },
  { id: 'cycling' as TransportMode, name: '骑行', icon: Bike, speed: '15 km/h' },
];

export function OptimizationPanel({ onOptimize }: OptimizationPanelProps) {
  const { locations, optimizeRoute, selectedResult, optimizationResults, clearOptimizationResults } = useTripStore();
  const { isRunning, activeTask, submitOptimizationTask } = useSchedulerStore();
  const { showToast } = useUIStore();
  
  const [algorithm, setAlgorithm] = useState<AlgorithmType>('genetic');
  const [optimizationGoal, setOptimizationGoal] = useState<OptimizationGoal>('balanced');
  const [transportMode, setTransportMode] = useState<TransportMode>('driving');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [returnToStart, setReturnToStart] = useState(false);

  const canOptimize = locations.length >= 2 && !isRunning;

  const optimizeMutation = useMutation({
    mutationFn: async () => {
      if (!canOptimize) throw new Error('条件不满足');
      
      showToast('info', `开始使用 ${algorithms.find(a => a.id === algorithm)?.name} 进行路径优化...`);
      
      const result = await optimizeRoute(algorithm, optimizationGoal, transportMode);
      return result;
    },
    onSuccess: (result) => {
      showToast('success', `优化完成！总距离: ${(result.totalDistance / 1000).toFixed(1)}km`);
      onOptimize?.();
    },
    onError: (error) => {
      showToast('error', error instanceof Error ? error.message : '优化失败');
    },
  });

  const scheduleMutation = useMutation({
    mutationFn: async () => {
      if (!canOptimize) throw new Error('条件不满足');
      
      const taskId = await submitOptimizationTask(
        locations,
        algorithm,
        optimizationGoal,
        transportMode,
        'high'
      );
      
      showToast('success', `任务已提交到调度队列：${String(taskId).slice(0, 8)}`);
      return taskId;
    },
    onError: (error) => {
      showToast('error', error instanceof Error ? error.message : '任务提交失败');
    },
  });

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xl font-bold text-dark-800 flex items-center gap-2">
            <Zap className="w-5 h-5 text-accent-500" />
            路径优化配置
          </h3>
          <p className="text-sm text-dark-500 mt-1">
            选择算法和优化目标，生成最优旅行路线
          </p>
        </div>
        
        {optimizationResults.length > 0 && (
          <button
            onClick={() => {
              clearOptimizationResults();
              showToast('info', '已清除优化结果');
            }}
            className="p-2 text-dark-400 hover:text-dark-600 hover:bg-dark-100 rounded-lg transition-colors"
            title="清除结果"
          >
            <RotateCcw className="w-5 h-5" />
          </button>
        )}
      </div>

      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-dark-700 mb-3">选择算法</label>
          <div className="grid grid-cols-2 gap-3">
            {algorithms.map((algo) => (
              <button
                key={algo.id}
                onClick={() => setAlgorithm(algo.id)}
                className={`p-4 rounded-xl border-2 text-left transition-all ${
                  algorithm === algo.id
                    ? 'border-primary-500 bg-primary-50 shadow-md'
                    : 'border-dark-100 hover:border-primary-200 hover:bg-primary-50/50'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className={`font-semibold ${algorithm === algo.id ? 'text-primary-700' : 'text-dark-700'}`}>
                    {algo.name}
                  </span>
                  {algorithm === algo.id && (
                    <CheckCircle2 className="w-5 h-5 text-primary-500" />
                  )}
                </div>
                <p className="text-xs text-dark-500">{algo.description}</p>
                <p className="text-xs text-dark-400 mt-1">{algo.speed}</p>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-dark-700 mb-3">优化目标</label>
          <div className="grid grid-cols-4 gap-3">
            {optimizationGoals.map((goal) => {
              const Icon = goal.icon;
              return (
                <button
                  key={goal.id}
                  onClick={() => setOptimizationGoal(goal.id)}
                  className={`p-3 rounded-xl border-2 text-center transition-all ${
                    optimizationGoal === goal.id
                      ? `border-primary-500 ${goal.bg} shadow-md`
                      : 'border-dark-100 hover:border-primary-200 hover:bg-dark-50'
                  }`}
                >
                  <Icon className={`w-6 h-6 mx-auto mb-2 ${goal.color}`} />
                  <span className={`text-xs font-medium ${optimizationGoal === goal.id ? 'text-primary-700' : 'text-dark-600'}`}>
                    {goal.name}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-dark-700 mb-3">交通方式</label>
          <div className="grid grid-cols-4 gap-3">
            {transportModes.map((mode) => {
              const Icon = mode.icon;
              return (
                <button
                  key={mode.id}
                  onClick={() => setTransportMode(mode.id)}
                  className={`p-3 rounded-xl border-2 text-center transition-all ${
                    transportMode === mode.id
                      ? 'border-primary-500 bg-primary-50 shadow-md'
                      : 'border-dark-100 hover:border-primary-200 hover:bg-dark-50'
                  }`}
                >
                  <Icon className={`w-6 h-6 mx-auto mb-2 ${transportMode === mode.id ? 'text-primary-500' : 'text-dark-400'}`} />
                  <span className={`text-xs font-medium ${transportMode === mode.id ? 'text-primary-700' : 'text-dark-600'}`}>
                    {mode.name}
                  </span>
                  <p className="text-[10px] text-dark-400 mt-0.5">{mode.speed}</p>
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center gap-2 text-sm text-dark-600 hover:text-primary-600 transition-colors"
          >
            <Settings className="w-4 h-4" />
            高级选项
            {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          
          {showAdvanced && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="mt-4 p-4 bg-dark-50 rounded-xl space-y-4"
            >
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={returnToStart}
                  onChange={(e) => setReturnToStart(e.target.checked)}
                  className="w-5 h-5 rounded border-dark-300 text-primary-500 focus:ring-primary-500"
                />
                <div>
                  <p className="font-medium text-dark-700">返回起点</p>
                  <p className="text-xs text-dark-500">优化后的路线终点将回到起点</p>
                </div>
              </label>
            </motion.div>
          )}
        </div>

        {isRunning && activeTask && (
          <div className="p-4 bg-primary-50 rounded-xl border border-primary-200">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center">
                <div className="w-5 h-5 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-primary-700">正在优化路径...</p>
                <p className="text-sm text-primary-600">{activeTask.progressMessage || '计算中，请稍候'}</p>
              </div>
              <span className="text-2xl font-bold text-primary-600">{activeTask.progress}%</span>
            </div>
            <div className="h-2 bg-primary-100 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${activeTask.progress}%` }}
                className="h-full bg-gradient-to-r from-primary-500 to-cyan-500 rounded-full transition-all duration-300"
              />
            </div>
          </div>
        )}

        {selectedResult && !isRunning && (
          <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-green-800">优化完成</p>
                <p className="text-sm text-green-600">
                  总距离: {(selectedResult.totalDistance / 1000).toFixed(1)} km · 
                  总时间: {Math.round(selectedResult.totalTime / 60)} 小时
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-green-600">适应度评分</p>
                <p className="text-xl font-bold text-green-700">{selectedResult.fitnessScore.toFixed(2)}</p>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4 pt-4">
          <button
            onClick={() => optimizeMutation.mutate()}
            disabled={!canOptimize || optimizeMutation.isPending}
            className="btn-primary flex items-center justify-center gap-2"
          >
            {optimizeMutation.isPending ? (
              <>
                <Pause className="w-5 h-5" />
                优化中...
              </>
            ) : (
              <>
                <Play className="w-5 h-5" />
                立即优化
              </>
            )}
          </button>
          
          <button
            onClick={() => scheduleMutation.mutate()}
            disabled={!canOptimize || scheduleMutation.isPending}
            className="btn-secondary flex items-center justify-center gap-2"
          >
            <Zap className="w-5 h-5" />
            加入调度队列
          </button>
        </div>

        {locations.length < 2 && (
          <p className="text-sm text-center text-amber-600 bg-amber-50 p-3 rounded-xl">
            请至少添加 2 个地点才能进行路径优化
          </p>
        )}
      </div>
    </div>
  );
}
