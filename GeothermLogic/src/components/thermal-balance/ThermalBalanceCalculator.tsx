'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Calculator, AlertCircle, CheckCircle, TrendingUp, TrendingDown } from 'lucide-react';
import { calculateThermalBalance } from '@/lib/thermal-calculations';
import type { ThermalBalanceRequest, ThermalBalanceResponse } from '@/types';

export default function ThermalBalanceCalculator() {
  const [parameters, setParameters] = useState({
    groundThermalConductivity: 2.5,
    specificHeatCapacity: 4186,
    fluidFlowRate: 12.5,
    inletTemperature: 8.5,
    outletTemperature: 12.3,
  });
  const [result, setResult] = useState<ThermalBalanceResponse | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);

  const handleCalculate = async () => {
    setIsCalculating(true);
    await new Promise((resolve) => setTimeout(resolve, 800));

    const request: ThermalBalanceRequest = {
      boreholeId: 'demo',
      startDate: new Date().toISOString(),
      endDate: new Date().toISOString(),
      parameters,
    };

    const response = calculateThermalBalance(request);
    setResult(response);
    setIsCalculating(false);
  };

  const statusConfig = {
    stable: { icon: CheckCircle, color: 'text-green-500', bg: 'bg-green-500/20', border: 'border-green-500/30' },
    warning: { icon: AlertCircle, color: 'text-yellow-500', bg: 'bg-yellow-500/20', border: 'border-yellow-500/30' },
    critical: { icon: AlertCircle, color: 'text-red-500', bg: 'bg-red-500/20', border: 'border-red-500/30' },
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="bg-gray-800/50 rounded-xl border border-gray-700/50 p-6"
      >
        <div className="flex items-center gap-2 mb-6">
          <Calculator className="w-5 h-5 text-primary-500" />
          <h3 className="text-lg font-semibold text-white">参数设置</h3>
        </div>

        <div className="space-y-5">
          {Object.entries(parameters).map(([key, value]) => (
            <div key={key}>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                {key === 'groundThermalConductivity' && '土壤导热系数 (W/m·K)'}
                {key === 'specificHeatCapacity' && '流体比热容 (J/kg·K)'}
                {key === 'fluidFlowRate' && '流体流量 (m³/h)'}
                {key === 'inletTemperature' && '进水温度 (°C)'}
                {key === 'outletTemperature' && '出水温度 (°C)'}
              </label>
              <input
                type="number"
                step="0.1"
                value={value}
                onChange={(e) => setParameters((prev) => ({ ...prev, [key]: parseFloat(e.target.value) }))}
                className="w-full px-4 py-3 bg-gray-900/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
              />
            </div>
          ))}
        </div>

        <button
          onClick={handleCalculate}
          disabled={isCalculating}
          className="w-full mt-6 py-3 bg-primary-600 hover:bg-primary-700 disabled:bg-gray-700 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
        >
          {isCalculating ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <Calculator className="w-5 h-5" />
          )}
          {isCalculating ? '计算中...' : '开始计算'}
        </button>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        className="bg-gray-800/50 rounded-xl border border-gray-700/50 p-6"
      >
        <h3 className="text-lg font-semibold text-white mb-6">计算结果</h3>

        {result ? (
          <div className="space-y-6">
            {(() => {
              const StatusIcon = statusConfig[result.balanceStatus].icon;
              return (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className={`p-4 rounded-lg ${statusConfig[result.balanceStatus].bg} border ${statusConfig[result.balanceStatus].border}`}
            >
              <div className="flex items-center gap-3">
                <StatusIcon className={`w-8 h-8 ${statusConfig[result.balanceStatus].color}`} />
                <div>
                  <p className="text-lg font-semibold text-white">
                    {result.balanceStatus === 'stable' ? '系统稳定' : result.balanceStatus === 'warning' ? '需要关注' : '系统危险'}
                  </p>
                  <p className="text-sm text-gray-300">热平衡效率: {result.efficiency}%</p>
                </div>
              </div>
            </motion.div>
              );
            })()}

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-900/50 rounded-lg p-4">
                <div className="flex items-center gap-2 text-green-500 mb-2">
                  <TrendingUp className="w-4 h-4" />
                  <span className="text-sm">热提取率</span>
                </div>
                <p className="text-2xl font-bold text-white">{result.heatExtractionRate.toFixed(2)}</p>
                <p className="text-xs text-gray-500">kWh</p>
              </div>

              <div className="bg-gray-900/50 rounded-lg p-4">
                <div className="flex items-center gap-2 text-accent-500 mb-2">
                  <TrendingDown className="w-4 h-4" />
                  <span className="text-sm">热回灌率</span>
                </div>
                <p className="text-2xl font-bold text-white">{result.heatRejectionRate.toFixed(2)}</p>
                <p className="text-xs text-gray-500">kWh</p>
              </div>
            </div>

            <div className="bg-gray-900/50 rounded-lg p-4">
              <p className="text-sm text-gray-400 mb-2">净热平衡</p>
              <p className="text-3xl font-bold text-white">{result.netHeatBalance.toFixed(2)} kWh</p>
            </div>

            {result.recommendations.length > 0 && (
              <div>
                <p className="text-sm font-medium text-gray-300 mb-3">建议</p>
                <ul className="space-y-2">
                  {result.recommendations.map((rec, idx) => (
                    <motion.li
                      key={idx}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.1 }}
                      className="flex items-start gap-2 text-sm text-gray-300"
                    >
                      <span className="text-primary-500 mt-0.5">•</span>
                      {rec}
                    </motion.li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ) : (
          <div className="h-64 flex items-center justify-center text-gray-500">
            <p>请设置参数并点击计算</p>
          </div>
        )}
      </motion.div>
    </div>
  );
}
