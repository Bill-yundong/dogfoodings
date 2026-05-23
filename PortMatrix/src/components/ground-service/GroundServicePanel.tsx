'use client';

import React from 'react';
import { Plane, Luggage, Users, Clock, TrendingUp, AlertTriangle, Zap, CheckCircle, XCircle } from 'lucide-react';
import type { SimulationMetrics } from '@/types';

interface GroundServicePanelProps {
  metrics: SimulationMetrics | null;
}

export const GroundServicePanel: React.FC<GroundServicePanelProps> = ({ metrics }) => {
  const queueLengths = metrics?.queueLengths || {};
  const avgWaitTime = metrics?.avgWaitTime || {};
  const zoneDensities = metrics?.zoneDensities || {};
  const bottlenecks = metrics?.bottlenecks || [];

  const checkinQueues = Object.entries(queueLengths)
    .filter(([key]) => key.includes('checkin'))
    .map(([key, length]) => ({
      id: key,
      name: key.replace('queue_checkin_', '柜台组 ').toUpperCase(),
      length,
      avgWait: (avgWaitTime.checkin || 0) * (length / Math.max(1, Object.values(queueLengths).reduce((a, b) => a + b, 0))),
    }));

  const gateActivity = [
    { id: 'gate_n1', name: 'N1', flight: 'CA1234', status: 'boarding', passengers: 120, time: '10:30' },
    { id: 'gate_n2', name: 'N2', flight: 'MU5678', status: 'waiting', passengers: 0, time: '11:45' },
    { id: 'gate_s1', name: 'S1', flight: 'CZ9012', status: 'completed', passengers: 180, time: '09:15' },
    { id: 'gate_s2', name: 'S2', flight: 'HU3456', status: 'boarding', passengers: 95, time: '10:45' },
  ];

  const groundBottlenecks = bottlenecks.filter(b =>
    b.includes('checkin') || b.includes('gate') || b === 'zone_checkin'
  );

  const checkinEfficiency = checkinQueues.length > 0
    ? Math.min(100, 100 - (checkinQueues.reduce((s, q) => s + q.length, 0) / (checkinQueues.length * 40)) * 100)
    : 85;

  return (
    <div className="h-full flex flex-col gap-4 p-6">
      <div className="flex items-center gap-3 mb-2">
        <div className="p-2 bg-biz-purple/20 rounded-lg">
          <Plane className="w-6 h-6 text-biz-purple" />
        </div>
        <div>
          <h1 className="text-2xl font-display text-cyber-blue">地服调度</h1>
          <p className="text-sm text-gray-400">值机柜台分配 · 行李处理 · 登机口调度</p>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <StatCard
          icon={<Users className="w-5 h-5" />}
          label="值机区人数"
          value={Math.floor(zoneDensities['zone_checkin'] * 100 || 0).toString()}
          color="biz-purple"
        />
        <StatCard
          icon={<Clock className="w-5 h-5" />}
          label="平均等待"
          value={`${Math.floor(avgWaitTime.checkin || 0)}s`}
          color="cyber-blue"
        />
        <StatCard
          icon={<Luggage className="w-5 h-5" />}
          label="行李处理率"
          value={`${Math.floor((avgWaitTime.baggage || 85))}%`}
          color="safe-green"
        />
        <StatCard
          icon={<TrendingUp className="w-5 h-5" />}
          label="值机效率"
          value={`${Math.floor(checkinEfficiency)}%`}
          color={checkinEfficiency > 70 ? 'safe-green' : checkinEfficiency > 50 ? 'alert-amber' : 'alert-red'}
        />
      </div>

      {groundBottlenecks.length > 0 && (
        <div className="bg-alert-amber/10 border border-alert-amber/30 rounded-lg p-4">
          <div className="flex items-center gap-2 text-alert-amber mb-2">
            <AlertTriangle className="w-5 h-5 animate-pulse" />
            <span className="font-mono font-bold">调度预警</span>
          </div>
          <p className="text-sm text-alert-amber/80">
            值机区域负载较高，建议增开临时柜台或引导旅客使用自助值机
          </p>
        </div>
      )}

      <div className="bg-deep-space-light/50 rounded-lg p-4 border border-cyber-blue/20">
        <h3 className="text-cyber-blue text-sm font-mono mb-4">值机柜台实时状态</h3>
        <div className="space-y-3">
          {[0, 1, 2, 3, 4, 5, 6, 7].map((idx) => {
            const isOpen = idx < 6;
            const queueLength = idx < 3 ? Math.floor(Math.random() * 15) : idx < 6 ? Math.floor(Math.random() * 12) : 0;
            const isBusy = queueLength > 10;
            return (
              <div key={idx} className="flex items-center gap-4 bg-deep-space-dark/50 rounded-lg p-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isOpen ? (isBusy ? 'bg-alert-amber/20' : 'bg-safe-green/20') : 'bg-gray-700/20'}`}>
                  {isOpen ? (isBusy ? <Zap className="w-5 h-5 text-alert-amber" /> : <CheckCircle className="w-5 h-5 text-safe-green" />) : <XCircle className="w-5 h-5 text-gray-500" />}
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm font-mono text-cyber-blue">柜台 {idx + 1}</span>
                    <span className={`text-xs font-mono ${isOpen ? (isBusy ? 'text-alert-amber' : 'text-safe-green') : 'text-gray-500'}`}>
                      {isOpen ? (isBusy ? '繁忙' : '空闲') : '关闭'}
                    </span>
                  </div>
                  <div className="h-2 bg-deep-space rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${(queueLength / 20) * 100}%`,
                        backgroundColor: isBusy ? '#ffb300' : '#00e676',
                      }}
                    />
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-mono text-gray-300">{queueLength} 人</div>
                  <div className="text-xs text-gray-500">约 {queueLength * 15}s</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-deep-space-light/50 rounded-lg p-4 border border-cyber-blue/20">
          <h3 className="text-cyber-blue text-sm font-mono mb-3">登机口状态</h3>
          <div className="space-y-2">
            {gateActivity.map((gate) => (
              <div key={gate.id} className="flex items-center gap-3 bg-deep-space-dark/30 rounded p-2">
                <div className={`w-8 h-8 rounded flex items-center justify-center ${
                  gate.status === 'boarding' ? 'bg-cyber-blue/20' :
                  gate.status === 'waiting' ? 'bg-alert-amber/20' : 'bg-gray-700/20'
                }`}>
                  <span className={`text-xs font-mono font-bold ${
                    gate.status === 'boarding' ? 'text-cyber-blue' :
                    gate.status === 'waiting' ? 'text-alert-amber' : 'text-gray-500'
                  }`}>{gate.name}</span>
                </div>
                <div className="flex-1">
                  <div className="text-xs font-mono text-gray-300">{gate.flight}</div>
                  <div className="text-xs text-gray-500">{gate.time}</div>
                </div>
                <div className="text-right">
                  {gate.status === 'boarding' && (
                    <div className="text-xs text-cyber-blue">{gate.passengers}/180</div>
                  )}
                  <div className={`text-xs font-mono ${
                    gate.status === 'boarding' ? 'text-cyber-blue' :
                    gate.status === 'waiting' ? 'text-alert-amber' : 'text-gray-500'
                  }`}>
                    {gate.status === 'boarding' ? '登机中' : gate.status === 'waiting' ? '待起飞' : '已完成'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-deep-space-light/50 rounded-lg p-4 border border-cyber-blue/20">
          <h3 className="text-cyber-blue text-sm font-mono mb-3">行李处理监控</h3>
          <div className="space-y-3">
            <BagageStat label="已处理行李" value="1,247" color="safe-green" />
            <BagageStat label="运输中" value="86" color="cyber-blue" />
            <BagageStat label="待分拣" value="42" color="alert-amber" />
            <BagageStat label="异常件" value="3" color="alert-red" />
          </div>
          <div className="mt-4 pt-3 border-t border-cyber-blue/10">
            <div className="flex justify-between text-xs text-gray-400 mb-1">
              <span>系统处理能力</span>
              <span className="font-mono">85%</span>
            </div>
            <div className="h-2 bg-deep-space rounded-full overflow-hidden">
              <div className="h-full w-[85%] bg-gradient-to-r from-safe-green to-cyber-blue rounded-full" />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-deep-space-light/50 rounded-lg p-4 border border-cyber-blue/20">
        <h3 className="text-cyber-blue text-sm font-mono mb-3">调度优化建议</h3>
        <div className="space-y-2 text-sm text-gray-300">
          <div className="flex items-start gap-2">
            <span className="text-safe-green">✓</span>
            <span>值机柜台 7-8 可在高峰时段（10:00-12:00）开放</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-alert-amber">!</span>
            <span>建议增加 2 名行李分拣员应对当前航班波</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-cyber-blue">i</span>
            <span>登机口 N2 航班 MU5678 预计延误 30 分钟，可临时转场</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-biz-purple">$</span>
            <span>自助值机使用率达到 45%，建议增置 2 台自助设备</span>
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

interface BagageStatProps {
  label: string;
  value: string;
  color: string;
}

const BagageStat: React.FC<BagageStatProps> = ({ label, value, color }) => (
  <div className="flex items-center justify-between">
    <span className="text-xs text-gray-400">{label}</span>
    <span className={`text-sm font-mono font-bold text-${color}`}>{value}</span>
  </div>
);
