import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Package, Search, TrendingUp, TrendingDown, Minus, Database, RefreshCw, Download, Info } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import useWMSStore from '../../store/useWMSStore';
import { SKU, LiquidityAnalysis } from '../../types';

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

function useVirtualScroll<T>(items: T[], itemHeight: number, containerHeight: number) {
  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const visibleCount = Math.ceil(containerHeight / itemHeight) + 4;
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - 2);
  const endIndex = Math.min(items.length, startIndex + visibleCount);
  const visibleItems = items.slice(startIndex, endIndex);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  const totalHeight = items.length * itemHeight;
  const offsetY = startIndex * itemHeight;

  return { containerRef, handleScroll, visibleItems, totalHeight, offsetY };
}

const getCategoryColor = (category: string) => {
  const colors: Record<string, string> = {
    electronics: 'bg-blue-500/20 text-blue-400',
    clothing: 'bg-pink-500/20 text-pink-400',
    food: 'bg-green-500/20 text-green-400',
    cosmetics: 'bg-purple-500/20 text-purple-400',
    household: 'bg-amber-500/20 text-amber-400',
    industrial: 'bg-slate-500/20 text-slate-400'
  };
  return colors[category] || 'bg-surface-hover text-text-muted';
};

const getHeatLevel = (score: number): number => {
  if (score >= 80) return 5;
  if (score >= 60) return 4;
  if (score >= 40) return 3;
  if (score >= 20) return 2;
  return 1;
};

const getTrendIcon = (trend: string) => {
  switch (trend) {
    case 'increasing': return <TrendingUp className="w-4 h-4 text-accent-green" />;
    case 'decreasing': return <TrendingDown className="w-4 h-4 text-accent-red" />;
    default: return <Minus className="w-4 h-4 text-text-muted" />;
  }
};

function HeatLevelIndicator({ level }: { level: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <div
          key={i}
          className={`w-2 h-4 rounded-sm ${
            i <= level 
              ? i <= 2 ? 'bg-primary' : i <= 4 ? 'bg-accent-amber' : 'bg-accent-red'
              : 'bg-surface-hover'
          }`}
        />
      ))}
    </div>
  );
}

