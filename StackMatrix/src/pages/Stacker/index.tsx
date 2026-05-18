import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Truck, Play, Pause, AlertTriangle, CheckCircle, Clock, MapPin, ArrowRight, Settings } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import useWMSStore from '../../store/useWMSStore';
import { Stacker, Task } from '../../types';

function StackerCard({ stacker, onSelect, isSelected }: { stacker: Stacker; onSelect: () => void; isSelected: boolean }) {
  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'running':
        return { color: 'bg-accent-green', text: '运行中', pulse: true };
      case 'idle':
        return { color: 'bg-primary', text: '空闲', pulse: false };
      case 'paused':
        return { color: 'bg-accent-amber', text: '暂停', pulse: false };
      case 'error':
        return { color: 'bg-accent-red', text: '故障', pulse: true };
      default:
        return { color: 'bg-text-muted', text: '未知', pulse: false };
    }
  };

  const statusConfig = getStatusConfig(stacker.status);

  return (
    <motion.div
      whileHover={{ y: -4 }}
      whileTap={{ scale: 0.98 }}
      onClick={onSelect}
      className={`bg-surface rounded-xl border p-6 cursor-pointer transition-all ${
        isSelected ? 'border-primary shadow-lg shadow-primary/20' : 'border-surface-border'
      }`}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 rounded-xl ${statusConfig.color} bg-opacity-20 flex items-center justify-center`}>
            <Truck className={`w-6 h-6 ${statusConfig.color.replace('bg-', 'text-')}`} />
          </div>
          <div>
            <h3 className="font-semibold text-text-primary">{stacker.name}</h3>
            <div className="flex items-center gap-2 mt-1">
              <span className={`w-2 h-2 rounded-full ${statusConfig.color} ${statusConfig.pulse ? 'animate-pulse' : ''}`} />
              <span className="text-xs text-text-muted">{statusConfig.text}</span>
            </div>
          </div>
        </div>
        <Settings className="w-5 h-5 text-text-muted hover:text-text-primary transition-colors" />
      </div>

      <div className="grid grid-cols-3 gap-4 mb-4">
        <div className="text-center">
          <p className="text-2xl font-bold text-text-primary font-mono">
            {(stacker.efficiency * 100).toFixed(0)}%
          </p>
          <p className="text-xs text-text-muted">效率</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-text-primary font-mono">
            {stacker.totalTasks.toLocaleString()}
          </p>
          <p className="text-xs text-text-muted">总任务</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-text-primary font-mono">
            {stacker.currentPosition.row}-{stacker.currentPosition.col}
          </p>
          <p className="text-xs text-text-muted">位置</p>
        </div>
      </div>

      {stacker.currentTask && (
        <div className="bg-background rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-text-muted">当前任务</span>
            <span className="text-xs text-primary font-mono">{stacker.currentTask.id.slice(-8)}</span>
          </div>
          <p className="text-sm text-text-primary truncate mb-2">{stacker.currentTask.skuName}</p>
          <div className="flex items-center justify-between text-xs text-text-muted">
            <span>{stacker.currentTask.fromLocation || '入库'}</span>
            <ArrowRight className="w-3 h-3" />
            <span>{stacker.currentTask.toLocation}</span>
          </div>
          <div className="mt-3">
            <div className="flex justify-between text-xs mb-1">
              <span className="text-text-muted">进度</span>
              <span className="text-primary">{stacker.currentTask.progress}%</span>
            </div>
            <div className="h-1.5 bg-surface-hover rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${stacker.currentTask.progress}%` }}
                className="h-full bg-gradient-to-r from-primary to-primary-light rounded-full"
              />
            </div>
          </div>
        </div>
      )}

      {stacker.status === 'error' && stacker.errorMessage && (
        <div className="mt-4 p-3 bg-accent-red/10 border border-accent-red/30 rounded-lg">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-accent-red flex-shrink-0 mt-0.5" />
            <p className="text-xs text-accent-red">{stacker.errorMessage}</p>
          </div>
        </div>
      )}
    </motion.div>
  );
}

