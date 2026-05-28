import type { TradingSignal, RiskParameter, OrderBook, LiquidationPressure } from '../types';

export interface RiskCheckResult {
  passed: boolean;
  reason: string;
  adjustedPosition?: number;
  adjustedStopLoss?: number;
  adjustedTakeProfit?: number;
  riskScore: number;
}

export interface Position {
  id: string;
  symbol: string;
  side: 'long' | 'short';
  size: number;
  entryPrice: number;
  currentPrice: number;
  leverage: number;
  margin: number;
  unrealizedPnL: number;
  unrealizedPnLPercent: number;
  stopLoss: number;
  takeProfit: number;
  openTime: number;
}

export interface PortfolioState {
  equity: number;
  availableBalance: number;
  usedMargin: number;
  unrealizedPnL: number;
  marginRatio: number;
  positions: Position[];
  dailyPnL: number;
  dailyWinCount: number;
  dailyLossCount: number;
  maxDailyLossReached: boolean;
}

export class RiskManager {
  private globalRiskParams: RiskParameter;
  private portfolio: PortfolioState;
  private positions: Map<string, Position> = new Map();
  private riskCheckHistory: Map<string, RiskCheckResult[]> = new Map();
  private dailyResetTime: number;
  private maxPositionAge: number = 86400000;

