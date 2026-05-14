'use client';

import { useState } from 'react';
import { SoilSample } from '@/types';
import FertilizationOptimizer from '@/lib/FertilizationOptimizer';

interface FertilizationProps {
  selectedSample: SoilSample | null;
}

export default function Fertilization({ selectedSample }: FertilizationProps) {
  const [params, setParams] = useState({
    cropType: 'wheat',
    growthStage: 'tillering',
    environmentalTarget: 'balanced' as 'conservative' | 'balanced' | 'yield_optimized',
    area: 10,
  });

  const [recommendation, setRecommendation] = useState<any>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const generateRecommendation = () => {
    if (!selectedSample) return;

    setIsGenerating(true);
    
    setTimeout(() => {
      const result = FertilizationOptimizer.generateRecommendation(
        selectedSample,
        params.cropType,
        params.growthStage,
        {
          maxNitrogenRate: 180,
          maxPhosphorusRate: 90,
          maxPotassiumRate: 120,
          organicFertilizerRatio: 0.3,
          environmentalTarget: params.environmentalTarget,
        },
        params.area
      );

      setRecommendation(result);
      setIsGenerating(false);
    }, 500);
  };

  const cropOptions = [
    { value: 'wheat', label: '小麦' },
    { value: 'corn', label: '玉米' },
    { value: 'rice', label: '水稻' },
  ];

  const stageOptions = [
    { value: 'seedling', label: '苗期' },
    { value: 'tillering', label: '分蘖期' },
    { value: 'heading', label: '抽穗期' },
    { value: 'maturity', label: '成熟期' },
  ];

  const targetOptions = [
    { value: 'conservative', label: '环境保护优先', description: '最大限度减少养分流失' },
    { value: 'balanced', label: '平衡优化', description: '产量与环境的最佳平衡' },
    { value: 'yield_optimized', label: '产量优先', description: '最大化作物产量' },
  ];

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-100">
          <h3 className="text-xl font-bold text-slate-800 mb-8">施肥方案配置</h3>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-bold text-slate-600 mb-3">
                作物类型
              </label>
              <select
                value={params.cropType}
                onChange={(e) => setParams({ ...params, cropType: e.target.value })}
                className="w-full px-5 py-3.5 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-crop-500 focus:border-crop-500 outline-none transition-all text-base"
              >
                {cropOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-600 mb-3">
                生育阶段
              </label>
              <select
                value={params.growthStage}
                onChange={(e) => setParams({ ...params, growthStage: e.target.value })}
                className="w-full px-5 py-3.5 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-crop-500 focus:border-crop-500 outline-none transition-all text-base"
              >
                {stageOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-600 mb-3">
                种植面积 (公顷)
              </label>
              <input
                type="number"
                value={params.area}
                onChange={(e) => setParams({ ...params, area: Number(e.target.value) })}
                className="w-full px-5 py-3.5 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-crop-500 focus:border-crop-500 outline-none transition-all text-base"
                min="0.1"
                step="0.1"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-600 mb-4">
                优化目标
              </label>
              <div className="space-y-3">
                {targetOptions.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setParams({ ...params, environmentalTarget: opt.value as any })}
                    className={`w-full p-5 text-left rounded-2xl border-2 transition-all ${
                      params.environmentalTarget === opt.value
                        ? 'border-crop-500 bg-crop-50'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <p className={`font-bold ${params.environmentalTarget === opt.value ? 'text-crop-700' : 'text-slate-700'}`}>
                      {opt.label}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">{opt.description}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {selectedSample && (
            <div className="mt-8 p-6 bg-slate-50 rounded-2xl border border-slate-100">
              <h4 className="font-bold text-slate-700 mb-4">基于以下土壤数据计算</h4>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">地块</span>
                  <span className="font-bold text-slate-700">{selectedSample.location.plotName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">pH</span>
                  <span className="font-bold text-slate-700">{selectedSample.pH.toFixed(1)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">有机质</span>
                  <span className="font-bold text-slate-700">{selectedSample.organicMatter.toFixed(1)} g/kg</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">全氮</span>
                  <span className="font-bold text-slate-700">{selectedSample.totalNitrogen.toFixed(0)} mg/kg</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">有效磷</span>
                  <span className="font-bold text-slate-700">{selectedSample.availablePhosphorus.toFixed(0)} mg/kg</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">速效钾</span>
                  <span className="font-bold text-slate-700">{selectedSample.availablePotassium.toFixed(0)} mg/kg</span>
                </div>
              </div>
            </div>
          )}

          <button
            onClick={generateRecommendation}
            disabled={isGenerating || !selectedSample}
            className={`w-full mt-8 py-4 font-bold rounded-2xl transition-all ${
              isGenerating || !selectedSample
                ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-crop-500 to-crop-600 text-white hover:from-crop-600 hover:to-crop-700 shadow-md hover:shadow-lg'
            }`}
          >
            {isGenerating ? (
              <span className="flex items-center justify-center gap-3">
                <span className="animate-spin text-lg">⚙️</span> 计算中...
              </span>
            ) : (
              selectedSample ? '🎯 生成施肥方案' : '请先选择土壤样本'
            )}
          </button>
        </div>

        <div className="lg:col-span-3 space-y-8">
          {recommendation ? (
            <>
              <div className="grid grid-cols-4 gap-6">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-8 border border-blue-200">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-14 h-14 bg-blue-500 rounded-2xl flex items-center justify-center text-white text-2xl font-bold">N</div>
                    <span className="text-xs bg-blue-200 text-blue-700 px-3 py-1.5 rounded-full font-bold">氮肥</span>
                  </div>
                  <p className="text-4xl font-bold text-blue-800">{recommendation.nitrogen.toFixed(1)}</p>
                  <p className="text-sm text-blue-600 mt-2">kg · 纯氮</p>
                </div>

                <div className="bg-gradient-to-br from-crop-50 to-crop-100 rounded-2xl p-8 border border-crop-200">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-14 h-14 bg-crop-500 rounded-2xl flex items-center justify-center text-white text-2xl font-bold">P</div>
                    <span className="text-xs bg-crop-200 text-crop-700 px-3 py-1.5 rounded-full font-bold">磷肥</span>
                  </div>
                  <p className="text-4xl font-bold text-crop-800">{recommendation.phosphorus.toFixed(1)}</p>
                  <p className="text-sm text-crop-600 mt-2">kg · P₂O₅</p>
                </div>

                <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-2xl p-8 border border-amber-200">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-14 h-14 bg-amber-500 rounded-2xl flex items-center justify-center text-white text-2xl font-bold">K</div>
                    <span className="text-xs bg-amber-200 text-amber-700 px-3 py-1.5 rounded-full font-bold">钾肥</span>
                  </div>
                  <p className="text-4xl font-bold text-amber-800">{recommendation.potassium.toFixed(1)}</p>
                  <p className="text-sm text-amber-600 mt-2">kg · K₂O</p>
                </div>

                <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-2xl p-8 border border-orange-200">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-14 h-14 bg-orange-500 rounded-2xl flex items-center justify-center text-white text-2xl font-bold">O</div>
                    <span className="text-xs bg-orange-200 text-orange-700 px-3 py-1.5 rounded-full font-bold">有机肥</span>
                  </div>
                  <p className="text-4xl font-bold text-orange-800">{recommendation.organicFertilizer.toFixed(1)}</p>
                  <p className="text-sm text-orange-600 mt-2">kg</p>
                </div>
              </div>

              <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-100">
                <h3 className="text-xl font-bold text-slate-800 mb-8">施用说明</h3>
                <div className="grid grid-cols-2 gap-8">
                  <div className="space-y-5">
                    <div className="flex items-start gap-4 p-6 bg-slate-50 rounded-2xl">
                      <span className="text-3xl">📋</span>
                      <div>
                        <p className="font-bold text-slate-700">施用方式</p>
                        <p className="text-sm text-slate-500 mt-2">{recommendation.applicationMethod}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-4 p-6 bg-slate-50 rounded-2xl">
                      <span className="text-3xl">⏰</span>
                      <div>
                        <p className="font-bold text-slate-700">施用时机</p>
                        <p className="text-sm text-slate-500 mt-2">{recommendation.applicationTiming}</p>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-5">
                    <div className="flex items-start gap-4 p-6 bg-blue-50 rounded-2xl">
                      <span className="text-3xl">💰</span>
                      <div>
                        <p className="font-bold text-blue-700">预估成本</p>
                        <p className="text-3xl font-bold text-blue-800 mt-2">¥{recommendation.estimatedCost.toFixed(2)}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-4 p-6 bg-crop-50 rounded-2xl">
                      <span className="text-3xl">📈</span>
                      <div>
                        <p className="font-bold text-crop-700">N:P:K 比例</p>
                        <p className="text-2xl font-bold text-crop-800 mt-2">
                          {(recommendation.nitrogen / recommendation.nitrogen).toFixed(1)} : 
                          {(recommendation.phosphorus / recommendation.nitrogen).toFixed(2)} : 
                          {(recommendation.potassium / recommendation.nitrogen).toFixed(2)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-100">
                <h3 className="text-xl font-bold text-slate-800 mb-8">环境风险评估</h3>
                <div className="grid grid-cols-3 gap-6">
                  <div className="p-6 border-2 rounded-2xl border-slate-100">
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-sm font-bold text-slate-600">氮素流失风险</span>
                      <span className={`px-4 py-1.5 rounded-full text-xs font-bold ${
                        recommendation.environmentalRisk.nitrogenLossRisk === 'low' ? 'bg-crop-100 text-crop-700' :
                        recommendation.environmentalRisk.nitrogenLossRisk === 'medium' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {recommendation.environmentalRisk.nitrogenLossRisk === 'low' ? '低' :
                         recommendation.environmentalRisk.nitrogenLossRisk === 'medium' ? '中' : '高'}
                      </span>
                    </div>
                    <div className="h-4 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          recommendation.environmentalRisk.nitrogenLossRisk === 'low' ? 'bg-crop-500 w-1/4' :
                          recommendation.environmentalRisk.nitrogenLossRisk === 'medium' ? 'bg-amber-500 w-1/2' : 'bg-red-500 w-3/4'
                        }`}
                      ></div>
                    </div>
                  </div>

                  <div className="p-6 border-2 rounded-2xl border-slate-100">
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-sm font-bold text-slate-600">磷素流失风险</span>
                      <span className={`px-4 py-1.5 rounded-full text-xs font-bold ${
                        recommendation.environmentalRisk.phosphorusLossRisk === 'low' ? 'bg-crop-100 text-crop-700' :
                        recommendation.environmentalRisk.phosphorusLossRisk === 'medium' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {recommendation.environmentalRisk.phosphorusLossRisk === 'low' ? '低' :
                         recommendation.environmentalRisk.phosphorusLossRisk === 'medium' ? '中' : '高'}
                      </span>
                    </div>
                    <div className="h-4 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          recommendation.environmentalRisk.phosphorusLossRisk === 'low' ? 'bg-crop-500 w-1/4' :
                          recommendation.environmentalRisk.phosphorusLossRisk === 'medium' ? 'bg-amber-500 w-1/2' : 'bg-red-500 w-3/4'
                        }`}
                      ></div>
                    </div>
                  </div>

                  <div className="p-6 border-2 rounded-2xl border-slate-100">
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-sm font-bold text-slate-600">淋溶风险</span>
                      <span className={`px-4 py-1.5 rounded-full text-xs font-bold ${
                        recommendation.environmentalRisk.leachingRisk === 'low' ? 'bg-crop-100 text-crop-700' :
                        recommendation.environmentalRisk.leachingRisk === 'medium' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {recommendation.environmentalRisk.leachingRisk === 'low' ? '低' :
                         recommendation.environmentalRisk.leachingRisk === 'medium' ? '中' : '高'}
                      </span>
                    </div>
                    <div className="h-4 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          recommendation.environmentalRisk.leachingRisk === 'low' ? 'bg-crop-500 w-1/4' :
                          recommendation.environmentalRisk.leachingRisk === 'medium' ? 'bg-amber-500 w-1/2' : 'bg-red-500 w-3/4'
                        }`}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-5">
                <button className="flex-1 py-4 bg-gradient-to-r from-crop-500 to-crop-600 text-white font-bold rounded-2xl hover:from-crop-600 hover:to-crop-700 transition-all shadow-md hover:shadow-lg">
                  💾 保存方案
                </button>
                <button className="flex-1 py-4 bg-white border-2 border-crop-500 text-crop-600 font-bold rounded-2xl hover:bg-crop-50 transition-all">
                  🚚 直接采购
                </button>
                <button className="px-8 py-4 bg-slate-100 text-slate-600 font-bold rounded-2xl hover:bg-slate-200 transition-all">
                  📄 导出报告
                </button>
              </div>
            </>
          ) : (
            <div className="bg-white rounded-2xl p-24 shadow-sm border border-slate-100 text-center">
              <div className="text-8xl mb-8 opacity-30">💡</div>
              <h3 className="text-3xl font-bold text-slate-700 mb-4">智能施肥决策</h3>
              <p className="text-slate-500 max-w-2xl mx-auto text-lg">
                基于土壤养分测定数据、作物营养需求规律和环境风险评估模型，
                运用运筹学方法优化计算，提供科学、精准、环保的个性化施肥方案。
              </p>
              <p className="text-sm text-slate-400 mt-6">
                配置参数后点击"生成施肥方案"
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
