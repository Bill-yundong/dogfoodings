import React, { useState } from 'react';
import { Play, Square, Send, Clock, Plus, X, Navigation, Gauge, AlertCircle } from 'lucide-react';
import type { DispatchCommand, EquipmentType } from '@/types';
import { useControlTowerStore } from '@/store/controlTower';

const PRIORITY_CONFIG: Record<string, { label: string; color: string; bgColor: string; borderColor: string; barColor: string }> = {
  emergency: { label: '紧急', color: 'text-[#FF5252]', bgColor: 'bg-[#FF5252]/15', borderColor: 'border-[#FF5252]/50', barColor: '#FF5252' },
  high: { label: '高', color: 'text-[#FF6B35]', bgColor: 'bg-[#FF6B35]/15', borderColor: 'border-[#FF6B35]/50', barColor: '#FF6B35' },
  normal: { label: '普通', color: 'text-[#00D4FF]', bgColor: 'bg-[#00D4FF]/15', borderColor: 'border-[#00D4FF]/50', barColor: '#00D4FF' },
  low: { label: '低', color: 'text-[#9FB8D1]', bgColor: 'bg-[#5A7A9A]/15', borderColor: 'border-[#5A7A9A]/50', barColor: '#9FB8D1' },
};

const STATUS_CONFIG: Record<string, { label: string; color: string; iconColor: string; dotColor: string }> = {
  pending: { label: '待执行', color: 'text-[#9FB8D1]', iconColor: '#9FB8D1', dotColor: 'bg-[#9FB8D1]' },
  scheduled: { label: '已调度', color: 'text-[#FFD600]', iconColor: '#FFD600', dotColor: 'bg-[#FFD600]' },
  executing: { label: '执行中', color: 'text-[#00D4FF]', iconColor: '#00D4FF', dotColor: 'bg-[#00D4FF]' },
  completed: { label: '已完成', color: 'text-[#00E676]', iconColor: '#00E676', dotColor: 'bg-[#00E676]' },
  failed: { label: '失败', color: 'text-[#FF5252]', iconColor: '#FF5252', dotColor: 'bg-[#FF5252]' },
  cancelled: { label: '已取消', color: 'text-[#5A7A9A]', iconColor: '#5A7A9A', dotColor: 'bg-[#5A7A9A]' },
};

const TYPE_CONFIG: Record<string, { label: string; color: string }> = {
  tug: { label: '牵引车', color: '#00D4FF' },
  baggage: { label: '行李车', color: '#00E676' },
  fuel: { label: '加油车', color: '#FFD600' },
  catering: { label: '餐车', color: '#FF6B35' },
  bus: { label: '摆渡车', color: '#A855F7' },
  bridge: { label: '廊桥', color: '#F472B6' },
};

interface CommandItemProps {
  command: DispatchCommand;
  isSelected: boolean;
  onClick: () => void;
}