function TaskItem({ task, onAssign, stackers }: { task: Task; onAssign: (taskId: string, stackerId: string) => void; stackers: Stacker[] }) {
  const [showAssign, setShowAssign] = useState(false);
  
  const getTypeConfig = (type: string) => {
    switch (type) {
      case 'inbound':
        return { color: 'bg-primary', text: '入库', icon: '↓' };
      case 'outbound':
        return { color: 'bg-accent-green', text: '出库', icon: '↑' };
      case 'transfer':
        return { color: 'bg-accent-amber', text: '移库', icon: '↔' };
      case 'defrag':
        return { color: 'bg-accent-purple', text: '整理', icon: '⚙' };
      default:
        return { color: 'bg-text-muted', text: '未知', icon: '?' };
    }
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'pending':
        return { color: 'text-accent-amber', icon: Clock, text: '待处理' };
      case 'executing':
        return { color: 'text-primary', icon: Play, text: '执行中' };
      case 'completed':
        return { color: 'text-accent-green', icon: CheckCircle, text: '已完成' };
      case 'failed':
        return { color: 'text-accent-red', icon: AlertTriangle, text: '失败' };
      default:
        return { color: 'text-text-muted', icon: Clock, text: '未知' };
    }
  };

  const typeConfig = getTypeConfig(task.type);
  const statusConfig = getStatusConfig(task.status);
  const StatusIcon = statusConfig.icon;
  const availableStackers = stackers.filter(s => s.status === 'idle');

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-background rounded-lg p-4 border border-surface-border hover:border-primary/50 transition-colors"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-lg ${typeConfig.color} flex items-center justify-center text-white text-sm font-bold`}>
            {typeConfig.icon}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm text-text-primary">{task.id.slice(-8)}</span>
              <span className={`px-2 py-0.5 rounded text-xs ${typeConfig.color} bg-opacity-20 ${typeConfig.color.replace('bg-', 'text-')}`}>
                {typeConfig.text}
              </span>
            </div>
            <p className="text-sm text-text-muted mt-0.5">{task.skuName}</p>
          </div>
        </div>
        <div className={`flex items-center gap-1 ${statusConfig.color}`}>
          <StatusIcon className="w-4 h-4" />
          <span className="text-xs">{statusConfig.text}</span>
        </div>
      </div>

      <div className="flex items-center gap-2 text-xs text-text-muted mb-3">
        <MapPin className="w-3 h-3" />
        <span>{task.fromLocation || '入库台'}</span>
        <ArrowRight className="w-3 h-3" />
        <span>{task.toLocation}</span>
      </div>

      <div className="flex items-center justify-between text-xs">
        <span className="text-text-muted">
          创建于 {formatDistanceToNow(task.createdAt, { addSuffix: true, locale: zhCN })}
        </span>
        {task.status === 'pending' && (
          <div className="relative">
            <button
              onClick={() => setShowAssign(!showAssign)}
              className="px-3 py-1 bg-primary hover:bg-primary-dark text-white rounded transition-colors"
            >
              分配任务
            </button>
            <AnimatePresence>
              {showAssign && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="absolute right-0 top-full mt-2 bg-surface border border-surface-border rounded-lg shadow-xl z-10 min-w-40 overflow-hidden"
                >
                  {availableStackers.length > 0 ? (
                    availableStackers.map(stacker => (
                      <button
                        key={stacker.id}
                        onClick={() => {
                          onAssign(task.id, stacker.id);
                          setShowAssign(false);
                        }}
                        className="w-full px-3 py-2 text-left text-sm text-text-primary hover:bg-surface-hover transition-colors"
                      >
                        {stacker.name}
                      </button>
                    ))
                  ) : (
                    <p className="px-3 py-2 text-xs text-text-muted">暂无空闲堆垛机</p>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
        {task.status === 'executing' && (
          <div className="flex items-center gap-2">
            <div className="w-24 h-1.5 bg-surface-hover rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary rounded-full transition-all"
                style={{ width: `${task.progress}%` }}
              />
            </div>
            <span className="text-primary">{task.progress}%</span>
          </div>
        )}
      </div>
    </motion.div>
  );
}

export default function StackerPage() {
  const { stackers, tasks, assignTaskToStacker, updateTaskStatus } = useWMSStore();
  const [selectedStackerId, setSelectedStackerId] = useState<string | null>(null);
  const [taskFilter, setTaskFilter] = useState<'all' | 'pending' | 'executing' | 'completed'>('all');
  const [simulating, setSimulating] = useState(false);

  const filteredTasks = tasks.filter(t => {
    if (taskFilter === 'all') return true;
    return t.status === taskFilter;
  }).slice(0, 20);

  const pendingCount = tasks.filter(t => t.status === 'pending').length;
  const executingCount = tasks.filter(t => t.status === 'executing').length;
  const completedCount = tasks.filter(t => t.status === 'completed').length;

  useEffect(() => {
    if (!simulating) return;

    const interval = setInterval(() => {
      const executingTasks = tasks.filter(t => t.status === 'executing');
      executingTasks.forEach(task => {
        if (task.progress < 100) {
          const newProgress = Math.min(100, task.progress + Math.floor(Math.random() * 10) + 5);
          if (newProgress >= 100) {
            updateTaskStatus(task.id, 'completed');
          } else {
            updateTaskStatus(task.id, 'executing');
          }
        }
      });
    }, 2000);

    return () => clearInterval(interval);
  }, [simulating, tasks, updateTaskStatus]);

  const handleAssignTask = (taskId: string, stackerId: string) => {
    assignTaskToStacker(taskId, stackerId);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex gap-2">
            <button
              onClick={() => setTaskFilter('all')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                taskFilter === 'all' ? 'bg-primary text-white' : 'bg-surface text-text-muted hover:text-text-primary'
              }`}
            >
              全部 ({tasks.length})
            </button>
            <button
              onClick={() => setTaskFilter('pending')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                taskFilter === 'pending' ? 'bg-accent-amber text-white' : 'bg-surface text-text-muted hover:text-text-primary'
              }`}
            >
              待处理 ({pendingCount})
            </button>
            <button
              onClick={() => setTaskFilter('executing')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                taskFilter === 'executing' ? 'bg-primary text-white' : 'bg-surface text-text-muted hover:text-text-primary'
              }`}
            >
              执行中 ({executingCount})
            </button>
            <button
              onClick={() => setTaskFilter('completed')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                taskFilter === 'completed' ? 'bg-accent-green text-white' : 'bg-surface text-text-muted hover:text-text-primary'
              }`}
            >
              已完成 ({completedCount})
            </button>
          </div>
        </div>
        <button
          onClick={() => setSimulating(!simulating)}
          className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors ${
            simulating ? 'bg-accent-red text-white' : 'bg-primary text-white'
          }`}
        >
          {simulating ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          {simulating ? '停止模拟' : '开始模拟'}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {stackers.map(stacker => (
          <StackerCard
            key={stacker.id}
            stacker={stacker}
            isSelected={selectedStackerId === stacker.id}
            onSelect={() => setSelectedStackerId(stacker.id === selectedStackerId ? null : stacker.id)}
          />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-surface rounded-xl border border-surface-border overflow-hidden">
          <div className="p-4 border-b border-surface-border">
            <h3 className="font-semibold text-text-primary">任务队列</h3>
          </div>
          <div className="p-4 space-y-3 max-h-[600px] overflow-y-auto">
            {filteredTasks.length > 0 ? (
              filteredTasks.map(task => (
                <TaskItem
                  key={task.id}
                  task={task}
                  onAssign={handleAssignTask}
                  stackers={stackers}
                />
              ))
            ) : (
              <div className="text-center py-12 text-text-muted">
                <Clock className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>暂无任务</p>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-surface rounded-xl border border-surface-border p-4">
            <h3 className="font-semibold text-text-primary mb-4">实时联动状态</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-background rounded-lg">
                <span className="text-sm text-text-muted">WMS 模块</span>
                <span className="flex items-center gap-2 text-sm">
                  <span className="w-2 h-2 rounded-full bg-accent-green animate-pulse" />
                  <span className="text-accent-green">在线</span>
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-background rounded-lg">
                <span className="text-sm text-text-muted">堆垛机控制</span>
                <span className="flex items-center gap-2 text-sm">
                  <span className="w-2 h-2 rounded-full bg-accent-green animate-pulse" />
                  <span className="text-accent-green">在线</span>
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-background rounded-lg">
                <span className="text-sm text-text-muted">数据同步</span>
                <span className="flex items-center gap-2 text-sm">
                  <span className="w-2 h-2 rounded-full bg-accent-green animate-pulse" />
                  <span className="text-accent-green">实时</span>
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-background rounded-lg">
                <span className="text-sm text-text-muted">消息队列</span>
                <span className="flex items-center gap-2 text-sm">
                  <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                  <span className="text-primary">{pendingCount} 条待处理</span>
                </span>
              </div>
            </div>
          </div>

          <div className="bg-surface rounded-xl border border-surface-border p-4">
            <h3 className="font-semibold text-text-primary mb-4">今日统计</h3>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-text-muted">入库完成</span>
                  <span className="text-text-primary font-mono">128 件</span>
                </div>
                <div className="h-2 bg-surface-hover rounded-full overflow-hidden">
                  <div className="h-full w-4/5 bg-primary rounded-full" />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-text-muted">出库完成</span>
                  <span className="text-text-primary font-mono">96 件</span>
                </div>
                <div className="h-2 bg-surface-hover rounded-full overflow-hidden">
                  <div className="h-full w-3/4 bg-accent-green rounded-full" />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-text-muted">移库完成</span>
                  <span className="text-text-primary font-mono">34 件</span>
                </div>
                <div className="h-2 bg-surface-hover rounded-full overflow-hidden">
                  <div className="h-full w-1/3 bg-accent-amber rounded-full" />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-text-muted">碎片整理</span>
                  <span className="text-text-primary font-mono">12 处</span>
                </div>
                <div className="h-2 bg-surface-hover rounded-full overflow-hidden">
                  <div className="h-full w-1/4 bg-accent-purple rounded-full" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
