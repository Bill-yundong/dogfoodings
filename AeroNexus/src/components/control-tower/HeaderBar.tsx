import React from 'react';
import { Activity, Wifi, WifiOff, AlertTriangle, Clock, Database, Cpu, Settings, Bell, User } from 'lucide-react';
import { useControlTowerStore } from '@/store/controlTower';

export const HeaderBar: React.FC = () => {
  const { networkStatus, fps, latency, lastUpdateTime, pendingSyncCount, lastSyncTime, isSimulationRunning, setSimulationRunning, simulationSpeed, setSimulationSpeed, toggleTrails, toggleLabels, showTrails, showLabels } = useControlTowerStore();
  
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

  return (
    <header className="h-14 bg-[#0F2137] border-b border-[#2A4A6F] flex items-center justify-between px-4">
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
        
        <div className="flex items-center gap-2">
          <button className="relative p-2 text-[#9FB8D1] hover:text-[#E8F4FF] transition-colors">
            <Bell className="w-5 h-5" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-[#FF5252] rounded-full" />
          </button>
          <button className="p-2 text-[#9FB8D1] hover:text-[#E8F4FF] transition-colors">
            <Settings className="w-5 h-5" />
          </button>
          <div className="w-8 h-8 rounded-full bg-[#1A3152] border border-[#2A4A6F] flex items-center justify-center">
            <User className="w-4 h-4 text-[#9FB8D1]" />
          </div>
        </div>
      </div>
    </header>
  );
};
