import { Component, For, createMemo, createSignal } from 'solid-js';
import { Activity, Clock, Wifi, Zap, Gauge, Server } from 'lucide-solid';
import { useHub } from '@/store';
import { MetricCard } from '@/components/ui/MetricCard';
import { AlertBanner } from '@/components/ui/AlertBanner';
import { StatusIndicator } from '@/components/ui/StatusIndicator';
import { RealtimeWaveform } from '@/components/charts/RealtimeWaveform';
import { PacketLossGauge } from '@/components/charts/PacketLossGauge';
import { QualityScoreGauge } from '@/components/charts/QualityScoreGauge';
import { SwitchTimeline } from '@/components/dashboard/SwitchTimeline';
import { getQualityLevel } from '@/utils/quality';
import type { ProbeResult } from '@/types';

export const Dashboard: Component = () => {
  const hub = useHub();
  const [displayAlerts] = createSignal(true);

  const latestResult = createMemo(() => {
    if (!hub.state.activePath) return null;
    return hub.latestResult(hub.state.activePath);
  });

  const activePathHistory = createMemo(() => {
    if (!hub.state.activePath) return [] as ProbeResult[];
    return hub.pathHistory(hub.state.activePath, 60);
  });

  const activeQuality = createMemo(() => hub.getActivePathQuality());
  const activeNode = createMemo(() => hub.getActiveNode());
  const activeAlerts = createMemo(() =>
    hub.state.alerts.filter((a) => !a.dismissed).slice(0, 3)
  );

  const avgLatency = createMemo(() => {
    const data = activePathHistory();
    if (data.length === 0) return 0;
    return data.reduce((sum, d) => sum + d.latency, 0) / data.length;
  });

  const avgJitter = createMemo(() => {
    const data = activePathHistory();
    if (data.length === 0) return 0;
    return data.reduce((sum, d) => sum + d.jitter, 0) / data.length;
  });

  const avgPacketLoss = createMemo(() => {
    const data = activePathHistory();
    if (data.length === 0) return 0;
    return (data.reduce((sum, d) => sum + d.packetLoss, 0) / data.length) * 100;
  });

  const latencyTrend = createMemo(() => {
    const data = activePathHistory();
    if (data.length < 10) return 'stable' as const;
    const first = data.slice(0, 5).reduce((s, d) => s + d.latency, 0) / 5;
    const last = data.slice(-5).reduce((s, d) => s + d.latency, 0) / 5;
    const diff = last - first;
    if (diff > 5) return 'up' as const;
    if (diff < -5) return 'down' as const;
    return 'stable' as const;
  });

  return (
    <div class="space-y-6">
      {displayAlerts() && activeAlerts().length > 0 && (
        <div class="space-y-3">
          <For each={activeAlerts()}>
            {(alert) => (
              <AlertBanner alert={alert} onDismiss={hub.dismissAlert} />
            )}
          </For>
        </div>
      )}

      <div class="flex items-center justify-between">
        <div>
          <h2 class="font-display text-2xl font-bold text-metal-100">实时监控仪表盘</h2>
          <p class="text-metal-400 text-sm mt-1">
            {hub.state.isMonitoring
              ? `正在通过 ${activeNode()?.name || '未知节点'} 进行实时监测`
              : '监测未启动，点击右上角开始按钮开始'}
          </p>
        </div>
        <div class="flex items-center gap-3">
          <StatusIndicator
            status={hub.state.isMonitoring ? 'online' : 'offline'}
            showLabel
          />
          {hub.state.isMonitoring && activeNode() && (
            <div class="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-space-800 border border-white/10">
              <Server class="w-4 h-4 text-neon-cyan" />
              <span class="text-sm text-metal-300">{activeNode()?.name}</span>
            </div>
          )}
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="平均时延"
          value={avgLatency()}
          unit="ms"
          quality={getQualityLevel(100 - avgLatency() / 2)}
          trend={latencyTrend()}
          trendValue={`${latencyTrend() === 'up' ? '+' : ''}${(
            activePathHistory().length > 1
              ? avgLatency() - activePathHistory()[0].latency
              : 0
          ).toFixed(1)}ms`}
          icon={Clock}
          description="最近60个样本的平均时延"
          alert={!!(latestResult()?.latency && latestResult()!.latency > hub.state.config.latencyThreshold)}
        />
        <MetricCard
          title="时延抖动"
          value={avgJitter()}
          unit="ms"
          quality={getQualityLevel(100 - avgJitter() * 2)}
          icon={Activity}
          description="时延变化的标准差"
          alert={!!(latestResult()?.jitter && latestResult()!.jitter > hub.state.config.jitterThreshold)}
        />
        <MetricCard
          title="丢包率"
          value={avgPacketLoss()}
          unit="%"
          quality={getQualityLevel(100 - avgPacketLoss() * 20)}
          icon={Wifi}
          description="最近60个样本的平均丢包率"
          alert={avgPacketLoss() > hub.state.config.lossThreshold}
        />
        <MetricCard
          title="可用带宽"
          value={latestResult()?.bandwidth || 0}
          unit="Mbps"
          quality="good"
          trend="stable"
          icon={Zap}
          description="当前路径的可用带宽估计"
        />
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div class="lg:col-span-2">
          <RealtimeWaveform
            data={activePathHistory()}
            maxPoints={60}
            height={280}
          />
        </div>
        <div class="grid grid-cols-2 lg:grid-cols-1 gap-4">
          <PacketLossGauge
            data={activePathHistory()}
            threshold={hub.state.config.lossThreshold}
          />
          {activeQuality() && (
            <QualityScoreGauge
              score={activeQuality()!.overallScore}
              trend={activeQuality()!.prediction.trend}
            />
          )}
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SwitchTimeline
          events={hub.state.recentSwitches}
          nodes={hub.state.nodes}
        />

        <div class="glass-card p-5">
          <h3 class="font-display font-semibold text-neon-cyan mb-4">当前节点详情</h3>
          {activeNode() ? (
            <div class="space-y-4">
              <div class="flex items-center gap-4 pb-4 border-b border-white/10">
                <div class="w-14 h-14 rounded-xl bg-gradient-to-br from-neon-cyan/20 to-neon-purple/20 flex items-center justify-center">
                  <Server class="w-7 h-7 text-neon-cyan" />
                </div>
                <div>
                  <h4 class="font-semibold text-lg text-metal-100">{activeNode()!.name}</h4>
                  <p class="text-sm text-metal-400">
                    {activeNode()!.location.city}, {activeNode()!.location.country}
                  </p>
                </div>
                <div class="ml-auto">
                  <StatusIndicator status={activeNode()!.status} showLabel />
                </div>
              </div>

              <div class="grid grid-cols-2 gap-4">
                <div>
                  <p class="text-xs text-metal-500 mb-1">当前用户</p>
                  <p class="text-lg font-semibold text-metal-100">
                    {activeNode()!.currentUsers.toLocaleString()}
                  </p>
                </div>
                <div>
                  <p class="text-xs text-metal-500 mb-1">最大容量</p>
                  <p class="text-lg font-semibold text-metal-100">
                    {activeNode()!.maxCapacity.toLocaleString()}
                  </p>
                </div>
                <div>
                  <p class="text-xs text-metal-500 mb-1">负载率</p>
                  <p
                    class={`text-lg font-semibold ${
                      activeNode()!.load > 0.8
                        ? 'text-alert-red'
                        : activeNode()!.load > 0.6
                        ? 'text-alert-orange'
                        : 'text-alert-green'
                    }`}
                  >
                    {(activeNode()!.load * 100).toFixed(1)}%
                  </p>
                </div>
                <div>
                  <p class="text-xs text-metal-500 mb-1">支持协议</p>
                  <p class="text-sm text-metal-300">
                    {activeNode()!.protocols.join(', ')}
                  </p>
                </div>
              </div>

              {activeQuality() && (
                <div class="pt-4 border-t border-white/10">
                  <p class="text-xs text-metal-500 mb-3">质量分项评分</p>
                  <div class="space-y-3">
                    <div>
                      <div class="flex justify-between text-xs mb-1">
                        <span class="text-metal-400">时延评分</span>
                        <span class="text-neon-cyan">{activeQuality()!.latencyScore.toFixed(1)}</span>
                      </div>
                      <div class="h-2 bg-space-700 rounded-full overflow-hidden">
                        <div
                          class="h-full bg-neon-cyan rounded-full transition-all duration-500"
                          style={{ width: `${activeQuality()!.latencyScore}%` }}
                        />
                      </div>
                    </div>
                    <div>
                      <div class="flex justify-between text-xs mb-1">
                        <span class="text-metal-400">抖动评分</span>
                        <span class="text-neon-purple">{activeQuality()!.jitterScore.toFixed(1)}</span>
                      </div>
                      <div class="h-2 bg-space-700 rounded-full overflow-hidden">
                        <div
                          class="h-full bg-neon-purple rounded-full transition-all duration-500"
                          style={{ width: `${activeQuality()!.jitterScore}%` }}
                        />
                      </div>
                    </div>
                    <div>
                      <div class="flex justify-between text-xs mb-1">
                        <span class="text-metal-400">丢包评分</span>
                        <span class="text-alert-green">{activeQuality()!.lossScore.toFixed(1)}</span>
                      </div>
                      <div class="h-2 bg-space-700 rounded-full overflow-hidden">
                        <div
                          class="h-full bg-alert-green rounded-full transition-all duration-500"
                          style={{ width: `${activeQuality()!.lossScore}%` }}
                        />
                      </div>
                    </div>
                    <div>
                      <div class="flex justify-between text-xs mb-1">
                        <span class="text-metal-400">稳定性</span>
                        <span class="text-metal-300">{(activeQuality()!.stability * 100).toFixed(1)}%</span>
                      </div>
                      <div class="h-2 bg-space-700 rounded-full overflow-hidden">
                        <div
                          class="h-full bg-metal-500 rounded-full transition-all duration-500"
                          style={{ width: `${activeQuality()!.stability * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div class="text-center py-12 text-metal-500">
              <Gauge class="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>开始监测后显示节点详情</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
