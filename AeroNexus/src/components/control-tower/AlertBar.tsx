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
      glow: 'shadow-[0_0_20px_rgba(255,82,82,0.3)]',
      label: '严重',
      pulse: true,
    },
    warning: {
      icon: AlertTriangle,
      bgColor: 'bg-[#FFD600]/12',
      borderColor: 'border-[#FFD600]',
      borderWidth: 'border',
      textColor: 'text-[#FFD600]',
      glow: 'shadow-[0_0_12px_rgba(255,214,0,0.2)]',
      label: '警告',
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
      pulse: false,
    },
  };
  
  const config = levelConfig[alert.level];
  const Icon = config.icon;
  
  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };
  
  const formatTTC = (seconds: number) => {
    if (seconds < 60) return `${seconds.toFixed(0)}秒`;
    return `${(seconds / 60).toFixed(1)}分`;
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
    collision: '碰撞',
    deadlock: '死锁',
    zone_violation: '入侵',
    low_battery: '低电',
    malfunction: '故障',
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
      className={`p-2 rounded ${config.bgColor} ${config.borderColor} ${config.borderWidth} ${
        !alert.resolved && !alert.acknowledged && config.pulse ? `${config.glow} animate-pulse` : config.glow
      } transition-all hover:scale-[1.01]`}
    >
      <div className="flex items-start gap-2">
        <div 
          className={`w-7 h-7 rounded flex items-center justify-center flex-shrink-0 ${config.pulse && !alert.resolved && !alert.acknowledged ? 'animate-pulse' : ''}`}
          style={{ backgroundColor: `${ttcColor}15`, boxShadow: `0 0 10px ${ttcColor}20` }}
        >
          <Icon className={`w-3.5 h-3.5 ${config.textColor}`} />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-1 mb-0.5">
            <div className="flex items-center gap-1">
              <span className={`font-bold ${config.textColor} text-[11px]`}>{config.label}</span>
              <span className="text-[9px] text-[#9FB8D1] flex items-center gap-0.5">
                <TypeIcon className="w-2.5 h-2.5" />
                {typeLabels[alert.type]}
              </span>
            </div>
            <span className="text-[8px] text-[#5A7A9A] font-mono">
              {formatTime(alert.timestamp)}
            </span>
          </div>
          
          <div className="text-[9px] text-[#9FB8D1] mb-1 truncate">
            {alert.involvedEquipment.join(', ')}
          </div>
          
          <div className="flex items-center gap-2 mb-1">
            <div className="flex items-center gap-1">
              <Clock className="w-2 h-2" style={{ color: ttcColor }} />
              <span 
                className="text-[9px] font-bold font-mono" 
                style={{ color: ttcColor, textShadow: `0 0 6px ${ttcColor}40` }}
              >
                {formatTTC(alert.timeToCollision)}
              </span>
            </div>
            
            <div className="flex-1 h-1 bg-[#152A47] rounded-full overflow-hidden">
              <div 
                className="h-full rounded-full transition-all duration-300"
                style={{ 
                  width: `${ttcProgress}%`,
                  background: `linear-gradient(90deg, #00E676, #FFD600, #FF5252)`,
                  boxShadow: `0 0 6px ${ttcColor}80`,
                }}
              />
            </div>
          </div>
          
          {alert.suggestedAction && (
            <div className="p-1.5 bg-black/30 rounded text-[9px] border border-[#2A4A6F]">
              <div className="flex items-center gap-1 text-[#00D4FF] mb-0.5">
                <Route className="w-2 h-2" />
                <span className="font-medium">建议</span>
                <ArrowRight className="w-2 h-2 ml-auto" />
              </div>
              <div className="text-[#9FB8D1] flex items-center gap-1">
                <span className="px-1 py-0.5 bg-[#00D4FF]/20 text-[#00D4FF] rounded text-[8px]">
                  {alert.suggestedAction.type === 'reroute' ? '重规划' : alert.suggestedAction.type === 'slow_down' ? '减速' : '停车'}
                </span>
                <span className="font-mono">{alert.suggestedAction.equipmentId}</span>
              </div>
            </div>
          )}
        </div>
        
        <div className="flex flex-col gap-1 flex-shrink-0">
          {!alert.acknowledged && (
            <button
              onClick={() => acknowledgeAlert(alert.id)}
              className="px-1.5 py-1 text-[9px] bg-[#00D4FF] text-[#0A1628] rounded hover:bg-[#00E676] transition-colors font-medium"
            >
              确认
            </button>
          )}
          {!alert.resolved && alert.acknowledged && (
            <button
              onClick={() => resolveAlert(alert.id)}
              className="px-1.5 py-1 text-[9px] bg-[#00E676] text-[#0A1628] rounded hover:bg-[#00E676]/80 transition-colors font-medium"
            >
              处理
            </button>
          )}
          {alert.resolved && (
            <span className="px-1.5 py-1 text-[9px] bg-[#00E676]/20 text-[#00E676] rounded flex items-center gap-0.5 border border-[#00E676]/30">
              <CheckCircle className="w-2.5 h-2.5" />
              已解
            </span>
          )}
          
          {alert.acknowledged && !alert.resolved && (
            <span className="px-1 py-0.5 text-[8px] bg-[#FFD600]/20 text-[#FFD600] rounded text-center">
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
    <div className="h-full w-full flex flex-col min-h-0">
      <div className="px-2 py-1.5 border-b border-[#2A4A6F] flex-shrink-0">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-1.5">
            <h3 className="text-[11px] font-bold text-[#E8F4FF] font-mono flex items-center gap-1">
              <AlertTriangle className="w-3 h-3 text-[#FF5252]" />
              冲突预警
            </h3>
            
            <div className="flex items-center gap-0.5">
              {criticalCount > 0 && (
                <span className="px-1.5 py-0.5 bg-[#FF5252]/20 text-[#FF5252] text-[9px] rounded-full font-bold animate-pulse flex items-center gap-0.5">
                  <span className="w-1.5 h-1.5 bg-[#FF5252] rounded-full" />
                  {criticalCount}
                </span>
              )}
              {warningCount > 0 && (
                <span className="px-1.5 py-0.5 bg-[#FFD600]/20 text-[#FFD600] text-[9px] rounded-full font-bold">
                  {warningCount}
                </span>
              )}
              {infoCount > 0 && (
                <span className="px-1.5 py-0.5 bg-[#00D4FF]/20 text-[#00D4FF] text-[9px] rounded-full">
                  {infoCount}
                </span>
              )}
            </div>
          </div>
          
          <span className="text-[8px] text-[#5A7A9A] font-mono">
            {unresolvedAlerts.length}未处理
          </span>
        </div>
        
        <div className="flex gap-0.5">
          <button
            onClick={() => setShowResolved(false)}
            className={`flex-1 px-1 py-0.5 text-[9px] rounded transition-colors ${
              !showResolved 
                ? 'bg-[#00D4FF]/20 text-[#00D4FF]' 
                : 'text-[#5A7A9A] hover:text-[#9FB8D1]'
            }`}
          >
            未处理({unresolvedAlerts.length})
          </button>
          <button
            onClick={() => setShowResolved(true)}
            className={`flex-1 px-1 py-0.5 text-[9px] rounded transition-colors ${
              showResolved 
                ? 'bg-[#00D4FF]/20 text-[#00D4FF]' 
                : 'text-[#5A7A9A] hover:text-[#9FB8D1]'
            }`}
          >
            已解决({resolvedAlerts.length})
          </button>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-1.5 space-y-1.5 min-h-0">
        {showResolved ? (
          resolvedAlerts.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-[#5A7A9A] py-4">
              <CheckCircle className="w-8 h-8 mb-1 opacity-30" />
              <p className="text-[9px]">暂无已解决记录</p>
            </div>
          ) : (
            resolvedAlerts.map((alert) => <AlertCard key={alert.id} alert={alert} />)
          )
        ) : (
          unresolvedAlerts.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-[#5A7A9A] py-6">
              <div className="w-12 h-12 rounded-full bg-[#00E676]/10 flex items-center justify-center mb-2">
                <CheckCircle className="w-6 h-6 text-[#00E676]" />
              </div>
              <p className="text-[11px] font-medium text-[#00E676]">无冲突预警</p>
              <p className="text-[9px] text-[#5A7A9A] mt-0.5">设备运行正常</p>
            </div>
          ) : (
            unresolvedAlerts.map((alert) => <AlertCard key={alert.id} alert={alert} />)
          )
        )}
      </div>
    </div>
  );
};
