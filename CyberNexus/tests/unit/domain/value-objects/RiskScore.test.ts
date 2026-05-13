import { describe, it, expect } from 'vitest';
import { RiskScore } from '../../../../src/domain/value-objects/RiskScore';
import { InvalidRiskScoreException } from '../../../../src/domain/exceptions/DomainException';

describe('RiskScore', () => {
  describe('constructor', () => {
    it('should create a valid risk score', () => {
      const score = new RiskScore(50);
      expect(score.value).toBe(50);
    });

    it('should round to nearest integer', () => {
      const score = new RiskScore(50.6);
      expect(score.value).toBe(51);
    });

    it('should throw error for negative score', () => {
      expect(() => new RiskScore(-10)).toThrow(InvalidRiskScoreException);
    });

    it('should throw error for score over 100', () => {
      expect(() => new RiskScore(150)).toThrow(InvalidRiskScoreException);
    });
  });

  describe('level', () => {
    it('should return LOW for score < 30', () => {
      const score = new RiskScore(20);
      expect(score.level).toBe('LOW');
    });

    it('should return MEDIUM for score 30-59', () => {
      const score = new RiskScore(45);
      expect(score.level).toBe('MEDIUM');
    });

    it('should return HIGH for score 60-79', () => {
      const score = new RiskScore(70);
      expect(score.level).toBe('HIGH');
    });

    it('should return CRITICAL for score >= 80', () => {
      const score = new RiskScore(90);
      expect(score.level).toBe('CRITICAL');
    });
  });

  describe('risk level checks', () => {
    it('should correctly identify low risk', () => {
      const score = new RiskScore(20);
      expect(score.isLowRisk()).toBe(true);
      expect(score.isMediumRisk()).toBe(false);
      expect(score.isHighRisk()).toBe(false);
    });

    it('should correctly identify medium risk', () => {
      const score = new RiskScore(45);
      expect(score.isLowRisk()).toBe(false);
      expect(score.isMediumRisk()).toBe(true);
      expect(score.isHighRisk()).toBe(false);
    });

    it('should correctly identify high risk', () => {
      const score = new RiskScore(80);
      expect(score.isLowRisk()).toBe(false);
      expect(score.isMediumRisk()).toBe(false);
      expect(score.isHighRisk()).toBe(true);
    });
  });

  describe('add', () => {
    it('should add to risk score without exceeding 100', () => {
      const score = new RiskScore(80);
      const newScore = score.add(30);
      expect(newScore.value).toBe(100);
    });

    it('should add correctly when not exceeding 100', () => {
      const score = new RiskScore(50);
      const newScore = score.add(20);
      expect(newScore.value).toBe(70);
    });
  });

  describe('multiply', () => {
    it('should multiply risk score without exceeding 100', () => {
      const score = new RiskScore(60);
      const newScore = score.multiply(2);
      expect(newScore.value).toBe(100);
    });

    it('should multiply correctly when not exceeding 100', () => {
      const score = new RiskScore(50);
      const newScore = score.multiply(1.5);
      expect(newScore.value).toBe(75);
    });
  });

  describe('equals', () => {
    it('should return true for same scores', () => {
      const score1 = new RiskScore(50);
      const score2 = new RiskScore(50);
      expect(score1.equals(score2)).toBe(true);
    });

    it('should return false for different scores', () => {
      const score1 = new RiskScore(50);
      const score2 = new RiskScore(60);
      expect(score1.equals(score2)).toBe(false);
    });
  });

  describe('compareTo', () => {
    it('should return positive when this score is higher', () => {
      const score1 = new RiskScore(60);
      const score2 = new RiskScore(50);
      expect(score1.compareTo(score2)).toBe(10);
    });

    it('should return negative when this score is lower', () => {
      const score1 = new RiskScore(40);
      const score2 = new RiskScore(50);
      expect(score1.compareTo(score2)).toBe(-10);
    });

    it('should return zero for equal scores', () => {
      const score1 = new RiskScore(50);
      const score2 = new RiskScore(50);
      expect(score1.compareTo(score2)).toBe(0);
    });
  });

  describe('toString', () => {
    it('should return string with value and level', () => {
      const score = new RiskScore(50);
      expect(score.toString()).toBe('50 (MEDIUM)');
    });
  });
});
