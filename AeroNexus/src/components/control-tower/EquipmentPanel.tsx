import React from 'react';
import { Battery, Thermometer, Activity, AlertTriangle, CheckCircle, Clock, Zap } from 'lucide-react';
import type { EquipmentState } from '@/types';
import { useControlTowerStore } from '@/store/controlTower';

const STATUS_LABELS: Record<string, { label: string; color: string; bgColor: string }> = {
  idle: { label: '空闲', color: 'text-[#9FB8D1]', bgColor: 'bg-[#5A7A9A]/20' },
  moving: { label: '移动中', color: 'text-[#00D4FF]', bgColor: 'bg-[#00D4FF]/20' },
  working: { label: '作业中', color: 'text-[#00E676]', bgColor: 'bg-[#00E676]/20' },
  charging: { label: '充电中', color: 'text-[#FFD600]', bgColor: 'bg-[#FFD600]/20' },
  error: { label: '故障', color: 'text-[#FF5252]', bgColor: 'bg-[#FF5252]/20' },
  offline: { label: '离线', color: 'text-[#78909C]', bgColor: 'bg-[#78909C]/20' },
};

const TYPE_LABELS: Record<string, string> = {
  tug: '牵引车',
  baggage: '行李车',
  fuel: '加油车',
  catering: '餐车',
  bus: '摆渡车',
  bridge: '廊桥',
};

interface EquipmentCardProps {
  equipment: EquipmentState;
  isSelected: boolean;
  onClick: () => void;
}

const EquipmentCard: React.FC<EquipmentCardProps> = ({ equipment, isSelected, onClick }) => {
  const status = STATUS_LABELS[equipment.status] || STATUS_LABELS.idle;
  const batteryColor = equipment.battery > 50 ? '#00E676' : equipment.battery > 20 ? '#FFD600' : '#FF5252';
  
  return (
    <div
      onClick={onClick}
      className={`p-3 rounded-lg cursor-pointer transition-all duration-200 ${
        isSelected
          ? 'bg-[#1A3152] border border-[#00D4FF] shadow-lg shadow-[#00D4FF]/20'
          : 'bg-[#0F2137] border border-[#2A4A6F] hover:border-[#00D4FF]/50'
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-lg font-mono text-[#E8F4FF]">{equipment.name}</span>
          <span className={`px-1.5 py-0.5 rounded text-xs ${status.bgColor} ${status.color}`}>
            {status.label}
          </span>
        </div>
        <span className="text-xs text-[#5A7A9A]">{TYPE_LABELS[equipment.type]}</span>
      </div>
      
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Battery className="w-4 h-4" style={{ color: batteryColor }} />
          <div className="flex-1 h-2 bg-[#0A1628] rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{ width: `${equipment.battery}%`, backgroundColor: batteryColor }}
            />
          </div>
          <span className="text-xs font-mono" style={{ color: batteryColor }}>
            {equipment.battery.toFixed(0)}%
          </span>
        </div>
        
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="flex items-center gap-1 text-[#9FB8D1]">
            <Activity className="w-3 h-3 text-[#00D4FF]" />
            <span>{equipment.velocity.linear.toFixed(1)} m/s</span>
          </div>
          <div className="flex items-center gap-1 text-[#9FB8D1]">
            <Thermometer className="w-3 h-3 text-[#FF6B35]" />
            <span>{equipment.health.temperature.toFixed(0)}°C</span>
          </div>
        </div>
        
        {equipment.currentTask && (
          <div className="flex items-center gap-1 text-xs text-[#00D4FF]">
            <Zap className="w-3 h-3" />
            <span className="truncate">任务: {equipment.currentTask}</span>
          </div>
        )}
        
        {equipment.status === 'error' && (
          <div className="flex items-center gap-1 text-xs text-[#FF5252]">
            <AlertTriangle className="w-3 h-3" />
            <span>需要维护</span>
          </div>
        )}
      </div>
    </div>
  );
};

export const EquipmentPanel: React.FC = () => {
  const { equipmentStates, selectedEquipmentId, selectEquipment } = useControlTowerStore();
  
  const equipmentList = Array.from(equipmentStates.values()).sort((a, b) => {
    const priority = ['error', 'moving', 'working', 'charging', 'idle', 'offline'];
    return priority.indexOf(a.status) - priority.indexOf(b.status);
  });
  
  const stats = {
    total: equipmentList.length,
    moving: equipmentList.filter((e) => e.status === 'moving').length,
    working: equipmentList.filter((e) => e.status === 'working').length,
    idle: equipmentList.filter((e) => e.status === 'idle').length,
    error: equipmentList.filter((e) => e.status === 'error').length,
    charging: equipmentList.filter((e) => e.status === 'charging').length,
  };

  return (
    <div className="h-full flex flex-col bg-[#0F2137] border-l border-[#2A4A6F]">
      <div className="p-4 border-b border-[#2A4A6F]">
        <h2 className="text-lg font-bold text-[#E8F4FF] mb-3 font-mono">设备监控</h2>
        
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="p-2 bg-[#0A1628] rounded">
            <div className="text-xl font-bold text-[#00D4FF]">{stats.total}</div>
            <div className="text-xs text-[#5A7A9A]">总数</div>
          </div>
          <div className="p-2 bg-[#0A1628] rounded">
            <div className="text-xl font-bold text-[#00E676]">{stats.working}</div>
            <div className="text-xs text-[#5A7A9A]">作业中</div>
          </div>
          <div className="p-2 bg-[#0A1628] rounded">
            <div className="text-xl font-bold text-[#FF5252]">{stats.error}</div>
            <div className="text-xs text-[#5A7A9A]">故障</div>
          </div>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {equipmentList.map((equipment) => (
          <EquipmentCard
            key={equipment.id}
            equipment={equipment}
            isSelected={equipment.id === selectedEquipmentId}
            onClick={() => selectEquipment(equipment.id)}
          />
        ))}
      </div>
    </div>
  );
};
