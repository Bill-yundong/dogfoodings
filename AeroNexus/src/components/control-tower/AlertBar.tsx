import React from 'react';
import { AlertTriangle, XCircle, Info, CheckCircle, Clock, Route, Zap, ArrowRight } from 'lucide-react';
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
      bgColor: 'bg-[#FF5252]/15',
      borderColor: 'border-[#FF5252]',
      borderWidth: 'border-2',
      textColor: 'text-[#FF5252]',
      glow: 'shadow-[0_0_25px_rgba(255,82,82,0.4),inset_0_0_20px_rgba(255,82,82,0.1)]',
      label: '严重',
      priority: 0,
      pulse: true,
    },
    warning: {
      icon: AlertTriangle,
      bgColor: 'bg-[#FFD600]/12',
      borderColor: 'border-[#FFD600]',
      borderWidth: 'border',
      textColor: 'text-[#FFD600]',
      glow: 'shadow-[0_0_15px_rgba(255,214,0,0.25)]',
      label: '警告',
      priority: 1,
      pulse: false,
    },
    info: {
      icon: Info,
      bgColor: 'bg-[#00D4FF]/10',
      borderColor: 'border-[#00D4FF]/50',
      borderWidth: 'border',
      textColor: 'text-[#00D4FF]',
      glow: '',
      label: '提示',
      priority: 2,
      pulse: false,
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
  
  const getTTCColor = (seconds: number) => {
    if (seconds < 10) return '#FF5252';
    if (seconds < 30) return '#FFD600';
    return '#00D4FF';
  };
  
  const getTTCProgress = (seconds: number) => {
    return Math.max(0, Math.min(100, (1 - seconds / 60) * 100));
  };
  
  const typeLabels: Record<string, string> = {
    collision: '碰撞风险',
    deadlock: '死锁风险',
    zone_violation: '区域入侵',
    low_battery: '低电量',
    malfunction: '设备故障',
  };

  const typeIcons: Record<string, React.FC<{ className?: string }>> = {
    collision: XCircle,
    deadlock: AlertTriangle,
    zone_violation: Zap,
    low_battery: Zap,
    malfunction: AlertTriangle,
  };
  
  const TypeIcon = typeIcons[alert.type] || AlertTriangle;
  const ttcColor = getTTCColor(alert.timeToCollision);
  const ttcProgress = getTTCProgress(alert.timeToCollision);

  return (
    <div
      className={`p-3 rounded-lg ${config.bgColor} ${config.borderColor} ${config.borderWidth} ${
        !alert.resolved && !alert.acknowledged && config.pulse ? `${config.glow} animate-pulse` : config.glow
      } transition-all hover:scale-[1.01]`}
    >
      <div className="flex items-start gap-3">
        <div className="flex flex-col items-center gap-2">
          <div 
            className={`w-10 h-10 rounded-lg flex items-center justify-center ${config.bgColor} ${config.pulse && !alert.resolved && !alert.acknowledged ? 'animate-pulse' : ''}`}
            style={{ boxShadow: `0 0 15px ${ttcColor}30` }}
          >
            <Icon className={`w-5 h-5 ${config.textColor}`} />
          </div>
          
          {alert.level === 'critical' && !alert.resolved && (
            <div className="w-0.5 flex-1 bg-gradient-to-b from-[#FF5252] to-transparent rounded-full" />
          )}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1">
            <div className="flex items-center gap-2">
              <span className={`font-bold ${config.textColor} text-sm`}>{config.label}</span>
              <span className="text-xs text-[#9FB8D1] flex items-center gap-1">
                <TypeIcon className="w-3 h-3" />
                {typeLabels[alert.type]}
              </span>
            </div>
            <span className="text-[10px] text-[#5A7A9A] font-mono">
              {formatTime(alert.timestamp)}
            </span>
          </div>
          
          <div className="text-xs text-[#9FB8D1] mb-2 flex items-center gap-1">
            <span className="text-[#5A7A9A]">涉及:</span>
            <span className="text-[#E8F4FF] font-mono">{alert.involvedEquipment.join(', ')}</span>
          </div>
          
          <div className="flex items-center gap-3 mb-2">
            <div className="flex items-center gap-1.5">
              <Clock className="w-3 h-3" style={{ color: ttcColor }} />
              <span 
                className="text-xs font-bold font-mono" 
                style={{ color: ttcColor, textShadow: `0 0 8px ${ttcColor}50` }}
              >
                {formatTTC(alert.timeToCollision)}
              </span>
            </div>
            
            <div className="flex-1 h-1.5 bg-[#152A47] rounded-full overflow-hidden">
              <div 
                className="h-full rounded-full transition-all duration-300"
                style={{ 
                  width: `${ttcProgress}%`,
                  background: `linear-gradient(90deg, #00E676, #FFD600, #FF5252)`,
                  boxShadow: `0 0 8px ${ttcColor}`,
                }}
              />
            </div>
          </div>
          
          {alert.suggestedAction && (
            <div className="p-2 bg-black/30 rounded text-xs border border-[#2A4A6F]">
              <div className="flex items-center gap-1.5 text-[#00D4FF] mb-1.5">
                <Route className="w-3 h-3" />
                <span className="font-medium">建议措施</span>
                <ArrowRight className="w-3 h-3 ml-auto" />
              </div>
              <div className="text-[#9FB8D1] flex items-center gap-2">
                <span className="px-1.5 py-0.5 bg-[#00D4FF]/20 text-[#00D4FF] rounded text-[10px]">
                  {alert.suggestedAction.type === 'reroute' && '重规划'}
                  {alert.suggestedAction.type === 'slow_down' && '减速'}
                  {alert.suggestedAction.type === 'stop' && '停车'}
                </span>
                <span className="font-mono">{alert.suggestedAction.equipmentId}</span>
              </div>
            </div>
          )}
        </div>
        
        <div className="flex flex-col gap-1.5">
          {!alert.acknowledged && (
            <button
              onClick={() => acknowledgeAlert(alert.id)}
              className="px-2.5 py-1.5 text-xs bg-[#00D4FF] text-[#0A1628] rounded hover:bg-[#00E676] transition-colors font-medium shadow-[0_0_10px_rgba(0,212,255,0.3)]"
            >
              确认
            </button>
          )}
          {!alert.resolved && alert.acknowledged && (
            <button
              onClick={() => resolveAlert(alert.id)}
              className="px-2.5 py-1.5 text-xs bg-[#00E676] text-[#0A1628] rounded hover:bg-[#00E676]/80 transition-colors font-medium shadow-[0_0_10px_rgba(0,230,118,0.3)]"
            >
              处理
            </button>
          )}
          {alert.resolved && (
            <span className="px-2.5 py-1.5 text-xs bg-[#00E676]/20 text-[#00E676] rounded flex items-center gap-1 border border-[#00E676]/30">
              <CheckCircle className="w-3 h-3" />
              已解决
            </span>
          )}
          
          {alert.acknowledged && !alert.resolved && (
            <span className="px-2 py-0.5 text-[10px] bg-[#FFD600]/20 text-[#FFD600] rounded text-center">
              处理中
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
  
  const resolvedAlerts = Array.from(alerts.values())
    .filter((a) => a.resolved)
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 5);
  
  const criticalCount = unresolvedAlerts.filter((a) => a.level === 'critical').length;
  const warningCount = unresolvedAlerts.filter((a) => a.level === 'warning').length;
  const infoCount = unresolvedAlerts.filter((a) => a.level === 'info').length;
  
  const [showResolved, setShowResolved] = React.useState(false);

  return (
    <div className="h-full flex flex-col bg-[#0F2137]">
      <div className="px-4 py-3 border-b border-[#2A4A6F]">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <h3 className="font-bold text-[#E8F4FF] font-mono flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-[#FF5252]" />
              冲突预警
            </h3>
            
            <div className="flex items-center gap-1">
              {criticalCount > 0 && (
                <span className="px-2 py-0.5 bg-[#FF5252]/20 text-[#FF5252] text-xs rounded-full font-bold animate-pulse flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-[#FF5252] rounded-full" />
                  {criticalCount}
                </span>
              )}
              {warningCount > 0 && (
                <span className="px-2 py-0.5 bg-[#FFD600]/20 text-[#FFD600] text-xs rounded-full font-bold">
                  {warningCount}
                </span>
              )}
              {infoCount > 0 && (
                <span className="px-2 py-0.5 bg-[#00D4FF]/20 text-[#00D4FF] text-xs rounded-full">
                  {infoCount}
                </span>
              )}
            </div>
          </div>
          
          <span className="text-[10px] text-[#5A7A9A] font-mono">
            {unresolvedAlerts.length} 未处理
          </span>
        </div>
        
        <div className="flex gap-1">
          <button
            onClick={() => setShowResolved(false)}
            className={`flex-1 px-2 py-1 text-xs rounded transition-colors ${
              !showResolved 
                ? 'bg-[#00D4FF]/20 text-[#00D4FF]' 
                : 'text-[#5A7A9A] hover:text-[#9FB8D1]'
            }`}
          >
            未处理 ({unresolvedAlerts.length})
          </button>
          <button
            onClick={() => setShowResolved(true)}
            className={`flex-1 px-2 py-1 text-xs rounded transition-colors ${
              showResolved 
                ? 'bg-[#00D4FF]/20 text-[#00D4FF]' 
                : 'text-[#5A7A9A] hover:text-[#9FB8D1]'
            }`}
          >
            已解决 ({resolvedAlerts.length})
          </button>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {showResolved ? (
          resolvedAlerts.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-[#5A7A9A]">
              <CheckCircle className="w-12 h-12 mb-2 opacity-30" />
              <p className="text-xs">暂无已解决记录</p>
            </div>
          ) : (
            resolvedAlerts.map((alert) => <AlertCard key={alert.id} alert={alert} />)
          )
        ) : (
          unresolvedAlerts.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-[#5A7A9A]">
              <div className="w-16 h-16 rounded-full bg-[#00E676]/10 flex items-center justify-center mb-3">
                <CheckCircle className="w-8 h-8 text-[#00E676]" />
              </div>
              <p className="text-sm font-medium text-[#00E676]">当前无冲突预警</p>
              <p className="text-xs text-[#5A7A9A] mt-1">所有设备运行正常</p>
            </div>
          ) : (
            unresolvedAlerts.map((alert) => <AlertCard key={alert.id} alert={alert} />)
          )
        )}
      </div>
    </div>
  );
};
