import React, { useState, useMemo } from 'react';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart,
  BarChart,
  Bar,
  ReferenceLine,
} from 'recharts';
import { useApp } from '@/context/AppContext';
import { drinkingWindowPredictor } from '@/models/DrinkingWindowPredictor';

export const PredictionPanel: React.FC = () => {
  const { state, getLabelById, getWindowByWine } = useApp();
  const [selectedWineId, setSelectedWineId] = useState<string | null>(null);

  const winePredictions = useMemo(() => {
    return state.bottles
      .map(bottle => {
        const label = getLabelById(bottle.labelId);
        const window = getWindowByWine(bottle.id);
        return { bottle, label, window };
      })
      .filter(w => w.label && w.window);
  }, [state.bottles, getLabelById, getWindowByWine]);

  const selectedWine = useMemo(() => {
    if (!selectedWineId) return null;
    return winePredictions.find(w => w.bottle.id === selectedWineId) || null;
  }, [selectedWineId, winePredictions]);

  const agingCurveData = useMemo(() => {
    if (!selectedWine?.label) return [];
    return drinkingWindowPredictor.getAgingCurveData(selectedWine.label, 80);
  }, [selectedWine]);

  const valueProgression = useMemo(() => {
    if (!selectedWine?.label) return [];
    const vintage = selectedWine.label.vintage;
    const currentYear = new Date().getFullYear();
    const peakYear = vintage + Math.floor((selectedWine.label.agingPotential.peakStart + selectedWine.label.agingPotential.peakEnd) / 2);
    
    return Array.from({ length: 20 }, (_, i) => {
      const year = vintage + i;
      const yearsFromPeak = year - peakYear;
      const valueMultiplier = Math.exp(-Math.pow(yearsFromPeak / 8, 2) / 2) * 0.8 + 0.2;
      return {
        year,
        estimatedValue: Math.round(selectedWine.bottle?.purchasePrice || 1000 * valueMultiplier)
      };
    }).filter(d => d.year <= currentYear + 10);
  }, [selectedWine]);

  const categorizeWines = useMemo(() => {
    const now = Date.now();
    const upcoming = winePredictions.filter(w => w.window && now < w.window.windowStart);
    const drinking = winePredictions.filter(w => w.window && now >= w.window.windowStart && now < w.window.peakDate);
    const peak = winePredictions.filter(w => w.window && now >= w.window.peakDate && now <= w.window.windowEnd);
    const past = winePredictions.filter(w => w.window && now > w.window.windowEnd);
    return { upcoming, drinking, peak, past };
  }, [winePredictions]);

  const formatYear = (ts: number) => {
    return new Date(ts).getFullYear();
  };

  const tooltipStyle = {
    backgroundColor: '#1f2937',
    border: '1px solid #374151',
    borderRadius: '8px',
    color: '#e5e7eb',
  };

  const getTastingAdvice = (wine: any) => {
    if (!wine?.window) return null;
    return {
      decantTime: Math.round(wine.label?.agingPotential?.minYears || 5) * 10 + ' 分钟',
      servingTemp: '16-18°C',
      pairing: ['牛排', '奶酪', '松露'].join(' / '),
    };
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-serif font-bold text-wine-100">📈 适饮预测</h2>
        <div className="text-sm text-cellar-400">
          基于陈年曲线分析
        </div>
      </div>

      <div className="grid grid-cols-4 gap-3">
        <div className="bg-cellar-800 rounded-xl p-4 border border-cellar-700 text-center">
          <div className="text-3xl font-bold text-amber-400">{categorizeWines.upcoming.length}</div>
          <div className="text-xs text-cellar-400 mt-1">即将适饮</div>
        </div>
        <div className="bg-cellar-800 rounded-xl p-4 border border-cellar-700 text-center">
          <div className="text-3xl font-bold text-blue-400">{categorizeWines.drinking.length}</div>
          <div className="text-xs text-cellar-400 mt-1">适饮中</div>
        </div>
        <div className="bg-cellar-800 rounded-xl p-4 border border-cellar-700 text-center">
          <div className="text-3xl font-bold text-green-400">{categorizeWines.peak.length}</div>
          <div className="text-xs text-cellar-400 mt-1">巅峰期</div>
        </div>
        <div className="bg-cellar-800 rounded-xl p-4 border border-cellar-700 text-center">
          <div className="text-3xl font-bold text-cellar-500">{categorizeWines.past.length}</div>
          <div className="text-xs text-cellar-400 mt-1">已过巅峰</div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-6">
          <div className="bg-cellar-800 rounded-xl shadow-md p-6 border border-cellar-700">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-cellar-100">陈年品质曲线</h3>
              <select
                value={selectedWineId || ''}
                onChange={(e) => setSelectedWineId(e.target.value || null)}
                className="bg-cellar-900 text-cellar-200 border border-cellar-600 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-wine-500"
              >
                <option value="">选择酒款...</option>
                {winePredictions.slice(0, 20).map(w => (
                  <option key={w.bottle.id} value={w.bottle.id}>
                    {w.label?.chateau} ({w.label?.vintage})
                  </option>
                ))}
              </select>
            </div>

            {selectedWine ? (
              <div className="space-y-4">
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={agingCurveData}>
                      <defs>
                        <linearGradient id="qualityGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#b86244" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#b86244" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis dataKey="age" stroke="#9ca3af" fontSize={11} label={{ value: '陈年年份', position: 'insideBottom', offset: -5, fill: '#9ca3af', fontSize: 12 }} />
                      <YAxis stroke="#9ca3af" fontSize={11} domain={[0, 100]} />
                      <Tooltip
                        contentStyle={tooltipStyle}
                        formatter={(value) => [typeof value === 'number' ? value.toFixed(1) : String(value), '品质评分']}
                        labelFormatter={(label) => `${label}年陈`}
                      />
                      <Legend wrapperStyle={{ color: '#9ca3af' }} />
                      <Area
                        type="monotone"
                        dataKey="quality"
                        name="品质评分"
                        stroke="#b86244"
                        strokeWidth={2}
                        fill="url(#qualityGradient)"
                      />
                      {selectedWine.window && selectedWine.label && (
                        <>
                          <ReferenceLine
                            x={Math.max(0, Math.round((selectedWine.window.windowStart - selectedWine.label.vintage * 31536000000) / 31536000000))}
                            stroke="#3b82f6"
                            strokeDasharray="5 5"
                          />
                          <ReferenceLine
                            x={Math.max(0, Math.round((selectedWine.window.peakDate - selectedWine.label.vintage * 31536000000) / 31536000000))}
                            stroke="#22c55e"
                            strokeWidth={2}
                          />
                          <ReferenceLine
                            x={Math.max(0, Math.round((selectedWine.window.windowEnd - selectedWine.label.vintage * 31536000000) / 31536000000))}
                            stroke="#ef4444"
                            strokeDasharray="5 5"
                          />
                        </>
                      )}
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex gap-4 text-xs justify-center">
                  <span className="flex items-center gap-1 text-cellar-300">
                    <span className="w-3 h-0.5 bg-blue-500"></span> 适饮期开始
                  </span>
                  <span className="flex items-center gap-1 text-cellar-300">
                    <span className="w-3 h-0.5 bg-green-500"></span> 巅峰期
                  </span>
                  <span className="flex items-center gap-1 text-cellar-300">
                    <span className="w-3 h-0.5 bg-red-500"></span> 适饮期结束
                  </span>
                </div>
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center text-cellar-500">
                选择一款酒查看陈年曲线
              </div>
            )}
          </div>

          {selectedWine && valueProgression.length > 0 && (
            <div className="bg-cellar-800 rounded-xl shadow-md p-6 border border-cellar-700">
              <h3 className="text-lg font-semibold text-cellar-100 mb-4">陈年价值分析</h3>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={valueProgression}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="year" stroke="#9ca3af" fontSize={11} />
                    <YAxis stroke="#9ca3af" fontSize={11} />
                    <Tooltip
                      contentStyle={tooltipStyle}
                      formatter={(value) => [`¥${Number(value).toLocaleString()}`, '预估价值']}
                    />
                    <Bar dataKey="estimatedValue" name="预估价值" fill="#22c55e" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {selectedWine && getTastingAdvice(selectedWine) && (
            <div className="bg-cellar-800 rounded-xl shadow-md p-6 border border-cellar-700">
              <h3 className="text-lg font-semibold text-cellar-100 mb-4">品鉴建议</h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-cellar-900 p-4 rounded-lg text-center">
                  <div className="text-2xl mb-2">⏱️</div>
                  <div className="text-sm text-cellar-500 mb-1">醒酒时间</div>
                  <div className="text-lg font-semibold text-cellar-200">
                    {getTastingAdvice(selectedWine)?.decantTime}
                  </div>
                </div>
                <div className="bg-cellar-900 p-4 rounded-lg text-center">
                  <div className="text-2xl mb-2">🌡️</div>
                  <div className="text-sm text-cellar-500 mb-1">侍酒温度</div>
                  <div className="text-lg font-semibold text-cellar-200">
                    {getTastingAdvice(selectedWine)?.servingTemp}
                  </div>
                </div>
                <div className="bg-cellar-900 p-4 rounded-lg text-center">
                  <div className="text-2xl mb-2">🍽️</div>
                  <div className="text-sm text-cellar-500 mb-1">搭配建议</div>
                  <div className="text-sm font-semibold text-cellar-200">
                    {getTastingAdvice(selectedWine)?.pairing}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="bg-cellar-800 rounded-xl shadow-md p-4 border border-cellar-700">
            <h3 className="text-sm font-semibold text-cellar-100 mb-3">即将适饮酒款</h3>
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {categorizeWines.upcoming.length > 0 ? (
                categorizeWines.upcoming.slice(0, 10).map((wine) => (
                  <div
                    key={wine.bottle.id}
                    onClick={() => setSelectedWineId(wine.bottle.id)}
                    className={`p-3 rounded-lg cursor-pointer transition-all text-sm ${
                      selectedWineId === wine.bottle.id
                        ? 'bg-wine-700/50 border border-wine-500'
                        : 'bg-cellar-900 hover:bg-cellar-800 border border-cellar-700'
                    }`}
                  >
                    <div className="font-medium text-cellar-100 truncate">
                      {wine.label?.chateau}
                    </div>
                    <div className="text-xs text-cellar-500">
                      {wine.label?.vintage} · {formatYear(wine.window?.windowStart || 0)}年可饮
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-4 text-cellar-500 text-sm">
                  暂无即将适饮的酒款
                </div>
              )}
            </div>
          </div>

          <div className="bg-gradient-to-br from-wine-900/30 to-cellar-800 rounded-xl shadow-md p-4 border border-wine-800/30">
            <h3 className="text-sm font-semibold text-wine-200 mb-2">💡 预测说明</h3>
            <div className="text-xs text-cellar-300 space-y-2">
              <p>基于高斯分布模型预测每款酒的陈年品质变化：</p>
              <p>• 考虑葡萄品种、年份、产区特征</p>
              <p>• 结合储存环境因子进行动态调整</p>
              <p>• 定期重新计算以提高预测精度</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
