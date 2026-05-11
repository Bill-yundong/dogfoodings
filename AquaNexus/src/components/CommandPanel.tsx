import React, { useState } from 'react';
import { Send, Play, Loader2, AlertCircle } from 'lucide-react';
import type { DispatchCommand } from '../types/hydrodynamics';

interface CommandPanelProps {
  onExecuteCommand: (command: DispatchCommand) => Promise<boolean>;
  isExecuting: boolean;
}

const COMMAND_TYPES = [
  { type: 'valve_control', label: '阀门控制', icon: '🔧' },
  { type: 'pump_adjustment', label: '泵站调节', icon: '⚡' },
  { type: 'reservoir_release', label: '水库泄洪', icon: '💧' },
  { type: 'emergency_shutdown', label: '紧急关停', icon: '🛑' },
] as const;

const PRIORITIES = [
  { value: 'low', label: '低', color: 'bg-slate-500' },
  { value: 'medium', label: '中', color: 'bg-amber-500' },
  { value: 'high', label: '高', color: 'bg-orange-500' },
  { value: 'critical', label: '紧急', color: 'bg-red-500' },
] as const;

export const CommandPanel: React.FC<CommandPanelProps> = ({
  onExecuteCommand,
  isExecuting,
}) => {
  const [selectedType, setSelectedType] = useState<DispatchCommand['type']>('valve_control');
  const [priority, setPriority] = useState<DispatchCommand['priority']>('medium');
  const [targetId, setTargetId] = useState('');
  const [parameters, setParameters] = useState({ flow: '100', pressure: '50' });
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const command: DispatchCommand = {
      id: `cmd_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: selectedType,
      targetId: targetId || 'default',
      parameters: {
        flow: parseFloat(parameters.flow),
        pressure: parseFloat(parameters.pressure),
      },
      timestamp: Date.now(),
      issuer: 'operator',
      status: 'pending',
      priority,
    };

    const success = await onExecuteCommand(command);

    setResult({
      success,
      message: success ? '指令执行成功！' : '指令执行失败，请重试。',
    });

    setTimeout(() => setResult(null), 3000);
  };

  return (
    <div className="bg-slate-800/80 rounded-xl p-4 border border-slate-700">
      <h3 className="text-lg font-semibold text-slate-100 mb-4 flex items-center gap-2">
        <Send className="w-5 h-5 text-aqua-400" />
        调度指令
      </h3>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-sm text-slate-400 mb-2 block">指令类型</label>
          <div className="grid grid-cols-2 gap-2">
            {COMMAND_TYPES.map(({ type, label, icon }) => (
              <button
                key={type}
                type="button"
                onClick={() => setSelectedType(type)}
                className={`p-3 rounded-lg text-sm transition-all ${
                  selectedType === type
                    ? 'bg-aqua-500 text-white'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                <span className="mr-1">{icon}</span>
                {label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-sm text-slate-400 mb-2 block">优先级</label>
          <div className="flex gap-2">
            {PRIORITIES.map(({ value, label, color }) => (
              <button
                key={value}
                type="button"
                onClick={() => setPriority(value)}
                className={`flex-1 p-2 rounded-lg text-sm transition-all flex items-center justify-center gap-2 ${
                  priority === value
                    ? 'bg-slate-600 text-white ring-2 ring-offset-2 ring-offset-slate-800'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                } ${priority === value ? color : ''}`}
              >
                <span className={`w-2 h-2 rounded-full ${color}`} />
                {label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-sm text-slate-400 mb-2 block">目标设备ID</label>
          <input
            type="text"
            value={targetId}
            onChange={(e) => setTargetId(e.target.value)}
            placeholder="例如: pump_001"
            className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:border-aqua-500"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm text-slate-400 mb-2 block">流量 (%)</label>
            <input
              type="number"
              value={parameters.flow}
              onChange={(e) => setParameters((p) => ({ ...p, flow: e.target.value }))}
              min="0"
              max="100"
              className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-slate-100 focus:outline-none focus:border-aqua-500"
            />
          </div>
          <div>
            <label className="text-sm text-slate-400 mb-2 block">压力 (kPa)</label>
            <input
              type="number"
              value={parameters.pressure}
              onChange={(e) => setParameters((p) => ({ ...p, pressure: e.target.value }))}
              min="0"
              max="200"
              className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-slate-100 focus:outline-none focus:border-aqua-500"
            />
          </div>
        </div>

        {result && (
          <div
            className={`p-3 rounded-lg flex items-center gap-2 ${
              result.success ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
            }`}
          >
            <AlertCircle className="w-4 h-4" />
            <span className="text-sm">{result.message}</span>
          </div>
        )}

        <button
          type="submit"
          disabled={isExecuting}
          className="w-full py-3 bg-aqua-500 hover:bg-aqua-600 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
        >
          {isExecuting ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              执行中...
            </>
          ) : (
            <>
              <Play className="w-5 h-5" />
              发送指令
            </>
          )}
        </button>
      </form>
    </div>
  );
};
