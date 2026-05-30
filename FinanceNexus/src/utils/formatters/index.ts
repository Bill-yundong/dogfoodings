import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { CURRENCY_SYMBOL } from '@/constants';

export const formatCurrency = (
  value: number,
  symbol: string = CURRENCY_SYMBOL,
  decimals: number = 2
): string => {
  const formattedNumber = value.toLocaleString('zh-CN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  if (value >= 100000000) {
    const yi = value / 100000000;
    return `${symbol}${yi.toLocaleString('zh-CN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}亿`;
  }

  if (value >= 10000) {
    const wan = value / 10000;
    return `${symbol}${wan.toLocaleString('zh-CN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}万`;
  }

  return `${symbol}${formattedNumber}`;
};

export const formatCompactCurrency = (value: number): string => {
  return formatCurrency(value, CURRENCY_SYMBOL, 0);
};

export const formatPercentage = (
  value: number,
  decimals: number = 1,
  includeSign: boolean = false
): string => {
  const percentage = (value * 100).toFixed(decimals);
  if (includeSign && value > 0) {
    return `+${percentage}%`;
  }
  return `${percentage}%`;
};

export const formatPercent = formatPercentage;

export const formatDate = (
  date: string | Date,
  pattern: string = 'yyyy-MM-dd'
): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return format(dateObj, pattern, { locale: zhCN });
};

export const formatDateCN = (
  date: string | Date,
  pattern: string = 'yyyy年MM月dd日'
): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return format(dateObj, pattern, { locale: zhCN });
};

export const formatRelativeTime = (date: string | Date): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - dateObj.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return '今天';
  if (diffDays === 1) return '昨天';
  if (diffDays < 7) return `${diffDays}天前`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}周前`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)}个月前`;
  return `${Math.floor(diffDays / 365)}年前`;
};

export const formatNumber = (
  value: number,
  decimals: number = 2
): string => {
  return value.toLocaleString('zh-CN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
};

export const formatCompactNumber = (value: number): string => {
  if (Math.abs(value) >= 100000000) {
    return `${(value / 100000000).toFixed(2)}亿`;
  }
  if (Math.abs(value) >= 10000) {
    return `${(value / 10000).toFixed(2)}万`;
  }
  return value.toLocaleString('zh-CN');
};

export const formatDuration = (years: number): string => {
  if (years < 1) {
    const months = Math.round(years * 12);
    return `${months}个月`;
  }
  const wholeYears = Math.floor(years);
  const remainingMonths = Math.round((years - wholeYears) * 12);

  if (remainingMonths === 0) {
    return `${wholeYears}年`;
  }
  return `${wholeYears}年${remainingMonths}个月`;
};

export const getHealthScoreColor = (score: number): string => {
  if (score >= 80) return '#10B981';
  if (score >= 60) return '#F59E0B';
  if (score >= 40) return '#F97316';
  return '#F43F5E';
};

export const getHealthScoreLevel = (
  score: number
): 'excellent' | 'good' | 'fair' | 'poor' => {
  if (score >= 80) return 'excellent';
  if (score >= 60) return 'good';
  if (score >= 40) return 'fair';
  return 'poor';
};

export const getHealthScoreLabel = (score: number): string => {
  const level = getHealthScoreLevel(score);
  const labels: Record<string, string> = {
    excellent: '优秀',
    good: '良好',
    fair: '一般',
    poor: '较差',
  };
  return labels[level] || '未知';
};

export const getAmountColorClass = (amount: number): string => {
  if (amount > 0) return 'text-emerald-500';
  if (amount < 0) return 'text-rose-500';
  return 'text-slate-500';
};

export const getAmountColor = (amount: number): string => {
  if (amount > 0) return '#10B981';
  if (amount < 0) return '#F43F5E';
  return '#64748B';
};

export const formatTransactionType = (type: string): string => {
  const types: Record<string, string> = {
    income: '收入',
    expense: '支出',
    transfer: '转账',
  };
  return types[type] || type;
};

export const formatAccountType = (type: string): string => {
  const types: Record<string, string> = {
    cash: '现金',
    bank: '银行卡',
    credit: '信用卡',
    investment: '投资账户',
    asset: '固定资产',
    liability: '负债',
  };
  return types[type] || type;
};

export const formatInvestmentType = (type: string): string => {
  const types: Record<string, string> = {
    stock: '股票',
    bond: '债券',
    fund: '基金',
    crypto: '加密货币',
    realestate: '房产',
    other: '其他',
  };
  return types[type] || type;
};

export const formatRiskLevel = (level: string): string => {
  const levels: Record<string, string> = {
    low: '低风险',
    medium: '中风险',
    high: '高风险',
  };
  return levels[level] || level;
};

export const truncateText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength)}...`;
};

export const maskEmail = (email: string): string => {
  const [name, domain] = email.split('@');
  if (!name || !domain) return email;

  const maskedName =
    name.length <= 2
      ? name
      : `${name.charAt(0)}${'*'.repeat(name.length - 2)}${name.charAt(name.length - 1)}`;

  return `${maskedName}@${domain}`;
};
