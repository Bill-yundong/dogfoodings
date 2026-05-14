import { For } from 'solid-js';
import type { WarningAlert, CollisionRisk } from '../types/crane';

interface AlertPanelProps {
  alerts: WarningAlert[];
  collisionRisks: CollisionRisk[];
  onAcknowledge: (id: string) => void;
}

export function AlertPanel(props: AlertPanelProps) {
  const unacknowledgedAlerts = () => props.alerts.filter(a => !a.acknowledged);

  const riskLevelColors = {
    low: 'bg-blue-100 text-blue-800 border-blue-300',
    medium: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    high: 'bg-orange-100 text-orange-800 border-orange-300',
    critical: 'bg-red-100 text-red-800 border-red-300'
  };

  const alertLevelColors = {
    warning: 'bg-yellow-500',
    danger: 'bg-orange-500',
    emergency: 'bg-red-600 animate-pulse'
  };

  return (
    <div class="alert-panel space-y-8 p-8">
      <div>
        <h3 class="text-2xl font-extrabold text-slate-800 mb-7 flex items-center gap-4 flex-wrap">
          <span class="w-14 h-14 rounded-2xl bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center text-white text-3xl shadow-xl shadow-red-500/30 flex-shrink-0">
            ⚠️
          </span>
          <span>碰撞风险预警</span>
        </h3>
        <div class="space-y-5">
          <For each={props.collisionRisks}>
            {(risk) => (
              <div class={`p-7 rounded-2xl border-2 ${riskLevelColors[risk.riskLevel]} shadow-md`}>
                <div class="flex justify-between items-start gap-5 flex-wrap">
                  <div class="flex-1 min-w-0">
                    <div class="font-extrabold text-xl whitespace-nowrap">
                      {risk.craneA} ↔ {risk.craneB}
                    </div>
                    <p class="text-base mt-3 opacity-90">
                      📏 距离: <span class="font-bold">{risk.distance.toFixed(1)}m</span> | 
                      ⏱️ 预测: <span class="font-bold">{Math.max(0, Math.round(risk.predictedTime / 1000))}s</span>
                    </p>
                    <p class="text-sm mt-2 opacity-80">
                      ⚡ 动能: {(risk.kineticEnergyA + risk.kineticEnergyB).toFixed(0)}J
                    </p>
                  </div>
                  <span class="px-6 py-3 rounded-xl text-base font-extrabold bg-white shadow-xl whitespace-nowrap flex-shrink-0">
                    {risk.riskLevel === 'critical' ? '🚨 紧急' : 
                     risk.riskLevel === 'high' ? '⚠️ 高危' :
                     risk.riskLevel === 'medium' ? '🟡 中危' : '🟢 低危'}
                  </span>
                </div>
              </div>
            )}
          </For>
          {props.collisionRisks.length === 0 && (
            <div class="text-center py-14 bg-emerald-50 rounded-2xl border-2 border-emerald-200 border-dashed">
              <div class="text-5xl mb-5">✅</div>
              <div class="text-emerald-700 font-extrabold text-xl">暂无碰撞风险</div>
              <div class="text-emerald-600 text-base mt-3">作业区域安全，塔吊运行正常</div>
            </div>
          )}
        </div>
      </div>

      <div>
        <div class="flex justify-between items-center mb-7 flex-wrap gap-4">
          <h3 class="text-2xl font-extrabold text-slate-800 flex items-center gap-4 flex-wrap">
            <span class="w-14 h-14 rounded-2xl bg-gradient-to-br from-rose-500 to-pink-500 flex items-center justify-center text-white text-3xl shadow-xl shadow-rose-500/30 flex-shrink-0">
              🔔
            </span>
            <span>警报通知</span>
          </h3>
          <span class={`px-7 py-3.5 rounded-xl text-white font-extrabold shadow-xl text-lg whitespace-nowrap ${unacknowledgedAlerts().length > 0 ? 
            'bg-gradient-to-r from-red-500 to-rose-500 animate-pulse' : 
            'bg-gradient-to-r from-emerald-500 to-teal-500'}`}>
            {unacknowledgedAlerts().length} 条未处理
          </span>
        </div>
        <div class="space-y-5 max-h-96 overflow-y-auto pr-3">
          <For each={unacknowledgedAlerts()}>
            {(alert) => (
              <div class={`p-7 rounded-2xl border-2 ${
                alert.level === 'emergency' ? 'bg-red-50 border-red-200 shadow-red-100 shadow-xl' :
                alert.level === 'danger' ? 'bg-orange-50 border-orange-200 shadow-orange-100 shadow-lg' :
                'bg-yellow-50 border-yellow-200 shadow-yellow-100 shadow-md'
              }`}>
                <div class="flex justify-between items-start gap-5 flex-wrap">
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-4">
                      <span class={`w-5 h-5 rounded-full shadow-xl ${
                        alert.level === 'emergency' ? 'bg-red-500 animate-ping' :
                        alert.level === 'danger' ? 'bg-orange-500' : 'bg-yellow-500'
                      } flex-shrink-0`}></span>
                      <span class="font-extrabold text-slate-800 text-lg whitespace-nowrap">{alert.craneId}</span>
                    </div>
                    <p class="text-base mt-4 text-slate-700 font-semibold">{alert.message}</p>
                    <p class="text-sm mt-3 text-slate-500 flex items-center gap-2">
                      🕐 {new Date(alert.timestamp).toLocaleTimeString()}
                    </p>
                  </div>
                  <button
                    onClick={() => props.onAcknowledge(alert.id)}
                    class="px-7 py-3.5 bg-white border-2 border-slate-200 rounded-xl text-base font-semibold hover:bg-slate-50 hover:border-slate-300 transition-all duration-200 shadow-md hover:shadow-lg active:scale-95 whitespace-nowrap flex-shrink-0"
                  >
                    ✓ 确认处理
                  </button>
                </div>
              </div>
            )}
          </For>
          {unacknowledgedAlerts().length === 0 && (
            <div class="text-center py-14 bg-emerald-50 rounded-2xl border-2 border-emerald-200 border-dashed">
              <div class="text-5xl mb-5">🔔</div>
              <div class="text-emerald-700 font-extrabold text-xl">暂无警报</div>
              <div class="text-emerald-600 text-base mt-3">系统运行正常，安全无隐患</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
