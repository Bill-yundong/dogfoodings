'use client';

import { useState, useMemo, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { StatCard } from '@/components/ui/StatCard';
import { LineChartCard } from '@/components/charts/ChartCards';
import { useEnergyStore } from '@/store/useEnergyStore';
import { Zap, TrendingUp, TrendingDown, DollarSign, Leaf, BatteryCharging, ArrowRightLeft, RefreshCw, Play } from 'lucide-react';
import { cn, formatDateTime } from '@/utils/format';
import { chargeOptimizer } from '@/lib/energy/chargeOptimizer';

export default function EnergyPage() {
  const { gridSignals, chargeSessions, chargeCurve, v2gResponses, forecasts, currentLoad, totalEnergyUsed, totalV2GRevenue, setChargeCurve, addV2GResponse } = useEnergyStore();
  const [selectedPeriod, setSelectedPeriod] = useState('24h');
  const [isGeneratingCurve, setIsGeneratingCurve] = useState(false);

  const stats = useMemo(() => {
    const recentSessions = chargeSessions.slice(-50);
    const totalCharged = recentSessions.reduce((sum, s) => sum + Math.max(0, s.energyCharged), 0);
    const totalDischarged = Math.abs(recentSessions.reduce((sum, s) => sum + Math.min(0, s.energyCharged), 0));
    const avgPrice = gridSignals.length > 0 
      ? gridSignals.reduce((sum, s) => sum + s.electricityPrice, 0) / gridSignals.length 
      : 0;
    const v2gCount = recentSessions.filter(s => s.chargeType === 'v2g').length;

    return { totalCharged, totalDischarged, avgPrice, v2gCount };
  }, [chargeSessions, gridSignals]);

  const gridLoadData = useMemo(() => {
    const data = gridSignals.slice(-48).map((signal, i) => ({
      time: formatDateTime(signal.timestamp).split(' ')[1],
      电网负载: signal.gridLoad,
      电价: signal.electricityPrice * 100,
      可再生能源占比: signal.renewableRatio * 100,
    }));
    return data;
  }, [gridSignals]);

  const chargeCurveData = useMemo(() => {
    return chargeCurve.map(point => ({
      time: formatDateTime(point.timestamp).split(' ')[1],
      功率: point.power * 100,
      SOC: point.soc * 100,
      温度: point.temperature * 2,
    }));
  }, [chargeCurve]);

  const handleGenerateCurve = () => {
    setIsGeneratingCurve(true);
    setTimeout(() => {
      const curve = chargeOptimizer.generateChargeCurve(0.2, 0.9, 60, 'fast');
      setChargeCurve(curve);
      setIsGeneratingCurve(false);
    }, 500);
  };

  const handleTriggerV2G = () => {
    const response = {
      id: `v2g_${Date.now()}`,
      sessionId: `session_${Date.now()}`,
      requestTime: new Date(),
      targetPower: 150 + Math.random() * 100,
      duration: 30,
      energyDischarged: 50 + Math.random() * 30,
      revenue: 40 + Math.random() * 20,
      status: 'pending' as const,
    };
    addV2GResponse(response);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white font-display">能源协同控制</h1>
          <p className="text-sm text-metal-gray">充放电曲线优化与 V2G 电网互动</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="input-field w-32 text-sm"
          >
            <option value="1h">最近1小时</option>
            <option value="24h">最近24小时</option>
            <option value="7d">最近7天</option>
            <option value="30d">最近30天</option>
          </select>
          <button onClick={handleGenerateCurve} className="btn-primary flex items-center gap-2" disabled={isGeneratingCurve}>
            {isGeneratingCurve ? <RefreshCw className="w-4 h-4 animate-spin" /> : <BatteryCharging className="w-4 h-4" />}
            生成充电曲线
          </button>
          <button onClick={handleTriggerV2G} className="btn-success flex items-center gap-2">
            <ArrowRightLeft className="w-4 h-4" />
            触发 V2G 响应
          </button>
        </div>
      </div>

      <div className="grid grid-cols-6 gap-4">
        <StatCard
          label="当前电网负载"
          value={currentLoad.toFixed(1)}
          unit="%"
          status={currentLoad > 85 ? 'warning' : 'normal'}
          icon={<Zap className="w-5 h-5" />}
        />
        <StatCard
          label="累计充电量"
          value={stats.totalCharged.toFixed(0)}
          unit="MWh"
          trend={5.2}
          icon={<BatteryCharging className="w-5 h-5" />}
        />
        <StatCard
          label="V2G 放电量"
          value={stats.totalDischarged.toFixed(0)}
          unit="MWh"
          trend={12.8}
          icon={<ArrowRightLeft className="w-5 h-5" />}
        />
        <StatCard
          label="平均电价"
          value={stats.avgPrice.toFixed(2)}
          unit="元/kWh"
          trend={-3.5}
          icon={<DollarSign className="w-5 h-5" />}
        />
        <StatCard
          label="V2G 响应次数"
          value={stats.v2gCount}
          unit="次"
          icon={<TrendingUp className="w-5 h-5" />}
        />
        <StatCard
          label="V2G 收益"
          value={totalV2GRevenue.toFixed(0)}
          unit="元"
          icon={<Leaf className="w-5 h-5" />}
        />
      </div>

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-8 space-y-6">
          <LineChartCard
            title="电网负载与电价趋势"
            data={gridLoadData}
            lines={[
              { key: '电网负载', color: '#00D4FF', name: '电网负载 (%)', area: true },
              { key: '电价', color: '#FF6B35', name: '电价 (分/kWh)' },
              { key: '可再生能源占比', color: '#00FF94', name: '可再生能源 (%)' },
            ]}
            height={280}
          />

          {chargeCurveData.length > 0 && (
            <Card title="充放电曲线分析" icon={<BatteryCharging className="w-4 h-4" />} className="glow">
              <LineChartCard
                title=""
                data={chargeCurveData}
                lines={[
                  { key: '功率', color: '#00D4FF', name: '功率 (%)', area: true },
                  { key: 'SOC', color: '#00FF94', name: 'SOC (%)' },
                  { key: '温度', color: '#FF6B35', name: '温度 (°C)' },
                ]}
                height={250}
                className="!p-0"
              />
              <div className="grid grid-cols-4 gap-4 mt-4">
                <div className="glass-card p-3 text-center">
                  <p className="text-xl font-bold text-electric-blue font-display">
                    {chargeCurve.length > 0 ? chargeCurve[chargeCurve.length - 1].soc.toFixed(1) : '0'}%
                  </p>
                  <p className="text-xs text-metal-gray">最终 SOC</p>
                </div>
                <div className="glass-card p-3 text-center">
                  <p className="text-xl font-bold text-status-green font-display">60</p>
                  <p className="text-xs text-metal-gray">充电时长 (分钟)</p>
                </div>
                <div className="glass-card p-3 text-center">
                  <p className="text-xl font-bold text-tech-purple font-display">快速充电</p>
                  <p className="text-xs text-metal-gray">充电模式</p>
                </div>
                <div className="glass-card p-3 text-center">
                  <p className="text-xl font-bold text-alert-orange font-display">
                    {chargeCurve.length > 0 ? Math.max(...chargeCurve.map(c => c.temperature)).toFixed(1) : '0'}°C
                  </p>
                  <p className="text-xs text-metal-gray">最高温度</p>
                </div>
              </div>
            </Card>
          )}

          <Card title="充电会话记录" icon={<BatteryCharging className="w-4 h-4" />}>
            <div className="overflow-x-auto max-h-64 overflow-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>时间</th>
                    <th>类型</th>
                    <th>电量</th>
                    <th>最大功率</th>
                    <th>平均功率</th>
                    <th>成本</th>
                    <th>碳排放</th>
                    <th>状态</th>
                  </tr>
                </thead>
                <tbody>
                  {chargeSessions.slice(0, 10).map((session) => (
                    <tr key={session.id}>
                      <td className="text-white text-xs font-mono">{formatDateTime(session.startTime)}</td>
                      <td className={cn(
                        'text-xs font-medium',
                        session.chargeType === 'v2g' ? 'text-tech-purple' :
                        session.chargeType === 'fast' ? 'text-electric-blue' :
                        session.chargeType === 'slow' ? 'text-status-green' : 'text-white'
                      )}>
                        {session.chargeType === 'v2g' ? 'V2G放电' :
                         session.chargeType === 'fast' ? '快充' :
                         session.chargeType === 'slow' ? '慢充' : '常规'}
                      </td>
                      <td className={cn(
                        'text-xs',
                        session.energyCharged < 0 ? 'text-alert-orange' : 'text-status-green'
                      )}>
                        {Math.abs(session.energyCharged).toFixed(1)} kWh
                      </td>
                      <td className="text-white text-xs">{session.maxPower.toFixed(0)} kW</td>
                      <td className="text-white text-xs">{session.averagePower.toFixed(0)} kW</td>
                      <td className="text-white text-xs">¥{session.cost.toFixed(2)}</td>
                      <td className="text-white text-xs">{session.carbonFootprint.toFixed(1)} g</td>
                      <td className={cn(
                        'text-xs',
                        session.status === 'completed' ? 'text-status-green' :
                        session.status === 'charging' ? 'text-electric-blue' : 'text-metal-gray'
                      )}>
                        {session.status === 'completed' ? '已完成' :
                         session.status === 'charging' ? '充电中' : session.status}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        <div className="col-span-4 space-y-6">
          <Card title="V2G 响应记录" icon={<ArrowRightLeft className="w-4 h-4 text-tech-purple" />}>
            {v2gResponses.length > 0 ? (
              <div className="space-y-2 max-h-64 overflow-auto">
                {v2gResponses.slice(0, 8).map((response) => (
                  <div key={response.id} className="glass-card p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-tech-purple">
                        {response.targetPower.toFixed(0)} kW
                      </span>
                      <span className={cn(
                        'px-2 py-0.5 rounded text-xs',
                        response.status === 'completed' ? 'bg-status-green/20 text-status-green' :
                        response.status === 'active' ? 'bg-electric-blue/20 text-electric-blue' :
                        'bg-metal-gray/20 text-metal-gray'
                      )}>
                        {response.status === 'completed' ? '已完成' :
                         response.status === 'active' ? '进行中' :
                         response.status === 'pending' ? '待执行' : '已拒绝'}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-metal-gray">放电量:</span>
                        <span className="text-white ml-1">{response.energyDischarged.toFixed(1)} kWh</span>
                      </div>
                      <div>
                        <span className="text-metal-gray">收益:</span>
                        <span className="text-status-green ml-1">¥{response.revenue.toFixed(2)}</span>
                      </div>
                      <div className="col-span-2">
                        <span className="text-metal-gray">时长:</span>
                        <span className="text-white ml-1">{response.duration} 分钟</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-40 flex items-center justify-center text-metal-gray text-center">
                <div>
                  <ArrowRightLeft className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p>暂无 V2G 响应记录</p>
                  <p className="text-xs mt-1">点击「触发 V2G 响应」测试</p>
                </div>
              </div>
            )}
          </Card>

          <Card title="电网信号" icon={<Zap className="w-4 h-4" />}>
            <div className="space-y-3 max-h-64 overflow-auto">
              {gridSignals.slice(-10).reverse().map((signal) => (
                <div key={signal.id} className="flex items-center justify-between py-2 border-b border-electric-blue/10 last:border-0">
                  <div>
                    <p className="text-xs text-white font-mono">{formatDateTime(signal.timestamp).split(' ')[1]}</p>
                    <p className={cn(
                      'text-xs',
                      signal.signalType === 'peak' ? 'text-alert-orange' :
                      signal.signalType === 'valley' ? 'text-status-green' :
                      signal.signalType === 'emergency' ? 'text-red-500' : 'text-metal-gray'
                    )}>
                      {signal.signalType === 'peak' ? '用电高峰' :
                       signal.signalType === 'valley' ? '用电低谷' :
                       signal.signalType === 'emergency' ? '紧急' : '正常'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-electric-blue">{signal.gridLoad.toFixed(0)}%</p>
                    <p className="text-xs text-metal-gray">¥{signal.electricityPrice.toFixed(2)}/kWh</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card title="负荷预测" icon={<TrendingUp className="w-4 h-4" />}>
            <div className="space-y-2">
              {Array.from({ length: 6 }, (_, i) => {
                const hour = (new Date().getHours() + i + 1) % 24;
                const load = 50 + Math.sin(hour / 4) * 30 + Math.random() * 10;
                return (
                  <div key={i} className="flex items-center gap-3">
                    <span className="text-xs text-metal-gray w-12">{String(hour).padStart(2, '0')}:00</span>
                    <div className="flex-1 h-2 bg-space-dark rounded-full overflow-hidden">
                      <div
                        className={cn(
                          'h-full rounded-full',
                          load > 85 ? 'bg-alert-orange' : load > 70 ? 'bg-electric-blue' : 'bg-status-green'
                        )}
                        style={{ width: `${load}%` }}
                      ></div>
                    </div>
                    <span className="text-xs text-white w-10 text-right">{load.toFixed(0)}%</span>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
