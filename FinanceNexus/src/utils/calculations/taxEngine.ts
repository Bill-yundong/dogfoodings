import type {
  SpecialDeductions,
  TaxBracket,
  TaxRecord,
  Transaction,
} from '@/types';
import {
  TAX_BRACKETS,
  STANDARD_DEDUCTION_MONTHLY,
  DEFAULT_SPECIAL_DEDUCTIONS,
} from '@/constants';
import { generateId } from '../crypto';

export const calculateTaxBracket = (
  taxableIncome: number,
  brackets: TaxBracket[] = TAX_BRACKETS
): TaxBracket | null => {
  for (let i = brackets.length - 1; i >= 0; i--) {
    if (taxableIncome > brackets[i].min) {
      return brackets[i];
    }
  }
  return brackets[0] || null;
};

export const calculateAnnualTax = (
  taxableIncome: number,
  brackets: TaxBracket[] = TAX_BRACKETS
): number => {
  if (taxableIncome <= 0) return 0;

  const bracket = calculateTaxBracket(taxableIncome, brackets);
  if (!bracket) return 0;

  return taxableIncome * bracket.rate - bracket.deduction;
};

export const calculateMonthlyTax = (
  monthlyTaxableIncome: number,
  brackets: TaxBracket[] = TAX_BRACKETS
): number => {
  const annualTaxable = monthlyTaxableIncome * 12;
  const annualTax = calculateAnnualTax(annualTaxable, brackets);
  return annualTax / 12;
};

export const calculateTaxableIncome = (
  grossIncome: number,
  specialDeductions: SpecialDeductions = DEFAULT_SPECIAL_DEDUCTIONS,
  standardDeduction: number = STANDARD_DEDUCTION_MONTHLY
): {
  monthly: { gross: number; taxable: number; standardDeduction: number; specialDeductions: number };
  annual: { gross: number; taxable: number; standardDeduction: number; specialDeductions: number };
} => {
  const totalSpecialDeductions = Object.values(specialDeductions).reduce(
    (sum, val) => sum + val,
    0
  );

  const monthlyTaxable = Math.max(
    0,
    grossIncome - standardDeduction - totalSpecialDeductions
  );

  return {
    monthly: {
      gross: grossIncome,
      taxable: monthlyTaxable,
      standardDeduction,
      specialDeductions: totalSpecialDeductions,
    },
    annual: {
      gross: grossIncome * 12,
      taxable: monthlyTaxable * 12,
      standardDeduction: standardDeduction * 12,
      specialDeductions: totalSpecialDeductions * 12,
    },
  };
};

export const calculateTaxDetails = (
  grossIncome: number,
  specialDeductions: SpecialDeductions = DEFAULT_SPECIAL_DEDUCTIONS
) => {
  const incomeDetails = calculateTaxableIncome(grossIncome, specialDeductions);
  const monthlyTax = calculateMonthlyTax(incomeDetails.monthly.taxable);
  const annualTax = calculateAnnualTax(incomeDetails.annual.taxable);
  const bracket = calculateTaxBracket(incomeDetails.annual.taxable);

  return {
    ...incomeDetails,
    monthly: {
      ...incomeDetails.monthly,
      tax: monthlyTax,
      afterTax: grossIncome - monthlyTax,
    },
    annual: {
      ...incomeDetails.annual,
      tax: annualTax,
      afterTax: grossIncome * 12 - annualTax,
    },
    bracket,
    effectiveRate: annualTax / (grossIncome * 12) || 0,
  };
};

export const generateTaxRecordFromTransactions = (
  transactions: Transaction[],
  year: number,
  month: number,
  specialDeductions: SpecialDeductions = DEFAULT_SPECIAL_DEDUCTIONS,
  userId: string
): TaxRecord => {
  const incomeTransactions = transactions.filter(
    (t) =>
      t.type === 'income' &&
      new Date(t.date).getFullYear() === year &&
      new Date(t.date).getMonth() === month - 1
  );

  const grossIncome = incomeTransactions.reduce((sum, t) => sum + t.amount, 0);
  const taxDetails = calculateTaxDetails(grossIncome, specialDeductions);

  return {
    id: generateId(),
    userId,
    year,
    month,
    grossIncome,
    taxableIncome: taxDetails.monthly.taxable,
    taxPayable: taxDetails.monthly.tax,
    actualTaxPaid: 0,
    deductions: specialDeductions,
    filingStatus: 'single',
    createdAt: new Date(),
  };
};

