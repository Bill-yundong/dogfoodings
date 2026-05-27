import { For, Show } from 'solid-js';
import { predictions, highRiskPredictions } from '../../stores/app';
import BloodSugarChart from '../../components/BloodSugarChart';
import type { BloodSugarPrediction } from '../../types';

function riskBadgeClass(level: 'low' | 'medium' | 'high') {
  switch (level) {
    case 'high': return 'badge-high';
    case 'medium': return 'badge-medium';
    default: return 'badge-low';
  }
}

function riskLabel(level: 'low' | 'medium' | 'high') {
  switch (level) {
    case 'high': return '高风险';
    case 'medium': return '中等风险';
    default: return '低风险';
  }
}

function sparklineSVG(curve: { glucose: number }[]) {
  if (curve.length === 0) return '';
  const min = Math.min(...curve.map(c => c.glucose));
  const max = Math.max(...curve.map(c => c.glucose));
  const range = max - min || 1;
  const w = 80;
  const h = 24;
  const points = curve
    .filter((_, i) => i % 4 === 0)
    .map((c, i, arr) => {
      const x = (i / Math.max(arr.length - 1, 1)) * w;
      const y = h - ((c.glucose - min) / range) * h;
      return `${x},${y}`;
    })
    .join(' ');
  return points;
}

export default function BloodSugar() {
  const allPredictions = predictions();
  const latest = () => allPredictions.length > 0 ? allPredictions[allPredictions.length - 1] : null;

  return (
    <div class="flex-1 overflow-y-auto p-6">
      <Show when={latest()} fallback={
        <div class="flex flex-col items-center justify-center h-96 gap-4">
          <svg class="w-16 h-16 text-metabo-muted/30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
          </svg>
          <span class="font-body text-metabo-muted">暂无血糖预测数据</span>
          <span class="font-body text-xs text-metabo-muted">录入餐食后生成预测</span>
        </div>
      }>
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div class="lg:col-span-2">
            <BloodSugarChart
              curve={latest()!.curve}
              peakTime={latest()!.peakTime}
              peakValue={latest()!.peakValue}
              riskLevel={latest()!.riskLevel}
            />
          </div>

          <div class="space-y-4">
            <div class="glass-card p-6">
              <h3 class="section-title mb-4">预测详情</h3>
              <div class="space-y-4">
                <div>
                  <span class="font-body text-sm text-metabo-muted">风险等级</span>
                  <div class="mt-2">
                    <span class={`${riskBadgeClass(latest()!.riskLevel)} text-base px-4 py-1.5`}>
                      {riskLabel(latest()!.riskLevel)}
                    </span>
                  </div>
                </div>
                <div class="flex justify-between font-body text-sm">
                  <span class="text-metabo-muted">峰值时间</span>
                  <span class="text-metabo-text">{latest()!.peakTime} min</span>
                </div>
                <div class="flex justify-between font-body text-sm">
                  <span class="text-metabo-muted">峰值血糖</span>
                  <span class="text-metabo-text">{latest()!.peakValue} mmol/L</span>
                </div>
                <div class="flex justify-between font-body text-sm">
                  <span class="text-metabo-muted">IAUC</span>
                  <span class="text-metabo-text">{latest()!.iauc}</span>
                </div>
              </div>
            </div>

            <div class="glass-card p-6">
              <h3 class="section-title mb-3">指标解读</h3>
              <div class="space-y-3 font-body text-xs text-metabo-muted">
                <Show when={latest()!.peakValue >= 10}>
                  <div class="p-2 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400">
                    血糖峰值超过10 mmol/L，建议减少高GI食物摄入
                  </div>
                </Show>
                <Show when={latest()!.peakValue >= 7.8 && latest()!.peakValue < 10}>
                  <div class="p-2 bg-metabo-amber/10 border border-metabo-amber/20 rounded-lg text-metabo-amber">
                    血糖峰值处于警戒区间，注意控制碳水摄入量
                  </div>
                </Show>
                <Show when={latest()!.peakValue < 7.8}>
                  <div class="p-2 bg-metabo-glow/10 border border-metabo-glow/20 rounded-lg text-metabo-glow">
                    血糖控制在正常范围内，继续保持
                  </div>
                </Show>
              </div>
            </div>
          </div>
        </div>

        <div class="mt-6">
          <h3 class="section-title mb-4">历史预测</h3>
          <Show when={allPredictions.length > 1} fallback={
            <div class="glass-card p-6 text-center">
              <span class="font-body text-sm text-metabo-muted">仅有一条预测记录</span>
            </div>
          }>
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              <For each={allPredictions.slice(0, -1).reverse().slice(0, 9)}>
                {(pred) => (
                  <div class="glass-card p-4 flex items-center gap-4">
                    <svg width="80" height="24" viewBox="0 0 80 24" class="flex-shrink-0">
                      <polyline
                        points={sparklineSVG(pred.curve)}
                        fill="none"
                        stroke={pred.riskLevel === 'high' ? '#EF4444' : pred.riskLevel === 'medium' ? '#F5A623' : '#00FF88'}
                        stroke-width="1.5"
                      />
                    </svg>
                    <div class="flex-1 min-w-0">
                      <div class="flex items-center gap-2">
                        <span class={riskBadgeClass(pred.riskLevel)}>{riskLabel(pred.riskLevel)}</span>
                      </div>
                      <div class="font-body text-xs text-metabo-muted mt-1">
                        峰值 {pred.peakValue} mmol/L · {pred.peakTime}min
                      </div>
                    </div>
                  </div>
                )}
              </For>
            </div>
          </Show>
        </div>
      </Show>
    </div>
  );
}