function SKUCard({ 
  sku, 
  analysis, 
  onClick, 
  isSelected 
}: { 
  sku: SKU; 
  analysis: LiquidityAnalysis | undefined;
  onClick: () => void; 
  isSelected: boolean; 
}) {
  const liquidityScore = sku.liquidityScore;
  const heatLevel = getHeatLevel(liquidityScore);
  const trend = analysis?.trend || 'stable';

  return (
    <div
      onClick={onClick}
      className={`bg-surface rounded-xl border p-4 cursor-pointer transition-all hover:border-primary/50 ${
        isSelected ? 'border-primary shadow-lg shadow-primary/20' : 'border-surface-border'
      }`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary/20 rounded-lg flex items-center justify-center">
            <Package className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="font-mono text-sm text-text-primary">{sku.id}</p>
            <p className="text-xs text-text-muted truncate max-w-32">{sku.name}</p>
          </div>
        </div>
        {getTrendIcon(trend)}
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs text-text-muted">流动性评分</span>
          <span className="text-lg font-bold text-text-primary font-mono">
            {liquidityScore.toFixed(0)}
          </span>
        </div>
        
        <div className="h-1.5 bg-surface-hover rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full ${
              liquidityScore >= 80 ? 'bg-accent-red' :
              liquidityScore >= 50 ? 'bg-accent-amber' :
              liquidityScore >= 20 ? 'bg-primary' : 'bg-text-muted'
            }`}
            style={{ width: `${Math.min(100, liquidityScore)}%` }}
          />
        </div>

        <div className="flex items-center justify-between">
          <span className="text-xs text-text-muted">热度等级</span>
          <HeatLevelIndicator level={heatLevel} />
        </div>

        <div className="flex items-center justify-between">
          <span className="text-xs text-text-muted">分类排名</span>
          <span className="text-xs text-text-primary font-mono">
            {analysis?.categoryRank || '-'} / {analysis?.categoryTotal || '-'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className={`px-2 py-0.5 rounded text-xs ${getCategoryColor(sku.category)}`}>
            {sku.category}
          </span>
        </div>
      </div>
    </div>
  );
}

function SKUDetail({ sku, onClose }: { sku: SKU; onClose: () => void }) {
  const { locations, getSKUAnalysis } = useWMSStore();
  const analysis = getSKUAnalysis(sku.id);
  
  const location = locations.find(l => l.skuId === sku.id);
  const liquidityScore = sku.liquidityScore;

  const trendData = useMemo(() => Array.from({ length: 30 }).map((_, i) => ({
    day: `D${30 - i}`,
    流动性: Math.max(0, Math.min(100, liquidityScore + (Math.random() - 0.5) * 20 - i * 0.5)),
    入库量: Math.floor(Math.random() * 50) + 10,
    出库量: Math.floor(Math.random() * 40) + 5
  })), [liquidityScore]);

  const associatedSKUs = useMemo(() => {
    const { skus } = useWMSStore.getState();
    return sku.associatedSKUs
      .map(id => skus.find(s => s.id === id))
      .filter(Boolean)
      .slice(0, 5) as SKU[];
  }, [sku.associatedSKUs]);

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="bg-surface rounded-xl border border-surface-border overflow-hidden"
    >
      <div className="p-4 border-b border-surface-border flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-text-primary">{sku.name}</h3>
          <p className="text-xs text-text-muted font-mono">{sku.id}</p>
        </div>
        <button onClick={onClose} className="text-text-muted hover:text-text-primary">
          ✕
        </button>
      </div>

      <div className="p-4 space-y-4 max-h-[calc(100vh-300px)] overflow-y-auto">
        <div className="bg-gradient-to-r from-primary/10 to-transparent rounded-lg p-4 border border-primary/30">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-text-muted">流动性评分</span>
            <span className="text-3xl font-bold text-primary font-mono">
              {liquidityScore.toFixed(1)}
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            {analysis?.trend === 'increasing' && (
              <span className="flex items-center gap-1 text-accent-green">
                <TrendingUp className="w-4 h-4" />
                上升趋势
              </span>
            )}
            {analysis?.trend === 'decreasing' && (
              <span className="flex items-center gap-1 text-accent-red">
                <TrendingDown className="w-4 h-4" />
                下降趋势
              </span>
            )}
            {analysis?.trend === 'stable' && (
              <span className="flex items-center gap-1 text-text-muted">
                <Minus className="w-4 h-4" />
                趋势稳定
              </span>
            )}
            {analysis && (
              <span className="text-text-muted">强度: {(analysis.trendStrength * 100).toFixed(0)}%</span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-background rounded-lg p-3">
            <p className="text-xs text-text-muted mb-1">入库次数</p>
            <p className="text-xl font-bold text-text-primary font-mono">{sku.inCount}</p>
          </div>
          <div className="bg-background rounded-lg p-3">
            <p className="text-xs text-text-muted mb-1">出库次数</p>
            <p className="text-xl font-bold text-text-primary font-mono">{sku.outCount}</p>
          </div>
          <div className="bg-background rounded-lg p-3">
            <p className="text-xs text-text-muted mb-1">重量</p>
            <p className="text-xl font-bold text-text-primary font-mono">{sku.weight.toFixed(1)}kg</p>
          </div>
          <div className="bg-background rounded-lg p-3">
            <p className="text-xs text-text-muted mb-1">体积</p>
            <p className="text-xl font-bold text-text-primary font-mono">{sku.volume.toFixed(3)}m³</p>
          </div>
        </div>

        {location && (
          <div className="bg-background rounded-lg p-4">
            <p className="text-sm text-text-muted mb-2">当前存储位置</p>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-accent-green/20 rounded-lg flex items-center justify-center">
                <Database className="w-5 h-5 text-accent-green" />
              </div>
              <div>
                <p className="font-mono text-text-primary">{location.id}</p>
                <p className="text-xs text-text-muted">排 {location.row} 列 {location.col} 层 {location.level}</p>
              </div>
            </div>
          </div>
        )}

        <div>
          <p className="text-sm text-text-muted mb-2">近30天流动性趋势</p>
          <div className="bg-background rounded-lg p-3 h-40">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
                <XAxis dataKey="day" stroke="#64748B" fontSize={8} />
                <YAxis stroke="#64748B" fontSize={8} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1E293B',
                    border: '1px solid #334155',
                    borderRadius: '8px',
                    fontSize: '11px'
                  }}
                />
                <Line type="monotone" dataKey="流动性" stroke="#06B6D4" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {associatedSKUs.length > 0 && (
          <div>
            <p className="text-sm text-text-muted mb-2">关联 SKU</p>
            <div className="space-y-2">
              {associatedSKUs.map((assocSku) => (
                <div key={assocSku.id} className="bg-background rounded-lg p-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Package className="w-4 h-4 text-text-muted" />
                    <div>
                      <p className="text-sm text-text-primary">{assocSku.name}</p>
                      <p className="text-xs text-text-muted font-mono">{assocSku.id}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-text-muted">流动性</p>
                    <p className="text-sm font-mono text-primary">
                      {assocSku.liquidityScore.toFixed(0)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {analysis && analysis.recommendations.length > 0 && (
          <div>
            <p className="text-sm text-text-muted mb-2">优化建议</p>
            <div className="space-y-2">
              {analysis.recommendations.slice(0, 3).map((rec, index) => (
                <div key={index} className="flex items-start gap-2 p-3 bg-background rounded-lg">
                  <Info className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-text-secondary">{rec}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}

export default function SKUPage() {
  const { 
    skus, 
    metrics, 
    categoryStats, 
    liquidityDistribution, 
    topSKUs, 
    skuCountByLiquidity,
    getSKUAnalysis,
    filterSKUs 
  } = useWMSStore();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedSKUId, setSelectedSKUId] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<string>('liquidity');

  const debouncedSearch = useDebounce(searchTerm, 300);

  const categories = useMemo(() => {
    return ['all', 'electronics', 'clothing', 'food', 'cosmetics', 'household', 'industrial'];
  }, []);

  const categoryNames: Record<string, string> = {
    all: '全部分类',
    electronics: '电子产品',
    clothing: '服装',
    food: '食品',
    cosmetics: '化妆品',
    household: '家居用品',
    industrial: '工业品'
  };

  const filteredSKUs = useMemo(() => {
    return filterSKUs(debouncedSearch, selectedCategory, sortBy, 500);
  }, [debouncedSearch, selectedCategory, sortBy, filterSKUs]);

  const { containerRef, handleScroll, visibleItems, totalHeight, offsetY } = useVirtualScroll(
    filteredSKUs,
    220,
    600
  );

  const selectedSKU = useMemo(() => 
    selectedSKUId ? skus.find(s => s.id === selectedSKUId) : null,
    [selectedSKUId, skus]
  );

  const top5SKUs = useMemo(() => topSKUs.slice(0, 5), [topSKUs]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-surface rounded-xl border border-surface-border p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-primary/20 rounded-lg flex items-center justify-center">
              <Package className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-text-muted text-sm">SKU 总数</p>
              <p className="text-2xl font-bold text-text-primary font-mono">{metrics.totalSKUs.toLocaleString()}</p>
            </div>
          </div>
        </div>
        <div className="bg-surface rounded-xl border border-surface-border p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-accent-green/20 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-accent-green" />
            </div>
            <div>
              <p className="text-text-muted text-sm">高流动性</p>
              <p className="text-2xl font-bold text-text-primary font-mono">
                {skuCountByLiquidity.high.toLocaleString()}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-surface rounded-xl border border-surface-border p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-accent-amber/20 rounded-lg flex items-center justify-center">
              <Minus className="w-5 h-5 text-accent-amber" />
            </div>
            <div>
              <p className="text-text-muted text-sm">中流动性</p>
              <p className="text-2xl font-bold text-text-primary font-mono">
                {skuCountByLiquidity.medium.toLocaleString()}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-surface rounded-xl border border-surface-border p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-accent-red/20 rounded-lg flex items-center justify-center">
              <TrendingDown className="w-5 h-5 text-accent-red" />
            </div>
            <div>
              <p className="text-text-muted text-sm">低流动性</p>
              <p className="text-2xl font-bold text-text-primary font-mono">
                {skuCountByLiquidity.low.toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-surface rounded-xl border border-surface-border p-4">
            <div className="flex flex-col sm:flex-row gap-4 mb-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-text-muted" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="搜索 SKU 编号或名称..."
                  className="w-full bg-background border border-surface-border rounded-lg pl-10 pr-4 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary transition-colors"
                />
              </div>
              <div className="flex gap-2">
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="bg-background border border-surface-border rounded-lg px-3 py-2.5 text-sm text-text-primary focus:outline-none focus:border-primary"
                >
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{categoryNames[cat] || cat}</option>
                  ))}
                </select>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="bg-background border border-surface-border rounded-lg px-3 py-2.5 text-sm text-text-primary focus:outline-none focus:border-primary"
                >
                  <option value="liquidity">按流动性</option>
                  <option value="name">按名称</option>
                  <option value="category">按分类</option>
                </select>
                <button className="p-2.5 bg-surface-hover hover:bg-surface rounded-lg transition-colors">
                  <RefreshCw className="w-5 h-5 text-text-muted" />
                </button>
                <button className="p-2.5 bg-surface-hover hover:bg-surface rounded-lg transition-colors">
                  <Download className="w-5 h-5 text-text-muted" />
                </button>
              </div>
            </div>

            <div className="text-xs text-text-muted mb-3">
              显示 {Math.min(500, filteredSKUs.length)} 条结果（共 {skus.length.toLocaleString()} 条）
            </div>

            <div 
              ref={containerRef}
              onScroll={handleScroll}
              className="relative max-h-[600px] overflow-y-auto pr-2"
              style={{ scrollBehavior: 'smooth' }}
            >
              <div style={{ height: totalHeight, position: 'relative' }}>
                <div style={{ transform: `translateY(${offsetY}px)` }}>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {visibleItems.map(sku => (
                      <SKUCard
                        key={sku.id}
                        sku={sku}
                        analysis={getSKUAnalysis(sku.id)}
                        isSelected={selectedSKUId === sku.id}
                        onClick={() => setSelectedSKUId(selectedSKUId === sku.id ? null : sku.id)}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {filteredSKUs.length === 0 && (
              <div className="text-center py-12 text-text-muted">
                <Search className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>未找到匹配的 SKU</p>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <AnimatePresence mode="wait">
            {selectedSKU ? (
              <SKUDetail sku={selectedSKU} onClose={() => setSelectedSKUId(null)} />
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-surface rounded-xl border border-surface-border p-4"
              >
                <h3 className="font-semibold text-text-primary mb-4">流动性分布</h3>
                <div className="h-48 mb-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={liquidityDistribution}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
                      <XAxis dataKey="range" stroke="#64748B" fontSize={10} />
                      <YAxis stroke="#64748B" fontSize={10} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#1E293B',
                          border: '1px solid #334155',
                          borderRadius: '8px',
                          fontSize: '11px'
                        }}
                        formatter={(value: number) => [`${value.toFixed(1)}%`, '占比']}
                      />
                      <Bar dataKey="percentage" fill="#06B6D4" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <h3 className="font-semibold text-text-primary mb-3">热门 SKU</h3>
                <div className="space-y-2">
                  {top5SKUs.map((sku, index) => (
                    <div key={sku.id} className="flex items-center justify-between p-2 bg-background rounded-lg">
                      <div className="flex items-center gap-2">
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                          index === 0 ? 'bg-accent-amber text-black' :
                          index === 1 ? 'bg-text-muted text-white' :
                          'bg-surface-hover text-text-muted'
                        }`}>
                          {index + 1}
                        </span>
                        <div>
                          <p className="text-sm text-text-primary truncate max-w-28">{sku.name}</p>
                          <p className="text-xs text-text-muted font-mono">{sku.id}</p>
                        </div>
                      </div>
                      <span className="text-sm font-mono text-primary">
                        {sku.liquidityScore.toFixed(0)}
                      </span>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="bg-surface rounded-xl border border-surface-border p-4">
            <h3 className="font-semibold text-text-primary mb-4">分类统计</h3>
            <div className="space-y-3">
              {categoryStats.slice(0, 6).map(stat => (
                <div key={stat.category}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-text-primary">{categoryNames[stat.category] || stat.category}</span>
                    <span className="text-text-muted font-mono">{stat.avgLiquidity.toFixed(1)}</span>
                  </div>
                  <div className="h-2 bg-surface-hover rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-primary to-primary-light rounded-full"
                      style={{ width: `${stat.avgLiquidity}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-text-muted mt-1">
                    <span>共 {stat.totalSKUs} 个</span>
                    <span>高 {stat.highCount} / 中 {stat.mediumCount} / 低 {stat.lowCount}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-surface rounded-xl border border-surface-border p-4">
            <h3 className="font-semibold text-text-primary mb-4">数据同步状态</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-background rounded-lg">
                <div className="flex items-center gap-3">
                  <Database className="w-5 h-5 text-primary" />
                  <div>
                    <p className="text-sm text-text-primary">IndexedDB</p>
                    <p className="text-xs text-text-muted">本地缓存</p>
                  </div>
                </div>
                <span className="flex items-center gap-1 text-xs text-accent-green">
                  <span className="w-2 h-2 rounded-full bg-accent-green animate-pulse" />
                  已同步
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-background rounded-lg">
                <div className="flex items-center gap-3">
                  <RefreshCw className="w-5 h-5 text-accent-amber" />
                  <div>
                    <p className="text-sm text-text-primary">流动性快照</p>
                    <p className="text-xs text-text-muted">每小时更新</p>
                  </div>
                </div>
                <span className="text-xs text-text-muted font-mono">
                  {formatDistanceToNow(Date.now() - 30 * 60 * 1000, { addSuffix: true, locale: zhCN })}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
