import { useState, useMemo } from 'react';
import {
  PieChart,
  TrendingUp,
  TrendingDown,
  Target,
  Plus,
  ArrowRight,
  AlertTriangle,
  CheckCircle,
  Info,
  BarChart2,
  PieChart as PieChartIcon,
  Activity,
  Shield,
} from 'lucide-react';
import {
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  BarChart,
  Bar,
  Legend,
} from 'recharts';
import { useDataStore } from '@/store/useDataStore';
import { useCashFlow } from '@/hooks/useCashFlow';
import { formatCurrency, formatPercent, formatDate } from '@/utils/formatters';
import type { Investment, InvestmentType, RiskLevel } from '@/types';

const RISK_COLORS: Record<RiskLevel, string> = {
  conservative: '#10B981',
  moderate: '#3B82F6',
  balanced: '#8B5CF6',
  aggressive: '#F59E0B',
  veryAggressive: '#F43F5E',
};

const RISK_LABELS: Record<RiskLevel, string> = {
  conservative: '保守型',
  moderate: '稳健型',
  balanced: '平衡型',
  aggressive: '进取型',
  veryAggressive: '激进型',
};

const INVESTMENT_TYPE_COLORS: Record<InvestmentType, string> = {
  stock: '#3B82F6',
  fund: '#8B5CF6',
  bond: '#10B981',
  realEstate: '#F59E0B',
  gold: '#FBBF24',
  cash: '#64748B',
  other: '#94A3B8',
};

const INVESTMENT_TYPE_LABELS: Record<InvestmentType, string> = {
  stock: '股票',
  fund: '基金',
  bond: '债券',
  realEstate: '房产',
  gold: '黄金',
  cash: '现金',
  other: '其他',
};

