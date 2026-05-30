import { useState, useMemo } from 'react';
import {
  Calculator,
  FileText,
  TrendingUp,
  TrendingDown,
  Lightbulb,
  Plus,
  Download,
  Info,
  CheckCircle,
  AlertTriangle,
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
import { useDataStore } from '@/store/useDataStore';
import { useTax } from '@/hooks/useTax';
import { formatCurrency, formatPercent } from '@/utils/formatters';
import { TAX_BRACKETS } from '@/constants';
import type { SpecialDeductions } from '@/types';

export const Tax = () => {
  const { taxRecords, transactions, user } = useDataStore();
  const [annualIncome, setAnnualIncome] = useState('300000');
  const [deductions, setDeductions] = useState<SpecialDeductions>({
    childrenEducation: 1000,
    continuingEducation: 400,
    housingLoanInterest: 1000,
    housingRent: 0,
    elderlySupport: 2000,
    infantCare: 1000,
    medicalInsurance: 0,
  });

  const totalMonthlyDeductions = Object.values(deductions).reduce((s, v) => s + v, 0);

  const {
    currentTaxDetails,
    annualSummary,
    optimizationSuggestions,
    monthlyTaxRecords,
    yearToDateIncome,
    yearToDateTax,
    projectedAnnualTax,
    effectiveTaxRate,
    getTaxBracketDescription,
    calculateRefundEstimate,
  } = useTax(taxRecords, transactions, parseFloat(annualIncome), deductions);

  const monthlyChartData = useMemo(() => {
    return monthlyTaxRecords.map((record) => ({
      month: `${record.month}月`,
      应纳税额: record.taxPayable,
      已扣缴: record.taxWithheld,
      应纳税所得额: record.taxableIncome / 10000,
    }));
  }, [monthlyTaxRecords]);

  const bracketChartData = useMemo(() => {
    const result = [];
    for (let i = 0; i < TAX_BRACKETS.length; i++) {
      const bracket = TAX_BRACKETS[i];
      const nextBracket = TAX_BRACKETS[i + 1];
      const range = nextBracket ? `${(bracket.min / 10000).toFixed(0)}万-${(nextBracket.min / 10000).toFixed(0)}万` : `${(bracket.min / 10000).toFixed(0)}万+`;
      
      let taxInBracket = 0;
      if (currentTaxDetails?.taxableIncome) {
        const income = currentTaxDetails.taxableIncome;
        const min = bracket.min;
        const max = bracket.max;
        const amountInBracket = Math.max(0, Math.min(income, max) - min);
        taxInBracket = amountInBracket * bracket.rate;
      }

      result.push({
        range,
        rate: bracket.rate * 100,
        tax: taxInBracket,
        isCurrent: currentTaxDetails?.bracket && 
          currentTaxDetails.taxableIncome > bracket.min && 
          currentTaxDetails.taxableIncome <= bracket.max,
      });
    }
    return result;
  }, [currentTaxDetails]);

  const handleDeductionChange = (key: keyof SpecialDeductions, value: string) => {
    setDeductions((prev) => ({
      ...prev,
      [key]: parseFloat(value) || 0,
    }));
  };

  const CHART_COLORS = ['#F59E0B', '#3B82F6', '#10B981', '#8B5CF6', '#F43F5E', '#06B6D4', '#F97316'];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="card-stat animate-slide-up" style={{ animationDelay: '0ms' }}>
          <div className="flex items-start justify-between">
            <div>
              <p className="card-stat-label">年度税前收入</p>
              <p className="card-stat-value">{formatCurrency(currentTaxDetails?.grossIncome || 0)}</p>
              <p className="card-stat-change text-slate-400">
                <TrendingUp className="w-4 h-4" />
                预估税额 {formatCurrency(currentTaxDetails?.taxPayable || 0)}
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-accent-500/10 flex items-center justify-center">
              <Calculator className="w-6 h-6 text-accent-400" />
            </div>
          </div>
        </div>

        <div className="card-stat animate-slide-up" style={{ animationDelay: '100ms' }}>
          <div className="flex items-start justify-between">
            <div>
              <p className="card-stat-label">累计已缴税额</p>
              <p className="card-stat-value text-info-400">{formatCurrency(yearToDateTax)}</p>
              <p className="card-stat-change text-slate-400">
                实际税率 {formatPercent(effectiveTaxRate)}
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-info-500/10 flex items-center justify-center">
              <FileText className="w-6 h-6 text-info-400" />
            </div>
          </div>
        </div>

        <div className="card-stat animate-slide-up" style={{ animationDelay: '200ms' }}>
          <div className="flex items-start justify-between">
            <div>
              <p className="card-stat-label">专项附加扣除</p>
              <p className="card-stat-value text-success-400">{formatCurrency(totalMonthlyDeductions * 12)}</p>
              <p className="card-stat-change text-success-400">
                <TrendingDown className="w-4 h-4" />
                月度 {formatCurrency(totalMonthlyDeductions)}
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-success-500/10 flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-success-400" />
            </div>
          </div>
        </div>

        <div className="card-stat animate-slide-up" style={{ animationDelay: '300ms' }}>
          <div className="flex items-start justify-between">
            <div>
              <p className="card-stat-label">预计退税额</p>
              <p className="card-stat-value text-accent-400">
                {formatCurrency(Math.max(0, calculateRefundEstimate(yearToDateTax, deductions)))}
              </p>
              <p className="card-stat-change text-accent-400">
                <Lightbulb className="w-4 h-4" />
                优化空间
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-accent-500/10 flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-accent-400" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-card p-6 animate-slide-up" style={{ animationDelay: '400ms' }}>
          <h3 className="font-semibold text-lg text-slate-100 mb-6">税务计算器</h3>
          
          <div className="space-y-5">
            <div>
              <label className="input-label">年度税前收入（元）</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">¥</span>
                <input
                  type="number"
                  value={annualIncome}
                  onChange={(e) => setAnnualIncome(e.target.value)}
                  className="input-field pl-10"
                  placeholder="请输入年度收入"
                />
              </div>
              <p className="text-xs text-slate-500 mt-1">
                包含工资、奖金、劳务报酬等综合所得
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {Object.entries(deductions).map(([key, value]) => {
                const labels: Record<string, string> = {
                  childrenEducation: '子女教育',
                  continuingEducation: '继续教育',
                  housingLoanInterest: '住房贷款利息',
                  housingRent: '住房租金',
                  elderlySupport: '赡养老人',
                  infantCare: '3岁以下婴幼儿照护',
                  medicalInsurance: '大病医疗',
                };
                return (
                  <div key={key}>
                    <label className="input-label">{labels[key]}（元/月）</label>
                    <input
                      type="number"
                      value={value}
                      onChange={(e) => handleDeductionChange(key as keyof SpecialDeductions, e.target.value)}
                      className="input-field"
                      placeholder="0"
                    />
                  </div>
                );
              })}
            </div>

            <div className="divider" />

            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">起征点（60000元/年）</span>
                <span className="text-slate-300">-{formatCurrency(60000)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">专项附加扣除</span>
                <span className="text-success-400">-{formatCurrency(totalMonthlyDeductions * 12)}</span>
              </div>
              <div className="flex justify-between text-sm font-medium">
                <span className="text-slate-300">应纳税所得额</span>
                <span className="text-accent-400">{formatCurrency(currentTaxDetails?.taxableIncome || 0)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">适用税率</span>
                <span className="text-slate-300">{formatPercent(currentTaxDetails?.bracket?.rate || 0)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">速算扣除数</span>
                <span className="text-slate-300">{formatCurrency(currentTaxDetails?.bracket?.deduction || 0)}</span>
              </div>
              <div className="divider" />
              <div className="flex justify-between text-lg font-bold">
                <span className="text-slate-100">应缴个人所得税</span>
                <span className="text-danger-400">{formatCurrency(currentTaxDetails?.taxPayable || 0)}</span>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-accent-500/10 border border-accent-500/20">
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-accent-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-accent-400">
                    {getTaxBracketDescription(currentTaxDetails?.taxableIncome || 0)}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    税后收入：{formatCurrency((parseFloat(annualIncome) || 0) - (currentTaxDetails?.taxPayable || 0))}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="glass-card p-6 animate-slide-up" style={{ animationDelay: '500ms' }}>
          <h3 className="font-semibold text-lg text-slate-100 mb-2">税率级距分布</h3>
          <p className="text-sm text-slate-400 mb-6">您的收入在各税率级距中的分布</p>
          
          <div className="h-64 mb-6">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={bracketChartData} layout="vertical" margin={{ top: 0, right: 20, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} />
                <XAxis type="number" stroke="#64748B" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis dataKey="range" type="category" stroke="#64748B" fontSize={11} tickLine={false} axisLine={false} width={80} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1E293B',
                    border: '1px solid #334155',
                    borderRadius: '12px',
                    color: '#F1F5F9',
                  }}
                  formatter={(value: number, name: string) => {
                    if (name === 'tax') return [formatCurrency(value), '税额'];
                    if (name === 'rate') return [`${value}%`, '税率'];
                    return [value, name];
                  }}
                />
                <Bar dataKey="tax" radius={[0, 4, 4, 0]}>
                  {bracketChartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.isCurrent ? '#F59E0B' : CHART_COLORS[index % CHART_COLORS.length]}
                      fillOpacity={entry.isCurrent ? 1 : 0.5}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-7 gap-2">
            {TAX_BRACKETS.map((bracket, index) => (
              <div key={index} className="text-center">
                <div
                  className="w-full h-8 rounded-lg mb-1"
                  style={{
                    backgroundColor: `${CHART_COLORS[index]}40`,
                    border: `1px solid ${CHART_COLORS[index]}`,
                  }}
                />
                <p className="text-xs text-slate-400">{bracket.rate * 100}%</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 glass-card p-6 animate-slide-up" style={{ animationDelay: '600ms' }}>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-semibold text-lg text-slate-100">月度纳税趋势</h3>
              <p className="text-sm text-slate-400">本年度各月纳税情况</p>
            </div>
            <button className="btn-secondary flex items-center gap-2 text-sm">
              <Download className="w-4 h-4" />
              导出报表
            </button>
          </div>
          
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyChartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorTaxPayable" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#F59E0B" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorTaxWithheld" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                <XAxis dataKey="month" stroke="#64748B" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis yAxisId="left" stroke="#64748B" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `¥${v}`} />
                <YAxis yAxisId="right" orientation="right" stroke="#64748B" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}万`} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1E293B',
                    border: '1px solid #334155',
                    borderRadius: '12px',
                    color: '#F1F5F9',
                  }}
                  formatter={(value: number) => [formatCurrency(value), '']}
                />
                <Area yAxisId="left" type="monotone" dataKey="应纳税额" stroke="#F59E0B" strokeWidth={2} fill="url(#colorTaxPayable)" />
                <Area yAxisId="left" type="monotone" dataKey="已扣缴" stroke="#3B82F6" strokeWidth={2} fill="url(#colorTaxWithheld)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass-card p-6 animate-slide-up" style={{ animationDelay: '700ms' }}>
          <div className="flex items-center gap-2 mb-6">
            <Lightbulb className="w-5 h-5 text-accent-400" />
            <h3 className="font-semibold text-lg text-slate-100">税务优化建议</h3>
          </div>

          <div className="space-y-4">
            {optimizationSuggestions.map((suggestion, index) => (
              <div
                key={index}
                className="p-4 rounded-xl bg-primary-800/30 border border-primary-700/50 hover:border-accent-500/30 transition-colors animate-fade-in"
                style={{ animationDelay: `${800 + index * 100}ms` }}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    suggestion.type === 'saving' ? 'bg-success-500/10' :
                    suggestion.type === 'warning' ? 'bg-accent-500/10' : 'bg-info-500/10'
                  }`}>
                    {suggestion.type === 'saving' ? (
                      <CheckCircle className="w-4 h-4 text-success-400" />
                    ) : suggestion.type === 'warning' ? (
                      <AlertTriangle className="w-4 h-4 text-accent-400" />
                    ) : (
                      <Info className="w-4 h-4 text-info-400" />
                    )}
                  </div>
                  <div className="flex-1">
                    <h4 className="text-sm font-medium text-slate-200 mb-1">
                      {suggestion.title}
                    </h4>
                    <p className="text-xs text-slate-400 mb-2">
                      {suggestion.description}
                    </p>
                    {suggestion.potentialSaving && (
                      <span className="badge badge-success text-xs">
                        预计节税 {formatCurrency(suggestion.potentialSaving)}/年
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="glass-card p-6 animate-slide-up" style={{ animationDelay: '900ms' }}>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="font-semibold text-lg text-slate-100">年度纳税明细</h3>
            <p className="text-sm text-slate-400">本年度各月详细纳税记录</p>
          </div>
          <button className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" />
            添加纳税记录
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-primary-800">
                <th className="text-left py-3 px-4 text-sm font-medium text-slate-400">月份</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-slate-400">税前收入</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-slate-400">应纳税所得额</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-slate-400">适用税率</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-slate-400">应纳税额</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-slate-400">已扣缴</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-slate-400">差额</th>
              </tr>
            </thead>
            <tbody>
              {monthlyTaxRecords.length > 0 ? (
                monthlyTaxRecords.map((record, index) => {
                  const diff = record.taxPayable - record.taxWithheld;
                  return (
                    <tr
                      key={`${record.year}-${record.month}`}
                      className="border-b border-primary-800/50 hover:bg-primary-800/30 transition-colors animate-fade-in"
                      style={{ animationDelay: `${1000 + index * 50}ms` }}
                    >
                      <td className="py-4 px-4">
                        <span className="text-sm text-slate-300">{record.month}月</span>
                      </td>
                      <td className="py-4 px-4 text-right">
                        <span className="text-sm text-slate-200">{formatCurrency(record.grossIncome)}</span>
                      </td>
                      <td className="py-4 px-4 text-right">
                        <span className="text-sm text-slate-200">{formatCurrency(record.taxableIncome)}</span>
                      </td>
                      <td className="py-4 px-4 text-right">
                        <span className="text-sm text-accent-400">{formatPercent(record.taxRate)}</span>
                      </td>
                      <td className="py-4 px-4 text-right">
                        <span className="text-sm text-danger-400">{formatCurrency(record.taxPayable)}</span>
                      </td>
                      <td className="py-4 px-4 text-right">
                        <span className="text-sm text-info-400">{formatCurrency(record.taxWithheld)}</span>
                      </td>
                      <td className="py-4 px-4 text-right">
                        <span className={`text-sm font-medium ${
                          diff > 0 ? 'text-danger-400' : diff < 0 ? 'text-success-400' : 'text-slate-400'
                        }`}>
                          {diff > 0 ? '+' : ''}{formatCurrency(diff)}
                        </span>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="py-12 text-center">
                    <div className="text-slate-500">
                      <p className="text-lg mb-2">暂无纳税记录</p>
                      <p className="text-sm">点击"添加纳税记录"开始记录</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {annualSummary.totalGrossIncome > 0 && (
          <div className="mt-6 p-6 rounded-xl bg-primary-800/30 border border-primary-700/50">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div>
                <p className="text-sm text-slate-400 mb-1">年度总收入</p>
                <p className="font-display text-2xl font-bold text-slate-100">
                  {formatCurrency(annualSummary.totalGrossIncome)}
                </p>
              </div>
              <div>
                <p className="text-sm text-slate-400 mb-1">年度总扣除</p>
                <p className="font-display text-2xl font-bold text-success-400">
                  {formatCurrency(annualSummary.totalDeductions)}
                </p>
              </div>
              <div>
                <p className="text-sm text-slate-400 mb-1">年度应纳税额</p>
                <p className="font-display text-2xl font-bold text-danger-400">
                  {formatCurrency(annualSummary.totalTaxPayable)}
                </p>
              </div>
              <div>
                <p className="text-sm text-slate-400 mb-1">平均税率</p>
                <p className="font-display text-2xl font-bold text-accent-400">
                  {formatPercent(effectiveTaxRate)}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
