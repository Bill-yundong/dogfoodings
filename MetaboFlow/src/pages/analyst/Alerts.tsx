import { For, Show } from 'solid-js';
import { alerts, activeAlerts, dismissAlert } from '../../stores/app';

function severityBadge(severity: 'low' | 'medium' | 'high') {
  switch (severity) {
    case 'high': return 'badge-high';
    case 'medium': return 'badge-medium';
    default: return 'badge-low';
  }
}

function severityLabel(severity: 'low' | 'medium' | 'high') {
  switch (severity) {
    case 'high': return '严重';
    case 'medium': return '警告';
    default: return '提示';
  }
}

function typeLabel(type: 'peak' | 'sustained' | 'rapid') {
  switch (type) {
    case 'peak': return '峰值告警';
    case 'sustained': return '持续高血糖';
    case 'rapid': return '快速上升';
  }
}

export default function Alerts() {
  const allAlerts = alerts();
  const active = activeAlerts();
  const lowCount = allAlerts.filter(a => a.severity === 'low').length;
  const mediumCount = allAlerts.filter(a => a.severity === 'medium').length;
  const highCount = allAlerts.filter(a => a.severity === 'high').length;

  return (
    <div class="flex-1 overflow-y-auto p-6 space-y-6">
      <h2 class="section-title">告警管理</h2>

      <div class="flex gap-4">
        <div class="glass-card p-4 flex items-center gap-3 flex-1">
          <div class="w-2 h-2 rounded-full bg-red-400" />
          <span class="font-body text-sm text-metabo-muted">严重</span>
          <span class="stat-number text-red-400 text-xl">{highCount}</span>
        </div>
        <div class="glass-card p-4 flex items-center gap-3 flex-1">
          <div class="w-2 h-2 rounded-full bg-metabo-amber" />
          <span class="font-body text-sm text-metabo-muted">警告</span>
          <span class="stat-number text-metabo-amber text-xl">{mediumCount}</span>
        </div>
        <div class="glass-card p-4 flex items-center gap-3 flex-1">
          <div class="w-2 h-2 rounded-full bg-metabo-glow" />
          <span class="font-body text-sm text-metabo-muted">提示</span>
          <span class="stat-number text-metabo-glow text-xl">{lowCount}</span>
        </div>
      </div>

      <Show when={allAlerts.length === 0} fallback={
        <div class="space-y-3">
          <For each={allAlerts}>
            {(alert) => (
              <div class="glass-card p-5">
                <div class="flex items-start justify-between gap-4">
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-2 mb-2">
                      <span class={severityBadge(alert.severity)}>
                        {severityLabel(alert.severity)}
                      </span>
                      <span class="badge-low">{typeLabel(alert.type)}</span>
                      <span class="font-body text-xs text-metabo-muted">
                        {new Date(alert.timestamp).toLocaleString('zh-CN')}
                      </span>
                    </div>
                    <p class="font-body text-sm text-metabo-text">{alert.message}</p>
                    <Show when={alert.predictionId}>
                      <p class="font-body text-xs text-metabo-muted mt-1">
                        关联预测: {alert.predictionId}
                      </p>
                    </Show>
                  </div>
                  <button
                    class="flex-shrink-0 text-metabo-muted hover:text-metabo-text transition-colors duration-200"
                    onClick={() => dismissAlert(alert.id)}
                  >
                    <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>
              </div>
            )}
          </For>
        </div>
      }>
        <div class="glass-card p-12 flex flex-col items-center justify-center gap-4">
          <div class="w-16 h-16 rounded-full bg-metabo-glow/10 flex items-center justify-center">
            <svg class="w-8 h-8 text-metabo-glow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          </div>
          <span class="font-body text-metabo-glow text-lg font-medium">所有指标正常</span>
          <span class="font-body text-sm text-metabo-muted">当前没有活跃告警</span>
        </div>
      </Show>
    </div>
  );
}
