'use client';

import React from 'react';
import { Shield, Users, Clock, AlertTriangle, TrendingUp } from 'lucide-react';
import type { SimulationMetrics } from '@/types';

interface SecurityPanelProps {
  metrics: SimulationMetrics | null;
}

export const SecurityPanel: React.FC<SecurityPanelProps> = ({ metrics }) => {
  const queueLengths = metrics?.queueLengths || {};
  const avgWaitTime = metrics?.avgWaitTime || {};
  const zoneDensities = metrics?.zoneDensities || {};
  const bottlenecks = metrics?.bottlenecks || [];

  const securityQueues = Object.entries(queueLengths)
    .filter(([key]) => key.includes('security'))
    .map(([key, length]) => ({
      id: key,
      name: key.replace('queue_security_', '通道 ').toUpperCase(),
      length,
      avgWait: (avgWaitTime.security || 0) * (length / Math.max(1, Object.values(queueLengths).reduce((a, b) => a + b, 0))),
    }));

  const securityBottlenecks = bottlenecks.filter(b =>
    b.includes('security') || b === 'zone_security'
  );

  return (
    <div className="h-full flex flex-col gap-4 p-6">
      <div className="flex items-center gap-3 mb-2">
        <div className="p-2 bg-alert-amber/20 rounded-lg">
          <Shield className="w-6 h-6 text-alert-amber" />
        </div>
        <div>
          <h1 className="text-2xl font-display text-cyber-blue">安检中枢</h1>
          <p className="text-sm text-gray-400">多通道安检排队仿真与效率分析</p>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <StatCard
          icon={<Users className="w-5 h-5" />}
          label="安检区人数"
          value={Math.floor(zoneDensities['zone_security'] * 100 || 0).toString()}
          color="alert-amber"
        />
        <StatCard
          icon={<Clock className="w-5 h-5" />}
          label="平均等待"
          value={`${Math.floor(avgWaitTime.security || 0)}s`}
          color="cyber-blue"
        />
        <StatCard
          icon={<TrendingUp className="w-5 h-5" />}
          label="总队列长度"
          value={securityQueues.reduce((sum, q) => sum + q.length, 0).toString()}
          color="biz-purple"
        />
        <StatCard
          icon={<Shield className="w-5 h-5" />}
          label="开放通道"
          value={securityQueues.length.toString()}
          color="safe-green"
        />
      </div>

      {securityBottlenecks.length > 0 && (
        <div className="bg-alert-red/10 border border-alert-red/30 rounded-lg p-4">
          <div className="flex items-center gap-2 text-alert-red mb-2">
            <AlertTriangle className="w-5 h-5 animate-pulse" />
            <span className="font-mono font-bold">瓶颈预警</span>
          </div>
          <p className="text-sm text-alert-red/80">
            安检区域负载过高，建议增开通道或调整旅客分流策略
          </p>
        </div>
      )}

      <div className="flex-1 bg-deep-space-light/50 rounded-lg p-4 border border-cyber-blue/20">
        <h3 className="text-cyber-blue text-sm font-mono mb-4">安检通道实时状态</h3>

        <div className="space-y-4">
          {securityQueues.map((queue) => (
            <QueueStatusCard
              key={queue.id}
              name={queue.name}
              length={queue.length}
              avgWait={queue.avgWait}
              maxLength={40}
            />
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-deep-space-light/50 rounded-lg p-4 border border-cyber-blue/20">
          <h3 className="text-cyber-blue text-sm font-mono mb-3">队列长度趋势</h3>
          <div className="h-32 flex items-end gap-1">
            {Array.from({ length: 20 }).map((_, i) => {
              const height = Math.random() * 100;
              return (
                <div
                  key={i}
                  className="flex-1 bg-gradient-to-t from-cyber-blue to-cyber-blue/30 rounded-t transition-all"
                  style={{ height: `${height}%` }}
                />
              );
            })}
          </div>
        </div>

        <div className="bg-deep-space-light/50 rounded-lg p-4 border border-cyber-blue/20">
          <h3 className="text-cyber-blue text-sm font-mono mb-3">等待时间分布</h3>
          <div className="space-y-2">
            <DistributionBar label="0-1分钟" percentage={30} color="#00e676" />
            <DistributionBar label="1-3分钟" percentage={40} color="#00d4ff" />
            <DistributionBar label="3-5分钟" percentage={20} color="#ffb300" />
            <DistributionBar label="5分钟+" percentage={10} color="#ff5252" />
          </div>
        </div>
      </div>

      <div className="bg-deep-space-light/50 rounded-lg p-4 border border-cyber-blue/20">
        <h3 className="text-cyber-blue text-sm font-mono mb-3">效率分析建议</h3>
        <div className="space-y-2 text-sm text-gray-300">
          <div className="flex items-start gap-2">
            <span className="text-safe-green">✓</span>
            <span>当前通道配置可支持 200 人/小时吞吐率</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-alert-amber">!</span>
            <span>高峰时段建议增开 1-2 条安检通道</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-cyber-blue">i</span>
            <span>商务旅客优先通道可减少整体等待时间 15%</span>
          </div>
        </div>
      </div>
    </div>
  );
};

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: string;
}

const StatCard: React.FC<StatCardProps> = ({ icon, label, value, color }) => (
  <div className={`bg-deep-space-light/50 rounded-lg p-4 border border-${color}/20`}>
    <div className={`text-${color} mb-2`}>{icon}</div>
    <div className="text-xs text-gray-400 mb-1">{label}</div>
    <div className={`text-2xl font-mono font-bold text-${color}`}>{value}</div>
  </div>
);

interface QueueStatusCardProps {
  name: string;
  length: number;
  avgWait: number;
  maxLength: number;
}

const QueueStatusCard: React.FC<QueueStatusCardProps> = ({ name, length, avgWait, maxLength }) => {
  const percentage = (length / maxLength) * 100;
  const isWarning = percentage > 50;
  const isDanger = percentage > 80;

  return (
    <div className="bg-deep-space-dark/50 rounded-lg p-3">
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm font-mono text-cyber-blue">{name}</span>
        <span className={`text-sm font-mono ${isDanger ? 'text-alert-red' : isWarning ? 'text-alert-amber' : 'text-safe-green'}`}>
          {length} 人
        </span>
      </div>
      <div className="h-3 bg-deep-space rounded-full overflow-hidden mb-2">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${percentage}%`,
            backgroundColor: isDanger ? '#ff5252' : isWarning ? '#ffb300' : '#00e676',
          }}
        />
      </div>
      <div className="flex justify-between text-xs">
        <span className="text-gray-500">预计等待: {Math.floor(avgWait)}s</span>
        <span className="text-gray-500">服务中: {length > 0 ? '1' : '0'}</span>
      </div>
    </div>
  );
};

interface DistributionBarProps {
  label: string;
  percentage: number;
  color: string;
}

const DistributionBar: React.FC<DistributionBarProps> = ({ label, percentage, color }) => (
  <div className="flex items-center gap-3">
    <div className="w-20 text-xs text-gray-400">{label}</div>
    <div className="flex-1 h-2 bg-deep-space rounded-full overflow-hidden">
      <div
        className="h-full rounded-full transition-all"
        style={{ width: `${percentage}%`, backgroundColor: color }}
      />
    </div>
    <div className="w-10 text-xs font-mono text-right text-gray-300">{percentage}%</div>
  </div>
);
