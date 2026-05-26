'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card } from '@/components/ui/Card';
import { StatCard } from '@/components/ui/StatCard';
import { ProgressRing } from '@/components/ui/ProgressRing';
import { LineChartCard } from '@/components/charts/ChartCards';
import { useBatteryStore } from '@/store/useBatteryStore';
import { Battery, AlertTriangle, TrendingDown, Activity, Thermometer, Zap, Clock, Search } from 'lucide-react';
import { cn, formatPercent, formatDateTime } from '@/utils/format';
import type { Battery as BatteryType, BatterySnapshot } from '@/types';

export default function BatteryPage() {
  const { batteries, snapshots, selectedBattery, setSelectedBattery } = useBatteryStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const filteredBatteries = useMemo(() => {
    return batteries.filter(b => {
      const matchesSearch = b.serialNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        b.id.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = filterStatus === 'all' || b.status === filterStatus;
      return matchesSearch && matchesStatus;
    });
  }, [batteries, searchTerm, filterStatus]);

  const selectedSnapshots = useMemo(() => {
    if (!selectedBattery) return [];
    return snapshots.filter(s => s.batteryId === selectedBattery.id)
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
      .slice(-50);
  }, [selectedBattery, snapshots]);

  const sohTrendData = useMemo(() => {
    return selectedSnapshots.map((s, i) => ({
      time: `#${i + 1}`,
      SOH: s.soh * 100,
      温度: s.temperature,
    }));
  }, [selectedSnapshots]);

  const socDistributionData = useMemo(() => {
    return Array.from({ length: 10 }, (_, i) => ({
      range: `${i * 10}-${(i + 1) * 10}%`,
      数量: snapshots.filter(s => s.soc >= i * 0.1 && s.soc < (i + 1) * 0.1).length,
    }));
  }, [snapshots]);

  const stats = useMemo(() => {
    const total = batteries.length;
    const healthy = batteries.filter(b => b.status === 'healthy').length;
    const degrading = batteries.filter(b => b.status === 'degrading').length;
    const needReplace = batteries.filter(b => b.status === 'replace').length;
    const avgSOH = batteries.length > 0
      ? batteries.reduce((sum, b) => sum + Math.max(0.7, 1 - b.cycleCount * 0.0001), 0) / batteries.length
      : 0;

    return { total, healthy, degrading, needReplace, avgSOH };
  }, [batteries]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white font-display">电池健康管理</h1>
          <p className="text-sm text-metal-gray">基于 IndexedDB 存储的万次起降 SOH 快照分析</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-metal-gray" />
            <input
              type="text"
              placeholder="搜索电池序列号..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-field pl-9 w-64 text-sm"
            />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="input-field w-32 text-sm"
          >
            <option value="all">全部状态</option>
            <option value="healthy">健康</option>
            <option value="degrading">衰减中</option>
            <option value="replace">需更换</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-5 gap-4">
        <StatCard
          label="电池总数"
          value={stats.total}
          unit="组"
          icon={<Battery className="w-5 h-5" />}
        />
        <StatCard
          label="健康状态"
          value={stats.healthy}
          unit="组"
          status="normal"
          icon={<Activity className="w-5 h-5" />}
        />
        <StatCard
          label="衰减中"
          value={stats.degrading}
          unit="组"
          status="warning"
          icon={<TrendingDown className="w-5 h-5" />}
        />
        <StatCard
          label="需更换"
          value={stats.needReplace}
          unit="组"
          status="error"
          icon={<AlertTriangle className="w-5 h-5" />}
        />
        <StatCard
          label="平均 SOH"
          value={formatPercent(stats.avgSOH, 1)}
          icon={<Zap className="w-5 h-5" />}
        />
      </div>

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-5 space-y-6">
          <Card title="电池列表" icon={<Battery className="w-4 h-4" />}>
            <div className="space-y-2 max-h-[500px] overflow-auto">
              {filteredBatteries.map((battery) => {
                const soh = Math.max(0.7, 1 - battery.cycleCount * 0.0001);
                const isSelected = selectedBattery?.id === battery.id;
                return (
                  <div
                    key={battery.id}
                    onClick={() => setSelectedBattery(battery)}
                    className={cn(
                      'glass-card p-3 cursor-pointer transition-all hover:border-electric-blue/40',
                      isSelected && 'border-electric-blue/60 glow-border'
                    )}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-white font-display">
                            {battery.serialNumber}
                          </span>
                          <span className={cn(
                            'px-1.5 py-0.5 rounded text-xs',
                            battery.status === 'healthy' ? 'bg-status-green/20 text-status-green' :
                            battery.status === 'degrading' ? 'bg-alert-orange/20 text-alert-orange' :
                            'bg-red-500/20 text-red-400'
                          )}>
                            {battery.status === 'healthy' ? '健康' : battery.status === 'degrading' ? '衰减中' : '需更换'}
                          </span>
                        </div>
                        <p className="text-xs text-metal-gray mt-1">
                          {battery.chemistry.toUpperCase()} · {battery.cellCount}芯 · {battery.nominalCapacity}kWh
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-electric-blue font-display">
                          {formatPercent(soh, 0)}
                        </p>
                        <p className="text-xs text-metal-gray">SOH</p>
                      </div>
                    </div>
                    <div className="mt-2 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-4">
                        <span className="text-metal-gray">循环: <span className="text-white">{battery.cycleCount}</span></span>
                        <span className="text-metal-gray">容量: <span className="text-white">{battery.currentCapacity.toFixed(0)}kWh</span></span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>

        <div className="col-span-7 space-y-6">
          {selectedBattery ? (
            <>
              <Card title={`电池详情 - ${selectedBattery.serialNumber}`} className="glow">
                <div className="grid grid-cols-4 gap-6">
                  <div className="text-center">
                    <ProgressRing
                      value={Math.max(0.7, 1 - selectedBattery.cycleCount * 0.0001) * 100}
                      size={120}
                      strokeWidth={10}
                      color={Math.max(0.7, 1 - selectedBattery.cycleCount * 0.0001) > 0.85 ? '#00FF94' : Math.max(0.7, 1 - selectedBattery.cycleCount * 0.0001) > 0.75 ? '#FF6B35' : '#EF4444'}
                      label={formatPercent(Math.max(0.7, 1 - selectedBattery.cycleCount * 0.0001), 0)}
                      sublabel="当前 SOH"
                    />
                  </div>
                  <div className="text-center">
                    <ProgressRing
                      value={selectedBattery.cycleCount}
                      max={3000}
                      size={120}
                      strokeWidth={10}
                      color="#00D4FF"
                      label={selectedBattery.cycleCount.toString()}
                      sublabel="循环次数"
                    />
                  </div>
                  <div className="text-center">
                    <ProgressRing
                      value={selectedBattery.currentCapacity}
                      max={selectedBattery.nominalCapacity}
                      size={120}
                      strokeWidth={10}
                      color="#7C3AED"
                      label={`${selectedBattery.currentCapacity.toFixed(0)}`}
                      sublabel={`可用容量 / ${selectedBattery.nominalCapacity}kWh`}
                    />
                  </div>
                  <div className="text-center">
                    <ProgressRing
                      value={selectedSnapshots.length > 0 ? selectedSnapshots[selectedSnapshots.length - 1].temperature : 25}
                      max={60}
                      size={120}
                      strokeWidth={10}
                      color="#FF6B35"
                      label={`${selectedSnapshots.length > 0 ? selectedSnapshots[selectedSnapshots.length - 1].temperature.toFixed(1) : '25'}°C`}
                      sublabel="当前温度"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-4 mt-6">
                  <div className="glass-card p-3">
                    <p className="text-xs text-metal-gray">电芯数量</p>
                    <p className="text-lg font-bold text-white font-display">{selectedBattery.cellCount}</p>
                  </div>
                  <div className="glass-card p-3">
                    <p className="text-xs text-metal-gray">额定电压</p>
                    <p className="text-lg font-bold text-white font-display">{selectedBattery.nominalVoltage}V</p>
                  </div>
                  <div className="glass-card p-3">
                    <p className="text-xs text-metal-gray">化学类型</p>
                    <p className="text-lg font-bold text-white font-display">{selectedBattery.chemistry.toUpperCase()}</p>
                  </div>
                  <div className="glass-card p-3">
                    <p className="text-xs text-metal-gray">制造日期</p>
                    <p className="text-sm font-bold text-white font-display">{formatDateTime(selectedBattery.manufactureDate).split(' ')[0]}</p>
                  </div>
                </div>
              </Card>

              {sohTrendData.length > 0 && (
                <LineChartCard
                  title="SOH 历史趋势"
                  data={sohTrendData}
                  lines={[
                    { key: 'SOH', color: '#00D4FF', name: 'SOH (%)', area: true },
                    { key: '温度', color: '#FF6B35', name: '温度 (°C)' },
                  ]}
                  height={250}
                />
              )}

              <Card title="最近 SOH 快照" icon={<Clock className="w-4 h-4" />}>
                <div className="overflow-x-auto max-h-64 overflow-auto">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>时间</th>
                        <th>SOH</th>
                        <th>SOC</th>
                        <th>温度</th>
                        <th>电压</th>
                        <th>电流</th>
                        <th>功率</th>
                        <th>阶段</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedSnapshots.slice(-10).reverse().map((snapshot) => (
                        <tr key={snapshot.id}>
                          <td className="text-white text-xs font-mono">{formatDateTime(snapshot.timestamp)}</td>
                          <td className={cn(
                            'text-xs font-medium',
                            snapshot.soh > 0.85 ? 'text-status-green' : snapshot.soh > 0.7 ? 'text-alert-orange' : 'text-red-500'
                          )}>
                            {formatPercent(snapshot.soh, 1)}
                          </td>
                          <td className="text-white text-xs">{formatPercent(snapshot.soc, 0)}</td>
                          <td className={cn(
                            'text-xs',
                            snapshot.temperature > 50 ? 'text-alert-orange' : 'text-white'
                          )}>
                            {snapshot.temperature.toFixed(1)}°C
                          </td>
                          <td className="text-white text-xs">{snapshot.voltage.toFixed(0)}V</td>
                          <td className="text-white text-xs">{snapshot.current.toFixed(0)}A</td>
                          <td className="text-white text-xs">{snapshot.power.toFixed(0)}kW</td>
                          <td className="text-xs text-electric-blue">{snapshot.operationPhase}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </>
          ) : (
            <div className="h-96 flex items-center justify-center text-metal-gray">
              <div className="text-center">
                <Battery className="w-16 h-16 mx-auto mb-4 opacity-20" />
                <p className="text-lg">选择一块电池查看详情</p>
                <p className="text-sm mt-2">系统已存储 {snapshots.length} 条 SOH 快照记录</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
