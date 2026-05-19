import React, { useState, useMemo } from 'react';
import {
  Plus,
  Search,
  Filter,
  Play,
  CheckCircle,
  Link2,
  TrendingUp,
  Package,
} from 'lucide-react';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  BarChart,
  Bar,
} from 'recharts';
import { useWarehouseStore } from '@/store/useWarehouseStore';
import { Tabs } from '@/components/common/Tabs';
import { DataTable } from '@/components/common/DataTable';
import { StatusBadge } from '@/components/common/StatusBadge';
import { ProgressBar } from '@/components/common/ProgressBar';
import {
  formatDate,
  formatRelativeTime,
  getStrategyText,
  getStatusColor,
  truncateString,
} from '@/utils/formatters';
import type { InboundTask } from '@/types';

export const AllocationPage: React.FC = () => {
  const {
    inboundTasks,
    skus,
    locations,
    associationRules,
    runAllocation,
    runBatchAllocation,
    addInboundTask,
  } = useWarehouseStore();

  const [activeTab, setActiveTab] = useState('tasks');
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewTaskModal, setShowNewTaskModal] = useState(false);
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set());
  const [allocating, setAllocating] = useState(false);

  const [newTask, setNewTask] = useState({
    skuId: '',
    quantity: 1,
    priority: 'normal' as InboundTask['priority'],
    strategy: 'balanced' as InboundTask['strategy'],
  });

  const filteredTasks = useMemo(() => {
    return inboundTasks.filter(
      (t) =>
        t.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.skuId.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [inboundTasks, searchQuery]);

  const associationMatrix = useMemo(() => {
    const topRules = associationRules.slice(0, 20);
    return topRules.map((rule, idx) => {
      const sku1 = skus.find((s) => s.id === rule.skuId1);
      const sku2 = skus.find((s) => s.id === rule.skuId2);
      return {
        id: `assoc-${idx}`,
        sku1: sku1?.name || rule.skuId1,
        sku2: sku2?.name || rule.skuId2,
        confidence: Math.round(rule.confidence * 100),
        support: Math.round(rule.support * 100),
        lift: Math.round(rule.lift * 100) / 100,
        orderCount: rule.orderCount,
      };
    });
  }, [associationRules, skus]);

  const categoryDistribution = useMemo(() => {
    const dist: Record<string, number> = {};
    skus.forEach((s) => {
      dist[s.category] = (dist[s.category] || 0) + 1;
    });
    return Object.entries(dist)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }, [skus]);

  const handleRunAllocation = async (taskId: string) => {
    setAllocating(true);
    await runAllocation(taskId);
    setAllocating(false);
  };

  const handleBatchAllocation = async () => {
    if (selectedTasks.size === 0) return;
    setAllocating(true);
    await runBatchAllocation(Array.from(selectedTasks));
    setSelectedTasks(new Set());
    setAllocating(false);
  };

  const handleCreateTask = () => {
    if (!newTask.skuId) return;
    addInboundTask({
      ...newTask,
      status: 'pending',
    });
    setShowNewTaskModal(false);
    setNewTask({
      skuId: '',
      quantity: 1,
      priority: 'normal',
      strategy: 'balanced',
    });
  };

  const toggleTaskSelection = (taskId: string) => {
    setSelectedTasks((prev) => {
      const next = new Set(prev);
      if (next.has(taskId)) {
        next.delete(taskId);
      } else {
        next.add(taskId);
      }
      return next;
    });
  };

  const pendingTasks = inboundTasks.filter((t) => t.status === 'pending');
  const completedTasks = inboundTasks.filter((t) => t.status === 'completed');

  const tabs = [
    { id: 'tasks', label: '入库任务', count: inboundTasks.length },
    { id: 'association', label: '关联分析', count: associationRules.length },
    { id: 'distribution', label: '品类分布' },
  ];

  const columns = [
    {
      key: 'select',
      label: '',
      width: '40',
      render: (row: InboundTask) =>
        row.status === 'pending' ? (
          <input
            type="checkbox"
            checked={selectedTasks.has(row.id)}
            onChange={() => toggleTaskSelection(row.id)}
            className="w-4 h-4 rounded border-wms-border bg-wms-bg text-wms-primary focus:ring-wms-primary"
          />
        ) : null,
    },
    { key: 'id', label: '任务ID', render: (r: InboundTask) => <code className="text-xs text-wms-accent">{r.id}</code> },
    { key: 'skuId', label: 'SKU', render: (r: InboundTask) => {
      const sku = skus.find((s) => s.id === r.skuId);
      return (
        <div>
          <p className="font-medium">{sku?.name || r.skuId}</p>
          <p className="text-xs text-wms-subtext">{r.skuId}</p>
        </div>
      );
    }},
    { key: 'quantity', label: '数量', align: 'right' as const },
    { key: 'strategy', label: '策略', render: (r: InboundTask) => (
      <span className="text-xs px-2 py-1 bg-wms-primary/10 text-wms-primary rounded">{getStrategyText(r.strategy)}</span>
    )},
    { key: 'allocatedLocation', label: '分配货位', render: (r: InboundTask) => (
      r.allocatedLocation ? <code className="text-xs text-wms-success">{r.allocatedLocation}</code> : <span className="text-wms-subtext">-</span>
    )},
    { key: 'status', label: '状态', render: (r: InboundTask) => <StatusBadge status={r.status} /> },
    { key: 'createdAt', label: '创建时间', render: (r: InboundTask) => formatRelativeTime(r.createdAt) },
    {
      key: 'action',
      label: '操作',
      render: (r: InboundTask) =>
        r.status === 'pending' ? (
          <button
            onClick={() => handleRunAllocation(r.id)}
            disabled={allocating}
            className="flex items-center gap-1 px-2 py-1 text-xs bg-wms-primary text-white rounded hover:bg-wms-primary/80 transition-colors disabled:opacity-50"
          >
            <Play className="w-3 h-3" />
            分配
          </button>
        ) : r.status === 'allocated' ? (
          <span className="text-xs text-wms-success flex items-center gap-1">
            <CheckCircle className="w-3 h-3" />
            已分配
          </span>
        ) : null,
    },
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex gap-2">
            <div className="wms-card text-center">
              <p className="text-2xl font-bold text-wms-primary">{pendingTasks.length}</p>
              <p className="text-xs text-wms-subtext">待分配</p>
            </div>
            <div className="wms-card text-center">
              <p className="text-2xl font-bold text-wms-success">{completedTasks.length}</p>
              <p className="text-xs text-wms-subtext">已完成</p>
            </div>
            <div className="wms-card text-center">
              <p className="text-2xl font-bold text-wms-accent">{skus.length}</p>
              <p className="text-xs text-wms-subtext">SKU总数</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-wms-subtext" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索任务ID或SKU..."
              className="w-64 pl-9 pr-4 py-2 bg-wms-bg border border-wms-border rounded-lg text-sm text-wms-text placeholder-wms-subtext focus:outline-none focus:border-wms-primary transition-colors"
            />
          </div>
          {selectedTasks.size > 0 && (
            <button
              onClick={handleBatchAllocation}
              disabled={allocating}
              className="flex items-center gap-2 px-4 py-2 bg-wms-success text-white rounded-lg hover:bg-wms-success/80 transition-colors disabled:opacity-50"
            >
              <Play className="w-4 h-4" />
              批量分配 ({selectedTasks.size})
            </button>
          )}
          <button
            onClick={() => setShowNewTaskModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-wms-primary text-white rounded-lg hover:bg-wms-primary/80 transition-colors"
          >
            <Plus className="w-4 h-4" />
            新建入库任务
          </button>
        </div>
      </div>

      <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

      {activeTab === 'tasks' && (
        <div className="wms-panel">
          <DataTable
            columns={columns}
            data={filteredTasks}
            rowClassName={(row) => row.status === 'failed' ? 'bg-wms-danger/5' : ''}
          />
        </div>
      )}

      {activeTab === 'association' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="wms-panel">
            <h3 className="font-semibold text-wms-text mb-4 flex items-center gap-2">
              <Link2 className="w-4 h-4 text-wms-accent" />
              SKU 关联度矩阵
            </h3>
            <DataTable
              columns={[
                { key: 'sku1', label: 'SKU A', render: (r: typeof associationMatrix[0]) => truncateString(r.sku1, 15) },
                { key: 'sku2', label: 'SKU B', render: (r: typeof associationMatrix[0]) => truncateString(r.sku2, 15) },
                { key: 'confidence', label: '置信度', align: 'right' as const, render: (r) => `${r.confidence}%` },
                { key: 'support', label: '支持度', align: 'right' as const, render: (r) => `${r.support}%` },
                { key: 'lift', label: '提升度', align: 'right' as const, render: (r) => r.lift.toFixed(2) },
                { key: 'orderCount', label: '共现次数', align: 'right' as const },
              ]}
              data={associationMatrix}
            />
          </div>

          <div className="space-y-6">
            <div className="wms-panel">
              <h3 className="font-semibold text-wms-text mb-4 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-wms-success" />
                置信度分布
              </h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={associationMatrix.slice(0, 10)} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis type="number" stroke="#94A3B8" fontSize={11} />
                  <YAxis dataKey="sku1" type="category" stroke="#94A3B8" fontSize={10} width={100} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1E293B',
                      border: '1px solid #334155',
                      borderRadius: '8px',
                      color: '#F1F5F9',
                    }}
                  />
                  <Bar dataKey="confidence" fill="#3B82F6" radius={[0, 4, 4, 0]}>
                    {associationMatrix.slice(0, 10).map((_, i) => (
                      <Cell key={i} fill={i < 3 ? '#10B981' : '#3B82F6'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="wms-panel">
              <h3 className="font-semibold text-wms-text mb-4">分配策略说明</h3>
              <div className="space-y-3">
                <div className="p-3 bg-wms-bg/50 rounded-lg">
                  <p className="font-medium text-wms-text">流动性优先</p>
                  <p className="text-xs text-wms-subtext mt-1">高流动性SKU优先分配至出入口附近，提升出库效率</p>
                </div>
                <div className="p-3 bg-wms-bg/50 rounded-lg">
                  <p className="font-medium text-wms-text">关联优先</p>
                  <p className="text-xs text-wms-subtext mt-1">关联度高的SKU尽量相邻放置，减少拣货路径</p>
                </div>
                <div className="p-3 bg-wms-bg/50 rounded-lg">
                  <p className="font-medium text-wms-text">空间优先</p>
                  <p className="text-xs text-wms-subtext mt-1">最大化单货位空间利用率，减少碎片化</p>
                </div>
                <div className="p-3 bg-wms-bg/50 rounded-lg">
                  <p className="font-medium text-wms-text">综合平衡</p>
                  <p className="text-xs text-wms-subtext mt-1">综合考虑各因素，实现整体最优</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'distribution' && (
        <div className="wms-panel">
          <h3 className="font-semibold text-wms-text mb-4">品类 SKU 分布</h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {categoryDistribution.map((cat) => (
              <div key={cat.name} className="p-4 bg-wms-bg/50 rounded-lg border border-wms-border/50">
                <p className="text-3xl font-bold text-wms-primary">{cat.value}</p>
                <p className="text-sm text-wms-text mt-1">{cat.name}</p>
                <ProgressBar
                  value={(cat.value / skus.length) * 100}
                  size="sm"
                  className="mt-2"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {showNewTaskModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-wms-panel border border-wms-border rounded-xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-lg font-semibold text-wms-text mb-4">新建入库任务</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-wms-subtext mb-1">SKU</label>
                <select
                  value={newTask.skuId}
                  onChange={(e) => setNewTask({ ...newTask, skuId: e.target.value })}
                  className="wms-input"
                >
                  <option value="">请选择SKU</option>
                  {skus.slice(0, 100).map((sku) => (
                    <option key={sku.id} value={sku.id}>
                      {sku.name} ({sku.id})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm text-wms-subtext mb-1">数量</label>
                <input
                  type="number"
                  min="1"
                  value={newTask.quantity}
                  onChange={(e) => setNewTask({ ...newTask, quantity: Number(e.target.value) })}
                  className="wms-input"
                />
              </div>
              <div>
                <label className="block text-sm text-wms-subtext mb-1">优先级</label>
                <select
                  value={newTask.priority}
                  onChange={(e) => setNewTask({ ...newTask, priority: e.target.value as InboundTask['priority'] })}
                  className="wms-input"
                >
                  <option value="normal">普通</option>
                  <option value="high">高</option>
                  <option value="urgent">紧急</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-wms-subtext mb-1">分配策略</label>
                <select
                  value={newTask.strategy}
                  onChange={(e) => setNewTask({ ...newTask, strategy: e.target.value as InboundTask['strategy'] })}
                  className="wms-input"
                >
                  <option value="liquidity">流动性优先</option>
                  <option value="association">关联优先</option>
                  <option value="space">空间优先</option>
                  <option value="balanced">综合平衡</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowNewTaskModal(false)}
                className="px-4 py-2 text-wms-subtext hover:text-wms-text transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleCreateTask}
                disabled={!newTask.skuId}
                className="px-4 py-2 bg-wms-primary text-white rounded-lg hover:bg-wms-primary/80 transition-colors disabled:opacity-50"
              >
                创建
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
