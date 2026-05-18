'use client';

import { motion } from 'framer-motion';
import { Target, AlertTriangle, CheckCircle, TrendingUp, Info } from 'lucide-react';
import type { RoughnessPrediction } from '@/types';

interface PredictionResultProps {
  prediction: RoughnessPrediction;
  actualRa?: number;
}

export function PredictionResult({ prediction, actualRa }: PredictionResultProps) {
  const { predictedRa, predictedRz, predictedRq, confidence, confidenceInterval, processingParams } = prediction;

  const getStatus = (value: number, max: number) => {
    if (value <= max * 0.75) return { color: 'text-accent-400', bg: 'bg-accent-500/20', status: '优' };
    if (value <= max) return { color: 'text-primary-400', bg: 'bg-primary-500/20', status: '良' };
    if (value <= max * 1.2) return { color: 'text-warning-400', bg: 'bg-warning-500/20', status: '警告' };
    return { color: 'text-red-400', bg: 'bg-red-500/20', status: '不合格' };
  };

  const raStatus = getStatus(predictedRa, 1.6);
  const accuracy = actualRa ? (1 - Math.abs(predictedRa - actualRa) / predictedRa) * 100 : null;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="glass-card p-4 text-center"
        >
          <div className="text-xs text-dark-400 mb-1">预测 Ra</div>
          <div className={`text-3xl font-bold font-display ${raStatus.color}`}>
            {predictedRa.toFixed(3)}
          </div>
          <div className="text-xs text-dark-500 mt-1">μm</div>
          <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs mt-2 ${raStatus.bg} ${raStatus.color}`}>
            {raStatus.status === '优' ? <CheckCircle className="w-3 h-3" /> : raStatus.status === '警告' ? <AlertTriangle className="w-3 h-3" /> : <Target className="w-3 h-3" />}
            {raStatus.status}
          </div>
        </motion.div>

        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="glass-card p-4 text-center"
        >
          <div className="text-xs text-dark-400 mb-1">预测 Rz</div>
          <div className="text-3xl font-bold font-display text-primary-400">
            {predictedRz.toFixed(2)}
          </div>
          <div className="text-xs text-dark-500 mt-1">μm</div>
          <div className="text-xs text-dark-500 mt-2">10点高度</div>
        </motion.div>

        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="glass-card p-4 text-center"
        >
          <div className="text-xs text-dark-400 mb-1">预测 Rq</div>
          <div className="text-3xl font-bold font-display text-accent-400">
            {predictedRq.toFixed(3)}
          </div>
          <div className="text-xs text-dark-500 mt-1">μm</div>
          <div className="text-xs text-dark-500 mt-2">均方根粗糙度</div>
        </motion.div>
      </div>

      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="glass-card p-5"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-white">预测置信度分析</h3>
          <div className="flex items-center gap-2 text-xs text-dark-400">
            <Info className="w-4 h-4" />
            模型版本: {prediction.modelVersion}
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-dark-400">置信度</span>
              <span className="text-accent-400 font-medium">{(confidence * 100).toFixed(1)}%</span>
            </div>
            <div className="h-3 bg-dark-700 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${confidence * 100}%` }}
                transition={{ delay: 0.5, duration: 1, ease: 'easeOut' }}
                className="h-full bg-gradient-to-r from-primary-500 to-accent-500 rounded-full"
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-dark-400">预测区间</span>
              <span className="text-dark-200">
                [{confidenceInterval[0].toFixed(3)}, {confidenceInterval[1].toFixed(3)}] μm
              </span>
            </div>
            <div className="relative h-8 bg-dark-700/50 rounded-lg">
              <div className="absolute inset-y-0 bg-gradient-to-r from-primary-500/30 via-accent-500/30 to-primary-500/30 rounded-lg"
                style={{
                  left: `${(confidenceInterval[0] / 5) * 100}%`,
                  right: `${100 - (confidenceInterval[1] / 5) * 100}%`
                }}
              />
              <div className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-accent-400 rounded-full shadow-lg shadow-accent-500/50"
                style={{ left: `${(predictedRa / 5) * 100}%`, transform: 'translate(-50%, -50%)' }}
              />
              {actualRa && (
                <div className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-warning-400 rounded-full"
                  style={{ left: `${(actualRa / 5) * 100}%`, transform: 'translate(-50%, -50%)' }}
                />
              )}
            </div>
            <div className="flex justify-between text-xs text-dark-500 mt-1">
              <span>0</span>
              <span>预测值</span>
              {actualRa && <span className="text-warning-400">实测值</span>}
              <span>5 μm</span>
            </div>
          </div>

          {accuracy !== null && (
            <div className="flex items-center justify-between p-3 bg-dark-700/50 rounded-lg">
              <span className="text-sm text-dark-300">预测准确率</span>
              <span className={`text-lg font-bold ${accuracy > 90 ? 'text-accent-400' : accuracy > 80 ? 'text-primary-400' : 'text-warning-400'}`}>
                {accuracy.toFixed(1)}%
              </span>
            </div>
          )}
        </div>
      </motion.div>

      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="glass-card p-5"
      >
        <h3 className="text-sm font-semibold text-white mb-4">加工参数</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[
            { label: '进给速度', value: processingParams.feedRate, unit: 'mm/min' },
            { label: '主轴转速', value: processingParams.spindleSpeed, unit: 'rpm' },
            { label: '切削深度', value: processingParams.depthOfCut, unit: 'μm' },
            { label: '砂轮线速', value: processingParams.grindingWheelSpeed, unit: 'm/s' },
            { label: '冷却压力', value: processingParams.coolantPressure, unit: 'MPa' },
          ].map((param, i) => (
            <div key={param.label} className="text-center">
              <div className="text-xs text-dark-400 mb-1">{param.label}</div>
              <div className="text-lg font-semibold text-white">{param.value}</div>
              <div className="text-xs text-dark-500">{param.unit}</div>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
