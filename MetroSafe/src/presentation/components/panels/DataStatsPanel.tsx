import { Component, createEffect, createSignal, For } from 'solid-js';
import { cycleRepository } from '../../../infrastructure/database/CycleRepository';
import type { CycleData, CycleStats, FaultType } from '../../../core/domain';

const faultTypeLabels: Record<FaultType, string> = {
  none: '无',
  obstacle_detected: '障碍物检测',
  motor_failure: '电机故障',
  sensor_error: '传感器故障',
  communication_error: '通信故障',
  door_misalignment: '门体错位'
};

export const DataStatsPanel: Component = () => {
  const [stats, setStats] = createSignal<CycleStats | null>(null);
  const [recentCycles, setRecentCycles] = createSignal<CycleData[]>([]);
  const [isGenerating, setIsGenerating] = createSignal(false);
  const [dbReady, setDbReady] = createSignal(false);

  createEffect(async () => {
    try {
      await cycleRepository.init();
      setDbReady(true);
      
      const [currentStats, cycles] = await Promise.all([
        cycleRepository.getStats(),
        cycleRepository.getRecentCycles(10)
      ]);
      setStats(currentStats);
      setRecentCycles(cycles);
    } catch (e) {
      console.error('Failed to init DB', e);
    }

    const interval = setInterval(async () => {
      if (dbReady()) {
        const [currentStats, cycles] = await Promise.all([
          cycleRepository.getStats(),
          cycleRepository.getRecentCycles(10)
        ]);
        setStats(currentStats);
        setRecentCycles(cycles);
      }
    }, 2000);

    return () => clearInterval(interval);
  });

  const generateSampleData = async () => {
    setIsGenerating(true);
    try {
      await cycleRepository.generateSampleData(1000);
      const currentStats = await cycleRepository.getStats();
      setStats(currentStats);
    } catch (e) {
      console.error('Failed to generate sample data', e);
    }
    setIsGenerating(false);
  };

  const clearData = async () => {
    try {
      await cycleRepository.clearAll();
      const currentStats = await cycleRepository.getStats();
      setStats(currentStats);
    } catch (e) {
      console.error('Failed to clear data', e);
    }
  };

  if (!dbReady()) {
    return (
      <div class="bg-gray-800 rounded-lg p-4 shadow-lg">
        <h2 class="text-xl font-bold text-white mb-4">数据统计</h2>
        <div class="text-center text-gray-500 py-8">
          正在初始化数据库...
        </div>
      </div>
    );
  }

  return (
    <div class="bg-gray-800 rounded-lg p-4 shadow-lg">
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-xl font-bold text-white">数据统计 (IndexedDB)</h2>
        <div class="flex gap-2">
          <button 
            onClick={generateSampleData}
            disabled={isGenerating()}
            class="px-3 py-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded text-sm transition-colors"
          >
            {isGenerating() ? '生成中...' : '生成样本数据'}
          </button>
          <button 
            onClick={clearData}
            class="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-sm transition-colors"
          >
            清除数据
          </button>
        </div>
      </div>

      <div class="grid grid-cols-2 gap-3 mb-4">
        <div class="bg-gray-700 rounded p-3">
          <div class="text-gray-400 text-sm">总循环次数</div>
          <div class="text-2xl font-bold text-white">{stats()?.totalCycles || 0}</div>
        </div>
        <div class="bg-gray-700 rounded p-3">
          <div class="text-gray-400 text-sm">成功次数</div>
          <div class="text-2xl font-bold text-green-400">{stats()?.successfulCycles || 0}</div>
        </div>
        <div class="bg-gray-700 rounded p-3">
          <div class="text-gray-400 text-sm">失败次数</div>
          <div class="text-2xl font-bold text-red-400">{stats()?.failedCycles || 0}</div>
        </div>
        <div class="bg-gray-700 rounded p-3">
          <div class="text-gray-400 text-sm">平均电流</div>
          <div class="text-2xl font-bold text-yellow-400">{(stats()?.avgMotorCurrent || 0).toFixed(2)} A</div>
        </div>
      </div>

      {stats() && stats()!.faultDistribution && stats()!.faultDistribution.size > 0 && (
        <div class="mb-4">
          <h3 class="text-white font-medium mb-2">故障分布</h3>
          <div class="space-y-1">
            {Array.from(stats()!.faultDistribution.entries()).map(([type, count]) => (
              <div class="flex items-center justify-between text-sm">
                <span class="text-gray-300">{faultTypeLabels[type]}</span>
                <span class="text-red-400 font-medium">{count} 次</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <h3 class="text-white font-medium mb-2">最近记录</h3>
        <div class="max-h-40 overflow-y-auto space-y-1">
          <For each={recentCycles()}>
            {cycle => (
              <div class="flex items-center justify-between bg-gray-700 rounded p-2 text-sm">
                <span class="text-gray-300">{cycle.doorId}</span>
                <span class={cycle.success ? 'text-green-400' : 'text-red-400'}>
                  {cycle.success ? '成功' : '失败'}
                </span>
                <span class="text-gray-400">{(cycle.duration / 1000).toFixed(2)}s</span>
              </div>
            )}
          </For>
          {recentCycles().length === 0 && (
            <div class="text-center text-gray-500 py-4">
              暂无记录
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
