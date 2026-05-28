import React, { useState, useMemo } from 'react';
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import { useApp } from '@/context/AppContext';

export const AssetManagement: React.FC = () => {
  const { state, getLabelById, getZoneById, getMaturationByWine, getWindowByWine } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<string>('all');
  const [selectedWine, setSelectedWine] = useState<string | null>(null);

  const wineData = useMemo(() => {
    return state.bottles
      .map(bottle => {
        const label = getLabelById(bottle.labelId);
        const zone = getZoneById(bottle.location.zoneId);
        const maturation = getMaturationByWine(bottle.id);
        const window = getWindowByWine(bottle.id);
        return { bottle, label, zone, maturation, window };
      })
      .filter(w => w.label);
  }, [state.bottles, getLabelById, getZoneById, getMaturationByWine, getWindowByWine]);



  const filteredWines = useMemo(() => {
    return wineData.filter(wine => {
      const matchesSearch = wine.label?.chateau.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          wine.label?.region.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesFilter = selectedFilter === 'all' ||
        (selectedFilter === 'peak' && wine.window && Date.now() >= wine.window.peakDate && Date.now() <= wine.window.windowEnd) ||
        (selectedFilter === 'upcoming' && wine.window && Date.now() < wine.window.windowStart) ||
        (selectedFilter === 'past' && wine.window && Date.now() > wine.window.windowEnd);
      return matchesSearch && matchesFilter;
    });
  }, [wineData, searchQuery, selectedFilter]);

  const selectedWineData = useMemo(() => {
    if (!selectedWine) return null;
    return wineData.find(w => w.bottle.id === selectedWine);
  }, [selectedWine, wineData]);

  const maturationRadarData = useMemo(() => {
    if (!selectedWineData?.maturation) return [];
    const m = selectedWineData.maturation;
    return [
      { subject: '单宁', A: m.tanninLevel, fullMark: 100 },
      { subject: '酸度', A: m.acidityLevel, fullMark: 100 },
      { subject: '果香', A: m.fruitLevel, fullMark: 100 },
      { subject: '复杂度', A: m.complexityLevel, fullMark: 100 },
      { subject: '成熟度', A: m.maturityScore, fullMark: 100 },
    ];
  }, [selectedWineData]);

  const tooltipStyle = {
    backgroundColor: '#1f2937',
    border: '1px solid #374151',
    borderRadius: '8px',
    color: '#e5e7eb',
  };

  const getWindowStatus = (wine: any) => {
    if (!wine.window) return { text: '未计算', color: 'text-cellar-500' };
    const now = Date.now();
    if (now < wine.window.windowStart) return { text: '即将适饮', color: 'text-amber-400' };
    if (now >= wine.window.windowStart && now <= wine.window.peakDate) return { text: '适饮中', color: 'text-blue-400' };
    if (now >= wine.window.peakDate && now <= wine.window.windowEnd) return { text: '巅峰期', color: 'text-green-400' };
    return { text: '已过巅峰', color: 'text-cellar-400' };
  };

  const getGrapeText = (label: any) => {
    if (!label?.grapeVarieties) return '';
    return label.grapeVarieties.slice(0, 3).join(', ');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-serif font-bold text-wine-100">🍷 资产管理</h2>
        <div className="text-sm text-cellar-400">
          共 {state.bottles.length} 款藏酒
        </div>
      </div>

      <div className="flex gap-4 flex-wrap">
        <input
        type="text"
        placeholder="搜索酒庄、产区..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="bg-cellar-800 text-cellar-100 border border-cellar-700 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-wine-500 w-64"
      />
      <select
        value={selectedFilter}
        onChange={(e) => setSelectedFilter(e.target.value)}
        className="bg-cellar-800 text-cellar-200 border border-cellar-700 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-wine-500"
      >
        <option value="all">全部状态</option>
        <option value="peak">巅峰期</option>
        <option value="upcoming">即将适饮</option>
        <option value="past">已过巅峰</option>
      </select>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2">
          <div className="bg-cellar-800 rounded-xl shadow-md p-4 border border-cellar-700">
            <div className="grid grid-cols-4 gap-3 max-h-[600px] overflow-y-auto">
              {filteredWines.map((wine) => (
                <div
                  key={wine.bottle.id}
                  onClick={() => setSelectedWine(wine.bottle.id)}
                  className={`p-4 rounded-lg cursor-pointer transition-all ${
                    selectedWine === wine.bottle.id
                      ? 'bg-wine-700/50 border-2 border-wine-500'
                      : 'bg-cellar-900 hover:bg-cellar-800 border border-cellar-700'
                  }`}
                >
                  <div className="font-medium text-cellar-100 text-sm truncate">
                    {wine.label?.chateau}
                  </div>
                  <div className="text-xs text-cellar-500">
                    {wine.label?.vintage} · {wine.label?.region}
                  </div>
                  <div className="mt-2">
                    <span className={`text-xs ${getWindowStatus(wine).color}`}>
                      {getWindowStatus(wine).text}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {selectedWineData ? (
            <>
              <div className="bg-cellar-800 rounded-xl shadow-md p-6 border border-cellar-700">
                <h3 className="text-lg font-semibold text-cellar-100 mb-4">
                {selectedWineData.label?.chateau}
              </h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-cellar-500">年份</span>
                    <span className="text-cellar-200">{selectedWineData.label?.vintage}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-cellar-500">产区</span>
                    <span className="text-cellar-200">{selectedWineData.label?.region}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-cellar-500">葡萄品种</span>
                    <span className="text-cellar-200">{getGrapeText(selectedWineData.label)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-cellar-500">储存位置</span>
                    <span className="text-cellar-200">{selectedWineData.zone?.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-cellar-500">数量</span>
                    <span className="text-cellar-200">{selectedWineData.bottle.quantity} 瓶</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-cellar-500">购入价</span>
                    <span className="text-cellar-200">¥{selectedWineData.bottle.purchasePrice.toLocaleString()}</span>
                  </div>
                </div>

                {selectedWineData.label?.tastingNotes && (
                  <div className="mt-4 pt-4 border-t border-cellar-700">
                    <div className="text-xs text-cellar-500 mb-1">品鉴笔记</div>
                    <p className="text-sm text-cellar-300">{selectedWineData.label.tastingNotes}</p>
                  </div>
                )}
              </div>

              {selectedWineData.maturation && (
                <div className="bg-cellar-800 rounded-xl shadow-md p-6 border border-cellar-700">
                  <h4 className="text-sm font-semibold text-cellar-100 mb-4">熟化状态</h4>
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart data={maturationRadarData}>
                        <PolarGrid stroke="#374151" />
                        <PolarAngleAxis dataKey="subject" stroke="#9ca3af" fontSize={11} />
                        <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="#9ca3af" fontSize={10} />
                        <Radar name="评分" dataKey="A" stroke="#b86244" fill="#b86244" fillOpacity={0.5} />
                        <Tooltip contentStyle={tooltipStyle} />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mt-4 text-xs">
                    <div className="flex justify-between">
                      <span className="text-cellar-500">成熟度</span>
                      <span className="text-cellar-200">{selectedWineData.maturation.maturityScore.toFixed(0)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-cellar-500">当前年龄</span>
                      <span className="text-cellar-200">{selectedWineData.maturation.currentAge.toFixed(1)}年</span>
                    </div>
                  </div>
                </div>
              )}

              {selectedWineData.window && (
                <div className="bg-cellar-800 rounded-xl shadow-md p-6 border border-cellar-700">
                  <h4 className="text-sm font-semibold text-cellar-100 mb-3">适饮窗口</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-cellar-500">适饮开始</span>
                      <span className="text-cellar-200">
                        {new Date(selectedWineData.window.windowStart).toLocaleDateString('zh-CN')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-cellar-500">巅峰年份</span>
                      <span className="text-green-400">
                        {new Date(selectedWineData.window.peakDate).getFullYear()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-cellar-500">适饮结束</span>
                      <span className="text-cellar-200">
                        {new Date(selectedWineData.window.windowEnd).toLocaleDateString('zh-CN')}</span>
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-cellar-700">
                    <div className="text-xs text-cellar-500 mb-1">推荐</div>
                    <p className="text-sm text-cellar-300">{selectedWineData.window.drinkingRecommendation}</p>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="bg-cellar-800 rounded-xl shadow-md p-12 border border-cellar-700 text-center">
              <div className="text-4xl mb-4">🍷</div>
              <p className="text-cellar-500">选择一款酒查看详情</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
