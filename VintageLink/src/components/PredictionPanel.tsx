import React, { useState, useMemo, useEffect } from 'react';
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
import type { WineLabel, WineBottle, MaturationModel, DrinkingWindow } from '@/types';

export const PredictionPanel: React.FC = () => {
  const { state, getLabelById, getZoneById, getReadingsByZone, getMaturationByWine, getWindowByWine } = useApp();
  const [selectedWineId, setSelectedWineId] = useState<string | null>(null);
  const [scenario, setScenario] = useState<'optimal' | 'conservative' | 'aggressive'>('optimal');
  const [isPredicting, setIsPredicting] = useState(false);
  const [potentialAnalysis, setPotentialAnalysis] = useState<{
    potentialScore: number;
    expectedPeakValue: number;
    valueProgression: { year: number; estimatedValue: number }[];
    recommendations: string[];
  } | null>(null);

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
        maturation: MaturationModel | undefined;
        window: DrinkingWindow | undefined;
      }[];
  }, [state.bottles, getLabelById, getZoneById, getMaturationByWine, getWindowByWine]);

  const selectedWine = useMemo(() => {
    if (!selectedWineId) return wineData[0] || null;
    return wineData.find(w => w.bottle.id === selectedWineId) || wineData[0] || null;
  }, [selectedWineId, wineData]);

  useEffect(() => {
    if (selectedWine && selectedWine.zone && selectedWine.maturation) {
      setIsPredicting(true);
      const readings = getReadingsByZone(selectedWine.zone.id);

      drinkingWindowPredictor.analyzeAgingPotential(
        selectedWine.label,
        selectedWine.maturation,
        readings,
        selectedWine.zone
      ).then(result => {
        setPotentialAnalysis(result);
        setIsPredicting(false);
      });
    }
  }, [selectedWine, getReadingsByZone, scenario]);

  const agingCurveData = useMemo(() => {
    if (!selectedWine) return [];
    const storageFactor = 0.85;
    const curve = drinkingWindowPredictor.getAgingCurveData(selectedWine.label, storageFactor);
    return curve.map(p => ({
      age: p.age,
      quality: p.quality,
      year: selectedWine.label.vintage + p.age,
    }));
  }, [selectedWine]);

  const upcomingWines = useMemo(() => {
    const now = Date.now();
    const oneYear = 31536000000;

    return wineData
      .filter(w => w.window)
      .map(w => {
        const window = w.window!;
        const startDiff = (window.windowStart - now) / oneYear;
        const peakDiff = (window.peakDate - now) / oneYear;
        const endDiff = (window.windowEnd - now) / oneYear;

        let status: 'upcoming' | 'now' | 'peak' | 'past';
        if (now < window.windowStart) status = 'upcoming';
        else if (now >= window.windowStart && now < window.peakDate) status = 'now';
        else if (now >= window.peakDate && now <= window.windowEnd) status = 'peak';
        else status = 'past';

        return { ...w, startDiff, peakDiff, endDiff, status };
      })
      .sort((a, b) => a.peakDiff - b.peakDiff)
      .slice(0, 10);
  }, [wineData]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'peak': return 'bg-green-100 text-green-800 border-green-200';
      case 'now': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'upcoming': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'past': return 'bg-gray-100 text-gray-600 border-gray-200';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'peak': return '巅峰期';
      case 'now': return '适饮中';
      case 'upcoming': return '即将适饮';
      case 'past': return '已过巅峰';
      default: return '未知';
    }
  };

  const formatYear = (timestamp: number) => new Date(timestamp).getFullYear();

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
        <h2 className="text-2xl font-serif font-bold text-wine-900">📈 适饮窗口预测与陈年潜效分析</h2>
        <div className="flex items-center space-x-4">
          <div className="flex space-x-2">
            {(['optimal', 'conservative', 'aggressive'] as const).map(s => (
              <button
                key={s}
                onClick={() => setScenario(s)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  scenario === s
                    ? 'bg-wine-600 text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {s === 'optimal' ? '最优场景' : s === 'conservative' ? '保守场景' : '激进场景'}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-6">
          <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-800">🍷 陈年品质曲线</h3>
              {selectedWine && (
                <select
                  value={selectedWine.bottle.id}
                  onChange={e => setSelectedWineId(e.target.value)}
                  className="px-3 py-1 border border-gray-300 rounded-lg text-sm"
                >
                  {wineData.slice(0, 20).map(w => (
                    <option key={w.bottle.id} value={w.bottle.id}>
                      {w.label.chateau} {w.label.vintage}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {selectedWine && (
              <>
                <div className="mb-4">
                  <h4 className="text-xl font-serif font-bold text-wine-900">
                    {selectedWine.label.chateau} {selectedWine.label.vintage}
                  </h4>
                  <p className="text-gray-600">{selectedWine.label.region} · {selectedWine.label.classification}</p>
                </div>

                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={agingCurveData}>
                      <defs>
                        <linearGradient id="qualityGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#b86244" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="#b86244" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis
                        dataKey="year"
                        stroke="#9ca3af"
                        fontSize={12}
                        label={{ value: '年份', position: 'insideBottomRight', offset: -5 }}
                      />
                      <YAxis
                        stroke="#9ca3af"
                        fontSize={12}
                        domain={[40, 100]}
                        label={{ value: '品质评分', angle: -90, position: 'insideLeft' }}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#ffffff',
                          border: '1px solid #e5e7eb',
                          borderRadius: '8px',
                          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                        }}
                        formatter={(value, name) => [
                          typeof value === 'number' ? value.toFixed(1) : String(value),
                          name === 'quality' ? '品质评分' : String(name)
                        ]}
                        labelFormatter={(label) => `${label}年`}
                      />
                      <Legend />
                      <Area
                        type="monotone"
                        dataKey="quality"
                        name="品质评分"
                        stroke="#b86244"
                        strokeWidth={2}
                        fill="url(#qualityGradient)"
                      />
                      {selectedWine.window && (
                        <>
                          <ReferenceLine
                            x={formatYear(selectedWine.window.windowStart)}
                            stroke="#3b82f6"
                            strokeDasharray="5 5"
                            label={{ value: '适饮期开始', fill: '#3b82f6', fontSize: 12 }}
                          />
                          <ReferenceLine
                            x={formatYear(selectedWine.window.peakDate)}
                            stroke="#22c55e"
                            strokeWidth={2}
                            label={{ value: '巅峰年份', fill: '#22c55e', fontSize: 12 }}
                          />
                          <ReferenceLine
                            x={formatYear(selectedWine.window.windowEnd)}
                            stroke="#ef4444"
                            strokeDasharray="5 5"
                            label={{ value: '适饮期结束', fill: '#ef4444', fontSize: 12 }}
                          />
                        </>
                      )}
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                <div className="mt-4 grid grid-cols-4 gap-4 text-sm">
                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <div className="text-gray-500 mb-1">适饮期开始</div>
                    <div className="text-xl font-bold text-blue-600">
                      {selectedWine.window ? formatYear(selectedWine.window.windowStart) : '--'}
                    </div>
                  </div>
                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <div className="text-gray-500 mb-1">巅峰年份</div>
                    <div className="text-xl font-bold text-green-600">
                      {selectedWine.window ? formatYear(selectedWine.window.peakDate) : '--'}
                    </div>
                  </div>
                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <div className="text-gray-500 mb-1">适饮期结束</div>
                    <div className="text-xl font-bold text-red-600">
                      {selectedWine.window ? formatYear(selectedWine.window.windowEnd) : '--'}
                    </div>
                  </div>
                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <div className="text-gray-500 mb-1">预测置信度</div>
                    <div className="text-xl font-bold text-wine-600">
                      {selectedWine.window ? `${(selectedWine.window.confidence * 100).toFixed(0)}%` : '--'}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          {selectedWine && (
            <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">💰 陈年价值分析</h3>

              {isPredicting ? (
                <div className="flex items-center justify-center h-40">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-wine-600" />
                </div>
              ) : potentialAnalysis ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="p-4 bg-gradient-to-br from-wine-50 to-white rounded-lg border border-wine-100">
                      <div className="text-sm text-gray-500 mb-1">陈年潜力评分</div>
                      <div className="text-3xl font-bold text-wine-600">
                        {potentialAnalysis.potentialScore.toFixed(1)}
                      </div>
                      <div className="w-full h-2 bg-gray-200 rounded-full mt-2 overflow-hidden">
                        <div
                          className={`h-full transition-all duration-500 ${
                            potentialAnalysis.potentialScore >= 80 ? 'bg-green-500' :
                            potentialAnalysis.potentialScore >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${potentialAnalysis.potentialScore}%` }}
                        />
                      </div>
                    </div>
                    <div className="p-4 bg-gradient-to-br from-amber-50 to-white rounded-lg border border-amber-100">
                      <div className="text-sm text-gray-500 mb-1">预期峰值价值</div>
                      <div className="text-3xl font-bold text-amber-600">
                        ¥{potentialAnalysis.expectedPeakValue.toLocaleString()}
                      </div>
                      <div className="text-xs text-gray-500 mt-2">
                        当前估值: ¥{(selectedWine.bottle.purchasePrice * selectedWine.bottle.quantity).toLocaleString()}
                      </div>
                    </div>
                  </div>

                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={potentialAnalysis.valueProgression}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis dataKey="year" stroke="#9ca3af" fontSize={12} />
                        <YAxis stroke="#9ca3af" fontSize={12} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#ffffff',
                            border: '1px solid #e5e7eb',
                            borderRadius: '8px',
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                          }}
                          formatter={(value) => [`¥${Number(value).toLocaleString()}`, '预估价值']}
                          labelFormatter={(label) => `${label}年`}
                        />
                        <Bar
                          dataKey="estimatedValue"
                          name="预估价值"
                          fill="#b86244"
                          radius={[4, 4, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="bg-wine-50 rounded-lg p-4 border border-wine-100">
                    <h4 className="text-sm font-medium text-wine-800 mb-2">🤖 AI 建议</h4>
                    <ul className="space-y-2">
                      {potentialAnalysis.recommendations.map((rec, i) => (
                        <li key={i} className="text-sm text-wine-700 flex items-start">
                          <span className="mr-2">•</span>
                          {rec}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
            <div className="p-4 bg-gradient-to-r from-wine-800 to-wine-700 text-white">
              <h3 className="text-lg font-semibold">📅 适饮时间表</h3>
            </div>
            <div className="max-h-[500px] overflow-y-auto">
              {upcomingWines.map((wine) => (
                <div
                  key={wine.bottle.id}
                  onClick={() => setSelectedWineId(wine.bottle.id)}
                  className={`p-4 border-b border-gray-100 cursor-pointer transition-colors hover:bg-wine-50 ${
                    selectedWineId === wine.bottle.id ? 'bg-wine-50' : ''
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="font-medium text-gray-900 text-sm">
                        {wine.label.chateau}
                      </div>
                      <div className="text-xs text-gray-500">
                        {wine.label.vintage} · {wine.label.region}
                      </div>
                    </div>
                    <span className={`px-2 py-1 text-xs rounded-full border ${getStatusColor(wine.status)}`}>
                      {getStatusText(wine.status)}
                    </span>
                  </div>

                  <div className="text-xs space-y-1">
                    <div className="flex justify-between">
                      <span className="text-gray-500">适饮期</span>
                      <span className="text-gray-700">
                        {formatYear(wine.window!.windowStart)} - {formatYear(wine.window!.windowEnd)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">巅峰</span>
                      <span className="text-wine-600 font-medium">
                        {formatYear(wine.window!.peakDate)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">置信度</span>
                      <span className="text-gray-700">
                        {(wine.window!.confidence * 100).toFixed(0)}%
                      </span>
                    </div>
                  </div>

                  <div className="mt-2 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                    {wine.status === 'upcoming' && (
                      <div
                        className="h-full bg-yellow-500"
                        style={{ width: `${Math.max(10, Math.min(100, 100 - wine.peakDiff * 10))}%` }}
                      />
                    )}
                    {wine.status === 'now' && (
                      <div
                        className="h-full bg-blue-500"
                        style={{ width: `${50 + (1 - wine.peakDiff / 2) * 50}%` }}
                      />
                    )}
                    {wine.status === 'peak' && (
                      <div className="h-full bg-green-500" style={{ width: '100%' }} />
                    )}
                    {wine.status === 'past' && (
                      <div className="h-full bg-gray-400" style={{ width: '100%' }} />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {selectedWine?.window && (
            <div className="bg-white rounded-xl shadow-md p-4 border border-gray-100">
              <h3 className="text-lg font-semibold text-gray-800 mb-3">🍽️ 品鉴建议</h3>
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <span className="text-2xl">⏱️</span>
                  <div>
                    <div className="text-sm text-gray-500">醒酒时间</div>
                    <div className="font-medium text-gray-800">
                      {selectedWine.window.decantingTime} 分钟
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <span className="text-2xl">🌡️</span>
                  <div>
                    <div className="text-sm text-gray-500">侍酒温度</div>
                    <div className="font-medium text-gray-800">
                      {selectedWine.window.servingTemperature.toFixed(1)}°C
                    </div>
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-500 mb-2">推荐搭配</div>
                  <div className="flex flex-wrap gap-2">
                    {selectedWine.window.foodPairings.map((food, i) => (
                      <span key={i} className="px-2 py-1 text-xs bg-wine-100 text-wine-700 rounded-full">
                        {food}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <p className="text-sm text-gray-600">
                    {selectedWine.window.drinkingRecommendation}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
