import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  BarChart3, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, 
  Calendar, Download, RefreshCw, Target, Zap, Clock, Package, MapPin 
} from 'lucide-react';
import { 
  LineChart, Line, AreaChart, Area, BarChart as ReBarChart, Bar, 
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  ComposedChart
} from 'recharts';
import useWMSStore from '../../store/useWMSStore';

function MetricCard({ 
  title, 
  value, 
  unit, 
  change, 
  changeLabel,
  icon: Icon, 
  color,
  isPositiveGood = true 
}: {
  title: string;
  value: string;
  unit?: string;
  change: number;
  changeLabel: string;
  icon: typeof BarChart3;
  color: string;
  isPositiveGood?: boolean;
}) {
  const isPositive = change >= 0;
  const showPositive = isPositiveGood ? isPositive : !isPositive;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      className="bg-surface rounded-xl border border-surface-border p-6 relative overflow-hidden"
    >
      <div className="absolute top-0 right-0 w-32 h-32 opacity-10">
        <div className={`absolute top-0 right-0 w-full h-full ${color} rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/2`} />
      </div>
      
      <div className="relative">
        <div className="flex items-center justify-between mb-4">
          <div className={`w-12 h-12 rounded-xl ${color} bg-opacity-20 flex items-center justify-center`}>
            <Icon className={`w-6 h-6 ${color.replace('bg-', 'text-')}`} />
          </div>
          <div className={`flex items-center gap-1 text-xs font-medium ${
            showPositive ? 'text-accent-green' : 'text-accent-red'
          }`}>
            {showPositive ? (
              <ArrowUpRight className="w-4 h-4" />
            ) : (
              <ArrowDownRight className="w-4 h-4" />
            )}
            <span>{Math.abs(change).toFixed(1)}%</span>
            <span className="text-text-muted ml-1">{changeLabel}</span>
          </div>
        </div>
        
        <h3 className="text-text-muted text-sm mb-1">{title}</h3>
        <div className="flex items-baseline gap-1">
          <span className="text-3xl font-bold text-text-primary font-mono">{value}</span>
          {unit && <span className="text-sm text-text-muted">{unit}</span>}
        </div>
      </div>
    </motion.div>
  );
}

