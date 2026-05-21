import React from 'react';
import { Server, Cpu, Database, HardDrive, Wifi, Clock, Activity, Shield } from 'lucide-react';
import { useControlTowerStore } from '@/store/controlTower';

export const SystemStatus: React.FC = () => {
  const { commands, alerts, equipmentStates, networkStatus, fps, latency, lastSyncTime } = useControlTowerStore();
  
  const equipmentList = Array.from(equipmentStates.values());
  const activeCommands = Array.from(commands.values()).filter(c => c.status === 'executing').length;
  const unresolvedAlerts = Array.from(alerts.values()).filter(a => !a.resolved).length;
  
  const stats = {
    moving: equipmentList.filter((e) => e.status === 'moving').length,
    working: equipmentList.filter((e) => e.status === 'working').length,
    charging: equipmentList.filter((e) => e.status === 'charging').length,
    idle: equipmentList.filter((e) => e.status === 'idle').length,
  };

  const networkConfig = {
    online: { icon: Wifi, color: '#00E676', label: '在线', bg: 'bg-[#00E676]/10' },
    weak: { icon: Wifi, color: '#FFD600', label: '弱网', bg: 'bg-[#FFD600]/10' },
    offline: { icon: Wifi, color: '#FF5252', label: '离线', bg: 'bg-[#FF5252]/10' },
  };
  
  const network = networkConfig[networkStatus];
  const NetworkIcon = network.icon;

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const statusItems = [
    {
      icon: Server,
      label: '活动指令',
      value: activeCommands,
      max: 10,
      color: '#00D4FF',
      unit: '条',
    },
    {
      icon: Shield,
      label: '待处理预警',
      value: unresolvedAlerts,
      max: 5,
      color: unresolvedAlerts > 0 ? '#FF5252' : '#00E676',
      unit: '条',
    },
    {
      icon: Cpu,
      label: '渲染帧率',
      value: fps.toFixed(0),
      color: fps > 50 ? '#00E676' : fps > 30 ? '#FFD600' : '#FF5252',
      unit: 'FPS',
      showProgress: false,
    },
    {
      icon: Clock,
      label: '计算延迟',
      value: latency.toFixed(0),
      color: latency < 20 ? '#00E676' : latency < 50 ? '#FFD600' : '#FF5252',
      unit: 'ms',
      showProgress: false,
    },
    {
      icon: Database,
      label: '数据同步',
      value: formatTime(lastSyncTime),
      color: '#9FB8D1',
      showProgress: false,
    },
  ];

  return (
    <div className="h-full flex flex-col bg-[#0F2137]">
      <div className="px-4 py-3 border-b border-[#2A4A6F] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h3 className="font-bold text-[#E8F4FF] font-mono flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-[#00D4FF] rounded-full animate-pulse" />
            系统状态
          </h3>
        </div>
        <div className={`px-2 py-0.5 ${network.bg} rounded text-xs flex items-center gap-1`}>
          <NetworkIcon className="w-3 h-3" style={{ color: network.color }} />
          <span style={{ color: network.color }}>{network.label}</span>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {statusItems.map((item, index) => {
          const Icon = item.icon;
          const showProgress = item.showProgress !== false && item.max !== undefined;
          const progress = item.max ? Math.min(100, (Number(item.value) / item.max) * 100) : 0;
          
          return (
            <div
              key={index}
              className="p-3 bg-[#0A1628] rounded-lg border border-[#2A4A6F] hover:border-[#00D4FF]/30 transition-all group"
            >
              <div className="flex items-center gap-2 mb-2">
                <Icon className="w-4 h-4 text-[#5A7A9A] group-hover:text-[#00D4FF] transition-colors" />
                <span className="text-xs text-[#5A7A9A]">{item.label}</span>
              </div>
              
              <div className="flex items-end justify-between">
                <span 
                  className="text-lg font-bold font-mono" 
                  style={{ color: item.color, textShadow: `0 0 10px ${item.color}30` }}
                >
                  {item.value}
                  {item.unit && <span className="text-xs ml-1 opacity-70">{item.unit}</span>}
                </span>
                
                {showProgress && (
                  <span className="text-[10px] text-[#5A7A9A]">
                    {item.value}/{item.max}
                  </span>
                )}
              </div>
              
              {showProgress && (
                <div className="mt-2 w-full h-1 bg-[#152A47] rounded-full overflow-hidden">
                  <div 
                    className="h-full rounded-full transition-all duration-500"
                    style={{ 
                      width: `${progress}%`,
                      backgroundColor: item.color,
                      boxShadow: `0 0 8px ${item.color}`,
                    }}
                  />
                </div>
              )}
            </div>
          );
        })}
        
        <div className="p-3 bg-[#0A1628] rounded-lg border border-[#2A4A6F]">
          <div className="flex items-center gap-2 mb-3">
            <Activity className="w-4 h-4 text-[#5A7A9A]" />
            <span className="text-xs text-[#5A7A9A]">设备分布</span>
          </div>
          <div className="grid grid-cols-4 gap-2">
            <div className="text-center p-2 bg-[#00D4FF]/5 rounded border border-[#00D4FF]/20">
              <div className="text-lg font-bold text-[#00D4FF] font-mono">{stats.moving}</div>
              <div className="text-[10px] text-[#5A7A9A]">移动中</div>
            </div>
            <div className="text-center p-2 bg-[#00E676]/5 rounded border border-[#00E676]/20">
              <div className="text-lg font-bold text-[#00E676] font-mono">{stats.working}</div>
              <div className="text-[10px] text-[#5A7A9A]">作业中</div>
            </div>
            <div className="text-center p-2 bg-[#FFD600]/5 rounded border border-[#FFD600]/20">
              <div className="text-lg font-bold text-[#FFD600] font-mono">{stats.charging}</div>
              <div className="text-[10px] text-[#5A7A9A]">充电中</div>
            </div>
            <div className="text-center p-2 bg-[#9FB8D1]/5 rounded border border-[#9FB8D1]/20">
              <div className="text-lg font-bold text-[#9FB8D1] font-mono">{stats.idle}</div>
              <div className="text-[10px] text-[#5A7A9A]">空闲</div>
            </div>
          </div>
        </div>
        
        <div className="p-3 bg-[#0A1628] rounded-lg border border-[#2A4A6F]">
          <div className="flex items-center gap-2 mb-3">
            <HardDrive className="w-4 h-4 text-[#5A7A9A]" />
            <span className="text-xs text-[#5A7A9A]">快速操作</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button className="p-2 bg-[#FF5252]/10 text-[#FF5252] text-xs rounded hover:bg-[#FF5252]/20 transition-colors border border-[#FF5252]/30 flex items-center justify-center gap-1">
              <Shield className="w-3 h-3" />
              紧急停止
            </button>
            <button className="p-2 bg-[#00E676]/10 text-[#00E676] text-xs rounded hover:bg-[#00E676]/20 transition-colors border border-[#00E676]/30 flex items-center justify-center gap-1">
              <Server className="w-3 h-3" />
              全部召回
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
