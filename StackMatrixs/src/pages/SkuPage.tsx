import React, { useState, useMemo } from 'react';
import {
  BarChart3,
  Search,
  TrendingUp,
  TrendingDown,
  Minus,
  RefreshCw,
  Package,
  Filter,
  Download,
} from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import { useWarehouseStore } from '@/store/useWarehouseStore';
import { classifyLiquidity } from '@/algorithms/liquidityScoring';
import { Tabs } from '@/components/common/Tabs';
import { DataTable } from '@/components/common/DataTable';
import { ProgressBar } from '@/components/common/ProgressBar';
import {
  formatNumber,
  formatRelativeTime,
  getHeatLevelTextColor,
  truncateString,
} from '@/utils/formatters';
import type { SKU } from '@/types';

export const SkuPage: React.FC = () => {
  const { skus, refreshSkuLiquidity } = useWarehouseStore();
  const [activeTab, setActiveTab] = useState('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [liquidityFilter, setLiquidityFilter] = useState<string>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const categories = useMemo(() => {
    const cats = [...new Set(skus.map((s) => s.category))];
    return ['all', ...cats];
  }, [skus]);

  const filteredSkus = useMemo(() => {
    return skus.filter((sku) => {
      const matchSearch =
        sku.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        sku.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchCategory = categoryFilter === 'all' || sku.category === categoryFilter;
      const liquidityClass = classifyLiquidity(sku.liquidityScore);
      const matchLiquidity =
        liquidityFilter === 'all' || liquidityClass === liquidityFilter;
      return matchSearch && matchCategory && matchLiquidity;
    });
  }, [skus, searchQuery, categoryFilter, liquidityFilter]);

  const liquidityDistribution = useMemo(() => {
    const dist = { hot: 0, warm: 0, cool: 0, cold: 0 };
    skus.forEach((sku) => {
      const cls = classifyLiquidity(sku.liquidityScore);
      dist[cls]++;
    });
    return [
      { name: '热', value: dist.hot, color: '#F43F5E' },
      { name: '温', value: dist.warm, color: '#F59E0B' },
      { name: '凉', value: dist.cool, color: '#3B82F6' },
      { name: '冷', value: dist.cold, color: '#64748B' },
    ];
  }, [skus]);

  const categoryStats = useMemo(() => {
    const stats: Record<string, { count: number; avgLiquidity: number; totalStock: number }> = {};
    skus.forEach((sku) => {
      if (!stats[sku.category]) {
        stats[sku.category] = { count: 0, avgLiquidity: 0, totalStock: 0 };
      }
      stats[sku.category].count++;
      stats[sku.category].avgLiquidity += sku.liquidityScore;
      stats[sku.category].totalStock += sku.totalStock;
    });
    return Object.entries(stats)
      .map(([name, data]) => ({
        name,
        count: data.count,
        avgLiquidity: Math.round(data.avgLiquidity / data.count),
        totalStock: data.totalStock,
      }))
      .sort((a, b) => b.count - a.count);
  }, [skus]);

  const topSkus = useMemo(() => {
    return [...skus].sort((a, b) => b.liquidityScore - a.liquidityScore).slice(0, 10);
  }, [skus]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      refreshSkuLiquidity();
      setIsRefreshing(false);
    }, 1000);
  };

  const skuColumns = [
    { key: 'id', label: 'SKU ID', render: (s: SKU) => <code className="text-xs text-wms-accent">{s.id}</code> },
    { key: 'name', label: '名称', render: (s) => (
      <div>
        <p className="font-medium text-wms-text">{truncateString(s.name, 20)}</p>
        <p className="text-xs text-wms-subtext">{s.category}</p>
      </div>
    )},
    { key: 'totalStock', label: '库存', align: 'right' as const, render: (s) => `${formatNumber(s.totalStock)} ${s.unit}` },
    { key: 'turnoverRate', label: '周转率', align: 'right' as const, render: (s) => s.turnoverRate.toFixed(2) },
    {
      key: 'liquidityScore',
      label: '流动性评分',
      render: (s) => {
        const cls = classifyLiquidity(s.liquidityScore);
        return (
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <ProgressBar
                value={s.liquidityScore}
                size="sm"
                color={
                  cls === 'hot' ? 'danger' :
                  cls === 'warm' ? 'warning' :
                  cls === 'cool' ? 'primary' : 'success'
                }
              />
            </div>
            <span className={`text-sm font-medium ${getHeatLevelTextColor(s.liquidityScore)}`}>
              {s.liquidityScore}
            </span>
          </div>
        );
      },
    },
    { key: 'classification', label: '分类', render: (s) => {
      const cls = classifyLiquidity(s.liquidityScore);
      return (
        <span className={`text-xs px-2 py-0.5 rounded ${
          cls === 'hot' ? 'bg-wms-danger/10 text-wms-danger' :
          cls === 'warm' ? 'bg-wms-warning/10 text-wms-warning' :
          cls === 'cool' ? 'bg-wms-primary/10 text-wms-primary' :
          'bg-wms-subtext/10 text-wms-subtext'
        }`}>
          {cls === 'hot' ? '热' : cls === 'warm' ? '温' : cls === 'cool' ? '凉' : '冷'}
        </span>
      );
    }},
    { key: 'lastOutbound', label: '最近出库', render: (s) => formatRelativeTime(s.lastOutbound) },
  ];

  const tabs = [
    { id: 'list', label: 'SKU 列表', count: skus.length },
    { id: 'analysis', label: '流动性分析' },
    { id: 'distribution', label: '品类分布' },
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="wms-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-wms-subtext text-sm">总SKU数</p>
              <p className="text-3xl font-bold text-wms-text mt-1">{formatNumber(skus.length)}</p>
            </div>
            <Package className="w-8 h-8 text-wms-primary" />
          </div>
        </div>
        <div className="wms-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-wms-subtext text-sm">热SKU</p>
              <p className="text-3xl font-bold text-wms-danger mt-1">
                {liquidityDistribution[0].value}
              </p>
            </div>
            <TrendingUp className="w-8 h-8 text-wms-danger" />
          </div>
        </div>
        <div className="wms-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-wms-subtext text-sm">冷SKU</p>
              <p className="text-3xl font-bold text-wms-subtext mt-1">
                {liquidityDistribution[3].value}
              </p>
            </div>
            <TrendingDown className="w-8 h-8 text-wms-subtext" />
          </div>
        </div>
        <div className="wms-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-wms-subtext text-sm">平均评分</p>
              <p className="text-3xl font-bold text-wms-accent mt-1">
                {Math.round(skus.reduce((sum, s) => sum + s.liquidityScore, 0) / skus.length)}
              </p>
            </div>
            <BarChart3 className="w-8 h-8 text-wms-accent" />
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-wms-subtext" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索 SKU ID 或名称..."
              className="w-64 pl-9 pr-4 py-2 bg-wms-bg border border-wms-border rounded-lg text-sm text-wms-text placeholder-wms-subtext focus:outline-none focus:border-wms-primary transition-colors"
            />
          </div>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 bg-wms-bg border border-wms-border rounded-lg text-sm text-wms-text focus:outline-none focus:border-wms-primary transition-colors"
          >
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat === 'all' ? '全部品类' : cat}
              </option>
            ))}
          </select>
          <select
            value={liquidityFilter}
            onChange={(e) => setLiquidityFilter(e.target.value)}
            className="px-3 py-2 bg-wms-bg border border-wms-border rounded-lg text-sm text-wms-text focus:outline-none focus:border-wms-primary transition-colors"
          >
            <option value="all">全部分类</option>
            <option value="hot">热</option>
            <option value="warm">温</option>
            <option value="cool">凉</option>
            <option value="cold">冷</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-2 px-4 py-2 bg-wms-bg border border-wms-border rounded-lg text-wms-text hover:bg-wms-panel transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            刷新
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-wms-primary text-white rounded-lg hover:bg-wms-primary/80 transition-colors">
            <Download className="w-4 h-4" />
            导出
          </button>
        </div>
      </div>

      <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

      {activeTab === 'list' && (
        <div className="wms-panel">
          <DataTable columns={skuColumns} data={filteredSkus.slice(0, 50)} />
          {filteredSkus.length > 50 && (
            <div className="mt-4 text-center text-wms-subtext text-sm">
              显示前 50 条，共 {filteredSkus.length} 条记录
            </div>
          )}
        </div>
      )}

      {activeTab === 'analysis' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="wms-panel">
            <h3 className="font-semibold text-wms-text mb-4">流动性分布</h3>
            <div className="flex items-center gap-8">
              <div className="flex-shrink-0">
                <ResponsiveContainer width={180} height={180}>
                  <PieChart>
                    <Pie
                      data={liquidityDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={75}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {liquidityDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex-1 space-y-3">
                {liquidityDistribution.map((item) => (
                  <div key={item.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="text-wms-text">{item.name}SKU</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-wms-subtext">{item.value} 个</span>
                      <span className="text-wms-text font-medium">
                        {((item.value / skus.length) * 100).toFixed(1)}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="wms-panel">
            <h3 className="font-semibold text-wms-text mb-4">TOP 10 高流动性 SKU</h3>
            <div className="space-y-2">
              {topSkus.map((sku, idx) => (
                <div
                  key={sku.id}
                  className="flex items-center gap-4 p-3 bg-wms-bg/50 rounded-lg"
                >
                  <span
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      idx < 3 ? 'bg-wms-primary/20 text-wms-primary' : 'bg-wms-panel text-wms-subtext'
                    }`}
                  >
                    {idx + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-wms-text truncate">{sku.name}</p>
                    <p className="text-xs text-wms-subtext">{sku.category}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-24">
                      <ProgressBar
                        value={sku.liquidityScore}
                        size="sm"
                        color={
                          classifyLiquidity(sku.liquidityScore) === 'hot'
                            ? 'danger'
                            : classifyLiquidity(sku.liquidityScore) === 'warm'
                            ? 'warning'
                            : 'primary'
                        }
                      />
                    </div>
                    <span className={`font-bold ${getHeatLevelTextColor(sku.liquidityScore)}`}>
                      {sku.liquidityScore}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'distribution' && (
        <div className="wms-panel">
          <h3 className="font-semibold text-wms-text mb-4">品类流动性对比</h3>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={categoryStats} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis type="number" stroke="#94A3B8" fontSize={11} />
              <YAxis dataKey="name" type="category" stroke="#94A3B8" fontSize={11} width={100} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1E293B',
                  border: '1px solid #334155',
                  borderRadius: '8px',
                  color: '#F1F5F9',
                }}
              />
              <Bar dataKey="avgLiquidity" name="平均流动性" fill="#3B82F6" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>

          <div className="mt-6 grid grid-cols-2 md:grid-cols-5 gap-4">
            {categoryStats.slice(0, 10).map((cat) => (
              <div key={cat.name} className="p-4 bg-wms-bg/50 rounded-lg border border-wms-border/50">
                <p className="text-2xl font-bold text-wms-primary">{cat.count}</p>
                <p className="text-sm text-wms-text mt-1 truncate">{cat.name}</p>
                <ProgressBar
                  value={cat.avgLiquidity}
                  size="sm"
                  className="mt-2"
                />
                <p className="text-xs text-wms-subtext mt-1">
                  库存: {formatNumber(cat.totalStock)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
