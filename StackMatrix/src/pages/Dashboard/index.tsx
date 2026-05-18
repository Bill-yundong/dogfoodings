import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Package, MapPin, Clock, Activity, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import useWMSStore from '../../store/useWMSStore';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';

const formatPercent = (value: number) => (value * 100).toFixed(1) + '%';
const formatNumber = (value: number) => value.toFixed(1);

interface MetricCardProps {
  title: string;
  value: string;
  change: number;
  icon: typeof Package;
  color: string;
  suffix?: string;
}

function MetricCard({ title, value, change, icon: Icon, color, suffix }: MetricCardProps) {
  const isPositive = change >= 0;
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      className="bg-surface rounded-xl p-6 border border-surface-border card-hover relative overflow-hidden"
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
            isPositive ? 'text-accent-green' : 'text-accent-red'
          }`}>
            {isPositive ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
            <span>{Math.abs(change).toFixed(1)}%</span>
          </div>
        </div>
        
        <h3 className="text-text-muted text-sm mb-1">{title}</h3>
        <div className="flex items-baseline gap-1">
          <span className="text-2xl font-bold text-text-primary font-mono">{value}</span>
          {suffix && <span className="text-sm text-text-muted">{suffix}</span>}
        </div>
      </div>
    </motion.div>
  );
}

function RealtimeFeed() {
  const { realtimeUpdates, tasks, stackers } = useWMSStore();
  const recentUpdates = realtimeUpdates.slice(0, 8);

  const getUpdateIcon = (type: string) => {
    switch (type) {
      case 'task': return <Package className="w-4 h-4 text-primary" />;
      case 'stacker': return <Activity className="w-4 h-4 text-accent-amber" />;
      case 'location': return <MapPin className="w-4 h-4 text-accent-green" />;
      default: return <Clock className="w-4 h-4 text-text-muted" />;
    }
  };

  const getUpdateText = (update: any) => {
    switch (update.type) {
      case 'task':
        const task = tasks.find(t => t.id === update.id);
        if (update.data?.status === 'completed') return `任务 ${update.id?.slice(-6)} 已完成`;
        if (update.data?.status === 'executing') return `任务 ${update.id?.slice(-6)} 开始执行`;
        return `新任务创建: ${update.id?.slice(-6)}`;
      case 'stacker':
        const stacker = stackers.find(s => s.id === update.id);
        return `堆垛机 ${stacker?.name || update.id} 状态更新`;
      case 'location':
        return `货位 ${update.id} 状态变更`;
      default:
        return '系统更新';
    }
  };

  return (
    <div className="bg-surface rounded-xl border border-surface-border overflow-hidden">
      <div className="p-4 border-b border-surface-border flex items-center justify-between">
        <h3 className="font-semibold text-text-primary">实时动态</h3>
        <span className="flex items-center gap-2 text-xs text-text-muted">
          <span className="w-2 h-2 rounded-full bg-accent-green animate-pulse" />
          实时更新中
        </span>
      </div>
      <div className="p-4 space-y-3 max-h-80 overflow-y-auto">
        {recentUpdates.map((update, index) => (
          <motion.div
            key={update.timestamp + index}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
            className="flex items-center gap-3 p-3 rounded-lg hover:bg-surface-hover transition-colors"
          >
            <div className="w-8 h-8 rounded-lg bg-background flex items-center justify-center">
              {getUpdateIcon(update.type)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-text-primary truncate">{getUpdateText(update)}</p>
              <p className="text-xs text-text-muted">
                {formatDistanceToNow(update.timestamp, { addSuffix: true, locale: zhCN })}
              </p>
            </div>
          </motion.div>
        ))}
        {recentUpdates.length === 0 && (
          <div className="text-center py-8 text-text-muted text-sm">
            暂无实时动态
          </div>
        )}
      </div>
    </div>
  );
}

function StackerStatus() {
  const { stackers } = useWMSStore();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running': return 'bg-accent-green';
      case 'idle': return 'bg-primary';
      case 'paused': return 'bg-accent-amber';
      case 'error': return 'bg-accent-red';
      default: return 'bg-text-muted';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'running': return '运行中';
      case 'idle': return '空闲';
      case 'paused': return '暂停';
      case 'error': return '故障';
      default: return '未知';
    }
  };

  return (
    <div className="bg-surface rounded-xl border border-surface-border overflow-hidden">
      <div className="p-4 border-b border-surface-border">
        <h3 className="font-semibold text-text-primary">堆垛机状态</h3>
      </div>
      <div className="p-4 grid grid-cols-2 lg:grid-cols-3 gap-3">
        {stackers.map((stacker, index) => (
          <motion.div
            key={stacker.id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.05 }}
            className="bg-background rounded-lg p-4"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-text-primary">{stacker.name}</span>
              <span className={`w-2 h-2 rounded-full ${getStatusColor(stacker.status)} ${
                stacker.status === 'running' || stacker.status === 'error' ? 'animate-pulse' : ''
              }`} />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-text-muted">状态</span>
                <span className="text-text-primary">{getStatusText(stacker.status)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-text-muted">效率</span>
                <span className="text-primary font-mono">{(stacker.efficiency * 100).toFixed(0)}%</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-text-muted">任务数</span>
                <span className="text-text-primary font-mono">{stacker.totalTasks}</span>
              </div>
            </div>
            {stacker.status === 'error' && stacker.errorMessage && (
              <div className="mt-2 p-2 bg-accent-red/10 rounded text-xs text-accent-red">
                {stacker.errorMessage}
              </div>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { metrics, historicalMetrics, tasks, locations } = useWMSStore();

  const chartData = historicalMetrics.slice(-24).map(m => ({
    time: new Date(m.timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
    货位利用率: Number((m.locationUtilization * 100).toFixed(1)),
    入库效率: Number(m.inboundEfficiency.toFixed(1)),
    出库效率: Number(m.outboundEfficiency.toFixed(1))
  }));

  const taskByType = [
    { name: '入库', value: tasks.filter(t => t.type === 'inbound').length, color: '#06B6D4' },
    { name: '出库', value: tasks.filter(t => t.type === 'outbound').length, color: '#10B981' },
    { name: '移库', value: tasks.filter(t => t.type === 'transfer').length, color: '#F59E0B' },
    { name: '整理', value: tasks.filter(t => t.type === 'defrag').length, color: '#8B5CF6' }
  ];

  const pendingTasks = tasks.filter(t => t.status === 'pending').length;
  const executingTasks = tasks.filter(t => t.status === 'executing').length;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="货位利用率"
          value={formatPercent(metrics.locationUtilization)}
          change={2.3}
          icon={MapPin}
          color="bg-primary"
        />
        <MetricCard
          title="入库效率"
          value={formatNumber(metrics.inboundEfficiency)}
          change={5.7}
          icon={TrendingUp}
          color="bg-accent-green"
          suffix="件/小时"
        />
        <MetricCard
          title="出库效率"
          value={formatNumber(metrics.outboundEfficiency)}
          change={-1.2}
          icon={TrendingDown}
          color="bg-accent-amber"
          suffix="件/小时"
        />
        <MetricCard
          title="碎片率"
          value={formatPercent(metrics.fragmentRate)}
          change={-3.5}
          icon={Activity}
          color="bg-accent-purple"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-surface rounded-xl border border-surface-border overflow-hidden">
          <div className="p-4 border-b border-surface-border flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-text-primary">效率趋势</h3>
              <p className="text-xs text-text-muted">过去24小时数据</p>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-sm bg-primary" />
                货位利用率
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-sm bg-accent-green" />
                入库效率
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-sm bg-accent-amber" />
                出库效率
              </span>
            </div>
          </div>
          <div className="p-4 h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorUtilization" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06B6D4" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#06B6D4" stopOpacity={0} />
                  </linearGradient>
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
                  labelStyle={{ color: '#F1F5F9' }}
                />
                <Area
                  type="monotone"
                  dataKey="货位利用率"
                  stroke="#06B6D4"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorUtilization)"
                />
                <Area
                  type="monotone"
                  dataKey="入库效率"
                  stroke="#10B981"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorInbound)"
                />
                <Line
                  type="monotone"
                  dataKey="出库效率"
                  stroke="#F59E0B"
                  strokeWidth={2}
                  dot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <RealtimeFeed />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <StackerStatus />
        </div>

        <div className="lg:col-span-2 bg-surface rounded-xl border border-surface-border overflow-hidden">
          <div className="p-4 border-b border-surface-border">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-text-primary">任务分布</h3>
                <p className="text-xs text-text-muted">按任务类型统计</p>
              </div>
              <div className="flex items-center gap-4 text-sm">
                <span className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-accent-amber" />
                  待处理: {pendingTasks}
                </span>
                <span className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-accent-green animate-pulse" />
                  执行中: {executingTasks}
                </span>
              </div>
            </div>
          </div>
          <div className="p-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={taskByType}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
                <XAxis dataKey="name" stroke="#64748B" fontSize={12} />
                <YAxis stroke="#64748B" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1E293B',
                    border: '1px solid #334155',
                    borderRadius: '8px',
                    fontSize: '12px'
                  }}
                />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {taskByType.map((entry, index) => (
                    <motion.rect
                      key={`cell-${index}`}
                      fill={entry.color}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-surface rounded-xl border border-surface-border p-4">
          <div className="text-text-muted text-sm mb-2">总货位数</div>
          <div className="text-2xl font-bold text-text-primary font-mono">{locations.length}</div>
        </div>
        <div className="bg-surface rounded-xl border border-surface-border p-4">
          <div className="text-text-muted text-sm mb-2">已占用</div>
          <div className="text-2xl font-bold text-accent-green font-mono">
            {locations.filter(l => l.status === 'occupied').length}
          </div>
        </div>
        <div className="bg-surface rounded-xl border border-surface-border p-4">
          <div className="text-text-muted text-sm mb-2">空闲</div>
          <div className="text-2xl font-bold text-primary font-mono">
            {locations.filter(l => l.status === 'empty').length}
          </div>
        </div>
        <div className="bg-surface rounded-xl border border-surface-border p-4">
          <div className="text-text-muted text-sm mb-2">SKU 总数</div>
          <div className="text-2xl font-bold text-accent-purple font-mono">{metrics.totalSKUs.toLocaleString()}</div>
        </div>
      </div>
    </div>
  );
}
