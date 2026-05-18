'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Activity, AlertTriangle, BarChart3, Zap, Thermometer, TrendingUp, Cpu } from 'lucide-react';
import { useMonitoringStore } from '@/store';
import WaveformChart from '@/components/WaveformChart';
import StatusIndicator from '@/components/StatusIndicator';
import { extractWaveformFeatures } from '@/lib/simulation';
import type { WeldPoint } from '@/types';

export default function AnalysisPage() {
  const { recentWeldPoints } = useMonitoringStore();
  const [selectedPoint, setSelectedPoint] = useState<WeldPoint | null>(null);
  const [analysisResult, setAnalysisResult] = useState<any>(null);

  useEffect(() => {
    if (recentWeldPoints.length > 0 && !selectedPoint) {
      setSelectedPoint(recentWeldPoints[0]);
    }
  }, [recentWeldPoints, selectedPoint]);

  useEffect(() => {
    if (selectedPoint) {
      const tempFeatures = extractWaveformFeatures(selectedPoint.poolTemperature);
      const currentFeatures = extractWaveformFeatures(selectedPoint.current);
      const voltageFeatures = extractWaveformFeatures(selectedPoint.voltage);
      
      setAnalysisResult({
        temperature: tempFeatures,
        current: currentFeatures,
        voltage: voltageFeatures,
        overallScore: selectedPoint.stabilityIndex,
        defectProbability: selectedPoint.defectRisk === 'high' ? 85 : selectedPoint.defectRisk === 'medium' ? 45 : 15,
        recommendations: generateRecommendations(selectedPoint),
      });
    }
  }, [selectedPoint]);

  function generateRecommendations(point: WeldPoint): string[] {
    const recs: string[] = [];
    
    if (point.defectRisk === 'high') {
      recs.push('立即暂停当前焊接程序，检查设备状态');
      recs.push('检查气体保护是否正常，确认喷嘴清洁');
      recs.push('验证焊接参数设置是否符合工艺要求');
      if (point.defectType) {
        recs.push(`检测到${point.defectType}缺陷风险，建议进行破坏性测试验证`);
      }
    } else if (point.defectRisk === 'medium') {
      recs.push('密切关注后续焊点质量趋势');
      recs.push('考虑适当降低焊接速度');
      recs.push('检查焊丝送丝稳定性');
    } else {
      recs.push('焊接参数稳定，继续保持当前工艺');
      recs.push('建议定期进行设备维护保养');
    }
    
    return recs;
  }

  const riskColors = {
    low: 'from-tech-green/20 to-tech-green/5 text-tech-green',
    medium: 'from-tech-yellow/20 to-tech-yellow/5 text-tech-yellow',
    high: 'from-tech-red/20 to-tech-red/5 text-tech-red',
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">波形分析中心</h1>
        <p className="text-gray-400 mt-1">异步波动特征解析引擎 - 焊点成形过程模拟与缺陷风险评估</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-industrial-900/50 rounded-xl border border-industrial-800 p-4 h-[calc(100vh-140px)] overflow-hidden flex flex-col"
          >
            <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
              <Activity size={16} className="text-tech-cyan" />
              焊点列表
            </h3>
            <div className="flex-1 overflow-y-auto space-y-2">
              {recentWeldPoints.length === 0 ? (
                <div className="text-center py-8">
                  <Activity className="w-10 h-10 text-gray-600 mx-auto mb-2" />
                  <p className="text-gray-500 text-sm">暂无焊点数据</p>
                  <p className="text-gray-600 text-xs mt-1">请先启动监控</p>
                </div>
              ) : (
                recentWeldPoints.slice(0, 30).map((point, index) => (
                  <button
                    key={point.id}
                    onClick={() => setSelectedPoint(point)}
                    className={`w-full text-left p-3 rounded-lg transition-all ${
                      selectedPoint?.id === point.id
                        ? 'bg-industrial-700 border border-tech-cyan/30'
                        : 'bg-industrial-800/50 hover:bg-industrial-800 border border-transparent'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-400 font-mono">#{index + 1}</span>
                      <StatusIndicator status={point.defectRisk} size="sm" />
                    </div>
                    <p className="text-sm text-white font-mono mt-1">{point.weldProgram}</p>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-xs text-gray-500">{point.robotId}</span>
                      <span className="text-xs text-tech-cyan font-mono">
                        {point.stabilityIndex.toFixed(0)}%
                      </span>
                    </div>
                  </button>
                ))
              )}
            </div>
          </motion.div>
        </div>

        <div className="lg:col-span-3 space-y-6">
          {selectedPoint && analysisResult ? (
            <>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-industrial-900/50 rounded-xl border border-industrial-800 p-5"
              >
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                      <Cpu className="text-tech-cyan" size={20} />
                      焊点详情分析
                    </h3>
                    <p className="text-sm text-gray-400 mt-1">
                      {selectedPoint.robotId} · {selectedPoint.weldProgram} · {new Date(selectedPoint.timestamp).toLocaleString('zh-CN')}
                    </p>
                  </div>
                  <div className={`px-4 py-2 rounded-lg bg-gradient-to-r ${riskColors[selectedPoint.defectRisk]}`}>
                    <StatusIndicator status={selectedPoint.defectRisk} label />
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
                  <div className="text-center p-3 bg-industrial-800/50 rounded-lg">
                    <p className="text-xs text-gray-400">稳定性指数</p>
                    <p className="text-2xl font-bold text-tech-cyan font-mono mt-1">
                      {selectedPoint.stabilityIndex.toFixed(0)}%
                    </p>
                  </div>
                  <div className="text-center p-3 bg-industrial-800/50 rounded-lg">
                    <p className="text-xs text-gray-400">缺陷概率</p>
                    <p className={`text-2xl font-bold font-mono mt-1 ${
                      analysisResult.defectProbability > 60 ? 'text-tech-red' : 
                      analysisResult.defectProbability > 30 ? 'text-tech-yellow' : 'text-tech-green'
                    }`}>
                      {analysisResult.defectProbability}%
                    </p>
                  </div>
                  <div className="text-center p-3 bg-industrial-800/50 rounded-lg">
                    <p className="text-xs text-gray-400">峰值数量</p>
                    <p className="text-2xl font-bold text-white font-mono mt-1">
                      {analysisResult.temperature.peakCount}
                    </p>
                  </div>
                  <div className="text-center p-3 bg-industrial-800/50 rounded-lg">
                    <p className="text-xs text-gray-400">平均振幅</p>
                    <p className="text-2xl font-bold text-white font-mono mt-1">
                      {analysisResult.temperature.avgAmplitude.toFixed(1)}
                    </p>
                  </div>
                  <div className="text-center p-3 bg-industrial-800/50 rounded-lg">
                    <p className="text-xs text-gray-400">频率</p>
                    <p className="text-2xl font-bold text-white font-mono mt-1">
                      {analysisResult.temperature.frequency.toFixed(2)}
                    </p>
                  </div>
                </div>

                {selectedPoint.defectType && (
                  <div className="mb-4 p-3 bg-tech-red/10 border border-tech-red/30 rounded-lg">
                    <div className="flex items-center gap-2 text-tech-red">
                      <AlertTriangle size={16} />
                      <span className="font-medium">检测到潜在缺陷类型: {selectedPoint.defectType}</span>
                    </div>
                  </div>
                )}
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="space-y-4"
              >
                <div className="bg-industrial-900/50 rounded-xl border border-industrial-800 p-5">
                  <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                    <Thermometer size={16} className="text-tech-red" />
                    熔池温度波形
                  </h3>
                  <WaveformChart
                    data={selectedPoint.poolTemperature}
                    color="#FF6B6B"
                    label="温度波动特征"
                    unit="°C"
                    height={180}
                  />
                  <div className="grid grid-cols-3 gap-4 mt-4">
                    <div className="text-sm">
                      <span className="text-gray-500">上升时间:</span>
                      <span className="text-white font-mono ml-2">{analysisResult.temperature.riseTime.toFixed(1)}ms</span>
                    </div>
                    <div className="text-sm">
                      <span className="text-gray-500">衰减时间:</span>
                      <span className="text-white font-mono ml-2">{analysisResult.temperature.decayTime.toFixed(1)}ms</span>
                    </div>
                    <div className="text-sm">
                      <span className="text-gray-500">谐波特征:</span>
                      <span className="text-white font-mono ml-2">
                        {analysisResult.temperature.harmonics.map((h: number) => h.toFixed(1)).join(', ')}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-industrial-900/50 rounded-xl border border-industrial-800 p-5">
                    <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                      <Zap size={16} className="text-tech-cyan" />
                      焊接电流波形
                    </h3>
                    <WaveformChart
                      data={selectedPoint.current}
                      color="#00D4FF"
                      label="电流波动"
                      unit="A"
                      height={140}
                    />
                  </div>

                  <div className="bg-industrial-900/50 rounded-xl border border-industrial-800 p-5">
                    <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                      <TrendingUp size={16} className="text-tech-green" />
                      电弧电压波形
                    </h3>
                    <WaveformChart
                      data={selectedPoint.voltage}
                      color="#2ED573"
                      label="电压波动"
                      unit="V"
                      height={140}
                    />
                  </div>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-industrial-900/50 rounded-xl border border-industrial-800 p-5"
              >
                <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                  <BarChart3 size={16} className="text-tech-yellow" />
                  特征谐波分析
                </h3>
                <div className="grid grid-cols-5 gap-4">
                  {analysisResult.temperature.harmonics.map((harmonic: number, index: number) => (
                    <div key={index} className="text-center">
                      <div className="text-xs text-gray-400 mb-2">H{index + 1}</div>
                      <div className="h-24 flex items-end justify-center">
                        <motion.div
                          initial={{ height: 0 }}
                          animate={{ height: `${Math.min(harmonic * 2, 100)}%` }}
                          className="w-8 bg-gradient-to-t from-tech-cyan to-tech-cyan/30 rounded-t"
                        />
                      </div>
                      <div className="text-xs text-white font-mono mt-2">{harmonic.toFixed(2)}</div>
                    </div>
                  ))}
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-industrial-900/50 rounded-xl border border-industrial-800 p-5"
              >
                <h3 className="text-sm font-semibold text-white mb-4">AI 诊断建议</h3>
                <div className="space-y-2">
                  {analysisResult.recommendations.map((rec: string, index: number) => (
                    <div
                      key={index}
                      className="flex items-start gap-3 p-3 bg-industrial-800/50 rounded-lg"
                    >
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-industrial-700 flex items-center justify-center text-xs text-tech-cyan font-medium">
                        {index + 1}
                      </span>
                      <p className="text-sm text-gray-300">{rec}</p>
                    </div>
                  ))}
                </div>
              </motion.div>
            </>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-industrial-900/50 rounded-xl border border-industrial-800 p-12 text-center"
            >
              <Activity className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">选择焊点进行分析</h3>
              <p className="text-gray-400">从左侧列表选择一个焊点，查看详细的波形特征分析和缺陷风险评估</p>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
