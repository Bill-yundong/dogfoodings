import React, { useState } from 'react';
import { Battery, Thermometer, Activity, AlertTriangle, Zap, Filter, Search, MoreVertical, Navigation, Play, Pause } from 'lucide-react';
import type { EquipmentState, EquipmentType, DispatchCommand } from '@/types';
import { useControlTowerStore } from '@/store/controlTower';

const STATUS_CONFIG: Record<string, { label: string; color: string; bgColor: string; dotColor: string }> = {
  idle: { label: '空闲', color: 'text-[#9FB8D1]', bgColor: 'bg-[#5A7A9A]/10', dotColor: 'bg-[#5A7A9A]' },
  moving: { label: '移动', color: 'text-[#00D4FF]', bgColor: 'bg-[#00D4FF]/10', dotColor: 'bg-[#00D4FF]' },
  working: { label: '作业', color: 'text-[#00E676]', bgColor: 'bg-[#00E676]/10', dotColor: 'bg-[#00E676]' },
  charging: { label: '充电', color: 'text-[#FFD600]', bgColor: 'bg-[#FFD600]/10', dotColor: 'bg-[#FFD600]' },
  error: { label: '故障', color: 'text-[#FF5252]', bgColor: 'bg-[#FF5252]/10', dotColor: 'bg-[#FF5252]' },
  offline: { label: '离线', color: 'text-[#78909C]', bgColor: 'bg-[#78909C]/10', dotColor: 'bg-[#78909C]' },
};

const TYPE_CONFIG: Record<string, { label: string; color: string }> = {
  tug: { label: '牵引车', color: '#00D4FF' },
  baggage: { label: '行李车', color: '#00E676' },
  fuel: { label: '加油车', color: '#FFD600' },
  catering: { label: '餐车', color: '#FF6B35' },
  bus: { label: '摆渡车', color: '#A855F7' },
  bridge: { label: '廊桥', color: '#F472B6' },
};

interface EquipmentCardProps {
  equipment: EquipmentState;
  isSelected: boolean;
  onClick: () => void;
  onDispatch: () => void;
}

const EquipmentCard: React.FC<EquipmentCardProps> = ({ equipment, isSelected, onClick, onDispatch }) => {
  const status = STATUS_CONFIG[equipment.status] || STATUS_CONFIG.idle;
  const typeConfig = TYPE_CONFIG[equipment.type] || TYPE_CONFIG.tug;
  const batteryColor = equipment.battery > 50 ? '#00E676' : equipment.battery > 20 ? '#FFD600' : '#FF5252';
  
  return (
    <div
      onClick={onClick}
      className={`p-2 rounded-lg cursor-pointer transition-all duration-150 group ${
        isSelected
          ? 'bg-[#1A3152] border border-[#00D4FF] shadow-[0_0_12px_rgba(0,212,255,0.15)]'
          : 'bg-[#0A1628] border border-[#2A4A6F]/50 hover:border-[#00D4FF]/30 hover:bg-[#0F2137]'
      }`}
    >
      <div className="flex items-start justify-between mb-1.5">
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          <div className="relative flex-shrink-0">
            <div 
              className="w-7 h-7 rounded flex items-center justify-center"
              style={{ backgroundColor: `${typeConfig.color}15` }}
            >
              <Navigation 
                className="w-3.5 h-3.5" 
                style={{ color: typeConfig.color, transform: `rotate(${equipment.position.heading}rad)` }}
              />
            </div>
            <span className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full ${status.dotColor} border border-[#0A1628] ${equipment.status === 'moving' || equipment.status === 'working' ? 'animate-pulse' : ''}`} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1">
              <span className="text-xs font-bold text-[#E8F4FF] font-mono truncate">{equipment.name}</span>
              <span className={`px-1 py-0.5 rounded text-[8px] font-medium ${status.bgColor} ${status.color} flex-shrink-0`}>
                {status.label}
              </span>
            </div>
            <span className="text-[9px] text-[#5A7A9A]">{typeConfig.label}</span>
          </div>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDispatch();
          }}
          className="p-0.5 opacity-0 group-hover:opacity-100 hover:bg-[#00D4FF]/20 rounded text-[#00D4FF] transition-all flex-shrink-0"
          title="快速调度"
        >
          <MoreVertical className="w-3 h-3" />
        </button>
      </div>
      
      <div className="space-y-1">
        <div className="flex items-center gap-1.5">
          <Battery className="w-2.5 h-2.5 flex-shrink-0" style={{ color: batteryColor }} />
          <div className="flex-1 h-1 bg-[#152A47] rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{ width: `${equipment.battery}%`, backgroundColor: batteryColor }}
            />
          </div>
          <span className="text-[9px] font-mono font-medium flex-shrink-0" style={{ color: batteryColor }}>
            {equipment.battery.toFixed(0)}%
          </span>
        </div>
        
        <div className="grid grid-cols-2 gap-1">
          <div className="flex items-center gap-1 text-[9px] text-[#9FB8D1]">
            <Activity className="w-2 h-2 text-[#00D4FF]" />
            <span className="font-mono">{equipment.velocity.linear.toFixed(1)}m/s</span>
          </div>
          <div className="flex items-center gap-1 text-[9px] text-[#9FB8D1]">
            <Thermometer className="w-2 h-2 text-[#FF6B35]" />
            <span className="font-mono">{equipment.health.temperature.toFixed(0)}°</span>
          </div>
        </div>
        
        {equipment.currentTask && (
          <div className="flex items-center gap-1 mt-0.5 pt-0.5 border-t border-[#2A4A6F]/30">
            <Zap className="w-2 h-2 text-[#FFD600] flex-shrink-0" />
            <span className="text-[9px] text-[#FFD600] truncate font-mono">{equipment.currentTask}</span>
          </div>
        )}
        
        {equipment.status === 'error' && (
          <div className="flex items-center gap-1 mt-0.5 pt-0.5 border-t border-[#FF5252]/30">
            <AlertTriangle className="w-2 h-2 text-[#FF5252] animate-pulse flex-shrink-0" />
            <span className="text-[9px] text-[#FF5252]">需维护</span>
          </div>
        )}
      </div>
    </div>
  );
};

