import { useState, useEffect } from 'react';
import { AlertCircle, Wrench, CheckCircle, Clock, TrendingUp, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMonitorStore } from '@/store/useMonitorStore';
import { useSimulationStore } from '@/store/useSimulationStore';
import { generateMaintenanceSuggestions } from '@/utils/mppt';
import { initDB, maintenanceTaskDB, shadowRecordDB } from '@/utils/db';
import type { Alert, MaintenanceTask, SchedulingSuggestion } from '@/types/solar';

const priorityColors = {
  low: 'bg-slate-500',
  medium: 'bg-yellow-500',
  high: 'bg-orange-500',
  critical: 'bg-red-500',
};

const priorityLabels = {
  low: '低',
  medium: '中',
  high: '高',
  critical: '紧急',
};

const severityColors = {
  info: 'bg-blue-500',
  warning: 'bg-yellow-500',
  error: 'bg-orange-500',
  critical: 'bg-red-500',
};

export default function Operation() {
  const { alerts, unreadAlerts, suggestions, setSuggestions, acknowledgeAlert, addAlert } = useMonitorStore();
  const { panels, powerGenerations, rayTracingResults } = useSimulationStore();
  const [activeTab, setActiveTab] = useState<'alerts' | 'tasks' | 'suggestions'>('alerts');
  const [tasks, setTasks] = useState<MaintenanceTask[]>([]);
  
  useEffect(() => {
    const loadData = async () => {
      await initDB();
      const savedTasks = await maintenanceTaskDB.getAll();
      setTasks(savedTasks);
    };
    loadData();
  }, []);
  
  useEffect(() => {
    if (powerGenerations.length > 0 && panels.length > 0) {
      (async () => {
        const shadowRecords = await shadowRecordDB.getAll();
        const newSuggestions = generateMaintenanceSuggestions(panels, powerGenerations, shadowRecords);
        
        const schedulingSuggestions: SchedulingSuggestion[] = newSuggestions.map((s, index) => ({
          id: `suggestion-${Date.now()}-${index}`,
          type: s.type,
          description: s.description,
          targetRegionId: 'region-shanghai',
          estimatedBenefit: s.estimatedBenefit,
          confidence: 0.8 + Math.random() * 0.2,
          timestamp: Date.now(),
        }));
        
        setSuggestions(schedulingSuggestions);
      })();
    }
  }, [powerGenerations, panels, setSuggestions]);
  
  const handleCreateTask = (suggestion: SchedulingSuggestion) => {
    const newTask: MaintenanceTask = {
      id: `task-${Date.now()}`,
      panelId: panels[0]?.id || '',
      type: suggestion.type,
      description: suggestion.description,
      scheduledTime: Date.now() + 24 * 60 * 60 * 1000,
      priority: 'medium',
      status: 'pending',
      estimatedLoss: suggestion.estimatedBenefit,
    };
    
    maintenanceTaskDB.put(newTask);
    setTasks([...tasks, newTask]);
    
    addAlert({
      id: `alert-${Date.now()}`,
      type: 'task_created',
      message: `已创建新的维护任务: ${suggestion.type}`,
      severity: 'info',
      timestamp: Date.now(),
      acknowledged: false,
    });
  };
  
  const handleTaskStatusChange = (taskId: string, status: MaintenanceTask['status']) => {
    maintenanceTaskDB.updateStatus(taskId, status);
    setTasks(tasks.map((t) => (t.id === taskId ? { ...t, status } : t)));
  };
  
  const stats = {
    totalAlerts: alerts.length,
    unreadAlerts,
    pendingTasks: tasks.filter((t) => t.status === 'pending').length,
    inProgressTasks: tasks.filter((t) => t.status === 'in_progress').length,
    completedTasks: tasks.filter((t) => t.status === 'completed').length,
    totalSuggestions: suggestions.length,
  };
  
  return (
    <div className="h-full overflow-auto p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">运维管理</h1>
          <p className="text-slate-400">故障告警、维护调度与智能优化建议</p>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-slate-900/50 backdrop-blur-md rounded-2xl border border-slate-700/50 p-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-red-500/20">
                <AlertCircle className="text-red-400" size={20} />
              </div>
              <div>
                <p className="text-sm text-slate-400">活动告警</p>
                <p className="text-2xl font-bold text-white">{stats.totalAlerts}</p>
              </div>
            </div>
          </div>
          <div className="bg-slate-900/50 backdrop-blur-md rounded-2xl border border-slate-700/50 p-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-yellow-500/20">
                <Clock className="text-yellow-400" size={20} />
              </div>
              <div>
                <p className="text-sm text-slate-400">待处理任务</p>
                <p className="text-2xl font-bold text-white">{stats.pendingTasks}</p>
              </div>
            </div>
          </div>
          <div className="bg-slate-900/50 backdrop-blur-md rounded-2xl border border-slate-700/50 p-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-cyan-500/20">
                <Wrench className="text-cyan-400" size={20} />
              </div>
              <div>
                <p className="text-sm text-slate-400">进行中</p>
                <p className="text-2xl font-bold text-white">{stats.inProgressTasks}</p>
              </div>
            </div>
          </div>
          <div className="bg-slate-900/50 backdrop-blur-md rounded-2xl border border-slate-700/50 p-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-emerald-500/20">
                <TrendingUp className="text-emerald-400" size={20} />
              </div>
              <div>
                <p className="text-sm text-slate-400">优化建议</p>
                <p className="text-2xl font-bold text-white">{stats.totalSuggestions}</p>
              </div>
            </div>
          </div>
        </div>
        
        <div className="flex gap-2 mb-6">
          {(['alerts', 'tasks', 'suggestions'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                activeTab === tab
                  ? 'bg-cyan-500 text-white'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
              }`}
            >
              {tab === 'alerts' && '告警中心'}
              {tab === 'tasks' && '维护任务'}
              {tab === 'suggestions' && '调度建议'}
              {tab === 'alerts' && unreadAlerts > 0 && (
                <span className="ml-2 px-2 py-0.5 bg-red-500 rounded-full text-xs">
                  {unreadAlerts}
                </span>
              )}
            </button>
          ))}
        </div>
        
        <AnimatePresence mode="wait">
          {activeTab === 'alerts' && (
            <motion.div
              key="alerts"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-slate-900/50 backdrop-blur-md rounded-2xl border border-slate-700/50 overflow-hidden"
            >
              {alerts.length === 0 ? (
                <div className="p-12 text-center">
                  <CheckCircle className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
                  <p className="text-slate-400">暂无告警信息</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-700/50">
                  {alerts.slice(0, 20).map((alert) => (
                    <div
                      key={alert.id}
                      className={`p-4 flex items-start gap-4 hover:bg-slate-800/30 transition-colors ${
                        !alert.acknowledged ? 'bg-slate-800/20' : ''
                      }`}
                    >
                      <div className={`mt-1 p-2 rounded-lg ${severityColors[alert.severity]}/20`}>
                        <AlertTriangle className={`${severityColors[alert.severity].replace('bg-', 'text-')}`} size={16} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium text-white">{alert.message}</h4>
                          <span className="text-xs text-slate-500">
                            {new Date(alert.timestamp).toLocaleString('zh-CN')}
                          </span>
                        </div>
                        <p className="text-sm text-slate-400 mt-1">
                          类型: {alert.type}
                          {alert.panelId && ` | 面板: ${alert.panelId}`}
                        </p>
                      </div>
                      {!alert.acknowledged && (
                        <button
                          onClick={() => acknowledgeAlert(alert.id)}
                          className="px-3 py-1 text-xs bg-cyan-500/20 text-cyan-400 rounded-lg hover:bg-cyan-500/30 transition-colors"
                        >
                          确认
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}
          
          {activeTab === 'tasks' && (
            <motion.div
              key="tasks"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-4"
            >
              {tasks.length === 0 ? (
                <div className="bg-slate-900/50 backdrop-blur-md rounded-2xl border border-slate-700/50 p-12 text-center">
                  <Wrench className="w-16 h-16 text-slate-500 mx-auto mb-4" />
                  <p className="text-slate-400">暂无维护任务</p>
                </div>
              ) : (
                tasks.map((task) => (
                  <div
                    key={task.id}
                    className="bg-slate-900/50 backdrop-blur-md rounded-2xl border border-slate-700/50 p-4"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium text-white">{task.type}</h4>
                          <span className={`px-2 py-0.5 rounded text-xs ${priorityColors[task.priority]} text-white`}>
                            {priorityLabels[task.priority]}
                          </span>
                        </div>
                        <p className="text-sm text-slate-400 mt-1">{task.description}</p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                          <span>面板: {task.panelId}</span>
                          <span>预计损失: ¥{task.estimatedLoss.toFixed(2)}</span>
                          <span>计划时间: {new Date(task.scheduledTime).toLocaleString('zh-CN')}</span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {task.status === 'pending' && (
                          <>
                            <button
                              onClick={() => handleTaskStatusChange(task.id, 'in_progress')}
                              className="px-3 py-1 text-xs bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 transition-colors"
                            >
                              开始
                            </button>
                            <button
                              onClick={() => handleTaskStatusChange(task.id, 'cancelled')}
                              className="px-3 py-1 text-xs bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600 transition-colors"
                            >
                              取消
                            </button>
                          </>
                        )}
                        {task.status === 'in_progress' && (
                          <button
                            onClick={() => handleTaskStatusChange(task.id, 'completed')}
                            className="px-3 py-1 text-xs bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors"
                          >
                            完成
                          </button>
                        )}
                        {task.status === 'completed' && (
                          <span className="px-3 py-1 text-xs bg-emerald-500/20 text-emerald-400 rounded-lg">
                            已完成
                          </span>
                        )}
                        {task.status === 'cancelled' && (
                          <span className="px-3 py-1 text-xs bg-slate-500/20 text-slate-400 rounded-lg">
                            已取消
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </motion.div>
          )}
          
          {activeTab === 'suggestions' && (
            <motion.div
              key="suggestions"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="grid grid-cols-1 md:grid-cols-2 gap-4"
            >
              {suggestions.length === 0 ? (
                <div className="col-span-2 bg-slate-900/50 backdrop-blur-md rounded-2xl border border-slate-700/50 p-12 text-center">
                  <TrendingUp className="w-16 h-16 text-slate-500 mx-auto mb-4" />
                  <p className="text-slate-400">正在分析数据，暂无优化建议</p>
                </div>
              ) : (
                suggestions.slice(0, 6).map((suggestion) => (
                  <div
                    key={suggestion.id}
                    className="bg-slate-900/50 backdrop-blur-md rounded-2xl border border-slate-700/50 p-5"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <h4 className="font-medium text-white">{suggestion.type}</h4>
                      <div className="flex items-center gap-1 text-xs text-cyan-400">
                        <TrendingUp size={12} />
                        {(suggestion.confidence * 100).toFixed(0)}% 置信度
                      </div>
                    </div>
                    <p className="text-sm text-slate-400 mb-4">{suggestion.description}</p>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-slate-500">预计年收益提升</p>
                        <p className="text-lg font-bold text-emerald-400 font-mono">
                          ¥{suggestion.estimatedBenefit.toFixed(2)}
                        </p>
                      </div>
                      <button
                        onClick={() => handleCreateTask(suggestion)}
                        className="px-4 py-2 text-sm bg-cyan-500 text-white rounded-xl hover:bg-cyan-600 transition-colors"
                      >
                        创建任务
                      </button>
                    </div>
                  </div>
                ))
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
