'use client';

import React from 'react';
import { Users, Clock, Gauge, AlertTriangle, TrendingUp, BarChart3 } from 'lucide-react';
import type { SimulationMetrics } from '@/types';

interface MetricsPanelProps {
  metrics: SimulationMetrics | null;
}

const formatTime = (seconds: number): string => {
  if (!isFinite(seconds) || seconds < 0) return '--:--';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const formatNumber = (num: number, decimals: number = 1): string => {
  if (!isFinite(num)) return '--';
  return num.toFixed(decimals);
};

export const MetricsPanel: React.FC<MetricsPanelProps> = ({ metrics }) => {
  const avgWaitCheckin = metrics?.avgWaitTime?.checkin || 0;
  const avgWaitSecurity = metrics?.avgWaitTime?.security || 0;
  const avgWaitShopping = metrics?.avgWaitTime?.shopping || 0;
  const avgTotalTime = metrics?.avgTotalTime || 0;

  const queueLengths = metrics?.queueLengths || {};
  const zoneDensities = metrics?.zoneDensities || {};
  const bottlenecks = metrics?.bottlenecks || [];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <MetricCard
          icon={<Users className="w-4 h-4" />}
          label="活跃旅客"
          value={metrics?.activePassengers?.toString() || '0'}
          subValue={`/ ${metrics?.totalPassengers || 0}`}
          color="cyber-blue"
        />
        <MetricCard
          icon={<TrendingUp className="w-4 h-4" />}
          label="吞吐率"
          value={formatNumber(metrics?.throughput || 0)}
          subValue="人/分钟"
          color="safe-green"
        />
        <MetricCard
          icon={<Clock className="w-4 h-4" />}
          label="平均总耗时"
          value={formatTime(avgTotalTime)}
          subValue="分钟:秒"
          color="biz-purple"
        />
        <MetricCard
          icon={<Gauge className="w-4 h-4" />}
          label="仿真速度"
          value={`${metrics?.speedMultiplier || 1}x`}
          subValue={`${formatNumber(metrics?.fps || 0, 0)} FPS`}
          color="cyber-blue"
        />
      </div>

      <div className="bg-deep-space-light/50 rounded-lg p-3 border border-cyber-blue/20">
        <h3 className="text-cyber-blue text-xs font-mono mb-3 flex items-center gap-2">
          <BarChart3 className="w-4 h-4" />
          等待时间
        </h3>
        <div className="space-y-2">
          <WaitTimeBar label="值机" value={avgWaitCheckin} max={300} color="#7c4dff" />
          <WaitTimeBar label="安检" value={avgWaitSecurity} max={300} color="#ffb300" />
          <WaitTimeBar label="购物" value={avgWaitShopping} max={600} color="#ff4081" />
        </div>
      </div>

      <div className="bg-deep-space-light/50 rounded-lg p-3 border border-cyber-blue/20">
        <h3 className="text-cyber-blue text-xs font-mono mb-3">队列长度</h3>
        <div className="grid grid-cols-2 gap-2 text-xs">
          {Object.entries(queueLengths).map(([key, value]) => (
            <div key={key} className="flex justify-between items-center">
              <span className="text-gray-400">{key.replace('queue_', '')}</span>
              <span className={`font-mono ${value > 30 ? 'text-alert-red' : value > 15 ? 'text-alert-amber' : 'text-safe-green'}`}>
                {value}
              </span>
            </div>
          ))}
        </div>
      </div>

      {bottlenecks.length > 0 && (
        <div className="bg-alert-red/10 rounded-lg p-3 border border-alert-red/30">
          <h3 className="text-alert-red text-xs font-mono mb-2 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 animate-pulse" />
            瓶颈预警
          </h3>
          <div className="space-y-1">
            {bottlenecks.map((b, i) => (
              <div key={i} className="text-xs text-alert-red/80">
                • {b.replace('zone_', '').replace('queue_', '')}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-deep-space-light/50 rounded-lg p-3 border border-cyber-blue/20">
        <h3 className="text-cyber-blue text-xs font-mono mb-3">区域密度</h3>
        <div className="space-y-1">
          {Object.entries(zoneDensities).slice(0, 5).map(([key, value]) => (
            <div key={key} className="flex items-center gap-2">
              <div className="w-16 text-xs text-gray-400 truncate">
                {key.replace('zone_', '')}
              </div>
              <div className="flex-1 h-1.5 bg-deep-space-dark rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-cyber-blue to-safe-green rounded-full transition-all"
                  style={{ width: `${Math.min(value * 100, 100)}%` }}
                />
              </div>
              <div className="w-12 text-xs font-mono text-right text-cyber-blue">
                {formatNumber(value, 2)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

interface MetricCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  subValue?: string;
  color: string;
}

const MetricCard: React.FC<MetricCardProps> = ({ icon, label, value, subValue, color }) => (
  <div className={`bg-deep-space-light/50 rounded-lg p-3 border border-${color}/20`}>
    <div className="flex items-center gap-2 text-gray-400 text-xs mb-1">
      <span className={`text-${color}`}>{icon}</span>
      {label}
    </div>
    <div className={`text-${color} font-mono text-xl font-bold`}>
      {value}
      {subValue && <span className="text-xs text-gray-500 ml-1">{subValue}</span>}
    </div>
  </div>
);

interface WaitTimeBarProps {
  label: string;
  value: number;
  max: number;
  color: string;
}

const WaitTimeBar: React.FC<WaitTimeBarProps> = ({ label, value, max, color }) => {
  const percentage = Math.min((value / max) * 100, 100);
  const isWarning = percentage > 50;
  const isDanger = percentage > 80;

  return (
    <div className="flex items-center gap-3">
      <div className="w-12 text-xs text-gray-400">{label}</div>
      <div className="flex-1 h-2 bg-deep-space-dark rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{
            width: `${percentage}%`,
            backgroundColor: isDanger ? '#ff5252' : isWarning ? '#ffb300' : color,
            boxShadow: isDanger ? '0 0 10px #ff5252' : isWarning ? '0 0 8px #ffb300' : 'none',
          }}
        />
      </div>
      <div className={`w-16 text-xs font-mono text-right ${isDanger ? 'text-alert-red' : isWarning ? 'text-alert-amber' : 'text-gray-300'}`}>
        {formatTime(value)}
      </div>
    </div>
  );
};
