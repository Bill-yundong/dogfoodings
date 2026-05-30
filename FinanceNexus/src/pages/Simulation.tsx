import { useState, useMemo } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Settings,
  Target,
  TrendingUp,
  AlertTriangle,
  Info,
  Clock,
  Zap,
  BarChart2,
  PieChart as PieChartIcon,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
} from 'recharts';
import { useSimulation } from '@/hooks/useSimulation';
import { useDataStore } from '@/store/useDataStore';
import { formatCurrency, formatPercent } from '@/utils/formatters';
import { DEFAULT_SIMULATION_PARAMS, SIMULATION_SCENARIOS } from '@/constants';
import type { SimulationConfig, ScenarioType } from '@/types';

const RISK_COLORS = ['#F43F5E', '#F59E0B', '#3B82F6', '#10B981', '#8B5CF6'];

export const Simulation = () => {
  const { accounts, investments, user } = useDataStore();
  const { isRunning, progress, results, error, runSimulation, stopSimulation, resetSimulation } = useSimulation();

  const [scenario, setScenario] = useState<ScenarioType>('baseline');
  const [simulationYears, setSimulationYears] = useState('30');
  const [initialAmount, setInitialAmount] = useState('500000');
  const [monthlyContribution, setMonthlyContribution] = useState('10000');
  const [expectedReturn, setExpectedReturn] = useState('7');
  const [inflationRate, setInflationRate] = useState('3');
  const [withdrawalRate, setWithdrawalRate] = useState('4');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [volatility, setVolatility] = useState('15');
  const [simulationCount, setSimulationCount] = useState('1000');

  const totalAssets = useMemo(() => {
    return accounts
      .filter((a) => a.type !== 'liability' && a.type !== 'credit')
      .reduce((s, a) => s + a.balance, 0) +
      investments.reduce((s, i) => s + (i.currentValue || i.amount), 0);
  }, [accounts, investments]);

  const handleStartSimulation = async () => {
    const config: SimulationConfig = {
      initialAmount: parseFloat(initialAmount),
      monthlyContribution: parseFloat(monthlyContribution),
      annualReturnRate: parseFloat(expectedReturn) / 100,
      inflationRate: parseFloat(inflationRate) / 100,
      years: parseInt(simulationYears),
      volatility: parseFloat(volatility) / 100,
      withdrawalRate: parseFloat(withdrawalRate) / 100,
      simulationCount: parseInt(simulationCount),
      scenario: scenario,
      params: SIMULATION_SCENARIOS[scenario],
    };

    await runSimulation(config);
  };

  const scenarioChartData = useMemo(() => {
    if (!results || results.length === 0) return [];
    
    const firstResult = results[0];
    if (!firstResult?.timeSeries) return [];

    return firstResult.timeSeries.map((point) => ({
      year: `${point.year}年`,
      p5: point.percentiles.p5,
      p25: point.percentiles.p25,
      median: point.percentiles.median,
      p75: point.percentiles.p75,
      p95: point.percentiles.p95,
      nominalValue: point.nominalValue,
      realValue: point.realValue,
    }));
  }, [results]);

  const distributionData = useMemo(() => {
    if (!results || results.length === 0) return [];
    
    const lastPoints = results.map((r) => r.timeSeries[r.timeSeries.length - 1]);
    const finalValues = lastPoints.map((p) => p.percentiles.median);
    
    const min = Math.min(...finalValues);
    const max = Math.max(...finalValues);
    const bucketCount = 10;
    const bucketSize = (max - min) / bucketCount;
    
    const buckets = Array(bucketCount).fill(0);
    finalValues.forEach((v) => {
      const bucketIndex = Math.min(Math.floor((v - min) / bucketSize), bucketCount - 1);
      buckets[bucketIndex]++;
    });

    return buckets.map((count, index) => ({
      range: `${(min + index * bucketSize / 10000).toFixed(0)}万-${(min + (index + 1) * bucketSize / 10000).toFixed(0)}万`,
      count,
      probability: count / finalValues.length,
    }));
  }, [results]);

  const summaryStats = useMemo(() => {
    if (!results || results.length === 0) return null;

    const allFinalValues = results.flatMap((r) => 
      r.timeSeries[r.timeSeries.length - 1].allValues
    );

    const sorted = [...allFinalValues].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];
    const mean = sorted.reduce((s, v) => s + v, 0) / sorted.length;
    const p5 = sorted[Math.floor(sorted.length * 0.05)];
    const p95 = sorted[Math.floor(sorted.length * 0.95)];

    const firstResult = results[0];
    const riskMetrics = firstResult?.riskMetrics;

    return {
      median,
      mean,
      p5,
      p95,
      successProbability: firstResult?.successProbability || 0,
      riskMetrics,
      maxDrawdown: riskMetrics?.maxDrawdown || 0,
      sharpeRatio: riskMetrics?.sharpeRatio || 0,
      var95: riskMetrics?.var95 || 0,
    };
  }, [results]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3 glass-card p-6 animate-slide-up" style={{ animationDelay: '0ms' }}>
          <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
            <div>
              <h3 className="font-display text-xl font-bold text-slate-100">复利演化模拟引擎</h3>
              <p className="text-sm text-slate-400 mt-1">
                基于蒙特卡洛模拟的资产增长预测，支持多情景风险分析
              </p>
            </div>
            <div className="flex items-center gap-3">
              {isRunning ? (
                <button onClick={stopSimulation} className="btn-danger flex items-center gap-2">
                  <Pause className="w-4 h-4" />
                  停止模拟
                </button>
              ) : (
                <button onClick={handleStartSimulation} className="btn-primary flex items-center gap-2">
                  <Play className="w-4 h-4" />
                  开始模拟
                </button>
              )}
              <button onClick={resetSimulation} className="btn-secondary flex items-center gap-2">
                <RotateCcw className="w-4 h-4" />
                重置
              </button>
            </div>
          </div>

          {isRunning && (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-slate-400">模拟进度</span>
                <span className="text-sm text-accent-400 font-medium">{progress.toFixed(0)}%</span>
              </div>
              <div className="progress-bar h-3">
                <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
              </div>
            </div>
          )}

          {error && (
            <div className="mb-6 p-4 rounded-xl bg-danger-500/10 border border-danger-500/30">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-danger-400" />
                <span className="text-sm text-danger-400">{error}</span>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="p-4 rounded-xl bg-primary-800/30">
              <div className="flex items-center gap-2 mb-2">
                <Target className="w-4 h-4 text-accent-400" />
                <span className="text-sm text-slate-400">当前可投资资产</span>
              </div>
              <p className="font-display text-2xl font-bold text-slate-100">{formatCurrency(totalAssets)}</p>
            </div>
            <div className="p-4 rounded-xl bg-primary-800/30">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-4 h-4 text-info-400" />
                <span className="text-sm text-slate-400">模拟周期</span>
              </div>
              <p className="font-display text-2xl font-bold text-slate-100">{simulationYears} 年</p>
            </div>
            <div className="p-4 rounded-xl bg-primary-800/30">
              <div className="flex items-center gap-2 mb-2">
                <Zap className="w-4 h-4 text-success-400" />
                <span className="text-sm text-slate-400">模拟次数</span>
              </div>
              <p className="font-display text-2xl font-bold text-slate-100">{parseInt(simulationCount).toLocaleString()} 次</p>
            </div>
          </div>

          {summaryStats && scenarioChartData.length > 0 && (
            <div className="h-96">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={scenarioChartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorP95" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.1} />
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorMedian" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#F59E0B" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorP5" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#F43F5E" stopOpacity={0.1} />
                      <stop offset="95%" stopColor="#F43F5E" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                  <XAxis dataKey="year" stroke="#64748B" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#64748B" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `¥${v / 10000}万`} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1E293B',
                      border: '1px solid #334155',
                      borderRadius: '12px',
                      color: '#F1F5F9',
                    }}
                    formatter={(value: number) => [formatCurrency(value), '']}
                  />
                  <Area type="monotone" dataKey="p95" stroke="#10B981" strokeWidth={1} fill="url(#colorP95)" name="乐观(95%)" />
                  <Area type="monotone" dataKey="p75" stroke="#3B82F6" strokeWidth={1} fillOpacity={0} name="乐观(75%)" />
                  <Area type="monotone" dataKey="median" stroke="#F59E0B" strokeWidth={2} fill="url(#colorMedian)" name="中位数" />
                  <Area type="monotone" dataKey="p25" stroke="#8B5CF6" strokeWidth={1} fillOpacity={0} name="悲观(25%)" />
                  <Area type="monotone" dataKey="p5" stroke="#F43F5E" strokeWidth={1} fill="url(#colorP5)" name="悲观(5%)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="glass-card p-6 animate-slide-up" style={{ animationDelay: '100ms' }}>
            <h3 className="font-semibold text-lg text-slate-100 mb-4">模拟情景</h3>
            
            <div className="space-y-2">
              {(Object.keys(SIMULATION_SCENARIOS) as ScenarioType[]).map((s) => {
                const scenarioInfo = SIMULATION_SCENARIOS[s];
                return (
                  <button
                    key={s}
                    onClick={() => setScenario(s)}
                    className={`w-full p-4 rounded-xl text-left transition-all ${
                      scenario === s
                        ? 'bg-accent-500/10 border border-accent-500/30'
                        : 'bg-primary-800/30 border border-primary-700/50 hover:bg-primary-800'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`font-medium ${scenario === s ? 'text-accent-400' : 'text-slate-200'}`}>
                        {scenarioInfo.name}
                      </span>
                      {scenario === s && (
                        <div className="w-2 h-2 rounded-full bg-accent-500" />
                      )}
                    </div>
                    <p className="text-xs text-slate-400 mt-1">{scenarioInfo.description}</p>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="glass-card p-6 animate-slide-up" style={{ animationDelay: '200ms' }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-lg text-slate-100">模拟参数</h3>
              <button
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="p-2 rounded-lg hover:bg-primary-800/50 transition-colors"
              >
                <Settings className="w-4 h-4 text-slate-400" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="input-label">初始投资金额（元）</label>
                <input
                  type="number"
                  value={initialAmount}
                  onChange={(e) => setInitialAmount(e.target.value)}
                  className="input-field"
                  disabled={isRunning}
                />
              </div>

              <div>
                <label className="input-label">每月定投金额（元）</label>
                <input
                  type="number"
                  value={monthlyContribution}
                  onChange={(e) => setMonthlyContribution(e.target.value)}
                  className="input-field"
                  disabled={isRunning}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="input-label">年化收益率（%）</label>
                  <input
                    type="number"
                    step="0.1"
                    value={expectedReturn}
                    onChange={(e) => setExpectedReturn(e.target.value)}
                    className="input-field"
                    disabled={isRunning}
                  />
                </div>
                <div>
                  <label className="input-label">通胀率（%）</label>
                  <input
                    type="number"
                    step="0.1"
                    value={inflationRate}
                    onChange={(e) => setInflationRate(e.target.value)}
                    className="input-field"
                    disabled={isRunning}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="input-label">模拟年限（年）</label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={simulationYears}
                    onChange={(e) => setSimulationYears(e.target.value)}
                    className="input-field"
                    disabled={isRunning}
                  />
                </div>
                <div>
                  <label className="input-label">提取率（%）</label>
                  <input
                    type="number"
                    step="0.1"
                    value={withdrawalRate}
                    onChange={(e) => setWithdrawalRate(e.target.value)}
                    className="input-field"
                    disabled={isRunning}
                  />
                </div>
              </div>

              {showAdvanced && (
                <div className="space-y-4 pt-4 border-t border-primary-800 animate-slide-down">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="input-label">波动率（%）</label>
                      <input
                        type="number"
                        step="0.1"
                        value={volatility}
                        onChange={(e) => setVolatility(e.target.value)}
                        className="input-field"
                        disabled={isRunning}
                      />
                    </div>
                    <div>
                      <label className="input-label">模拟次数</label>
                      <input
                        type="number"
                        min="100"
                        max="10000"
                        step="100"
                        value={simulationCount}
                        onChange={(e) => setSimulationCount(e.target.value)}
                        className="input-field"
                        disabled={isRunning}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {summaryStats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          <div className="card-stat animate-slide-up" style={{ animationDelay: '300ms' }}>
            <p className="card-stat-label">成功率</p>
            <p className={`card-stat-value ${
              summaryStats.successProbability >= 0.8 ? 'text-success-400' :
              summaryStats.successProbability >= 0.6 ? 'text-accent-400' : 'text-danger-400'
            }`}>
              {formatPercent(summaryStats.successProbability)}
            </p>
            <p className="text-xs text-slate-500 mt-2">达成财务自由目标</p>
          </div>

          <div className="card-stat animate-slide-up" style={{ animationDelay: '400ms' }}>
            <p className="card-stat-label">中位数资产</p>
            <p className="card-stat-value text-info-400">{formatCurrency(summaryStats.median)}</p>
            <p className="text-xs text-slate-500 mt-2">最可能的结果</p>
          </div>

          <div className="card-stat animate-slide-up" style={{ animationDelay: '500ms' }}>
            <p className="card-stat-label">夏普比率</p>
            <p className={`card-stat-value ${
              summaryStats.sharpeRatio >= 1 ? 'text-success-400' :
              summaryStats.sharpeRatio >= 0.5 ? 'text-accent-400' : 'text-danger-400'
            }`}>
              {summaryStats.sharpeRatio.toFixed(2)}
            </p>
            <p className="text-xs text-slate-500 mt-2">风险调整后收益</p>
          </div>

          <div className="card-stat animate-slide-up" style={{ animationDelay: '600ms' }}>
            <p className="card-stat-label">最大回撤</p>
            <p className={`card-stat-value ${
              summaryStats.maxDrawdown <= 0.2 ? 'text-success-400' :
              summaryStats.maxDrawdown <= 0.4 ? 'text-accent-400' : 'text-danger-400'
            }`}>
              {formatPercent(summaryStats.maxDrawdown)}
            </p>
            <p className="text-xs text-slate-500 mt-2">历史最大亏损</p>
          </div>

          <div className="card-stat animate-slide-up" style={{ animationDelay: '700ms' }}>
            <p className="card-stat-label">95% VaR</p>
            <p className="card-stat-value text-danger-400">{formatPercent(summaryStats.var95)}</p>
            <p className="text-xs text-slate-500 mt-2">最坏5%的损失</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {distributionData.length > 0 && (
          <div className="glass-card p-6 animate-slide-up" style={{ animationDelay: '800ms' }}>
            <h3 className="font-semibold text-lg text-slate-100 mb-2">最终资产分布</h3>
            <p className="text-sm text-slate-400 mb-6">{simulationYears}年后资产规模概率分布</p>
            
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={distributionData} margin={{ top: 10, right: 10, left: 0, bottom: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                  <XAxis
                    dataKey="range"
                    stroke="#64748B"
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                    angle={-45}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis stroke="#64748B" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `${(v * 100).toFixed(0)}%`} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1E293B',
                      border: '1px solid #334155',
                      borderRadius: '12px',
                      color: '#F1F5F9',
                    }}
                    formatter={(value: number) => [`${(value * 100).toFixed(1)}%`, '概率']}
                  />
                  <Bar dataKey="probability" radius={[4, 4, 0, 0]}>
                    {distributionData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={RISK_COLORS[Math.min(Math.floor((index / distributionData.length) * RISK_COLORS.length), RISK_COLORS.length - 1)]}
                        fillOpacity={0.7}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {summaryStats && (
          <div className="glass-card p-6 animate-slide-up" style={{ animationDelay: '900ms' }}>
            <div className="flex items-center gap-2 mb-6">
              <Info className="w-5 h-5 text-accent-400" />
              <h3 className="font-semibold text-lg text-slate-100">模拟结果解读</h3>
            </div>

            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-primary-800/30">
                <h4 className="text-sm font-medium text-slate-200 mb-2">中位数预期</h4>
                <p className="text-sm text-slate-400">
                  经过 {simulationYears} 年的投资，您的资产最有可能增长至{' '}
                  <span className="text-accent-400 font-semibold">{formatCurrency(summaryStats.median)}</span>。
                  考虑通胀后，实际购买力约为{' '}
                  <span className="text-info-400 font-semibold">
                    {formatCurrency(summaryStats.median / Math.pow(1 + parseFloat(inflationRate) / 100, parseInt(simulationYears)))}
                  </span>。
                </p>
              </div>

              <div className="p-4 rounded-xl bg-primary-800/30">
                <h4 className="text-sm font-medium text-slate-200 mb-2">风险提示</h4>
                <p className="text-sm text-slate-400">
                  在95%的置信水平下，最大可能回撤为{' '}
                  <span className="text-danger-400 font-semibold">{formatPercent(summaryStats.maxDrawdown)}</span>。
                  这意味着在极端不利情况下，您的投资组合可能会遭受如此幅度的损失。
                </p>
              </div>

              <div className="p-4 rounded-xl bg-primary-800/30">
                <h4 className="text-sm font-medium text-slate-200 mb-2">优化建议</h4>
                <p className="text-sm text-slate-400">
                  {summaryStats.successProbability < 0.7 ? (
                    <>
                      当前成功率较低，建议：(1) 提高每月定投金额；(2) 适当延长投资期限；
                      (3) 考虑配置更高收益的资产类别。
                    </>
                  ) : summaryStats.sharpeRatio < 0.8 ? (
                    <>
                      风险调整后收益有待提高，建议优化资产配置，提高组合分散度，降低波动率。
                    </>
                  ) : (
                    <>
                      当前配置表现良好，建议保持定期再平衡，持续监控风险指标。
                    </>
                  )}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {!results && !isRunning && (
        <div className="glass-card p-12 text-center animate-slide-up" style={{ animationDelay: '1000ms' }}>
          <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-accent-500/20 to-amber-500/20 flex items-center justify-center">
            <BarChart2 className="w-10 h-10 text-accent-400" />
          </div>
          <h3 className="font-display text-2xl font-bold text-slate-100 mb-3">
            准备开始模拟
          </h3>
          <p className="text-slate-400 max-w-lg mx-auto mb-8">
            调整左侧参数以匹配您的投资计划，然后点击"开始模拟"。
            系统将使用蒙特卡洛方法运行 {parseInt(simulationCount).toLocaleString()} 次模拟，
            为您预测 {simulationYears} 年后的资产增长概率分布。
          </p>
          <button onClick={handleStartSimulation} className="btn-primary inline-flex items-center gap-2">
            <Play className="w-4 h-4" />
            开始模拟分析
          </button>
        </div>
      )}
    </div>
  );
};
