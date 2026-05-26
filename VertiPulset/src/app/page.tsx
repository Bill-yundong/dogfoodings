'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { StatCard } from '@/components/ui/StatCard';
import { ProgressRing } from '@/components/ui/ProgressRing';
import { LineChartCard } from '@/components/charts/ChartCards';
import { useDashboardStore } from '@/store/useDashboardStore';
import { useEnergyStore } from '@/store/useEnergyStore';
import { PlaneTakeoff, PlaneLanding, Battery, Zap, Users, Clock, AlertTriangle, TrendingUp } from 'lucide-react';
import { cn, formatDateTime, getStatusColor } from '@/utils/format';
import type { Flight, Runway } from '@/types';

export default function HomePage() {
  const { flights, runways, aircraft, alerts, weather } = useDashboardStore();
  const { gridSignals, currentLoad } = useEnergyStore();
  const [turnoverRate, setTurnoverRate] = useState(0);
  const [onTimeRate, setOnTimeRate] = useState(0);
  const [energyEfficiency, setEnergyEfficiency] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setTurnoverRate(Math.floor(8 + Math.random() * 4));
      setOnTimeRate(92 + Math.random() * 6);
      setEnergyEfficiency(78 + Math.random() * 12);
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  const activeFlights = flights.filter(f => f.status !== 'arrived' && f.status !== 'cancelled');
  const departedToday = flights.filter(f => f.status === 'arrived' || f.status === 'enroute').length;
  const delayedFlights = flights.filter(f => f.delayMinutes && f.delayMinutes > 0).length;

  const turnoverData = Array.from({ length: 24 }, (_, i) => ({
    time: `${String(i).padStart(2, '0')}:00`,
    起飞: Math.floor(3 + Math.random() * 5),
    降落: Math.floor(3 + Math.random() * 5),
  }));

  const energyData = gridSignals.slice(-24).map((signal, i) => ({
    time: `${i}:00`,
    电网负载: signal.gridLoad,
    充电功率: Math.floor(20 + Math.random() * 30),
  }));

  const runwayStatusColors: Record<string, string> = {
    available: 'bg-status-green',
    occupied: 'bg-alert-orange',
    closed: 'bg-red-500',
    maintenance: 'bg-tech-purple',
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white font-display">枢纽运行总览</h1>
          <p className="text-sm text-metal-gray">实时监控 eVTOL 枢纽运行状态</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="glass-card px-4 py-2 flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-status-green pulse-dot"></div>
            <span className="text-sm text-white">系统运行正常</span>
          </div>
          <div className="glass-card px-4 py-2">
            <span className="text-xs text-metal-gray">天气</span>
            <div className="flex items-center gap-2">
              <span className="text-white">{weather.temperature}°C</span>
              <span className="text-metal-gray text-sm">风速 {weather.windSpeed}m/s</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <StatCard
          label="当前在场航班"
          value={activeFlights.length}
          unit="架"
          trend={2.5}
          icon={<PlaneTakeoff className="w-5 h-5" />}
        />
        <StatCard
          label="今日已起降"
          value={departedToday}
          unit="架次"
          trend={5.2}
          icon={<PlaneLanding className="w-5 h-5" />}
        />
        <StatCard
          label="延误航班"
          value={delayedFlights}
          unit="架"
          trend={-1.8}
          status={delayedFlights > 5 ? 'warning' : 'normal'}
          icon={<Clock className="w-5 h-5" />}
        />
        <StatCard
          label="可用飞行器"
          value={aircraft.filter(a => a.status === 'available').length}
          unit="架"
          icon={<Users className="w-5 h-5" />}
        />
      </div>

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-8 space-y-6">
          <Card title="运行效率指标" className="glow">
            <div className="grid grid-cols-4 gap-6">
              <div className="text-center">
                <ProgressRing
                  value={turnoverRate}
                  max={15}
                  size={120}
                  strokeWidth={10}
                  color="#00D4FF"
                  label={`${turnoverRate}`}
                  sublabel="架/小时"
                />
                <p className="text-xs text-metal-gray mt-2">场位周转率</p>
              </div>
              <div className="text-center">
                <ProgressRing
                  value={onTimeRate}
                  size={120}
                  strokeWidth={10}
                  color="#00FF94"
                  label={`${onTimeRate.toFixed(1)}%`}
                  sublabel="准点率"
                />
                <p className="text-xs text-metal-gray mt-2">航班准点率</p>
              </div>
              <div className="text-center">
                <ProgressRing
                  value={energyEfficiency}
                  size={120}
                  strokeWidth={10}
                  color="#7C3AED"
                  label={`${energyEfficiency.toFixed(1)}%`}
                  sublabel="效率"
                />
                <p className="text-xs text-metal-gray mt-2">能源利用效率</p>
              </div>
              <div className="text-center">
                <ProgressRing
                  value={currentLoad}
                  size={120}
                  strokeWidth={10}
                  color={currentLoad > 85 ? '#FF6B35' : '#00D4FF'}
                  label={`${currentLoad.toFixed(0)}%`}
                  sublabel="负载"
                />
                <p className="text-xs text-metal-gray mt-2">电网负载</p>
              </div>
            </div>
          </Card>

          <div className="grid grid-cols-2 gap-6">
            <LineChartCard
              title="24小时起降趋势"
              data={turnoverData}
              lines={[
                { key: '起飞', color: '#00D4FF', name: '起飞', area: true },
                { key: '降落', color: '#00FF94', name: '降落', area: true },
              ]}
              height={200}
            />
            <LineChartCard
              title="能源消耗趋势"
              data={energyData}
              lines={[
                { key: '电网负载', color: '#7C3AED', name: '电网负载 (%)', area: true },
                { key: '充电功率', color: '#FF6B35', name: '充电功率 (kW)', area: true },
              ]}
              height={200}
            />
          </div>
        </div>

        <div className="col-span-4 space-y-6">
          <Card title="跑道状态" icon={<PlaneTakeoff className="w-4 h-4" />}>
            <div className="grid grid-cols-2 gap-3">
              {runways.map((runway) => (
                <div
                  key={runway.id}
                  className="glass-card p-3 hover:border-electric-blue/40 transition-all cursor-pointer"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-white font-display">{runway.name}</span>
                    <div className={cn('w-2 h-2 rounded-full', runwayStatusColors[runway.status])}></div>
                  </div>
                  <div className="text-xs text-metal-gray">
                    <span>{runway.type === 'vertipad' ? '垂直起降坪' : '跑道'}</span>
                    <span className="mx-1">·</span>
                    <span className={getStatusColor(runway.status)}>
                      {runway.status === 'available' ? '可用' : runway.status === 'occupied' ? '占用' : runway.status === 'maintenance' ? '维护' : '关闭'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card 
            title="最近航班动态" 
            icon={<TrendingUp className="w-4 h-4" />}
            actions={<span className="text-xs text-metal-gray">最近更新</span>}
          >
            <div className="space-y-2 max-h-64 overflow-auto">
              {flights.slice(0, 8).map((flight) => (
                <div
                  key={flight.id}
                  className="flex items-center justify-between py-2 border-b border-electric-blue/10 last:border-0"
                >
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      'p-1.5 rounded',
                      flight.status === 'enroute' ? 'bg-electric-blue/20 text-electric-blue' :
                      flight.status === 'delayed' ? 'bg-alert-orange/20 text-alert-orange' :
                      'bg-status-green/20 text-status-green'
                    )}>
                      {flight.status === 'enroute' || flight.status === 'takeoff' ? (
                        <PlaneTakeoff className="w-3.5 h-3.5" />
                      ) : (
                        <PlaneLanding className="w-3.5 h-3.5" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">{flight.flightNumber}</p>
                      <p className="text-xs text-metal-gray">{flight.origin} → {flight.destination}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={cn('text-xs font-medium', getStatusColor(flight.status))}>
                      {flight.status === 'scheduled' ? '计划中' :
                       flight.status === 'boarding' ? '登机中' :
                       flight.status === 'takeoff' ? '起飞' :
                       flight.status === 'enroute' ? '飞行中' :
                       flight.status === 'landing' ? '降落' :
                       flight.status === 'arrived' ? '已到达' :
                       flight.status === 'delayed' ? '延误' : flight.status}
                    </p>
                    <p className="text-xs text-metal-gray">
                      {formatDateTime(flight.scheduledDeparture).split(' ')[1]}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card 
            title="系统告警" 
            icon={<AlertTriangle className="w-4 h-4 text-alert-orange" />}
          >
            {alerts.length > 0 ? (
              <div className="space-y-2 max-h-48 overflow-auto">
                {alerts.slice(0, 5).map((alert) => (
                  <div
                    key={alert.id}
                    className={cn(
                      'p-2 rounded-lg text-xs',
                      alert.type === 'error' ? 'bg-red-500/10 border border-red-500/30' :
                      alert.type === 'warning' ? 'bg-alert-orange/10 border border-alert-orange/30' :
                      'bg-electric-blue/10 border border-electric-blue/30'
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <AlertTriangle className={cn(
                        'w-3 h-3',
                        alert.type === 'error' ? 'text-red-500' :
                        alert.type === 'warning' ? 'text-alert-orange' : 'text-electric-blue'
                      )} />
                      <span className="text-white">{alert.message}</span>
                    </div>
                    <p className="text-metal-gray text-xs mt-1 ml-5">
                      {formatDateTime(alert.timestamp)}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-metal-gray text-sm">
                暂无告警信息
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