const CommandItem: React.FC<CommandItemProps> = ({ command, isSelected, onClick }) => {
  const priority = PRIORITY_CONFIG[command.priority];
  const status = STATUS_CONFIG[command.status];
  const { updateCommand } = useControlTowerStore();
  
  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const handleExecute = () => {
    updateCommand({ ...command, status: 'executing', executedAt: Date.now() });
  };

  const handleCancel = () => {
    updateCommand({ ...command, status: 'cancelled' });
  };

  return (
    <div
      onClick={onClick}
      className={`flex items-center gap-2 p-1.5 rounded cursor-pointer transition-all group ${
        isSelected
          ? 'bg-[#1A3152] border border-[#00D4FF]'
          : 'bg-[#0A1628] border border-transparent hover:border-[#2A4A6F] hover:bg-[#0F2137]'
      }`}
    >
      <div className={`w-1 h-6 rounded-full ${status.dotColor} flex-shrink-0 ${command.status === 'executing' ? 'animate-pulse' : ''}`} />
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className={`px-1 py-0.5 rounded text-[8px] font-medium ${priority.bgColor} ${priority.color} flex-shrink-0`}>
            {priority.label}
          </span>
          <span className="text-[11px] font-mono text-[#E8F4FF] truncate">{command.equipmentId}</span>
          <span className={`text-[9px] ${status.color} flex items-center gap-0.5 flex-shrink-0`}>
            <span className={`w-1 h-1 rounded-full ${status.dotColor}`} />
            {status.label}
          </span>
          <span className="text-[9px] text-[#5A7A9A] ml-auto flex-shrink-0">
            {formatTime(command.createdAt)}
          </span>
        </div>
        
        <div className="flex items-center gap-1.5 mt-0.5">
          <Navigation className="w-2 h-2 text-[#5A7A9A] flex-shrink-0" />
          <span className="text-[9px] text-[#5A7A9A] font-mono">
            ({command.targetPosition.x.toFixed(0)}, {command.targetPosition.y.toFixed(0)})
          </span>
          
          {command.status === 'executing' && (
            <div className="flex-1 flex items-center gap-1.5 ml-1">
              <div className="flex-1 h-1 bg-[#152A47] rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{ 
                    width: `${command.progress}%`,
                    background: `linear-gradient(90deg, ${priority.barColor}80, ${priority.barColor})`,
                    boxShadow: `0 0 6px ${priority.barColor}50`
                  }}
                />
              </div>
              <span className="text-[9px] text-[#5A7A9A] font-mono flex-shrink-0">{command.progress.toFixed(0)}%</span>
            </div>
          )}
        </div>
      </div>
      
      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
        {command.status === 'pending' && (
          <>
            <button
              onClick={(e) => { e.stopPropagation(); handleExecute(); }}
              className="p-0.5 hover:bg-[#00E676]/20 rounded text-[#00E676]"
              title="执行"
            >
              <Play className="w-2.5 h-2.5" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); handleCancel(); }}
              className="p-0.5 hover:bg-[#FF5252]/20 rounded text-[#FF5252]"
              title="取消"
            >
              <Square className="w-2.5 h-2.5" />
            </button>
          </>
        )}
        {command.status === 'executing' && (
          <button
            onClick={(e) => { e.stopPropagation(); handleCancel(); }}
            className="p-0.5 hover:bg-[#FF5252]/20 rounded text-[#FF5252]"
            title="停止"
          >
            <Square className="w-2.5 h-2.5" />
          </button>
        )}
      </div>
    </div>
  );
};

