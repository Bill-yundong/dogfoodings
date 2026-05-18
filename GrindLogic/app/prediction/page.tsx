'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { LineChart, Play, Pause, RefreshCw, Download, Zap } from 'lucide-react';
import { PowerSpectrumChart } from '@/components/PowerSpectrumChart';
import { FractalRadarChart } from '@/components/FractalRadarChart';
import { PredictionResult } from '@/components/PredictionResult';
import { useAppStore } from '@/store';
import { generatePowerSpectrumData } from '@/lib/mock';
import { extractPowerSpectrumFeatures } from '@/lib/fractal';
import { predictRoughness } from '@/lib/prediction';
import type { FractalFeatures, StatisticalFeatures } from '@/types';

export default function PredictionPage() {
  const { currentParams, latestPrediction, setLatestPrediction, realtimeData } = useAppStore();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [fractalFeatures, setFractalFeatures] = useState<FractalFeatures | null>(null);
  const [statisticalFeatures, setStatisticalFeatures] = useState<StatisticalFeatures | null>(null);
  const [analysisHistory, setAnalysisHistory] = useState<Array<{
    id: string;
    timestamp: number;
    ra: number;
    confidence: number;
  }>>([]);

  useEffect(() => {
    if (realtimeData.length > 100) {
      handleAnalyze();
    }
  }, []);

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    setAnalysisProgress(0);

    const data = realtimeData.length > 100 ? realtimeData.slice(-500) : generatePowerSpectrumData(5, 200);

    for (let i = 0; i <= 100; i += 5) {
      await new Promise((resolve) => setTimeout(resolve, 50));
      setAnalysisProgress(i);
    }

    const { fractal, statistical } = extractPowerSpectrumFeatures(data);
    setFractalFeatures(fractal);
    setStatisticalFeatures(statistical);

    const prediction = predictRoughness(fractal, statistical, currentParams);
    setLatestPrediction(prediction);

    setAnalysisHistory((prev) => [
      {
        id: prediction.id,
        timestamp: Date.now(),
        ra: prediction.predictedRa,
        confidence: prediction.confidence,
      },
      ...prev.slice(0, 9),
    ]);

    setIsAnalyzing(false);
  };

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-2xl font-bold text-white font-display">粗糙度预测中心</h1>
          <p className="text-dark-400 mt-1">基于分形几何分析的表面粗糙度AI预测</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleAnalyze}
            disabled={isAnalyzing}
            className="btn-primary flex items-center gap-2 disabled:opacity-50"
          >
            {isAnalyzing ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                分析中 {analysisProgress}%
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                执行预测分析
              </>
            )}
          </button>
        </div>
      </motion.div>

      {isAnalyzing && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="glass-card p-5"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-dark-300">特征提取进度</span>
            <span className="text-sm text-accent-400 font-mono">{analysisProgress}%</span>
          </div>
          <div className="progress-bar">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${analysisProgress}%` }}
              className="progress-fill"
            />
          </div>
          <div className="flex justify-between text-xs text-dark-500 mt-2">
            <span>功率谱数据预处理</span>
            <span>分形特征提取</span>
            <span>统计特征计算</span>
            <span>AI模型预测</span>
          </div>
        </motion.div>
      )}

      {fractalFeatures && statisticalFeatures && !isAnalyzing && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="lg:col-span-2 glass-card p-5"
          >
            <h2 className="text-lg font-semibold text-white mb-4">功率谱数据</h2>
            <PowerSpectrumChart data={realtimeData.length > 100 ? realtimeData.slice(-500) : generatePowerSpectrumData(5, 200)} height={300} showControls={false} />
          </motion.div>

          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="glass-card p-5"
          >
            <FractalRadarChart features={fractalFeatures} height={300} />
          </motion.div>
        </div>
      )}

      {fractalFeatures && (
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="glass-card p-5"
        >
          <h3 className="text-sm font-semibold text-white mb-4">分形特征参数详情</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {[
              { label: '盒维数', value: fractalFeatures.boxDimension, desc: '表面复杂度' },
              { label: '信息维数', value: fractalFeatures.informationDimension, desc: '信息分布' },
              { label: '关联维数', value: fractalFeatures.correlationDimension, desc: '相关性' },
              { label: '间隙度', value: fractalFeatures.lacunarity, desc: '纹理均匀性' },
              { label: 'Hurst指数', value: fractalFeatures.hurstExponent, desc: '长程相关性' },
              { label: '多重分形谱', value: fractalFeatures.multifractalSpectrum[3] || 1, desc: '奇异性' },
            ].map((feature) => (
              <div key={feature.label} className="text-center p-3 bg-dark-700/30 rounded-xl">
                <div className="text-xs text-dark-400 mb-1">{feature.label}</div>
                <div className="text-xl font-bold text-white font-display">{feature.value.toFixed(3)}</div>
                <div className="text-xs text-dark-500 mt-1">{feature.desc}</div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {statisticalFeatures && (
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="glass-card p-5"
        >
          <h3 className="text-sm font-semibold text-white mb-4">统计特征参数</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: '均值', value: statisticalFeatures.mean },
              { label: '方差', value: statisticalFeatures.variance },
              { label: '偏度', value: statisticalFeatures.skewness },
              { label: '峭度', value: statisticalFeatures.kurtosis },
              { label: '均方根', value: statisticalFeatures.rms },
              { label: '峰值因子', value: statisticalFeatures.crestFactor },
              { label: '脉冲因子', value: statisticalFeatures.impulseFactor },
              { label: '裕度因子', value: statisticalFeatures.marginFactor },
            ].map((feature) => (
              <div key={feature.label} className="flex items-center justify-between p-3 bg-dark-700/30 rounded-xl">
                <span className="text-sm text-dark-400">{feature.label}</span>
                <span className="text-lg font-semibold text-white font-mono">{feature.value.toFixed(4)}</span>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {latestPrediction && (
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <h2 className="text-lg font-semibold text-white mb-4">预测结果</h2>
          <PredictionResult prediction={latestPrediction} />
        </motion.div>
      )}

      {analysisHistory.length > 0 && (
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="glass-card p-5"
        >
          <h3 className="text-sm font-semibold text-white mb-4">预测历史</h3>
          <div className="space-y-2">
            {analysisHistory.map((item, i) => (
              <div key={item.id} className="flex items-center justify-between p-3 bg-dark-700/30 rounded-xl hover:bg-dark-700/50 transition-colors">
                <div className="flex items-center gap-4">
                  <Zap className="w-4 h-4 text-accent-400" />
                  <div>
                    <div className="text-sm text-white">#{i + 1} 预测</div>
                    <div className="text-xs text-dark-500">{new Date(item.timestamp).toLocaleString()}</div>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <div className="text-sm text-white font-mono">{item.ra.toFixed(3)} μm</div>
                    <div className="text-xs text-dark-500">预测 Ra</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-accent-400 font-mono">{(item.confidence * 100).toFixed(1)}%</div>
                    <div className="text-xs text-dark-500">置信度</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}
