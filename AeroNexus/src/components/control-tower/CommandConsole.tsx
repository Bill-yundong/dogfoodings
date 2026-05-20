import React, { useState } from 'react';
import { Play, Pause, Square, Clock, Send, Trash2, MoreVertical, ArrowRight, Zap } from 'lucide-react';
import type { DispatchCommand } from '@/types';
import { useControlTowerStore } from '@/store/controlTower';
import { protocolManager } from '@/utils/protocol/protocolManager';

const PRIORITY_CONFIG: Record<string, { label: string; color: string; bgColor: string }> = {
  emergency: { label: '紧急', color: 'text-[#FF5252]', bgColor: 'bg-[#FF5252]/20' },
  high: { label: '高', color: 'text-[#FF6B35]', bgColor: 'bg-[#FF6B35]/20' },
  normal: { label: '普通', color: 'text-[#00D4FF]', bgColor: 'bg-[#00D4FF]/20' },
  low: { label: '低', color: 'text-[#9FB8D1]', bgColor: 'bg-[#5A7A9A]/20' },
};

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  pending: { label: '待执行', color: 'text-[#9FB8D1]', icon: Clock },
  scheduled: { label: '已调度', color: 'text-[#FFD600]', icon: Clock },
  executing: { label: '执行中', color: 'text-[#00D4FF]', icon: Play },
  completed: { label: '已完成', color: 'text-[#00E676]', icon: Play },
  failed: { label: '失败', color: 'text-[#FF5252]', icon: Square },
  cancelled: { label: '已取消', color: 'text-[#5A7A9A]', icon: Square },
};

interface CommandCardProps {
  command: DispatchCommand;
  isSelected: boolean;
  onClick: () => void;
}

