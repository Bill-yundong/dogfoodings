import { Component, onMount, onCleanup } from 'solid-js';
import { BeltScene } from '@/components/belt3d/BeltScene';
import { StatCard } from '@/components/dashboard/StatCard';
import { TensionHeatmap } from '@/components/dashboard/TensionHeatmap';
import { HealthScore } from '@/components/dashboard/HealthScore';
import { beltState } from '@/stores/beltStore';
import { sensorState } from '@/stores/sensorStore';
import { alarmState } from '@/stores/alarmStore';
import { formatTime } from '@/utils/format';

const ICONS = {
  speed: 'M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2zm0 4h10v10H4V8h6zm-1 2v3H7v-3h2zm4 0v3h-2v-3h2zm4 0v3h-2v-3h2z',
  tension: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z',
  temp: 'M15 13V5c0-1.66-1.34-3-3-3S9 3.34 9 5v8c-1.21.91-2 2.37-2 4 0 2.76 2.24 5 5 5s5-2.24 5-5c0-1.63-.79-3.09-2-4zm-4-8c0-.55.45-1 1-1s1 .45 1 1h-1v1h1v2h-1v1h1v2h-2V5z',
  alarm: 'M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z',
};

export const Dashboard: Component = () => {
  let updateInterval: number;

  const avgTension = () => {
    const data = Array.from(sensorState.latestData.values());
    if (data.length === 0) return 0;
    return data.reduce((sum, d) => sum + d.tension, 0) / data.length;
  };

  const avgTemp = () => {
    const data = Array.from(sensorState.latestData.values());
    if (data.length === 0) return 0;
    return data.reduce((sum, d) => sum + d.temperature, 0) / data.length;
  };

  const criticalAlarms = () => {
    return alarmState.alarms.filter((a) => a.severity === 'critical' && !a.resolved).length;
  };

  const latestSensorData = () => {
    return Array.from(sensorState.latestData.values());
  };

  onMount(() => {
    updateInterval = window.setInterval(() => {}, 1000);
  });

  onCleanup(() => {
    clearInterval(updateInterval);
  });

  return (
    <div class="p-6 h-full overflow-auto">
      <div class="mb-6">
        <h1 class="text-2xl font-bold text-white mb-1">重载皮带机监控中心</h1>
        <p class="text-sm text-gray-400">
          实时监控 · 张力分析 · 撕裂检测 · 寿命预测
          <span class="ml-4 text-tech-400">
            最后更新: {formatTime(beltState.lastUpdate)}
          </span>
        </p>
      </div>

      <div class="grid grid-cols-12 gap-4 mb-6">
        <div class="col-span-3">
          <StatCard
            title="运行速度"
            value={beltState.currentState?.speed || 4.2}
            unit="m/s"
            icon={ICONS.speed}
            color="blue"
            trend={0.5}
          />
        </div>
        <div class="col-span-3">
          <StatCard
            title="平均张力"
            value={avgTension()}
            unit="kN"
            icon={ICONS.tension}
            color={avgTension() > 70 ? 'yellow' : 'green'}
          />
        </div>
        <div class="col-span-3">
          <StatCard
            title="平均温度"
            value={avgTemp()}
            unit="°C"
            icon={ICONS.temp}
            color={avgTemp() > 60 ? 'yellow' : 'green'}
          />
        </div>
        <div class="col-span-3">
          <StatCard
            title="严重报警"
            value={criticalAlarms()}
            unit="条"
            icon={ICONS.alarm}
            color={criticalAlarms() > 0 ? 'red' : 'green'}
          />
        </div>
      </div>

      <div class="grid grid-cols-12 gap-4 h-[calc(100%-240px)]">
        <div class="col-span-8 flex flex-col gap-4">
          <div class="flex-1 min-h-[400px]">
            <BeltScene
              beltState={beltState.currentState}
              tensionAnalysis={beltState.tensionAnalysis}
              sensorData={latestSensorData()}
            />
          </div>
          <div class="h-[180px] bg-industrial-800/30 rounded-xl border border-industrial-700/50 p-4">
            <TensionHeatmap analysis={beltState.tensionAnalysis} />
          </div>
        </div>

        <div class="col-span-4 flex flex-col gap-4">
          <div class="bg-industrial-800/30 rounded-xl border border-industrial-700/50 p-6">
            <HealthScore score={beltState.tensionAnalysis?.healthScore || 85} />
          </div>

          <div class="flex-1 bg-industrial-800/30 rounded-xl border border-industrial-700/50 p-4 overflow-hidden">
            <div class="text-sm text-gray-400 mb-3">最近报警</div>
            <div class="space-y-2 max-h-[300px] overflow-auto">
              {alarmState.alarms.slice(0, 5).map((alarm) => (
                <div
                  class={`p-3 rounded-lg border ${
                    alarm.severity === 'critical'
                      ? 'bg-red-500/10 border-red-500/30'
                      : alarm.severity === 'warning'
                      ? 'bg-warning-500/10 border-warning-500/30'
                      : 'bg-industrial-500/10 border-industrial-500/30'
                  } ${alarm.resolved ? 'opacity-50' : ''}`}
                >
                  <div class="flex items-center justify-between mb-1">
                    <span
                      class={`text-xs font-medium ${
                        alarm.severity === 'critical'
                          ? 'text-red-400'
                          : alarm.severity === 'warning'
                          ? 'text-warning-400'
                          : 'text-industrial-400'
                      }`}
                    >
                      {alarm.severity === 'critical' ? '严重' : alarm.severity === 'warning' ? '警告' : '提示'}
                    </span>
                    <span class="text-xs text-gray-500">{formatTime(alarm.timestamp)}</span>
                  </div>
                  <div class="text-sm text-gray-300">{alarm.message}</div>
                  <div class="text-xs text-gray-500 mt-1">位置: {alarm.position.toFixed(1)}m</div>
                </div>
              ))}
              {alarmState.alarms.length === 0 && (
                <div class="text-center text-gray-500 py-8">暂无报警</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
