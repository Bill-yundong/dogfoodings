'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAppData } from './providers';
import { StatsCard } from '@/components/ui/Card';
import { ExtractionCurveChart } from '@/components/ExtractionCurveChart';
import { FlavorRadarChart, FlavorComparisonCard } from '@/components/FlavorRadarChart';
import { PresetCard } from '@/components/PresetCard';
import { StoreCard } from '@/components/StoreCard';
import { OptimizationResultCard } from '@/components/OptimizationResultCard';
import { optimizationEngine } from '@/lib/optimizationEngine';
import { REGIONS } from '@/lib/constants';
import { calculateAverageCurve } from '@/lib/utils';
import {
  Coffee,
  FlaskConical,
  Store,
  BarChart3,
  TrendingUp,
  Zap,
  Globe,
  Database,
  RefreshCw,
  ArrowRight,
} from 'lucide-react';
import Link from 'next/link';
import type { OptimizationResult, BrewingPreset, StoreLocation, BrewingRecord } from '@/types';

export default function DashboardPage() {
  const { presets, beans, stores, records, curves, experiments, loading, stats, refreshData } = useAppData();
  const [optimizationResults, setOptimizationResults] = useState<OptimizationResult[]>([]);
  const [optimizing, setOptimizing] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<BrewingPreset | null>(null);
  const [selectedStore, setSelectedStore] = useState<StoreLocation | null>(null);

  const keyMetrics = useMemo(() => {
    if (records.length === 0) {
      return {
        avgQuality: 0,
        avgTDS: 0,
        avgYield: 0,
        consistencyRate: 0,
        onlineStores: 0,
        approvedPresets: 0,
      };
    }

    const avgQuality = records.reduce((sum, r) => sum + r.qualityScore, 0) / records.length;
    const avgTDS = records.reduce((sum, r) => sum + r.finalTDS, 0) / records.length;
    const avgYield = records.reduce((sum, r) => sum + r.extractionYield, 0) / records.length;
    const consistencyRate = (records.filter(r => r.qualityScore >= 80).length / records.length) * 100;
    const onlineStores = stores.filter(s => s.syncStatus === 'online').length;
    const approvedPresets = presets.filter(p => p.status === 'approved').length;

    return {
      avgQuality,
      avgTDS,
      avgYield,
      consistencyRate,
      onlineStores,
      approvedPresets,
    };
  }, [records, stores, presets]);

  const recentCurves = useMemo(() => {
    return curves.slice(0, 5);
  }, [curves]);

  const topPresets = useMemo(() => {
    return presets
      .filter(p => p.status === 'approved')
      .slice(0, 4);
  }, [presets]);

  const topStores = useMemo(() => {
    return [...stores]
      .sort((a, b) => b.qualityScore - a.qualityScore)
      .slice(0, 4);
  }, [stores]);

  const handleRunOptimization = async () => {
    if (presets.length === 0 || stores.length === 0) return;

    setOptimizing(true);
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

      const variedResult = {
        ...result,
        qualityImprovement: Math.max(1, result.qualityImprovement + (Math.random() - 0.3) * 5),
        costSaving: Math.max(0.5, result.costSaving + (Math.random() - 0.3) * 3),
        timestamp: Date.now(),
      };

      setOptimizationResults(prev => [variedResult, ...prev.slice(0, 2)]);
      setSelectedPreset(randomPreset);
      setSelectedStore(randomStore);
    } catch (error) {
      console.error('Optimization failed:', error);
    } finally {
      setOptimizing(false);
    }
  };

  const averageCurveData = useMemo(() => {
    if (recentCurves.length === 0) return [];
    return calculateAverageCurve(recentCurves.map(c => c.dataPoints));
  }, [recentCurves]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-coffee-200 border-t-coffee-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-coffee-600 font-medium">正在初始化数据库...</p>
          <p className="text-coffee-400 text-sm mt-1">正在生成 1780+ 条模拟数据</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-coffee-800 to-coffee-500 bg-clip-text text-transparent">
            控制中心
          </h1>
          <p className="text-coffee-500 mt-1">
            实时监控全球门店萃取品质，确保每一杯咖啡的完美呈现
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={refreshData}
            className="flex items-center gap-2 px-4 py-2 bg-coffee-100 text-coffee-700 rounded-xl hover:bg-coffee-200 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            刷新数据
          </button>
          <button
            onClick={handleRunOptimization}
            disabled={optimizing}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-coffee-700 to-coffee-800 text-white rounded-xl hover:from-coffee-800 hover:to-coffee-900 transition-all shadow-lg shadow-coffee-700/20 disabled:opacity-50"
          >
            {optimizing ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Zap className="w-4 h-4" />
            )}
            {optimizing ? '优化中...' : '运行优化引擎'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="平均品质评分"
          value={keyMetrics.avgQuality.toFixed(1)}
          icon={<BarChart3 className="w-6 h-6" />}
          color="green"
          trend={{ value: 3.2, label: '较上周', positive: true }}
        />
        <StatsCard
          title="已发布配方"
          value={keyMetrics.approvedPresets}
          icon={<Coffee className="w-6 h-6" />}
          color="amber"
          trend={{ value: 12, label: '本月新增', positive: true }}
        />
        <StatsCard
          title="在线门店"
          value={`${keyMetrics.onlineStores}/${stats.stores}`}
          icon={<Globe className="w-6 h-6" />}
          color="blue"
          trend={{ value: 2, label: '较上周', positive: true }}
        />
        <StatsCard
          title="数据总量"
          value={`${(stats.curves / 1000).toFixed(1)}K`}
          icon={<Database className="w-6 h-6" />}
          color="purple"
          trend={{ value: 15, label: '萃取曲线', positive: true }}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="一致性达标率"
          value={`${keyMetrics.consistencyRate.toFixed(0)}%`}
          icon={<TrendingUp className="w-6 h-6" />}
          color="green"
          trend={{ value: 5.8, label: '较上周', positive: true }}
        />
        <StatsCard
          title="平均 TDS"
          value={`${keyMetrics.avgTDS.toFixed(2)}%`}
          icon={<FlaskConical className="w-6 h-6" />}
          color="amber"
        />
        <StatsCard
          title="平均萃取率"
          value={`${keyMetrics.avgYield.toFixed(1)}%`}
          icon={<Coffee className="w-6 h-6" />}
          color="purple"
        />
        <StatsCard
          title="研发实验"
          value={stats.experiments}
          icon={<FlaskConical className="w-6 h-6" />}
          color="blue"
          trend={{ value: 3, label: '进行中', positive: true }}
        />
      </div>

      {optimizationResults.length > 0 && selectedPreset && selectedStore && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-coffee-900 flex items-center gap-2">
              <Zap className="w-6 h-6 text-amber-500" />
              多因子优化结果
            </h2>
            <span className="text-sm text-coffee-500">
              针对 {selectedStore.name} 的 {selectedPreset.name} 配方优化
            </span>
          </div>
          {optimizationResults.map((result, index) => (
            <OptimizationResultCard
              key={index}
              result={result}
              onApply={() => {
                setOptimizationResults([]);
                refreshData();
              }}
              onDiscard={() => setOptimizationResults([])}
            />
          ))}
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl shadow-lg border border-coffee-100 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-coffee-900 flex items-center gap-2">
                <TrendingUp className="w-6 h-6 text-coffee-600" />
                平均萃取曲线
              </h2>
              <Link
                href="/analytics"
                className="text-sm text-coffee-600 hover:text-coffee-800 flex items-center gap-1"
              >
                查看详情
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            <ExtractionCurveChart
              data={averageCurveData}
              showAllMetrics
              height={350}
            />
          </div>
        </div>

        <div>
          <div className="bg-white rounded-2xl shadow-lg border border-coffee-100 p-6 h-full">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-coffee-900 flex items-center gap-2">
                <FlaskConical className="w-6 h-6 text-coffee-600" />
                风味分布概览
              </h2>
            </div>
            {presets.length > 0 && records.length > 0 && (
              <FlavorComparisonCard
                actual={records[0].flavorRating}
                target={presets[0].targetFlavor}
                tolerance={presets[0].tolerance}
              />
            )}
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-coffee-900 flex items-center gap-2">
            <Coffee className="w-6 h-6 text-coffee-600" />
            热门冲煮配方
          </h2>
          <Link
            href="/rnd"
            className="text-sm text-coffee-600 hover:text-coffee-800 flex items-center gap-1"
          >
            研发中心
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          {topPresets.map(preset => (
            <PresetCard
              key={preset.id}
              preset={preset}
              compact
            />
          ))}
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-coffee-900 flex items-center gap-2">
            <Store className="w-6 h-6 text-coffee-600" />
            门店品质排行
          </h2>
          <Link
            href="/stores"
            className="text-sm text-coffee-600 hover:text-coffee-800 flex items-center gap-1"
          >
            门店系统
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          {topStores.map(store => (
            <StoreCard
              key={store.id}
              store={store}
            />
          ))}
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2 bg-gradient-to-br from-coffee-800 to-coffee-950 rounded-2xl p-8 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-amber-500/10 rounded-full translate-y-1/2 -translate-x-1/2" />
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-amber-500/20 rounded-xl flex items-center justify-center">
                <Zap className="w-6 h-6 text-amber-400" />
              </div>
              <div>
                <h3 className="text-xl font-bold">异步多因子平衡引擎</h3>
                <p className="text-coffee-300 text-sm">智能优化萃取方案</p>
              </div>
            </div>
            <p className="text-coffee-200 mb-6 leading-relaxed">
              综合海拔、水质、温度、研磨度等8大因子，基于历史数据分析自动优化萃取参数，
              确保全球各门店出品品质高度一致。
            </p>
            <div className="grid grid-cols-4 gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-amber-400">8</p>
                <p className="text-xs text-coffee-400">优化因子</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-amber-400">98%</p>
                <p className="text-xs text-coffee-400">置信度</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-amber-400">15%</p>
                <p className="text-xs text-coffee-400">品质提升</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-amber-400">实时</p>
                <p className="text-xs text-coffee-400">同步更新</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-lg border border-coffee-100 p-6">
          <h3 className="text-lg font-bold text-coffee-900 mb-4 flex items-center gap-2">
            <Database className="w-5 h-5 text-coffee-600" />
            数据存储状态
          </h3>
          <div className="space-y-4">
            {[
              { label: '冲煮配方', value: stats.presets, total: 10000, color: 'bg-amber-500' },
              { label: '咖啡豆种', value: stats.beans, total: 500, color: 'bg-green-500' },
              { label: '连锁门店', value: stats.stores, total: 100, color: 'bg-blue-500' },
              { label: '冲煮记录', value: stats.records, total: 100000, color: 'bg-purple-500' },
              { label: '萃取曲线', value: stats.curves, total: 100000, color: 'bg-red-500' },
            ].map(item => (
              <div key={item.label}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-coffee-600">{item.label}</span>
                  <span className="font-medium text-coffee-900">
                    {item.value.toLocaleString()} / {item.total.toLocaleString()}
                  </span>
                </div>
                <div className="h-2 bg-coffee-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${item.color} rounded-full transition-all duration-500`}
                    style={{ width: `${Math.min((item.value / item.total) * 100, 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-6 p-4 bg-coffee-50 rounded-xl">
            <p className="text-sm text-coffee-600">
              <span className="font-medium text-coffee-800">IndexedDB</span> 本地存储引擎
              确保离线可用和万级数据高效同步
            </p>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-4 gap-4">
        {REGIONS.map(region => {
          const regionStores = stores.filter(s => s.region === region.id);
          const avgScore = regionStores.length > 0
            ? regionStores.reduce((sum, s) => sum + s.qualityScore, 0) / regionStores.length
            : 0;
          const onlineCount = regionStores.filter(s => s.syncStatus === 'online').length;

          return (
            <div
              key={region.id}
              className="bg-white rounded-2xl p-5 border border-coffee-100 shadow-md hover:shadow-lg transition-shadow"
            >
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold text-coffee-900">{region.name}</h4>
                <span className="text-xs text-coffee-500">{region.countries.length} 个国家</span>
              </div>
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-2xl font-bold text-coffee-800">{regionStores.length}</p>
                  <p className="text-xs text-coffee-500">门店数量</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-green-600">{avgScore.toFixed(1)}</p>
                  <p className="text-xs text-coffee-500">平均评分</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-blue-600">{onlineCount}</p>
                  <p className="text-xs text-coffee-500">在线</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
