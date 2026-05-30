import { useMemo } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  CreditCard,
  PiggyBank,
  Target,
  ArrowUpRight,
  ArrowDownRight,
  Shield,
  Activity,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend,
} from 'recharts';
import { useDataStore } from '@/store/useDataStore';
import { useCashFlow } from '@/hooks/useCashFlow';
import { formatCurrency, formatPercent, formatDate, maskEmail } from '@/utils/formatters';

const CHART_COLORS = ['#F59E0B', '#10B981', '#3B82F6', '#8B5CF6', '#F43F5E', '#06B6D4', '#F97316'];

export const Dashboard = () => {
  const { transactions, accounts, investments, user, categories } = useDataStore();
  const {
    netWorth,
    monthlyCashFlow,
    financialHealthScore,
    inflationImpact,
    calculateAssetAllocation,
    getRecentTransactions,
  } = useCashFlow(transactions, accounts, investments);

  const recentTransactions = getRecentTransactions(5);
  const assetAllocation = calculateAssetAllocation();

  const stats = useMemo(() => {
    const totalAssets = accounts
      .filter((a) => a.type !== 'liability' && a.type !== 'credit')
      .reduce((sum, a) => sum + a.balance, 0);
    const totalLiabilities = accounts
      .filter((a) => a.type === 'liability' || a.type === 'credit')
      .reduce((sum, a) => sum + a.balance, 0);
    const monthlyIncome = monthlyCashFlow?.income || 0;
    const monthlyExpense = monthlyCashFlow?.expense || 0;
    const monthlySavings = monthlyIncome - monthlyExpense;
    const savingsRate = monthlyIncome > 0 ? monthlySavings / monthlyIncome : 0;

    return {
      totalAssets,
      totalLiabilities,
      netWorth,
      monthlyIncome,
      monthlyExpense,
      monthlySavings,
      savingsRate,
    };
  }, [accounts, monthlyCashFlow, netWorth]);

  const cashFlowChartData = useMemo(() => {
    const months = [];
    const today = new Date();
    for (let i = 5; i >= 0; i--) {
      const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      const monthTransactions = transactions.filter((t) => t.date.startsWith(monthKey));
      const income = monthTransactions.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
      const expense = monthTransactions.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
      
      months.push({
        month: formatDate(date, 'M月'),
        收入: income,
        支出: expense,
        结余: income - expense,
      });
    }
    return months;
  }, [transactions]);

  const expenseByCategory = useMemo(() => {
    const categoryMap = new Map<string, number>();
    const expenseTransactions = transactions.filter((t) => t.type === 'expense');
    
    expenseTransactions.forEach((t) => {
      const category = categories.find((c) => c.id === t.categoryId);
      const name = category?.name || '其他';
      categoryMap.set(name, (categoryMap.get(name) || 0) + t.amount);
    });

    return Array.from(categoryMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
  }, [transactions, categories]);

  const healthScoreColor = useMemo(() => {
    const score = financialHealthScore?.totalScore || 0;
    if (score >= 80) return 'text-success-400';
    if (score >= 60) return 'text-accent-400';
    return 'text-danger-400';
  }, [financialHealthScore]);

  const inflationData = useMemo(() => {
    if (!inflationImpact || inflationImpact.length === 0) return [];
    return inflationImpact.slice(0, 10).map((item) => ({
      year: `${item.year}年`,
      名义价值: item.nominalValue,
      实际购买力: item.realValue,
      通胀侵蚀: item.erosionAmount,
    }));
  }, [inflationImpact]);

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm text-slate-400 mb-1">
            欢迎回来，{user ? maskEmail(user.email) : '用户'}
          </p>
          <h2 className="font-display text-2xl font-bold text-slate-100">
            您的财务状况{' '}
            <span className={`font-bold ${healthScoreColor}`}>
              {financialHealthScore?.totalScore?.toFixed(0) || '--'}
              <span className="text-sm font-normal text-slate-400">/100 分</span>
            </span>
          </h2>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-success-500/10 border border-success-500/20">
            <Shield className="w-4 h-4 text-success-400" />
            <span className="text-sm text-success-400 font-medium">数据加密</span>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-accent-500/10 border border-accent-500/20">
            <Activity className="w-4 h-4 text-accent-400" />
            <span className="text-sm text-accent-400 font-medium">实时同步</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="card-stat animate-slide-up" style={{ animationDelay: '0ms' }}>
          <div className="flex items-start justify-between">
            <div>
              <p className="card-stat-label">净资产总额</p>
              <p className="card-stat-value">{formatCurrency(stats.netWorth)}</p>
              <p className={`card-stat-change ${stats.netWorth >= 0 ? 'text-success-400' : 'text-danger-400'}`}>
                {stats.netWorth >= 0 ? (
                  <ArrowUpRight className="w-4 h-4" />
                ) : (
                  <ArrowDownRight className="w-4 h-4" />
                )}
                财务健康
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-accent-500 to-amber-500 flex items-center justify-center">
              <Wallet className="w-6 h-6 text-primary-950" />
            </div>
          </div>
        </div>

        <div className="card-stat animate-slide-up" style={{ animationDelay: '100ms' }}>
          <div className="flex items-start justify-between">
            <div>
              <p className="card-stat-label">本月收入</p>
              <p className="card-stat-value text-success-400">{formatCurrency(stats.monthlyIncome)}</p>
              <p className="card-stat-change text-success-400">
                <ArrowUpRight className="w-4 h-4" />
                现金流正向
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-success-500/10 flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-success-400" />
            </div>
          </div>
        </div>

        <div className="card-stat animate-slide-up" style={{ animationDelay: '200ms' }}>
          <div className="flex items-start justify-between">
            <div>
              <p className="card-stat-label">本月支出</p>
              <p className="card-stat-value text-danger-400">{formatCurrency(stats.monthlyExpense)}</p>
              <p className="card-stat-change text-slate-400">
                <PiggyBank className="w-4 h-4" />
                储蓄率 {formatPercent(stats.savingsRate)}
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-danger-500/10 flex items-center justify-center">
              <TrendingDown className="w-6 h-6 text-danger-400" />
            </div>
          </div>
        </div>

        <div className="card-stat animate-slide-up" style={{ animationDelay: '300ms' }}>
          <div className="flex items-start justify-between">
            <div>
              <p className="card-stat-label">本月结余</p>
              <p className="card-stat-value text-info-400">{formatCurrency(stats.monthlySavings)}</p>
              <p className="card-stat-change text-info-400">
                <Target className="w-4 h-4" />
                目标进度 68%
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-info-500/10 flex items-center justify-center">
              <CreditCard className="w-6 h-6 text-info-400" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 glass-card p-6 animate-slide-up" style={{ animationDelay: '400ms' }}>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-semibold text-lg text-slate-100">现金流趋势</h3>
              <p className="text-sm text-slate-400">近6个月收支对比</p>
            </div>
            <div className="flex gap-2">
              <span className="badge badge-success">收入</span>
              <span className="badge badge-danger">支出</span>
            </div>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={cashFlowChartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#F43F5E" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#F43F5E" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                <XAxis dataKey="month" stroke="#64748B" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#64748B" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `¥${v / 1000}k`} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1E293B',
                    border: '1px solid #334155',
                    borderRadius: '12px',
                    color: '#F1F5F9',
                  }}
                  formatter={(value: number) => [formatCurrency(value), '']}
                />
                <Area type="monotone" dataKey="收入" stroke="#10B981" strokeWidth={2} fill="url(#colorIncome)" />
                <Area type="monotone" dataKey="支出" stroke="#F43F5E" strokeWidth={2} fill="url(#colorExpense)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass-card p-6 animate-slide-up" style={{ animationDelay: '500ms' }}>
          <h3 className="font-semibold text-lg text-slate-100 mb-2">支出分类</h3>
          <p className="text-sm text-slate-400 mb-4">本月消费分布</p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={expenseByCategory}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {expenseByCategory.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1E293B',
                    border: '1px solid #334155',
                    borderRadius: '12px',
                    color: '#F1F5F9',
                  }}
                  formatter={(value: number) => [formatCurrency(value), '']}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-2 mt-4">
            {expenseByCategory.slice(0, 4).map((item, index) => (
              <div key={item.name} className="flex items-center gap-2">
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: CHART_COLORS[index] }}
                />
                <span className="text-xs text-slate-400 truncate">{item.name}</span>
                <span className="text-xs text-slate-200 ml-auto">
                  {formatPercent(item.value / (expenseByCategory.reduce((s, i) => s + i.value, 0) || 1))}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="glass-card p-6 animate-slide-up" style={{ animationDelay: '600ms' }}>
          <h3 className="font-semibold text-lg text-slate-100 mb-2">财务健康评分</h3>
          <p className="text-sm text-slate-400 mb-6">5维度综合评估</p>
          
          <div className="flex items-center justify-center mb-6">
            <div className="relative w-40 h-40">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="40" stroke="#334155" strokeWidth="8" fill="none" />
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  stroke="url(#gradient)"
                  strokeWidth="8"
                  fill="none"
                  strokeLinecap="round"
                  strokeDasharray={`${(financialHealthScore?.totalScore || 0) * 2.51} 251`}
                />
                <defs>
                  <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#F59E0B" />
                    <stop offset="100%" stopColor="#FBBF24" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className={`text-4xl font-display font-bold ${healthScoreColor}`}>
                  {financialHealthScore?.totalScore?.toFixed(0) || '--'}
                </span>
                <span className="text-xs text-slate-400">综合评分</span>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {financialHealthScore?.dimensions?.map((dim, index) => (
              <div key={dim.name} className="animate-fade-in" style={{ animationDelay: `${700 + index * 100}ms` }}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-slate-300">{dim.name}</span>
                  <span className="text-sm font-medium text-slate-200">{dim.score.toFixed(0)}</span>
                </div>
                <div className="progress-bar">
                  <div
                    className="progress-bar-fill"
                    style={{ width: `${dim.score}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="glass-card p-6 animate-slide-up" style={{ animationDelay: '700ms' }}>
          <h3 className="font-semibold text-lg text-slate-100 mb-2">通胀侵蚀分析</h3>
          <p className="text-sm text-slate-400 mb-4">货币购买力变化预测</p>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={inflationData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorNominal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#F59E0B" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorReal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#64748B" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#64748B" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                <XAxis dataKey="year" stroke="#64748B" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="#64748B" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v) => `¥${v / 10000}万`} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1E293B',
                    border: '1px solid #334155',
                    borderRadius: '12px',
                    color: '#F1F5F9',
                  }}
                  formatter={(value: number) => [formatCurrency(value), '']}
                />
                <Area type="monotone" dataKey="名义价值" stroke="#F59E0B" strokeWidth={2} fill="url(#colorNominal)" />
                <Area type="monotone" dataKey="实际购买力" stroke="#64748B" strokeWidth={2} fill="url(#colorReal)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 p-4 rounded-xl bg-danger-500/5 border border-danger-500/20">
            <p className="text-xs text-danger-400">
              <span className="font-semibold">通胀提醒：</span>
              按年均3%通胀率计算，10年后100万元的实际购买力仅相当于当前的
              <span className="font-bold"> {inflationImpact?.[9]?.realValue ? formatCurrency(inflationImpact[9].realValue) : '--'} </span>
              元，
              <span className="font-bold"> {inflationImpact?.[9]?.erosionRate ? formatPercent(inflationImpact[9].erosionRate) : '--'} </span>
              的价值将被通胀侵蚀。
            </p>
          </div>
        </div>

        <div className="glass-card p-6 animate-slide-up" style={{ animationDelay: '800ms' }}>
          <h3 className="font-semibold text-lg text-slate-100 mb-2">最近交易</h3>
          <p className="text-sm text-slate-400 mb-4">最新5笔收支记录</p>
          <div className="space-y-3">
            {recentTransactions.length > 0 ? (
              recentTransactions.map((transaction, index) => {
                const category = categories.find((c) => c.id === transaction.categoryId);
                const account = accounts.find((a) => a.id === transaction.accountId);
                return (
                  <div
                    key={transaction.id}
                    className="flex items-center gap-3 p-3 rounded-xl hover:bg-primary-800/50 transition-colors animate-fade-in"
                    style={{ animationDelay: `${900 + index * 100}ms` }}
                  >
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center"
                      style={{ backgroundColor: `${category?.color || '#64748B'}20` }}
                    >
                      <span className="text-lg">
                        {transaction.type === 'income' ? '📈' : '📉'}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-200 truncate">
                        {transaction.description || category?.name || '未分类'}
                      </p>
                      <p className="text-xs text-slate-500">
                        {formatDate(new Date(transaction.date))} · {account?.name || '未知账户'}
                      </p>
                    </div>
                    <p
                      className={`text-sm font-semibold ${
                        transaction.type === 'income' ? 'text-success-400' : 'text-danger-400'
                      }`}
                    >
                      {transaction.type === 'income' ? '+' : '-'}
                      {formatCurrency(transaction.amount)}
                    </p>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-8">
                <p className="text-slate-500 text-sm">暂无交易记录</p>
                <p className="text-slate-600 text-xs mt-1">开始记录您的第一笔收支吧</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="glass-card p-6 animate-slide-up" style={{ animationDelay: '900ms' }}>
        <h3 className="font-semibold text-lg text-slate-100 mb-6">资产配置分析</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {assetAllocation.map((item, index) => (
            <div
              key={item.type}
              className="text-center p-4 rounded-xl bg-primary-800/30 animate-fade-in"
              style={{ animationDelay: `${1000 + index * 100}ms` }}
            >
              <div className="text-3xl mb-2">{item.icon}</div>
              <p className="text-sm text-slate-400 mb-1">{item.name}</p>
              <p className="font-display text-xl font-bold text-slate-100">
                {formatCurrency(item.value)}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                占比 {formatPercent(item.percentage)}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
