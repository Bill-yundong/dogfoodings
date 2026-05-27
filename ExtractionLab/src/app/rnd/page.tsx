'use client';

import { useState, useMemo } from 'react';
import { useAppData } from '../providers';
import { PresetCard } from '@/components/PresetCard';
import { FlavorRadarChart } from '@/components/FlavorRadarChart';
import { ExtractionCurveChart } from '@/components/ExtractionCurveChart';
import { Button, Badge, StatsCard } from '@/components/ui/Card';
import { BREWING_METHODS, ROAST_LEVELS, PROCESSING_METHODS } from '@/lib/constants';
import { searchPresets } from '@/lib/database';
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
    if (presets.length === 0 || stores.length === 0) return;

    const approvedPresets = presets.filter(p => p.status === 'approved');
    const samplePreset = approvedPresets[0];
    const sampleStore = stores[0];
    const relevantRecords = records.filter(
      r => r.presetId === samplePreset.id && r.storeId === sampleStore.id
    );

    const result = await optimizationEngine.optimize(
      samplePreset,
      sampleStore,
      relevantRecords
    );

    if (result.qualityImprovement > 5) {
      const updatedPreset: BrewingPreset = {
        ...samplePreset,
        ...result.optimizedParameters,
        updatedAt: getCurrentTimestamp(),
        version: samplePreset.version + 1,
      };

      await syncEngine.queueSync('preset', 'update', updatedPreset.id, updatedPreset);
      refreshData();
    }
  };

  const createExperiment = () => {
    if (presets.length === 0) return;

    const basePreset = presets[0];
    const newExperiment: RnDExperiment = {
      id: uuidv4(),
      name: `配方优化实验 - ${new Date().toLocaleDateString('zh-CN')}`,
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
      trials: 12,
      completedTrials: 3,
      createdAt: new Date().toISOString(),
      startedAt: getCurrentTimestamp(),
      createdBy: '研发团队',
    };

    syncEngine.queueSync('experiment', 'create', newExperiment.id, newExperiment);
    refreshData();
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

  if (!selectedPreset && filteredPresets.length > 0) {
    setSelectedPreset(filteredPresets[0]);
  }

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
            icon={<Beaker className="w-4 h-4" />}
          >
            创建实验
          </Button>
          <Button
            onClick={runBatchOptimization}
            variant="secondary"
            icon={<Zap className="w-4 h-4" />}
          >
            批量优化
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
    </div>
  );
}
