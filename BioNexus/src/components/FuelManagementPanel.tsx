import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, BarChart, Bar, PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { Droplets, Flame, Leaf, Thermometer, Zap, Database, RefreshCw } from 'lucide-react';
import { BiomassComposition, FeedingOptimization, CombustionParams } from '../types';
import { semanticAlignmentService } from '../services/semanticAlignment';
import { calorificFitting } from '../services/calorificFitting';
import { snapshotStore } from '../services/snapshotStore';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

const BiomassSources = ['木屑', '秸秆', '稻壳', '棕榈壳', '竹屑'];

export const FuelManagementPanel: React.FC = () => {
  const [currentComposition, setCurrentComposition] = useState<BiomassComposition | null>(null);
  const [feedingOptimization, setFeedingOptimization] = useState<FeedingOptimization | null>(null);
  const [combustionParams, setCombustionParams] = useState<CombustionParams>({
    boilerLoad: 75,
    oxygenLevel: 6.5,
    temperature: 850,
    steamPressure: 3.8,
    efficiency: 88.5
  });
  const [snapshotCount, setSnapshotCount] = useState(0);
  const [sourceStats, setSourceStats] = useState<any[]>([]);
  const [isFitting, setIsFitting] = useState(false);
  const [alignmentConfidence, setAlignmentConfidence] = useState(0);

  useEffect(() => {
    initStore();
    generateRandomData();
    const interval = setInterval(updateData, 5000);
    return () => clearInterval(interval);
  }, []);

  const initStore = async () => {
    await snapshotStore.init();
    updateStats();
  };

  const updateStats = async () => {
    const count = await snapshotStore.getSnapshotCount();
    setSnapshotCount(count);
    
    const stats = await snapshotStore.getSourceStats();
    const statsArray = Array.from(stats.entries()).map(([source, data]) => ({
      source,
      ...data
    }));
    setSourceStats(statsArray);
  };

  const generateRandomData = () => {
    const source = BiomassSources[Math.floor(Math.random() * BiomassSources.length)];
    const spectralData = Array.from({ length: 150 }, () => 0.2 + Math.random() * 0.6);
    
    const composition: BiomassComposition = {
      id: `fuel-${Date.now()}`,
      source,
      moisture: 10 + Math.random() * 15,
      carbon: 45 + Math.random() * 10,
      hydrogen: 5 + Math.random() * 2,
      oxygen: 35 + Math.random() * 10,
      nitrogen: 0.5 + Math.random() * 1.5,
      sulfur: 0.1 + Math.random() * 0.3,
      ash: 2 + Math.random() * 5,
      volatileMatter: 65 + Math.random() * 15,
      fixedCarbon: 15 + Math.random() * 10,
      calorificValue: 16 + Math.random() * 6,
      timestamp: Date.now(),
      spectralData
    };

    setCurrentComposition(composition);
    return composition;
  };

  const updateData = async () => {
    const composition = generateRandomData();
    if (composition) {
      await performFitting(composition);
    }
  };

  const performFitting = async (composition: BiomassComposition) => {
    setIsFitting(true);
    
    try {
      const alignment = semanticAlignmentService.alignFuelAndCombustionData(
        composition,
        combustionParams
      );
      setAlignmentConfidence(alignment.confidence);

      const fittingResult = await calorificFitting.fitAsync(composition);
      
      const optimization = calorificFitting.optimizeFeedingFrequency(
        fittingResult.predictedCalorificValue,
        combustionParams
      );
      setFeedingOptimization(optimization);

      const batchId = `batch-${Math.floor(Date.now() / 3600000)}`;
      await snapshotStore.saveSnapshot(composition, batchId);
      await updateStats();
    } catch (error) {
      console.error('Fitting error:', error);
    } finally {
      setIsFitting(false);
    }
  };

  const compositionChartData = currentComposition ? [
    { name: '碳', value: currentComposition.carbon },
    { name: '氢', value: currentComposition.hydrogen },
    { name: '氧', value: currentComposition.oxygen },
    { name: '氮', value: currentComposition.nitrogen },
    { name: '灰分', value: currentComposition.ash }
  ] : [];

  const feedingChartData = feedingOptimization ? [
    { name: '当前频率', value: feedingOptimization.currentFrequency },
    { name: '优化频率', value: feedingOptimization.optimalFrequency }
  ] : [];

  const factorChartData = feedingOptimization ? [
    { name: '水分', value: feedingOptimization.factors.moisture * 100 },
    { name: '成分', value: feedingOptimization.factors.composition * 100 },
    { name: '锅炉负荷', value: feedingOptimization.factors.boilerLoad * 100 },
    { name: '历史', value: feedingOptimization.factors.historical * 100 }
  ] : [];

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-green-400 flex items-center gap-3">
              <Leaf size={32} />
              BioNexus - 生物质燃料投料优化系统
            </h1>
            <p className="text-gray-400 mt-2">近红外光谱热值分析与燃烧控制语义对齐平台</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-gray-800 px-4 py-2 rounded-lg">
              <Database size={20} className="text-blue-400" />
              <span>快照数量: {snapshotCount}</span>
            </div>
            <button
              onClick={() => updateData()}
              disabled={isFitting}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-700 px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
            >
              <RefreshCw size={18} className={isFitting ? 'animate-spin' : ''} />
              手动刷新
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-gray-800 rounded-xl p-5 border border-gray-700">
            <div className="flex items-center justify-between mb-3">
              <span className="text-gray-400">燃料来源</span>
              <Leaf size={20} className="text-green-400" />
            </div>
            <div className="text-2xl font-bold">{currentComposition?.source || '-'}</div>
          </div>

          <div className="bg-gray-800 rounded-xl p-5 border border-gray-700">
            <div className="flex items-center justify-between mb-3">
              <span className="text-gray-400">热值 (MJ/kg)</span>
              <Flame size={20} className="text-orange-400" />
            </div>
            <div className="text-2xl font-bold">
              {currentComposition?.calorificValue.toFixed(2) || '-'}
              <span className="text-sm text-gray-400 ml-2">
                预测: {feedingOptimization?.predictedCalorificValue.toFixed(2) || '-'}
              </span>
            </div>
          </div>

          <div className="bg-gray-800 rounded-xl p-5 border border-gray-700">
            <div className="flex items-center justify-between mb-3">
              <span className="text-gray-400">含水率 (%)</span>
              <Droplets size={20} className="text-blue-400" />
            </div>
            <div className="text-2xl font-bold">{currentComposition?.moisture.toFixed(1) || '-'}</div>
          </div>

          <div className="bg-gray-800 rounded-xl p-5 border border-gray-700">
            <div className="flex items-center justify-between mb-3">
              <span className="text-gray-400">语义对齐置信度</span>
              <Zap size={20} className="text-yellow-400" />
            </div>
            <div className="text-2xl font-bold">
              {(alignmentConfidence * 100).toFixed(1)}%
              <div className="w-full bg-gray-700 rounded-full h-2 mt-2">
                <div 
                  className="bg-green-500 h-2 rounded-full transition-all"
                  style={{ width: `${alignmentConfidence * 100}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="lg:col-span-2 bg-gray-800 rounded-xl p-6 border border-gray-700">
            <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Flame className="text-orange-400" />
              进料频率优化分析
            </h3>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={feedingChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="name" stroke="#9CA3AF" />
                    <YAxis stroke="#9CA3AF" />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#1F2937', border: 'none', borderRadius: '8px' }}
                    />
                    <Bar dataKey="value" fill="#10B981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart margin={{ top: 10, right: 30, left: 30, bottom: 10 }}>
                    <Pie
                      data={factorChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={70}
                      dataKey="value"
                      labelLine={{ stroke: '#9CA3AF', strokeWidth: 1 }}
                      label={({ name, value }) => `${name}: ${value.toFixed(0)}%`}
                    >
                      {factorChartData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#1F2937', border: 'none', borderRadius: '8px' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
            {feedingOptimization && (
              <div className="mt-4 p-4 bg-green-900/30 rounded-lg border border-green-700">
                <div className="flex justify-between items-center">
                  <div>
                    <span className="text-gray-400">优化进料频率:</span>
                    <span className="text-2xl font-bold text-green-400 ml-2">
                      {feedingOptimization.optimalFrequency} 秒/次
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-400">效率提升:</span>
                    <span className="text-xl font-bold text-yellow-400 ml-2">
                      +{feedingOptimization.efficiencyGain.toFixed(2)}%
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
            <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Thermometer className="text-red-400" />
              燃烧参数实时监控
            </h3>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-gray-400">锅炉负荷</span>
                  <span className="text-white font-semibold">{combustionParams.boilerLoad}%</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div 
                    className="bg-blue-500 h-2 rounded-full transition-all"
                    style={{ width: `${combustionParams.boilerLoad}%` }}
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-gray-400">氧气含量</span>
                  <span className="text-white font-semibold">{combustionParams.oxygenLevel}%</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div 
                    className="bg-cyan-500 h-2 rounded-full transition-all"
                    style={{ width: `${(combustionParams.oxygenLevel / 10) * 100}%` }}
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-gray-400">炉膛温度</span>
                  <span className="text-white font-semibold">{combustionParams.temperature}°C</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div 
                    className="bg-orange-500 h-2 rounded-full transition-all"
                    style={{ width: `${(combustionParams.temperature / 1000) * 100}%` }}
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-gray-400">蒸汽压力</span>
                  <span className="text-white font-semibold">{combustionParams.steamPressure} MPa</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div 
                    className="bg-purple-500 h-2 rounded-full transition-all"
                    style={{ width: `${(combustionParams.steamPressure / 5) * 100}%` }}
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-gray-400">燃烧效率</span>
                  <span className="text-white font-semibold">{combustionParams.efficiency}%</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div 
                    className="bg-green-500 h-2 rounded-full transition-all"
                    style={{ width: `${combustionParams.efficiency}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
            <h3 className="text-xl font-semibold mb-4">成分构成分析</h3>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart margin={{ top: 5, right: 30, left: 30, bottom: 5 }}>
                <Pie
                  data={compositionChartData}
                  cx="50%"
                  cy="45%"
                  outerRadius={80}
                  dataKey="value"
                  labelLine={{ stroke: '#9CA3AF', strokeWidth: 1, length: 15 }}
                  label={({ name, value }) => `${name}: ${value.toFixed(1)}%`}
                >
                  {compositionChartData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1F2937', border: 'none', borderRadius: '8px' }}
                />
                <Legend verticalAlign="bottom" height={36} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
            <h3 className="text-xl font-semibold mb-4">来源统计分析</h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={sourceStats}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="source" stroke="#9CA3AF" />
                <YAxis stroke="#9CA3AF" />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1F2937', border: 'none', borderRadius: '8px' }}
                />
                <Legend />
                <Bar dataKey="avgCV" name="平均热值" fill="#F59E0B" radius={[4, 4, 0, 0]} />
                <Bar dataKey="count" name="样本数量" fill="#3B82F6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {currentComposition && (
          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
            <h3 className="text-xl font-semibold mb-4">光谱数据特征提取 (近红外 1000-2500nm)</h3>
            <div className="overflow-x-auto">
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={currentComposition.spectralData.slice(0, 100).map((v, i) => ({
                  wavelength: 1000 + i * 10,
                  absorbance: v
                }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis 
                    dataKey="wavelength" 
                    stroke="#9CA3AF"
                    tickFormatter={(value) => `${value}nm`}
                  />
                  <YAxis stroke="#9CA3AF" domain={[0, 1]} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1F2937', border: 'none', borderRadius: '8px' }}
                    formatter={(value: number) => [value.toFixed(3), '吸光度']}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="absorbance" 
                    stroke="#10B981" 
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        <div className="mt-8 text-center text-gray-500 text-sm">
          <p>BioNexus v1.0 - 基于 React + TypeScript 的生物质发电厂燃料投料优化系统</p>
          <p className="mt-1">利用 IndexedDB 存储特征快照，支持循环经济产业链数据协同</p>
        </div>
      </div>
    </div>
  );
};
