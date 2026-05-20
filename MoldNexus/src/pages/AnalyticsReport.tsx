import { Component, createEffect, createSignal, For } from 'solid-js';
import { BarChart3, TrendingUp, AlertTriangle, CheckCircle, Download, Gauge, Zap, Target } from 'lucide-solid';
import { countDefectsByType } from '@/db/defect';
import { countSimulations } from '@/db/simulation';
import { getDefectTypeName, getDefectTypeColor } from '@/engine/defectEngine';
import type { DefectType } from '@/types';

const AnalyticsReport: Component = () => {
  const [defectStats, setDefectStats] = createSignal<Record<DefectType, number>>({
    weld_line: 0,
    air_trap: 0,
    short_shot: 0,
    burn_mark: 0,
    sink_mark: 0,
  });
  const [totalSimulations, setTotalSimulations] = createSignal(0);
  const [timeRange, setTimeRange] = createSignal<'week' | 'month' | 'quarter' | 'year'>('month');

  createEffect(async () => {
    const stats = await countDefectsByType();
    setDefectStats(stats);
    setTotalSimulations(await countSimulations());
  });

  const totalDefects = () => Object.values(defectStats()).reduce((a, b) => a + b, 0);
  const defectRate = () => totalSimulations() > 0 ? (totalDefects() / totalSimulations() * 10).toFixed(1) : '0';

  const mostCommonDefect = () => {
    let maxType: DefectType = 'weld_line';
    let maxCount = 0;
    for (const [type, count] of Object.entries(defectStats())) {
      if (count > maxCount) {
        maxCount = count;
        maxType = type as DefectType;
      }
    }
    return { type: maxType, count: maxCount };
  };

  const optimizationSuggestions = [
    {
      title: '优化注射速度曲线',
      description: '根据熔接痕位置分析，建议在充填前30%阶段降低注射速度20%，以减少熔接痕的形成。',
      impact: '预计可减少熔接痕缺陷 35%',
      priority: '高',
    },
    {
      title: '提高模具温度',
      description: '当前模具温度偏低，建议提高至 90°C，有助于改善熔料流动性，减少气泡产生。',
      impact: '预计可减少气泡缺陷 25%',
      priority: '中',
    },
    {
      title: '调整浇口位置',
      description: '分析显示当前浇口位置导致充填不平衡，建议在右侧增加辅助浇口。',
      impact: '预计可改善短射问题 40%',
      priority: '高',
    },
    {
      title: '优化保压曲线',
      description: '建议采用分段保压策略，高压阶段延长 2 秒，以减少缩痕缺陷。',
      impact: '预计可减少缩痕缺陷 20%',
      priority: '中',
    },
  ];

  const trendData = [
    { date: '1月', defects: 156, simulations: 42 },
    { date: '2月', defects: 142, simulations: 38 },
    { date: '3月', defects: 128, simulations: 45 },
    { date: '4月', defects: 135, simulations: 52 },
    { date: '5月', defects: 98, simulations: 48 },
    { date: '6月', defects: 87, simulations: 55 },
  ];

  const maxTrendValue = () => Math.max(...trendData.map(d => d.defects));

  return (
    <div class="space-y-6">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold text-gray-100">分析报告</h1>
          <p class="text-sm text-gray-400 mt-1">缺陷统计分析与参数优化建议</p>
        </div>
        <div class="flex items-center gap-3">
          <div class="flex bg-dark-100 rounded-lg p-0.5">
            {(['week', 'month', 'quarter', 'year'] as const).map((range) => (
              <button
                onClick={() => setTimeRange(range)}
                class={`px-3 py-1.5 text-xs rounded transition-colors ${
                  timeRange() === range ? 'bg-primary-600 text-white' : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                {range === 'week' ? '本周' : range === 'month' ? '本月' : range === 'quarter' ? '本季度' : '本年'}
              </button>
            ))}
          </div>
          <button 
            onClick={() => alert('导出报告功能开发中...')}
            class="btn btn-secondary"
          >
            <Download class="w-4 h-4" /> 导出报告
          </button>
        </div>
      </div>

      <div class="grid grid-cols-4 gap-4">
        <div class="panel p-4">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm text-gray-400">总模拟任务</p>
              <p class="text-3xl font-bold text-gray-100 mt-1">{totalSimulations()}</p>
            </div>
            <div class="w-12 h-12 rounded-xl bg-primary-500/20 flex items-center justify-center">
              <BarChart3 class="w-6 h-6 text-primary-400" />
            </div>
          </div>
          <div class="mt-3 flex items-center gap-2 text-xs text-accent-green">
            <TrendingUp class="w-3 h-3" />
            <span>较上月 +15%</span>
          </div>
        </div>

        <div class="panel p-4">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm text-gray-400">总缺陷数</p>
              <p class="text-3xl font-bold text-gray-100 mt-1">{totalDefects()}</p>
            </div>
            <div class="w-12 h-12 rounded-xl bg-accent-red/20 flex items-center justify-center">
              <AlertTriangle class="w-6 h-6 text-accent-red" />
            </div>
          </div>
          <div class="mt-3 flex items-center gap-2 text-xs text-accent-green">
            <TrendingUp class="w-3 h-3 rotate-180" />
            <span>较上月 -18%</span>
          </div>
        </div>

        <div class="panel p-4">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm text-gray-400">缺陷发生率</p>
              <p class="text-3xl font-bold text-gray-100 mt-1">{defectRate()}%</p>
            </div>
            <div class="w-12 h-12 rounded-xl bg-accent-orange/20 flex items-center justify-center">
              <Target class="w-6 h-6 text-accent-orange" />
            </div>
          </div>
          <div class="mt-3 flex items-center gap-2 text-xs text-accent-green">
            <CheckCircle class="w-3 h-3" />
            <span>优于行业平均</span>
          </div>
        </div>

        <div class="panel p-4">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm text-gray-400">最常见缺陷</p>
              <p class="text-xl font-bold mt-1" style={{ color: getDefectTypeColor(mostCommonDefect().type) }}>
                {getDefectTypeName(mostCommonDefect().type)}
              </p>
              <p class="text-xs text-gray-500">{mostCommonDefect().count} 次</p>
            </div>
            <div class="w-12 h-12 rounded-xl flex items-center justify-center" style={{ 'background-color': getDefectTypeColor(mostCommonDefect().type) + '20' }}>
              <AlertTriangle class="w-6 h-6" style={{ color: getDefectTypeColor(mostCommonDefect().type) }} />
            </div>
          </div>
        </div>
      </div>

      <div class="grid grid-cols-3 gap-4">
        <div class="panel col-span-2">
          <div class="panel-header">
            <span class="panel-title flex items-center gap-2">
              <TrendingUp class="w-4 h-4 text-primary-400" />
              缺陷趋势分析
            </span>
          </div>
          <div class="panel-content">
            <div class="h-64 flex items-end gap-4 px-4">
              <For each={trendData}>
                {(data) => (
                  <div class="flex-1 flex flex-col items-center gap-2">
                    <div class="w-full relative">
                      <div
                        class="w-full bg-gradient-to-t from-primary-600 to-accent-cyan rounded-t transition-all duration-500"
                        style={{ height: `${(data.defects / maxTrendValue()) * 200}px` }}
                      />
                      <span class="absolute -top-5 left-1/2 -translate-x-1/2 text-xs text-gray-400 font-mono">
                        {data.defects}
                      </span>
                    </div>
                    <span class="text-xs text-gray-500">{data.date}</span>
                  </div>
                )}
              </For>
            </div>
          </div>
        </div>

        <div class="panel">
          <div class="panel-header">
            <span class="panel-title flex items-center gap-2">
              <AlertTriangle class="w-4 h-4 text-accent-orange" />
              缺陷类型分布
            </span>
          </div>
          <div class="panel-content">
            <div class="space-y-4">
              <For each={Object.entries(defectStats())}>
                {([type, count]) => {
                  const percentage = totalDefects() > 0 ? (count / totalDefects() * 100).toFixed(1) : '0';
                  return (
                    <div>
                      <div class="flex items-center justify-between mb-1">
                        <div class="flex items-center gap-2">
                          <div class="w-3 h-3 rounded-full" style={{ 'background-color': getDefectTypeColor(type as DefectType) }} />
                          <span class="text-sm text-gray-300">{getDefectTypeName(type as DefectType)}</span>
                        </div>
                        <div class="flex items-center gap-2">
                          <span class="text-sm font-mono text-gray-400">{count}</span>
                          <span class="text-xs text-gray-500">({percentage}%)</span>
                        </div>
                      </div>
                      <div class="h-2 bg-dark-100 rounded-full overflow-hidden">
                        <div
                          class="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${percentage}%`,
                            'background-color': getDefectTypeColor(type as DefectType),
                          }}
                        />
                      </div>
                    </div>
                  );
                }}
              </For>
            </div>
          </div>
        </div>
      </div>

      <div class="grid grid-cols-2 gap-4">
        <div class="panel">
          <div class="panel-header">
            <span class="panel-title flex items-center gap-2">
              <Gauge class="w-4 h-4 text-accent-cyan" />
              工艺参数分析
            </span>
          </div>
          <div class="panel-content">
            <div class="space-y-4">
              <div>
                <div class="flex justify-between text-sm mb-1">
                  <span class="text-gray-400">熔体温度稳定性</span>
                  <span class="text-accent-green">良好</span>
                </div>
                <div class="h-2 bg-dark-100 rounded-full overflow-hidden">
                  <div class="h-full w-4/5 bg-accent-green rounded-full" />
                </div>
              </div>
              <div>
                <div class="flex justify-between text-sm mb-1">
                  <span class="text-gray-400">注射速度均匀性</span>
                  <span class="text-accent-yellow">一般</span>
                </div>
                <div class="h-2 bg-dark-100 rounded-full overflow-hidden">
                  <div class="h-full w-3/5 bg-accent-yellow rounded-full" />
                </div>
              </div>
              <div>
                <div class="flex justify-between text-sm mb-1">
                  <span class="text-gray-400">保压压力稳定性</span>
                  <span class="text-accent-green">良好</span>
                </div>
                <div class="h-2 bg-dark-100 rounded-full overflow-hidden">
                  <div class="h-full w-[85%] bg-accent-green rounded-full" />
                </div>
              </div>
              <div>
                <div class="flex justify-between text-sm mb-1">
                  <span class="text-gray-400">冷却时间充足性</span>
                  <span class="text-accent-green">优秀</span>
                </div>
                <div class="h-2 bg-dark-100 rounded-full overflow-hidden">
                  <div class="h-full w-[92%] bg-accent-green rounded-full" />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="panel">
          <div class="panel-header">
            <span class="panel-title flex items-center gap-2">
              <Zap class="w-4 h-4 text-accent-yellow" />
              优化建议
            </span>
          </div>
          <div class="panel-content space-y-3 max-h-72 overflow-y-auto">
            <For each={optimizationSuggestions}>
              {(suggestion) => (
                <div class="p-3 bg-dark-100 rounded-lg border-l-4" style={{ 'border-color': suggestion.priority === '高' ? '#EF4444' : '#F59E0B' }}>
                  <div class="flex items-center justify-between mb-2">
                    <h4 class="font-medium text-gray-200">{suggestion.title}</h4>
                    <span class={`badge ${suggestion.priority === '高' ? 'badge-danger' : 'badge-warning'}`}>
                      {suggestion.priority}优先级
                    </span>
                  </div>
                  <p class="text-sm text-gray-400 mb-2">{suggestion.description}</p>
                  <p class="text-xs text-accent-green flex items-center gap-1">
                    <TrendingUp class="w-3 h-3" />
                    {suggestion.impact}
                  </p>
                </div>
              )}
            </For>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsReport;
