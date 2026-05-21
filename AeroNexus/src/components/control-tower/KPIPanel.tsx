import React from 'react';
import { Plane, Clock, Gauge, AlertTriangle, Zap, Activity } from 'lucide-react';

interface KPIPanelProps {
  stats: {
    total: number;
    moving: number;
    working: number;
    idle: number;
    error: number;
    charging: number;
  };
}

export const KPIPanel: React.FC<KPIPanelProps> = ({ stats }) => {
  const kpiItems = [
    {
      label: '设备总数',
      value: stats.total,
      unit: '台',
      icon: Activity,
      color: '#00D4FF',
      trend: '+2',
      trendUp: true,
    },
    {
      label: '运行中',
      value: stats.moving + stats.working,
      unit: '台',
      icon: Plane,
      color: '#00E676',
      trend: `${((stats.moving + stats.working) / stats.total * 100).toFixed(0)}%`,
      trendUp: true,
    },
    {
      label: '空闲可用',
      value: stats.idle,
      unit: '台',
      icon: Clock,
      color: '#9FB8D1',
      trend: `${(stats.idle / stats.total * 100).toFixed(0)}%`,
      trendUp: false,
    },
    {
      label: '充电中',
      value: stats.charging,
      unit: '台',
      icon: Zap,
      color: '#FFD600',
      trend: `${(stats.charging / stats.total * 100).toFixed(0)}%`,
      trendUp: true,
    },
    {
      label: '异常告警',
      value: stats.error,
      unit: '台',
      icon: AlertTriangle,
      color: stats.error > 0 ? '#FF5252' : '#5A7A9A',
      trend: stats.error > 0 ? '需关注' : '正常',
      trendUp: stats.error === 0,
      pulse: stats.error > 0,
    },
    {
      label: '调度效率',
      value: 94.7,
      unit: '%',
      icon: Gauge,
      color: '#A855F7',
      trend: '+1.2%',
      trendUp: true,
    },
  ];

  return (
    <div className="h-full w-full bg-[#0F2137] border-b border-[#2A4A6F] flex items-center px-3 gap-2">
      {kpiItems.map((item, index) => {
        const Icon = item.icon;
        return (
          <div
            key={index}
            className="flex-1 flex items-center gap-2 p-1.5 rounded-lg bg-[#0A1628]/50 border border-[#2A4A6F]/50 hover:border-[#00D4FF]/30 transition-all group"
          >
            <div
              className={`w-7 h-7 rounded flex items-center justify-center flex-shrink-0 ${item.pulse ? 'animate-pulse' : ''}`}
              style={{ backgroundColor: `${item.color}15`, boxShadow: `0 0 10px ${item.color}20` }}
            >
              <Icon className="w-3.5 h-3.5" style={{ color: item.color }} />
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-0.5">
                <span className="text-base font-bold font-mono leading-none" style={{ color: item.color, textShadow: `0 0 8px ${item.color}30` }}>
                  {item.value}
                </span>
                <span className="text-[10px] leading-none" style={{ color: item.color, opacity: 0.7 }}>
                  {item.unit}
                </span>
              </div>
              <div className="flex items-center justify-between mt-0.5">
                <span className="text-[9px] text-[#5A7A9A] truncate">{item.label}</span>
                <span className={`text-[9px] font-medium ${item.trendUp ? 'text-[#00E676]' : 'text-[#FFD600]'}`}>
                  {item.trend}
                </span>
              </div>
            </div>
            
            {index < kpiItems.length - 1 && (
              <div className="w-px h-6 bg-[#2A4A6F]/50 ml-1 flex-shrink-0" />
            )}
          </div>
        );
      })}
    </div>
  );
};
