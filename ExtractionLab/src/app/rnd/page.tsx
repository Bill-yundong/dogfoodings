'use client';

import { useState, useMemo, useEffect } from 'react';
import { useAppData } from '../providers';
import { PresetCard } from '@/components/PresetCard';
import { FlavorRadarChart } from '@/components/FlavorRadarChart';
import { ExtractionCurveChart } from '@/components/ExtractionCurveChart';
import { Button, Badge, StatsCard } from '@/components/ui/Card';
import { BREWING_METHODS, ROAST_LEVELS, PROCESSING_METHODS } from '@/lib/constants';
import { searchPresets, insert, update } from '@/lib/database';
import { getCurrentTimestamp } from '@/lib/utils';
import { optimizationEngine } from '@/lib/optimizationEngine';
import { syncEngine } from '@/lib/syncEngine';
import { v4 as uuidv4 } from 'uuid';
import {
  FlaskConical,
  Coffee,
  Search,
  Plus,
  Zap,
  Check,
  Clock,
  Beaker,
  Upload,
  RefreshCw,
  TrendingUp,
  Target,
  Layers,
  X,
  Save,
} from 'lucide-react';
import type { BrewingPreset, RnDExperiment, ExtractionCurve } from '@/types';

export default function RnDCenterPage() {
  const { presets, beans, experiments, curves, records, stores, refreshData } = useAppData();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'presets' | 'experiments' | 'beans'>('presets');
  const [selectedPreset, setSelectedPreset] = useState<BrewingPreset | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [filterMethod, setFilterMethod] = useState<string>('all');
  const [filterRoast, setFilterRoast] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<BrewingPreset[]>([]);
  const [creatingExperiment, setCreatingExperiment] = useState(false);
  const [batchOptimizing, setBatchOptimizing] = useState(false);
  const [savingPreset, setSavingPreset] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 2500);
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    try {
      const results = await searchPresets(searchQuery, {
        method: filterMethod !== 'all' ? filterMethod as any : undefined,
        region: filterRoast !== 'all' ? filterRoast as any : undefined,
        status: filterStatus !== 'all' ? filterStatus as any : undefined,
      });
      setSearchResults(results);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setSearching(false);
    }
  };

  const filteredPresets = useMemo(() => {
    let list = searchQuery ? searchResults : presets;

    if (filterMethod !== 'all') {
      list = list.filter(p => p.method === filterMethod);
    }
    if (filterRoast !== 'all') {
      list = list.filter(p => {
        const bean = beans.find(b => b.id === p.beanId);
        return bean?.roastLevel === filterRoast;
      });
    }
    if (filterStatus !== 'all') {
      list = list.filter(p => p.status === filterStatus);
    }

    return list;
  }, [presets, searchResults, searchQuery, filterMethod, filterRoast, filterStatus, beans]);

  const runBatchOptimization = async () => {
    if (presets.length === 0 || stores.length === 0) {
      showToast('请确保有可用的配方和门店数据');
      return;
    }

    setBatchOptimizing(true);
    try {
      const approvedPresets = presets.filter(p => p.status === 'approved');
      const randomPreset = approvedPresets[Math.floor(Math.random() * approvedPresets.length)] || presets[0];
      const randomStore = stores[Math.floor(Math.random() * stores.length)];
      const relevantRecords = records.filter(
        r => r.presetId === randomPreset.id && r.storeId === randomStore.id
      );

      const result = await optimizationEngine.optimize(
        randomPreset,
        randomStore,
        relevantRecords
      );

      if (result.qualityImprovement > 2) {
        const updatedPreset: BrewingPreset = {
          ...randomPreset,
          ...result.optimizedParameters,
          updatedAt: getCurrentTimestamp(),
          version: randomPreset.version + 1,
        };

        await update('presets', updatedPreset.id, updatedPreset);
        await syncEngine.queueSync('preset', 'update', updatedPreset.id, updatedPreset);
        await refreshData();
        showToast(`优化完成！品质提升 ${result.qualityImprovement.toFixed(1)}%`);
      } else {
        showToast('当前配方已是最优状态，无需优化');
      }
    } catch (error) {
      console.error('Batch optimization failed:', error);
      showToast('批量优化失败，请重试');
    } finally {
      setBatchOptimizing(false);
    }
  };

  const createExperiment = async () => {
    if (presets.length === 0) {
      showToast('请先创建一些配方');
      return;
    }

    setCreatingExperiment(true);
    try {
      const basePreset = presets[Math.floor(Math.random() * presets.length)];
      const newExperiment: RnDExperiment = {
        id: uuidv4(),
        name: `配方优化实验 - ${new Date().toLocaleDateString('zh-CN')} #${Math.floor(Math.random() * 1000)}`,
        description: '多因子变量测试，寻找最佳萃取参数组合',
        hypothesis: '通过调整关键萃取参数，可以显著提升咖啡风味表现',
        beanId: basePreset.beanId,
        basePresetId: basePreset.id,
        variants: [],
        variables: [
          { name: 'waterTemperature', min: 90, max: 96, step: 1, unit: '°C' },
          { name: 'grindSize', min: 0.2, max: 0.4, step: 0.02, unit: 'mm' },
          { name: 'brewRatio', min: 14, max: 18, step: 0.5, unit: '' },
        ],
        status: 'running',
        trials: Math.floor(Math.random() * 10) + 8,
        completedTrials: Math.floor(Math.random() * 3),
        createdAt: new Date().toISOString(),
        startedAt: getCurrentTimestamp(),
        createdBy: '研发团队',
      };

      try {
        await insert('experiments', newExperiment);
      } catch (dbError) {
        console.error('DB insert failed for experiment:', dbError);
        showToast(`数据库写入失败: ${dbError instanceof Error ? dbError.message : String(dbError)}`);
        return;
      }

      try {
        await syncEngine.queueSync('experiment', 'create', newExperiment.id, newExperiment as any);
      } catch (syncError) {
        console.warn('Sync queue failed (non-critical):', syncError);
      }

      await refreshData();
      setActiveTab('experiments');
      showToast('实验创建成功！');
    } catch (error) {
      console.error('Failed to create experiment:', error);
      showToast(`创建实验失败: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setCreatingExperiment(false);
    }
  };

  const presetStats = useMemo(() => {
    const approved = presets.filter(p => p.status === 'approved').length;
    const draft = presets.filter(p => p.status === 'draft').length;
    const testing = presets.filter(p => p.status === 'testing').length;
    const deprecated = presets.filter(p => p.status === 'deprecated').length;
    return { approved, draft, testing, deprecated, total: presets.length };
  }, [presets]);

  const selectedPresetCurves = useMemo(() => {
    if (!selectedPreset) return [];
    return curves.filter(c => c.presetId === selectedPreset.id).slice(0, 3);
  }, [selectedPreset, curves]);

  useEffect(() => {
    if (!selectedPreset && filteredPresets.length > 0) {
      setSelectedPreset(filteredPresets[0]);
    }
  }, [selectedPreset, filteredPresets]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-coffee-800 to-coffee-500 bg-clip-text text-transparent">
            研发中心
          </h1>
          <p className="text-coffee-500 mt-1">
            配方研发、风味分析、萃取实验与多因子优化
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            onClick={createExperiment}
            disabled={creatingExperiment}
            loading={creatingExperiment}
            icon={<Beaker className="w-4 h-4" />}
          >
            {creatingExperiment ? '创建中...' : '创建实验'}
          </Button>
          <Button
            onClick={runBatchOptimization}
            disabled={batchOptimizing}
            loading={batchOptimizing}
            variant="secondary"
            icon={<Zap className="w-4 h-4" />}
          >
            {batchOptimizing ? '优化中...' : '批量优化'}
          </Button>
          <Button
            onClick={() => setShowCreateModal(true)}
            variant="primary"
            icon={<Plus className="w-4 h-4" />}
          >
            新建配方
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3">
        <StatsCard
          title="全部配方"
          value={presetStats.total}
          icon={<Layers className="w-5 h-5" />}
          color="blue"
          compact
        />
        <StatsCard
          title="已发布"
          value={presetStats.approved}
          icon={<Check className="w-5 h-5" />}
          color="green"
          compact
        />
        <StatsCard
          title="测试中"
          value={presetStats.testing}
          icon={<Clock className="w-5 h-5" />}
          color="amber"
          compact
        />
        <StatsCard
          title="草稿"
          value={presetStats.draft}
          icon={<RefreshCw className="w-5 h-5" />}
          color="purple"
          compact
        />
        <StatsCard
          title="进行中实验"
          value={experiments.filter(e => e.status === 'running').length}
          icon={<FlaskConical className="w-5 h-5" />}
          color="red"
          compact
        />
      </div>

      <div className="bg-white rounded-2xl shadow-lg border border-coffee-100">
        <div className="flex items-center gap-1 p-2 border-b border-coffee-100">
          {[
            { key: 'presets', label: '配方管理', icon: <Coffee className="w-4 h-4" /> },
            { key: 'experiments', label: '研发实验', icon: <FlaskConical className="w-4 h-4" /> },
            { key: 'beans', label: '咖啡豆库', icon: <Coffee className="w-4 h-4" /> },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl transition-all ${
                activeTab === tab.key
                  ? 'bg-coffee-100 text-coffee-800 font-medium'
                  : 'text-coffee-500 hover:text-coffee-700 hover:bg-coffee-50'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'presets' && (
          <div className="p-6">
            <div className="flex flex-col sm:flex-row gap-3 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-coffee-400" />
                <input
                  type="text"
                  placeholder="搜索配方名称、豆种、风味描述..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  className="w-full pl-12 pr-4 py-3 border border-coffee-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-coffee-500/20 focus:border-coffee-500 transition-all"
                />
              </div>
              <select
                value={filterMethod}
                onChange={(e) => setFilterMethod(e.target.value)}
                className="px-4 py-3 border border-coffee-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-coffee-500/20 focus:border-coffee-500 bg-white"
              >
                <option value="all">全部冲煮方式</option>
                {BREWING_METHODS.map(m => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
              <select
                value={filterRoast}
                onChange={(e) => setFilterRoast(e.target.value)}
                className="px-4 py-3 border border-coffee-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-coffee-500/20 focus:border-coffee-500 bg-white"
              >
                <option value="all">全部烘焙度</option>
                {ROAST_LEVELS.map(r => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-4 py-3 border border-coffee-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-coffee-500/20 focus:border-coffee-500 bg-white"
              >
                <option value="all">全部状态</option>
                <option value="draft">草稿</option>
                <option value="testing">测试中</option>
                <option value="approved">已发布</option>
                <option value="deprecated">已弃用</option>
              </select>
              <Button onClick={handleSearch} icon={<Search className="w-4 h-4" />}>
                搜索
              </Button>
            </div>

            <div className="grid lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-coffee-800">
                    配方列表 <span className="text-coffee-400 font-normal">({filteredPresets.length})</span>
                  </h3>
                </div>
                {searching ? (
                  <div className="flex items-center justify-center py-12">
                    <RefreshCw className="w-8 h-8 text-coffee-400 animate-spin" />
                  </div>
                ) : filteredPresets.length === 0 ? (
                  <div className="text-center py-12 text-coffee-400">
                    <Coffee className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>暂无匹配的配方</p>
                  </div>
                ) : (
                  <div className="grid sm:grid-cols-2 gap-4 max-h-[600px] overflow-y-auto coffee-scrollbar pr-2">
                    {filteredPresets.map(preset => (
                      <div
                        key={preset.id}
                        onClick={() => setSelectedPreset(preset)}
                        className={`cursor-pointer transition-all ${
                          selectedPreset?.id === preset.id
                            ? 'ring-2 ring-coffee-500 rounded-2xl'
                            : ''
                        }`}
                      >
                        <PresetCard preset={preset} compact />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="lg:col-span-1">
                <h3 className="font-semibold text-coffee-800 mb-4">配方详情</h3>
                {selectedPreset ? (
                  <div className="bg-coffee-50 rounded-2xl p-5 space-y-5">
                    <div>
                      <h4 className="font-bold text-coffee-900 text-lg">{selectedPreset.name}</h4>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant={selectedPreset.status === 'approved' ? 'success' : selectedPreset.status === 'testing' ? 'warning' : 'secondary'}>
                          {selectedPreset.status === 'approved' ? '已发布' : selectedPreset.status === 'testing' ? '测试中' : selectedPreset.status === 'draft' ? '草稿' : '已弃用'}
                        </Badge>
                        <Badge variant="info" size="sm">
                          {BREWING_METHODS.find(m => m.id === selectedPreset.method)?.name}
                        </Badge>
                        <span className="text-xs text-coffee-400">v{selectedPreset.version}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <div className="text-center p-2 bg-white rounded-xl">
                        <p className="text-lg font-bold text-coffee-800">{selectedPreset.waterTemperature}°C</p>
                        <p className="text-xs text-coffee-500">水温</p>
                      </div>
                      <div className="text-center p-2 bg-white rounded-xl">
                        <p className="text-lg font-bold text-coffee-800">{selectedPreset.dose}g</p>
                        <p className="text-xs text-coffee-500">粉量</p>
                      </div>
                      <div className="text-center p-2 bg-white rounded-xl">
                        <p className="text-lg font-bold text-coffee-800">1:{selectedPreset.brewRatio}</p>
                        <p className="text-xs text-coffee-500">粉水比</p>
                      </div>
                    </div>

                    <div>
                      <p className="text-sm font-medium text-coffee-700 mb-2 flex items-center gap-2">
                        <Target className="w-4 h-4" />
                        目标风味
                      </p>
                      <div className="bg-white rounded-xl p-3">
                        <FlavorRadarChart
                          data={selectedPreset.targetFlavor}
                          tolerance={selectedPreset.tolerance}
                          height={200}
                        />
                      </div>
                    </div>

                    {selectedPresetCurves.length > 0 && (
                      <div>
                        <p className="text-sm font-medium text-coffee-700 mb-2 flex items-center gap-2">
                          <TrendingUp className="w-4 h-4" />
                          最近萃取曲线
                        </p>
                        <div className="bg-white rounded-xl p-3">
                          <ExtractionCurveChart
                            data={selectedPresetCurves[0].dataPoints}
                            metrics={['temperature', 'flowRate']}
                            height={150}
                          />
                        </div>
                      </div>
                    )}

                    <div className="pt-3 border-t border-coffee-200 space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-coffee-500">萃取时间</span>
                        <span className="font-medium text-coffee-800">{selectedPreset.brewTime}s</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-coffee-500">研磨度</span>
                        <span className="font-medium text-coffee-800">{selectedPreset.grindSize}mm</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-coffee-500">目标 TDS</span>
                        <span className="font-medium text-coffee-800">{selectedPreset.targetTDS}%</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-coffee-500">目标萃取率</span>
                        <span className="font-medium text-coffee-800">{selectedPreset.targetExtractionYield}%</span>
                      </div>
                    </div>

                    <div className="flex gap-2 pt-2">
                      <Button
                        variant="primary"
                        size="sm"
                        icon={<Zap className="w-4 h-4" />}
                        onClick={async () => {
                          if (stores.length === 0) return;
                          const relevantRecords = records.filter(
                            r => r.presetId === selectedPreset.id
                          );
                          const result = await optimizationEngine.optimize(
                            selectedPreset,
                            stores[0],
                            relevantRecords
                          );
                          console.log('Optimization result:', result);
                        }}
                        className="flex-1"
                      >
                        优化配方
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        icon={<Upload className="w-4 h-4" />}
                        onClick={() => {
                          syncEngine.queueSync('preset', 'update', selectedPreset.id, {
                            ...selectedPreset,
                            status: 'approved',
                            updatedAt: new Date().toISOString(),
                          });
                          refreshData();
                        }}
                        className="flex-1"
                      >
                        发布
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12 text-coffee-400">
                    <Coffee className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>选择一个配方查看详情</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'experiments' && (
          <div className="p-6">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {experiments.length === 0 ? (
                <div className="col-span-full text-center py-16 text-coffee-400">
                  <FlaskConical className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium">暂无研发实验</p>
                  <p className="text-sm mt-1">点击"创建实验"开始新的配方研发</p>
                </div>
              ) : (
                experiments.map(exp => (
                  <div
                    key={exp.id}
                    className="bg-gradient-to-br from-coffee-50 to-white rounded-2xl p-5 border border-coffee-100 hover:shadow-lg transition-shadow"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4 className="font-semibold text-coffee-900">{exp.name}</h4>
                        <p className="text-sm text-coffee-500 mt-1">{exp.description}</p>
                      </div>
                      <Badge
                        variant={exp.status === 'running' ? 'warning' : exp.status === 'completed' ? 'success' : 'secondary'}
                      >
                        {exp.status === 'running' ? '进行中' : exp.status === 'completed' ? '已完成' : '已暂停'}
                      </Badge>
                    </div>

                    <div className="mb-4">
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="text-coffee-500">实验进度</span>
                        <span className="font-medium text-coffee-800">
                          {exp.completedTrials} / {exp.trials}
                        </span>
                      </div>
                      <div className="h-2 bg-coffee-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-coffee-500 to-amber-500 rounded-full transition-all"
                          style={{ width: `${(exp.completedTrials / exp.trials) * 100}%` }}
                        />
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 mb-4">
                      {exp.variables.map((v, i) => (
                        <Badge key={i} variant="info" size="sm">
                          {v.name}: {v.min}-{v.max}{v.unit}
                        </Badge>
                      ))}
                    </div>

                    <div className="flex items-center justify-between text-xs text-coffee-400">
                      <span>创建人: {exp.createdBy}</span>
                      <span>{new Date(exp.createdAt).toLocaleDateString('zh-CN')}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === 'beans' && (
          <div className="p-6">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {beans.map(bean => (
                <div
                  key={bean.id}
                  className="bg-white rounded-2xl p-5 border border-coffee-100 hover:shadow-lg transition-shadow"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h4 className="font-semibold text-coffee-900">{bean.name}</h4>
                      <p className="text-sm text-coffee-500">{bean.origin}</p>
                    </div>
                    <div
                      className="w-8 h-8 rounded-full border-2 border-white shadow-md"
                      style={{ backgroundColor: ROAST_LEVELS.find(r => r.id === bean.roastLevel)?.color || '#8B5A2B' }}
                      title={ROAST_LEVELS.find(r => r.id === bean.roastLevel)?.name}
                    />
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-coffee-500">品种</span>
                      <span className="text-coffee-700">{bean.variety}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-coffee-500">处理法</span>
                      <span className="text-coffee-700">
                        {PROCESSING_METHODS.find(p => p.id === bean.processingMethod)?.name}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-coffee-500">海拔</span>
                      <span className="text-coffee-700">{bean.altitude}m</span>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-coffee-100">
                    <div className="flex flex-wrap gap-1">
                      {bean.flavorNotes.slice(0, 3).map((note, i) => (
                        <span
                          key={i}
                          className="text-xs px-2 py-1 bg-amber-50 text-amber-700 rounded-full"
                        >
                          {note}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-coffee-100">
              <h3 className="text-xl font-bold text-coffee-800">新建冲煮配方</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-2 hover:bg-coffee-50 rounded-xl transition-colors"
              >
                <X className="w-5 h-5 text-coffee-500" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-coffee-700 mb-1">配方名称</label>
                <input
                  type="text"
                  placeholder="输入配方名称..."
                  className="w-full px-4 py-2 border border-coffee-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-coffee-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-coffee-700 mb-1">冲煮方式</label>
                  <select className="w-full px-4 py-2 border border-coffee-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-coffee-500">
                    {BREWING_METHODS.map(m => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-coffee-700 mb-1">咖啡豆</label>
                  <select className="w-full px-4 py-2 border border-coffee-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-coffee-500">
                    {beans.map(b => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-coffee-700 mb-1">粉量 (g)</label>
                  <input
                    type="number"
                    defaultValue="18"
                    className="w-full px-4 py-2 border border-coffee-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-coffee-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-coffee-700 mb-1">粉水比</label>
                  <input
                    type="number"
                    defaultValue="16"
                    className="w-full px-4 py-2 border border-coffee-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-coffee-500"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-coffee-700 mb-1">水温 (°C)</label>
                  <input
                    type="number"
                    defaultValue="93"
                    className="w-full px-4 py-2 border border-coffee-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-coffee-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-coffee-700 mb-1">萃取时间 (s)</label>
                  <input
                    type="number"
                    defaultValue="28"
                    className="w-full px-4 py-2 border border-coffee-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-coffee-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-coffee-700 mb-1">配方描述</label>
                <textarea
                  rows={3}
                  placeholder="描述这个配方的特点和适用场景..."
                  className="w-full px-4 py-2 border border-coffee-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-coffee-500 resize-none"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 p-6 border-t border-coffee-100">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-5 py-2 border border-coffee-200 text-coffee-600 rounded-xl hover:bg-coffee-50 transition-colors"
              >
                取消
              </button>
              <button
                disabled={savingPreset || beans.length === 0}
                onClick={async () => {
                  if (beans.length === 0) {
                    showToast('请先添加咖啡豆数据');
                    return;
                  }

                  setSavingPreset(true);
                  try {
                    const randomBean = beans[Math.floor(Math.random() * beans.length)];
                    const newPreset: BrewingPreset = {
                      id: uuidv4(),
                      name: `新配方 - ${new Date().toLocaleTimeString('zh-CN')}`,
                      description: '新创建的冲煮配方',
                      beanId: randomBean.id,
                      bean: randomBean,
                      method: 'espresso',
                      region: randomBean.region,
                      dose: 18,
                      waterTemperature: 93,
                      brewTime: 28,
                      totalWater: 288,
                      ratio: 16,
                      grindSize: 0.3,
                      pressureProfile: [],
                      temperatureProfile: [],
                      targetTDS: 10,
                      targetYield: 36,
                      targetExtractionYield: 20,
                      brewRatio: 16,
                      targetFlavor: { acidity: 7, sweetness: 6, bitterness: 4, body: 6, aroma: 7, aftertaste: 6, complexity: 5, balance: 6 },
                      tolerance: { acidity: 1, sweetness: 1, bitterness: 1, body: 1, aroma: 1, aftertaste: 1, complexity: 1, balance: 1 },
                      status: 'draft',
                      version: 1,
                      createdAt: getCurrentTimestamp(),
                      updatedAt: getCurrentTimestamp(),
                      createdBy: '研发团队',
                      storeIds: [],
                      lastSyncedAt: getCurrentTimestamp(),
                      syncHash: uuidv4(),
                    };

                    try {
                      await insert('presets', newPreset);
                    } catch (dbError) {
                      console.error('DB insert failed for preset:', dbError);
                      showToast(`数据库写入失败: ${dbError instanceof Error ? dbError.message : String(dbError)}`);
                      return;
                    }

                    try {
                      await syncEngine.queueSync('preset', 'create', newPreset.id, newPreset as any);
                    } catch (syncError) {
                      console.warn('Sync queue failed (non-critical):', syncError);
                    }

                    await refreshData();
                    setShowCreateModal(false);
                    showToast('配方创建成功！');
                  } catch (error) {
                    console.error('Failed to create preset:', error);
                    showToast(`保存配方失败: ${error instanceof Error ? error.message : String(error)}`);
                  } finally {
                    setSavingPreset(false);
                  }
                }}
                className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-coffee-700 to-coffee-800 text-white rounded-xl hover:from-coffee-800 hover:to-coffee-900 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {savingPreset ? (
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                ) : (
                  <Save className="w-4 h-4" />
                )}
                {savingPreset ? '保存中...' : '保存配方'}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 px-6 py-3 bg-coffee-800 text-white rounded-xl shadow-xl z-[100] animate-bounce">
          {toast}
        </div>
      )}
    </div>
  );
}
