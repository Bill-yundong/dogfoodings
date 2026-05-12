'use client';

import { SecurityNode } from '@/types/security';
import { DoorClosed, Video, Waves, Shield } from 'lucide-react';

interface NodeStatusCardProps {
  node: SecurityNode;
  onSelect?: (node: SecurityNode) => void;
  isSelected?: boolean;
}

const statusConfig = {
  online: { color: 'bg-emerald-500', glow: 'shadow-emerald-500/30', text: '在线' },
  warning: { color: 'bg-amber-500', glow: 'shadow-amber-500/30', text: '警告' },
  offline: { color: 'bg-slate-500', glow: 'shadow-slate-500/30', text: '离线' },
  error: { color: 'bg-red-500', glow: 'shadow-red-500/30', text: '错误' },
};

const typeIcon = {
  door: DoorClosed,
  camera: Video,
  sensor: Waves,
  vault: Shield,
};

export function NodeStatusCard({ node, onSelect, isSelected }: NodeStatusCardProps) {
  const config = statusConfig[node.status];
  const Icon = typeIcon[node.type];

  return (
    <div
      onClick={() => onSelect?.(node)}
      className={`
        relative p-4 rounded-xl cursor-pointer transition-all duration-300
        bg-slate-800/50 backdrop-blur-sm border
        ${isSelected ? 'border-vault-400 shadow-lg shadow-vault-500/20' : 'border-slate-700/50'}
        hover:border-slate-600 hover:shadow-lg
      `}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className={`
            p-2.5 rounded-lg
            ${node.status === 'online' ? 'bg-vault-500/20 text-vault-400' : ''}
            ${node.status === 'warning' ? 'bg-amber-500/20 text-amber-400' : ''}
            ${node.status === 'offline' ? 'bg-slate-500/20 text-slate-400' : ''}
            ${node.status === 'error' ? 'bg-red-500/20 text-red-400' : ''}
          `}>
            <Icon size={20} />
          </div>
          <div>
            <h3 className="font-semibold text-slate-100">{node.name}</h3>
            <p className="text-sm text-slate-400">{node.location}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`w-2.5 h-2.5 rounded-full ${config.color} animate-pulse`} />
          <span className="text-xs text-slate-400">{config.text}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="bg-slate-900/50 rounded-lg p-2.5">
          <span className="text-slate-500">安全等级</span>
          <div className="flex items-center gap-1 mt-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className={`w-2 h-4 rounded-sm ${i < node.level ? 'bg-vault-500' : 'bg-slate-700'}`}
              />
            ))}
          </div>
        </div>
        <div className="bg-slate-900/50 rounded-lg p-2.5">
          <span className="text-slate-500">响应延迟</span>
          <p className="font-mono text-vault-400 mt-1">{node.latency}ms</p>
        </div>
      </div>

      <div className="mt-3 pt-3 border-t border-slate-700/50">
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span>ID: {node.id}</span>
          <span>上次心跳: {formatTime(node.lastHeartbeat)}</span>
        </div>
      </div>
    </div>
  );
}

function formatTime(timestamp: number): string {
  const diff = Date.now() - timestamp;
  if (diff < 60000) return `${Math.floor(diff / 1000)}秒前`;
  if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`;
  return new Date(timestamp).toLocaleTimeString('zh-CN');
}
