'use client';

import { useState } from 'react';
import { SoilSample } from '@/types';
import ReactiveTransportEngine from '@/lib/ReactiveTransportEngine';

interface SimulationProps {
  selectedSample: SoilSample | null;
}

export default function Simulation({ selectedSample }: SimulationProps) {
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<any>(null);
  const [params, setParams] = useState({
    simulationDuration: 30,
    timeStep: 0.1,
    rootDepth: 80,
    rootDensity: 0.6,
  });

  const runSimulation = async () => {
    if (!selectedSample) return;

    setIsRunning(true);
    setProgress(0);
    setResult(null);

    const engine = new ReactiveTransportEngine({
      rootDepth: params.rootDepth,
      rootDensity: params.rootDensity,
      soilTemperature: selectedSample.temperature,
      soilMoisture: selectedSample.moisture,
      initialNitrogen: selectedSample.totalNitrogen,
      initialPhosphorus: selectedSample.availablePhosphorus,
      initialPotassium: selectedSample.availablePotassium,
      simulationDuration: params.simulationDuration,
      timeStep: params.timeStep,
      diffusionCoefficient: 1e-9,
      bulkFlowVelocity: 1e-7,
    });

    const simulationResult = await engine.runSimulation((p) => {
      setProgress(p);
    });

    setResult(simulationResult);
    setIsRunning(false);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
          <h3 className="text-lg font-bold text-slate-800 mb-6">模拟参数</h3>
          
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-2">
                模拟时长 (天)
              </label>
              <input
                type="number"
                value={params.simulationDuration}
                onChange={(e) => setParams({ ...params, simulationDuration: Number(e.target.value) })}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-crop-500 focus:border-crop-500 outline-none transition-all"
                min="1"
                max="100"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-600 mb-2">
                时间步长 (天)
              </label>
              <input
                type="number"
                value={params.timeStep}
                onChange={(e) => setParams({ ...params, timeStep: Number(e.target.value) })}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-crop-500 focus:border-crop-500 outline-none transition-all"
                min="0.01"
                max="1"
                step="0.01"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-600 mb-2">
                根系深度 (cm)
              </label>
              <input
                type="number"
                value={params.rootDepth}
                onChange={(e) => setParams({ ...params, rootDepth: Number(e.target.value) })}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-crop-500 focus:border-crop-500 outline-none transition-all"
                min="10"
                max="200"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-600 mb-2">
                根系密度 (cm/cm³)
              </label>
              <input
                type="number"
                value={params.rootDensity}
                onChange={(e) => setParams({ ...params, rootDensity: Number(e.target.value) })}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-crop-500 focus:border-crop-500 outline-none transition-all"
                min="0.1"
                max="2"
                step="0.1"
              />
            </div>
          </div>

          <div className="mt-6 p-4 bg-slate-50 rounded-xl border border-slate-100">
            <h4 className="font-medium text-slate-700 mb-3">当前土壤条件</h4>
            {selectedSample ? (
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">温度</span>
                  <span className="font-medium text-slate-700">{selectedSample.temperature.toFixed(1)}°C</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">湿度</span>
                  <span className="font-medium text-slate-700">{(selectedSample.moisture * 100).toFixed(1)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">初始氮素</span>
                  <span className="font-medium text-slate-700">{selectedSample.totalNitrogen.toFixed(0)} mg/kg</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">初始磷素</span>
                  <span className="font-medium text-slate-700">{selectedSample.availablePhosphorus.toFixed(0)} mg/kg</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">初始钾素</span>
                  <span className="font-medium text-slate-700">{selectedSample.availablePotassium.toFixed(0)} mg/kg</span>
                </div>
              </div>
            ) : (
              <p className="text-sm text-slate-400">请先选择土壤样本</p>
            )}
          </div>

          <button
            onClick={runSimulation}
            disabled={isRunning || !selectedSample}
            className={`w-full mt-6 py-3 font-medium rounded-xl transition-all ${
              isRunning || !selectedSample
                ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-crop-500 to-crop-600 text-white hover:from-crop-600 hover:to-crop-700 shadow-md hover:shadow-lg'
            }`}
          >
            {isRunning ? (
              <span className="flex items-center justify-center gap-2">
                <span className="animate-spin">⏳</span> 模拟计算中...
              </span>
            ) : (
              '🚀 开始模拟'
            )}
          </button>
        </div>

        <div className="lg:col-span-3 space-y-6">
          {isRunning && (
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-slate-800">模拟进度</h3>
                <span className="text-2xl font-bold text-crop-600">{progress.toFixed(0)}%</span>
              </div>
              <div className="h-4 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-crop-400 to-crop-600 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
              <p className="text-sm text-slate-500 mt-3 text-center">
                正在计算根系养分吸收动力学过程...
              </p>
            </div>
          )}

          {result && (
            <>
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-6 border border-blue-200">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center text-white font-bold">N</div>
                    <div>
                      <p className="text-sm text-blue-600">总氮吸收</p>
                      <p className="text-2xl font-bold text-blue-800">{result.totalUptake.nitrogen.toFixed(2)}</p>
                    </div>
                  </div>
                  <p className="text-xs text-blue-500">mg/kg · 根区</p>
                </div>

                <div className="bg-gradient-to-br from-crop-50 to-crop-100 rounded-2xl p-6 border border-crop-200">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-crop-500 rounded-xl flex items-center justify-center text-white font-bold">P</div>
                    <div>
                      <p className="text-sm text-crop-600">总磷吸收</p>
                      <p className="text-2xl font-bold text-crop-800">{result.totalUptake.phosphorus.toFixed(2)}</p>
                    </div>
                  </div>
                  <p className="text-xs text-crop-500">mg/kg · 根区</p>
                </div>

                <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-2xl p-6 border border-amber-200">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center text-white font-bold">K</div>
                    <div>
                      <p className="text-sm text-amber-600">总钾吸收</p>
                      <p className="text-2xl font-bold text-amber-800">{result.totalUptake.potassium.toFixed(2)}</p>
                    </div>
                  </div>
                  <p className="text-xs text-amber-500">mg/kg · 根区</p>
                </div>
              </div>

              <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
                <h3 className="text-lg font-bold text-slate-800 mb-6">养分吸收过程曲线</h3>
                
                <div className="h-64 flex items-end justify-around gap-1 px-4">
                  {result.nitrogenUptake.slice(0, 50).map((val: number, i: number) => (
                    <div key={i} className="flex flex-col items-center gap-1 flex-1">
                      <div
                        className="w-full bg-gradient-to-t from-blue-400 to-blue-600 rounded-t transition-all duration-500"
                        style={{ height: `${Math.min(val * 50, 100)}%` }}
                      ></div>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between mt-4 text-xs text-slate-400 px-4">
                  <span>第 0 天</span>
                  <span>氮素吸收累积曲线</span>
                  <span>第 {params.simulationDuration} 天</span>
                </div>
              </div>

              <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
                <h3 className="text-lg font-bold text-slate-800 mb-6">养分浓度动态变化</h3>
                
                <div className="grid grid-cols-3 gap-6">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-medium text-slate-600">氮素浓度</span>
                      <span className="text-sm text-blue-600">
                        {result.nutrientConcentration.nitrogen[result.nutrientConcentration.nitrogen.length - 1].toFixed(1)} mg/kg
                      </span>
                    </div>
                    <div className="h-32 bg-slate-50 rounded-xl flex items-end gap-0.5 p-2">
                      {result.nutrientConcentration.nitrogen.slice(-30).map((val: number, i: number) => (
                        <div
                          key={i}
                          className="flex-1 bg-blue-500 rounded-t opacity-80"
                          style={{ height: `${(val / result.nutrientConcentration.nitrogen[0]) * 100}%` }}
                        ></div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-medium text-slate-600">磷素浓度</span>
                      <span className="text-sm text-crop-600">
                        {result.nutrientConcentration.phosphorus[result.nutrientConcentration.phosphorus.length - 1].toFixed(1)} mg/kg
                      </span>
                    </div>
                    <div className="h-32 bg-slate-50 rounded-xl flex items-end gap-0.5 p-2">
                      {result.nutrientConcentration.phosphorus.slice(-30).map((val: number, i: number) => (
                        <div
                          key={i}
                          className="flex-1 bg-crop-500 rounded-t opacity-80"
                          style={{ height: `${(val / result.nutrientConcentration.phosphorus[0]) * 100}%` }}
                        ></div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-medium text-slate-600">钾素浓度</span>
                      <span className="text-sm text-amber-600">
                        {result.nutrientConcentration.potassium[result.nutrientConcentration.potassium.length - 1].toFixed(1)} mg/kg
                      </span>
                    </div>
                    <div className="h-32 bg-slate-50 rounded-xl flex items-end gap-0.5 p-2">
                      {result.nutrientConcentration.potassium.slice(-30).map((val: number, i: number) => (
                        <div
                          key={i}
                          className="flex-1 bg-amber-500 rounded-t opacity-80"
                          style={{ height: `${(val / result.nutrientConcentration.potassium[0]) * 100}%` }}
                        ></div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-blue-50 to-crop-50 rounded-2xl p-6 border border-blue-100">
                <h3 className="text-lg font-bold text-slate-800 mb-4">📊 模拟结果分析</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-white rounded-xl shadow-sm">
                    <p className="text-sm text-slate-500 mb-1">氮素吸收效率</p>
                    <p className="text-xl font-bold text-blue-700">
                      {((result.totalUptake.nitrogen / (selectedSample?.totalNitrogen || 1)) * 100).toFixed(1)}%
                    </p>
                  </div>
                  <div className="p-4 bg-white rounded-xl shadow-sm">
                    <p className="text-sm text-slate-500 mb-1">磷素吸收效率</p>
                    <p className="text-xl font-bold text-crop-700">
                      {((result.totalUptake.phosphorus / (selectedSample?.availablePhosphorus || 1)) * 100).toFixed(1)}%
                    </p>
                  </div>
                  <div className="p-4 bg-white rounded-xl shadow-sm">
                    <p className="text-sm text-slate-500 mb-1">钾素吸收效率</p>
                    <p className="text-xl font-bold text-amber-700">
                      {((result.totalUptake.potassium / (selectedSample?.availablePotassium || 1)) * 100).toFixed(1)}%
                    </p>
                  </div>
                  <div className="p-4 bg-white rounded-xl shadow-sm">
                    <p className="text-sm text-slate-500 mb-1">模拟计算步数</p>
                    <p className="text-xl font-bold text-slate-700">
                      {result.nitrogenUptake.length} 步
                    </p>
                  </div>
                </div>
              </div>
            </>
          )}

          {!result && !isRunning && (
            <div className="bg-white rounded-2xl p-20 shadow-sm border border-slate-100 text-center">
              <div className="text-7xl mb-6 opacity-30">🔬</div>
              <h3 className="text-2xl font-bold text-slate-700 mb-3">异步反应输运模拟</h3>
              <p className="text-slate-500 max-w-md mx-auto">
                基于物理化学原理的根系养分吸收过程模拟，考虑扩散、质流、米氏动力学等过程，精确预测作物养分吸收动态。
              </p>
              <p className="text-sm text-slate-400 mt-4">
                选择土壤样本并配置参数后点击"开始模拟"
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