export const CommandConsole: React.FC = () => {
  const { commands, selectedCommandId, selectCommand, equipmentStates, addCommand } = useControlTowerStore();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'active' | 'completed'>('active');
  const [newCommand, setNewCommand] = useState({
    equipmentId: '',
    targetX: '',
    targetY: '',
    priority: 'normal' as DispatchCommand['priority'],
  });
  const [createError, setCreateError] = useState<string | null>(null);
  
  const commandList = Array.from(commands.values()).sort((a, b) => {
    const priorityOrder = ['emergency', 'high', 'normal', 'low'];
    if (priorityOrder.indexOf(a.priority) !== priorityOrder.indexOf(b.priority)) {
      return priorityOrder.indexOf(a.priority) - priorityOrder.indexOf(b.priority);
    }
    return b.createdAt - a.createdAt;
  });
  
  const filteredCommands = commandList.filter((c) => {
    if (activeTab === 'active') return c.status === 'pending' || c.status === 'scheduled' || c.status === 'executing';
    if (activeTab === 'completed') return c.status === 'completed' || c.status === 'failed' || c.status === 'cancelled';
    return true;
  });
  
  const counts = {
    all: commandList.length,
    active: commandList.filter(c => c.status === 'pending' || c.status === 'scheduled' || c.status === 'executing').length,
    completed: commandList.filter(c => c.status === 'completed' || c.status === 'failed' || c.status === 'cancelled').length,
  };
  
  const availableEquipment = Array.from(equipmentStates.values()).filter(
    (e) => e.status !== 'error' && e.status !== 'offline'
  );

  const handleCreateCommand = () => {
    setCreateError(null);
    
    if (!newCommand.equipmentId) {
      setCreateError('请选择设备');
      return;
    }
    if (!newCommand.targetX || !newCommand.targetY) {
      setCreateError('请输入目标坐标');
      return;
    }
    
    const targetX = parseFloat(newCommand.targetX);
    const targetY = parseFloat(newCommand.targetY);
    
    if (isNaN(targetX) || isNaN(targetY)) {
      setCreateError('坐标格式不正确');
      return;
    }
    
    if (targetX < 0 || targetX > 400 || targetY < 0 || targetY > 400) {
      setCreateError('坐标范围应在 0-400 之间');
      return;
    }
    
    const equipment = equipmentStates.get(newCommand.equipmentId);
    if (!equipment) {
      setCreateError('设备不存在');
      return;
    }
    
    const command: DispatchCommand = {
      id: `cmd_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      priority: newCommand.priority,
      type: 'move',
      equipmentId: newCommand.equipmentId,
      targetPosition: {
        x: targetX,
        y: targetY,
        heading: 0,
      },
      path: [
        { x: equipment.position.x, y: equipment.position.y, t: 0 },
        { x: targetX, y: targetY, t: 30 },
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
    setShowCreateForm(false);
    setNewCommand({ equipmentId: '', targetX: '', targetY: '', priority: 'normal' });
  };

  return (
    <div className="h-full w-full flex flex-col min-h-0">
      <div className="flex items-center justify-between px-2 py-1.5 border-b border-[#2A4A6F] flex-shrink-0">
        <div className="flex items-center gap-2">
          <h3 className="text-[11px] font-bold text-[#E8F4FF] font-mono flex items-center gap-1">
            <Gauge className="w-3 h-3 text-[#00D4FF]" />
            指令控制台
          </h3>
          
          <div className="flex bg-[#0A1628] rounded p-0.5">
            {(['active', 'all', 'completed'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-1.5 py-0.5 text-[9px] rounded transition-colors ${
                  activeTab === tab
                    ? 'bg-[#00D4FF]/20 text-[#00D4FF]'
                    : 'text-[#5A7A9A] hover:text-[#9FB8D1]'
                }`}
              >
                {tab === 'active' ? '活跃' : tab === 'all' ? '全部' : '历史'}
                <span className="ml-0.5 opacity-70">({counts[tab]})</span>
              </button>
            ))}
          </div>
        </div>
        
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className={`px-2 py-1 text-[10px] font-medium rounded flex items-center gap-1 transition-colors ${
            showCreateForm
              ? 'bg-[#FF5252]/20 text-[#FF5252]'
              : 'bg-[#00D4FF] text-[#0A1628] hover:bg-[#00B8E0]'
          }`}
        >
          {showCreateForm ? <X className="w-2.5 h-2.5" /> : <Plus className="w-2.5 h-2.5" />}
          {showCreateForm ? '取消' : '下发'}
        </button>
      </div>
      
      {showCreateForm && (
        <div className="px-2 py-1.5 border-b border-[#2A4A6F] bg-[#0A1628] flex-shrink-0">
          <div className="grid grid-cols-5 gap-1.5">
            <div>
              <label className="block text-[8px] text-[#5A7A9A] mb-0.5">设备</label>
              <select
                value={newCommand.equipmentId}
                onChange={(e) => { setNewCommand({ ...newCommand, equipmentId: e.target.value }); setCreateError(null); }}
                className={`w-full px-1.5 py-1 bg-[#0F2137] border rounded text-[10px] text-[#E8F4FF] focus:border-[#00D4FF] outline-none transition-colors ${
                  createError && !newCommand.equipmentId ? 'border-[#FF5252]' : 'border-[#2A4A6F]'
                }`}
              >
                <option value="">选择</option>
                {availableEquipment.length === 0 ? (
                  <option value="" disabled>无可用设备</option>
                ) : (
                  availableEquipment.map((e) => (
                    <option key={e.id} value={e.id}>{e.name} ({TYPE_CONFIG[e.type as EquipmentType]?.label || e.type})</option>
                  ))
                )}
              </select>
            </div>
            <div>
              <label className="block text-[8px] text-[#5A7A9A] mb-0.5">X坐标</label>
              <input
                type="number"
                value={newCommand.targetX}
                onChange={(e) => { setNewCommand({ ...newCommand, targetX: e.target.value }); setCreateError(null); }}
                placeholder="0-400"
                className={`w-full px-1.5 py-1 bg-[#0F2137] border rounded text-[10px] text-[#E8F4FF] focus:border-[#00D4FF] outline-none transition-colors ${
                  createError && !newCommand.targetX ? 'border-[#FF5252]' : 'border-[#2A4A6F]'
                }`}
              />
            </div>
            <div>
              <label className="block text-[8px] text-[#5A7A9A] mb-0.5">Y坐标</label>
              <input
                type="number"
                value={newCommand.targetY}
                onChange={(e) => { setNewCommand({ ...newCommand, targetY: e.target.value }); setCreateError(null); }}
                placeholder="0-400"
                className={`w-full px-1.5 py-1 bg-[#0F2137] border rounded text-[10px] text-[#E8F4FF] focus:border-[#00D4FF] outline-none transition-colors ${
                  createError && !newCommand.targetY ? 'border-[#FF5252]' : 'border-[#2A4A6F]'
                }`}
              />
            </div>
            <div>
              <label className="block text-[8px] text-[#5A7A9A] mb-0.5">优先级</label>
              <select
                value={newCommand.priority}
                onChange={(e) => setNewCommand({ ...newCommand, priority: e.target.value as DispatchCommand['priority'] })}
                className="w-full px-1.5 py-1 bg-[#0F2137] border border-[#2A4A6F] rounded text-[10px] text-[#E8F4FF] focus:border-[#00D4FF] outline-none"
              >
                <option value="emergency">紧急</option>
                <option value="high">高</option>
                <option value="normal">普通</option>
                <option value="low">低</option>
              </select>
            </div>
            <div className="flex flex-col gap-0.5">
              <button
                onClick={handleCreateCommand}
                className="w-full px-2 py-1 bg-[#00E676] text-[#0A1628] text-[10px] font-medium rounded hover:bg-[#00C853] transition-colors flex items-center justify-center gap-0.5"
              >
                <Send className="w-2.5 h-2.5" />
                创建
              </button>
            </div>
          </div>
          
          {createError && (
            <div className="mt-1 px-1.5 py-1 bg-[#FF5252]/15 border border-[#FF5252]/30 rounded flex items-center gap-1 animate-slide-in">
              <AlertCircle className="w-3 h-3 text-[#FF5252] flex-shrink-0" />
              <span className="text-[9px] text-[#FF5252]">{createError}</span>
            </div>
          )}
        </div>
      )}
      
      <div className="flex-1 overflow-y-auto p-1.5 min-h-0">
        <div className="space-y-1">
          {filteredCommands.map((command) => (
            <CommandItem
              key={command.id}
              command={command}
              isSelected={command.id === selectedCommandId}
              onClick={() => selectCommand(command.id)}
            />
          ))}
          
          {filteredCommands.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-[#5A7A9A] py-4">
              <AlertCircle className="w-5 h-5 mb-1 opacity-40" />
              <p className="text-[10px]">暂无{activeTab === 'active' ? '活跃' : activeTab === 'completed' ? '历史' : ''}指令</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
