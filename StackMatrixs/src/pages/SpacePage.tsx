import React, { useState, useMemo } from 'react';
import {
  Database,
  Scan,
  Play,
  Pause,
  CheckCircle,
  TrendingDown,
  Layers,
  AlertTriangle,
} from 'lucide-react';
import { useWarehouseStore } from '@/store/useWarehouseStore';
import { analyzeWarehouseFragmentation } from '@/algorithms/fragmentationEngine';
import { Tabs } from '@/components/common/Tabs';
import { DataTable } from '@/components/common/DataTable';
import { StatusBadge } from '@/components/common/StatusBadge';
import { ProgressBar } from '@/components/common/ProgressBar';
import {
  formatNumber,
  formatPercentage,
  formatRelativeTime,
  getSeverityText,
  getFragmentTypeText,
  getStatusBgColor,
  getStatusColor,
} from '@/utils/formatters';
import type { FragmentationInfo, DefragTask } from '@/types';

export const SpacePage: React.FC = () => {
  const { locations, fragmentationInfos, defragTasks, refreshFragmentationAnalysis, startDefragTask, pauseDefragTask, completeDefragTask, addAlert } = useWarehouseStore();
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedAisle, setSelectedAisle] = useState<number | null>(null);
  const [isScanning, setIsScanning] = useState(false);

  const analysisResult = useMemo(() => {
    return analyzeWarehouseFragmentation(locations);
  }, [locations]);

  const highPriorityFragments = useMemo(() => {
    return fragmentationInfos.filter((f) => f.severity === 'high').sort((a, b) => b.wastedCapacity - a.wastedCapacity);
  }, [fragmentationInfos]);

  const selectedAisleData = useMemo(() => {
    if (selectedAisle === null) return null;
    return analysisResult.aisles.find((a) => a.aisle === selectedAisle);
  }, [selectedAisle, analysisResult]);

  const handleScan = () => {
    setIsScanning(true);
    setTimeout(() => {
      refreshFragmentationAnalysis();
      setIsScanning(false);
      addAlert({
        type: 'success',
        title: '碎片扫描完成',
        message: `检测到 ${analysisResult.totalFragments} 处空间碎片，浪费容量 ${formatNumber(analysisResult.totalWastedCapacity)}`,
        source: 'defrag',
      });
    }, 2000);
  };

  const handleStartDefrag = (taskId: string) => {
    startDefragTask(taskId);
    addAlert({
      type: 'info',
      title: '碎片整理已启动',
      message: '异步碎片整理任务开始执行',
      source: 'defrag',
    });
  };

  const fragmentColumns = [
    { key: 'id', label: '碎片ID', render: (f: FragmentationInfo) => <code className="text-xs text-wms-accent">{f.id}</code> },
    { key: 'locationId', label: '位置', render: (f) => <code className="text-xs">{f.locationId}</code> },
    { key: 'fragmentType', label: '类型', render: (f) => (
      <span className="text-xs px-2 py-0.5 bg-wms-primary/10 text-wms-primary rounded">
        {getFragmentTypeText(f.fragmentType)}
      </span>
    )},
    { key: 'severity', label: '严重程度', render: (f) => (
      <span className={`text-xs px-2 py-0.5 rounded ${
        f.severity === 'high' ? 'bg-wms-danger/10 text-wms-danger' :
        f.severity === 'medium' ? 'bg-wms-warning/10 text-wms-warning' :
        'bg-wms-subtext/10 text-wms-subtext'
      }`}>
        {getSeverityText(f.severity)}
      </span>
    )},
    { key: 'wastedCapacity', label: '浪费容量', align: 'right' as const, render: (f) => formatNumber(f.wastedCapacity) },
    { key: 'recommendedAction', label: '建议操作', render: (f) => (
      <span className="text-xs text-wms-subtext">
        {f.recommendedAction === 'consolidate' ? '合并' : f.recommendedAction === 'reallocate' ? '重新分配' : '整理'}
      </span>
    )},
    { key: 'detectedAt', label: '检测时间', render: (f) => formatRelativeTime(f.detectedAt) },
  ];

  const defragTaskColumns = [
    { key: 'id', label: '任务ID', render: (t: DefragTask) => <code className="text-xs text-wms-accent">{t.id}</code> },
    { key: 'fragmentCount', label: '碎片数', align: 'right' as const, render: (t) => t.fragmentIds.length },
    { key: 'totalMoves', label: '总移动次数', align: 'right' as const },
    { key: 'progress', label: '进度', render: (t) => (
      <ProgressBar
        value={t.totalMoves > 0 ? (t.completedMoves / t.totalMoves) * 100 : 0}
        showPercentage
        size="sm"
        color="primary"
      />
    )},
    { key: 'spaceSaved', label: '预计释放', align: 'right' as const, render: (t) => formatNumber(t.spaceSaved) },
    { key: 'status', label: '状态', render: (t) => <StatusBadge status={t.status} /> },
    {
      key: 'action',
      label: '操作',
      render: (t: DefragTask) => {
        if (t.status === 'pending') {
          return (
            <button
              onClick={() => handleStartDefrag(t.id)}
              className="flex items-center gap-1 px-2 py-1 text-xs bg-wms-primary text-white rounded hover:bg-wms-primary/80 transition-colors"
            >
              <Play className="w-3 h-3" />
              开始
            </button>
          );
        }
        if (t.status === 'running') {
          return (
            <button
              onClick={() => pauseDefragTask(t.id)}
              className="flex items-center gap-1 px-2 py-1 text-xs bg-wms-warning text-white rounded hover:bg-wms-warning/80 transition-colors"
            >
              <Pause className="w-3 h-3" />
              暂停
            </button>
          );
        }
        if (t.status === 'completed') {
          return (
            <span className="flex items-center gap-1 text-xs text-wms-success">
              <CheckCircle className="w-3 h-3" />
              已完成
            </span>
          );
        }
        return null;
      },
    },
  ];

  const tabs = [
    { id: 'overview', label: '空间总览' },
    { id: 'fragments', label: '碎片列表', count: fragmentationInfos.length },
    { id: 'defrag', label: '整理任务', count: defragTasks.length },
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="wms-card">
            <p className="text-3xl font-bold text-wms-primary">{formatPercentage(analysisResult.overallFragmentationIndex * 100, 1)}</p>
            <p className="text-xs text-wms-subtext">碎片化指数</p>
          </div>
          <div className="wms-card">
            <p className="text-3xl font-bold text-wms-warning">{formatNumber(analysisResult.totalFragments)}</p>
            <p className="text-xs text-wms-subtext">碎片总数</p>
          </div>
          <div className="wms-card">
            <p className="text-3xl font-bold text-wms-danger">{formatNumber(analysisResult.totalWastedCapacity)}</p>
            <p className="text-xs text-wms-subtext">浪费容量</p>
          </div>
          <div className="wms-card">
            <p className="text-3xl font-bold text-wms-success">{highPriorityFragments.length}</p>
            <p className="text-xs text-wms-subtext">高优先级</p>
          </div>
        </div>
        <button
          onClick={handleScan}
          disabled={isScanning}
          className="flex items-center gap-2 px-4 py-2 bg-wms-primary text-white rounded-lg hover:bg-wms-primary/80 transition-colors disabled:opacity-50"
        >
          <Scan className={`w-4 h-4 ${isScanning ? 'animate-spin' : ''}`} />
          {isScanning ? '扫描中...' : '扫描碎片'}
        </button>
      </div>

      <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 wms-panel">
            <h3 className="font-semibold text-wms-text mb-4 flex items-center gap-2">
              <Layers className="w-4 h-4 text-wms-primary" />
              巷道碎片分布
            </h3>
            <div className="grid grid-cols-5 gap-3">
              {analysisResult.aisles.map((aisle) => (
                <div
                  key={aisle.aisle}
                  onClick={() => setSelectedAisle(selectedAisle === aisle.aisle ? null : aisle.aisle)}
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${
                    selectedAisle === aisle.aisle
                      ? 'border-wms-primary bg-wms-primary/10'
                      : 'border-wms-border/50 bg-wms-bg/30 hover:border-wms-primary/50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-lg font-bold text-wms-text">巷道 {aisle.aisle}</span>
                    <AlertTriangle
                      className={`w-4 h-4 ${
                        aisle.fragmentationIndex > 0.3 ? 'text-wms-danger' :
                        aisle.fragmentationIndex > 0.15 ? 'text-wms-warning' :
                        'text-wms-success'
                      }`}
                    />
                  </div>
                  <ProgressBar
                    value={aisle.fragmentationIndex * 100}
                    label="碎片指数"
                    showPercentage
                    size="sm"
                    color={
                      aisle.fragmentationIndex > 0.3 ? 'danger' :
                      aisle.fragmentationIndex > 0.15 ? 'warning' : 'success'
                    }
                  />
                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-wms-subtext">碎片数</span>
                      <p className="font-medium text-wms-text">{aisle.fragments.length}</p>
                    </div>
                    <div>
                      <span className="text-wms-subtext">浪费</span>
                      <p className="font-medium text-wms-warning">{formatNumber(aisle.wastedCapacity)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="wms-panel h-fit sticky top-6">
            {selectedAisleData ? (
              <div>
                <h3 className="font-semibold text-wms-text mb-4">
                  巷道 {selectedAisleData.aisle} 详情
                </h3>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-wms-bg/50 rounded-lg text-center">
                      <p className="text-xl font-bold text-wms-text">{selectedAisleData.totalLocations}</p>
                      <p className="text-xs text-wms-subtext">总货位</p>
                    </div>
                    <div className="p-3 bg-wms-bg/50 rounded-lg text-center">
                      <p className="text-xl font-bold text-wms-success">{selectedAisleData.occupiedLocations}</p>
                      <p className="text-xs text-wms-subtext">已占用</p>
                    </div>
                    <div className="p-3 bg-wms-bg/50 rounded-lg text-center">
                      <p className="text-xl font-bold text-wms-primary">{selectedAisleData.emptyLocations}</p>
                      <p className="text-xs text-wms-subtext">空闲</p>
                    </div>
                    <div className="p-3 bg-wms-bg/50 rounded-lg text-center">
                      <p className="text-xl font-bold text-wms-warning">{selectedAisleData.fragments.length}</p>
                      <p className="text-xs text-wms-subtext">碎片数</p>
                    </div>
                  </div>

                  <div>
                    <p className="text-xs text-wms-subtext mb-2">碎片分布</p>
                    <div className="space-y-2">
                      {selectedAisleData.fragments.slice(0, 5).map((frag) => (
                        <div
                          key={frag.id}
                          className={`p-2 rounded-lg border ${getStatusBgColor(frag.severity)} border-wms-border/30`}
                        >
                          <div className="flex items-center justify-between">
                            <code className="text-xs">{frag.locationId}</code>
                            <span className={`text-xs ${getStatusColor(frag.severity)}`}>
                              {getSeverityText(frag.severity)}
                            </span>
                          </div>
                          <p className="text-xs text-wms-subtext mt-0.5">
                            浪费 {formatNumber(frag.wastedCapacity)} 容量
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-wms-subtext">
                <Database className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>选择巷道查看详情</p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'fragments' && (
        <div className="wms-panel">
          <DataTable columns={fragmentColumns} data={fragmentationInfos} />
        </div>
      )}

      {activeTab === 'defrag' && (
        <div className="space-y-6">
          <div className="wms-panel">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-wms-text">整理任务</h3>
              <button
                onClick={() => {
                  const newTask: DefragTask = {
                    id: `DEFRAG-${Date.now()}`,
                    status: 'pending',
                    fragmentIds: highPriorityFragments.slice(0, 10).map((f) => f.id),
                    totalMoves: 15,
                    completedMoves: 0,
                    estimatedDuration: 300000,
                    stackerIds: ['STK-001'],
                    spaceSaved: 500,
                  };
                  useWarehouseStore.setState((state) => ({
                    defragTasks: [newTask, ...state.defragTasks],
                  }));
                }}
                className="flex items-center gap-2 px-4 py-2 bg-wms-success text-white rounded-lg hover:bg-wms-success/80 transition-colors"
              >
                <Play className="w-4 h-4" />
                创建整理任务
              </button>
            </div>
            <DataTable columns={defragTaskColumns} data={defragTasks} />
          </div>

          <div className="wms-panel">
            <h3 className="font-semibold text-wms-text mb-4 flex items-center gap-2">
              <TrendingDown className="w-4 h-4 text-wms-success" />
              整理效果预测
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-wms-bg/50 rounded-lg border border-wms-border/50">
                <p className="text-wms-subtext text-sm">预计释放空间</p>
                <p className="text-2xl font-bold text-wms-success mt-1">
                  {formatNumber(analysisResult.totalWastedCapacity * 0.8)}
                </p>
                <p className="text-xs text-wms-subtext mt-1">基于历史整理效率</p>
              </div>
              <div className="p-4 bg-wms-bg/50 rounded-lg border border-wms-border/50">
                <p className="text-wms-subtext text-sm">预计提升利用率</p>
                <p className="text-2xl font-bold text-wms-primary mt-1">+5.2%</p>
                <p className="text-xs text-wms-subtext mt-1">从 78.5% 提升至 83.7%</p>
              </div>
              <div className="p-4 bg-wms-bg/50 rounded-lg border border-wms-border/50">
                <p className="text-wms-subtext text-sm">预计完成时间</p>
                <p className="text-2xl font-bold text-wms-accent mt-1">2.5 小时</p>
                <p className="text-xs text-wms-subtext mt-1">异步执行不影响作业</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
