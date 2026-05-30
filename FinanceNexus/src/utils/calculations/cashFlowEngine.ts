import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import type {
  Transaction,
  Account,
  MonthlyCashFlow,
  CumulativeCashFlow,
  InflationImpact,
  FinancialHealthScore,
  AssetAllocation,
} from '@/types';
import { CHART_COLORS, RISK_LEVELS } from '@/constants';

export const calculateMonthlyCashFlow = (
  transactions: Transaction[],
  months: number = 12
): MonthlyCashFlow[] => {
  const result: MonthlyCashFlow[] = [];
  const now = new Date();

  for (let i = months - 1; i >= 0; i--) {
    const targetDate = subMonths(now, i);
    const monthStart = startOfMonth(targetDate);
    const monthEnd = endOfMonth(targetDate);
    const monthKey = format(targetDate, 'yyyy-MM');

    const monthTransactions = transactions.filter((t) => {
      const txDate = new Date(t.date);
      return txDate >= monthStart && txDate <= monthEnd;
    });

    const income = monthTransactions
      .filter((t) => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);

    const expense = monthTransactions
      .filter((t) => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);

    const netFlow = income - expense;
    const savingsRate = income > 0 ? netFlow / income : 0;

    result.push({
      month: monthKey,
      income,
      expense,
      netFlow,
      savingsRate,
    });
  }

  return result;
};

export const calculateCumulativeCashFlow = (
  transactions: Transaction[],
  startDate?: Date
): CumulativeCashFlow[] => {
  const result: CumulativeCashFlow[] = [];
  const sorted = [...transactions].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  const filtered = startDate
    ? sorted.filter((t) => new Date(t.date) >= startDate)
    : sorted;

  let cumulativeIncome = 0;
  let cumulativeExpense = 0;

  for (const tx of filtered) {
    if (tx.type === 'income') {
      cumulativeIncome += tx.amount;
    } else if (tx.type === 'expense') {
      cumulativeExpense += tx.amount;
    }

    result.push({
      date: tx.date,
      cumulativeIncome,
      cumulativeExpense,
      netWorth: cumulativeIncome - cumulativeExpense,
    });
  }

  return result;
};

export const calculateInflationImpact = (
  initialValue: number,
  annualInflationRate: number,
  years: number,
  annualReturnRate: number = 0
): InflationImpact[] => {
  const result: InflationImpact[] = [];

  for (let year = 0; year <= years; year++) {
    const nominalValue = initialValue * Math.pow(1 + annualReturnRate, year);
    const realValue = nominalValue / Math.pow(1 + annualInflationRate, year);
    const erosionAmount = nominalValue - realValue;
    const erosionRate = nominalValue > 0 ? erosionAmount / nominalValue : 0;

    result.push({
      year,
      nominalValue,
      realValue,
      erosionAmount,
      erosionRate,
    });
  }

  return result;
};

export const calculateInflationAdjustedReturn = (
  nominalReturn: number,
  inflationRate: number
): number => {
  return (1 + nominalReturn) / (1 + inflationRate) - 1;
};

export const calculateFutureValue = (
  presentValue: number,
  monthlyContribution: number,
  annualReturnRate: number,
  years: number,
  inflationRate: number = 0
): {
  nominalValue: number;
  realValue: number;
  totalContributions: number;
  totalReturns: number;
} => {
  const monthlyRate = annualReturnRate / 12;
  const months = years * 12;

  let futureValue = presentValue;
  let totalContributions = presentValue;

  for (let i = 0; i < months; i++) {
    futureValue = futureValue * (1 + monthlyRate) + monthlyContribution;
    totalContributions += monthlyContribution;
  }

  const totalReturns = futureValue - totalContributions;
  const realValue = futureValue / Math.pow(1 + inflationRate, years);

  return {
    nominalValue: futureValue,
    realValue,
    totalContributions,
    totalReturns,
  };
};

export const calculateNetWorth = (
  accounts: Account[]
): {
  totalAssets: number;
  totalLiabilities: number;
  netWorth: number;
  byType: Record<string, number>;
} => {
  const byType: Record<string, number> = {};
  let totalAssets = 0;
  let totalLiabilities = 0;

  for (const account of accounts) {
    const type = account.type;
    if (!byType[type]) {
      byType[type] = 0;
    }

    if (type === 'liability' || type === 'credit') {
      totalLiabilities += account.balance;
      byType[type] -= account.balance;
    } else {
      totalAssets += account.balance;
      byType[type] += account.balance;
    }
  }

  return {
    totalAssets,
    totalLiabilities,
    netWorth: totalAssets - totalLiabilities,
    byType,
  };
};

export const calculateAssetAllocation = (
  accounts: Account[]
): AssetAllocation[] => {
  const netWorth = calculateNetWorth(accounts);
  const allocations: AssetAllocation[] = [];

  const typeColors: Record<string, string> = {
    cash: CHART_COLORS.income,
    bank: '#3B82F6',
    investment: '#8B5CF6',
    asset: '#6366F1',
  };

  for (const [type, value] of Object.entries(netWorth.byType)) {
    if (value > 0 && type !== 'liability' && type !== 'credit') {
      allocations.push({
        name: type,
        value,
        percentage: netWorth.totalAssets > 0 ? value / netWorth.totalAssets : 0,
        color: typeColors[type] || '#6B7280',
        riskLevel:
          type === 'cash' || type === 'bank'
            ? 'low'
            : type === 'investment'
              ? 'medium'
              : 'low',
      });
    }
  }

  return allocations.sort((a, b) => b.value - a.value);
};

