'use client';

import { Server, Users, ShieldCheck, Activity } from 'lucide-react';

interface SystemStatsProps {
  stats: {
    totalNodes: number;
    onlineNodes: number;
    offlineNodes: number;
    warningNodes: number;
    authorizedUsers: number;
    accessEventsToday: number;
    avgLatency: number;
  };
}

export function SystemStats({ stats }: SystemStatsProps) {
  const statCards = [
    {
      label: '节点总数',
      value: stats.totalNodes,
      icon: Server,
      color: 'text-vault-400',
      bg: 'bg-vault-500/10',
    },
    {
      label: '在线节点',
      value: stats.onlineNodes,
      icon: ShieldCheck,
      color: 'text-emerald-500',
      bg: 'bg-emerald-500/10',
      subValue: `${((stats.onlineNodes / stats.totalNodes) * 100).toFixed(0)}%`,
    },
    {
      label: '授权用户',
      value: stats.authorizedUsers,
      icon: Users,
      color: 'text-blue-500',
      bg: 'bg-blue-500/10',
    },
    {
      label: '今日事件',
      value: stats.accessEventsToday,
      icon: Activity,
      color: 'text-amber-500',
      bg: 'bg-amber-500/10',
      subValue: `平均延迟 ${stats.avgLatency}ms`,
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {statCards.map((card, index) => {
        const Icon = card.icon;
        return (
          <div
            key={index}
            className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-4"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-slate-400">{card.label}</p>
                <p className={`text-2xl font-bold mt-1 ${card.color}`}>{card.value}</p>
                {card.subValue && (
                  <p className="text-xs text-slate-500 mt-1">{card.subValue}</p>
                )}
              </div>
              <div className={`p-2.5 rounded-lg ${card.bg}`}>
                <Icon size={20} className={card.color} />
              </div>
            </div>
            
            {card.label === '在线节点' && (
              <div className="mt-3 flex items-center gap-2 text-xs">
                <span className="flex items-center gap-1 text-emerald-500">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  {stats.onlineNodes} 在线
                </span>
                <span className="flex items-center gap-1 text-amber-500">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                  {stats.warningNodes} 警告
                </span>
                <span className="flex items-center gap-1 text-slate-500">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                  {stats.offlineNodes} 离线
                </span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
