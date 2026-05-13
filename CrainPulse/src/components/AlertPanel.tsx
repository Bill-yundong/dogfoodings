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
    <div class="alert-panel space-y-4">
      <div class="bg-white rounded-lg shadow p-4">
        <h3 class="text-lg font-semibold mb-3 text-gray-800">碰撞风险预警</h3>
        <div class="space-y-2">
          <For each={props.collisionRisks}>
            {(risk) => (
              <div class={`p-3 rounded-lg border ${riskLevelColors[risk.riskLevel]}`}>
                <div class="flex justify-between items-start">
                  <div>
                    <span class="font-medium">
                      {risk.craneA} ↔ {risk.craneB}
                    </span>
                    <p class="text-sm mt-1 opacity-80">
                      距离: {risk.distance.toFixed(1)}m | 
                      预测: {Math.max(0, Math.round(risk.predictedTime / 1000))}s
                    </p>
                    <p class="text-xs mt-1 opacity-70">
                      动能: {(risk.kineticEnergyA + risk.kineticEnergyB).toFixed(0)}J
                    </p>
                  </div>
                  <span class="px-2 py-1 rounded text-xs font-medium bg-white bg-opacity-50">
                    {risk.riskLevel === 'critical' ? '紧急' : 
                     risk.riskLevel === 'high' ? '高危' :
                     risk.riskLevel === 'medium' ? '中危' : '低危'}
                  </span>
                </div>
              </div>
            )}
          </For>
          {props.collisionRisks.length === 0 && (
            <div class="text-center py-4 text-gray-500">
              ✅ 暂无碰撞风险
            </div>
          )}
        </div>
      </div>

      <div class="bg-white rounded-lg shadow p-4">
        <div class="flex justify-between items-center mb-3">
          <h3 class="text-lg font-semibold text-gray-800">警报通知</h3>
          <span class={`px-2 py-1 rounded text-white text-sm ${alertLevelColors[unacknowledgedAlerts().length > 0 ? 'emergency' : 'warning']}`}>
            {unacknowledgedAlerts().length} 条未处理
          </span>
        </div>
        <div class="space-y-2 max-h-60 overflow-y-auto">
          <For each={unacknowledgedAlerts()}>
            {(alert) => (
              <div class={`p-3 rounded-lg border ${
                alert.level === 'emergency' ? 'bg-red-50 border-red-300' :
                alert.level === 'danger' ? 'bg-orange-50 border-orange-300' :
                'bg-yellow-50 border-yellow-300'
              }`}>
                <div class="flex justify-between items-start">
                  <div class="flex-1">
                    <div class="flex items-center gap-2">
                      <span class={`w-2 h-2 rounded-full ${
                        alert.level === 'emergency' ? 'bg-red-500 animate-ping' :
                        alert.level === 'danger' ? 'bg-orange-500' : 'bg-yellow-500'
                      }`}></span>
                      <span class="font-medium text-sm">{alert.craneId}</span>
                    </div>
                    <p class="text-sm mt-1 text-gray-700">{alert.message}</p>
                    <p class="text-xs mt-1 text-gray-500">
                      {new Date(alert.timestamp).toLocaleTimeString()}
                    </p>
                  </div>
                  <button
                    onClick={() => props.onAcknowledge(alert.id)}
                    class="ml-2 px-3 py-1 bg-white border rounded text-sm hover:bg-gray-50 transition-colors"
                  >
                    确认
                  </button>
                </div>
              </div>
            )}
          </For>
          {unacknowledgedAlerts().length === 0 && (
            <div class="text-center py-4 text-gray-500">
              ✅ 暂无警报
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
