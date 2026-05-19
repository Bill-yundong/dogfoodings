<script lang="ts">
  import type { AlertRecord } from '@/types';
  import { formatRelativeTime, getSeverityColor } from '@/utils/format';
  import { alertStore } from '@/stores/alerts';

  let { alert } = $props<{ alert: AlertRecord }>();
  let isExpanded = $state(false);

  const severityStyles: Record<string, string> = {
    info: 'border-tech-cyan/50 bg-tech-cyan/5',
    warning: 'border-warning-orange/50 bg-warning-orange/5',
    danger: 'border-danger-red/50 bg-danger-red/5'
  };

  const severityBadge: Record<string, string> = {
    info: 'badge-info',
    warning: 'badge-warning',
    danger: 'badge-danger'
  };

  const statusLabels: Record<string, string> = {
    active: '待处理',
    acknowledged: '已确认',
    resolved: '已解决'
  };

  const acknowledge = () => {
    alertStore.updateAlertStatus(alert.id, 'acknowledged', '当前用户');
  };

  const resolve = () => {
    alertStore.updateAlertStatus(alert.id, 'resolved', '当前用户');
  };
</script>

<div
  class={`border rounded-lg p-4 transition-all duration-300 ${severityStyles[alert.severity]} ${
    isExpanded ? 'shadow-lg' : 'hover:shadow-md'
  }`}
  style={`border-left: 3px solid ${getSeverityColor(alert.severity)}`}
>
  <div role="button" tabindex="0" class="flex items-start justify-between gap-4 cursor-pointer" onclick={() => isExpanded = !isExpanded} onkeydown={(e: KeyboardEvent) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); isExpanded = !isExpanded; } }}>
    <div class="flex-1 min-w-0">
      <div class="flex items-center gap-2 mb-1">
        <span class={`badge ${severityBadge[alert.severity]}`}>
          {alert.severity.toUpperCase()}
        </span>
        <span class="text-xs text-gray-400">{alert.type}</span>
        <span class="text-xs text-gray-500">{formatRelativeTime(alert.timestamp)}</span>
      </div>
      <p class="text-sm text-gray-200 font-medium truncate">{alert.message}</p>
      {#if alert.position}
        <p class="text-xs text-gray-400 mt-1">
          位置: {alert.position.distance.toFixed(0)}m / {alert.position.depth.toFixed(0)}m 深度
        </p>
      {/if}
    </div>
    <div class="flex items-center gap-2">
      <span
        class={`text-xs px-2 py-1 rounded ${
          alert.status === 'active'
            ? 'bg-danger-red/20 text-danger-red'
            : alert.status === 'acknowledged'
            ? 'bg-warning-orange/20 text-warning-orange'
            : 'bg-safe-green/20 text-safe-green'
        }`}
      >
        {statusLabels[alert.status]}
      </span>
      <svg
        class={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
      </svg>
    </div>
  </div>

  {#if isExpanded}
    <div class="mt-4 pt-4 border-t border-gray-700/50">
      <div class="grid grid-cols-2 gap-4 text-sm mb-4">
        <div>
          <span class="text-gray-400">传感器:</span>
          <span class="text-tech-cyan ml-2 font-mono">{alert.sensorId}</span>
        </div>
        <div>
          <span class="text-gray-400">当前值:</span>
          <span class="ml-2" style="color: {getSeverityColor(alert.severity)}">{alert.value.toFixed(1)}</span>
        </div>
        <div>
          <span class="text-gray-400">阈值:</span>
          <span class="text-gray-300 ml-2">{alert.threshold.toFixed(1)}</span>
        </div>
        <div>
          <span class="text-gray-400">超出:</span>
          <span class="text-danger-red ml-2">{((alert.value / alert.threshold - 1) * 100).toFixed(1)}%</span>
        </div>
      </div>

      {#if alert.status === 'active'}
        <div class="flex gap-2">
          <button onclick={acknowledge} class="btn-secondary text-xs py-1.5 px-3">
            确认告警
          </button>
          <button onclick={resolve} class="btn-primary text-xs py-1.5 px-3">
            标记解决
          </button>
        </div>
      {/if}

      {#if alert.acknowledgedBy}
        <p class="text-xs text-gray-500 mt-2">
          确认人: {alert.acknowledgedBy}
          {#if alert.resolvedAt}
            · 解决时间: {new Date(alert.resolvedAt).toLocaleString('zh-CN')}
          {/if}
        </p>
      {/if}
    </div>
  {/if}
</div>
