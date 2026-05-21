import React, { useState } from 'react';
import { Play, Square, Send, Clock, ChevronRight, Plus, X, Navigation, Gauge } from 'lucide-react';
import type { DispatchCommand, EquipmentType } from '@/types';
import { useControlTowerStore } from '@/store/controlTower';

const PRIORITY_CONFIG: Record<string, { label: string; color: string; bgColor: string; borderColor: string }> = {
  emergency: { label: '紧急', color: 'text-[#FF5252]', bgColor: 'bg-[#FF5252]/10', borderColor: 'border-[#FF5252]/50' },
  high: { label: '高', color: 'text-[#FF6B35]', bgColor: 'bg-[#FF6B35]/10', borderColor: 'border-[#FF6B35]/50' },
  normal: { label: '普通', color: 'text-[#00D4FF]', bgColor: 'bg-[#00D4FF]/10', borderColor: 'border-[#00D4FF]/50' },
  low: { label: '低', color: 'text-[#9FB8D1]', bgColor: 'bg-[#5A7A9A]/10', borderColor: 'border-[#5A7A9A]/50' },
};

const STATUS_CONFIG: Record<string, { label: string; color: string; iconColor: string; dotColor: string }> = {
  pending: { label: '待执行', color: 'text-[#9FB8D1]', iconColor: '#9FB8D1', dotColor: 'bg-[#9FB8D1]' },
  scheduled: { label: '已调度', color: 'text-[#FFD600]', iconColor: '#FFD600', dotColor: 'bg-[#FFD600]' },
  executing: { label: '执行中', color: 'text-[#00D4FF]', iconColor: '#00D4FF', dotColor: 'bg-[#00D4FF]' },
  completed: { label: '已完成', color: 'text-[#00E676]', iconColor: '#00E676', dotColor: 'bg-[#00E676]' },
  failed: { label: '失败', color: 'text-[#FF5252]', iconColor: '#FF5252', dotColor: 'bg-[#FF5252]' },
  cancelled: { label: '已取消', color: 'text-[#5A7A9A]', iconColor: '#5A7A9A', dotColor: 'bg-[#5A7A9A]' },
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
      className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-all group ${
        isSelected
          ? 'bg-[#1A3152] border border-[#00D4FF]'
          : 'bg-[#0A1628] border border-transparent hover:border-[#2A4A6F] hover:bg-[#0F2137]'
      }`}
    >
      <div className={`w-1.5 h-8 rounded-full ${status.dotColor} ${command.status === 'executing' ? 'animate-pulse' : ''}`} />
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className={`px-1 py-0.5 rounded text-[9px] font-medium ${priority.bgColor} ${priority.color}`}>
            {priority.label}
          </span>
          <span className="text-xs font-mono text-[#E8F4FF] truncate">{command.equipmentId}</span>
          <span className={`text-[10px] ${status.color} flex items-center gap-1`}>
            <span className={`w-1.5 h-1.5 rounded-full ${status.dotColor}`} />
            {status.label}
          </span>
        </div>
        
        <div className="flex items-center gap-2 text-[10px] text-[#5A7A9A]">
          <Navigation className="w-2.5 h-2.5" />
          <span>
            ({command.targetPosition.x.toFixed(0)}, {command.targetPosition.y.toFixed(0)})
          </span>
          <span>·</span>
          <Clock className="w-2.5 h-2.5" />
          <span>{formatTime(command.createdAt)}</span>
        </div>
        
        {command.status === 'executing' && (
          <div className="mt-1">
            <div className="flex justify-between text-[9px] text-[#5A7A9A] mb-0.5">
              <span>进度</span>
              <span className="font-mono">{command.progress.toFixed(0)}%</span>
            </div>
            <div className="h-1 bg-[#152A47] rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#00D4FF] to-[#00E676] rounded-full transition-all duration-300"
                style={{ width: `${command.progress}%` }}
              />
            </div>
          </div>
        )}
      </div>
      
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {command.status === 'pending' && (
          <>
            <button
              onClick={(e) => { e.stopPropagation(); handleExecute(); }}
              className="p-1 hover:bg-[#00E676]/20 rounded text-[#00E676]"
            >
              <Play className="w-3 h-3" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); handleCancel(); }}
              className="p-1 hover:bg-[#FF5252]/20 rounded text-[#FF5252]"
            >
              <Square className="w-3 h-3" />
            </button>
          </>
        )}
        {command.status === 'executing' && (
          <button
            onClick={(e) => { e.stopPropagation(); handleCancel(); }}
            className="p-1 hover:bg-[#FF5252]/20 rounded text-[#FF5252]"
          >
            <Square className="w-3 h-3" />
          </button>
        )}
        <ChevronRight className="w-3 h-3 text-[#5A7A9A]" />
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
    (e) => e.status === 'idle' && !e.currentTask
  );

  const handleCreateCommand = () => {
    if (!newCommand.equipmentId || !newCommand.targetX || !newCommand.targetY) return;
    
    const equipment = equipmentStates.get(newCommand.equipmentId);
    if (!equipment) return;
    
    const command: DispatchCommand = {
      id: `cmd_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      priority: newCommand.priority,
      type: 'move',
      equipmentId: newCommand.equipmentId,
      targetPosition: {
        x: parseFloat(newCommand.targetX),
        y: parseFloat(newCommand.targetY),
        heading: 0,
      },
      path: [
        { x: equipment.position.x, y: equipment.position.y, t: 0 },
        { x: parseFloat(newCommand.targetX), y: parseFloat(newCommand.targetY), t: 30 },
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
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between px-3 py-2 border-b border-[#2A4A6F]">
        <div className="flex items-center gap-3">
          <h3 className="text-xs font-bold text-[#E8F4FF] font-mono flex items-center gap-1.5">
            <Gauge className="w-3.5 h-3.5 text-[#00D4FF]" />
            指令控制台
          </h3>
          
          <div className="flex bg-[#0A1628] rounded p-0.5">
            {(['active', 'all', 'completed'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-2 py-0.5 text-[10px] rounded transition-colors ${
                  activeTab === tab
                    ? 'bg-[#00D4FF]/20 text-[#00D4FF]'
                    : 'text-[#5A7A9A] hover:text-[#9FB8D1]'
                }`}
              >
                {tab === 'active' ? '活跃' : tab === 'all' ? '全部' : '历史'}
                <span className="ml-1 opacity-70">({counts[tab]})</span>
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
          {showCreateForm ? <X className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
          {showCreateForm ? '取消' : '下发指令'}
        </button>
      </div>
      
      {showCreateForm && (
        <div className="px-3 py-2 border-b border-[#2A4A6F] bg-[#0A1628]">
          <div className="grid grid-cols-5 gap-2">
            <div>
              <label className="block text-[9px] text-[#5A7A9A] mb-1">选择设备</label>
              <select
                value={newCommand.equipmentId}
                onChange={(e) => setNewCommand({ ...newCommand, equipmentId: e.target.value })}
                className="w-full px-2 py-1 bg-[#0F2137] border border-[#2A4A6F] rounded text-[10px] text-[#E8F4FF] focus:border-[#00D4FF] outline-none"
              >
                <option value="">空闲设备</option>
                {availableEquipment.map((e) => (
                  <option key={e.id} value={e.id}>{e.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[9px] text-[#5A7A9A] mb-1">目标X</label>
              <input
                type="number"
                value={newCommand.targetX}
                onChange={(e) => setNewCommand({ ...newCommand, targetX: e.target.value })}
                placeholder="0-300"
                className="w-full px-2 py-1 bg-[#0F2137] border border-[#2A4A6F] rounded text-[10px] text-[#E8F4FF] focus:border-[#00D4FF] outline-none"
              />
            </div>
            <div>
              <label className="block text-[9px] text-[#5A7A9A] mb-1">目标Y</label>
              <input
                type="number"
                value={newCommand.targetY}
                onChange={(e) => setNewCommand({ ...newCommand, targetY: e.target.value })}
                placeholder="0-350"
                className="w-full px-2 py-1 bg-[#0F2137] border border-[#2A4A6F] rounded text-[10px] text-[#E8F4FF] focus:border-[#00D4FF] outline-none"
              />
            </div>
            <div>
              <label className="block text-[9px] text-[#5A7A9A] mb-1">优先级</label>
              <select
                value={newCommand.priority}
                onChange={(e) => setNewCommand({ ...newCommand, priority: e.target.value as DispatchCommand['priority'] })}
                className="w-full px-2 py-1 bg-[#0F2137] border border-[#2A4A6F] rounded text-[10px] text-[#E8F4FF] focus:border-[#00D4FF] outline-none"
              >
                <option value="emergency">紧急</option>
                <option value="high">高</option>
                <option value="normal">普通</option>
                <option value="low">低</option>
              </select>
            </div>
            <div className="flex items-end gap-1">
              <button
                onClick={handleCreateCommand}
                className="flex-1 px-2 py-1 bg-[#00E676] text-[#0A1628] text-[10px] font-medium rounded hover:bg-[#00C853] transition-colors flex items-center justify-center gap-1"
              >
                <Send className="w-3 h-3" />
                创建
              </button>
            </div>
          </div>
        </div>
      )}
      
      <div className="flex-1 overflow-y-auto p-2">
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
            <div className="h-full flex flex-col items-center justify-center text-[#5A7A9A] py-6">
              <Send className="w-6 h-6 mb-1.5 opacity-50" />
              <p className="text-[11px]">暂无{activeTab === 'active' ? '活跃' : activeTab === 'completed' ? '历史' : ''}指令</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
