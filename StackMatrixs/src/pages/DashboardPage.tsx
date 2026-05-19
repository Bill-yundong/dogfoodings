import React, { useMemo } from 'react';
import {
  Package,
  MapPin,
  Bot,
  TrendingUp,
  AlertTriangle,
  Zap,
} from 'lucide-react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { useWarehouseStore } from '@/store/useWarehouseStore';
import { useEfficiencyMetrics } from '@/hooks/useRealTimeData';
import { MetricCard } from '@/components/common/MetricCard';
import { ProgressBar } from '@/components/common/ProgressBar';
import { StatusBadge } from '@/components/common/StatusBadge';
import {
  formatPercentage,
  formatNumber,
  formatRelativeTime,
  getHeatLevelColor,
} from '@/utils/formatters';

export const DashboardPage: React.FC = () => {
  const { getStats, locations, stackers, inboundTasks, alerts } = useWarehouseStore();
  const stats = getStats();
  const metrics = useEfficiencyMetrics(7);

  const throughputData = useMemo(() => {
    return metrics
      .filter((m) => m.metricType === 'throughput')
      .slice(-24)
      .map((m) => ({
        time: `${new Date(m.timestamp).getHours()}:00`,
        value: m.value,
      }));
  }, [metrics]);

  const trendData = useMemo(() => {
    const types = ['throughput', 'utilization', 'efficiency'];
    return types.map((type) => ({
      name: type === 'throughput' ? '吞吐量' : type === 'utilization' ? '利用率' : '作业效率',
      data: metrics
        .filter((m) => m.metricType === type)
        .slice(-12)
        .map((m) => ({
          time: `${new Date(m.timestamp).getMonth() + 1}/${new Date(m.timestamp).getDate()}`,
          value: m.value,
        })),
    }));
  }, [metrics]);

  const locationDistribution = useMemo(() => {
    return [
      { name: '已占用', value: stats.occupiedLocations, color: '#3B82F6' },
      { name: '空闲', value: stats.emptyLocations, color: '#10B981' },
      { name: '已预留', value: stats.reservedLocations, color: '#F59E0B' },
      { name: '维护中', value: stats.maintenanceLocations, color: '#F43F5E' },
    ];
  }, [stats]);

  const topAisles = useMemo(() => {
    const aisleStats: Record<number, { total: number; occupied: number; heat: number }> = {};
    locations.forEach((loc) => {
      if (!aisleStats[loc.aisle]) {
        aisleStats[loc.aisle] = { total: 0, occupied: 0, heat: 0 };
      }
      aisleStats[loc.aisle].total++;
      if (loc.status === 'occupied') {
        aisleStats[loc.aisle].occupied++;
      }
      aisleStats[loc.aisle].heat += loc.heatLevel;
    });
    return Object.entries(aisleStats)
      .map(([aisle, data]) => ({
        aisle: Number(aisle),
        utilization: (data.occupied / data.total) * 100,
        avgHeat: data.heat / data.total,
      }))
      .sort((a, b) => b.utilization - a.utilization)
      .slice(0, 5);
  }, [locations]);

  const recentAlerts = alerts.slice(0, 5);
  const pendingTasks = inboundTasks.filter((t) => t.status === 'pending' || t.status === 'allocating').slice(0, 5);

  return (
    <div className="p-6 space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="货位利用率"
          value={formatPercentage(stats.utilizationRate, 1)}
          icon={<Package className="w-6 h-6" />}
          color="primary"
          trend={{ value: 2.3, isPositive: true }}
        />
        <MetricCard
          title="活跃SKU"
          value={formatNumber(stats.activeSKUs)}
          unit={`/ ${formatNumber(stats.totalSKUs)}`}
          icon={<MapPin className="w-6 h-6" />}
          color="success"
          trend={{ value: 5.1, isPositive: true }}
        />
        <MetricCard
          title="设备效率"
          value={formatPercentage(stats.avgStackerEfficiency, 1)}
          icon={<Bot className="w-6 h-6" />}
          color="accent"
          trend={{ value: 1.2, isPositive: true }}
        />
        <MetricCard
          title="今日吞吐量"
          value={formatNumber(stats.todayThroughput)}
          unit="件"
          icon={<Zap className="w-6 h-6" />}
          color="warning"
          trend={{ value: 8.5, isPositive: true }}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 wms-panel">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-wms-text">24小时吞吐量趋势</h3>
            <select className="px-3 py-1.5 bg-wms-bg border border-wms-border rounded-md text-sm text-wms-text focus:outline-none focus:border-wms-primary">
              <option>最近24小时</option>
              <option>最近7天</option>
              <option>最近30天</option>
            </select>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={throughputData}>
              <defs>
                <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="time" stroke="#94A3B8" fontSize={11} />
              <YAxis stroke="#94A3B8" fontSize={11} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1E293B',
                  border: '1px solid #334155',
                  borderRadius: '8px',
                  color: '#F1F5F9',
                }}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke="#3B82F6"
                fill="url(#colorValue)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="wms-panel">
          <h3 className="font-semibold text-wms-text mb-4">货位分布</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={locationDistribution}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={2}
                dataKey="value"
              >
                {locationDistribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Legend
                verticalAlign="bottom"
                height={36}
                formatter={(value) => <span className="text-wms-subtext text-xs">{value}</span>}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-2 text-center text-wms-subtext text-sm">
            总货位数: {formatNumber(stats.totalLocations)}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="wms-panel">
          <h3 className="font-semibold text-wms-text mb-4">多维度效率对比</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis
                dataKey="time"
                stroke="#94A3B8"
                fontSize={11}
                allowDuplicatedCategory={false}
              />
              <YAxis stroke="#94A3B8" fontSize={11} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1E293B',
                  border: '1px solid #334155',
                  borderRadius: '8px',
                  color: '#F1F5F9',
                }}
              />
              <Legend
                formatter={(value) => <span className="text-wms-subtext text-xs">{value}</span>}
              />
              {trendData.map((series, idx) => (
                <Line
                  key={series.name}
                  data={series.data}
                  type="monotone"
                  dataKey="value"
                  name={series.name}
                  stroke={idx === 0 ? '#3B82F6' : idx === 1 ? '#10B981' : '#F59E0B'}
                  strokeWidth={2}
                  dot={false}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="wms-panel">
          <h3 className="font-semibold text-wms-text mb-4">巷道热力排行</h3>
          <div className="space-y-3">
            {topAisles.map((aisle) => (
              <div key={aisle.aisle} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-wms-text font-medium">巷道 {aisle.aisle}</span>
                  <div className="flex items-center gap-3">
                    <span className={`w-2 h-2 rounded-full ${getHeatLevelColor(aisle.avgHeat)}`} />
                    <span className="text-wms-subtext">
                      {formatPercentage(aisle.utilization, 0)}
                    </span>
                  </div>
                </div>
                <ProgressBar value={aisle.utilization} size="sm" color="primary" />
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="wms-panel">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-wms-text">待处理入库任务</h3>
            <span className="text-xs text-wms-subtext">
              共 {pendingTasks.length} 条
            </span>
          </div>
          <div className="space-y-2">
            {pendingTasks.length === 0 ? (
              <div className="py-8 text-center text-wms-subtext text-sm">暂无待处理任务</div>
            ) : (
              pendingTasks.map((task) => (
                <div
                  key={task.id}
                  className="flex items-center justify-between p-3 bg-wms-bg/50 rounded-lg hover:bg-wms-bg transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Package className="w-4 h-4 text-wms-primary" />
                    <div>
                      <p className="text-sm font-medium text-wms-text">{task.id}</p>
                      <p className="text-xs text-wms-subtext">
                        SKU: {task.skuId} | 数量: {task.quantity}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={task.status} showText={false} />
                    <span className="text-xs text-wms-subtext">
                      {formatRelativeTime(task.createdAt)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="wms-panel">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-wms-text">最近告警</h3>
            <AlertTriangle className="w-4 h-4 text-wms-warning" />
          </div>
          <div className="space-y-2">
            {recentAlerts.length === 0 ? (
              <div className="py-8 text-center text-wms-subtext text-sm">暂无告警</div>
            ) : (
              recentAlerts.map((alert) => (
                <div
                  key={alert.id}
                  className="flex items-start gap-3 p-3 bg-wms-bg/50 rounded-lg hover:bg-wms-bg transition-colors"
                >
                  <span
                    className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                      alert.type === 'danger'
                        ? 'bg-wms-danger'
                        : alert.type === 'warning'
                        ? 'bg-wms-warning'
                        : alert.type === 'success'
                        ? 'bg-wms-success'
                        : 'bg-wms-primary'
                    }`}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-wms-text truncate">
                      {alert.title}
                    </p>
                    <p className="text-xs text-wms-subtext truncate mt-0.5">
                      {alert.message}
                    </p>
                    <p className="text-xs text-wms-subtext mt-1">
                      {formatRelativeTime(alert.timestamp)}
                    </p>
                  </div>
                  {!alert.read && (
                    <span className="w-2 h-2 bg-wms-primary rounded-full flex-shrink-0" />
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="wms-panel">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-wms-text">堆垛机状态概览</h3>
          <span className="text-xs text-wms-subtext">
            共 {stackers.length} 台设备
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {stackers.map((stacker) => (
            <div
              key={stacker.id}
              className="p-4 bg-wms-bg/50 rounded-lg border border-wms-border/50 hover:border-wms-primary/30 transition-all"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Bot
                    className={`w-5 h-5 ${
                      stacker.status === 'running' ? 'text-wms-success' : 'text-wms-subtext'
                    }`}
                  />
                  <span className="font-medium text-wms-text">{stacker.name}</span>
                </div>
                <StatusBadge status={stacker.status} />
              </div>
              <div className="space-y-2">
                <ProgressBar
                  value={stacker.efficiency}
                  label="作业效率"
                  showPercentage
                  color={
                    stacker.efficiency >= 80
                      ? 'success'
                      : stacker.efficiency >= 60
                      ? 'primary'
                      : 'warning'
                  }
                />
                <div className="flex items-center justify-between text-xs text-wms-subtext">
                  <span>已完成任务: {stacker.completedTasks}</span>
                  <span>队列: {stacker.taskQueue.length}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="wms-panel">
        <h3 className="font-semibold text-wms-text mb-4">空间碎片化指数</h3>
        <div className="flex items-center gap-8">
          <div className="flex-shrink-0">
            <div className="relative w-40 h-40">
              <svg className="w-full h-full" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="none"
                  stroke="#334155"
                  strokeWidth="10"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="none"
                  stroke={
                    stats.fragmentationIndex > 30
                      ? '#F43F5E'
                      : stats.fragmentationIndex > 15
                      ? '#F59E0B'
                      : '#10B981'
                  }
                  strokeWidth="10"
                  strokeLinecap="round"
                  strokeDasharray={`${(stats.fragmentationIndex / 100) * 251.2} 251.2`}
                  transform="rotate(-90 50 50)"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-bold font-display text-wms-text">
                  {stats.fragmentationIndex.toFixed(1)}
                </span>
                <span className="text-xs text-wms-subtext">碎片化指数</span>
              </div>
            </div>
          </div>
          <div className="flex-1 space-y-4">
            <div>
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="text-wms-subtext">空间利用效率</span>
                <span className="text-wms-text font-medium">良好</span>
              </div>
              <ProgressBar value={100 - stats.fragmentationIndex} color="success" />
            </div>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-wms-success">85%</p>
                <p className="text-xs text-wms-subtext">目标利用率</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-wms-primary">
                  {formatPercentage(stats.utilizationRate, 0)}
                </p>
                <p className="text-xs text-wms-subtext">当前利用率</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-wms-warning">
                  {formatNumber(stats.pendingInboundTasks)}
                </p>
                <p className="text-xs text-wms-subtext">待处理任务</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
