import React from 'react';
import { Settings, Power, PowerOff, AlertTriangle } from 'lucide-react';
import { NumberScroll } from '../common/NumberScroll';
import { StatusIndicator } from '../common/StatusIndicator';
import type { Valve } from '../../types';

interface ValveCardProps {
  valve: Valve;
  nodeName?: string;
  onToggle: () => void;
  onOpeningChange: (opening: number) => void;
  onConfigure: () => void;
}

export const ValveCard: React.FC<ValveCardProps> = ({
  valve,
  nodeName,
  onToggle,
  onOpeningChange,
  onConfigure,
}) => {
  const openingPercent = valve.opening * 100;
  const targetPercent = valve.targetOpening * 100;
  const isOpening = valve.status === 'opening';
  const isClosing = valve.status === 'closing';
  const isClosed = valve.opening <= 0.01;

  return (
    <div
      className={`p-4 rounded-lg border transition-all ${
        isClosed
          ? 'bg-slate-800/30 border-slate-700/50'
          : 'bg-slate-800 border-slate-700 hover:border-amber-500/50'
      }`}
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-white font-medium">{valve.id.toUpperCase()}</span>
            <StatusIndicator status={valve.status} size="sm" showLabel />
          </div>
          <span className="text-xs text-slate-400">{nodeName || valve.nodeId}</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={onConfigure}
            className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-slate-700 transition-all"
            title="配置"
          >
            <Settings size={14} />
          </button>
        </div>
      </div>

      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-slate-400">开度</span>
          <NumberScroll
            value={openingPercent}
            decimals={0}
            unit="%"
            className={`text-xl font-bold ${
              isClosed ? 'text-red-400' : isOpening ? 'text-green-400' : isClosing ? 'text-yellow-400' : 'text-amber-400'
            }`}
          />
        </div>

        <div className="relative h-2 bg-slate-700 rounded-full overflow-hidden">
          <div
            className={`absolute left-0 top-0 h-full transition-all duration-300 ${
              isClosed
                ? 'bg-red-500'
                : isOpening
                ? 'bg-green-500'
                : isClosing
                ? 'bg-yellow-500'
                : 'bg-amber-500'
            }`}
            style={{ width: `${openingPercent}%` }}
          />
          {isOpening || isClosing ? (
            <div
              className="absolute top-0 h-full w-1 bg-white/50 transition-all duration-300"
              style={{ left: `${targetPercent}%` }}
            />
          ) : null}
        </div>

        <input
          type="range"
          min={0}
          max={100}
          value={valve.targetOpening * 100}
          onChange={(e) => onOpeningChange(parseFloat(e.target.value) / 100)}
          className="w-full mt-2 accent-amber-500"
          disabled={valve.status === 'fault'}
        />
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="p-2 bg-slate-900/50 rounded">
          <span className="text-slate-400">类型</span>
          <p className="text-white font-medium capitalize">{valve.type}</p>
        </div>
        <div className="p-2 bg-slate-900/50 rounded">
          <span className="text-slate-400">响应时间</span>
          <p className="text-white font-medium">{valve.responseTime}s</p>
        </div>
      </div>

      <div className="flex gap-2 mt-4">
        <button
          onClick={onToggle}
          disabled={valve.status === 'fault'}
          className={`flex-1 py-2 px-3 rounded-lg flex items-center justify-center gap-2 text-sm font-medium transition-all ${
            isClosed
              ? 'bg-green-600 hover:bg-green-500 text-white'
              : 'bg-red-600 hover:bg-red-500 text-white'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {isClosed ? (
            <>
              <Power size={14} />
              开启
            </>
          ) : (
            <>
              <PowerOff size={14} />
              关闭
            </>
          )}
        </button>
      </div>

      {valve.autoProtection && (
        <div className="mt-3 flex items-center gap-1 text-xs text-green-400">
          <AlertTriangle size={12} />
          <span>自动保护已启用</span>
        </div>
      )}
    </div>
  );
};