export default function AnalyticsPage() {
  const { metrics, historicalMetrics, tasks, locations, stackers } = useWMSStore();
  const [timeRange, setTimeRange] = useState<'24h' | '7d' | '30d'>('24h');

  const efficiencyTrendData = useMemo(() => {
    return historicalMetrics.slice(-24).map(m => ({
      time: new Date(m.timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
      入库效率: Number(m.inboundEfficiency.toFixed(1)),
      出库效率: Number(m.outboundEfficiency.toFixed(1)),
      货位利用率: Number((m.locationUtilization * 100).toFixed(1))
    }));
  }, [historicalMetrics]);

  const weeklyData = useMemo(() => {
    const days = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
    return days.map(day => ({
      day,
      入库量: Math.floor(Math.random() * 200) + 100,
      出库量: Math.floor(Math.random() * 180) + 80,
      移库量: Math.floor(Math.random() * 50) + 10
    }));
  }, []);

  const taskTypeDistribution = useMemo(() => {
    const types: Record<string, number> = {};
    tasks.forEach(t => {
      const typeName = t.type === 'inbound' ? '入库' : 
                       t.type === 'outbound' ? '出库' : 
                       t.type === 'transfer' ? '移库' : '整理';
      types[typeName] = (types[typeName] || 0) + 1;
    });
    return Object.entries(types).map(([name, value]) => ({ name, value }));
  }, [tasks]);

  const stackerEfficiencyData = useMemo(() => {
    return stackers.map(s => ({
      name: s.name,
      效率: Number((s.efficiency * 100).toFixed(1)),
      任务数: s.totalTasks
    }));
  }, [stackers]);

  const hourlyData = useMemo(() => {
    return Array.from({ length: 24 }).map((_, i) => ({
      hour: `${String(i).padStart(2, '0')}:00`,
      任务量: Math.floor(Math.random() * 50) + (i >= 8 && i <= 18 ? 20 : 5)
    }));
  }, []);

  const completedTasksToday = tasks.filter(t => 
    t.status === 'completed' && 
    t.completedAt && 
    new Date(t.completedAt).toDateString() === new Date().toDateString()
  ).length;

  const avgTaskDuration = useMemo(() => {
    const completed = tasks.filter(t => t.status === 'completed' && t.startedAt && t.completedAt);
    if (completed.length === 0) return 0;
    const total = completed.reduce((sum, t) => {
      const duration = ((t.completedAt! - t.startedAt!) / (1000 * 60));
      return sum + duration;
    }, 0);
    return total / completed.length;
  }, [tasks]);

  const locationUtilization = (metrics.locationUtilization * 100).toFixed(1);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex gap-2">
            {(['24h', '7d', '30d'] as const).map(range => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  timeRange === range 
                    ? 'bg-primary text-white' 
                    : 'bg-surface text-text-muted hover:text-text-primary'
                }`}
              >
                {range === '24h' ? '24小时' : range === '7d' ? '7天' : '30天'}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button className="p-2 bg-surface hover:bg-surface-hover rounded-lg transition-colors">
            <Calendar className="w-5 h-5 text-text-muted" />
          </button>
          <button className="p-2 bg-surface hover:bg-surface-hover rounded-lg transition-colors">
            <RefreshCw className="w-5 h-5 text-text-muted" />
          </button>
          <button className="px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded-lg flex items-center gap-2 transition-colors">
            <Download className="w-4 h-4" />
            导出报告
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="货位利用率"
          value={locationUtilization}
          unit="%"
          change={2.3}
          changeLabel="较昨日"
          icon={MapPin}
          color="bg-primary"
        />
        <MetricCard
          title="入库效率"
          value={metrics.inboundEfficiency.toFixed(1)}
          unit="件/小时"
          change={5.7}
          changeLabel="较昨日"
          icon={TrendingUp}
          color="bg-accent-green"
        />
        <MetricCard
          title="平均作业时长"
          value={avgTaskDuration.toFixed(1)}
          unit="分钟"
          change={-3.2}
          changeLabel="较昨日"
          icon={Clock}
          color="bg-accent-amber"
          isPositiveGood={false}
        />
        <MetricCard
          title="今日完成任务"
          value={completedTasksToday.toString()}
          change={12.5}
          changeLabel="较昨日"
          icon={Target}
          color="bg-accent-purple"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-surface rounded-xl border border-surface-border overflow-hidden">
          <div className="p-4 border-b border-surface-border">
            <h3 className="font-semibold text-text-primary">效率趋势分析</h3>
            <p className="text-xs text-text-muted">过去24小时入库/出库效率变化</p>
          </div>
          <div className="p-4 h-80">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={efficiencyTrendData}>
                <defs>
                  <linearGradient id="colorInbound" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
                <XAxis dataKey="time" stroke="#64748B" fontSize={10} />
                <YAxis stroke="#64748B" fontSize={10} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1E293B',
                    border: '1px solid #334155',
                    borderRadius: '8px',
                    fontSize: '12px'
                  }}
                />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="入库效率"
                  stroke="#10B981"
                  strokeWidth={2}
                  fill="url(#colorInbound)"
                />
                <Line
                  type="monotone"
                  dataKey="出库效率"
                  stroke="#F59E0B"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="货位利用率"
                  stroke="#06B6D4"
                  strokeWidth={2}
                  dot={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-surface rounded-xl border border-surface-border overflow-hidden">
          <div className="p-4 border-b border-surface-border">
            <h3 className="font-semibold text-text-primary">周作业量统计</h3>
            <p className="text-xs text-text-muted">本周各类型作业量对比</p>
          </div>
          <div className="p-4 h-80">
            <ResponsiveContainer width="100%" height="100%">
              <ReBarChart data={weeklyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
                <XAxis dataKey="day" stroke="#64748B" fontSize={12} />
                <YAxis stroke="#64748B" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1E293B',
                    border: '1px solid #334155',
                    borderRadius: '8px',
                    fontSize: '12px'
                  }}
                />
                <Legend />
                <Bar dataKey="入库量" fill="#06B6D4" radius={[4, 4, 0, 0]} />
                <Bar dataKey="出库量" fill="#10B981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="移库量" fill="#F59E0B" radius={[4, 4, 0, 0]} />
              </ReBarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-surface rounded-xl border border-surface-border overflow-hidden">
          <div className="p-4 border-b border-surface-border">
            <h3 className="font-semibold text-text-primary">24小时任务分布</h3>
            <p className="text-xs text-text-muted">全天各时段任务量热力分布</p>
          </div>
          <div className="p-4 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={hourlyData}>
                <defs>
                  <linearGradient id="colorHourly" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06B6D4" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#06B6D4" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
                <XAxis dataKey="hour" stroke="#64748B" fontSize={10} />
                <YAxis stroke="#64748B" fontSize={10} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1E293B',
                    border: '1px solid #334155',
                    borderRadius: '8px',
                    fontSize: '12px'
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="任务量"
                  stroke="#06B6D4"
                  strokeWidth={2}
                  fill="url(#colorHourly)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-surface rounded-xl border border-surface-border p-4">
            <h3 className="font-semibold text-text-primary mb-4">任务类型分布</h3>
            <div className="space-y-3">
              {taskTypeDistribution.map((item, index) => {
                const colors = ['#06B6D4', '#10B981', '#F59E0B', '#8B5CF6'];
                const total = taskTypeDistribution.reduce((sum, i) => sum + i.value, 0);
                const percentage = ((item.value / total) * 100).toFixed(1);
                
                return (
                  <div key={item.name}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <div className="flex items-center gap-2">
                        <span 
                          className="w-3 h-3 rounded-sm" 
                          style={{ backgroundColor: colors[index] }}
                        />
                        <span className="text-text-primary">{item.name}</span>
                      </div>
                      <span className="text-text-muted font-mono">{item.value} ({percentage}%)</span>
                    </div>
                    <div className="h-2 bg-surface-hover rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${percentage}%` }}
                        transition={{ delay: index * 0.1 }}
                        className="h-full rounded-full"
                        style={{ backgroundColor: colors[index] }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-surface rounded-xl border border-surface-border p-4">
            <h3 className="font-semibold text-text-primary mb-4">堆垛机效率排行</h3>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <ReBarChart data={stackerEfficiencyData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
                  <XAxis type="number" stroke="#64748B" fontSize={10} domain={[0, 100]} />
                  <YAxis dataKey="name" type="category" stroke="#64748B" fontSize={10} width={80} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1E293B',
                      border: '1px solid #334155',
                      borderRadius: '8px',
                      fontSize: '12px'
                    }}
                  />
                  <Bar dataKey="效率" fill="#06B6D4" radius={[0, 4, 4, 0]} />
                </ReBarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-surface rounded-xl border border-surface-border overflow-hidden">
        <div className="p-4 border-b border-surface-border">
          <h3 className="font-semibold text-text-primary">算法优化效果对比</h3>
          <p className="text-xs text-text-muted">智能算法应用前后的关键指标对比</p>
        </div>
        <div className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-background rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <Package className="w-5 h-5 text-primary" />
                <span className="text-sm text-text-muted">货位利用率</span>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-text-muted">优化前</span>
                  <span className="text-text-primary font-mono">52.3%</span>
                </div>
                <div className="h-2 bg-surface-hover rounded-full overflow-hidden">
                  <div className="h-full w-[52.3%] bg-text-muted rounded-full" />
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-text-muted">优化后</span>
                  <span className="text-accent-green font-mono">{locationUtilization}%</span>
                </div>
                <div className="h-2 bg-surface-hover rounded-full overflow-hidden">
                  <div className="h-full bg-accent-green rounded-full" style={{ width: `${locationUtilization}%` }} />
                </div>
                <div className="text-center text-accent-green text-sm font-medium">
                  <TrendingUp className="w-4 h-4 inline mr-1" />
                  提升 {((parseFloat(locationUtilization) - 52.3)).toFixed(1)}%
                </div>
              </div>
            </div>

            <div className="bg-background rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <Zap className="w-5 h-5 text-accent-amber" />
                <span className="text-sm text-text-muted">入库效率</span>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-text-muted">优化前</span>
                  <span className="text-text-primary font-mono">68.5 件/时</span>
                </div>
                <div className="h-2 bg-surface-hover rounded-full overflow-hidden">
                  <div className="h-full w-[57%] bg-text-muted rounded-full" />
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-text-muted">优化后</span>
                  <span className="text-accent-green font-mono">{metrics.inboundEfficiency.toFixed(1)} 件/时</span>
                </div>
                <div className="h-2 bg-surface-hover rounded-full overflow-hidden">
                  <div className="h-full bg-accent-green rounded-full" style={{ width: `${metrics.inboundEfficiency}%` }} />
                </div>
                <div className="text-center text-accent-green text-sm font-medium">
                  <TrendingUp className="w-4 h-4 inline mr-1" />
                  提升 {((metrics.inboundEfficiency - 68.5) / 68.5 * 100).toFixed(1)}%
                </div>
              </div>
            </div>

            <div className="bg-background rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <Clock className="w-5 h-5 text-accent-red" />
                <span className="text-sm text-text-muted">平均作业时长</span>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-text-muted">优化前</span>
                  <span className="text-text-primary font-mono">12.5 分钟</span>
                </div>
                <div className="h-2 bg-surface-hover rounded-full overflow-hidden">
                  <div className="h-full w-[62.5%] bg-text-muted rounded-full" />
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-text-muted">优化后</span>
                  <span className="text-accent-green font-mono">{avgTaskDuration.toFixed(1)} 分钟</span>
                </div>
                <div className="h-2 bg-surface-hover rounded-full overflow-hidden">
                  <div className="h-full bg-accent-green rounded-full" style={{ width: `${avgTaskDuration * 5}%` }} />
                </div>
                <div className="text-center text-accent-green text-sm font-medium">
                  <TrendingDown className="w-4 h-4 inline mr-1" />
                  缩短 {((12.5 - avgTaskDuration) / 12.5 * 100).toFixed(1)}%
                </div>
              </div>
            </div>

            <div className="bg-background rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <Target className="w-5 h-5 text-accent-purple" />
                <span className="text-sm text-text-muted">碎片率</span>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-text-muted">优化前</span>
                  <span className="text-text-primary font-mono">18.2%</span>
                </div>
                <div className="h-2 bg-surface-hover rounded-full overflow-hidden">
                  <div className="h-full w-[45.5%] bg-text-muted rounded-full" />
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-text-muted">优化后</span>
                  <span className="text-accent-green font-mono">{(metrics.fragmentRate * 100).toFixed(1)}%</span>
                </div>
                <div className="h-2 bg-surface-hover rounded-full overflow-hidden">
                  <div className="h-full bg-accent-green rounded-full" style={{ width: `${metrics.fragmentRate * 200}%` }} />
                </div>
                <div className="text-center text-accent-green text-sm font-medium">
                  <TrendingDown className="w-4 h-4 inline mr-1" />
                  降低 {((18.2 - metrics.fragmentRate * 100)).toFixed(1)}%
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
