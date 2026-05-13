'use client';

import { useState, useEffect } from 'react';
import { SoilSample } from '@/types';
import ReactiveTransportEngine from '@/lib/ReactiveTransportEngine';
import FertilizationOptimizer from '@/lib/FertilizationOptimizer';
import SupplyChainCoordinator from '@/lib/SupplyChainCoordinator';
import { soilSampleStore, fertilizationPlanStore, farmStore } from '@/lib/IndexedDBStore';

export default function Home() {
  const [soilSamples, setSoilSamples] = useState<SoilSample[]>([]);
  const [selectedSample, setSelectedSample] = useState<SoilSample | null>(null);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'samples' | 'simulation' | 'recommendation' | 'supplychain'>('dashboard');
  const [simulationProgress, setSimulationProgress] = useState(0);
  const [simulationResult, setSimulationResult] = useState<any>(null);
  const [recommendation, setRecommendation] = useState<any>(null);
  const [farmLocation] = useState({ lat: 35.0, lng: 115.0 });

  useEffect(() => {
    loadSoilSamples();
    initDemoData();
  }, []);

  const loadSoilSamples = async () => {
    const samples = await soilSampleStore.getAll();
    setSoilSamples(samples);
    if (samples.length > 0) {
      setSelectedSample(samples[0]);
    }
  };

  const initDemoData = async () => {
    const existingSamples = await soilSampleStore.count();
    if (existingSamples === 0) {
      const demoSamples: SoilSample[] = Array.from({ length: 50 }, (_, i) => ({
        id: `sample_demo_${i}`,
        location: {
          lat: 35 + Math.random() * 5,
          lng: 115 + Math.random() * 5,
          farmId: 'farm_demo_001',
          plotName: `地块 ${String.fromCharCode(65 + (i % 5))}`,
        },
        timestamp: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
        pH: 5.5 + Math.random() * 3,
        organicMatter: 15 + Math.random() * 25,
        totalNitrogen: 50 + Math.random() * 100,
        availablePhosphorus: 10 + Math.random() * 40,
        availablePotassium: 80 + Math.random() * 120,
        moisture: 0.15 + Math.random() * 0.25,
        temperature: 15 + Math.random() * 15,
        bulkDensity: 1.2 + Math.random() * 0.4,
        cationExchangeCapacity: 10 + Math.random() * 15,
      }));

      for (const sample of demoSamples) {
        await soilSampleStore.add(sample);
      }
      await loadSoilSamples();
    }
  };

  const runSimulation = async () => {
    if (!selectedSample) return;

    const engine = new ReactiveTransportEngine({
      rootDepth: 80,
      rootDensity: 0.6,
      soilTemperature: selectedSample.temperature,
      soilMoisture: selectedSample.moisture,
      initialNitrogen: selectedSample.totalNitrogen,
      initialPhosphorus: selectedSample.availablePhosphorus,
      initialPotassium: selectedSample.availablePotassium,
      simulationDuration: 30,
      timeStep: 0.1,
      diffusionCoefficient: 1e-9,
      bulkFlowVelocity: 1e-7,
    });

    const result = await engine.runSimulation((progress) => {
      setSimulationProgress(progress);
    });

    setSimulationResult(result);
  };

  const generateRecommendation = () => {
    if (!selectedSample) return;

    const result = FertilizationOptimizer.generateRecommendation(
      selectedSample,
      'wheat',
      'tillering',
      {
        maxNitrogenRate: 180,
        maxPhosphorusRate: 90,
        maxPotassiumRate: 120,
        organicFertilizerRatio: 0.3,
        environmentalTarget: 'balanced',
      },
      10
    );

    setRecommendation(result);
  };

  const renderDashboard = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">土壤样本数</p>
              <p className="text-3xl font-bold text-gray-800">{soilSamples.length}</p>
            </div>
            <div className="w-12 h-12 bg-crop-100 rounded-lg flex items-center justify-center">
              <span className="text-crop-600 text-2xl">🌱</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">平均 pH 值</p>
              <p className="text-3xl font-bold text-gray-800">
                {soilSamples.length > 0 
                  ? (soilSamples.reduce((sum, s) => sum + s.pH, 0) / soilSamples.length).toFixed(1)
                  : '--'}
              </p>
            </div>
            <div className="w-12 h-12 bg-water-100 rounded-lg flex items-center justify-center">
              <span className="text-water-600 text-2xl">💧</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">有机质平均</p>
              <p className="text-3xl font-bold text-gray-800">
                {soilSamples.length > 0 
                  ? (soilSamples.reduce((sum, s) => sum + s.organicMatter, 0) / soilSamples.length).toFixed(1)
                  : '--'}
              </p>
            </div>
            <div className="w-12 h-12 bg-soil-100 rounded-lg flex items-center justify-center">
              <span className="text-soil-600 text-2xl">🌿</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">施肥建议</p>
              <p className="text-3xl font-bold text-gray-800">12</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <span className="text-green-600 text-2xl">📋</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">养分分布概览</h3>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600">氮素 (N)</span>
                <span className="font-medium">平均 {soilSamples.length > 0 ? (soilSamples.reduce((sum, s) => sum + s.totalNitrogen, 0) / soilSamples.length).toFixed(0) : 0} mg/kg</span>
              </div>
              <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 rounded-full" style={{ width: '65%' }}></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600">磷素 (P)</span>
                <span className="font-medium">平均 {soilSamples.length > 0 ? (soilSamples.reduce((sum, s) => sum + s.availablePhosphorus, 0) / soilSamples.length).toFixed(0) : 0} mg/kg</span>
              </div>
              <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-green-500 rounded-full" style={{ width: '55%' }}></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600">钾素 (K)</span>
                <span className="font-medium">平均 {soilSamples.length > 0 ? (soilSamples.reduce((sum, s) => sum + s.availablePotassium, 0) / soilSamples.length).toFixed(0) : 0} mg/kg</span>
              </div>
              <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-yellow-500 rounded-full" style={{ width: '72%' }}></div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">快速操作</h3>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setActiveTab('simulation')}
              className="p-4 bg-crop-50 hover:bg-crop-100 rounded-lg text-left transition-colors"
            >
              <div className="text-2xl mb-2">🔬</div>
              <div className="font-medium text-crop-700">根系模拟</div>
              <div className="text-sm text-crop-600">养分吸收过程模拟</div>
            </button>
            <button
              onClick={() => setActiveTab('recommendation')}
              className="p-4 bg-water-50 hover:bg-water-100 rounded-lg text-left transition-colors"
            >
              <div className="text-2xl mb-2">📊</div>
              <div className="font-medium text-water-700">施肥建议</div>
              <div className="text-sm text-water-600">智能配方优化</div>
            </button>
            <button
              onClick={() => setActiveTab('supplychain')}
              className="p-4 bg-soil-50 hover:bg-soil-100 rounded-lg text-left transition-colors"
            >
              <div className="text-2xl mb-2">🚚</div>
              <div className="font-medium text-soil-700">供应链</div>
              <div className="text-sm text-soil-600">农资采购优化</div>
            </button>
            <button
              onClick={() => setActiveTab('samples')}
              className="p-4 bg-purple-50 hover:bg-purple-100 rounded-lg text-left transition-colors"
            >
              <div className="text-2xl mb-2">🗺️</div>
              <div className="font-medium text-purple-700">土壤地图</div>
              <div className="text-sm text-purple-600">样本分布查看</div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderSamples = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">土壤样本管理</h2>
        <button className="px-4 py-2 bg-crop-600 text-white rounded-lg hover:bg-crop-700 transition-colors">
          + 新增样本
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">地块</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">pH</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">有机质</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">氮</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">磷</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">钾</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">采样时间</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {soilSamples.slice(0, 10).map((sample) => (
              <tr
                key={sample.id}
                className={`hover:bg-gray-50 cursor-pointer ${
                  selectedSample?.id === sample.id ? 'bg-crop-50' : ''
                }`}
                onClick={() => setSelectedSample(sample)}
              >
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="font-medium text-gray-900">{sample.location.plotName}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    sample.pH >= 6 && sample.pH <= 7.5 ? 'bg-green-100 text-green-800' :
                    sample.pH >= 5.5 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {sample.pH.toFixed(1)}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                  {sample.organicMatter.toFixed(1)} g/kg
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                  {sample.totalNitrogen.toFixed(0)} mg/kg
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                  {sample.availablePhosphorus.toFixed(0)} mg/kg
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                  {sample.availablePotassium.toFixed(0)} mg/kg
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                  {new Date(sample.timestamp).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <button className="text-crop-600 hover:text-crop-800">详情</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderSimulation = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">根系吸肥过程模拟</h2>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <h3 className="font-semibold text-gray-800 mb-4">模拟参数</h3>
            {selectedSample && (
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">土壤温度</span>
                  <span className="font-medium">{selectedSample.temperature.toFixed(1)} °C</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">土壤湿度</span>
                  <span className="font-medium">{(selectedSample.moisture * 100).toFixed(1)} %</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">初始氮素</span>
                  <span className="font-medium">{selectedSample.totalNitrogen.toFixed(0)} mg/kg</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">初始磷素</span>
                  <span className="font-medium">{selectedSample.availablePhosphorus.toFixed(0)} mg/kg</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">初始钾素</span>
                  <span className="font-medium">{selectedSample.availablePotassium.toFixed(0)} mg/kg</span>
                </div>
              </div>
            )}
            <button
              onClick={runSimulation}
              disabled={!selectedSample}
              className="w-full mt-4 px-4 py-2 bg-crop-600 text-white rounded-lg hover:bg-crop-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              运行模拟
            </button>

            {simulationProgress > 0 && simulationProgress < 100 && (
              <div className="mt-4">
                <div className="text-sm text-gray-600 mb-1">模拟进度: {simulationProgress.toFixed(0)}%</div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-crop-500 transition-all duration-300"
                    style={{ width: `${simulationProgress}%` }}
                  ></div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-2">
          {simulationResult ? (
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
              <h3 className="font-semibold text-gray-800 mb-4">模拟结果</h3>
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="p-4 bg-blue-50 rounded-lg">
                  <div className="text-sm text-blue-600">总氮吸收</div>
                  <div className="text-2xl font-bold text-blue-800">
                    {simulationResult.totalUptake.nitrogen.toFixed(2)}
                  </div>
                </div>
                <div className="p-4 bg-green-50 rounded-lg">
                  <div className="text-sm text-green-600">总磷吸收</div>
                  <div className="text-2xl font-bold text-green-800">
                    {simulationResult.totalUptake.phosphorus.toFixed(2)}
                  </div>
                </div>
                <div className="p-4 bg-yellow-50 rounded-lg">
                  <div className="text-sm text-yellow-600">总钾吸收</div>
                  <div className="text-2xl font-bold text-yellow-800">
                    {simulationResult.totalUptake.potassium.toFixed(2)}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-medium text-gray-700">养分吸收趋势</h4>
                <div className="h-64 bg-gray-50 rounded-lg flex items-end justify-around p-4">
                  {simulationResult.nitrogenUptake.slice(0, 30).map((val: number, i: number) => (
                    <div key={i} className="flex flex-col items-center gap-1">
                      <div
                        className="w-4 bg-blue-500 rounded-t"
                        style={{ height: `${Math.min(val * 10, 100)}%` }}
                      ></div>
                    </div>
                  ))}
                </div>
                <div className="text-center text-sm text-gray-500">氮素吸收随时间变化（前30个时间步）</div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm p-12 border border-gray-100 text-center">
              <div className="text-6xl mb-4">🔬</div>
              <p className="text-gray-500">选择土壤样本并运行模拟以查看结果</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderRecommendation = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">智能施肥建议</h2>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <h3 className="font-semibold text-gray-800 mb-4">推荐参数</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">作物类型</label>
                <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-crop-500 focus:border-crop-500">
                  <option value="wheat">小麦</option>
                  <option value="corn">玉米</option>
                  <option value="rice">水稻</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">生育期</label>
                <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-crop-500 focus:border-crop-500">
                  <option value="seedling">苗期</option>
                  <option value="tillering">分蘖期</option>
                  <option value="heading">抽穗期</option>
                  <option value="maturity">成熟期</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">环境目标</label>
                <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-crop-500 focus:border-crop-500">
                  <option value="conservative">保守（最低环境风险）</option>
                  <option value="balanced">平衡（推荐）</option>
                  <option value="yield_optimized">产量优先</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">种植面积 (公顷)</label>
                <input
                  type="number"
                  defaultValue="10"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-crop-500 focus:border-crop-500"
                />
              </div>
              <button
                onClick={generateRecommendation}
                disabled={!selectedSample}
                className="w-full px-4 py-2 bg-crop-600 text-white rounded-lg hover:bg-crop-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                生成建议
              </button>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2">
          {recommendation ? (
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
              <h3 className="font-semibold text-gray-800 mb-4">施肥建议方案</h3>
              
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="p-4 bg-blue-50 rounded-lg">
                  <div className="text-sm text-blue-600">氮肥 (N)</div>
                  <div className="text-2xl font-bold text-blue-800">
                    {recommendation.nitrogen.toFixed(1)} kg
                  </div>
                </div>
                <div className="p-4 bg-green-50 rounded-lg">
                  <div className="text-sm text-green-600">磷肥 (P₂O₅)</div>
                  <div className="text-2xl font-bold text-green-800">
                    {recommendation.phosphorus.toFixed(1)} kg
                  </div>
                </div>
                <div className="p-4 bg-yellow-50 rounded-lg">
                  <div className="text-sm text-yellow-600">钾肥 (K₂O)</div>
                  <div className="text-2xl font-bold text-yellow-800">
                    {recommendation.potassium.toFixed(1)} kg
                  </div>
                </div>
                <div className="p-4 bg-amber-50 rounded-lg">
                  <div className="text-sm text-amber-600">有机肥</div>
                  <div className="text-2xl font-bold text-amber-800">
                    {recommendation.organicFertilizer.toFixed(1)} kg
                  </div>
                </div>
              </div>

              <div className="border-t pt-4">
                <h4 className="font-medium text-gray-700 mb-3">施用说明</h4>
                <div className="space-y-2 text-sm text-gray-600">
                  <p><span className="font-medium">施用方式：</span>{recommendation.applicationMethod}</p>
                  <p><span className="font-medium">施用时机：</span>{recommendation.applicationTiming}</p>
                  <p><span className="font-medium">预估成本：</span>¥{recommendation.estimatedCost.toFixed(2)}</p>
                </div>
              </div>

              <div className="border-t mt-4 pt-4">
                <h4 className="font-medium text-gray-700 mb-3">环境风险评估</h4>
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3 bg-gray-50 rounded-lg text-center">
                    <div className="text-xs text-gray-500">氮素流失风险</div>
                    <div className={`font-bold ${
                      recommendation.environmentalRisk.nitrogenLossRisk === 'low' ? 'text-green-600' :
                      recommendation.environmentalRisk.nitrogenLossRisk === 'medium' ? 'text-yellow-600' : 'text-red-600'
                    }`}>
                      {recommendation.environmentalRisk.nitrogenLossRisk === 'low' ? '低' :
                       recommendation.environmentalRisk.nitrogenLossRisk === 'medium' ? '中' : '高'}
                    </div>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg text-center">
                    <div className="text-xs text-gray-500">磷素流失风险</div>
                    <div className={`font-bold ${
                      recommendation.environmentalRisk.phosphorusLossRisk === 'low' ? 'text-green-600' :
                      recommendation.environmentalRisk.phosphorusLossRisk === 'medium' ? 'text-yellow-600' : 'text-red-600'
                    }`}>
                      {recommendation.environmentalRisk.phosphorusLossRisk === 'low' ? '低' :
                       recommendation.environmentalRisk.phosphorusLossRisk === 'medium' ? '中' : '高'}
                    </div>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg text-center">
                    <div className="text-xs text-gray-500">淋溶风险</div>
                    <div className={`font-bold ${
                      recommendation.environmentalRisk.leachingRisk === 'low' ? 'text-green-600' :
                      recommendation.environmentalRisk.leachingRisk === 'medium' ? 'text-yellow-600' : 'text-red-600'
                    }`}>
                      {recommendation.environmentalRisk.leachingRisk === 'low' ? '低' :
                       recommendation.environmentalRisk.leachingRisk === 'medium' ? '中' : '高'}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button className="flex-1 px-4 py-2 bg-crop-600 text-white rounded-lg hover:bg-crop-700 transition-colors">
                  保存方案
                </button>
                <button className="flex-1 px-4 py-2 border border-crop-600 text-crop-600 rounded-lg hover:bg-crop-50 transition-colors">
                  直接采购
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm p-12 border border-gray-100 text-center">
              <div className="text-6xl mb-4">📊</div>
              <p className="text-gray-500">配置参数并点击生成建议以获取智能施肥方案</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderSupplyChain = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">农资供应链协同</h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <h3 className="font-semibold text-gray-800 mb-4">供应商列表</h3>
          <div className="space-y-3">
            {SupplyChainCoordinator.getSuppliers().map((supplier) => (
              <div key={supplier.id} className="p-4 border border-gray-200 rounded-lg hover:border-crop-300 transition-colors">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-medium text-gray-800">{supplier.name}</div>
                    <div className="text-sm text-gray-500">{supplier.location}</div>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-yellow-500">★</span>
                    <span className="font-medium">{supplier.rating}</span>
                  </div>
                </div>
                <div className="mt-3 flex gap-2 flex-wrap">
                  {supplier.products.slice(0, 2).map((product) => (
                    <span key={product.id} className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                      {product.name}
                    </span>
                  ))}
                </div>
                <div className="mt-3 text-sm text-gray-500">
                  配送时效: {supplier.deliveryDays} 天 | 起订量: {supplier.minimumOrder} 吨
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <h3 className="font-semibold text-gray-800 mb-4">库存概览</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600 font-bold">N</div>
                <div>
                  <div className="font-medium text-blue-800">氮肥库存</div>
                  <div className="text-sm text-blue-600">2,500 kg</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm text-blue-600">可用天数</div>
                <div className="font-bold text-blue-800">45 天</div>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center text-green-600 font-bold">P</div>
                <div>
                  <div className="font-medium text-green-800">磷肥库存</div>
                  <div className="text-sm text-green-600">1,800 kg</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm text-green-600">可用天数</div>
                <div className="font-bold text-green-800">60 天</div>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center text-yellow-600 font-bold">K</div>
                <div>
                  <div className="font-medium text-yellow-800">钾肥库存</div>
                  <div className="text-sm text-yellow-600">2,200 kg</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm text-yellow-600">可用天数</div>
                <div className="font-bold text-yellow-800">55 天</div>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 bg-amber-50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center text-amber-600 font-bold">O</div>
                <div>
                  <div className="font-medium text-amber-800">有机肥库存</div>
                  <div className="text-sm text-amber-600">5,000 kg</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm text-amber-600">可用天数</div>
                <div className="font-bold text-amber-800">90 天</div>
              </div>
            </div>
          </div>

          <button
            onClick={() => {
              const targetDate = new Date();
              targetDate.setDate(targetDate.getDate() + 14);
              const optimized = SupplyChainCoordinator.optimizeOrder(
                { nitrogen: 500, phosphorus: 300, potassium: 400, organic: 1000 },
                farmLocation,
                targetDate
              );
              alert(`订单优化完成！\n总成本: ¥${optimized.totalCost.toFixed(2)}\n可节省: ¥${optimized.potentialSavings.toFixed(2)}`);
            }}
            className="w-full mt-4 px-4 py-2 bg-soil-600 text-white rounded-lg hover:bg-soil-700 transition-colors"
          >
            智能补库优化
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <span className="text-2xl mr-2">🌱</span>
              <span className="text-xl font-bold text-gray-800">SoilPulse</span>
              <span className="ml-2 text-sm text-gray-500">农田养分智能管理系统</span>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-sm text-gray-600">
                当前样本: {selectedSample ? selectedSample.location.plotName : '未选择'}
              </div>
              <div className="w-8 h-8 bg-crop-100 rounded-full flex items-center justify-center">
                <span className="text-crop-600 font-medium">管</span>
              </div>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex gap-1 mb-6 bg-white rounded-lg p-1 shadow-sm w-fit">
          {[
            { key: 'dashboard', label: '概览', icon: '📊' },
            { key: 'samples', label: '样本', icon: '🌱' },
            { key: 'simulation', label: '模拟', icon: '🔬' },
            { key: 'recommendation', label: '施肥', icon: '💡' },
            { key: 'supplychain', label: '供应链', icon: '🚚' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as typeof activeTab)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? 'bg-crop-600 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'dashboard' && renderDashboard()}
        {activeTab === 'samples' && renderSamples()}
        {activeTab === 'simulation' && renderSimulation()}
        {activeTab === 'recommendation' && renderRecommendation()}
        {activeTab === 'supplychain' && renderSupplyChain()}
      </div>

      <footer className="bg-white border-t border-gray-200 mt-12 py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-sm text-gray-500">
          <p>SoilPulse © 2024 | 农田养分流失与施肥冗余智能监控系统</p>
          <p className="mt-1">基于 Next.js + IndexedDB + 异步反应输运模拟引擎</p>
        </div>
      </footer>
    </div>
  );
}
