'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Sliders, Zap, TrendingDown, TrendingUp, AlertTriangle, CheckCircle, ArrowRight } from 'lucide-react';
import { useAppStore } from '@/store';
import { optimizeParameters, generateOptimizationRecommendations } from '@/lib/prediction';
import { generatePowerSpectrumData } from '@/lib/mock';
import { extractPowerSpectrumFeatures } from '@/lib/fractal';
import type { ParameterOptimizationResult, ProcessingParams } from '@/types';

export default function OptimizationPage() {
  const { currentParams, setCurrentParams, latestOptimization, setLatestOptimization } = useAppStore();
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [targetRa, setTargetRa] = useState(0.8);
  const [optimizationResult, setOptimizationResult] = useState<ParameterOptimizationResult | null>(null);
  const [recommendations, setRecommendations] = useState<string[]>([]);

  useEffect(() => {
    handleOptimize();
  }, []);

  const handleOptimize = async () => {
    setIsOptimizing(true);

    await new Promise((resolve) => setTimeout(resolve, 1500));

    const data = generatePowerSpectrumData(5, 200);
    const { fractal } = extractPowerSpectrumFeatures(data);
    const result = optimizeParameters(currentParams, fractal, targetRa);

    setOptimizationResult(result);
    setLatestOptimization(result);
    setRecommendations(generateOptimizationRecommendations(result));
    setIsOptimizing(false);
  };

  const handleApplyOptimization = () => {
    if (optimizationResult) {
      setCurrentParams(optimizationResult.optimizedParams);
    }
  };

  const ParamSlider = ({
    label,
    value,
    min,
    max,
    unit,
    optimizedValue,
  }: {
    label: string;
    value: number;
    min: number;
    max: number;
    unit: string;
    optimizedValue?: number;
  }) => {
    const percent = ((value - min) / (max - min)) * 100;
    const optimizedPercent = optimizedValue ? ((optimizedValue - min) / (max - min)) * 100 : null;

    return (
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-dark-300">{label}</span>
          <div className="flex items-center gap-3">
            {optimizedValue && (
              <span className="text-sm text-accent-400 font-mono">
                {optimizedValue.toFixed(optimizedValue < 10 ? 1 : 0)} {unit}
                <span className="text-dark-500 ml-1">(优化后)</span>
              </span>
            )}
            <span className="text-lg font-semibold text-white font-mono">
              {value.toFixed(value < 10 ? 1 : 0)} {unit}
            </span>
          </div>
        </div>
        <div className="relative h-3 bg-dark-700 rounded-full overflow-hidden">
          <div
            className="absolute inset-y-0 left-0 bg-gradient-to-r from-primary-500 to-primary-400 rounded-full"
            style={{ width: `${percent}%` }}
          />
          {optimizedPercent !== null && (
            <div
              className="absolute top-0 bottom-0 w-1 bg-accent-400 rounded-full shadow-lg shadow-accent-500/50"
              style={{ left: `${optimizedPercent}%` }}
            />
          )}
        </div>
        <div className="flex justify-between text-xs text-dark-500 mt-1">
          <span>{min}</span>
          <span>{max}</span>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-2xl font-bold text-white font-display">参数优化引擎</h1>
          <p className="text-dark-400 mt-1">基于多目标优化的进给参数智能调整</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <label className="text-sm text-dark-400">目标 Ra:</label>
            <input
              type="number"
              value={targetRa}
              onChange={(e) => setTargetRa(parseFloat(e.target.value))}
              step="0.1"
              min="0.1"
              max="3.2"
              className="w-24 px-3 py-2 bg-dark-700 border border-dark-600 rounded-lg text-white text-center font-mono focus:outline-none focus:border-primary-500"
            />
            <span className="text-sm text-dark-400">μm</span>
          </div>
          <button
            onClick={handleOptimize}
            disabled={isOptimizing}
            className="btn-primary flex items-center gap-2 disabled:opacity-50"
          >
            {isOptimizing ? (
              <>
                <Sliders className="w-4 h-4 animate-spin" />
                优化中...
              </>
            ) : (
              <>
                <Zap className="w-4 h-4" />
                执行优化
              </>
            )}
          </button>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="glass-card p-6"
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-white">当前加工参数</h2>
            <span className="badge badge-pending">生产中</span>
          </div>

          <ParamSlider label="进给速度" value={currentParams.feedRate} min={50} max={500} unit="mm/min" optimizedValue={optimizationResult?.optimizedParams.feedRate} />
          <ParamSlider label="主轴转速" value={currentParams.spindleSpeed} min={1000} max={10000} unit="rpm" optimizedValue={optimizationResult?.optimizedParams.spindleSpeed} />
          <ParamSlider label="切削深度" value={currentParams.depthOfCut} min={5} max={50} unit="μm" optimizedValue={optimizationResult?.optimizedParams.depthOfCut} />
          <ParamSlider label="砂轮线速度" value={currentParams.grindingWheelSpeed} min={10} max={60} unit="m/s" optimizedValue={optimizationResult?.optimizedParams.grindingWheelSpeed} />
          <ParamSlider label="冷却液压力" value={currentParams.coolantPressure} min={2} max={8} unit="MPa" optimizedValue={optimizationResult?.optimizedParams.coolantPressure} />

          <div className="flex items-center gap-2 mt-6 pt-4 border-t border-dark-700">
            <div className="w-4 h-1 bg-accent-400 rounded-full" />
            <span className="text-xs text-dark-400">优化后目标值</span>
          </div>
        </motion.div>

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="glass-card p-6"
        >
          <h2 className="text-lg font-semibold text-white mb-6">优化效果预测</h2>

          {optimizationResult && (
            <div className="space-y-6">
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-4 bg-dark-700/50 rounded-xl">
                  <div className="flex items-center justify-center gap-1 text-accent-400 mb-1">
                    <TrendingDown className="w-4 h-4" />
                    <span className="text-sm">表面质量</span>
                  </div>
                  <div className="text-2xl font-bold text-white font-display">
                    +{optimizationResult.tradeOffAnalysis.roughnessImprovement.toFixed(1)}%
                  </div>
                  <div className="text-xs text-dark-500">Ra 改善</div>
                </div>
                <div className="text-center p-4 bg-dark-700/50 rounded-xl">
                  <div className={`flex items-center justify-center gap-1 mb-1 ${optimizationResult.tradeOffAnalysis.efficiencyChange >= 0 ? 'text-accent-400' : 'text-warning-400'}`}>
                    {optimizationResult.tradeOffAnalysis.efficiencyChange >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                    <span className="text-sm">加工效率</span>
                  </div>
                  <div className={`text-2xl font-bold font-display ${optimizationResult.tradeOffAnalysis.efficiencyChange >= 0 ? 'text-white' : 'text-warning-400'}`}>
                    {optimizationResult.tradeOffAnalysis.efficiencyChange >= 0 ? '+' : ''}{optimizationResult.tradeOffAnalysis.efficiencyChange.toFixed(1)}%
                  </div>
                  <div className="text-xs text-dark-500">MRR 变化</div>
                </div>
                <div className="text-center p-4 bg-dark-700/50 rounded-xl">
                  <div className={`flex items-center justify-center gap-1 mb-1 ${optimizationResult.tradeOffAnalysis.toolWearChange <= 0 ? 'text-accent-400' : 'text-warning-400'}`}>
                    {optimizationResult.tradeOffAnalysis.toolWearChange <= 0 ? <TrendingDown className="w-4 h-4" /> : <TrendingUp className="w-4 h-4" />}
                    <span className="text-sm">刀具磨损</span>
                  </div>
                  <div className={`text-2xl font-bold font-display ${optimizationResult.tradeOffAnalysis.toolWearChange <= 0 ? 'text-white' : 'text-warning-400'}`}>
                    {optimizationResult.tradeOffAnalysis.toolWearChange <= 0 ? '' : '+'}{optimizationResult.tradeOffAnalysis.toolWearChange.toFixed(1)}%
                  </div>
                  <div className="text-xs text-dark-500">预估变化</div>
                </div>
              </div>

              <div className="p-4 bg-gradient-to-r from-primary-500/10 to-accent-500/10 border border-primary-500/20 rounded-xl">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-dark-300">综合优化评分</div>
                    <div className="text-3xl font-bold text-white font-display mt-1">
                      {optimizationResult.predictedImprovement.toFixed(1)}
                      <span className="text-lg text-accent-400 ml-1">分</span>
                    </div>
                  </div>
                  <div className="w-16 h-16 rounded-full border-4 border-accent-400 flex items-center justify-center">
                    <Zap className="w-8 h-8 text-accent-400" />
                  </div>
                </div>
              </div>

              <button
                onClick={handleApplyOptimization}
                className="w-full btn-accent flex items-center justify-center gap-2"
              >
                应用优化参数
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </motion.div>
      </div>

      {recommendations.length > 0 && (
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="glass-card p-6"
        >
          <h3 className="text-lg font-semibold text-white mb-4">优化建议</h3>
          <div className="space-y-3">
            {recommendations.map((rec, i) => (
              <motion.div
                key={i}
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.4 + i * 0.1 }}
                className="flex items-start gap-3 p-4 bg-dark-700/30 rounded-xl"
              >
                {rec.includes('警告') ? (
                  <AlertTriangle className="w-5 h-5 text-warning-400 flex-shrink-0 mt-0.5" />
                ) : (
                  <CheckCircle className="w-5 h-5 text-accent-400 flex-shrink-0 mt-0.5" />
                )}
                <p className="text-sm text-dark-200">{rec}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {optimizationResult && optimizationResult.paretoFront.length > 0 && (
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="glass-card p-6"
        >
          <h3 className="text-lg font-semibold text-white mb-4">Pareto 最优解集</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-dark-400 border-b border-dark-700">
                  <th className="pb-3 font-medium">方案</th>
                  <th className="pb-3 font-medium">Ra (μm)</th>
                  <th className="pb-3 font-medium">效率</th>
                  <th className="pb-3 font-medium">刀具磨损</th>
                  <th className="pb-3 font-medium">进给速度</th>
                  <th className="pb-3 font-medium">切削深度</th>
                </tr>
              </thead>
              <tbody>
                {optimizationResult.paretoFront.slice(0, 6).map((item, i) => (
                  <tr key={i} className="border-b border-dark-700/50 hover:bg-dark-700/20 transition-colors">
                    <td className="py-3">
                      <span className="badge bg-primary-500/20 text-primary-300 border-primary-500/30">
                        方案 {i + 1}
                      </span>
                    </td>
                    <td className="py-3 font-mono text-white">{item.roughness.toFixed(3)}</td>
                    <td className="py-3 font-mono text-accent-400">{item.efficiency.toFixed(2)}</td>
                    <td className="py-3 font-mono text-warning-400">{item.toolWear.toFixed(3)}</td>
                    <td className="py-3 font-mono text-dark-300">{item.params.feedRate.toFixed(0)} mm/min</td>
                    <td className="py-3 font-mono text-dark-300">{item.params.depthOfCut.toFixed(1)} μm</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}
    </div>
  );
}
