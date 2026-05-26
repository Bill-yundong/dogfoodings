'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { StatCard } from '@/components/ui/StatCard';
import { LineChartCard } from '@/components/charts/ChartCards';
import { useSchedulingStore } from '@/store/useSchedulingStore';
import { useDashboardStore } from '@/store/useDashboardStore';
import { PlaneTakeoff, Clock, BarChart3, Play, RefreshCw, Zap, TrendingUp, AlertTriangle } from 'lucide-react';
import { cn, formatDateTime, getStatusBgColor, getStatusColor } from '@/utils/format';

export default function SchedulingPage() {
  const { currentState, predictions, optimizationResult, isOptimizing, predictTurnover, optimizeSchedule, setCurrentState } = useSchedulingStore();
  const { flights, runways } = useDashboardStore();
  const [selectedHorizon, setSelectedHorizon] = useState(60);
  const [mdpState, setMdpState] = useState<any>(null);

  useEffect(() => {
    const state = {
      id: 'state_current',
      timestamp: new Date(),
      runwayUtilization: runways.map(r => r.status === 'occupied' ? 0.9 : Math.random() * 0.6),
      flightQueueLength: flights.filter(f => f.status === 'ready' || f.status === 'boarding').length,
      averageWaitTime: 5 + Math.random() * 10,
      batteryStates: [],
      gridLoad: 0.65 + Math.random() * 0.2,
      weatherScore: 0.8 + Math.random() * 0.15,
    };
    setMdpState(state);
    setCurrentState(state);
  }, [runways, flights, setCurrentState]);

  const handlePredict = () => {
    if (mdpState) {
      setCurrentState(mdpState);
      predictTurnover(selectedHorizon);
    }
  };

  const handleOptimize = () => {
    optimizeSchedule(flights);
  };

  const predictionData = predictions.slice(-10).map((p, i) => ({
    time: `+${(i + 1) * 5}分钟`,
    预测周转率: p.predictedTurnover,
    置信下限: p.confidenceInterval[0],
    置信上限: p.confidenceInterval[1],
  }));

  const runwayAllocationData = Array.from({ length: 12 }, (_, i) => {
    const hour = 8 + Math.floor(i / 2);
    const minute = (i % 2) * 30;
    return {
      time: `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`,
      跑道A: Math.random() > 0.3 ? 1 : 0,
      跑道B: Math.random() > 0.4 ? 1 : 0,
      跑道C: Math.random() > 0.2 ? 1 : 0,
      跑道D: Math.random() > 0.35 ? 1 : 0,
    };
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white font-display">调度控制中心</h1>
          <p className="text-sm text-metal-gray">基于 MDP 的智能调度决策支持系统</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={selectedHorizon}
            onChange={(e) => setSelectedHorizon(Number(e.target.value))}
            className="input-field w-32 text-sm"
          >
            <option value={30}>30分钟</option>
            <option value={60}>1小时</option>
            <option value={120}>2小时</option>
            <option value={240}>4小时</option>
          </select>
          <button onClick={handlePredict} className="btn-primary flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            预测周转率
          </button>
          <button onClick={handleOptimize} className="btn-success flex items-center gap-2" disabled={isOptimizing}>
            {isOptimizing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            {isOptimizing ? '优化中...' : '生成调度方案'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <StatCard
          label="等待起飞队列"
          value={flights.filter(f => f.status === 'ready').length}
          unit="架"
          icon={<PlaneTakeoff className="w-5 h-5" />}
        />
        <StatCard
          label="平均等待时间"
          value={(mdpState?.averageWaitTime || 0).toFixed(1)}
          unit="分钟"
          trend={-8.3}
          icon={<Clock className="w-5 h-5" />}
        />
        <StatCard
          label="预测周转率"
          value={predictions.length > 0 ? predictions[predictions.length - 1].predictedTurnover.toFixed(1) : '—'}
          unit="架/小时"
          icon={<TrendingUp className="w-5 h-5" />}
        />
        <StatCard
          label="跑道利用率"
          value={mdpState ? (mdpState.runwayUtilization.reduce((a: number, b: number) => a + b, 0) / mdpState.runwayUtilization.length * 100).toFixed(0) : '—'}
          unit="%"
          status={mdpState && mdpState.runwayUtilization.reduce((a: number, b: number) => a + b, 0) / mdpState.runwayUtilization.length > 0.85 ? 'warning' : 'normal'}
          icon={<Zap className="w-5 h-5" />}
        />
      </div>

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-8 space-y-6">
          <Card title="MDP 周转率预测" icon={<BarChart3 className="w-4 h-4" />} className="glow">
            {predictionData.length > 0 ? (
              <LineChartCard
                title=""
                data={predictionData}
                lines={[
                  { key: '预测周转率', color: '#00D4FF', name: '预测周转率', area: true },
                  { key: '置信上限', color: 'rgba(0, 255, 148, 0.5)', name: '置信上限' },
                  { key: '置信下限', color: 'rgba(255, 107, 53, 0.5)', name: '置信下限' },
                ]}
                height={300}
                className="!p-0"
              />
            ) : (
              <div className="h-64 flex items-center justify-center text-metal-gray">
                点击「预测周转率」按钮开始预测
              </div>
            )}
          </Card>

          <Card title="跑道时隙分配矩阵" icon={<PlaneTakeoff className="w-4 h-4" />}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-electric-blue/20">
                    <th className="text-left py-2 px-3 text-metal-gray font-normal">时间</th>
                    {runways.slice(0, 4).map((runway) => (
                      <th key={runway.id} className="text-center py-2 px-3 text-metal-gray font-normal">
                        {runway.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {runwayAllocationData.map((row, i) => (
                    <tr key={i} className="border-b border-electric-blue/10 hover:bg-electric-blue/5">
                      <td className="py-2 px-3 text-white font-mono">{row.time}</td>
                      {runways.slice(0, 4).map((runway, j) => {
                        const isOccupied = (row as any)[`跑道${String.fromCharCode(65 + j)}`] === 1;
                        const flight = flights[i % flights.length];
                        return (
                          <td key={runway.id} className="py-2 px-3 text-center">
                            {isOccupied ? (
                              <div className={cn(
                                'px-2 py-1 rounded text-xs font-medium inline-block',
                                i % 3 === 0 ? 'bg-electric-blue/20 text-electric-blue' :
                                i % 3 === 1 ? 'bg-status-green/20 text-status-green' :
                                'bg-tech-purple/20 text-tech-purple'
                              )}>
                                {flight?.flightNumber || 'VP1001'}
                              </div>
                            ) : (
                              <span className="text-metal-gray/30">—</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        <div className="col-span-4 space-y-6">
          <Card title="调度优化结果" icon={<TrendingUp className="w-4 h-4" />}>
            {optimizationResult ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="glass-card p-3 text-center">
                    <p className="text-2xl font-bold text-electric-blue font-display">
                      {optimizationResult.expectedThroughput}
                    </p>
                    <p className="text-xs text-metal-gray">预计吞吐量 (架次)</p>
                  </div>
                  <div className="glass-card p-3 text-center">
                    <p className="text-2xl font-bold text-status-green font-display">
                      {optimizationResult.expectedWaitTime.toFixed(1)}
                    </p>
                    <p className="text-xs text-metal-gray">平均等待 (分钟)</p>
                  </div>
                  <div className="glass-card p-3 text-center">
                    <p className="text-2xl font-bold text-tech-purple font-display">
                      {optimizationResult.expectedEnergyCost.toFixed(1)}
                    </p>
                    <p className="text-xs text-metal-gray">预计能耗 (kWh)</p>
                  </div>
                  <div className="glass-card p-3 text-center">
                    <p className="text-2xl font-bold text-alert-orange font-display">
                      {optimizationResult.optimizationTime}
                    </p>
                    <p className="text-xs text-metal-gray">计算时间 (ms)</p>
                  </div>
                </div>

                <div className="border-t border-electric-blue/20 pt-4">
                  <h4 className="text-sm font-medium text-white mb-3">优化分配方案</h4>
                  <div className="space-y-2 max-h-48 overflow-auto">
                    {optimizationResult.allocations.slice(0, 5).map((alloc, i) => (
                      <div key={i} className="glass-card p-2 text-xs">
                        <div className="flex justify-between items-center">
                          <span className="text-electric-blue">{alloc.flightId.slice(0, 8)}</span>
                          <span className="text-metal-gray">{alloc.runwayId.slice(0, 8)}</span>
                        </div>
                        <div className="text-metal-gray mt-1">
                          {formatDateTime(alloc.startTime).split(' ')[1]} - {formatDateTime(alloc.endTime).split(' ')[1]}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center text-metal-gray text-center">
                <div>
                  <RefreshCw className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p>点击「生成调度方案」按钮</p>
                  <p className="text-xs">系统将使用 MDP 算法优化跑道分配</p>
                </div>
              </div>
            )}
          </Card>

          <Card title="MDP 状态评估" icon={<AlertTriangle className="w-4 h-4" />}>
            {mdpState ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between py-2 border-b border-electric-blue/10">
                  <span className="text-sm text-metal-gray">状态 ID</span>
                  <span className="text-sm text-white font-mono">{mdpState.id}</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-electric-blue/10">
                  <span className="text-sm text-metal-gray">队列长度</span>
                  <span className="text-sm text-white">{mdpState.flightQueueLength} 架</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-electric-blue/10">
                  <span className="text-sm text-metal-gray">电网负载</span>
                  <span className={cn(
                    'text-sm',
                    mdpState.gridLoad > 0.85 ? 'text-alert-orange' : 'text-status-green'
                  )}>
                    {(mdpState.gridLoad * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-electric-blue/10">
                  <span className="text-sm text-metal-gray">天气评分</span>
                  <span className={cn(
                    'text-sm',
                    mdpState.weatherScore < 0.7 ? 'text-alert-orange' : 'text-status-green'
                  )}>
                    {(mdpState.weatherScore * 100).toFixed(0)}%
                  </span>
                </div>
                <div className="pt-2">
                  <p className="text-xs text-metal-gray mb-2">跑道利用率</p>
                  <div className="grid grid-cols-4 gap-1">
                    {mdpState.runwayUtilization.map((util: number, i: number) => (
                      <div key={i} className="text-center">
                        <div className={cn(
                          'h-12 rounded flex items-end justify-center',
                          getStatusBgColor(util > 0.8 ? 'warning' : 'normal')
                        )}>
                          <div 
                            className="w-full bg-electric-blue/60 rounded"
                            style={{ height: `${util * 100}%` }}
                          ></div>
                        </div>
                        <p className="text-xs text-metal-gray mt-1">R{i + 1}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-40 flex items-center justify-center text-metal-gray">
                加载中...
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
