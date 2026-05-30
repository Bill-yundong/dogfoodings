import type { TaxBracket, SpecialDeductions } from '@/types';

export const TAX_BRACKETS: TaxBracket[] = [
  { min: 0, max: 36000, rate: 0.03, deduction: 0 },
  { min: 36000, max: 144000, rate: 0.10, deduction: 2520 },
  { min: 144000, max: 300000, rate: 0.20, deduction: 16920 },
  { min: 300000, max: 420000, rate: 0.25, deduction: 31920 },
  { min: 420000, max: 660000, rate: 0.30, deduction: 52920 },
  { min: 660000, max: 960000, rate: 0.35, deduction: 85920 },
  { min: 960000, max: Infinity, rate: 0.45, deduction: 181920 },
];

export const STANDARD_DEDUCTION_MONTHLY = 5000;

export const DEFAULT_SPECIAL_DEDUCTIONS: SpecialDeductions = {
  childEducation: 0,
  continuingEducation: 0,
  seriousIllness: 0,
  housingLoanInterest: 0,
  housingRent: 0,
  elderlySupport: 0,
  infantCare: 0,
};

export const DEFAULT_INCOME_CATEGORIES = [
  { name: '工资', icon: 'Wallet', color: '#10B981' },
  { name: '奖金', icon: 'Gift', color: '#059669' },
  { name: '投资收益', icon: 'TrendingUp', color: '#047857' },
  { name: '兼职收入', icon: 'Briefcase', color: '#065F46' },
  { name: '其他收入', icon: 'Plus', color: '#064E3B' },
];

export const DEFAULT_EXPENSE_CATEGORIES = [
  { name: '餐饮', icon: 'Utensils', color: '#F59E0B' },
  { name: '交通', icon: 'Car', color: '#D97706' },
  { name: '购物', icon: 'ShoppingBag', color: '#B45309' },
  { name: '娱乐', icon: 'Gamepad2', color: '#92400E' },
  { name: '居住', icon: 'Home', color: '#78350F' },
  { name: '医疗', icon: 'Heart', color: '#F43F5E' },
  { name: '教育', icon: 'GraduationCap', color: '#E11D48' },
  { name: '通信', icon: 'Phone', color: '#BE123C' },
  { name: '其他支出', icon: 'MoreHorizontal', color: '#9F1239' },
];

export const ACCOUNT_TYPES = [
  { type: 'cash', name: '现金', icon: 'Banknote', color: '#10B981' },
  { type: 'bank', name: '银行卡', icon: 'CreditCard', color: '#3B82F6' },
  { type: 'credit', name: '信用卡', icon: 'Landmark', color: '#F59E0B' },
  { type: 'investment', name: '投资账户', icon: 'PieChart', color: '#8B5CF6' },
  { type: 'asset', name: '固定资产', icon: 'Building2', color: '#6366F1' },
  { type: 'liability', name: '负债', icon: 'Receipt', color: '#F43F5E' },
];

export const INVESTMENT_TYPES = [
  { type: 'stock', name: '股票', riskLevel: 'high' as const },
  { type: 'bond', name: '债券', riskLevel: 'low' as const },
  { type: 'fund', name: '基金', riskLevel: 'medium' as const },
  { type: 'crypto', name: '加密货币', riskLevel: 'high' as const },
  { type: 'realestate', name: '房产', riskLevel: 'medium' as const },
  { type: 'other', name: '其他', riskLevel: 'medium' as const },
];

export const SIMULATION_SCENARIOS = [
  {
    scenario: 'pessimistic',
    name: '悲观情景',
    returnRate: 0.02,
    inflationRate: 0.05,
    volatility: 0.25,
    color: '#F43F5E',
  },
  {
    scenario: 'base',
    name: '基准情景',
    returnRate: 0.06,
    inflationRate: 0.03,
    volatility: 0.15,
    color: '#3B82F6',
  },
  {
    scenario: 'optimistic',
    name: '乐观情景',
    returnRate: 0.10,
    inflationRate: 0.02,
    volatility: 0.10,
    color: '#10B981',
  },
];

export const RISK_LEVELS = {
  low: { label: '低风险', color: '#10B981', score: 1 },
  medium: { label: '中风险', color: '#F59E0B', score: 2 },
  high: { label: '高风险', color: '#F43F5E', score: 3 },
};

export const ENCRYPTION_VERSION = 1;

export const KDF_PARAMS = {
  iterations: 100000,
  keySize: 256,
  hash: 'SHA256',
};

export const CURRENCY = 'CNY';
export const CURRENCY_SYMBOL = '¥';

export const CHART_COLORS = {
  income: '#10B981',
  expense: '#F43F5E',
  netFlow: '#3B82F6',
  netWorth: '#8B5CF6',
  nominal: '#F59E0B',
  real: '#6366F1',
  p5: '#F43F5E',
  p25: '#F59E0B',
  median: '#3B82F6',
  p75: '#8B5CF6',
  p95: '#10B981',
};

export const ANIMATION_DURATION = {
  fast: 150,
  normal: 300,
  slow: 500,
};

export const DB_VERSION = 1;
export const DB_NAME = 'finance-nexus';

export const DEFAULT_SIMULATION_PARAMS = {
  initialPrincipal: 100000,
  monthlyContribution: 5000,
  annualReturnRate: 0.07,
  inflationRate: 0.03,
  years: 30,
  volatility: 0.15,
  simulations: 1000,
};

export const RISK_COLORS = {
  low: '#10B981',
  medium: '#F59E0B',
  high: '#F43F5E',
};

export const RISK_LABELS = {
  low: '低风险',
  medium: '中风险',
  high: '高风险',
};
