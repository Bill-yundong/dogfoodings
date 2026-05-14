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
    <div class="alert-panel space-y-6 p-6">
      <div>
        <h3 class="text-xl font-bold text-slate-800 mb-5 flex items-center gap-3">
          <span class="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center text-white text-lg">
            ⚠️
          </span>
          碰撞风险预警
        </h3>
        <div class="space-y-3">
          <For each={props.collisionRisks}>
            {(risk) => (
              <div class={`p-5 rounded-2xl border ${riskLevelColors[risk.riskLevel]} shadow-sm`}>
                <div class="flex justify-between items-start gap-4">
                  <div class="flex-1">
                    <div class="font-bold text-lg">
                      {risk.craneA} ↔ {risk.craneB}
                    </div>
                    <p class="text-sm mt-2 opacity-90">
                      📏 距离: <span class="font-semibold">{risk.distance.toFixed(1)}m</span> | 
                      ⏱️ 预测: <span class="font-semibold">{Math.max(0, Math.round(risk.predictedTime / 1000))}s</span>
                    </p>
                    <p class="text-xs mt-1 opacity-80">
                      ⚡ 动能: {(risk.kineticEnergyA + risk.kineticEnergyB).toFixed(0)}J
                    </p>
                  </div>
                  <span class="px-4 py-2 rounded-xl text-sm font-bold bg-white shadow-md whitespace-nowrap">
                    {risk.riskLevel === 'critical' ? '🚨 紧急' : 
                     risk.riskLevel === 'high' ? '⚠️ 高危' :
                     risk.riskLevel === 'medium' ? '🟡 中危' : '🟢 低危'}
                  </span>
                </div>
              </div>
            )}
          </For>
          {props.collisionRisks.length === 0 && (
            <div class="text-center py-10 bg-emerald-50 rounded-2xl border-2 border-emerald-200 border-dashed">
              <div class="text-4xl mb-3">✅</div>
              <div class="text-emerald-700 font-semibold text-lg">暂无碰撞风险</div>
              <div class="text-emerald-600 text-sm mt-1">作业区域安全</div>
            </div>
          )}
        </div>
      </div>

      <div>
        <div class="flex justify-between items-center mb-5">
          <h3 class="text-xl font-bold text-slate-800 flex items-center gap-3">
            <span class="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-500 to-pink-500 flex items-center justify-center text-white text-lg">
              🔔
            </span>
            警报通知
          </h3>
          <span class={`px-5 py-2.5 rounded-xl text-white font-bold shadow-lg ${unacknowledgedAlerts().length > 0 ? 
            'bg-gradient-to-r from-red-500 to-rose-500 animate-pulse' : 
            'bg-gradient-to-r from-emerald-500 to-teal-500'}`}>
            {unacknowledgedAlerts().length} 条未处理
          </span>
        </div>
        <div class="space-y-3 max-h-80 overflow-y-auto pr-2">
          <For each={unacknowledgedAlerts()}>
            {(alert) => (
              <div class={`p-5 rounded-2xl border ${
                alert.level === 'emergency' ? 'bg-red-50 border-red-200 shadow-red-100 shadow-lg' :
                alert.level === 'danger' ? 'bg-orange-50 border-orange-200 shadow-orange-100 shadow-md' :
                'bg-yellow-50 border-yellow-200 shadow-yellow-100 shadow-sm'
              }`}>
                <div class="flex justify-between items-start gap-4">
                  <div class="flex-1">
                    <div class="flex items-center gap-3">
                      <span class={`w-4 h-4 rounded-full shadow-lg ${
                        alert.level === 'emergency' ? 'bg-red-500 animate-ping' :
                        alert.level === 'danger' ? 'bg-orange-500' : 'bg-yellow-500'
                      }`}></span>
                      <span class="font-bold text-slate-800">{alert.craneId}</span>
                    </div>
                    <p class="text-sm mt-3 text-slate-700 font-medium">{alert.message}</p>
                    <p class="text-xs mt-2 text-slate-500 flex items-center gap-1">
                      🕐 {new Date(alert.timestamp).toLocaleTimeString()}
                    </p>
                  </div>
                  <button
                    onClick={() => props.onAcknowledge(alert.id)}
                    class="ml-2 px-5 py-2.5 bg-white border-2 border-slate-200 rounded-xl text-sm font-semibold hover:bg-slate-50 hover:border-slate-300 transition-all duration-200 shadow-sm hover:shadow active:scale-95"
                  >
                    ✓ 确认
                  </button>
                </div>
              </div>
            )}
          </For>
          {unacknowledgedAlerts().length === 0 && (
            <div class="text-center py-10 bg-emerald-50 rounded-2xl border-2 border-emerald-200 border-dashed">
              <div class="text-4xl mb-3">🔔</div>
              <div class="text-emerald-700 font-semibold text-lg">暂无警报</div>
              <div class="text-emerald-600 text-sm mt-1">系统运行正常</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