export const generateAnnualTaxSummary = (
  taxRecords: TaxRecord[]
): {
  year: number;
  totalGrossIncome: number;
  totalTaxableIncome: number;
  totalTaxPayable: number;
  totalTaxPaid: number;
  refundOrOwe: number;
  monthlyBreakdown: { month: number; gross: number; tax: number }[];
} => {
  if (taxRecords.length === 0) {
    return {
      year: new Date().getFullYear(),
      totalGrossIncome: 0,
      totalTaxableIncome: 0,
      totalTaxPayable: 0,
      totalTaxPaid: 0,
      refundOrOwe: 0,
      monthlyBreakdown: [],
    };
  }

  const year = taxRecords[0].year;
  const monthlyBreakdown = Array.from({ length: 12 }, (_, i) => {
    const record = taxRecords.find((r) => r.month === i + 1);
    return {
      month: i + 1,
      gross: record?.grossIncome || 0,
      tax: record?.taxPayable || 0,
    };
  });

  const totalGrossIncome = taxRecords.reduce((sum, r) => sum + r.grossIncome, 0);
  const totalTaxableIncome = taxRecords.reduce(
    (sum, r) => sum + r.taxableIncome,
    0
  );
  const totalTaxPayable = taxRecords.reduce((sum, r) => sum + r.taxPayable, 0);
  const totalTaxPaid = taxRecords.reduce((sum, r) => sum + r.actualTaxPaid, 0);

  return {
    year,
    totalGrossIncome,
    totalTaxableIncome,
    totalTaxPayable,
    totalTaxPaid,
    refundOrOwe: totalTaxPaid - totalTaxPayable,
    monthlyBreakdown,
  };
};

export const getTaxOptimizationSuggestions = (
  grossIncome: number,
  currentDeductions: SpecialDeductions
): {
  category: string;
  suggestion: string;
  potentialSavings: number;
  impact: 'high' | 'medium' | 'low';
}[] => {
  const suggestions: {
    category: string;
    suggestion: string;
    potentialSavings: number;
    impact: 'high' | 'medium' | 'low';
  }[] = [];

  const annualIncome = grossIncome * 12;
  const currentBracket = calculateTaxBracket(
    annualIncome -
      STANDARD_DEDUCTION_MONTHLY * 12 -
      Object.values(currentDeductions).reduce((s, v) => s + v, 0) * 12
  );
  const marginalRate = currentBracket?.rate || 0;

  if (currentDeductions.childEducation === 0) {
    const monthlyDeduction = 1000;
    const annualSavings = monthlyDeduction * 12 * marginalRate;
    if (annualSavings > 0) {
      suggestions.push({
        category: '子女教育',
        suggestion: '如有子女接受全日制学历教育，可申报子女教育专项附加扣除',
        potentialSavings: annualSavings,
        impact: annualSavings > 1000 ? 'high' : annualSavings > 500 ? 'medium' : 'low',
      });
    }
  }

  if (currentDeductions.housingLoanInterest === 0 && currentDeductions.housingRent === 0) {
    const monthlyDeduction = 1000;
    const annualSavings = monthlyDeduction * 12 * marginalRate;
    if (annualSavings > 0) {
      suggestions.push({
        category: '住房贷款利息',
        suggestion: '如有首套住房贷款，可申报住房贷款利息专项附加扣除',
        potentialSavings: annualSavings,
        impact: annualSavings > 1000 ? 'high' : annualSavings > 500 ? 'medium' : 'low',
      });
    }
  }

  if (currentDeductions.elderlySupport === 0) {
    const monthlyDeduction = 2000;
    const annualSavings = monthlyDeduction * 12 * marginalRate;
    if (annualSavings > 0) {
      suggestions.push({
        category: '赡养老人',
        suggestion: '如有赡养60岁以上老人，可申报赡养老人专项附加扣除',
        potentialSavings: annualSavings,
        impact: annualSavings > 1000 ? 'high' : annualSavings > 500 ? 'medium' : 'low',
      });
    }
  }

  if (currentDeductions.continuingEducation === 0) {
    const monthlyDeduction = 400;
    const annualSavings = monthlyDeduction * 12 * marginalRate;
    if (annualSavings > 0) {
      suggestions.push({
        category: '继续教育',
        suggestion: '如正在接受学历继续教育，可申报继续教育专项附加扣除',
        potentialSavings: annualSavings,
        impact: annualSavings > 1000 ? 'high' : annualSavings > 500 ? 'medium' : 'low',
      });
    }
  }

  if (currentDeductions.infantCare === 0) {
    const monthlyDeduction = 1000;
    const annualSavings = monthlyDeduction * 12 * marginalRate;
    if (annualSavings > 0) {
      suggestions.push({
        category: '婴幼儿照护',
        suggestion: '如有3岁以下婴幼儿，可申报婴幼儿照护专项附加扣除',
        potentialSavings: annualSavings,
        impact: annualSavings > 1000 ? 'high' : annualSavings > 500 ? 'medium' : 'low',
      });
    }
  }

  return suggestions.sort((a, b) => b.potentialSavings - a.potentialSavings);
};
