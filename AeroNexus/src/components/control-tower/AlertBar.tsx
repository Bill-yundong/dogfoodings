import React from 'react';
import { AlertTriangle, XCircle, Info, CheckCircle, Clock, Route } from 'lucide-react';
import type { ConflictAlert } from '@/types';
import { useControlTowerStore } from '@/store/controlTower';

interface AlertCardProps {
  alert: ConflictAlert;
}

const AlertCard: React.FC<AlertCardProps> = ({ alert }) => {
  const { acknowledgeAlert, resolveAlert } = useControlTowerStore();
  
  const levelConfig = {
    critical: {
      icon: XCircle,
      bgColor: 'bg-[#FF5252]/10',
      borderColor: 'border-[#FF5252]',
      textColor: 'text-[#FF5252]',
      glow: 'shadow-[0_0_20px_rgba(255,82,82,0.3)]',
      label: '严重',
    },
    warning: {
      icon: AlertTriangle,
      bgColor: 'bg-[#FFD600]/10',
      borderColor: 'border-[#FFD600]',
      textColor: 'text-[#FFD600]',
      glow: 'shadow-[0_0_20px_rgba(255,214,0,0.3)]',
      label: '警告',
    },
    info: {
      icon: Info,
      bgColor: 'bg-[#00D4FF]/10',
      borderColor: 'border-[#00D4FF]',
      textColor: 'text-[#00D4FF]',
      glow: '',
      label: '提示',
    },
  };
  
  const config = levelConfig[alert.level];
  const Icon = config.icon;
  
  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };
  
  const formatTTC = (seconds: number) => {
    if (seconds < 60) return `${seconds.toFixed(0)}秒`;
    return `${(seconds / 60).toFixed(1)}分钟`;
  };
  
  const typeLabels: Record<string, string> = {
    collision: '碰撞风险',
    deadlock: '死锁风险',
    zone_violation: '区域入侵',
    low_battery: '低电量',
    malfunction: '设备故障',
  };

  return (
    <div
      className={`p-3 rounded-lg border ${config.bgColor} ${config.borderColor} ${
        !alert.resolved && !alert.acknowledged ? `${config.glow} animate-pulse-slow` : ''
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2">
          <Icon className={`w-5 h-5 flex-shrink-0 mt-0.5 ${config.textColor}`} />
          <div>
            <div className="flex items-center gap-2">
              <span className={`font-bold ${config.textColor}`}>{config.label}</span>
              <span className="text-sm text-[#9FB8D1]">{typeLabels[alert.type]}</span>
            </div>
            <div className="mt-1 text-sm text-[#9FB8D1]">
              涉及设备: {alert.involvedEquipment.join(', ')}
            </div>
            <div className="mt-1 flex items-center gap-4 text-xs text-[#5A7A9A]">
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                预计碰撞: {formatTTC(alert.timeToCollision)}
              </span>
              <span>{formatTime(alert.timestamp)}</span>
            </div>
            {alert.suggestedAction && (
              <div className="mt-2 p-2 bg-black/30 rounded text-xs">
                <div className="flex items-center gap-1 text-[#00D4FF] mb-1">
                  <Route className="w-3 h-3" />
                  建议措施
                </div>
                <div className="text-[#9FB8D1]">
                  {alert.suggestedAction.type === 'reroute' && '重新规划路径'}
                  {alert.suggestedAction.type === 'slow_down' && '减速行驶'}
                  {alert.suggestedAction.type === 'stop' && '立即停车'}
                  {' - '}
                  设备: {alert.suggestedAction.equipmentId}
                </div>
              </div>
            )}
          </div>
        </div>
        
        <div className="flex flex-col gap-1">
          {!alert.acknowledged && (
            <button
              onClick={() => acknowledgeAlert(alert.id)}
              className="px-2 py-1 text-xs bg-[#00D4FF]/20 text-[#00D4FF] rounded hover:bg-[#00D4FF]/30 transition-colors"
            >
              确认
            </button>
          )}
          {!alert.resolved && alert.acknowledged && (
            <button
              onClick={() => resolveAlert(alert.id)}
              className="px-2 py-1 text-xs bg-[#00E676]/20 text-[#00E676] rounded hover:bg-[#00E676]/30 transition-colors"
            >
              处理
            </button>
          )}
          {alert.resolved && (
            <span className="px-2 py-1 text-xs bg-[#00E676]/20 text-[#00E676] rounded flex items-center gap-1">
              <CheckCircle className="w-3 h-3" />
              已解决
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export const AlertBar: React.FC = () => {
  const { alerts } = useControlTowerStore();
  
  const unresolvedAlerts = Array.from(alerts.values())
    .filter((a) => !a.resolved)
    .sort((a, b) => {
      const levelPriority = { critical: 0, warning: 1, info: 2 };
      if (levelPriority[a.level] !== levelPriority[b.level]) {
        return levelPriority[a.level] - levelPriority[b.level];
      }
      return a.timeToCollision - b.timeToCollision;
    });
  
  const criticalCount = unresolvedAlerts.filter((a) => a.level === 'critical').length;
  const warningCount = unresolvedAlerts.filter((a) => a.level === 'warning').length;

  return (
    <div className="h-full flex flex-col bg-[#0F2137] border-t border-[#2A4A6F]">
      <div className="px-4 py-3 border-b border-[#2A4A6F] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h3 className="font-bold text-[#E8F4FF] font-mono">冲突预警</h3>
          {criticalCount > 0 && (
            <span className="px-2 py-0.5 bg-[#FF5252]/20 text-[#FF5252] text-xs rounded-full animate-pulse-slow">
              {criticalCount} 严重
            </span>
          )}
          {warningCount > 0 && (
            <span className="px-2 py-0.5 bg-[#FFD600]/20 text-[#FFD600] text-xs rounded-full">
              {warningCount} 警告
            </span>
          )}
          {unresolvedAlerts.length === 0 && (
            <span className="px-2 py-0.5 bg-[#00E676]/20 text-[#00E676] text-xs rounded-full flex items-center gap-1">
              <CheckCircle className="w-3 h-3" />
              无异常
            </span>
          )}
        </div>
        <span className="text-xs text-[#5A7A9A]">
          共 {unresolvedAlerts.length} 条未处理
        </span>
      </div>
      
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {unresolvedAlerts.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-[#5A7A9A]">
            <CheckCircle className="w-12 h-12 mb-2 opacity-50" />
            <p>当前无冲突预警</p>
          </div>
        ) : (
          unresolvedAlerts.map((alert) => <AlertCard key={alert.id} alert={alert} />)
        )}
      </div>
    </div>
  );
};