export const EquipmentPanel: React.FC = () => {
  const { equipmentStates, selectedEquipmentId, selectEquipment, addCommand } = useControlTowerStore();
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  const equipmentList = Array.from(equipmentStates.values()).sort((a, b) => {
    const priority = ['error', 'moving', 'working', 'charging', 'idle', 'offline'];
    return priority.indexOf(a.status) - priority.indexOf(b.status);
  });
  
  const filteredEquipment = equipmentList.filter((eq) => {
    if (filterType !== 'all' && eq.type !== filterType) return false;
    if (filterStatus !== 'all' && eq.status !== filterStatus) return false;
    if (searchQuery && !eq.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });
  
  const stats = {
    total: equipmentList.length,
    moving: equipmentList.filter((e) => e.status === 'moving').length,
    working: equipmentList.filter((e) => e.status === 'working').length,
    idle: equipmentList.filter((e) => e.status === 'idle').length,
    error: equipmentList.filter((e) => e.status === 'error').length,
    charging: equipmentList.filter((e) => e.status === 'charging').length,
  };

  const handleQuickDispatch = (equipment: EquipmentState) => {
    const command: DispatchCommand = {
      id: `cmd_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      priority: 'normal',
      type: 'move',
      equipmentId: equipment.id,
      targetPosition: { x: 150, y: 150, heading: 0 },
      path: [
        { x: equipment.position.x, y: equipment.position.y, t: 0 },
        { x: 150, y: 150, t: 30 },
      ],
      expectedDuration: 30000,
      scheduledTime: Date.now(),
      deadline: Date.now() + 60000,
      status: 'pending',
      progress: 0,
      protocolVersion: '1.0.0',
      signature: '',
      createdAt: Date.now(),
    };
    addCommand(command);
  };

  return (
    <div className="h-full w-full flex flex-col min-h-0">
      <div className="p-2 border-b border-[#2A4A6F] flex-shrink-0">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xs font-bold text-[#E8F4FF] font-mono flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 bg-[#00D4FF] rounded-full animate-pulse" />
            设备监控
          </h2>
          <span className="text-[10px] text-[#5A7A9A] font-mono">{filteredEquipment.length}/{stats.total}</span>
        </div>
        
        <div className="grid grid-cols-3 gap-1 mb-2">
          <div className="p-1 bg-[#0A1628] rounded text-center border border-[#2A4A6F]/30">
            <div className="text-sm font-bold text-[#00D4FF] font-mono leading-none">{stats.total}</div>
            <div className="text-[8px] text-[#5A7A9A] mt-0.5">总数</div>
          </div>
          <div className="p-1 bg-[#0A1628] rounded text-center border border-[#2A4A6F]/30">
            <div className="text-sm font-bold text-[#00E676] font-mono leading-none">{stats.working + stats.moving}</div>
            <div className="text-[8px] text-[#5A7A9A] mt-0.5">运行</div>
          </div>
          <div className="p-1 bg-[#0A1628] rounded text-center border border-[#2A4A6F]/30">
            <div className="text-sm font-bold font-mono leading-none" style={{ color: stats.error > 0 ? '#FF5252' : '#5A7A9A' }}>
              {stats.error}
            </div>
            <div className="text-[8px] text-[#5A7A9A] mt-0.5">异常</div>
          </div>
        </div>
        
        <div className="relative mb-1.5">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-[#5A7A9A]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜索设备..."
            className="w-full pl-7 pr-2 py-1.5 bg-[#0A1628] border border-[#2A4A6F]/50 rounded text-xs text-[#E8F4FF] placeholder-[#5A7A9A] focus:border-[#00D4FF]/50 outline-none transition-colors"
          />
        </div>
        
        <div className="flex gap-1">
          <div className="flex-1">
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="w-full px-1.5 py-1 bg-[#0A1628] border border-[#2A4A6F]/50 rounded text-[9px] text-[#9FB8D1] focus:border-[#00D4FF]/50 outline-none appearance-none cursor-pointer transition-colors"
            >
              <option value="all">全部类型</option>
              {Object.entries(TYPE_CONFIG).map(([type, config]) => (
                <option key={type} value={type}>{config.label}</option>
              ))}
            </select>
          </div>
          <div className="flex-1">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-1.5 py-1 bg-[#0A1628] border border-[#2A4A6F]/50 rounded text-[9px] text-[#9FB8D1] focus:border-[#00D4FF]/50 outline-none appearance-none cursor-pointer transition-colors"
            >
              <option value="all">全部状态</option>
              {Object.entries(STATUS_CONFIG).map(([status, config]) => (
                <option key={status} value={status}>{config.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-1.5 space-y-1 min-h-0">
        {filteredEquipment.map((equipment) => (
          <EquipmentCard
            key={equipment.id}
            equipment={equipment}
            isSelected={equipment.id === selectedEquipmentId}
            onClick={() => selectEquipment(equipment.id)}
            onDispatch={() => handleQuickDispatch(equipment)}
          />
        ))}
        
        {filteredEquipment.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-[#5A7A9A] py-6">
            <Filter className="w-6 h-6 mb-1.5 opacity-40" />
            <p className="text-[10px]">无匹配设备</p>
          </div>
        )}
      </div>
    </div>
  );
};
