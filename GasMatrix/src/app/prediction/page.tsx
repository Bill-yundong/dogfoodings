'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  LineChart,
  Database,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Clock,
  Play,
  RefreshCw,
} from 'lucide-react';
import ReactECharts from 'echarts-for-react';
import Layout from '@/components/Layout';
import { useGasMatrixStore } from '@/store';
import {
  predictPressureTrend,
  generatePeakingScheme,
  calculateQuasi1DFlow,
  formatPressure,
} from '@/lib/flowModel';
import { mockPipeSegments } from '@/lib/mockData';
import { cn, formatTimestamp } from '@/utils';

export default function PredictionPage() {
  const { stations, pressureData, totalStorage, calculateTotalStorage } = useGasMatrixStore();
  const [selectedStation, setSelectedStation] = useState(stations[0]?.id || '');
  const [predictionHours, setPredictionHours] = useState(24);
  const [predictions, setPredictions] = useState<any[]>([]);
  const [isCalculating, setIsCalculating] = useState(false);
  const [flowModelResult, setFlowModelResult] = useState<any>(null);
  const [peakingScheme, setPeakingScheme] = useState<any[]>([]);

  useEffect(() => {
    calculateTotalStorage();
  }, [calculateTotalStorage]);

  const handleCalculatePrediction = () => {
    setIsCalculating(true);

    setTimeout(() => {
      const historicalData = [];
      const now = Date.now();
      for (let i = 100; i >= 0; i--) {
        const basePressure = pressureData[selectedStation] || 300000;
        historicalData.push({
          timestamp: now - i * 900000,
          pressure: basePressure * (0.95 + Math.random() * 0.1),
          flow: 100 + Math.random() * 50,
        });
      }

      const result = predictPressureTrend(historicalData, predictionHours);
      setPredictions(result);

      const testSegment = mockPipeSegments[0];
      const modelResult = calculateQuasi1DFlow(
        testSegment,
        pressureData[testSegment.fromStation] || 300000,
        pressureData[testSegment.toStation] || 300000
      );
      setFlowModelResult(modelResult);

      const scheme = generatePeakingScheme(stations, pressureData, 5000);
      setPeakingScheme(scheme);

      setIsCalculating(false);
    }, 1500);
  };

  useEffect(() => {
    if (selectedStation) {
      handleCalculatePrediction();
    }
  }, [selectedStation, predictionHours]);

  const predictionChartOption = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(16, 42, 67, 0.9)',
      borderColor: '#334e68',
      textStyle: { color: '#d9e2ec' },
      formatter: (params: any) => {
        const data = params[0];
        const pred = predictions[data.dataIndex];
        if (!pred) return '';
        return `
          <div style="padding: 8px;">
            <div style="margin-bottom: 4px;">${new Date(pred.timestamp).toLocaleString('zh-CN')}</div>
            <div>预测压力: <b>${formatPressure(pred.predictedPressure, 'kPa')}</b></div>
            <div>置信度: <b>${(pred.confidence * 100).toFixed(0)}%</b></div>
            <div>区间: ${formatPressure(pred.lowerBound, 'kPa')} ~ ${formatPressure(pred.upperBound, 'kPa')}</div>
          </div>
        `;
      },
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      top: '10%',
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      data: predictions.map((p) =>
        new Date(p.timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
      ),
      axisLine: { lineStyle: { color: '#334e68' } },
      axisLabel: { color: '#829ab1', fontSize: 10 },
    },
    yAxis: {
      type: 'value',
      axisLine: { lineStyle: { color: '#334e68' } },
      axisLabel: {
        color: '#829ab1',
        fontSize: 10,
        formatter: (value: number) => (value / 1000).toFixed(0) + 'k',
      },
      splitLine: { lineStyle: { color: '#243b53' } },
    },
    series: [
      {
        name: '压力上限',
        type: 'line',
        data: predictions.map((p) => p.upperBound),
        lineStyle: { opacity: 0 },
        stack: 'confidence',
        areaStyle: {
          color: 'rgba(0, 212, 255, 0.1)',
        },
        symbol: 'none',
      },
      {
        name: '压力下限',
        type: 'line',
        data: predictions.map((p) => p.lowerBound),
        lineStyle: { opacity: 0 },
        stack: 'confidence',
        areaStyle: {
          color: 'rgba(10, 22, 40, 0.8)',
        },
        symbol: 'none',
      },
      {
        name: '预测压力',
        type: 'line',
        data: predictions.map((p) => p.predictedPressure),
        smooth: true,
        lineStyle: { color: '#00D4FF', width: 2, type: 'dashed' },
        itemStyle: { color: '#00D4FF' },
        symbol: 'circle',
        symbolSize: 4,
      },
    ],
  };

  const getStationName = (id: string) => {
    return stations.find((s) => s.id === id)?.name || id;
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-dark-100">管存预测分析</h1>
            <p className="text-sm text-dark-400 mt-1">
              基于异步非稳态准一维流模型的管存预测与调峰方案优化
            </p>
          </div>
          <button
            onClick={handleCalculatePrediction}
            disabled={isCalculating}
            className="btn-primary flex items-center gap-2 disabled:opacity-50"
          >
            <RefreshCw className={cn('w-4 h-4', isCalculating && 'animate-spin')} />
            {isCalculating ? '计算中...' : '重新计算'}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card p-6"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-primary-500/20 flex items-center justify-center">
                <Database className="w-5 h-5 text-primary-400" />
              </div>
              <div>
                <p className="text-sm text-dark-400">当前管存</p>
                <p className="text-2xl font-bold font-mono text-primary-400">
                  {(totalStorage / 1000).toFixed(1)}
                  <span className="text-sm font-normal text-dark-400 ml-1">t</span>
                </p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="glass-card p-6"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-success-500/20 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-success-400" />
              </div>
              <div>
                <p className="text-sm text-dark-400">预测增长</p>
                <p className="text-2xl font-bold font-mono text-success-400">
                  +8.2
                  <span className="text-sm font-normal text-dark-400 ml-1">%</span>
                </p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="glass-card p-6"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-warning-500/20 flex items-center justify-center">
                <Clock className="w-5 h-5 text-warning-400" />
              </div>
              <div>
                <p className="text-sm text-dark-400">预测周期</p>
                <p className="text-2xl font-bold font-mono text-warning-400">
                  {predictionHours}
                  <span className="text-sm font-normal text-dark-400 ml-1">h</span>
                </p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="glass-card p-6"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-primary-500/20 flex items-center justify-center">
                <LineChart className="w-5 h-5 text-primary-400" />
              </div>
              <div>
                <p className="text-sm text-dark-400">调峰方案</p>
                <p className="text-2xl font-bold font-mono text-primary-400">
                  {peakingScheme.filter((s) => s.priority <= 3).length}
                  <span className="text-sm font-normal text-dark-400 ml-1">项</span>
                </p>
              </div>
            </div>
          </motion.div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 glass-card p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="section-title mb-0">
                <LineChart className="w-5 h-5 text-primary-400" />
                压力趋势预测
              </h3>
              <div className="flex items-center gap-4">
                <select
                  value={selectedStation}
                  onChange={(e) => setSelectedStation(e.target.value)}
                  className="input-field w-48"
                >
                  {stations.map((station) => (
                    <option key={station.id} value={station.id}>
                      {station.name}
                    </option>
                  ))}
                </select>
                <select
                  value={predictionHours}
                  onChange={(e) => setPredictionHours(Number(e.target.value))}
                  className="input-field w-32"
                >
                  <option value={12}>12 小时</option>
                  <option value={24}>24 小时</option>
                  <option value={48}>48 小时</option>
                  <option value={72}>72 小时</option>
                </select>
              </div>
            </div>
            <div className="h-[350px]">
              {isCalculating ? (
                <div className="h-full flex items-center justify-center">
                  <div className="text-center">
                    <RefreshCw className="w-8 h-8 mx-auto mb-2 text-primary-400 animate-spin" />
                    <p className="text-dark-400">正在执行准一维流模型计算...</p>
                  </div>
                </div>
              ) : (
                <ReactECharts option={predictionChartOption} style={{ height: '100%' }} />
              )}
            </div>
          </div>

          <div className="glass-card p-6">
            <h3 className="section-title">
              <Database className="w-5 h-5 text-primary-400" />
              准一维流模型结果
            </h3>
            {flowModelResult && (
              <div className="space-y-4">
                <div className="bg-dark-800/50 rounded-lg p-4">
                  <p className="text-sm text-dark-400 mb-1">雷诺数 (Re)</p>
                  <p className="text-xl font-mono text-primary-400">
                    {flowModelResult.ReynoldsNumber.toExponential(2)}
                  </p>
                </div>
                <div className="bg-dark-800/50 rounded-lg p-4">
                  <p className="text-sm text-dark-400 mb-1">摩擦系数 (f)</p>
                  <p className="text-xl font-mono text-primary-400">
                    {flowModelResult.frictionFactor.toFixed(6)}
                  </p>
                </div>
                <div className="bg-dark-800/50 rounded-lg p-4">
                  <p className="text-sm text-dark-400 mb-1">管段容积</p>
                  <p className="text-xl font-mono text-success-400">
                    {(flowModelResult.storageVolume / 1000).toFixed(2)} m³
                  </p>
                </div>
                <div className="bg-dark-800/50 rounded-lg p-4">
                  <p className="text-sm text-dark-400 mb-1">管段质量</p>
                  <p className="text-xl font-mono text-warning-400">
                    {(flowModelResult.storageMass / 1000).toFixed(2)} t
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="glass-card p-6">
          <h3 className="section-title">
            <Play className="w-5 h-5 text-primary-400" />
            智能调峰方案推荐
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-sm text-dark-400 border-b border-dark-700">
                  <th className="pb-3 font-medium">优先级</th>
                  <th className="pb-3 font-medium">调压站</th>
                  <th className="pb-3 font-medium">当前压力</th>
                  <th className="pb-3 font-medium">目标压力</th>
                  <th className="pb-3 font-medium">调整幅度</th>
                  <th className="pb-3 font-medium">状态</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {peakingScheme.map((item, index) => {
                  const currentPressure = pressureData[item.stationId] || 0;
                  const diff = item.targetPressure - currentPressure;
                  const diffPercent = ((diff / currentPressure) * 100).toFixed(1);

                  return (
                    <tr key={item.stationId} className="border-b border-dark-800">
                      <td className="py-3">
                        <span
                          className={cn(
                            'px-2 py-1 rounded text-xs',
                            item.priority === 1 && 'bg-danger-500/20 text-danger-400',
                            item.priority === 2 && 'bg-warning-500/20 text-warning-400',
                            item.priority === 3 && 'bg-primary-500/20 text-primary-400',
                            item.priority > 3 && 'bg-dark-700 text-dark-400'
                          )}
                        >
                          {item.priority === 1
                            ? '紧急'
                            : item.priority === 2
                            ? '高'
                            : item.priority === 3
                            ? '中'
                            : '低'}
                        </span>
                      </td>
                      <td className="py-3 font-medium text-dark-200">
                        {getStationName(item.stationId)}
                      </td>
                      <td className="py-3 font-mono text-dark-300">
                        {formatPressure(currentPressure, 'kPa')}
                      </td>
                      <td className="py-3 font-mono text-primary-400">
                        {formatPressure(item.targetPressure, 'kPa')}
                      </td>
                      <td className="py-3">
                        <span
                          className={cn(
                            'font-mono',
                            diff > 0 ? 'text-success-400' : 'text-danger-400'
                          )}
                        >
                          {diff > 0 ? '+' : ''}
                          {diffPercent}%
                        </span>
                      </td>
                      <td className="py-3">
                        <span className="flex items-center gap-1 text-warning-400">
                          <Clock className="w-4 h-4" />
                          待执行
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Layout>
  );
}
