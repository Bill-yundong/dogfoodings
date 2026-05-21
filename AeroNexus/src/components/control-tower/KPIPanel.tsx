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
      bgColor: 'bg-[#00D4FF]/10',
      borderColor: 'border-[#00D4FF]/30',
      trend: '+2',
      trendUp: true,
    },
    {
      label: '运行中',
      value: stats.moving + stats.working,
      unit: '台',
      icon: Plane,
      color: '#00E676',
      bgColor: 'bg-[#00E676]/10',
      borderColor: 'border-[#00E676]/30',
      trend: `${((stats.moving + stats.working) / stats.total * 100).toFixed(0)}%`,
      trendUp: true,
    },
    {
      label: '空闲可用',
      value: stats.idle,
      unit: '台',
      icon: Clock,
      color: '#9FB8D1',
      bgColor: 'bg-[#9FB8D1]/10',
      borderColor: 'border-[#9FB8D1]/30',
      trend: `${(stats.idle / stats.total * 100).toFixed(0)}%`,
      trendUp: false,
    },
    {
      label: '充电中',
      value: stats.charging,
      unit: '台',
      icon: Zap,
      color: '#FFD600',
      bgColor: 'bg-[#FFD600]/10',
      borderColor: 'border-[#FFD600]/30',
      trend: `${(stats.charging / stats.total * 100).toFixed(0)}%`,
      trendUp: true,
    },
    {
      label: '异常告警',
      value: stats.error,
      unit: '台',
      icon: AlertTriangle,
      color: stats.error > 0 ? '#FF5252' : '#5A7A9A',
      bgColor: stats.error > 0 ? 'bg-[#FF5252]/10' : 'bg-[#5A7A9A]/10',
      borderColor: stats.error > 0 ? 'border-[#FF5252]/30' : 'border-[#5A7A9A]/30',
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
      bgColor: 'bg-[#A855F7]/10',
      borderColor: 'border-[#A855F7]/30',
      trend: '+1.2%',
      trendUp: true,
    },
  ];

  return (
    <div className="h-16 bg-[#0F2137] border-b border-[#2A4A6F] flex items-center px-4 gap-3">
      {kpiItems.map((item, index) => {
        const Icon = item.icon;
        return (
          <div
            key={index}
            className={`flex-1 flex items-center gap-3 p-2 rounded-lg ${item.bgColor} border ${item.borderColor} transition-all hover:scale-[1.02]`}
          >
            <div
              className={`w-9 h-9 rounded-lg flex items-center justify-center ${item.bgColor} ${item.pulse ? 'animate-pulse' : ''}`}
              style={{ boxShadow: `0 0 15px ${item.color}30` }}
            >
              <Icon className="w-5 h-5" style={{ color: item.color }} />
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-1">
                <span className="text-xl font-bold font-mono" style={{ color: item.color }}>
                  {item.value}
                </span>
                <span className="text-xs" style={{ color: item.color, opacity: 0.7 }}>
                  {item.unit}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-[#5A7A9A] truncate">{item.label}</span>
                <span className={`text-[10px] font-medium ${item.trendUp ? 'text-[#00E676]' : 'text-[#FFD600]'}`}>
                  {item.trend}
                </span>
              </div>
            </div>
            
            {index < kpiItems.length - 1 && (
              <div className="w-px h-8 bg-[#2A4A6F] ml-3" />
            )}
          </div>
        );
      })}
    </div>
  );
};