export const calculateFinancialHealthScore = (
  transactions: Transaction[],
  accounts: Account[]
): FinancialHealthScore => {
  const factors: FinancialHealthScore['factors'] = [];
  const monthlyCashFlow = calculateMonthlyCashFlow(transactions, 3);

  const netWorth = calculateNetWorth(accounts);

  const avgSavingsRate =
    monthlyCashFlow.reduce((sum, m) => sum + m.savingsRate, 0) /
    monthlyCashFlow.length;
  const savingsRateScore = Math.min(100, avgSavingsRate * 200);
  factors.push({
    name: '储蓄率',
    score: savingsRateScore,
    weight: 0.3,
    description: `过去3个月平均储蓄率 ${(avgSavingsRate * 100).toFixed(1)}%，目标 20%+`,
  });

  const avgNetFlow =
    monthlyCashFlow.reduce((sum, m) => sum + m.netFlow, 0) /
    monthlyCashFlow.length;
  const netFlowScore = avgNetFlow > 0 ? Math.min(100, (avgNetFlow / 10000) * 100) : 0;
  factors.push({
    name: '现金流',
    score: netFlowScore,
    weight: 0.25,
    description: `过去3个月平均月结余 ¥${avgNetFlow.toFixed(2)}`,
  });

  const totalExpense = monthlyCashFlow.reduce((sum, m) => sum + m.expense, 0);
  const totalIncome = monthlyCashFlow.reduce((sum, m) => sum + m.income, 0);
  const expenseRatio = totalIncome > 0 ? totalExpense / totalIncome : 1;
  const expenseScore = Math.min(100, (1 - expenseRatio) * 150 + 50);
  factors.push({
    name: '支出控制',
    score: expenseScore,
    weight: 0.15,
    description: `支出占收入 ${(expenseRatio * 100).toFixed(1)}%`,
  });

  const debtRatio =
    netWorth.totalAssets > 0
      ? netWorth.totalLiabilities / netWorth.totalAssets
      : 0;
  const debtScore = Math.max(0, 100 - debtRatio * 200);
  factors.push({
    name: '负债水平',
    score: debtScore,
    weight: 0.2,
    description: `负债率 ${(debtRatio * 100).toFixed(1)}%，目标 <30%`,
  });

  const emergencyFund =
    accounts.find((a) => a.type === 'cash' || a.type === 'bank')?.balance || 0;
  const monthlyExpenses =
    monthlyCashFlow.reduce((sum, m) => sum + m.expense, 0) /
    monthlyCashFlow.length;
  const emergencyMonths = monthlyExpenses > 0 ? emergencyFund / monthlyExpenses : 0;
  const emergencyScore = Math.min(100, (emergencyMonths / 6) * 100);
  factors.push({
    name: '应急储备',
    score: emergencyScore,
    weight: 0.1,
    description: `应急储备可覆盖 ${emergencyMonths.toFixed(1)} 个月支出，目标 6 个月`,
  });

  const totalScore = factors.reduce(
    (sum, f) => sum + f.score * f.weight,
    0
  );

  let level: FinancialHealthScore['level'] = 'poor';
  if (totalScore >= 80) level = 'excellent';
  else if (totalScore >= 60) level = 'good';
  else if (totalScore >= 40) level = 'fair';

  return {
    score: totalScore,
    level,
    factors: factors.sort((a, b) => b.weight - a.weight),
  };
};

export const calculateExpenseByCategory = (
  transactions: Transaction[],
  categories: { id: string; name: string; color: string }[]
): { name: string; value: number; color: string; percentage: number }[] => {
  const expenseTx = transactions.filter((t) => t.type === 'expense');
  const totalExpense = expenseTx.reduce((sum, t) => sum + t.amount, 0);

  const byCategory = new Map<string, number>();

  for (const tx of expenseTx) {
    const current = byCategory.get(tx.categoryId) || 0;
    byCategory.set(tx.categoryId, current + tx.amount);
  }

  return Array.from(byCategory.entries())
    .map(([categoryId, value]) => {
      const category = categories.find((c) => c.id === categoryId);
      return {
        name: category?.name || '其他',
        value,
        color: category?.color || '#6B7280',
        percentage: totalExpense > 0 ? value / totalExpense : 0,
      };
    })
    .sort((a, b) => b.value - a.value);
};

export const calculatePortfolioRiskScore = (
  allocations: AssetAllocation[]
): number => {
  if (allocations.length === 0) return 0;

  const totalValue = allocations.reduce((sum, a) => sum + a.value, 0);
  if (totalValue === 0) return 0;

  let weightedRisk = 0;
  for (const alloc of allocations) {
    const riskScore = RISK_LEVELS[alloc.riskLevel].score;
    weightedRisk += riskScore * (alloc.value / totalValue);
  }

  return weightedRisk;
};

export const calculatePurchasePowerParity = (
  amount: number,
  fromYear: number,
  toYear: number,
  averageInflationRate: number = 0.03
): number => {
  const years = toYear - fromYear;
  return amount * Math.pow(1 + averageInflationRate, years);
};
