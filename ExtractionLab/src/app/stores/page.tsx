'use client';

import { useState, useMemo, useEffect } from 'react';
import { useAppData } from '../providers';
import { StoreCard } from '@/components/StoreCard';
import { ExtractionCurveChart } from '@/components/ExtractionCurveChart';
import { FlavorComparisonCard } from '@/components/FlavorRadarChart';
import { Button, Badge, StatsCard } from '@/components/ui/Card';
import { syncEngine } from '@/lib/syncEngine';
import { optimizationEngine } from '@/lib/optimizationEngine';
import { REGIONS } from '@/lib/constants';
import { calculateAverageCurve, getCurrentTimestamp } from '@/lib/utils';
import {
  Store,
  Globe,
  RefreshCw,
  Wifi,
  WifiOff,
  Clock,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  MapPin,
  Coffee,
  Zap,
  Activity,
  Upload,
} from 'lucide-react';
import type { StoreLocation, BrewingPreset, BrewingRecord, ExtractionCurve, OptimizationResult } from '@/types';

export default function StoresPage() {
  const { presets, stores, records, curves, refreshData } = useAppData();
  const [selectedStore, setSelectedStore] = useState<StoreLocation | null>(null);
  const [selectedRegion, setSelectedRegion] = useState<string>('all');
  const [syncStatus, setSyncStatus] = useState<{ pending: number; syncing: number; completed: number; failed: number }>({
    pending: 0, syncing: 0, completed: 0, failed: 0
  });
  const [syncing, setSyncing] = useState(false);
  const [optimizing, setOptimizing] = useState<string | null>(null);
  const [optimizationResults, setOptimizationResults] = useState<Map<string, OptimizationResult>>(new Map());

  useEffect(() => {
    const updateSyncStatus = async () => {
      const status = await syncEngine.getSyncStatus();
      setSyncStatus(status);
    };
    updateSyncStatus();
    const interval = setInterval(updateSyncStatus, 10000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!selectedStore && stores.length > 0) {
      setSelectedStore(stores[0]);
    }
  }, [stores, selectedStore]);

  const filteredStores = useMemo(() => {
    if (selectedRegion === 'all') return stores;
    return stores.filter(s => s.region === selectedRegion);
  }, [stores, selectedRegion]);

  const storeStats = useMemo(() => {
    const online = stores.filter(s => s.syncStatus === 'online').length;
    const offline = stores.filter(s => s.syncStatus === 'offline').length;
    const syncing = stores.filter(s => s.syncStatus === 'syncing').length;
    const avgQuality = stores.length > 0
      ? stores.reduce((sum, s) => sum + s.qualityScore, 0) / stores.length
      : 0;
    const avgConsistency = stores.length > 0
      ? stores.reduce((sum, s) => sum + s.consistencyScore, 0) / stores.length
      : 0;
    const issues = stores.filter(s => s.qualityScore < 70).length;

    return { online, offline, syncing, avgQuality, avgConsistency, issues, total: stores.length };
  }, [stores]);

  const selectedStoreRecords = useMemo(() => {
    if (!selectedStore) return [];
    return records.filter(r => r.storeId === selectedStore.id).sort(
      (a, b) => new Date(b.brewedAt).getTime() - new Date(a.brewedAt).getTime()
    ).slice(0, 20);
  }, [selectedStore, records]);

  const selectedStoreCurves = useMemo(() => {
    if (!selectedStore) return [];
    return curves.filter(c => c.storeId === selectedStore.id).slice(0, 5);
  }, [selectedStore, curves]);

  const selectedStorePresets = useMemo(() => {
    if (!selectedStore) return [];
    const presetIds = new Set(selectedStoreRecords.map(r => r.presetId));
    return presets.filter(p => presetIds.has(p.id));
  }, [selectedStore, selectedStoreRecords, presets]);

  const averageStoreCurve = useMemo(() => {
    if (selectedStoreCurves.length === 0) return [];
    return calculateAverageCurve(selectedStoreCurves.map(c => c.dataPoints));
  }, [selectedStoreCurves]);

  const handleSyncAll = async () => {
    setSyncing(true);
    try {
      for (const store of stores) {
        await syncEngine.queueSync('store', 'update', store.id, {
          lastSyncAt: getCurrentTimestamp(),
          syncStatus: 'syncing',
        });
      }
      await syncEngine.processSyncQueue();
      await syncEngine.forceSync();
      await refreshData();
    } finally {
      setSyncing(false);
    }
  };

  const handleSyncStore = async (storeId: string) => {
    await syncEngine.queueSync('store', 'update', storeId, {
      lastSyncAt: getCurrentTimestamp(),
      syncStatus: 'syncing',
    });
    await syncEngine.processSyncQueue();
    refreshData();
  };

  const handleOptimizeStore = async (store: StoreLocation) => {
    if (presets.length === 0) return;

    setOptimizing(store.id);
    try {
      const approvedPreset = presets.find(p => p.status === 'approved') || presets[0];
      const relevantRecords = records.filter(
        r => r.presetId === approvedPreset.id && r.storeId === store.id
      );

      const result = await optimizationEngine.optimize(
        approvedPreset,
        store,
        relevantRecords
      );

      setOptimizationResults(prev => new Map(prev).set(store.id, result));

      if (result.qualityImprovement > 3) {
        await syncEngine.queueSync('preset', 'update', approvedPreset.id, {
          ...approvedPreset,
          ...result.optimizedParameters,
          updatedAt: getCurrentTimestamp(),
          version: approvedPreset.version + 1,
        });
        refreshData();
      }
    } catch (error) {
      console.error('Optimization failed:', error);
    } finally {
      setOptimizing(null);
    }
  };

  const handleCheckQuality = async (store: StoreLocation) => {
    const storeRecords = records.filter(r => r.storeId === store.id);
    if (storeRecords.length === 0 || presets.length === 0) return;

    const preset = presets.find(p => p.id === storeRecords[0].presetId);
    if (!preset) return;

    const result = await syncEngine.checkQualityConsistency(preset, storeRecords);
    
    if (!result.isConsistent) {
      await syncEngine.queueSync('store', 'update', store.id, {
        ...store,
        qualityScore: result.score,
        lastQualityCheck: new Date().toISOString(),
        qualityIssues: result.issues,
      });
      refreshData();
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'text-green-600 bg-green-50';
      case 'offline': return 'text-red-600 bg-red-50';
      case 'syncing': return 'text-blue-600 bg-blue-50';
      default: return 'text-coffee-600 bg-coffee-50';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'online': return <Wifi className="w-4 h-4" />;
      case 'offline': return <WifiOff className="w-4 h-4" />;
      case 'syncing': return <RefreshCw className="w-4 h-4 animate-spin" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  const regionStats = useMemo(() => {
    return REGIONS.map(region => {
      const regionStores = stores.filter(s => s.region === region.id);
      const avgScore = regionStores.length > 0
        ? regionStores.reduce((sum, s) => sum + s.qualityScore, 0) / regionStores.length
        : 0;
      const online = regionStores.filter(s => s.syncStatus === 'online').length;
      return {
        ...region,
        storeCount: regionStores.length,
        avgScore,
        online,
      };
    });
  }, [stores]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-coffee-800 to-coffee-500 bg-clip-text text-transparent">
            全球连锁门店系统
          </h1>
          <p className="text-coffee-500 mt-1">
            实时监控各门店出品品质，确保配方同步与一致性
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-4 py-2 bg-coffee-50 rounded-xl">
            <RefreshCw className="w-5 h-5 text-coffee-600" />
            <div className="text-sm">
              <span className="text-coffee-400">同步队列: </span>
              <span className="font-medium text-coffee-700">
                {syncStatus.pending} 待处理 · {syncStatus.completed} 已完成
              </span>
            </div>
          </div>
          <Button
            onClick={handleSyncAll}
            disabled={syncing}
            icon={syncing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
          >
            {syncing ? '同步中...' : '同步全部'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatsCard
          title="门店总数"
          value={storeStats.total}
          icon={<Globe className="w-5 h-5" />}
          color="blue"
          compact
        />
        <StatsCard
          title="在线门店"
          value={storeStats.online}
          icon={<Wifi className="w-5 h-5" />}
          color="green"
          compact
        />
        <StatsCard
          title="离线门店"
          value={storeStats.offline}
          icon={<WifiOff className="w-5 h-5" />}
          color="red"
          compact
        />
        <StatsCard
          title="平均品质"
          value={storeStats.avgQuality.toFixed(1)}
          icon={<TrendingUp className="w-5 h-5" />}
          color="amber"
          compact
        />
        <StatsCard
          title="一致性"
          value={`${storeStats.avgConsistency.toFixed(0)}%`}
          icon={<CheckCircle2 className="w-5 h-5" />}
          color="purple"
          compact
        />
        <StatsCard
          title="待处理问题"
          value={storeStats.issues}
          icon={<AlertTriangle className="w-5 h-5" />}
          color="red"
          compact
        />
      </div>

      <div className="grid md:grid-cols-4 gap-4">
        {regionStats.map(region => (
          <div
            key={region.id}
            onClick={() => setSelectedRegion(selectedRegion === region.id ? 'all' : region.id)}
            className={`cursor-pointer bg-white rounded-2xl p-5 border-2 transition-all ${
              selectedRegion === region.id
                ? 'border-coffee-500 shadow-lg'
                : 'border-transparent shadow-md hover:shadow-lg'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-coffee-900">{region.name}</h3>
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                region.avgScore >= 80 ? 'bg-green-50 text-green-700' :
                region.avgScore >= 70 ? 'bg-amber-50 text-amber-700' :
                'bg-red-50 text-red-700'
              }`}>
                {region.avgScore.toFixed(1)}
              </span>
            </div>
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-1 text-coffee-500">
                <Store className="w-4 h-4" />
                {region.storeCount}
              </div>
              <div className="flex items-center gap-1 text-green-600">
                <Wifi className="w-4 h-4" />
                {region.online}
              </div>
              <div className="text-coffee-400">
                {region.countries.length} 国
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl shadow-lg border border-coffee-100 overflow-hidden">
            <div className="p-4 border-b border-coffee-100">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-coffee-800 flex items-center gap-2">
                  <Store className="w-5 h-5" />
                  门店列表
                </h3>
                <span className="text-sm text-coffee-400">{filteredStores.length} 家</span>
              </div>
            </div>
            <div className="max-h-[600px] overflow-y-auto coffee-scrollbar">
              {filteredStores.map(store => (
                <div
                  key={store.id}
                  onClick={() => setSelectedStore(store)}
                  className={`p-4 border-b border-coffee-50 cursor-pointer transition-colors hover:bg-coffee-50 ${
                    selectedStore?.id === store.id ? 'bg-coffee-50' : ''
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium text-coffee-900">{store.name}</h4>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(store.syncStatus)}`}>
                          {getStatusIcon(store.syncStatus)}
                          {store.syncStatus === 'online' ? '在线' : store.syncStatus === 'offline' ? '离线' : '同步中'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-sm text-coffee-500">
                        <MapPin className="w-3 h-3" />
                        <span>{store.city}, {store.country}</span>
                      </div>
                      <div className="flex items-center gap-4 mt-2">
                        <div className="flex items-center gap-1">
                          <span className={`text-sm font-medium ${
                            store.qualityScore >= 80 ? 'text-green-600' :
                            store.qualityScore >= 70 ? 'text-amber-600' : 'text-red-600'
                          }`}>
                            {store.qualityScore.toFixed(1)}
                          </span>
                          <span className="text-xs text-coffee-400">品质分</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-sm font-medium text-coffee-700">
                            {store.consistencyScore.toFixed(0)}%
                          </span>
                          <span className="text-xs text-coffee-400">一致性</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Coffee className="w-3 h-3 text-coffee-400" />
                          <span className="text-xs text-coffee-400">
                            {records.filter(r => r.storeId === store.id).length} 杯
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-coffee-100 to-coffee-200 flex items-center justify-center ml-3">
                      <span className="text-lg font-bold text-coffee-600">
                        {store.name.charAt(0)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-6">
          {selectedStore ? (
            <>
              <div className="bg-white rounded-2xl shadow-lg border border-coffee-100 p-6">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
                  <div>
                    <div className="flex items-center gap-3">
                      <div className="w-14 h-14 bg-gradient-to-br from-coffee-500 to-coffee-700 rounded-2xl flex items-center justify-center text-white text-2xl font-bold">
                        {selectedStore.name.charAt(0)}
                      </div>
                      <div>
                        <h2 className="text-xl font-bold text-coffee-900">{selectedStore.name}</h2>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(selectedStore.syncStatus)}`}>
                            {getStatusIcon(selectedStore.syncStatus)}
                            {selectedStore.syncStatus === 'online' ? '在线' : selectedStore.syncStatus === 'offline' ? '离线' : '同步中'}
                          </span>
                          <span className="text-sm text-coffee-500 flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {selectedStore.city}, {selectedStore.country}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      icon={<Activity className="w-4 h-4" />}
                      onClick={() => handleCheckQuality(selectedStore)}
                    >
                      品质检查
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      icon={<RefreshCw className="w-4 h-4" />}
                      onClick={() => handleSyncStore(selectedStore.id)}
                    >
                      同步
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      icon={optimizing === selectedStore.id ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                      onClick={() => handleOptimizeStore(selectedStore)}
                      disabled={optimizing === selectedStore.id}
                    >
                      {optimizing === selectedStore.id ? '优化中...' : '智能优化'}
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                  <div className="bg-coffee-50 rounded-xl p-4">
                    <p className="text-sm text-coffee-500">品质评分</p>
                    <p className={`text-2xl font-bold mt-1 ${
                      selectedStore.qualityScore >= 80 ? 'text-green-600' :
                      selectedStore.qualityScore >= 70 ? 'text-amber-600' : 'text-red-600'
                    }`}>
                      {selectedStore.qualityScore.toFixed(1)}
                    </p>
                    <div className="mt-2 h-1.5 bg-coffee-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          selectedStore.qualityScore >= 80 ? 'bg-green-500' :
                          selectedStore.qualityScore >= 70 ? 'bg-amber-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${selectedStore.qualityScore}%` }}
                      />
                    </div>
                  </div>
                  <div className="bg-coffee-50 rounded-xl p-4">
                    <p className="text-sm text-coffee-500">一致性</p>
                    <p className="text-2xl font-bold mt-1 text-purple-600">
                      {selectedStore.consistencyScore.toFixed(0)}%
                    </p>
                    <div className="mt-2 h-1.5 bg-coffee-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-purple-500 rounded-full"
                        style={{ width: `${selectedStore.consistencyScore}%` }}
                      />
                    </div>
                  </div>
                  <div className="bg-coffee-50 rounded-xl p-4">
                    <p className="text-sm text-coffee-500">海拔高度</p>
                    <p className="text-2xl font-bold mt-1 text-blue-600">
                      {selectedStore.altitude}m
                    </p>
                    <p className="text-xs text-coffee-400 mt-2">
                      大气压 {selectedStore.atmosphericPressure} kPa
                    </p>
                  </div>
                  <div className="bg-coffee-50 rounded-xl p-4">
                    <p className="text-sm text-coffee-500">水质硬度</p>
                    <p className="text-2xl font-bold mt-1 text-teal-600">
                      {selectedStore.waterHardness}
                    </p>
                    <p className="text-xs text-coffee-400 mt-2">
                      碱度 {selectedStore.waterAlkalinity} ppm
                    </p>
                  </div>
                </div>

                {selectedStore.qualityIssues && selectedStore.qualityIssues.length > 0 && (
                  <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                    <p className="font-medium text-amber-800 flex items-center gap-2 mb-2">
                      <AlertTriangle className="w-4 h-4" />
                      品质问题警告
                    </p>
                    <ul className="space-y-1">
                      {selectedStore.qualityIssues.map((issue, i) => (
                        <li key={i} className="text-sm text-amber-700 flex items-center gap-2">
                          <span className="w-1.5 h-1.5 bg-amber-500 rounded-full" />
                          {issue}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {optimizationResults.get(selectedStore.id) && (
                  <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl">
                    <p className="font-medium text-green-800 flex items-center gap-2 mb-2">
                      <Zap className="w-4 h-4" />
                      优化完成
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                      <div>
                        <span className="text-green-600">品质提升</span>
                        <p className="font-bold text-green-800">
                          +{optimizationResults.get(selectedStore.id)!.qualityImprovement.toFixed(1)}%
                        </p>
                      </div>
                      <div>
                        <span className="text-green-600">置信度</span>
                        <p className="font-bold text-green-800">
                          {optimizationResults.get(selectedStore.id)!.confidence.toFixed(0)}%
                        </p>
                      </div>
                      <div>
                        <span className="text-green-600">主要因子</span>
                        <p className="font-bold text-green-800">
                          {optimizationResults.get(selectedStore.id)!.topFactors.slice(0, 2).join(', ')}
                        </p>
                      </div>
                      <div>
                        <span className="text-green-600">预计节省</span>
                        <p className="font-bold text-green-800">
                          {optimizationResults.get(selectedStore.id)!.costSaving.toFixed(0)} 元/月
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-coffee-700 mb-3">在用配方</p>
                    <div className="space-y-2">
                      {selectedStorePresets.slice(0, 3).map(preset => (
                        <div key={preset.id} className="flex items-center justify-between p-3 bg-coffee-50 rounded-xl">
                          <div>
                            <p className="font-medium text-coffee-900 text-sm">{preset.name}</p>
                            <p className="text-xs text-coffee-500">
                              {preset.waterTemperature}°C · {preset.dose}g · 1:{preset.brewRatio}
                            </p>
                          </div>
                          <Badge variant="success" size="sm">v{preset.version}</Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-coffee-700 mb-3">设备状态</p>
                    <div className="space-y-2">
                      {selectedStore.equipment.map((eq, i) => (
                        <div key={i} className="flex items-center justify-between p-3 bg-coffee-50 rounded-xl">
                          <div>
                            <p className="font-medium text-coffee-900 text-sm">{eq.name}</p>
                            <p className="text-xs text-coffee-500">{eq.model}</p>
                          </div>
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                            eq.status === 'operational' ? 'bg-green-50 text-green-700' :
                            eq.status === 'maintenance' ? 'bg-amber-50 text-amber-700' :
                            'bg-red-50 text-red-700'
                          }`}>
                            {eq.status === 'operational' ? <CheckCircle2 className="w-3 h-3" /> :
                             eq.status === 'maintenance' ? <Clock className="w-3 h-3" /> :
                             <AlertTriangle className="w-3 h-3" />}
                            {eq.status === 'operational' ? '正常' : eq.status === 'maintenance' ? '维护' : '故障'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {averageStoreCurve.length > 0 && (
                <div className="bg-white rounded-2xl shadow-lg border border-coffee-100 p-6">
                  <h3 className="font-semibold text-coffee-800 mb-4 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5" />
                    门店平均萃取曲线
                  </h3>
                  <ExtractionCurveChart
                    data={averageStoreCurve}
                    showAllMetrics
                    height={300}
                  />
                </div>
              )}

              {selectedStoreRecords.length > 0 && presets.length > 0 && (
                <div className="bg-white rounded-2xl shadow-lg border border-coffee-100 p-6">
                  <h3 className="font-semibold text-coffee-800 mb-4">
                    最近出品风味分析
                  </h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    {selectedStoreRecords.slice(0, 2).map((record, i) => {
                      const preset = presets.find(p => p.id === record.presetId);
                      if (!preset) return null;
                      return (
                        <FlavorComparisonCard
                          key={i}
                          actual={record.flavorRating}
                          target={preset.targetFlavor}
                          tolerance={preset.tolerance}
                        />
                      );
                    })}
                  </div>
                </div>
              )}

              {selectedStoreRecords.length > 0 && (
                <div className="bg-white rounded-2xl shadow-lg border border-coffee-100 p-6">
                  <h3 className="font-semibold text-coffee-800 mb-4 flex items-center gap-2">
                    <Coffee className="w-5 h-5" />
                    最近冲煮记录
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-coffee-500 border-b border-coffee-100">
                          <th className="pb-3 font-medium">时间</th>
                          <th className="pb-3 font-medium">配方</th>
                          <th className="pb-3 font-medium">TDS</th>
                          <th className="pb-3 font-medium">萃取率</th>
                          <th className="pb-3 font-medium">品质分</th>
                          <th className="pb-3 font-medium">操作人</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedStoreRecords.map(record => {
                          const preset = presets.find(p => p.id === record.presetId);
                          return (
                            <tr key={record.id} className="border-b border-coffee-50">
                              <td className="py-3 text-coffee-500">
                                {new Date(record.brewedAt).toLocaleString('zh-CN', {
                                  month: 'numeric',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </td>
                              <td className="py-3 font-medium text-coffee-900">
                                {preset?.name || '未知配方'}
                              </td>
                              <td className="py-3">
                                <span className={`${
                                  record.finalTDS >= 1.18 && record.finalTDS <= 1.45
                                    ? 'text-green-600' : 'text-amber-600'
                                }`}>
                                  {record.finalTDS.toFixed(2)}%
                                </span>
                              </td>
                              <td className="py-3">
                                <span className={`${
                                  record.extractionYield >= 18 && record.extractionYield <= 22
                                    ? 'text-green-600' : 'text-amber-600'
                                }`}>
                                  {record.extractionYield.toFixed(1)}%
                                </span>
                              </td>
                              <td className="py-3">
                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                                  record.qualityScore >= 80 ? 'bg-green-50 text-green-700' :
                                  record.qualityScore >= 70 ? 'bg-amber-50 text-amber-700' :
                                  'bg-red-50 text-red-700'
                                }`}>
                                  {record.qualityScore.toFixed(1)}
                                </span>
                              </td>
                              <td className="py-3 text-coffee-500">{record.barista}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="bg-white rounded-2xl shadow-lg border border-coffee-100 p-16 text-center">
              <Store className="w-16 h-16 text-coffee-300 mx-auto mb-4" />
              <p className="text-coffee-500">选择一家门店查看详情</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
