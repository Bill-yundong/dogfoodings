import React, { useState } from 'react';
import { Activity, Wifi, WifiOff, AlertTriangle, Clock, Database, Cpu, Settings, Bell, User, X, CheckCircle, AlertCircle, Info } from 'lucide-react';
import { useControlTowerStore } from '@/store/controlTower';

interface Notification {
  id: string;
  type: 'info' | 'warning' | 'success';
  title: string;
  message: string;
  time: number;
  read: boolean;
}

export const HeaderBar: React.FC = () => {
  const { networkStatus, fps, latency, lastUpdateTime, pendingSyncCount, lastSyncTime, isSimulationRunning, setSimulationRunning, simulationSpeed, setSimulationSpeed, toggleTrails, toggleLabels, showTrails, showLabels, alerts } = useControlTowerStore();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([
    { id: '1', type: 'warning', title: '冲突预警', message: '检测到TG-001与BG-003潜在路径冲突', time: Date.now() - 120000, read: false },
    { id: '2', type: 'info', title: '系统通知', message: 'IndexedDB快照已自动保存', time: Date.now() - 300000, read: true },
    { id: '3', type: 'success', title: '指令完成', message: 'FL-002机位调度任务已完成', time: Date.now() - 600000, read: true },
  ]);
  
  const unreadCount = notifications.filter(n => !n.read).length;
  
  const networkConfig = {
    online: { icon: Wifi, color: 'text-[#00E676]', label: '在线' },
    weak: { icon: Wifi, color: 'text-[#FFD600]', label: '弱网' },
    offline: { icon: WifiOff, color: 'text-[#FF5252]', label: '离线' },
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

  const markAsRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'warning': return <AlertCircle className="w-3.5 h-3.5 text-[#FFD600]" />;
      case 'success': return <CheckCircle className="w-3.5 h-3.5 text-[#00E676]" />;
      default: return <Info className="w-3.5 h-3.5 text-[#00D4FF]" />;
    }
  };

  return (
    <header className="h-14 bg-[#0F2137] border-b border-[#2A4A6F] flex items-center justify-between px-4 relative">
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#00D4FF] to-[#0077B6] flex items-center justify-center">
            <Activity className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-[#E8F4FF] font-mono tracking-wider">AeroNexus</h1>
            <p className="text-xs text-[#5A7A9A]">GSE 智能调度中枢 v1.0.0</p>
          </div>
        </div>
        
        <div className="h-8 w-px bg-[#2A4A6F]" />
        
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSimulationRunning(!isSimulationRunning)}
            className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
              isSimulationRunning
                ? 'bg-[#00E676]/20 text-[#00E676] hover:bg-[#00E676]/30'
                : 'bg-[#FF5252]/20 text-[#FF5252] hover:bg-[#FF5252]/30'
            }`}
          >
            {isSimulationRunning ? '● 运行中' : '○ 已暂停'}
          </button>
          
          <div className="flex items-center gap-1">
            <span className="text-xs text-[#5A7A9A]">速度:</span>
            {[0.5, 1, 2, 5].map((speed) => (
              <button
                key={speed}
                onClick={() => setSimulationSpeed(speed)}
                className={`px-2 py-1 text-xs rounded ${
                  simulationSpeed === speed
                    ? 'bg-[#00D4FF] text-[#0A1628]'
                    : 'bg-[#0A1628] text-[#5A7A9A] hover:text-[#9FB8D1]'
                }`}
              >
                {speed}x
              </button>
            ))}
          </div>
        </div>
      </div>
      
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <button
            onClick={toggleTrails}
            className={`px-2 py-1 text-xs rounded ${
              showTrails
                ? 'bg-[#00D4FF]/20 text-[#00D4FF]'
                : 'bg-[#0A1628] text-[#5A7A9A]'
            }`}
          >
            轨迹
          </button>
          <button
            onClick={toggleLabels}
            className={`px-2 py-1 text-xs rounded ${
              showLabels
                ? 'bg-[#00D4FF]/20 text-[#00D4FF]'
                : 'bg-[#0A1628] text-[#5A7A9A]'
            }`}
          >
            标签
          </button>
        </div>
        
        <div className="h-8 w-px bg-[#2A4A6F]" />
        
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <NetworkIcon className={`w-4 h-4 ${network.color}`} />
            <span className={network.color}>{network.label}</span>
          </div>
          
          <div className="flex items-center gap-1.5 text-[#9FB8D1]">
            <Cpu className="w-4 h-4 text-[#00D4FF]" />
            <span>{fps.toFixed(0)} FPS</span>
          </div>
          
          <div className="flex items-center gap-1.5 text-[#9FB8D1]">
            <Clock className="w-4 h-4 text-[#FFD600]" />
            <span>{latency.toFixed(0)}ms</span>
          </div>
          
          <div className="flex items-center gap-1.5 text-[#9FB8D1]">
            <Database className="w-4 h-4 text-[#00E676]" />
            <span>
              {pendingSyncCount > 0 ? `${pendingSyncCount} 待同步` : `已同步 ${formatTime(lastSyncTime)}`}
            </span>
          </div>
        </div>
        
        <div className="h-8 w-px bg-[#2A4A6F]" />
        
        <div className="flex items-center gap-2 relative">
          <button 
            onClick={() => { setShowNotifications(!showNotifications); setShowSettings(false); }}
            className="relative p-2 text-[#9FB8D1] hover:text-[#E8F4FF] transition-colors"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-0.5 right-0.5 w-4 h-4 bg-[#FF5252] rounded-full text-[8px] text-white flex items-center justify-center font-bold">
                {unreadCount}
              </span>
            )}
          </button>
          
          {showNotifications && (
            <div className="absolute top-full right-0 mt-2 w-72 bg-[#0F2137] border border-[#2A4A6F] rounded-lg shadow-xl z-50 overflow-hidden animate-slide-in">
              <div className="flex items-center justify-between px-3 py-2 border-b border-[#2A4A6F]">
                <span className="text-xs font-bold text-[#E8F4FF]">消息通知</span>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={markAllAsRead}
                    className="text-[9px] text-[#00D4FF] hover:text-[#00B8E0]"
                  >
                    全部已读
                  </button>
                  <button 
                    onClick={() => setShowNotifications(false)}
                    className="text-[#5A7A9A] hover:text-[#E8F4FF]"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <div className="max-h-64 overflow-y-auto">
                {notifications.map((notification) => (
                  <div 
                    key={notification.id}
                    onClick={() => markAsRead(notification.id)}
                    className={`px-3 py-2 border-b border-[#2A4A6F]/50 cursor-pointer hover:bg-[#1A3152] transition-colors ${
                      !notification.read ? 'bg-[#00D4FF]/5' : ''
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      {getNotificationIcon(notification.type)}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-medium text-[#E8F4FF]">{notification.title}</span>
                          {!notification.read && <span className="w-1.5 h-1.5 bg-[#00D4FF] rounded-full" />}
                        </div>
                        <p className="text-[9px] text-[#5A7A9A] mt-0.5 truncate">{notification.message}</p>
                        <span className="text-[8px] text-[#5A7A9A] mt-1 block">
                          {formatTime(notification.time)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          <button 
            onClick={() => { setShowSettings(!showSettings); setShowNotifications(false); }}
            className="p-2 text-[#9FB8D1] hover:text-[#E8F4FF] transition-colors"
          >
            <Settings className="w-5 h-5" />
          </button>
          
          {showSettings && (
            <div className="absolute top-full right-12 mt-2 w-64 bg-[#0F2137] border border-[#2A4A6F] rounded-lg shadow-xl z-50 overflow-hidden animate-slide-in">
              <div className="flex items-center justify-between px-3 py-2 border-b border-[#2A4A6F]">
                <span className="text-xs font-bold text-[#E8F4FF]">系统设置</span>
                <button 
                  onClick={() => setShowSettings(false)}
                  className="text-[#5A7A9A] hover:text-[#E8F4FF]"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-[#9FB8D1]">自动刷新</span>
                  <button 
                    onClick={() => {}}
                    className="w-8 h-4 bg-[#00D4FF] rounded-full relative"
                  >
                    <span className="absolute right-0.5 top-0.5 w-3 h-3 bg-white rounded-full" />
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-[#9FB8D1]">冲突检测</span>
                  <button 
                    onClick={() => {}}
                    className="w-8 h-4 bg-[#00D4FF] rounded-full relative"
                  >
                    <span className="absolute right-0.5 top-0.5 w-3 h-3 bg-white rounded-full" />
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-[#9FB8D1]">声音提醒</span>
                  <button 
                    onClick={() => {}}
                    className="w-8 h-4 bg-[#2A4A6F] rounded-full relative"
                  >
                    <span className="absolute left-0.5 top-0.5 w-3 h-3 bg-[#5A7A9A] rounded-full" />
                  </button>
                </div>
                <div className="border-t border-[#2A4A6F] pt-2 mt-2">
                  <div className="text-[9px] text-[#5A7A9A] space-y-0.5">
                    <p>版本: v1.0.0</p>
                    <p>协议版本: 1.0.0</p>
                    <p>IndexedDB: 已启用</p>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          <div className="w-8 h-8 rounded-full bg-[#1A3152] border border-[#2A4A6F] flex items-center justify-center">
            <User className="w-4 h-4 text-[#9FB8D1]" />
          </div>
        </div>
      </div>
    </header>
  );
};
