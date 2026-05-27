import React, { useState, useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import type { WineLabel, WineBottle } from '@/types';

export const AssetManagement: React.FC = () => {
  const { state, getLabelById, getZoneById, getMaturationByWine, getWindowByWine } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'region' | 'vintage' | 'classification'>('all');
  const [selectedBottleId, setSelectedBottleId] = useState<string | null>(null);

  const wineData = useMemo(() => {
    return state.bottles
      .map(bottle => {
        const label = getLabelById(bottle.labelId);
        const zone = getZoneById(bottle.location.zoneId);
        const maturation = getMaturationByWine(bottle.id);
        const window = getWindowByWine(bottle.id);
        return label ? { bottle, label, zone, maturation, window } : null;
      })
      .filter(Boolean) as {
        bottle: WineBottle;
        label: WineLabel;
        zone: ReturnType<typeof getZoneById>;
        maturation: ReturnType<typeof getMaturationByWine>;
        window: ReturnType<typeof getWindowByWine>;
      }[];
  }, [state.bottles, getLabelById, getZoneById, getMaturationByWine, getWindowByWine]);

  const filteredWines = useMemo(() => {
    if (!searchQuery) return wineData;
    const query = searchQuery.toLowerCase();
    return wineData.filter(
      w =>
        w.label.chateau.toLowerCase().includes(query) ||
        w.label.region.toLowerCase().includes(query) ||
        w.label.vintage.toString().includes(query) ||
        w.label.classification.toLowerCase().includes(query)
    );
  }, [wineData, searchQuery]);

  const regions = useMemo(() => [...new Set(wineData.map(w => w.label.region))], [wineData]);
  const vintages = useMemo(() => [...new Set(wineData.map(w => w.label.vintage))].sort((a, b) => b - a), [wineData]);

  const stats = useMemo(() => {
    const totalBottles = wineData.reduce((sum, w) => sum + w.bottle.quantity, 0);
    const totalValue = wineData.reduce((sum, w) => sum + w.bottle.purchasePrice * w.bottle.quantity, 0);
    const avgMaturity = wineData.length > 0
      ? wineData.reduce((sum, w) => sum + (w.maturation?.maturityScore || 0), 0) / wineData.length
      : 0;
    const countries = [...new Set(wineData.map(w => w.label.country))].length;

    return { totalBottles, totalValue, avgMaturity, countries };
  }, [wineData]);

  const getConditionColor = (condition: string) => {
    switch (condition) {
      case 'excellent': return 'bg-green-100 text-green-800';
      case 'good': return 'bg-blue-100 text-blue-800';
      case 'fair': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-red-100 text-red-800';
    }
  };

  const getConditionText = (condition: string) => {
    switch (condition) {
      case 'excellent': return '完美';
      case 'good': return '良好';
      case 'fair': return '一般';
      default: return '较差';
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('zh-CN');
  };

  const selectedWine = useMemo(() => {
    if (!selectedBottleId) return null;
    return wineData.find(w => w.bottle.id === selectedBottleId);
  }, [selectedBottleId, wineData]);

  if (state.isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-wine-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-serif font-bold text-wine-900">🍷 资产管理中心</h2>
        <div className="flex items-center space-x-4">
          <div className="relative">
            <input
              type="text"
              placeholder="搜索酒庄、年份、产区..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-80 px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-wine-500 focus:border-transparent"
            />
            <span className="absolute left-3 top-2.5 text-gray-400">🔍</span>
          </div>
          <select
            value={selectedFilter}
            onChange={e => setSelectedFilter(e.target.value as typeof selectedFilter)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-wine-500 focus:border-transparent"
          >
            <option value="all">全部</option>
            <option value="region">按产区</option>
            <option value="vintage">按年份</option>
            <option value="classification">按等级</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
          <div className="text-sm text-gray-500 mb-1">总瓶数</div>
          <div className="text-3xl font-bold text-wine-600">{stats.totalBottles}</div>
          <div className="text-xs text-gray-400 mt-1">共 {wineData.length} 款藏酒</div>
        </div>
        <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
          <div className="text-sm text-gray-500 mb-1">总估值</div>
          <div className="text-3xl font-bold text-wine-600">¥{stats.totalValue.toLocaleString()}</div>
          <div className="text-xs text-gray-400 mt-1">平均 ¥{(stats.totalValue / stats.totalBottles).toLocaleString()}/瓶</div>
        </div>
        <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
          <div className="text-sm text-gray-500 mb-1">平均成熟度</div>
          <div className="text-3xl font-bold text-wine-600">{stats.avgMaturity.toFixed(1)}</div>
          <div className="text-xs text-gray-400 mt-1">满分 100 分</div>
        </div>
        <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
          <div className="text-sm text-gray-500 mb-1">来源国家</div>
          <div className="text-3xl font-bold text-wine-600">{stats.countries}</div>
          <div className="text-xs text-gray-400 mt-1">覆盖 {regions.length} 个产区</div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
          <div className="p-4 border-b border-gray-100 bg-gray-50">
            <h3 className="text-lg font-semibold text-gray-800">📋 藏酒清单</h3>
          </div>
          <div className="max-h-[600px] overflow-y-auto">
            <table className="w-full">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">酒庄</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">年份</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">产区</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">数量</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">品相</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">区域</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredWines.map((wine) => (
                  <tr
                    key={wine.bottle.id}
                    onClick={() => setSelectedBottleId(wine.bottle.id)}
                    className={`cursor-pointer transition-colors hover:bg-wine-50 ${
                      selectedBottleId === wine.bottle.id ? 'bg-wine-50' : ''
                    }`}
                  >
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{wine.label.chateau}</div>
                      <div className="text-xs text-gray-500">{wine.label.grapeVarieties.join(', ')}</div>
                    </td>
                    <td className="px-4 py-3 text-gray-700">{wine.label.vintage}</td>
                    <td className="px-4 py-3 text-gray-700">{wine.label.region}</td>
                    <td className="px-4 py-3 text-gray-700">{wine.bottle.quantity} 瓶</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 text-xs rounded-full ${getConditionColor(wine.bottle.condition)}`}>
                        {getConditionText(wine.bottle.condition)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-700">{wine.zone?.name}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-4">
          {selectedWine ? (
            <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
              <div className="p-4 bg-gradient-to-r from-wine-800 to-wine-700 text-white">
                <h3 className="text-lg font-semibold">🍾 酒标详情</h3>
              </div>
              <div className="p-4 space-y-4">
                {selectedWine.label.imageUrl && (
                  <div className="aspect-square rounded-lg overflow-hidden bg-gray-100">
                    <img
                      src={selectedWine.label.imageUrl}
                      alt={selectedWine.label.chateau}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  </div>
                )}

                <div>
                  <h4 className="text-xl font-serif font-bold text-wine-900">{selectedWine.label.chateau}</h4>
                  <p className="text-wine-600">{selectedWine.label.vintage} · {selectedWine.label.classification}</p>
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-gray-500">产区：</span>
                    <span className="text-gray-800">{selectedWine.label.region}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">国家：</span>
                    <span className="text-gray-800">{selectedWine.label.country}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">酒精度：</span>
                    <span className="text-gray-800">{selectedWine.label.alcoholContent}%</span>
                  </div>
                  <div>
                    <span className="text-gray-500">容量：</span>
                    <span className="text-gray-800">{selectedWine.label.bottleSize}ml</span>
                  </div>
                </div>

                <div>
                  <h5 className="text-sm font-medium text-gray-700 mb-2">葡萄品种</h5>
                  <div className="flex flex-wrap gap-2">
                    {selectedWine.label.grapeVarieties.map((grape, i) => (
                      <span key={i} className="px-2 py-1 text-xs bg-wine-100 text-wine-700 rounded-full">
                        {grape}
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <h5 className="text-sm font-medium text-gray-700 mb-2">品鉴笔记</h5>
                  <div className="flex flex-wrap gap-2">
                    {selectedWine.label.tastingNotes.map((note, i) => (
                      <span key={i} className="px-2 py-1 text-xs bg-amber-100 text-amber-700 rounded-full">
                        {note}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="border-t border-gray-200 pt-4">
                  <h5 className="text-sm font-medium text-gray-700 mb-2">库存信息</h5>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-gray-500">数量：</span>
                      <span className="text-gray-800 font-medium">{selectedWine.bottle.quantity} 瓶</span>
                    </div>
                    <div>
                      <span className="text-gray-500">单价：</span>
                      <span className="text-gray-800 font-medium">¥{selectedWine.bottle.purchasePrice.toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">入库时间：</span>
                      <span className="text-gray-800">{formatDate(selectedWine.bottle.storageStartDate)}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">存放位置：</span>
                      <span className="text-gray-800">{selectedWine.bottle.location.position}</span>
                    </div>
                  </div>
                </div>

                {selectedWine.maturation && (
                  <div className="border-t border-gray-200 pt-4">
                    <h5 className="text-sm font-medium text-gray-700 mb-2">熟化状态</h5>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">成熟度评分</span>
                        <span className="font-medium text-wine-600">{selectedWine.maturation.maturityScore.toFixed(1)}</span>
                      </div>
                      <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-wine-500 transition-all"
                          style={{ width: `${selectedWine.maturation.maturityScore}%` }}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="flex justify-between">
                          <span className="text-gray-500">单宁</span>
                          <span>{selectedWine.maturation.tanninLevel.toFixed(0)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">酸度</span>
                          <span>{selectedWine.maturation.acidityLevel.toFixed(0)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">果香</span>
                          <span>{selectedWine.maturation.fruitLevel.toFixed(0)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">复杂度</span>
                          <span>{selectedWine.maturation.complexityLevel.toFixed(0)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {selectedWine.window && (
                  <div className="border-t border-gray-200 pt-4">
                    <h5 className="text-sm font-medium text-gray-700 mb-2">适饮建议</h5>
                    <p className="text-sm text-gray-600 mb-3">{selectedWine.window.drinkingRecommendation}</p>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-500">最佳饮用期</span>
                        <span className="text-gray-800">
                          {new Date(selectedWine.window.windowStart).getFullYear()} - {new Date(selectedWine.window.windowEnd).getFullYear()}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">巅峰年份</span>
                        <span className="text-wine-600 font-medium">{new Date(selectedWine.window.peakDate).getFullYear()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">建议醒酒</span>
                        <span className="text-gray-800">{selectedWine.window.decantingTime} 分钟</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">侍酒温度</span>
                        <span className="text-gray-800">{selectedWine.window.servingTemperature.toFixed(1)}°C</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-md border border-gray-100 p-8 text-center">
              <div className="text-4xl mb-4">🍷</div>
              <p className="text-gray-500">点击左侧列表查看酒标详情</p>
            </div>
          )}

          <div className="bg-white rounded-xl shadow-md border border-gray-100 p-4">
            <h3 className="text-lg font-semibold text-gray-800 mb-3">🏷️ 快速筛选</h3>
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-medium text-gray-600 mb-2">热门产区</h4>
                <div className="flex flex-wrap gap-2">
                  {regions.slice(0, 6).map(region => (
                    <button
                      key={region}
                      onClick={() => setSearchQuery(region)}
                      className="px-3 py-1 text-xs bg-gray-100 hover:bg-wine-100 hover:text-wine-700 rounded-full transition-colors"
                    >
                      {region}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-600 mb-2">经典年份</h4>
                <div className="flex flex-wrap gap-2">
                  {vintages.slice(0, 8).map(vintage => (
                    <button
                      key={vintage}
                      onClick={() => setSearchQuery(vintage.toString())}
                      className="px-3 py-1 text-xs bg-gray-100 hover:bg-wine-100 hover:text-wine-700 rounded-full transition-colors"
                    >
                      {vintage}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
