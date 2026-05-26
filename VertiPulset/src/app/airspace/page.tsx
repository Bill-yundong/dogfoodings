'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card } from '@/components/ui/Card';
import { StatCard } from '@/components/ui/StatCard';
import { useAirspaceStore } from '@/store/useAirspaceStore';
import { useDashboardStore } from '@/store/useDashboardStore';
import { Radar, Plane, AlertTriangle, MapPin, Clock, TrendingUp, Shield, RefreshCw, Play, X } from 'lucide-react';
import { cn, formatDateTime } from '@/utils/format';
import { conflictDetector, resolutionGenerator } from '@/lib/airspace/trajectoryPlanner';
import type { Conflict, Trajectory4D } from '@/types';

export default function AirspacePage() {
  const { trajectories, conflicts, sectors, selectedTrajectory, setSelectedTrajectory, addConflict, resolveConflict, isDetectingConflicts, setConflicts } = useAirspaceStore();
  const { flights } = useDashboardStore();
  const [selectedSector, setSelectedSector] = useState<string | null>(null);
  const [timeSlider, setTimeSlider] = useState(0);

  const stats = useMemo(() => {
    const activeFlights = trajectories.filter(t => t.status === 'active').length;
    const highRiskConflicts = conflicts.filter(c => c.severity === 'high' || c.severity === 'critical').length;
    const totalCapacity = sectors.reduce((sum, s) => sum + s.capacity, 0);
    const currentLoad = sectors.reduce((sum, s) => sum + s.currentFlights, 0);
    const utilization = totalCapacity > 0 ? (currentLoad / totalCapacity) * 100 : 0;

    return { activeFlights, highRiskConflicts, totalCapacity, currentLoad, utilization };
  }, [trajectories, conflicts, sectors]);

  const handleDetectConflicts = () => {
    if (trajectories.length < 2) return;
    
    const detected = conflictDetector.detectConflicts(trajectories, 15);
    setConflicts(detected);
  };

  const handleResolve = (conflictId: string) => {
    resolveConflict(conflictId);
  };

  const activeSectors = selectedSector 
    ? sectors.filter(s => s.id === selectedSector)
    : sectors;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white font-display">空域管理</h1>
          <p className="text-sm text-metal-gray">4D 航迹规划与冲突检测解脱</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={handleDetectConflicts} className="btn-primary flex items-center gap-2" disabled={isDetectingConflicts}>
            {isDetectingConflicts ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Radar className="w-4 h-4" />}
            冲突检测
          </button>
        </div>
      </div>

      <div className="grid grid-cols-5 gap-4">
        <StatCard
          label="活跃航班"
          value={stats.activeFlights}
          unit="架"
          icon={<Plane className="w-5 h-5" />}
        />
        <StatCard
          label="高风险冲突"
          value={stats.highRiskConflicts}
          unit="起"
          status={stats.highRiskConflicts > 0 ? 'warning' : 'normal'}
          icon={<AlertTriangle className="w-5 h-5" />}
        />
        <StatCard
          label="空域容量"
          value={stats.totalCapacity}
          unit="架"
          icon={<Shield className="w-5 h-5" />}
        />
        <StatCard
          label="当前负载"
          value={stats.currentLoad}
          unit="架"
          icon={<TrendingUp className="w-5 h-5" />}
        />
        <StatCard
          label="空域利用率"
          value={stats.utilization.toFixed(1)}
          unit="%"
          status={stats.utilization > 80 ? 'warning' : 'normal'}
          icon={<Radar className="w-5 h-5" />}
        />
      </div>

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-8 space-y-6">
          <Card title="空域扇区概览" icon={<MapPin className="w-4 h-4" />} className="glow">
            <div className="grid grid-cols-2 gap-4">
              {activeSectors.map((sector) => (
                <div
                  key={sector.id}
                  onClick={() => setSelectedSector(selectedSector === sector.id ? null : sector.id)}
                  className={cn(
                    'glass-card p-4 cursor-pointer transition-all hover:border-electric-blue/40',
                    selectedSector === sector.id && 'border-electric-blue/60'
                  )}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h4 className="text-sm font-semibold text-white">{sector.name}</h4>
                      <p className="text-xs text-metal-gray">
                        {sector.altitudeMin}m - {sector.altitudeMax}m
                      </p>
                    </div>
                    <span className={cn(
                      'px-2 py-0.5 rounded text-xs',
                      sector.status === 'open' ? 'bg-status-green/20 text-status-green' :
                      sector.status === 'restricted' ? 'bg-alert-orange/20 text-alert-orange' :
                      'bg-red-500/20 text-red-400'
                    )}>
                      {sector.status === 'open' ? '开放' : sector.status === 'restricted' ? '限制' : '关闭'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-4">
                      <span className="text-metal-gray">
                        当前: <span className="text-electric-blue">{sector.currentFlights}</span>
                      </span>
                      <span className="text-metal-gray">
                        容量: <span className="text-white">{sector.capacity}</span>
                      </span>
                    </div>
                    <div className="w-24 h-2 bg-space-dark rounded-full overflow-hidden">
                      <div
                        className={cn(
                          'h-full rounded-full',
                          sector.currentFlights / sector.capacity > 0.8 ? 'bg-alert-orange' : 'bg-electric-blue'
                        )}
                        style={{ width: `${Math.min(100, (sector.currentFlights / sector.capacity) * 100)}%` }}
                      ></div>
                    </div>
                  </div>
                  {sector.restrictions && (
                    <div className="mt-2 pt-2 border-t border-electric-blue/10">
                      <p className="text-xs text-alert-orange">
                        ⚠ {sector.restrictions[0]}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Card>

          <Card title="4D 航迹模拟" icon={<Plane className="w-4 h-4" />}>
            <div className="space-y-4">
              <div className="h-64 bg-space-dark/50 rounded-lg border border-electric-blue/20 relative overflow-hidden">
                <div className="absolute inset-0 grid-bg opacity-30"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center text-metal-gray">
                    <Radar className="w-12 h-12 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">3D 空域可视化</p>
                    <p className="text-xs mt-1">使用 Three.js 渲染 4D 航迹</p>
                  </div>
                </div>
                <div className="absolute bottom-4 left-4 right-4">
                  <div className="flex items-center gap-4">
                    <span className="text-xs text-metal-gray w-10">T-{5 - timeSlider}min</span>
                    <input
                      type="range"
                      min="0"
                      max="5"
                      value={timeSlider}
                      onChange={(e) => setTimeSlider(Number(e.target.value))}
                      className="flex-1 h-1 bg-space-blue rounded-full appearance-none cursor-pointer"
                    />
                    <span className="text-xs text-electric-blue w-10">T+{timeSlider}min</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-3">
                <div className="glass-card p-3 text-center">
                  <p className="text-xs text-metal-gray">时间窗口</p>
                  <p className="text-lg font-bold text-electric-blue font-display">15分钟</p>
                </div>
                <div className="glass-card p-3 text-center">
                  <p className="text-xs text-metal-gray">最小间隔</p>
                  <p className="text-lg font-bold text-status-green font-display">500m</p>
                </div>
                <div className="glass-card p-3 text-center">
                  <p className="text-xs text-metal-gray">垂直间隔</p>
                  <p className="text-lg font-bold text-tech-purple font-display">100m</p>
                </div>
                <div className="glass-card p-3 text-center">
                  <p className="text-xs text-metal-gray">预测精度</p>
                  <p className="text-lg font-bold text-alert-orange font-display">95%</p>
                </div>
              </div>
            </div>
          </Card>

          <Card title="航班列表" icon={<Plane className="w-4 h-4" />}>
            <div className="overflow-x-auto max-h-64 overflow-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>航班号</th>
                    <th>航线</th>
                    <th>状态</th>
                    <th>高度</th>
                    <th>速度</th>
                    <th>航迹状态</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {flights.slice(0, 10).map((flight) => (
                    <tr key={flight.id}>
                      <td className="text-sm font-medium text-white font-display">{flight.flightNumber}</td>
                      <td className="text-sm text-metal-gray">{flight.origin} → {flight.destination}</td>
                      <td className={cn(
                        'text-xs font-medium',
                        flight.status === 'enroute' ? 'text-electric-blue' :
                        flight.status === 'delayed' ? 'text-alert-orange' : 'text-status-green'
                      )}>
                        {flight.status === 'enroute' ? '飞行中' :
                         flight.status === 'scheduled' ? '计划中' :
                         flight.status === 'boarding' ? '登机中' :
                         flight.status === 'delayed' ? '延误' : '已到达'}
                      </td>
                      <td className="text-sm text-white">{Math.floor(300 + Math.random() * 1500)}m</td>
                      <td className="text-sm text-white">{Math.floor(200 + Math.random() * 100)}km/h</td>
                      <td className={cn(
                        'text-xs',
                        Math.random() > 0.7 ? 'text-alert-orange' : 'text-status-green'
                      )}>
                        {Math.random() > 0.7 ? '有冲突风险' : '正常'}
                      </td>
                      <td>
                        <button className="text-xs text-electric-blue hover:underline">查看详情</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        <div className="col-span-4 space-y-6">
          <Card 
            title="冲突告警" 
            icon={<AlertTriangle className="w-4 h-4 text-alert-orange" />}
            actions={
              <span className="text-xs px-2 py-1 rounded bg-alert-orange/20 text-alert-orange">
                {conflicts.length} 起
              </span>
            }
          >
            {conflicts.length > 0 ? (
              <div className="space-y-3 max-h-96 overflow-auto">
                {conflicts.map((conflict) => (
                  <div
                    key={conflict.id}
                    className={cn(
                      'glass-card p-3 border-l-4',
                      conflict.severity === 'critical' ? 'border-red-500' :
                      conflict.severity === 'high' ? 'border-alert-orange' :
                      conflict.severity === 'medium' ? 'border-yellow-500' : 'border-electric-blue',
                      conflict.status === 'resolved' && 'opacity-50'
                    )}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="text-sm font-medium text-white">
                          {conflict.flightId1.slice(0, 8)} ↔ {conflict.flightId2.slice(0, 8)}
                        </p>
                        <p className="text-xs text-metal-gray">
                          预计冲突: {formatDateTime(conflict.predictedTime).split(' ')[1]}
                        </p>
                      </div>
                      <span className={cn(
                        'px-2 py-0.5 rounded text-xs',
                        conflict.severity === 'critical' ? 'bg-red-500/20 text-red-400' :
                        conflict.severity === 'high' ? 'bg-alert-orange/20 text-alert-orange' :
                        conflict.severity === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                        'bg-electric-blue/20 text-electric-blue'
                      )}>
                        {conflict.severity === 'critical' ? '严重' :
                         conflict.severity === 'high' ? '高' :
                         conflict.severity === 'medium' ? '中' : '低'}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs mb-2">
                      <div>
                        <span className="text-metal-gray">最小距离:</span>
                        <span className="text-white ml-1">{conflict.minimumDistance.toFixed(0)}m</span>
                      </div>
                      <div>
                        <span className="text-metal-gray">高度差:</span>
                        <span className="text-white ml-1">{conflict.altitudeDifference.toFixed(0)}m</span>
                      </div>
                    </div>
                    {conflict.status !== 'resolved' && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleResolve(conflict.id)}
                          className="flex-1 text-xs btn-primary py-1"
                        >
                          自动解脱
                        </button>
                        <button className="flex-1 text-xs btn-secondary py-1">
                          查看方案
                        </button>
                      </div>
                    )}
                    {conflict.status === 'resolved' && (
                      <span className="text-xs text-status-green">✓ 已解脱</span>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-48 flex items-center justify-center text-metal-gray text-center">
                <div>
                  <Shield className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">暂无冲突告警</p>
                  <p className="text-xs mt-1">点击「冲突检测」按钮扫描空域</p>
                </div>
              </div>
            )}
          </Card>

          <Card title="流量管理" icon={<TrendingUp className="w-4 h-4" />}>
            <div className="space-y-4">
              <div>
                <p className="text-xs text-metal-gray mb-2">各扇区流量分布</p>
                {sectors.map((sector) => (
                  <div key={sector.id} className="mb-2">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-white">{sector.name}</span>
                      <span className="text-metal-gray">{sector.currentFlights}/{sector.capacity}</span>
                    </div>
                    <div className="h-2 bg-space-dark rounded-full overflow-hidden">
                      <div
                        className={cn(
                          'h-full rounded-full transition-all',
                          sector.currentFlights / sector.capacity > 0.8 ? 'bg-alert-orange' :
                          sector.currentFlights / sector.capacity > 0.6 ? 'bg-electric-blue' : 'bg-status-green'
                        )}
                        style={{ width: `${Math.min(100, (sector.currentFlights / sector.capacity) * 100)}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="border-t border-electric-blue/20 pt-4">
                <p className="text-xs text-metal-gray mb-2">流量控制措施</p>
                <div className="space-y-2">
                  <div className="glass-card p-2 text-xs">
                    <div className="flex items-center gap-2 text-electric-blue mb-1">
                      <Clock className="w-3 h-3" />
                      <span>分钟间隔</span>
                    </div>
                    <p className="text-white">进港航班统一 5 分钟间隔</p>
                  </div>
                  <div className="glass-card p-2 text-xs">
                    <div className="flex items-center gap-2 text-tech-purple mb-1">
                      <MapPin className="w-3 h-3" />
                      <span>高度限制</span>
                    </div>
                    <p className="text-white">虹桥走廊 1000m 以下限制</p>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
