export type TransactionType = 'income' | 'expense' | 'transfer';

export type AccountType = 'cash' | 'bank' | 'credit' | 'investment' | 'asset' | 'liability';

export type InvestmentType = 'stock' | 'bond' | 'fund' | 'crypto' | 'realestate' | 'other';

export type RiskLevel = 'low' | 'medium' | 'high';

export type ScenarioType = 'base' | 'baseline' | 'optimistic' | 'pessimistic' | 'custom';

export type BudgetPeriod = 'monthly' | 'quarterly' | 'yearly';

export interface User {
  id: string;
  email: string;
  encryptedMasterKey: string;
  passwordHash: string;
  encryptionSalt: string;
  lastLogin: Date;
  createdAt: Date;
}

export interface EncryptionKey {
  id: string;
  userId: string;
  wrappedKey: string;
  keyDerivationParams: {
    iterations: number;
    salt: string;
    hash: string;
  };
  version: number;
  createdAt: Date;
}

export interface Category {
  id: string;
  userId: string;
  name: string;
  type: 'income' | 'expense';
  icon: string;
  color: string;
  isDefault: boolean;
  sortOrder: number;
}

export interface Account {
  id: string;
  userId: string;
  name: string;
  type: AccountType;
  balance: number;
  currency: string;
  interestRate: number;
  createdAt: Date;
}

export interface Transaction {
  id: string;
  userId: string;
  date: string;
  amount: number;
  type: TransactionType;
  categoryId: string;
  accountId: string;
  toAccountId?: string;
  description: string;
  tags: string[];
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface Investment {
  id: string;
  userId: string;
  accountId: string;
  name: string;
  type: InvestmentType;
  quantity: number;
  costBasis: number;
  currentPrice: number;
  purchaseDate: string;
  riskLevel: RiskLevel;
  expectedReturn: number;
  amount?: number;
  currentValue?: number;
  risk?: RiskLevel;
}

export interface TaxRecord {
  id: string;
  userId: string;
  year: number;
  month: number;
  grossIncome: number;
  taxableIncome: number;
  taxPayable: number;
  actualTaxPaid: number;
  deductions: SpecialDeductions;
  filingStatus: string;
  createdAt: Date;
  taxWithheld?: number;
  taxRate?: number;
}

export interface SpecialDeductions {
  childEducation: number;
  continuingEducation: number;
  seriousIllness: number;
  housingLoanInterest: number;
  housingRent: number;
  elderlySupport: number;
  infantCare: number;
}

export interface SimulationParams {
  id: string;
  userId: string;
  name: string;
  scenario: ScenarioType;
  years: number;
  initialPrincipal: number;
  monthlyContribution: number;
  annualReturnRate: number;
  inflationRate: number;
  volatility: number;
  config?: Record<string, unknown>;
}

export interface Budget {
  id: string;
  categoryId: string;
  amount: number;
  period: BudgetPeriod;
  year: number;
  month: number;
}

export interface MonthlyCashFlow {
  month: string;
  income: number;
  expense: number;
  netFlow: number;
  savingsRate: number;
}

export interface CumulativeCashFlow {
  date: string;
  cumulativeIncome: number;
  cumulativeExpense: number;
  netWorth: number;
}

export interface InflationImpact {
  year: number;
  nominalValue: number;
  realValue: number;
  erosionAmount: number;
  erosionRate: number;
}

export interface SimulationConfig {
  initialPrincipal: number;
  initialAmount?: number;
  monthlyContribution: number;
  annualReturnRate: number;
  inflationRate: number;
  years: number;
  volatility: number;
  simulations: number;
}

export interface SimulationResult {
  year: number;
  median: number;
  p5: number;
  p25: number;
  p75: number;
  p95: number;
  inflationAdjusted: {
    median: number;
    p5: number;
    p95: number;
  };
  timeSeries?: {
    year: number;
    median: number;
    p5: number;
    p25: number;
    p75: number;
    p95: number;
    allValues: number[];
  }[];
  riskMetrics?: {
    expectedReturn: number;
    volatility: number;
    maxDrawdown: number;
    sharpeRatio: number;
    var95: number;
    var99: number;
  };
  successProbability?: number;
}

export interface TaxBracket {
  min: number;
  max: number;
  rate: number;
  deduction: number;
}

export interface FinancialHealthScore {
  score: number;
  level: 'excellent' | 'good' | 'fair' | 'poor';
  factors: {
    name: string;
    score: number;
    weight: number;
    description: string;
  }[];
}

export interface AssetAllocation {
  name: string;
  value: number;
  percentage: number;
  color: string;
  riskLevel: RiskLevel;
}

export interface EncryptedData<T> {
  data: string;
  iv: string;
  salt: string;
  version: number;
}

export type WorkerMessageType = 'start' | 'progress' | 'complete' | 'error';

export interface WorkerMessage {
  type: WorkerMessageType;
  config?: SimulationConfig;
  result?: SimulationResult[];
  progress?: number;
  error?: string;
}
