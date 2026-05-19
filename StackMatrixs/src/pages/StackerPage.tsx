import React, { useState, useMemo } from 'react';
import { Bot, Play, Pause, AlertTriangle, RefreshCw, Settings, Clock, CheckCircle2 } from 'lucide-react';
import { useWarehouseStore } from '@/store/useWarehouseStore';
import { Tabs } from '@/components/common/Tabs';
import { DataTable } from '@/components/common/DataTable';
import { StatusBadge } from '@/components/common/StatusBadge';
import { ProgressBar } from '@/components/common/ProgressBar';
import {
  formatDate,
  formatNumber,
  formatRelativeTime,
  getStatusColor,
} from '@/utils/formatters';
import type { StackerTask } from '@/types';

export const StackerPage: React.FC = () => {
  const { stackers, updateStackerStatus, addAlert } = useWarehouseStore();
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedStacker, setSelectedStacker] = useState<string | null>(null);

  const selectedStackerData = useMemo(() => {
    return stackers.find((s) => s.id === selectedStacker) || null;
  }, [stackers, selectedStacker]);

  const allTasks = useMemo(() => {
    return stackers.flatMap((s) =>
      s.taskQueue.map((t) => ({ ...t, stackerId: s.id, stackerName: s.name }))
    );
  }, [stackers]);

  const runningTasks = allTasks.filter((t) => t.status === 'executing');
  const pendingTasks = allTasks.filter((t) => t.status === 'pending');

  const handleToggleStacker = (stackerId: string, currentStatus: string) => {
    if (currentStatus === 'running') {
      updateStackerStatus(stackerId, 'paused');
      addAlert({
        type: 'warning',
        title: '堆垛机已暂停',
        message: `堆垛机 ${stackerId} 已暂停运行`,
        source: 'stacker',
      });
    } else if (currentStatus === 'paused' || currentStatus === 'idle') {
      updateStackerStatus(stackerId, 'running');
      addAlert({
        type: 'success',
        title: '堆垛机已启动',
        message: `堆垛机 ${stackerId} 恢复运行`,
        source: 'stacker',
      });
    }
  };

  const tabs = [
    { id: 'overview', label: '设备总览' },
    { id: 'tasks', label: '任务队列', count: allTasks.length },
    { id: 'efficiency', label: '效率分析' },
  ];

  const taskColumns = [
    { key: 'id', label: '任务ID', render: (t: StackerTask & { stackerName: string }) => (
      <code className="text-xs text-wms-accent">{t.id}</code>
    )},
    { key: 'type', label: '类型', render: (t) => (
      <span className={`text-xs px-2 py-0.5 rounded ${
        t.type === 'inbound' ? 'bg-wms-primary/10 text-wms-primary' :
        t.type === 'outbound' ? 'bg-wms-success/10 text-wms-success' :
        t.type === 'defrag' ? 'bg-wms-warning/10 text-wms-warning' :
        'bg-wms-subtext/10 text-wms-subtext'
      }`}>
        {t.type === 'inbound' ? '入库' : t.type === 'outbound' ? '出库' : t.type === 'defrag' ? '碎片整理' : '移库'}
      </span>
    )},
    { key: 'stackerName', label: '执行设备' },
    { key: 'fromLocation', label: '起始货位', render: (t) => t.fromLocation ? <code className="text-xs">{t.fromLocation}</code> : '-' },
    { key: 'toLocation', label: '目标货位', render: (t) => t.toLocation ? <code className="text-xs text-wms-primary">{t.toLocation}</code> : '-' },
    { key: 'priority', label: '优先级', render: (t) => (
      <span className={`text-xs ${
        t.priority === 'urgent' ? 'text-wms-danger' :
        t.priority === 'high' ? 'text-wms-warning' :
        t.priority === 'medium' ? 'text-wms-primary' :
        'text-wms-subtext'
      }`}>
        {t.priority === 'urgent' ? '紧急' : t.priority === 'high' ? '高' : t.priority === 'medium' ? '中' : '低'}
      </span>
    )},
    { key: 'status', label: '状态', render: (t) => <StatusBadge status={t.status} /> },
    { key: 'createdAt', label: '创建时间', render: (t) => formatRelativeTime(t.createdAt) },
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="wms-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-wms-subtext text-sm">总设备数</p>
              <p className="text-3xl font-bold text-wms-text mt-1">{stackers.length}</p>
            </div>
            <Bot className="w-8 h-8 text-wms-primary" />
          </div>
        </div>
        <div className="wms-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-wms-subtext text-sm">运行中</p>
              <p className="text-3xl font-bold text-wms-success mt-1">
                {stackers.filter((s) => s.status === 'running').length}
              </p>
            </div>
            <Play className="w-8 h-8 text-wms-success" />
          </div>
        </div>
        <div className="wms-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-wms-subtext text-sm">执行中任务</p>
              <p className="text-3xl font-bold text-wms-accent mt-1">{runningTasks.length}</p>
            </div>
            <RefreshCw className="w-8 h-8 text-wms-accent" />
          </div>
        </div>
        <div className="wms-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-wms-subtext text-sm">故障设备</p>
              <p className="text-3xl font-bold text-wms-danger mt-1">
                {stackers.filter((s) => s.status === 'fault').length}
              </p>
            </div>
            <AlertTriangle className="w-8 h-8 text-wms-danger" />
          </div>
        </div>
      </div>

      <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            {stackers.map((stacker) => (
              <div
                key={stacker.id}
                className={`wms-panel cursor-pointer transition-all ${
                  selectedStacker === stacker.id ? 'border-wms-primary ring-1 ring-wms-primary/30' : ''
                }`}
                onClick={() => setSelectedStacker(stacker.id)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div
                      className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                        stacker.status === 'running'
                          ? 'bg-wms-success/20 glow-green'
                          : stacker.status === 'fault'
                          ? 'bg-wms-danger/20'
                          : stacker.status === 'paused'
                          ? 'bg-wms-warning/20'
                          : 'bg-wms-panel'
                      }`}
                    >
                      <Bot
                        className={`w-6 h-6 ${
                          stacker.status === 'running'
                            ? 'text-wms-success animate-pulse'
                            : stacker.status === 'fault'
                            ? 'text-wms-danger'
                            : stacker.status === 'paused'
                            ? 'text-wms-warning'
                            : 'text-wms-subtext'
                        }`}
                      />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-wms-text">{stacker.name}</h4>
                        <StatusBadge status={stacker.status} />
                      </div>
                      <p className="text-sm text-wms-subtext mt-0.5">
                        当前位置: A{stacker.currentPosition.aisle}-R{stacker.currentPosition.rack}-L{stacker.currentPosition.level}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {(stacker.status === 'running' || stacker.status === 'paused' || stacker.status === 'idle') && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleStacker(stacker.id, stacker.status);
                        }}
                        className={`p-2 rounded-lg transition-colors ${
                          stacker.status === 'running'
                            ? 'bg-wms-warning/10 text-wms-warning hover:bg-wms-warning/20'
                            : 'bg-wms-success/10 text-wms-success hover:bg-wms-success/20'
                        }`}
                      >
                        {stacker.status === 'running' ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                      </button>
                    )}
                    <button className="p-2 rounded-lg bg-wms-bg/50 text-wms-subtext hover:text-wms-text transition-colors">
                      <Settings className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-4 mt-4 pt-4 border-t border-wms-border/50">
                  <div>
                    <p className="text-xs text-wms-subtext">作业效率</p>
                    <div className="mt-1">
                      <ProgressBar
                        value={stacker.efficiency}
                        showPercentage
                        size="sm"
                        color={
                          stacker.efficiency >= 80
                            ? 'success'
                            : stacker.efficiency >= 60
                            ? 'primary'
                            : 'warning'
                        }
                      />
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-wms-subtext">完成任务</p>
                    <p className="text-lg font-semibold text-wms-text">
                      {formatNumber(stacker.completedTasks)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-wms-subtext">任务队列</p>
                    <p className="text-lg font-semibold text-wms-accent">
                      {stacker.taskQueue.length}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-wms-subtext">故障率</p>
                    <p className="text-lg font-semibold text-wms-warning">
                      {stacker.totalTasks > 0
                        ? ((stacker.faultCount / stacker.totalTasks) * 100).toFixed(1)
                        : 0}%
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="wms-panel h-fit sticky top-6">
            {selectedStackerData ? (
              <div>
                <h3 className="font-semibold text-wms-text mb-4">
                  {selectedStackerData.name} 详情
                </h3>
                <div className="space-y-4">
                  <div className="p-3 bg-wms-bg/50 rounded-lg">
                    <p className="text-xs text-wms-subtext">运行时长</p>
                    <p className="text-lg font-semibold text-wms-text">
                      {selectedStackerData.uptime.toFixed(1)}%
                    </p>
                  </div>
                  <div className="p-3 bg-wms-bg/50 rounded-lg">
                    <p className="text-xs text-wms-subtext">上次维护</p>
                    <p className="text-sm text-wms-text">
                      {formatRelativeTime(selectedStackerData.lastMaintenance)}
                    </p>
                  </div>
                  <div className="p-3 bg-wms-bg/50 rounded-lg">
                    <p className="text-xs text-wms-subtext">总任务数</p>
                    <p className="text-lg font-semibold text-wms-text">
                      {formatNumber(selectedStackerData.totalTasks)}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-wms-subtext mb-2">当前任务队列</p>
                    <div className="space-y-2 max-h-60 overflow-y-auto wms-scrollbar">
                      {selectedStackerData.taskQueue.length === 0 ? (
                        <div className="text-center py-4 text-wms-subtext text-sm">暂无任务</div>
                      ) : (
                        selectedStackerData.taskQueue.map((task) => (
                          <div
                            key={task.id}
                            className="p-2 bg-wms-bg/50 rounded-lg border border-wms-border/30"
                          >
                            <div className="flex items-center justify-between">
                              <code className="text-xs text-wms-accent">{task.id}</code>
                              <StatusBadge status={task.status} showText={false} />
                            </div>
                            <div className="flex items-center gap-2 mt-1 text-xs text-wms-subtext">
                              <span>{task.type === 'inbound' ? '入库' : task.type === 'outbound' ? '出库' : '移库'}</span>
                              <span>→</span>
                              <code>{task.toLocation}</code>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-wms-subtext">
                <Bot className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>选择设备查看详情</p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'tasks' && (
        <div className="wms-panel">
          <DataTable columns={taskColumns} data={allTasks} />
        </div>
      )}

      {activeTab === 'efficiency' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="wms-panel">
            <h3 className="font-semibold text-wms-text mb-4">设备效率排行</h3>
            <div className="space-y-3">
              {[...stackers]
                .sort((a, b) => b.efficiency - a.efficiency)
                .map((stacker, idx) => (
                  <div key={stacker.id} className="flex items-center gap-4">
                    <span
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                        idx === 0
                          ? 'bg-yellow-500/20 text-yellow-400'
                          : idx === 1
                          ? 'bg-gray-400/20 text-gray-300'
                          : idx === 2
                          ? 'bg-amber-700/20 text-amber-600'
                          : 'bg-wms-bg text-wms-subtext'
                      }`}
                    >
                      {idx + 1}
                    </span>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-wms-text">{stacker.name}</span>
                        <span className="text-sm text-wms-subtext">{stacker.efficiency.toFixed(1)}%</span>
                      </div>
                      <ProgressBar
                        value={stacker.efficiency}
                        size="sm"
                        color={
                          stacker.efficiency >= 80
                            ? 'success'
                            : stacker.efficiency >= 60
                            ? 'primary'
                            : 'warning'
                        }
                      />
                    </div>
                  </div>
                ))}
            </div>
          </div>

          <div className="wms-panel">
            <h3 className="font-semibold text-wms-text mb-4">任务完成统计</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-wms-bg/50 rounded-lg text-center">
                <CheckCircle2 className="w-8 h-8 text-wms-success mx-auto mb-2" />
                <p className="text-2xl font-bold text-wms-success">
                  {formatNumber(stackers.reduce((sum, s) => sum + s.completedTasks, 0))}
                </p>
                <p className="text-xs text-wms-subtext">总完成任务</p>
              </div>
              <div className="p-4 bg-wms-bg/50 rounded-lg text-center">
                <Clock className="w-8 h-8 text-wms-primary mx-auto mb-2" />
                <p className="text-2xl font-bold text-wms-primary">
                  {formatNumber(stackers.reduce((sum, s) => sum + s.taskQueue.length, 0))}
                </p>
                <p className="text-xs text-wms-subtext">待处理任务</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
