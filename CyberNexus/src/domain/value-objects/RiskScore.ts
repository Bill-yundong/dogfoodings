import type { AlertLevelType } from '../types/protocol.types';

export class RiskScore {
  private readonly _value: number;

  constructor(value: number) {
    if (value < 0 || value > 100) {
      throw new Error(`Risk score must be between 0 and 100, got ${value}`);
    }
    this._value = Math.round(value);
  }

  get value(): number {
    return this._value;
  }

  get level(): AlertLevelType {
    if (this._value >= 80) return 'CRITICAL';
    if (this._value >= 60) return 'HIGH';
    if (this._value >= 30) return 'MEDIUM';
    return 'LOW';
  }

  isHighRisk(): boolean {
    return this._value >= 60;
  }

  isMediumRisk(): boolean {
    return this._value >= 30 && this._value < 60;
  }

  isLowRisk(): boolean {
    return this._value < 30;
  }

  add(score: number): RiskScore {
    return new RiskScore(Math.min(100, this._value + score));
  }

  multiply(factor: number): RiskScore {
    return new RiskScore(Math.min(100, this._value * factor));
  }

  equals(other: RiskScore): boolean {
    return this._value === other._value;
  }

  compareTo(other: RiskScore): number {
    return this._value - other._value;
  }

  toJSON(): number {
    return this._value;
  }

  toString(): string {
    return `${this._value} (${this.level})`;
  }
}
