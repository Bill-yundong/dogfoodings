'use client';

import { useState, useMemo } from 'react';
import { useAppData } from '../providers';
import { ExtractionCurveChart } from '@/components/ExtractionCurveChart';
import { FlavorRadarChart, FlavorComparisonCard } from '@/components/FlavorRadarChart';
import { StatsCard, Button, Badge } from '@/components/ui/Card';
import { BREWING_METHODS, REGIONS, FLAVOR_DIMENSIONS, OPTIMIZATION_FACTORS } from '@/lib/constants';
import { calculateAverageCurve } from '@/lib/utils';
import {
  BarChart3,
  LineChart,
  PieChart,
  TrendingUp,
  Coffee,
  FlaskConical,
  Target,
  Zap,
  AlertTriangle,
  CheckCircle2,
  Download,
  RefreshCw,
  Clock,
  Activity,
  Layers,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';

export default function AnalyticsPage() {
  const { presets, beans, stores, records, curves, experiments, refreshData } = useAppData();
  const [activeTab, setActiveTab] = useState<'overview' | 'quality' | 'flavor' | 'performance'>('overview');
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | 'all'>('30d');
  const [selectedRegion, setSelectedRegion] = useState<string>('all');
  const [exporting, setExporting] = useState(false);

  const handleExportReport = async () => {
    setExporting(true);
    try {
      const reportData = {
        generatedAt: new Date().toISOString(),
        timeRange,
        selectedRegion,
        summary: {
          totalPresets: presets.length,
          totalBeans: beans.length,
          totalStores: stores.length,
          totalRecords: records.length,
          totalExperiments: experiments.length,
          totalCurves: curves.length,
        },
        qualityMetrics: {
          avgQualityScore: records.length > 0 ? records.reduce((sum, r) => sum + r.qualityScore, 0) / records.length : 0,
          avgTDS: records.length > 0 ? records.reduce((sum, r) => sum + r.finalTDS, 0) / records.length : 0,
          avgExtractionYield: records.length > 0 ? records.reduce((sum, r) => sum + r.extractionYield, 0) / records.length : 0,
          consistencyRate: records.length > 0 ? (records.filter(r => r.qualityScore >= 80).length / records.length) * 100 : 0,
        },
        storePerformance: stores.map(s => ({
          id: s.id,
          name: s.name,
          region: s.region,
          qualityScore: s.qualityScore,
          consistencyScore: s.consistencyScore,
          syncStatus: s.syncStatus,
        })),
      };

      const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `extraction-report-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  };

  const filteredRecords = useMemo(() => {
    let list = [...records];
    
    const now = new Date();
    if (timeRange !== 'all') {
      const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
      const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
      list = list.filter(r => new Date(r.brewedAt) >= cutoff);
    }

    if (selectedRegion !== 'all') {
      const regionStores = stores.filter(s => s.region === selectedRegion).map(s => s.id);
      list = list.filter(r => regionStores.includes(r.storeId));
    }

    return list;
  }, [records, stores, timeRange, selectedRegion]);

  const analyticsData = useMemo(() => {
    if (filteredRecords.length === 0) {
      return {
        avgQuality: 0,
        avgTDS: 0,
        avgExtraction: 0,
        avgBrewTime: 0,
        qualityTrend: [],
        methodDistribution: [],
        regionPerformance: [],
        tdsDistribution: [],
        flavorTrend: [],
        factorCorrelation: [],
      };
    }

    const avgQuality = filteredRecords.reduce((sum, r) => sum + r.qualityScore, 0) / filteredRecords.length;
    const avgTDS = filteredRecords.reduce((sum, r) => sum + r.finalTDS, 0) / filteredRecords.length;
    const avgExtraction = filteredRecords.reduce((sum, r) => sum + r.extractionYield, 0) / filteredRecords.length;
    const avgBrewTime = filteredRecords.reduce((sum, r) => sum + r.brewTime, 0) / filteredRecords.length;

    const qualityTrend: Array<{ date: string; 品质分: number }> = [];
    const daysMap = new Map<string, { total: number; count: number }>();
    filteredRecords.forEach(r => {
      const date = new Date(r.brewedAt).toLocaleDateString('zh-CN');
      const existing = daysMap.get(date) || { total: 0, count: 0 };
      daysMap.set(date, { total: existing.total + r.qualityScore, count: existing.count + 1 });
    });
    Array.from(daysMap.entries()).sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime()).forEach(([date, data]) => {
      qualityTrend.push({
        date,
        品质分: Number((data.total / data.count).toFixed(1)),
      });
    });

    const methodMap = new Map<string, number>();
    filteredRecords.forEach(r => {
      const preset = presets.find(p => p.id === r.presetId);
      if (preset) {
        const methodName = BREWING_METHODS.find(m => m.id === preset.method)?.name || preset.method;
        methodMap.set(methodName, (methodMap.get(methodName) || 0) + 1);
      }
    });
    const methodDistribution = Array.from(methodMap.entries()).map(([name, value]) => ({ name, value }));

    const regionPerformance = REGIONS.map(region => {
      const regionStores = stores.filter(s => s.region === region.id);
      const regionRecords = filteredRecords.filter(r => regionStores.some(s => s.id === r.storeId));
      const avg = regionRecords.length > 0
        ? regionRecords.reduce((sum, r) => sum + r.qualityScore, 0) / regionRecords.length
        : 0;
      return {
        name: region.name,
        品质分: Number(avg.toFixed(1)),
        门店数: regionStores.length,
        杯数: regionRecords.length,
      };
    });

    const tdsBrackets = [
      { name: '<1.18%', min: 0, max: 1.18 },
      { name: '1.18-1.30%', min: 1.18, max: 1.30 },
      { name: '1.30-1.45%', min: 1.30, max: 1.45 },
      { name: '>1.45%', min: 1.45, max: 100 },
    ];
    const tdsDistribution = tdsBrackets.map(bracket => ({
      name: bracket.name,
      数量: filteredRecords.filter(r => r.finalTDS >= bracket.min && r.finalTDS < bracket.max).length,
    }));

    const flavorTrend = FLAVOR_DIMENSIONS.map(dim => {
      const avg = filteredRecords.reduce((sum, r) => sum + r.flavorRating[dim.key as keyof typeof r.flavorRating], 0) / filteredRecords.length;
      return {
        name: dim.label,
        平均值: Number(avg.toFixed(1)),
        目标值: 75,
      };
    });

    const factorCorrelation = OPTIMIZATION_FACTORS.map(factor => {
      const values = filteredRecords.map(r => {
        const preset = presets.find(p => p.id === r.presetId);
        if (!preset) return null;
        const factorValue = preset[factor.key as keyof typeof preset];
        if (typeof factorValue !== 'number') return null;
        return { factor: factorValue, quality: r.qualityScore };
      }).filter(Boolean) as { factor: number; quality: number }[];

      let correlation = 0;
      if (values.length > 2) {
        const n = values.length;
        const sumX = values.reduce((s, v) => s + v.factor, 0);
        const sumY = values.reduce((s, v) => s + v.quality, 0);
        const sumXY = values.reduce((s, v) => s + v.factor * v.quality, 0);
        const sumX2 = values.reduce((s, v) => s + v.factor * v.factor, 0);
        const sumY2 = values.reduce((s, v) => s + v.quality * v.quality, 0);
        correlation = (n * sumXY - sumX * sumY) / Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
      }

      return {
        name: factor.label,
        相关系数: Number(correlation.toFixed(2)),
        权重: factor.weight * 100,
      };
    });

    return {
      avgQuality,
      avgTDS,
      avgExtraction,
      avgBrewTime,
      qualityTrend,
      methodDistribution,
      regionPerformance,
      tdsDistribution,
      flavorTrend,
      factorCorrelation,
    };
  }, [filteredRecords, presets, stores]);

  const topPerformingStores = useMemo(() => {
    return [...stores]
      .map(store => {
        const storeRecords = filteredRecords.filter(r => r.storeId === store.id);
        const avgQuality = storeRecords.length > 0
          ? storeRecords.reduce((sum, r) => sum + r.qualityScore, 0) / storeRecords.length
          : 0;
        return { ...store, avgQuality, recordCount: storeRecords.length };
      })
      .sort((a, b) => b.avgQuality - a.avgQuality)
      .slice(0, 5);
  }, [stores, filteredRecords]);

  const underperformingStores = useMemo(() => {
    return [...stores]
      .map(store => {
        const storeRecords = filteredRecords.filter(r => r.storeId === store.id);
        const avgQuality = storeRecords.length > 0
          ? storeRecords.reduce((sum, r) => sum + r.qualityScore, 0) / storeRecords.length
          : 0;
        return { ...store, avgQuality, recordCount: storeRecords.length };
      })
      .filter(s => s.recordCount > 10)
      .sort((a, b) => a.avgQuality - b.avgQuality)
      .slice(0, 5);
  }, [stores, filteredRecords]);

  const COLORS = ['#8B5A2B', '#D97706', '#059669', '#2563EB', '#7C3AED', '#DC2626'];

  const averageAllCurves = useMemo(() => {
    if (curves.length === 0) return [];
    return calculateAverageCurve(curves.slice(0, 20).map(c => c.dataPoints));
  }, [curves]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-coffee-800 to-coffee-500 bg-clip-text text-transparent">
            数据分析中心
          </h1>
          <p className="text-coffee-500 mt-1">
            多维度品质分析、趋势预测与深度洞察
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as any)}
            className="px-4 py-2 border border-coffee-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-coffee-500/20 bg-white text-sm"
          >
            <option value="7d">最近 7 天</option>
            <option value="30d">最近 30 天</option>
            <option value="90d">最近 90 天</option>
            <option value="all">全部数据</option>
          </select>
          <select
            value={selectedRegion}
            onChange={(e) => setSelectedRegion(e.target.value)}
            className="px-4 py-2 border border-coffee-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-coffee-500/20 bg-white text-sm"
          >
            <option value="all">全球区域</option>
            {REGIONS.map(r => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>
          <Button
            onClick={refreshData}
            variant="secondary"
            icon={<RefreshCw className="w-4 h-4" />}
          >
            刷新
          </Button>
          <Button
            onClick={handleExportReport}
            disabled={exporting}
            icon={exporting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
          >
            {exporting ? '导出中...' : '导出报告'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatsCard
          title="分析样本数"
          value={filteredRecords.length.toLocaleString()}
          icon={<Activity className="w-5 h-5" />}
          color="blue"
        />
        <StatsCard
          title="平均品质评分"
          value={analyticsData.avgQuality.toFixed(1)}
          icon={<Target className="w-5 h-5" />}
          color="green"
          trend={{ value: 2.3, label: '较上期', positive: true }}
        />
        <StatsCard
          title="平均 TDS"
          value={`${analyticsData.avgTDS.toFixed(2)}%`}
          icon={<FlaskConical className="w-5 h-5" />}
          color="amber"
        />
        <StatsCard
          title="平均萃取率"
          value={`${analyticsData.avgExtraction.toFixed(1)}%`}
          icon={<Coffee className="w-5 h-5" />}
          color="purple"
        />
      </div>

      <div className="bg-white rounded-2xl shadow-lg border border-coffee-100">
        <div className="flex items-center gap-1 p-2 border-b border-coffee-100 overflow-x-auto">
          {[
            { key: 'overview', label: '总览', icon: <BarChart3 className="w-4 h-4" /> },
            { key: 'quality', label: '品质分析', icon: <LineChart className="w-4 h-4" /> },
            { key: 'flavor', label: '风味分析', icon: <PieChart className="w-4 h-4" /> },
            { key: 'performance', label: '门店表现', icon: <TrendingUp className="w-4 h-4" /> },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl transition-all whitespace-nowrap ${
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

        {activeTab === 'overview' && (
          <div className="p-6 space-y-6">
            <div className="grid lg:grid-cols-2 gap-6">
              <div className="bg-coffee-50 rounded-xl p-6">
                <h3 className="font-semibold text-coffee-800 mb-4 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  品质趋势
                </h3>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={analyticsData.qualityTrend}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#EADDD7" />
                      <XAxis dataKey="date" stroke="#8A6559" fontSize={12} />
                      <YAxis stroke="#8A6559" fontSize={12} domain={[60, 100]} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#fff',
                          border: '1px solid #EADDD7',
                          borderRadius: '8px',
                        }}
                      />
                      <Bar dataKey="品质分" fill="#8B5A2B" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-coffee-50 rounded-xl p-6">
                <h3 className="font-semibold text-coffee-800 mb-4 flex items-center gap-2">
                  <Coffee className="w-5 h-5" />
                  冲煮方式分布
                </h3>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPieChart>
                      <Pie
                        data={analyticsData.methodDistribution}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={2}
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      >
                        {analyticsData.methodDistribution.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            <div className="bg-coffee-50 rounded-xl p-6">
              <h3 className="font-semibold text-coffee-800 mb-4 flex items-center gap-2">
                <LineChart className="w-5 h-5" />
                综合萃取曲线分析
              </h3>
              <div className="h-80">
                <ExtractionCurveChart
                  data={averageAllCurves}
                  showAllMetrics
                  height={300}
                />
              </div>
            </div>

            <div className="bg-coffee-50 rounded-xl p-6">
              <h3 className="font-semibold text-coffee-800 mb-4 flex items-center gap-2">
                <Layers className="w-5 h-5" />
                TDS 分布区间
              </h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analyticsData.tdsDistribution} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#EADDD7" />
                    <XAxis type="number" stroke="#8A6559" fontSize={12} />
                    <YAxis dataKey="name" type="category" stroke="#8A6559" fontSize={12} width={80} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#fff',
                        border: '1px solid #EADDD7',
                        borderRadius: '8px',
                      }}
                    />
                    <Bar dataKey="数量" fill="#D97706" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-4 text-sm">
                <div className="text-center p-3 bg-green-50 rounded-lg">
                  <p className="font-bold text-green-700">1.18-1.45%</p>
                  <p className="text-green-600 text-xs">最佳区间</p>
                </div>
                <div className="text-center p-3 bg-amber-50 rounded-lg">
                  <p className="font-bold text-amber-700">
                    {analyticsData.tdsDistribution[1]?.数量 || 0}
                  </p>
                  <p className="text-amber-600 text-xs">偏低</p>
                </div>
                <div className="text-center p-3 bg-red-50 rounded-lg">
                  <p className="font-bold text-red-700">
                    {analyticsData.tdsDistribution[3]?.数量 || 0}
                  </p>
                  <p className="text-red-600 text-xs">偏高</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'quality' && (
          <div className="p-6 space-y-6">
            <div className="grid lg:grid-cols-3 gap-6">
              <div className="bg-coffee-50 rounded-xl p-6">
                <h3 className="font-semibold text-coffee-800 mb-4">区域品质对比</h3>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={analyticsData.regionPerformance} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="#EADDD7" />
                      <XAxis type="number" stroke="#8A6559" fontSize={12} domain={[0, 100]} />
                      <YAxis dataKey="name" type="category" stroke="#8A6559" fontSize={12} width={80} />
                      <Tooltip />
                      <Bar dataKey="品质分" fill="#059669" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="lg:col-span-2 bg-coffee-50 rounded-xl p-6">
                <h3 className="font-semibold text-coffee-800 mb-4">优化因子相关性分析</h3>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={analyticsData.factorCorrelation}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#EADDD7" />
                      <XAxis dataKey="name" stroke="#8A6559" fontSize={11} />
                      <YAxis stroke="#8A6559" fontSize={12} domain={[-1, 1]} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="相关系数" fill="#8B5A2B" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="权重" fill="#D97706" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <p className="text-sm text-coffee-500 mt-3">
                  相关系数显示各因子与品质评分的关联程度，正值表示正相关，负值表示负相关
                </p>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-gradient-to-br from-green-50 to-white rounded-xl p-6 border border-green-100">
                <h3 className="font-semibold text-green-800 mb-4 flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5" />
                  表现最佳门店 TOP 5
                </h3>
                <div className="space-y-3">
                  {topPerformingStores.map((store, index) => (
                    <div key={store.id} className="flex items-center gap-3 p-3 bg-white rounded-lg">
                      <div className="w-8 h-8 bg-gradient-to-br from-amber-400 to-amber-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-coffee-900">{store.name}</p>
                        <p className="text-xs text-coffee-500">{store.city}, {store.country}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-green-600">{store.avgQuality.toFixed(1)}</p>
                        <p className="text-xs text-coffee-400">{store.recordCount} 杯</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-gradient-to-br from-amber-50 to-white rounded-xl p-6 border border-amber-100">
                <h3 className="font-semibold text-amber-800 mb-4 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5" />
                  需要关注门店
                </h3>
                <div className="space-y-3">
                  {underperformingStores.map((store, index) => (
                    <div key={store.id} className="flex items-center gap-3 p-3 bg-white rounded-lg">
                      <div className="w-8 h-8 bg-gradient-to-br from-red-400 to-red-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-coffee-900">{store.name}</p>
                        <p className="text-xs text-coffee-500">{store.city}, {store.country}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-red-600">{store.avgQuality.toFixed(1)}</p>
                        <p className="text-xs text-coffee-400">{store.recordCount} 杯</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'flavor' && (
          <div className="p-6 space-y-6">
            <div className="grid lg:grid-cols-2 gap-6">
              <div className="bg-coffee-50 rounded-xl p-6">
                <h3 className="font-semibold text-coffee-800 mb-4">风味维度平均值</h3>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={analyticsData.flavorTrend}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#EADDD7" />
                      <XAxis dataKey="name" stroke="#8A6559" fontSize={12} />
                      <YAxis stroke="#8A6559" fontSize={12} domain={[0, 100]} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="平均值" fill="#8B5A2B" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="目标值" fill="#EADDD7" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-coffee-50 rounded-xl p-6">
                <h3 className="font-semibold text-coffee-800 mb-4">综合风味雷达</h3>
                <div className="h-72 flex items-center justify-center">
                  {filteredRecords.length > 0 && presets.length > 0 && (
                    <FlavorRadarChart
                      data={filteredRecords[0].flavorRating}
                      target={presets[0].targetFlavor}
                      tolerance={presets[0].tolerance}
                      height={280}
                    />
                  )}
                </div>
              </div>
            </div>

            {filteredRecords.length > 0 && presets.length > 0 && (
              <div className="bg-coffee-50 rounded-xl p-6">
                <h3 className="font-semibold text-coffee-800 mb-4">风味匹配度分析</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <FlavorComparisonCard
                    actual={filteredRecords[0].flavorRating}
                    target={presets[0].targetFlavor}
                    tolerance={presets[0].tolerance}
                  />
                  {filteredRecords.length > 1 && (
                    <FlavorComparisonCard
                      actual={filteredRecords[1].flavorRating}
                      target={presets[0].targetFlavor}
                      tolerance={presets[0].tolerance}
                    />
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'performance' && (
          <div className="p-6 space-y-6">
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-gradient-to-br from-coffee-500 to-coffee-700 rounded-xl p-5 text-white">
                <p className="text-coffee-200 text-sm">总冲煮杯数</p>
                <p className="text-3xl font-bold mt-2">{records.length.toLocaleString()}</p>
                <p className="text-coffee-300 text-sm mt-1">累计记录</p>
              </div>
              <div className="bg-gradient-to-br from-amber-500 to-amber-700 rounded-xl p-5 text-white">
                <p className="text-amber-200 text-sm">配方数量</p>
                <p className="text-3xl font-bold mt-2">{presets.length}</p>
                <p className="text-amber-300 text-sm mt-1">已发布 {presets.filter(p => p.status === 'approved').length} 个</p>
              </div>
              <div className="bg-gradient-to-br from-green-500 to-green-700 rounded-xl p-5 text-white">
                <p className="text-green-200 text-sm">在线门店</p>
                <p className="text-3xl font-bold mt-2">{stores.filter(s => s.syncStatus === 'online').length}</p>
                <p className="text-green-300 text-sm mt-1">共 {stores.length} 家门店</p>
              </div>
              <div className="bg-gradient-to-br from-purple-500 to-purple-700 rounded-xl p-5 text-white">
                <p className="text-purple-200 text-sm">咖啡豆种</p>
                <p className="text-3xl font-bold mt-2">{beans.length}</p>
                <p className="text-purple-300 text-sm mt-1">来自 {new Set(beans.map(b => b.origin)).size} 个产区</p>
              </div>
            </div>

            <div className="grid lg:grid-cols-2 gap-6">
              <div className="bg-coffee-50 rounded-xl p-6">
                <h3 className="font-semibold text-coffee-800 mb-4 flex items-center gap-2">
                  <Zap className="w-5 h-5" />
                  优化因子权重分布
                </h3>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPieChart>
                      <Pie
                        data={OPTIMIZATION_FACTORS.map(f => ({ name: f.label, value: f.weight * 100 }))}
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        dataKey="value"
                        label={({ name, value }) => `${name}: ${value}%`}
                      >
                        {OPTIMIZATION_FACTORS.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-coffee-50 rounded-xl p-6">
                <h3 className="font-semibold text-coffee-800 mb-4 flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  研发实验统计
                </h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-white rounded-lg">
                    <div>
                      <p className="text-coffee-500 text-sm">进行中实验</p>
                      <p className="text-2xl font-bold text-amber-600">
                        {experiments.filter(e => e.status === 'running').length}
                      </p>
                    </div>
                    <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center">
                      <Activity className="w-6 h-6 text-amber-600" />
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-white rounded-lg">
                    <div>
                      <p className="text-coffee-500 text-sm">已完成实验</p>
                      <p className="text-2xl font-bold text-green-600">
                        {experiments.filter(e => e.status === 'completed').length}
                      </p>
                    </div>
                    <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                      <CheckCircle2 className="w-6 h-6 text-green-600" />
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-white rounded-lg">
                    <div>
                      <p className="text-coffee-500 text-sm">总实验组数</p>
                      <p className="text-2xl font-bold text-coffee-700">
                        {experiments.reduce((sum, e) => sum + e.trials, 0)}
                      </p>
                    </div>
                    <div className="w-12 h-12 bg-coffee-100 rounded-full flex items-center justify-center">
                      <FlaskConical className="w-6 h-6 text-coffee-600" />
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-white rounded-lg">
                    <div>
                      <p className="text-coffee-500 text-sm">萃取曲线数据</p>
                      <p className="text-2xl font-bold text-purple-600">
                        {curves.length.toLocaleString()}
                      </p>
                    </div>
                    <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                      <LineChart className="w-6 h-6 text-purple-600" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-coffee-800 to-coffee-950 rounded-xl p-8 text-white">
              <h3 className="text-xl font-bold mb-4">数据洞察</h3>
              <div className="grid md:grid-cols-3 gap-6">
                <div className="bg-white/10 rounded-xl p-5">
                  <p className="text-coffee-300 text-sm mb-2">主要发现</p>
                  <p className="font-medium">
                    {analyticsData.avgQuality >= 80
                      ? '整体品质表现优秀，各区域出品一致性良好'
                      : analyticsData.avgQuality >= 70
                        ? '品质处于中等水平，建议针对低分区门店进行优化'
                        : '整体品质偏低，需要立即启动专项优化行动'}
                  </p>
                </div>
                <div className="bg-white/10 rounded-xl p-5">
                  <p className="text-coffee-300 text-sm mb-2">优化建议</p>
                  <p className="font-medium">
                    {analyticsData.avgTDS < 1.18
                      ? 'TDS 普遍偏低，建议增加粉量或延长萃取时间'
                      : analyticsData.avgTDS > 1.45
                        ? 'TDS 普遍偏高，建议适当调粗研磨度'
                        : 'TDS 处于最佳区间，继续保持当前参数'}
                  </p>
                </div>
                <div className="bg-white/10 rounded-xl p-5">
                  <p className="text-coffee-300 text-sm mb-2">预测趋势</p>
                  <p className="font-medium">
                    基于多因子优化引擎分析，预计通过参数调整可实现
                    <span className="text-amber-400 font-bold"> 10-15% </span>
                    的品质提升
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
