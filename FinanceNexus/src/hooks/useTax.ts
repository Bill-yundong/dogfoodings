import { useMemo } from 'react';
import type { TaxRecord, SpecialDeductions, Transaction } from '@/types';
import {
  calculateTaxDetails,
  generateAnnualTaxSummary,
  getTaxOptimizationSuggestions,
} from '@/utils/calculations/taxEngine';

export const useTax = (
  taxRecords: TaxRecord[],
  transactions: Transaction[],
  grossIncome: number = 0,
  deductions: SpecialDeductions
) => {
  const currentTaxDetails = useMemo(() => {
    return calculateTaxDetails(grossIncome, deductions);
  }, [grossIncome, deductions]);

  const annualSummary = useMemo(() => {
    return generateAnnualTaxSummary(taxRecords);
  }, [taxRecords]);

  const optimizationSuggestions = useMemo(() => {
    return getTaxOptimizationSuggestions(grossIncome, deductions);
  }, [grossIncome, deductions]);

  const monthlyTaxRecords = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return taxRecords
      .filter((r) => r.year === currentYear)
      .sort((a, b) => a.month - b.month);
  }, [taxRecords]);

  const yearToDateIncome = useMemo(() => {
    return monthlyTaxRecords.reduce((sum, r) => sum + r.grossIncome, 0);
  }, [monthlyTaxRecords]);

  const yearToDateTax = useMemo(() => {
    return monthlyTaxRecords.reduce((sum, r) => sum + r.taxPayable, 0);
  }, [monthlyTaxRecords]);

  const projectedAnnualTax = useMemo(() => {
    const currentMonth = new Date().getMonth() + 1;
    if (currentMonth === 0) return 0;
    return (yearToDateTax / currentMonth) * 12;
  }, [yearToDateTax]);

  const effectiveTaxRate = useMemo(() => {
    if (annualSummary.totalGrossIncome === 0) return 0;
    return annualSummary.totalTaxPayable / annualSummary.totalGrossIncome;
  }, [annualSummary]);

  const getTaxBracketDescription = (taxableIncome: number): string => {
    const brackets = [
      { max: 36000, rate: '3%', description: '不超过36000元' },
      { max: 144000, rate: '10%', description: '超过36000至144000元' },
      { max: 300000, rate: '20%', description: '超过144000至300000元' },
      { max: 420000, rate: '25%', description: '超过300000至420000元' },
      { max: 660000, rate: '30%', description: '超过420000至660000元' },
      { max: 960000, rate: '35%', description: '超过660000至960000元' },
      { max: Infinity, rate: '45%', description: '超过960000元' },
    ];

    for (const bracket of brackets) {
      if (taxableIncome <= bracket.max) {
        return `税率 ${bracket.rate} - ${bracket.description}`;
      }
    }

    return '未知税率';
  };

  const calculateRefundEstimate = (
    totalWithheld: number,
    actualDeductions: SpecialDeductions
  ): number => {
    const totalDeductions = Object.values(actualDeductions).reduce(
      (s, v) => s + v,
      0
    );
    const taxableIncome = Math.max(
      0,
      annualSummary.totalGrossIncome -
        60000 -
        totalDeductions * 12
    );

    let tax = 0;
    if (taxableIncome <= 36000) tax = taxableIncome * 0.03;
    else if (taxableIncome <= 144000) tax = taxableIncome * 0.1 - 2520;
    else if (taxableIncome <= 300000) tax = taxableIncome * 0.2 - 16920;
    else if (taxableIncome <= 420000) tax = taxableIncome * 0.25 - 31920;
    else if (taxableIncome <= 660000) tax = taxableIncome * 0.3 - 52920;
    else if (taxableIncome <= 960000) tax = taxableIncome * 0.35 - 85920;
    else tax = taxableIncome * 0.45 - 181920;

    return totalWithheld - Math.max(0, tax);
  };

  return {
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
  };
};
