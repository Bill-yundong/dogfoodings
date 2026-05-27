import { For, Show } from 'solid-js';
import { user, activeAlerts, highRiskPredictions, predictions, isAnalyst } from '../../stores/app';

const MOCK_USERS = [
  { name: '张明', bsValue: 11.2, risk: 'high' as const, trend: 'up' as const },
  { name: '李芳', bsValue: 9.8, risk: 'high' as const, trend: 'up' as const },
  { name: '王伟', bsValue: 9.1, risk: 'medium' as const, trend: 'stable' as const },
  { name: '赵静', bsValue: 8.5, risk: 'medium' as const, trend: 'down' as const },
  { name: '陈刚', bsValue: 10.4, risk: 'high' as const, trend: 'up' as const },
];

function riskBadge(level: 'low' | 'medium' | 'high') {
  switch (level) {
    case 'high': return 'badge-high';
    case 'medium': return 'badge-medium';
    default: return 'badge-low';
  }
}

function trendArrow(trend: 'up' | 'down' | 'stable') {
  switch (trend) {
    case 'up':
      return (
        <svg class="w-4 h-4 text-red-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="12" y1="19" x2="12" y2="5" /><polyline points="5 12 12 5 19 12" />
        </svg>
      );
    case 'down':
      return (
        <svg class="w-4 h-4 text-metabo-glow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="12" y1="5" x2="12" y2="19" /><polyline points="19 12 12 19 5 12" />
        </svg>
      );
    default:
      return (
        <svg class="w-4 h-4 text-metabo-amber" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      );
  }
}

export default function Analyst() {
  const totalUsers = 156;
  const alertCount = activeAlerts().length;
  const avgIAUC = predictions().length > 0
    ? Math.round(predictions().reduce((s, p) => s + p.iauc, 0) / predictions().length)
    : 0;
  const alignmentCoverage = 94;

  return (
    <div class="flex-1 overflow-y-auto p-6 space-y-6">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-3">
          <h2 class="section-title">分析师控制台</h2>
          <span class="badge-medium">Analyst</span>
        </div>
        <div class="flex items-center gap-2">
          <span class="font-body text-sm text-metabo-muted">监测用户</span>
          <span class="stat-number text-metabo-glow text-xl">{totalUsers}</span>
        </div>
      </div>

      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div class="glass-card p-4 flex flex-col gap-2">
          <span class="font-body text-sm text-metabo-muted">总监测用户</span>
          <span class="stat-number text-metabo-glow">{totalUsers}</span>
        </div>
        <div class="glass-card p-4 flex flex-col gap-2">
          <span class="font-body text-sm text-metabo-muted">高风险告警</span>
          <span class="stat-number text-metabo-amber">{alertCount}</span>
        </div>
        <div class="glass-card p-4 flex flex-col gap-2">
          <span class="font-body text-sm text-metabo-muted">平均IAUC</span>
          <span class="stat-number text-metabo-text">{avgIAUC}</span>
        </div>
        <div class="glass-card p-4 flex flex-col gap-2">
          <span class="font-body text-sm text-metabo-muted">对齐全覆盖率</span>
          <span class="stat-number text-metabo-glow">{alignmentCoverage}%</span>
        </div>
      </div>

      <div>
        <h3 class="section-title mb-4">高风险用户</h3>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <For each={MOCK_USERS}>
            {(u) => (
              <div class="glass-card p-5 flex items-center gap-4 transition-all duration-200 hover:border-metabo-amber/50">
                <div class="w-10 h-10 rounded-full bg-metabo-surface border border-metabo-border flex items-center justify-center flex-shrink-0">
                  <span class="font-display font-bold text-sm text-metabo-text">{u.name[0]}</span>
                </div>
                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-2 mb-1">
                    <span class="font-body text-sm text-metabo-text font-medium">{u.name}</span>
                    <span class={riskBadge(u.risk)}>
                      {u.risk === 'high' ? '高风险' : '中等'}
                    </span>
                  </div>
                  <div class="flex items-center gap-2">
                    <span class="font-body text-xs text-metabo-muted">
                      血糖 {u.bsValue} mmol/L
                    </span>
                    {trendArrow(u.trend)}
                  </div>
                </div>
              </div>
            )}
          </For>
        </div>
      </div>
    </div>
  );
}
