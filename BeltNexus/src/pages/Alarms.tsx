import { Component, createSignal, For } from 'solid-js';
import { alarmState, acknowledgeAlarm, resolveAlarm } from '@/stores/alarmStore';
import { formatTimestamp, getSeverityColor, getSeverityBgColor } from '@/utils/format';

const alarmTypeLabels: Record<string, string> = {
  tear: '撕裂检测',
  tension: '张力异常',
  temperature: '温度异常',
  wear: '磨损超标',
  sensor: '传感器异常',
};

export const Alarms: Component = () => {
  const [filter, setFilter] = createSignal<'all' | 'unacknowledged' | 'resolved'>('all');
  const [severityFilter, setSeverityFilter] = createSignal<'all' | 'critical' | 'warning' | 'info'>('all');

  const filteredAlarms = () => {
    let result = [...alarmState.alarms];
    
    if (filter() === 'unacknowledged') {
      result = result.filter((a) => !a.acknowledged);
    } else if (filter() === 'resolved') {
      result = result.filter((a) => a.resolved);
    }
    
    if (severityFilter() !== 'all') {
      result = result.filter((a) => a.severity === severityFilter());
    }
    
    return result;
  };

  const stats = () => {
    const total = alarmState.alarms.length;
    const unacknowledged = alarmState.alarms.filter((a) => !a.acknowledged).length;
    const critical = alarmState.alarms.filter((a) => a.severity === 'critical' && !a.resolved).length;
    const warning = alarmState.alarms.filter((a) => a.severity === 'warning' && !a.resolved).length;
    return { total, unacknowledged, critical, warning };
  };

  return (
    <div class="p-6 h-full overflow-auto">
      <div class="mb-6">
        <h1 class="text-2xl font-bold text-white mb-1">报警中心</h1>
        <p class="text-sm text-gray-400">实时报警监控与历史记录管理</p>
      </div>

      <div class="grid grid-cols-4 gap-4 mb-6">
        <div class="bg-industrial-800/30 rounded-xl border border-industrial-700/50 p-4">
          <div class="text-sm text-gray-400 mb-1">报警总数</div>
          <div class="text-2xl font-bold font-mono text-white">{stats().total}</div>
        </div>
        <div class="bg-industrial-800/30 rounded-xl border border-industrial-700/50 p-4">
          <div class="text-sm text-gray-400 mb-1">待确认</div>
          <div class="text-2xl font-bold font-mono text-yellow-400">{stats().unacknowledged}</div>
        </div>
        <div class="bg-red-500/10 rounded-xl border border-red-500/30 p-4">
          <div class="text-sm text-gray-400 mb-1">严重报警</div>
          <div class="text-2xl font-bold font-mono text-red-400">{stats().critical}</div>
        </div>
        <div class="bg-warning-500/10 rounded-xl border border-warning-500/30 p-4">
          <div class="text-sm text-gray-400 mb-1">警告报警</div>
          <div class="text-2xl font-bold font-mono text-warning-400">{stats().warning}</div>
        </div>
      </div>

      <div class="flex gap-4 mb-6">
        <div class="flex gap-2">
          {(['all', 'unacknowledged', 'resolved'] as const).map((f) => (
            <button
              onClick={() => setFilter(f)}
              class={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                filter() === f
                  ? 'bg-industrial-600 text-white'
                  : 'bg-industrial-800/50 text-gray-400 hover:text-white'
              }`}
            >
              {f === 'all' ? '全部' : f === 'unacknowledged' ? '待确认' : '已处理'}
            </button>
          ))}
        </div>
        <div class="flex gap-2">
          {(['all', 'critical', 'warning', 'info'] as const).map((s) => (
            <button
              onClick={() => setSeverityFilter(s)}
              class={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                severityFilter() === s
                  ? 'bg-industrial-600 text-white'
                  : 'bg-industrial-800/50 text-gray-400 hover:text-white'
              }`}
            >
              {s === 'all' ? '全部级别' : s === 'critical' ? '严重' : s === 'warning' ? '警告' : '提示'}
            </button>
          ))}
        </div>
      </div>

      <div class="bg-industrial-800/30 rounded-xl border border-industrial-700/50 overflow-hidden">
        <div class="overflow-auto max-h-[calc(100vh-320px)]">
          <For each={filteredAlarms()}>
            {(alarm) => (
              <div
                class={`p-4 border-b border-industrial-700/30 transition-all hover:bg-industrial-700/20 ${
                  getSeverityBgColor(alarm.severity)
                } ${alarm.resolved ? 'opacity-60' : ''}`}
              >
                <div class="flex items-start justify-between">
                  <div class="flex-1">
                    <div class="flex items-center gap-3 mb-2">
                      <span
                        class={`px-2 py-1 rounded text-xs font-medium ${getSeverityColor(alarm.severity)} bg-current/10`}
                      >
                        {alarm.severity === 'critical' ? '严重' : alarm.severity === 'warning' ? '警告' : '提示'}
                      </span>
                      <span class="px-2 py-1 rounded text-xs bg-industrial-700/50 text-gray-400">
                        {alarmTypeLabels[alarm.type] || alarm.type}
                      </span>
                      <span class="text-xs text-gray-500">
                        {formatTimestamp(alarm.timestamp)}
                      </span>
                    </div>
                    <div class="text-gray-300 mb-2">{alarm.message}</div>
                    <div class="flex items-center gap-4 text-xs text-gray-500">
                      <span>位置: {alarm.position.toFixed(1)}m</span>
                      <span>传感器: {alarm.sensorId}</span>
                      <span>当前值: {alarm.value.toFixed(2)}</span>
                      <span>阈值: {alarm.threshold.toFixed(2)}</span>
                    </div>
                    {alarm.acknowledged && (
                      <div class="mt-2 text-xs text-gray-500">
                        已由 {alarm.acknowledgedBy || '系统'} 确认
                      </div>
                    )}
                  </div>
                  <div class="flex gap-2">
                    {!alarm.acknowledged && (
                      <button
                        onClick={() => acknowledgeAlarm(alarm.id, 'operator')}
                        class="px-3 py-1 rounded text-xs bg-industrial-600 text-white hover:bg-industrial-500 transition-colors"
                      >
                        确认
                      </button>
                    )}
                    {!alarm.resolved && (
                      <button
                        onClick={() => resolveAlarm(alarm.id)}
                        class="px-3 py-1 rounded text-xs bg-green-600 text-white hover:bg-green-500 transition-colors"
                      >
                        处理
                      </button>
                    )}
                    {alarm.resolved && (
                      <span class="px-3 py-1 rounded text-xs bg-green-500/20 text-green-400">
                        已处理
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}
          </For>
          {filteredAlarms().length === 0 && (
            <div class="p-12 text-center text-gray-500">
              <svg viewBox="0 0 24 24" fill="currentColor" class="w-12 h-12 mx-auto mb-4 opacity-30">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
              </svg>
              暂无报警记录
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