  constructor(initialEquity: number = 100000) {
    this.globalRiskParams = {
      maxPositionSize: 1.0,
      maxDailyLoss: 0.05,
      maxLeverage: 5,
      positionMarginRatio: 0.1,
      stopLossDistance: 0.02,
      takeProfitRatio: 0.04
    };

    this.portfolio = {
      equity: initialEquity,
      availableBalance: initialEquity,
      usedMargin: 0,
      unrealizedPnL: 0,
      marginRatio: 0,
      positions: [],
      dailyPnL: 0,
      dailyWinCount: 0,
      dailyLossCount: 0,
      maxDailyLossReached: false
    };

    const now = new Date();
    this.dailyResetTime = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).getTime();
  }

  setGlobalRiskParams(params: Partial<RiskParameter>): void {
    this.globalRiskParams = { ...this.globalRiskParams, ...params };
  }

  getGlobalRiskParams(): RiskParameter {
    return { ...this.globalRiskParams };
  }

  getPortfolioState(): PortfolioState {
    return { ...this.portfolio };
  }

  getPositions(): Position[] {
    return Array.from(this.positions.values());
  }

  async validateSignal(
    signal: TradingSignal,
    orderBook: OrderBook | null,
    liquidationPressure: LiquidationPressure | null
  ): Promise<RiskCheckResult> {
    this.checkDailyReset();
    
    if (this.portfolio.maxDailyLossReached) {
      return {
        passed: false,
        reason: '已达到每日最大亏损限制',
        riskScore: 100
      };
    }

    const checks: Array<() => RiskCheckResult | null> = [
      () => this.checkDailyLoss(signal),
      () => this.checkPositionSize(signal),
      () => this.checkLeverage(signal),
      () => this.checkMargin(signal),
      () => this.checkLiquidationRisk(signal, liquidationPressure),
      () => this.checkOrderBookLiquidity(signal, orderBook),
      () => this.checkCorrelationRisk(signal)
    ];

    let totalRiskScore = 0;
    let failureReason = '';
    let adjustedPosition: number | undefined;
    let adjustedStopLoss: number | undefined;
    let adjustedTakeProfit: number | undefined;

    for (const check of checks) {
      const result = check();
      if (result) {
        totalRiskScore += result.riskScore;
        
        if (!result.passed) {
          failureReason = result.reason;
          
          if (result.adjustedPosition !== undefined) {
            adjustedPosition = result.adjustedPosition;
          }
          if (result.adjustedStopLoss !== undefined) {
            adjustedStopLoss = result.adjustedStopLoss;
          }
          if (result.adjustedTakeProfit !== undefined) {
            adjustedTakeProfit = result.adjustedTakeProfit;
          }
        }
      }
    }

    const passed = totalRiskScore < 70;
    
    if (!passed && adjustedPosition !== undefined) {
      return {
        passed: true,
        reason: `风险调整后通过: ${failureReason}`,
        adjustedPosition,
        adjustedStopLoss,
        adjustedTakeProfit,
        riskScore: totalRiskScore
      };
    }

    return {
      passed,
      reason: failureReason || '风控检查通过',
      adjustedPosition,
      adjustedStopLoss,
      adjustedTakeProfit,
      riskScore: totalRiskScore
    };
  }

  private checkDailyLoss(signal: TradingSignal): RiskCheckResult | null {
    const maxDailyLossAmount = this.portfolio.equity * this.globalRiskParams.maxDailyLoss;
    const projectedLoss = signal.type === 'close' ? 0 :
      Math.abs(signal.entryPrice - signal.stopLoss) * this.globalRiskParams.maxPositionSize;

    if (this.portfolio.dailyPnL - projectedLoss < -maxDailyLossAmount) {
      return {
        passed: false,
        reason: '开仓后可能触发每日最大亏损限制',
        riskScore: 30
      };
    }

    return {
      passed: true,
      reason: '每日亏损检查通过',
      riskScore: 0
    };
  }

  private checkPositionSize(signal: TradingSignal): RiskCheckResult | null {
    const maxSize = this.portfolio.equity * this.globalRiskParams.maxPositionSize / signal.entryPrice;
    const existingPosition = this.positions.get(signal.symbol);
    const totalExposure = (existingPosition?.size || 0) + this.globalRiskParams.maxPositionSize;

    if (totalExposure > maxSize * 1.5) {
      const adjustedSize = maxSize * 0.5;
      return {
        passed: false,
        reason: `仓位过大，建议调整为 ${adjustedSize.toFixed(4)}`,
        adjustedPosition: adjustedSize,
        riskScore: 25
      };
    }

    return {
      passed: true,
      reason: '仓位大小检查通过',
      riskScore: Math.min(totalExposure / maxSize * 10, 20)
    };
  }

  private checkLeverage(signal: TradingSignal): RiskCheckResult | null {
    const maxLeverage = this.globalRiskParams.maxLeverage;
    const signalLeverage = this.estimateLeverage(signal);

    if (signalLeverage > maxLeverage) {
      return {
        passed: false,
        reason: `杠杆过高 (${signalLeverage.toFixed(1)}x > ${maxLeverage}x)`,
        adjustedPosition: this.globalRiskParams.maxPositionSize * maxLeverage / signalLeverage,
        riskScore: 20
      };
    }

    return {
      passed: true,
      reason: '杠杆检查通过',
      riskScore: (signalLeverage / maxLeverage) * 15
    };
  }

  private checkMargin(signal: TradingSignal): RiskCheckResult | null {
    const requiredMargin = signal.entryPrice * this.globalRiskParams.maxPositionSize *
      this.globalRiskParams.positionMarginRatio;

    if (requiredMargin > this.portfolio.availableBalance * 0.5) {
      const adjustedSize = (this.portfolio.availableBalance * 0.3) /
        (signal.entryPrice * this.globalRiskParams.positionMarginRatio);
      return {
        passed: false,
        reason: `保证金不足，建议调整仓位为 ${adjustedSize.toFixed(4)}`,
        adjustedPosition: adjustedSize,
        riskScore: 25
      };
    }

    return {
      passed: true,
      reason: '保证金检查通过',
      riskScore: (requiredMargin / this.portfolio.availableBalance) * 20
    };
  }

  private checkLiquidationRisk(
    signal: TradingSignal,
    liquidationPressure: LiquidationPressure | null
  ): RiskCheckResult | null {
    if (!liquidationPressure) {
      return { passed: true, reason: '无清算压力数据', riskScore: 5 };
    }

    const pressureIndex = liquidationPressure.pressureIndex;
    const sameSidePressure = signal.type === 'long' ? pressureIndex : 100 - pressureIndex;
    
    if (sameSidePressure > 70) {
      const adjustedStopLoss = signal.type === 'long'
        ? signal.stopLoss * 0.98
        : signal.stopLoss * 1.02;
      
      return {
        passed: false,
        reason: `同侧清算压力过高 (${sameSidePressure.toFixed(1)})，建议收紧止损`,
        adjustedStopLoss,
        riskScore: 30
      };
    }

    return {
      passed: true,
      reason: '清算风险检查通过',
      riskScore: sameSidePressure * 0.2
    };
  }

  private checkOrderBookLiquidity(
    signal: TradingSignal,
    orderBook: OrderBook | null
  ): RiskCheckResult | null {
    if (!orderBook) {
      return { passed: true, reason: '无订单簿数据', riskScore: 5 };
    }

    const orderSize = this.globalRiskParams.maxPositionSize;
    const orderValue = orderSize * signal.entryPrice;
    const side = signal.type === 'long' ? 'asks' : 'bids';
    const totalDepth = orderBook[side].slice(0, 10).reduce((sum, e) => sum + e.total, 0);

    if (orderValue > totalDepth * 0.3) {
      const adjustedSize = (totalDepth * 0.1) / signal.entryPrice;
      return {
        passed: false,
        reason: `订单簿流动性不足，建议调整仓位为 ${adjustedSize.toFixed(4)}`,
        adjustedPosition: adjustedSize,
        riskScore: 20
      };
    }

    const spreadPercent = orderBook.spread / orderBook.midPrice * 100;
    const spreadRisk = spreadPercent > 0.1 ? 10 : 0;

    return {
      passed: true,
      reason: '流动性检查通过',
      riskScore: (orderValue / totalDepth) * 15 + spreadRisk
    };
  }

  private checkCorrelationRisk(signal: TradingSignal): RiskCheckResult | null {
    const sameSymbolPositions = Array.from(this.positions.values())
      .filter(p => p.symbol === signal.symbol);
    
    const sameSidePositions = sameSymbolPositions.filter(p => p.side === signal.type);
    
    if (sameSidePositions.length >= 2) {
      return {
        passed: false,
        reason: `同方向仓位过多 (${sameSidePositions.length})`,
        riskScore: 15
      };
    }

    const totalExposure = sameSymbolPositions.reduce((sum, p) => sum + Math.abs(p.size * p.currentPrice), 0);
    const newExposure = signal.entryPrice * this.globalRiskParams.maxPositionSize;
    const concentration = (totalExposure + newExposure) / this.portfolio.equity;

    if (concentration > 0.3) {
      return {
        passed: false,
        reason: `单一标的敞度过高 (${(concentration * 100).toFixed(1)}%)`,
        adjustedPosition: (this.portfolio.equity * 0.15 - totalExposure / signal.entryPrice) / signal.entryPrice,
        riskScore: 20
      };
    }

    return {
      passed: true,
      reason: '相关性风险检查通过',
      riskScore: concentration * 30
    };
  }

  private estimateLeverage(signal: TradingSignal): number {
    const stopLossDistance = Math.abs(signal.entryPrice - signal.stopLoss) / signal.entryPrice;
    const marginRatio = this.globalRiskParams.positionMarginRatio;
    return Math.min(marginRatio / stopLossDistance, this.globalRiskParams.maxLeverage);
  }

  openPosition(signal: TradingSignal, riskCheck: RiskCheckResult): Position | null {
    if (!riskCheck.passed) return null;

    const size = riskCheck.adjustedPosition || this.globalRiskParams.maxPositionSize;
    const margin = signal.entryPrice * size * this.globalRiskParams.positionMarginRatio;
    const leverage = Math.round(this.estimateLeverage(signal));

    const position: Position = {
      id: `pos_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      symbol: signal.symbol,
      side: signal.type === 'close' ? 'long' : signal.type,
      size,
      entryPrice: signal.entryPrice,
      currentPrice: signal.entryPrice,
      leverage,
      margin,
      unrealizedPnL: 0,
      unrealizedPnLPercent: 0,
      stopLoss: riskCheck.adjustedStopLoss || signal.stopLoss,
      takeProfit: riskCheck.adjustedTakeProfit || signal.takeProfit,
      openTime: Date.now()
    };

    this.positions.set(position.id, position);
    this.updatePortfolio();

    return position;
  }

  closePosition(positionId: string, currentPrice: number): Position | null {
    const position = this.positions.get(positionId);
    if (!position) return null;

    const pnl = (currentPrice - position.entryPrice) * position.size *
      (position.side === 'long' ? 1 : -1);
    const pnlPercent = pnl / (position.entryPrice * position.size) * 100;

    position.currentPrice = currentPrice;
    position.unrealizedPnL = pnl;
    position.unrealizedPnLPercent = pnlPercent;

    if (pnl > 0) {
      this.portfolio.dailyWinCount++;
    } else {
      this.portfolio.dailyLossCount++;
    }
    this.portfolio.dailyPnL += pnl;

    this.positions.delete(positionId);
    this.updatePortfolio();

    return position;
  }

  updatePositionPrices(symbol: string, currentPrice: number): void {
    for (const position of this.positions.values()) {
      if (position.symbol === symbol) {
        position.currentPrice = currentPrice;
        position.unrealizedPnL = (currentPrice - position.entryPrice) * position.size *
          (position.side === 'long' ? 1 : -1);
        position.unrealizedPnLPercent = position.unrealizedPnL /
          (position.entryPrice * position.size) * 100;
      }
    }
    this.updatePortfolio();
  }

  checkStopLossTakeProfit(symbol: string, currentPrice: number): Array<{
    position: Position;
    action: 'stop_loss' | 'take_profit';
  }> {
    const triggered: Array<{ position: Position; action: 'stop_loss' | 'take_profit' }> = [];

    for (const position of this.positions.values()) {
      if (position.symbol !== symbol) continue;

      if (position.side === 'long') {
        if (currentPrice <= position.stopLoss) {
          triggered.push({ position, action: 'stop_loss' });
        } else if (currentPrice >= position.takeProfit) {
          triggered.push({ position, action: 'take_profit' });
        }
      } else {
        if (currentPrice >= position.stopLoss) {
          triggered.push({ position, action: 'stop_loss' });
        } else if (currentPrice <= position.takeProfit) {
          triggered.push({ position, action: 'take_profit' });
        }
      }
    }

    return triggered;
  }

  private updatePortfolio(): void {
    let usedMargin = 0;
    let unrealizedPnL = 0;
    const positions = Array.from(this.positions.values());

    for (const position of positions) {
      usedMargin += position.margin;
      unrealizedPnL += position.unrealizedPnL;
    }

    this.portfolio.usedMargin = usedMargin;
    this.portfolio.unrealizedPnL = unrealizedPnL;
    this.portfolio.marginRatio = usedMargin > 0 ?
      (usedMargin + unrealizedPnL) / usedMargin : 0;
    this.portfolio.availableBalance = this.portfolio.equity - usedMargin + unrealizedPnL;
    this.portfolio.positions = positions;

    const maxDailyLossAmount = this.portfolio.equity * this.globalRiskParams.maxDailyLoss;
    this.portfolio.maxDailyLossReached = this.portfolio.dailyPnL < -maxDailyLossAmount;
  }

  private checkDailyReset(): void {
    if (Date.now() >= this.dailyResetTime) {
      this.portfolio.dailyPnL = 0;
      this.portfolio.dailyWinCount = 0;
      this.portfolio.dailyLossCount = 0;
      this.portfolio.maxDailyLossReached = false;
      
      const now = new Date();
      this.dailyResetTime = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).getTime();
    }
  }

  cleanupExpiredPositions(): void {
    const now = Date.now();
    for (const [id, position] of this.positions) {
      if (now - position.openTime > this.maxPositionAge) {
        console.log(`[RiskManager] 清理过期仓位: ${id}`);
        this.positions.delete(id);
      }
    }
    this.updatePortfolio();
  }

  calculateRiskLevel(): 'low' | 'medium' | 'high' | 'critical' {
    const portfolio = this.portfolio;
    
    if (portfolio.maxDailyLossReached) return 'critical';
    if (portfolio.marginRatio < 1.5) return 'critical';
    if (portfolio.marginRatio < 2) return 'high';
    if (Math.abs(portfolio.dailyPnL) > portfolio.equity * 0.03) return 'high';
    if (portfolio.positions.length > 3) return 'medium';
    if (portfolio.marginRatio < 3) return 'medium';
    
    return 'low';
  }

  getRiskMetrics() {
    const portfolio = this.portfolio;
    const positions = this.positions.size;
    const totalExposure = portfolio.positions.reduce((sum, p) => sum + Math.abs(p.size * p.currentPrice), 0);
    const grossLeverage = totalExposure / portfolio.equity;
    const netExposure = portfolio.positions.reduce((sum, p) => sum + (p.side === 'long' ? 1 : -1) * p.size * p.currentPrice, 0);
    const netLeverage = netExposure / portfolio.equity;

    return {
      equity: portfolio.equity,
      availableBalance: portfolio.availableBalance,
      usedMargin: portfolio.usedMargin,
      unrealizedPnL: portfolio.unrealizedPnL,
      marginRatio: portfolio.marginRatio,
      positions,
      grossLeverage,
      netLeverage,
      dailyPnL: portfolio.dailyPnL,
      dailyWinRate: portfolio.dailyWinCount + portfolio.dailyLossCount > 0
        ? portfolio.dailyWinCount / (portfolio.dailyWinCount + portfolio.dailyLossCount)
        : 0,
      riskLevel: this.calculateRiskLevel(),
      maxDailyLossReached: portfolio.maxDailyLossReached
    };
  }
}

export const riskManager = new RiskManager(100000);