const CommandCard: React.FC<CommandCardProps> = ({ command, isSelected, onClick }) => {
  const priority = PRIORITY_CONFIG[command.priority];
  const status = STATUS_CONFIG[command.status];
  const StatusIcon = status.icon;
  
  const { updateCommand } = useControlTowerStore();
  
  const handleExecute = () => {
    const alignedCommand = protocolManager.alignCommand(command);
    updateCommand({ ...command, status: 'executing', executedAt: Date.now() });
  };
  
  const handleCancel = () => {
    updateCommand({ ...command, status: 'cancelled' });
  };
  
  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  return (
    <div
      onClick={onClick}
      className={`p-3 rounded-lg cursor-pointer transition-all duration-200 ${
        isSelected
          ? 'bg-[#1A3152] border border-[#00D4FF]'
          : 'bg-[#0A1628] border border-[#2A4A6F] hover:border-[#00D4FF]/50'
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className={`px-1.5 py-0.5 rounded text-xs ${priority.bgColor} ${priority.color}`}>
            {priority.label}
          </span>
          <span className={`flex items-center gap-1 text-xs ${status.color}`}>
            <StatusIcon className="w-3 h-3" />
            {status.label}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {command.status === 'pending' && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleExecute();
                }}
                className="p-1 hover:bg-[#00D4FF]/20 rounded text-[#00D4FF]"
              >
                <Play className="w-3 h-3" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleCancel();
                }}
                className="p-1 hover:bg-[#FF5252]/20 rounded text-[#FF5252]"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </>
          )}
          {command.status === 'executing' && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                updateCommand({ ...command, status: 'cancelled' });
              }}
              className="p-1 hover:bg-[#FF5252]/20 rounded text-[#FF5252]"
            >
              <Square className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>
      
      <div className="text-sm text-[#E8F4FF] mb-1">
        设备: {command.equipmentId}
      </div>
      
      <div className="text-xs text-[#9FB8D1] mb-2">
        目标: ({command.targetPosition.x.toFixed(1)}, {command.targetPosition.y.toFixed(1)})
      </div>
      
      {command.status === 'executing' && (
        <div className="mb-2">
          <div className="flex justify-between text-xs text-[#5A7A9A] mb-1">
            <span>进度</span>
            <span>{command.progress.toFixed(0)}%</span>
          </div>
          <div className="h-1.5 bg-[#0A1628] rounded-full overflow-hidden">
            <div
              className="h-full bg-[#00D4FF] rounded-full transition-all duration-300"
              style={{ width: `${command.progress}%` }}
            />
          </div>
        </div>
      )}
      
      <div className="flex justify-between text-xs text-[#5A7A9A]">
        <span>创建: {formatTime(command.createdAt)}</span>
        {command.expectedDuration && (
          <span>预计: {(command.expectedDuration / 1000).toFixed(0)}s</span>
        )}
      </div>
    </div>
  );
};

export const CommandConsole: React.FC = () => {
  const { commands, selectedCommandId, selectCommand, equipmentStates, addCommand } = useControlTowerStore();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newCommand, setNewCommand] = useState({
    equipmentId: '',
    targetX: '',
    targetY: '',
    priority: 'normal' as DispatchCommand['priority'],
    type: 'move' as DispatchCommand['type'],
  });
  
  const commandList = Array.from(commands.values()).sort((a, b) => {
    const priorityOrder = ['emergency', 'high', 'normal', 'low'];
    if (priorityOrder.indexOf(a.priority) !== priorityOrder.indexOf(b.priority)) {
      return priorityOrder.indexOf(a.priority) - priorityOrder.indexOf(b.priority);
    }
    return b.createdAt - a.createdAt;
  });
  
  const pendingCount = commandList.filter((c) => c.status === 'pending' || c.status === 'scheduled').length;
  const executingCount = commandList.filter((c) => c.status === 'executing').length;
  
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
      type: newCommand.type,
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
    setNewCommand({ equipmentId: '', targetX: '', targetY: '', priority: 'normal', type: 'move' });
  };

  return (
    <div className="h-full flex flex-col bg-[#0F2137] border-t border-[#2A4A6F]">
      <div className="px-4 py-3 border-b border-[#2A4A6F] flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h3 className="font-bold text-[#E8F4FF] font-mono">指令控制台</h3>
          <span className="text-xs text-[#00D4FF]">待执行: {pendingCount}</span>
          <span className="text-xs text-[#00E676]">执行中: {executingCount}</span>
        </div>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="px-3 py-1.5 bg-[#00D4FF] text-[#0A1628] text-sm font-bold rounded hover:bg-[#00B8E0] transition-colors flex items-center gap-1"
        >
          <Send className="w-4 h-4" />
          下发指令
        </button>
      </div>
      
      {showCreateForm && (
        <div className="p-4 border-b border-[#2A4A6F] bg-[#0A1628]">
          <div className="grid grid-cols-5 gap-3">
            <div>
              <label className="block text-xs text-[#9FB8D1] mb-1">选择设备</label>
              <select
                value={newCommand.equipmentId}
                onChange={(e) => setNewCommand({ ...newCommand, equipmentId: e.target.value })}
                className="w-full px-3 py-2 bg-[#0F2137] border border-[#2A4A6F] rounded text-sm text-[#E8F4FF] focus:border-[#00D4FF] outline-none"
              >
                <option value="">选择空闲设备</option>
                {availableEquipment.map((e) => (
                  <option key={e.id} value={e.id}>{e.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-[#9FB8D1] mb-1">目标X坐标</label>
              <input
                type="number"
                value={newCommand.targetX}
                onChange={(e) => setNewCommand({ ...newCommand, targetX: e.target.value })}
                placeholder="0-300"
                className="w-full px-3 py-2 bg-[#0F2137] border border-[#2A4A6F] rounded text-sm text-[#E8F4FF] focus:border-[#00D4FF] outline-none"
              />
            </div>
            <div>
              <label className="block text-xs text-[#9FB8D1] mb-1">目标Y坐标</label>
              <input
                type="number"
                value={newCommand.targetY}
                onChange={(e) => setNewCommand({ ...newCommand, targetY: e.target.value })}
                placeholder="0-350"
                className="w-full px-3 py-2 bg-[#0F2137] border border-[#2A4A6F] rounded text-sm text-[#E8F4FF] focus:border-[#00D4FF] outline-none"
              />
            </div>
            <div>
              <label className="block text-xs text-[#9FB8D1] mb-1">优先级</label>
              <select
                value={newCommand.priority}
                onChange={(e) => setNewCommand({ ...newCommand, priority: e.target.value as DispatchCommand['priority'] })}
                className="w-full px-3 py-2 bg-[#0F2137] border border-[#2A4A6F] rounded text-sm text-[#E8F4FF] focus:border-[#00D4FF] outline-none"
              >
                <option value="emergency">紧急</option>
                <option value="high">高</option>
                <option value="normal">普通</option>
                <option value="low">低</option>
              </select>
            </div>
            <div className="flex items-end gap-2">
              <button
                onClick={handleCreateCommand}
                className="flex-1 px-3 py-2 bg-[#00E676] text-[#0A1628] text-sm font-bold rounded hover:bg-[#00C853] transition-colors"
              >
                创建
              </button>
              <button
                onClick={() => setShowCreateForm(false)}
                className="px-3 py-2 bg-[#2A4A6F] text-[#9FB8D1] text-sm rounded hover:bg-[#3A5A7F] transition-colors"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}
      
      <div className="flex-1 overflow-x-auto">
        <div className="h-full p-3 flex gap-3 min-w-max">
          {['pending', 'scheduled', 'executing', 'completed', 'failed', 'cancelled'].map((status) => {
            const filteredCommands = commandList.filter((c) => c.status === status);
            const statusConfig = STATUS_CONFIG[status];
            const StatusIcon = statusConfig.icon;
            
            return (
              <div key={status} className="w-72 flex-shrink-0 flex flex-col">
                <div className={`px-3 py-2 rounded-t-lg bg-[#0A1628] border border-b-0 border-[#2A4A6F] flex items-center justify-between`}>
                  <span className={`flex items-center gap-1 text-sm font-medium ${statusConfig.color}`}>
                    <StatusIcon className="w-4 h-4" />
                    {statusConfig.label}
                  </span>
                  <span className="text-xs text-[#5A7A9A]">{filteredCommands.length}</span>
                </div>
                <div className="flex-1 bg-[#0A1628]/50 border border-[#2A4A6F] rounded-b-lg p-2 space-y-2 overflow-y-auto max-h-48">
                  {filteredCommands.map((command) => (
                    <CommandCard
                      key={command.id}
                      command={command}
                      isSelected={command.id === selectedCommandId}
                      onClick={() => selectCommand(command.id)}
                    />
                  ))}
                  {filteredCommands.length === 0 && (
                    <div className="text-center text-[#5A7A9A] text-xs py-4">
                      暂无指令
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