export const Finance = () => {
  const { accounts, investments, addInvestment, updateInvestment, deleteInvestment } = useDataStore();
  const { financialHealthScore, calculateAssetAllocation } = useCashFlow([], accounts, investments);

  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedRisk, setSelectedRisk] = useState<RiskLevel>('balanced');
  const [newInvestment, setNewInvestment] = useState({
    name: '',
    type: 'fund' as InvestmentType,
    amount: '',
    expectedReturn: '7',
    risk: 'balanced' as RiskLevel,
    purchaseDate: new Date().toISOString().split('T')[0],
    currentValue: '',
  });

  const investmentStats = useMemo(() => {
    const totalInvestment = investments.reduce((s, i) => s + i.amount, 0);
    const totalCurrentValue = investments.reduce((s, i) => s + (i.currentValue || i.amount), 0);
    const totalReturn = totalCurrentValue - totalInvestment;
    const totalReturnRate = totalInvestment > 0 ? totalReturn / totalInvestment : 0;
    
    const avgExpectedReturn = investments.length > 0
      ? investments.reduce((s, i) => s + i.expectedReturn, 0) / investments.length
      : 0;

    const weightedRisk = investments.reduce((s, i) => {
      const riskScores: Record<RiskLevel, number> = {
        conservative: 1,
        moderate: 2,
        balanced: 3,
        aggressive: 4,
        veryAggressive: 5,
      };
      return s + riskScores[i.risk] * (i.amount / totalInvestment);
    }, 0);

    const riskLevel = weightedRisk < 1.5 ? 'conservative' :
      weightedRisk < 2.5 ? 'moderate' :
      weightedRisk < 3.5 ? 'balanced' :
      weightedRisk < 4.5 ? 'aggressive' : 'veryAggressive';

    return {
      totalInvestment,
      totalCurrentValue,
      totalReturn,
      totalReturnRate,
      avgExpectedReturn,
      riskLevel,
      investmentCount: investments.length,
    };
  }, [investments]);

  const assetAllocation = useMemo(() => {
    const allocation = new Map<InvestmentType, number>();
    investments.forEach((i) => {
      allocation.set(i.type, (allocation.get(i.type) || 0) + (i.currentValue || i.amount));
    });
    return Array.from(allocation.entries()).map(([type, value]) => ({
      name: INVESTMENT_TYPE_LABELS[type],
      value,
      color: INVESTMENT_TYPE_COLORS[type],
      type,
    })).sort((a, b) => b.value - a.value);
  }, [investments]);

  const riskAllocation = useMemo(() => {
    const allocation = new Map<RiskLevel, number>();
    investments.forEach((i) => {
      allocation.set(i.risk, (allocation.get(i.risk) || 0) + (i.currentValue || i.amount));
    });
    return Array.from(allocation.entries()).map(([risk, value]) => ({
      name: RISK_LABELS[risk],
      value,
      color: RISK_COLORS[risk],
      risk,
    }));
  }, [investments]);

  const performanceChartData = useMemo(() => {
    const months = [];
    const today = new Date();
    let baseValue = investmentStats.totalInvestment || 100000;
    
    for (let i = 11; i >= 0; i--) {
      const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const randomFactor = 1 + (Math.random() - 0.45) * 0.08;
      baseValue *= randomFactor;
      
      months.push({
        month: formatDate(date, 'M月'),
        市值: Math.round(baseValue),
        投入: investmentStats.totalInvestment || 100000,
        收益: Math.round(baseValue - (investmentStats.totalInvestment || 100000)),
      });
    }
    return months;
  }, [investmentStats]);

  const targetAllocation = useMemo(() => {
    const targets = {
      conservative: { stock: 10, fund: 30, bond: 40, cash: 20, gold: 0, other: 0 },
      moderate: { stock: 25, fund: 35, bond: 25, cash: 10, gold: 5, other: 0 },
      balanced: { stock: 40, fund: 30, bond: 15, cash: 5, gold: 5, other: 5 },
      aggressive: { stock: 55, fund: 25, bond: 10, cash: 2, gold: 5, other: 3 },
      veryAggressive: { stock: 70, fund: 15, bond: 5, cash: 0, gold: 5, other: 5 },
    };
    return targets[selectedRisk];
  }, [selectedRisk]);

  const allocationAdvice = useMemo(() => {
    const current = new Map<InvestmentType, number>();
    const total = investmentStats.totalCurrentValue || 1;
    
    investments.forEach((i) => {
      current.set(i.type, (current.get(i.type) || 0) + (i.currentValue || i.amount));
    });

    const advice = [];
    const types: InvestmentType[] = ['stock', 'fund', 'bond', 'cash', 'gold', 'other'];
    
    for (const type of types) {
      const currentPercent = ((current.get(type) || 0) / total) * 100;
      const targetPercent = targetAllocation[type];
      const diff = targetPercent - currentPercent;
      const diffAmount = (diff / 100) * total;

      if (Math.abs(diff) >= 5) {
        advice.push({
          type,
          name: INVESTMENT_TYPE_LABELS[type],
          currentPercent,
          targetPercent,
          diff,
          diffAmount,
          action: diff > 0 ? 'increase' : 'decrease',
        });
      }
    }

    return advice.sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff));
  }, [investments, targetAllocation, investmentStats]);

  const handleAddInvestment = async (e: React.FormEvent) => {
    e.preventDefault();
    const user = useDataStore.getState().user;
    if (!user) return;

    await addInvestment({
      userId: user.id,
      name: newInvestment.name,
      type: newInvestment.type,
      amount: parseFloat(newInvestment.amount),
      currentValue: parseFloat(newInvestment.currentValue || newInvestment.amount),
      expectedReturn: parseFloat(newInvestment.expectedReturn) / 100,
      risk: newInvestment.risk,
      purchaseDate: newInvestment.purchaseDate,
      quantity: 1,
      price: parseFloat(newInvestment.amount),
    });

    setShowAddModal(false);
    setNewInvestment({
      name: '',
      type: 'fund',
      amount: '',
      expectedReturn: '7',
      risk: 'balanced',
      purchaseDate: new Date().toISOString().split('T')[0],
      currentValue: '',
    });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="card-stat animate-slide-up" style={{ animationDelay: '0ms' }}>
          <div className="flex items-start justify-between">
            <div>
              <p className="card-stat-label">投资总市值</p>
              <p className="card-stat-value">{formatCurrency(investmentStats.totalCurrentValue)}</p>
              <p className={`card-stat-change ${investmentStats.totalReturn >= 0 ? 'text-success-400' : 'text-danger-400'}`}>
                {investmentStats.totalReturn >= 0 ? (
                  <TrendingUp className="w-4 h-4" />
                ) : (
                  <TrendingDown className="w-4 h-4" />
                )}
                {investmentStats.totalReturn >= 0 ? '+' : ''}{formatCurrency(investmentStats.totalReturn)}
                ({formatPercent(investmentStats.totalReturnRate)})
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-accent-500 to-amber-500 flex items-center justify-center">
              <PieChart className="w-6 h-6 text-primary-950" />
            </div>
          </div>
        </div>

        <div className="card-stat animate-slide-up" style={{ animationDelay: '100ms' }}>
          <div className="flex items-start justify-between">
            <div>
              <p className="card-stat-label">累计投入</p>
              <p className="card-stat-value text-info-400">{formatCurrency(investmentStats.totalInvestment)}</p>
              <p className="card-stat-change text-slate-400">
                <Target className="w-4 h-4" />
                {investmentStats.investmentCount} 项投资
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-info-500/10 flex items-center justify-center">
              <Target className="w-6 h-6 text-info-400" />
            </div>
          </div>
        </div>

        <div className="card-stat animate-slide-up" style={{ animationDelay: '200ms' }}>
          <div className="flex items-start justify-between">
            <div>
              <p className="card-stat-label">预期年化收益</p>
              <p className="card-stat-value text-success-400">{formatPercent(investmentStats.avgExpectedReturn / 100)}</p>
              <p className="card-stat-change text-slate-400">
                <Activity className="w-4 h-4" />
                风险等级 {RISK_LABELS[investmentStats.riskLevel]}
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-success-500/10 flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-success-400" />
            </div>
          </div>
        </div>

        <div className="card-stat animate-slide-up" style={{ animationDelay: '300ms' }}>
          <div className="flex items-start justify-between">
            <div>
              <p className="card-stat-label">资产配置评分</p>
              <p className="card-stat-value text-accent-400">
                {financialHealthScore?.dimensions?.find((d) => d.name.includes('投资'))?.score?.toFixed(0) || '--'}
              </p>
              <p className="card-stat-change text-slate-400">
                <Shield className="w-4 h-4" />
                {allocationAdvice.length} 项优化建议
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-accent-500/10 flex items-center justify-center">
              <Shield className="w-6 h-6 text-accent-400" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="glass-card p-6 animate-slide-up" style={{ animationDelay: '400ms' }}>
          <h3 className="font-semibold text-lg text-slate-100 mb-6">目标风险偏好</h3>
          
          <div className="grid grid-cols-5 gap-2 mb-6">
            {(Object.keys(RISK_LABELS) as RiskLevel[]).map((risk) => (
              <button
                key={risk}
                onClick={() => setSelectedRisk(risk)}
                className={`p-3 rounded-xl text-center transition-all ${
                  selectedRisk === risk
                    ? 'ring-2 ring-accent-500 bg-accent-500/10'
                    : 'bg-primary-800/50 hover:bg-primary-800'
                }`}
              >
                <div
                  className="w-6 h-6 rounded-full mx-auto mb-2"
                  style={{ backgroundColor: RISK_COLORS[risk] }}
                />
                <span className="text-xs text-slate-300">{RISK_LABELS[risk]}</span>
              </button>
            ))}
          </div>

          <div className="space-y-3">
            <h4 className="text-sm font-medium text-slate-300 mb-3">推荐资产配置</h4>
            {Object.entries(targetAllocation).map(([type, percent]) => {
              if (percent === 0) return null;
              return (
                <div key={type}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-slate-400">{INVESTMENT_TYPE_LABELS[type as InvestmentType]}</span>
                    <span className="text-slate-200">{percent}%</span>
                  </div>
                  <div className="progress-bar">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${percent}%`,
                        backgroundColor: INVESTMENT_TYPE_COLORS[type as InvestmentType],
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="glass-card p-6 animate-slide-up" style={{ animationDelay: '500ms' }}>
          <h3 className="font-semibold text-lg text-slate-100 mb-2">资产类型分布</h3>
          <p className="text-sm text-slate-400 mb-4">按投资类型分类</p>
          
          <div className="h-56 mb-4">
            <ResponsiveContainer width="100%" height="100%">
              <RechartsPieChart>
                <Pie
                  data={assetAllocation}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={85}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {assetAllocation.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1E293B',
                    border: '1px solid #334155',
                    borderRadius: '12px',
                    color: '#F1F5F9',
                  }}
                  formatter={(value: number) => [formatCurrency(value), '市值']}
                />
              </RechartsPieChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {assetAllocation.map((item) => (
              <div key={item.type} className="flex items-center gap-2">
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-xs text-slate-400 truncate">{item.name}</span>
                <span className="text-xs text-slate-200 ml-auto">
                  {formatPercent(item.value / (investmentStats.totalCurrentValue || 1))}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="glass-card p-6 animate-slide-up" style={{ animationDelay: '600ms' }}>
          <h3 className="font-semibold text-lg text-slate-100 mb-2">风险分布</h3>
          <p className="text-sm text-slate-400 mb-4">按风险等级分类</p>
          
          <div className="h-56 mb-4">
            <ResponsiveContainer width="100%" height="100%">
              <RechartsPieChart>
                <Pie
                  data={riskAllocation}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={85}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {riskAllocation.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1E293B',
                    border: '1px solid #334155',
                    borderRadius: '12px',
                    color: '#F1F5F9',
                  }}
                  formatter={(value: number) => [formatCurrency(value), '市值']}
                />
              </RechartsPieChart>
            </ResponsiveContainer>
          </div>

          <div className="space-y-2">
            {riskAllocation.map((item) => (
              <div key={item.risk} className="flex items-center gap-2">
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-xs text-slate-400">{item.name}</span>
                <span className="text-xs text-slate-200 ml-auto">
                  {formatPercent(item.value / (investmentStats.totalCurrentValue || 1))}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 glass-card p-6 animate-slide-up" style={{ animationDelay: '700ms' }}>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-semibold text-lg text-slate-100">投资收益走势</h3>
              <p className="text-sm text-slate-400">近12个月市值变化</p>
            </div>
            <div className="flex gap-2">
              <span className="badge badge-success">累计收益</span>
              <span className="badge badge-info">
                {investmentStats.totalReturn >= 0 ? '+' : ''}
                {formatPercent(investmentStats.totalReturnRate)}
              </span>
            </div>
          </div>
          
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={performanceChartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorMarketValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#F59E0B" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorInvested" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.1} />
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                <XAxis dataKey="month" stroke="#64748B" fontSize={12} tickLine={false} axisLine={false} />
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
                <Area type="monotone" dataKey="市值" stroke="#F59E0B" strokeWidth={2} fill="url(#colorMarketValue)" />
                <Area type="monotone" dataKey="投入" stroke="#3B82F6" strokeWidth={2} strokeDasharray="5 5" fill="url(#colorInvested)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass-card p-6 animate-slide-up" style={{ animationDelay: '800ms' }}>
          <div className="flex items-center gap-2 mb-6">
            <Info className="w-5 h-5 text-accent-400" />
            <h3 className="font-semibold text-lg text-slate-100">配置优化建议</h3>
          </div>

          <div className="space-y-4">
            {allocationAdvice.length > 0 ? (
              allocationAdvice.map((item, index) => (
                <div
                  key={item.type}
                  className="p-4 rounded-xl bg-primary-800/30 border border-primary-700/50 hover:border-accent-500/30 transition-colors animate-fade-in"
                  style={{ animationDelay: `${900 + index * 100}ms` }}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      item.action === 'increase' ? 'bg-success-500/10' : 'bg-danger-500/10'
                    }`}>
                      {item.action === 'increase' ? (
                        <TrendingUp className="w-4 h-4 text-success-400" />
                      ) : (
                        <TrendingDown className="w-4 h-4 text-danger-400" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="text-sm font-medium text-slate-200">{item.name}</h4>
                        <span className={`text-xs font-medium ${
                          item.action === 'increase' ? 'text-success-400' : 'text-danger-400'
                        }`}>
                          {item.action === 'increase' ? '建议增持' : '建议减持'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mb-2">
                        当前 {formatPercent(item.currentPercent / 100)} → 目标 {formatPercent(item.targetPercent / 100)}
                      </p>
                      <div className="flex items-center gap-1 text-xs">
                        <span className="text-slate-500">调整金额：</span>
                        <span className={item.action === 'increase' ? 'text-success-400' : 'text-danger-400'}>
                          {item.action === 'increase' ? '+' : ''}{formatCurrency(item.diffAmount)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <CheckCircle className="w-12 h-12 text-success-400 mx-auto mb-3" />
                <p className="text-slate-400">资产配置合理</p>
                <p className="text-sm text-slate-500 mt-1">无需调整</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="glass-card p-6 animate-slide-up" style={{ animationDelay: '1000ms' }}>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="font-semibold text-lg text-slate-100">投资组合明细</h3>
            <p className="text-sm text-slate-400">您的所有投资产品</p>
          </div>
          <button onClick={() => setShowAddModal(true)} className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" />
            添加投资
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-primary-800">
                <th className="text-left py-3 px-4 text-sm font-medium text-slate-400">投资产品</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-slate-400">类型</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-slate-400">风险</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-slate-400">投入金额</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-slate-400">当前市值</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-slate-400">收益率</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-slate-400">预期收益</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-slate-400">操作</th>
              </tr>
            </thead>
            <tbody>
              {investments.length > 0 ? (
                investments.map((inv, index) => {
                  const currentValue = inv.currentValue || inv.amount;
                  const returnRate = (currentValue - inv.amount) / inv.amount;
                  return (
                    <tr
                      key={inv.id}
                      className="border-b border-primary-800/50 hover:bg-primary-800/30 transition-colors animate-fade-in"
                      style={{ animationDelay: `${1100 + index * 50}ms` }}
                    >
                      <td className="py-4 px-4">
                        <div>
                          <p className="text-sm font-medium text-slate-200">{inv.name}</p>
                          <p className="text-xs text-slate-500">
                            购入 {formatDate(new Date(inv.purchaseDate))}
                          </p>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <span
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium"
                          style={{
                            backgroundColor: `${INVESTMENT_TYPE_COLORS[inv.type]}20`,
                            color: INVESTMENT_TYPE_COLORS[inv.type],
                          }}
                        >
                          {INVESTMENT_TYPE_LABELS[inv.type]}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <span
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium"
                          style={{
                            backgroundColor: `${RISK_COLORS[inv.risk]}20`,
                            color: RISK_COLORS[inv.risk],
                          }}
                        >
                          {RISK_LABELS[inv.risk]}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-right">
                        <span className="text-sm text-slate-300">{formatCurrency(inv.amount)}</span>
                      </td>
                      <td className="py-4 px-4 text-right">
                        <span className="text-sm font-medium text-slate-200">{formatCurrency(currentValue)}</span>
                      </td>
                      <td className="py-4 px-4 text-right">
                        <span className={`text-sm font-medium ${
                          returnRate >= 0 ? 'text-success-400' : 'text-danger-400'
                        }`}>
                          {returnRate >= 0 ? '+' : ''}{formatPercent(returnRate)}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-right">
                        <span className="text-sm text-accent-400">{formatPercent(inv.expectedReturn)}</span>
                      </td>
                      <td className="py-4 px-4 text-right">
                        <button
                          onClick={() => deleteInvestment(inv.id)}
                          className="p-2 rounded-lg hover:bg-danger-500/10 transition-colors text-slate-400 hover:text-danger-400"
                        >
                          <TrendingDown className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={8} className="py-12 text-center">
                    <div className="text-slate-500">
                      <p className="text-lg mb-2">暂无投资记录</p>
                      <p className="text-sm">点击"添加投资"开始记录您的投资组合</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showAddModal && (
        <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && setShowAddModal(false)}>
          <div className="modal-content max-w-lg">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-display text-xl font-bold text-slate-100">添加投资</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-200">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleAddInvestment} className="space-y-5">
              <div>
                <label className="input-label">投资产品名称</label>
                <input
                  type="text"
                  value={newInvestment.name}
                  onChange={(e) => setNewInvestment({ ...newInvestment, name: e.target.value })}
                  className="input-field"
                  placeholder="例如：沪深300指数基金"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="input-label">投资类型</label>
                  <select
                    value={newInvestment.type}
                    onChange={(e) => setNewInvestment({ ...newInvestment, type: e.target.value as InvestmentType })}
                    className="input-field"
                  >
                    {(Object.keys(INVESTMENT_TYPE_LABELS) as InvestmentType[]).map((type) => (
                      <option key={type} value={type}>{INVESTMENT_TYPE_LABELS[type]}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="input-label">风险等级</label>
                  <select
                    value={newInvestment.risk}
                    onChange={(e) => setNewInvestment({ ...newInvestment, risk: e.target.value as RiskLevel })}
                    className="input-field"
                  >
                    {(Object.keys(RISK_LABELS) as RiskLevel[]).map((risk) => (
                      <option key={risk} value={risk}>{RISK_LABELS[risk]}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="input-label">投入金额（元）</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={newInvestment.amount}
                    onChange={(e) => setNewInvestment({ ...newInvestment, amount: e.target.value })}
                    className="input-field"
                    placeholder="0.00"
                    required
                  />
                </div>

                <div>
                  <label className="input-label">当前市值（元）</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={newInvestment.currentValue}
                    onChange={(e) => setNewInvestment({ ...newInvestment, currentValue: e.target.value })}
                    className="input-field"
                    placeholder="留空则与投入金额相同"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="input-label">预期年化收益率（%）</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    value={newInvestment.expectedReturn}
                    onChange={(e) => setNewInvestment({ ...newInvestment, expectedReturn: e.target.value })}
                    className="input-field"
                    placeholder="7"
                  />
                </div>

                <div>
                  <label className="input-label">购入日期</label>
                  <input
                    type="date"
                    value={newInvestment.purchaseDate}
                    onChange={(e) => setNewInvestment({ ...newInvestment, purchaseDate: e.target.value })}
                    className="input-field"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowAddModal(false)} className="flex-1 btn-secondary">
                  取消
                </button>
                <button type="submit" className="flex-1 btn-primary">
                  添加投资
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
