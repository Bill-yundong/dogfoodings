'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { predictThermalDrift } from '@/lib/thermal-calculations';
import type { ThermalDriftResponse } from '@/types';
import { TrendingDown, AlertTriangle, TrendingUp } from 'lucide-react';

export default function ThermalDriftPredictor() {
  const [years, setYears] = useState(10);
  const [scenario, setScenario] = useState<'conservative' | 'moderate' | 'aggressive'>('moderate');
  const [result, setResult] = useState<ThermalDriftResponse | null>(null);
  const [isPredicting, setIsPredicting] = useState(false);

  const handlePredict = async () => {
    setIsPredicting(true);
    await new Promise((resolve) => setTimeout(resolve, 1500));

    const response = predictThermalDrift({
      boreholeIds: ['demo1', 'demo2'],
      predictionYears: years,
      scenario,
    });

    setResult(response);
    setIsPredicting(false);
  };

  const riskColors = {
    low: 'text-green-500',
    medium: 'text-yellow-500',
    high: 'text-red-500',
  };

  const chartData = result?.results.map((r) => ({
    year: `第${r.year}年`,
    temperature: r.groundTemperature,
    saturation: r.thermalSaturation,
  })) || [];

  return (
    <div className="space-y-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gray-800/50 rounded-xl border border-gray-700/50 p-6"
      >
        <h3 className="text-lg font-semibold text-white mb-6">预测参数</h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">预测年限</label>
            <div className="flex items-center gap-4">
              <input
                type="range"
                min="5"
                max="30"
                value={years}
                onChange={(e) => setYears(parseInt(e.target.value))}
                className="flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-primary-500"
              />
              <span className="text-xl font-bold text-white w-12 text-right">{years}</span>
            </div>
            <p className="text-xs text-gray-500 mt-1">5 - 30 年</p>
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-300 mb-2">预测场景</label>
            <div className="flex gap-4">
              {[
                { value: 'conservative', label: '保守', desc: '低负荷运行' },
                { value: 'moderate', label: '中等', desc: '正常负荷' },
                { value: 'aggressive', label: '激进', desc: '高负荷运行' },
              ].map((s) => (
                <button
                  key={s.value}
                  onClick={() => setScenario(s.value as typeof scenario)}
                  className={`flex-1 py-3 px-4 rounded-lg border transition-all ${
                    scenario === s.value
                      ? 'bg-primary-600 border-primary-500 text-white'
                      : 'bg-gray-900/50 border-gray-700 text-gray-400 hover:border-gray-600'
                  }`}
                >
                  <p className="font-medium">{s.label}</p>
                  <p className="text-xs opacity-70">{s.desc}</p>
                </button>
              ))}
            </div>
          </div>
        </div>

        <button
          onClick={handlePredict}
          disabled={isPredicting}
          className="mt-6 px-8 py-3 bg-primary-600 hover:bg-primary-700 disabled:bg-gray-700 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
        >
          {isPredicting ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <TrendingDown className="w-5 h-5" />
          )}
          {isPredicting ? '预测中...' : '开始预测'}
        </button>
      </motion.div>

      {result && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-gray-800/50 rounded-xl border border-gray-700/50 p-6">
              <h3 className="text-lg font-semibold text-white mb-4">地温预测趋势</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="year" stroke="#9CA3AF" fontSize={12} />
                    <YAxis stroke="#9CA3AF" fontSize={12} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1F2937',
                        border: '1px solid #374151',
                        borderRadius: '8px',
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="temperature"
                      stroke="#F97316"
                      fill="url(#colorTemp)"
                      fillOpacity={0.3}
                      name="地温 (°C)"
                    />
                    <defs>
                      <linearGradient id="colorTemp" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#F97316" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#F97316" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-gray-800/50 rounded-xl border border-gray-700/50 p-6">
              <h3 className="text-lg font-semibold text-white mb-4">热饱和度预测</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="year" stroke="#9CA3AF" fontSize={12} />
                    <YAxis stroke="#9CA3AF" fontSize={12} domain={[0, 100]} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1F2937',
                        border: '1px solid #374151',
                        borderRadius: '8px',
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="saturation"
                      stroke="#14B8A6"
                      strokeWidth={2}
                      name="热饱和度 (%)"
                      dot={{ fill: '#14B8A6' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="bg-gray-800/50 rounded-xl border border-gray-700/50 p-6">
            <h3 className="text-lg font-semibold text-white mb-4">预测详情</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-sm text-gray-400 border-b border-gray-700">
                    <th className="pb-3">年份</th>
                    <th className="pb-3">预测地温</th>
                    <th className="pb-3">热饱和度</th>
                    <th className="pb-3">透支风险</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700/50">
                  {result.results.map((r, idx) => (
                    <motion.tr
                      key={r.year}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: idx * 0.05 }}
                      className="text-sm"
                    >
                      <td className="py-3 text-white">第 {r.year} 年</td>
                      <td className="py-3 text-accent-500">{r.groundTemperature.toFixed(2)}°C</td>
                      <td className="py-3 text-primary-500">{r.thermalSaturation.toFixed(1)}%</td>
                      <td className={`py-3 ${riskColors[r.overdrawRisk]} flex items-center gap-1`}>
                        {r.overdrawRisk === 'high' && <AlertTriangle className="w-4 h-4" />}
                        {r.overdrawRisk === 'medium' && <TrendingUp className="w-4 h-4" />}
                        {r.overdrawRisk === 'low' && <TrendingDown className="w-4 h-4" />}
                        {r.overdrawRisk === 'low' ? '低' : r.overdrawRisk === 'medium' ? '中' : '高'}
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-gray-800/50 rounded-xl border border-gray-700/50 p-6">
            <h3 className="text-lg font-semibold text-white mb-4">模型参数</h3>
            <div className="grid grid-cols-3 gap-6">
              <div className="bg-gray-900/50 rounded-lg p-4">
                <p className="text-sm text-gray-400">热扩散率</p>
                <p className="text-2xl font-bold text-white">{result.modelParameters.thermalDiffusivity.toFixed(3)}</p>
                <p className="text-xs text-gray-500">m²/s</p>
              </div>
              <div className="bg-gray-900/50 rounded-lg p-4">
                <p className="text-sm text-gray-400">地热梯度</p>
                <p className="text-2xl font-bold text-white">{result.modelParameters.geothermalGradient.toFixed(3)}</p>
                <p className="text-xs text-gray-500">°C/m</p>
              </div>
              <div className="bg-gray-900/50 rounded-lg p-4">
                <p className="text-sm text-gray-400">热泵系数</p>
                <p className="text-2xl font-bold text-white">{result.modelParameters.heatPumpCoefficient.toFixed(2)}</p>
                <p className="text-xs text-gray-500">COP</p>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
