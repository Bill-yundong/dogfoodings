import { Component, createSignal, createMemo, onMount, For } from 'solid-js';
import { BarChart3, Calendar, Download, TrendingUp, Database, FileJson } from 'lucide-solid';
import { storageService } from '@/core/storage';
import type { DailySummary, SwitchEvent } from '@shared/protocol';
import { MetricCard } from '@/components/ui/MetricCard';
import { useHub } from '@/store';
import { mean } from '@/utils/math';

export const History: Component = () => {
  const hub = useHub();
  const [summaries, setSummaries] = createSignal<DailySummary[]>([]);
  const [switches, setSwitches] = createSignal<SwitchEvent[]>([]);
  const [period, setPeriod] = createSignal<'7d' | '30d' | '90d'>('30d');
  const [, setLoading] = createSignal(true);

  onMount(async () => {
    await loadData();
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const endDate = new Date();
      const startDate = new Date();
      const days = period() === '7d' ? 7 : period() === '30d' ? 30 : 90;
      startDate.setDate(endDate.getDate() - days);

      const summaryData = await storageService.getDailySummaries(
        startDate.toISOString().split('T')[0],
        endDate.toISOString().split('T')[0]
      );

      if (summaryData.length === 0) {
        for (let i = days - 1; i >= 0; i--) {
          const date = new Date();
          date.setDate(date.getDate() - i);
          await storageService.generateDailySummary(date);
        }
        const newData = await storageService.getDailySummaries(
          startDate.toISOString().split('T')[0],
          endDate.toISOString().split('T')[0]
        );
        setSummaries(newData);
      } else {
        setSummaries(summaryData);
      }

      const switchData = await storageService.getSwitchEvents(
        startDate.getTime(),
        endDate.getTime(),
        100
      );
      setSwitches(switchData);
    } catch (e) {
      console.error('Load history error:', e);
    } finally {
      setLoading(false);
    }
  };

  const avgLatency = createMemo(() => {
    if (summaries().length === 0) return 0;
    return mean(summaries().map((s) => s.avgLatency));
  });

  const avgJitter = createMemo(() => {
    if (summaries().length === 0) return 0;
    return mean(summaries().map((s) => s.avgJitter));
  });

  const avgPacketLoss = createMemo(() => {
    if (summaries().length === 0) return 0;
    return mean(summaries().map((s) => s.avgPacketLoss)) * 100;
  });

  const totalSwitches = createMemo(() => {
    return summaries().reduce((sum, s) => sum + s.totalSwitches, 0);
  });

  const avgUptime = createMemo(() => {
    if (summaries().length === 0) return 0;
    return mean(summaries().map((s) => (s.uptime / 86400) * 100));
  });

  const qualityDistribution = createMemo(() => {
    if (summaries().length === 0) {
      return { excellent: 0, good: 0, fair: 0, poor: 0 };
    }
    return {
      excellent: mean(summaries().map((s) => s.qualityDistribution.excellent)) * 100,
      good: mean(summaries().map((s) => s.qualityDistribution.good)) * 100,
      fair: mean(summaries().map((s) => s.qualityDistribution.fair)) * 100,
      poor: mean(summaries().map((s) => s.qualityDistribution.poor)) * 100,
    };
  });

  const handleExport = async (format: 'json' | 'csv') => {
    try {
      const data = await storageService.exportData(format);
      const blob = new Blob([data], {
        type: format === 'json' ? 'application/json' : 'text/csv',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `netpulse-export-${new Date().toISOString().split('T')[0]}.${format}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Export error:', e);
    }
  };

  const handleGenerateProfile = async (period: 'peak' | 'off-peak' | 'weekend' | 'holiday') => {
    try {
      await storageService.generateEnvironmentProfile(period);
      hub.dismissAlert;
    } catch (e) {
      console.error('Generate profile error:', e);
    }
  };

  return (
    <div class="space-y-6">
      <div class="flex items-center justify-between">
        <div>
          <h2 class="font-display text-2xl font-bold text-metal-100">历史分析</h2>
          <p class="text-metal-400 text-sm mt-1">
            查看历史网络质量数据，分析环境特征，导出详细报告
          </p>
        </div>
        <div class="flex items-center gap-3">
          <div class="flex items-center gap-1 bg-space-800 rounded-lg p-1">
            {(['7d', '30d', '90d'] as const).map((p) => (
              <button
                onClick={() => {
                  setPeriod(p);
                  void loadData();
                }}
                class={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                  period() === p
                    ? 'bg-neon-cyan/20 text-neon-cyan'
                    : 'text-metal-400 hover:text-metal-200'
                }`}
              >
                {p === '7d' ? '7天' : p === '30d' ? '30天' : '90天'}
              </button>
            ))}
          </div>
          <div class="flex gap-2">
            <button
              onClick={() => handleExport('json')}
              class="btn-secondary text-sm flex items-center gap-2"
            >
              <FileJson class="w-4 h-4" />
              JSON
            </button>
            <button
              onClick={() => handleExport('csv')}
              class="btn-primary text-sm flex items-center gap-2"
            >
              <Download class="w-4 h-4" />
              导出CSV
            </button>
          </div>
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <MetricCard
          title="平均时延"
          value={avgLatency()}
          unit="ms"
          icon={TrendingUp}
          quality={
            avgLatency() < 50
              ? 'excellent'
              : avgLatency() < 100
              ? 'good'
              : avgLatency() < 200
              ? 'fair'
              : 'poor'
          }
        />
        <MetricCard
          title="平均抖动"
          value={avgJitter()}
          unit="ms"
          icon={TrendingUp}
          quality={
            avgJitter() < 10
              ? 'excellent'
              : avgJitter() < 20
              ? 'good'
              : avgJitter() < 50
              ? 'fair'
              : 'poor'
          }
        />
        <MetricCard
          title="平均丢包率"
          value={avgPacketLoss()}
          unit="%"
          icon={TrendingUp}
          quality={
            avgPacketLoss() < 0.5
              ? 'excellent'
              : avgPacketLoss() < 1
              ? 'good'
              : avgPacketLoss() < 3
              ? 'fair'
              : 'poor'
          }
        />
        <MetricCard
          title="路径切换次数"
          value={totalSwitches()}
          unit="次"
          icon={TrendingUp}
        />
        <MetricCard
          title="在线率"
          value={avgUptime()}
          unit="%"
          icon={TrendingUp}
          quality={
            avgUptime() > 99
              ? 'excellent'
              : avgUptime() > 95
              ? 'good'
              : avgUptime() > 90
              ? 'fair'
              : 'poor'
          }
        />
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div class="lg:col-span-2 glass-card p-5">
          <div class="flex items-center justify-between mb-6">
            <h3 class="font-display font-semibold text-neon-cyan">质量分布</h3>
            <div class="flex items-center gap-2 text-xs text-metal-400">
              <Calendar class="w-4 h-4" />
              <span>最近 {period() === '7d' ? 7 : period() === '30d' ? 30 : 90} 天</span>
            </div>
          </div>

          <div class="space-y-4">
            <div>
              <div class="flex justify-between text-sm mb-2">
                <span class="text-alert-green">优秀 (≥85分)</span>
                <span class="text-metal-300">{qualityDistribution().excellent.toFixed(1)}%</span>
              </div>
              <div class="h-4 bg-space-700 rounded-full overflow-hidden">
                <div
                  class="h-full bg-gradient-to-r from-alert-green to-alert-green/80 rounded-full transition-all duration-500"
                  style={{ width: `${qualityDistribution().excellent}%` }}
                />
              </div>
            </div>
            <div>
              <div class="flex justify-between text-sm mb-2">
                <span class="text-neon-cyan">良好 (≥65分)</span>
                <span class="text-metal-300">{qualityDistribution().good.toFixed(1)}%</span>
              </div>
              <div class="h-4 bg-space-700 rounded-full overflow-hidden">
                <div
                  class="h-full bg-gradient-to-r from-neon-cyan to-neon-cyan/80 rounded-full transition-all duration-500"
                  style={{ width: `${qualityDistribution().good}%` }}
                />
              </div>
            </div>
            <div>
              <div class="flex justify-between text-sm mb-2">
                <span class="text-alert-orange">一般 (≥40分)</span>
                <span class="text-metal-300">{qualityDistribution().fair.toFixed(1)}%</span>
              </div>
              <div class="h-4 bg-space-700 rounded-full overflow-hidden">
                <div
                  class="h-full bg-gradient-to-r from-alert-orange to-alert-orange/80 rounded-full transition-all duration-500"
                  style={{ width: `${qualityDistribution().fair}%` }}
                />
              </div>
            </div>
            <div>
              <div class="flex justify-between text-sm mb-2">
                <span class="text-alert-red">较差 ({'<'}40分)</span>
                <span class="text-metal-300">{qualityDistribution().poor.toFixed(1)}%</span>
              </div>
              <div class="h-4 bg-space-700 rounded-full overflow-hidden">
                <div
                  class="h-full bg-gradient-to-r from-alert-red to-alert-red/80 rounded-full transition-all duration-500"
                  style={{ width: `${qualityDistribution().poor}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        <div class="glass-card p-5">
          <h3 class="font-display font-semibold text-neon-cyan mb-4">网络环境画像</h3>
          <p class="text-sm text-metal-400 mb-4">
            基于历史数据分析您的网络环境特征，生成个性化优化建议
          </p>

          <div class="space-y-3">
            <button
              onClick={() => handleGenerateProfile('peak')}
              class="w-full p-4 rounded-xl bg-space-800 border border-white/10 hover:border-neon-cyan/30 transition-all text-left"
            >
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-lg bg-alert-orange/20 flex items-center justify-center">
                  <BarChart3 class="w-5 h-5 text-alert-orange" />
                </div>
                <div>
                  <h4 class="font-semibold text-metal-100">高峰时段分析</h4>
                  <p class="text-xs text-metal-400">19:00 - 23:00 工作日</p>
                </div>
              </div>
            </button>

            <button
              onClick={() => handleGenerateProfile('off-peak')}
              class="w-full p-4 rounded-xl bg-space-800 border border-white/10 hover:border-neon-cyan/30 transition-all text-left"
            >
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-lg bg-neon-purple/20 flex items-center justify-center">
                  <BarChart3 class="w-5 h-5 text-neon-purple" />
                </div>
                <div>
                  <h4 class="font-semibold text-metal-100">低谷时段分析</h4>
                  <p class="text-xs text-metal-400">02:00 - 08:00 工作日</p>
                </div>
              </div>
            </button>

            <button
              onClick={() => handleGenerateProfile('weekend')}
              class="w-full p-4 rounded-xl bg-space-800 border border-white/10 hover:border-neon-cyan/30 transition-all text-left"
            >
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-lg bg-alert-green/20 flex items-center justify-center">
                  <BarChart3 class="w-5 h-5 text-alert-green" />
                </div>
                <div>
                  <h4 class="font-semibold text-metal-100">周末网络分析</h4>
                  <p class="text-xs text-metal-400">周六、周日全天</p>
                </div>
              </div>
            </button>
          </div>
        </div>
      </div>

      <div class="glass-card p-5">
        <div class="flex items-center justify-between mb-4">
          <h3 class="font-display font-semibold text-neon-cyan">每日趋势</h3>
          <div class="text-xs text-metal-400">
            共 {summaries().length} 条记录
          </div>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full">
            <thead>
              <tr class="text-xs text-metal-400 border-b border-white/10">
                <th class="text-left py-3 px-4">日期</th>
                <th class="text-right py-3 px-4">平均时延</th>
                <th class="text-right py-3 px-4">平均抖动</th>
                <th class="text-right py-3 px-4">平均丢包</th>
                <th class="text-right py-3 px-4">切换次数</th>
                <th class="text-right py-3 px-4">在线时长</th>
                <th class="text-right py-3 px-4">质量分布</th>
              </tr>
            </thead>
            <tbody>
              <For each={[...summaries()].reverse()}>
                {(summary) => (
                  <tr class="border-b border-white/5 hover:bg-white/5 transition-colors">
                    <td class="py-3 px-4 text-sm text-metal-300">{summary.date}</td>
                    <td class="py-3 px-4 text-right text-sm font-mono text-metal-100">
                      {summary.avgLatency.toFixed(1)} ms
                    </td>
                    <td class="py-3 px-4 text-right text-sm font-mono text-metal-100">
                      {summary.avgJitter.toFixed(1)} ms
                    </td>
                    <td class="py-3 px-4 text-right text-sm font-mono">
                      <span
                        class={
                          summary.avgPacketLoss * 100 < 1
                            ? 'text-alert-green'
                            : summary.avgPacketLoss * 100 < 2
                            ? 'text-neon-cyan'
                            : 'text-alert-red'
                        }
                      >
                        {(summary.avgPacketLoss * 100).toFixed(2)}%
                      </span>
                    </td>
                    <td class="py-3 px-4 text-right text-sm font-mono text-metal-300">
                      {summary.totalSwitches}
                    </td>
                    <td class="py-3 px-4 text-right text-sm font-mono text-metal-300">
                      {Math.round(summary.uptime / 3600)}h
                    </td>
                    <td class="py-3 px-4">
                      <div class="flex gap-0.5 justify-end">
                        <div
                          class="w-2 h-4 bg-alert-green rounded-sm"
                          style={{ flex: summary.qualityDistribution.excellent }}
                        />
                        <div
                          class="w-2 h-4 bg-neon-cyan rounded-sm"
                          style={{ flex: summary.qualityDistribution.good }}
                        />
                        <div
                          class="w-2 h-4 bg-alert-orange rounded-sm"
                          style={{ flex: summary.qualityDistribution.fair }}
                        />
                        <div
                          class="w-2 h-4 bg-alert-red rounded-sm"
                          style={{ flex: summary.qualityDistribution.poor }}
                        />
                      </div>
                    </td>
                  </tr>
                )}
              </For>
            </tbody>
          </table>
        </div>
      </div>

      <div class="glass-card p-5">
        <div class="flex items-center gap-4 mb-4">
          <Database class="w-5 h-5 text-neon-cyan" />
          <h3 class="font-display font-semibold text-neon-cyan">数据存储状态</h3>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div class="p-4 rounded-xl bg-space-800">
            <p class="text-xs text-metal-400 mb-1">数据保留周期</p>
            <p class="text-xl font-semibold text-metal-100">{hub.state.config.dataRetentionDays} 天</p>
          </div>
          <div class="p-4 rounded-xl bg-space-800">
            <p class="text-xs text-metal-400 mb-1">探测记录数</p>
            <p class="text-xl font-semibold text-neon-cyan">{summaries().length * 86400}+</p>
          </div>
          <div class="p-4 rounded-xl bg-space-800">
            <p class="text-xs text-metal-400 mb-1">切换事件数</p>
            <p class="text-xl font-semibold text-neon-purple">{switches().length}</p>
          </div>
          <div class="p-4 rounded-xl bg-space-800">
            <p class="text-xs text-metal-400 mb-1">每日摘要</p>
            <p class="text-xl font-semibold text-alert-green">{summaries().length} 天</p>
          </div>
        </div>
      </div>
    </div>
  );
};
