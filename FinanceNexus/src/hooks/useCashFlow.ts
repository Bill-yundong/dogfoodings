import { useMemo } from 'react';
import type { Transaction, Account } from '@/types';
import {
  calculateMonthlyCashFlow,
  calculateCumulativeCashFlow,
  calculateNetWorth,
  calculateFinancialHealthScore,
  calculateExpenseByCategory,
  calculateAssetAllocation,
  calculateInflationImpact,
} from '@/utils/calculations/cashFlowEngine';

export const useCashFlow = (
  transactions: Transaction[],
  accounts: Account[],
  categories: { id: string; name: string; color: string }[]
) => {
  const monthlyCashFlow = useMemo(
    () => calculateMonthlyCashFlow(transactions, 12),
    [transactions]
  );

  const cumulativeCashFlow = useMemo(
    () => calculateCumulativeCashFlow(transactions),
    [transactions]
  );

  const netWorth = useMemo(
    () => calculateNetWorth(accounts),
    [accounts]
  );

  const financialHealthScore = useMemo(
    () => calculateFinancialHealthScore(transactions, accounts),
    [transactions, accounts]
  );

  const expenseByCategory = useMemo(
    () => calculateExpenseByCategory(transactions, categories),
    [transactions, categories]
  );

  const assetAllocation = useMemo(
    () => calculateAssetAllocation(accounts),
    [accounts]
  );

  const summary = useMemo(() => {
    const currentMonth = monthlyCashFlow[monthlyCashFlow.length - 1];
    const lastMonth = monthlyCashFlow[monthlyCashFlow.length - 2];

    const totalIncome = monthlyCashFlow.reduce((sum, m) => sum + m.income, 0);
    const totalExpense = monthlyCashFlow.reduce((sum, m) => sum + m.expense, 0);
    const avgSavingsRate =
      monthlyCashFlow.reduce((sum, m) => sum + m.savingsRate, 0) /
      Math.max(1, monthlyCashFlow.length);

    const incomeChange =
      currentMonth && lastMonth && lastMonth.income > 0
        ? (currentMonth.income - lastMonth.income) / lastMonth.income
        : 0;

    const expenseChange =
      currentMonth && lastMonth && lastMonth.expense > 0
        ? (currentMonth.expense - lastMonth.expense) / lastMonth.expense
        : 0;

    return {
      currentMonthIncome: currentMonth?.income || 0,
      currentMonthExpense: currentMonth?.expense || 0,
      currentMonthNetFlow: currentMonth?.netFlow || 0,
      currentMonthSavingsRate: currentMonth?.savingsRate || 0,
      totalIncome,
      totalExpense,
      totalNetFlow: totalIncome - totalExpense,
      avgSavingsRate,
      incomeChange,
      expenseChange,
    };
  }, [monthlyCashFlow]);

  const getInflationImpact = (
    initialValue: number,
    inflationRate: number,
    years: number,
    returnRate: number = 0
  ) => {
    return calculateInflationImpact(
      initialValue,
      inflationRate,
      years,
      returnRate
    );
  };

  const getMonthlyCashFlow = (months: number = 12) => {
    return calculateMonthlyCashFlow(transactions, months);
  };

  return {
    monthlyCashFlow,
    cumulativeCashFlow,
    netWorth,
    financialHealthScore,
    expenseByCategory,
    assetAllocation,
    summary,
    getMonthlyCashFlow,
    getInflationImpact,
  };
};
