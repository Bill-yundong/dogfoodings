import { describe, it, expect, beforeEach } from 'vitest'
import { efficiencyState, setPeriod, getFilteredRecords, getLatestRecord, getAverageMetrics } from '~/stores/efficiency'
import type { EfficiencyRecord } from '~/types'

describe('Efficiency Store', () => {
  beforeEach(() => {
    setPeriod(7)
  })

  describe('initial state', () => {
    it('should have 90 days of mock records', () => {
      expect(efficiencyState.records.length).toBe(91)
    })

    it('should have default period of 7 days', () => {
      expect(efficiencyState.selectedPeriod).toBe(7)
    })

    it('should have records with correct structure', () => {
      const record = efficiencyState.records[0]
      expect(record).toHaveProperty('date')
      expect(record).toHaveProperty('focusScore')
      expect(record).toHaveProperty('taskCompletionRate')
      expect(record).toHaveProperty('timeUtilization')
      expect(record).toHaveProperty('rhythmStability')
      expect(record).toHaveProperty('recoveryEfficiency')
      expect(record).toHaveProperty('totalDeepFocusMinutes')
      expect(record).toHaveProperty('totalTasksCompleted')
    })

    it('should have scores within valid ranges', () => {
      efficiencyState.records.forEach((record) => {
        expect(record.focusScore).toBeGreaterThanOrEqual(0)
        expect(record.focusScore).toBeLessThanOrEqual(100)
        expect(record.taskCompletionRate).toBeGreaterThanOrEqual(0)
        expect(record.taskCompletionRate).toBeLessThanOrEqual(100)
        expect(record.timeUtilization).toBeGreaterThanOrEqual(0)
        expect(record.timeUtilization).toBeLessThanOrEqual(100)
        expect(record.rhythmStability).toBeGreaterThanOrEqual(0)
        expect(record.rhythmStability).toBeLessThanOrEqual(100)
        expect(record.recoveryEfficiency).toBeGreaterThanOrEqual(0)
        expect(record.recoveryEfficiency).toBeLessThanOrEqual(100)
        expect(record.totalDeepFocusMinutes).toBeGreaterThanOrEqual(0)
        expect(record.totalTasksCompleted).toBeGreaterThanOrEqual(0)
      })
    })
  })

  describe('setPeriod', () => {
    it('should set period to 7 days', () => {
      setPeriod(7)
      expect(efficiencyState.selectedPeriod).toBe(7)
    })

    it('should set period to 30 days', () => {
      setPeriod(30)
      expect(efficiencyState.selectedPeriod).toBe(30)
    })

    it('should set period to 90 days', () => {
      setPeriod(90)
      expect(efficiencyState.selectedPeriod).toBe(90)
    })
  })

  describe('getFilteredRecords', () => {
    it('should return 7 records for 7-day period', () => {
      setPeriod(7)
      const records = getFilteredRecords()
      expect(records.length).toBe(7)
    })

    it('should return 30 records for 30-day period', () => {
      setPeriod(30)
      const records = getFilteredRecords()
      expect(records.length).toBe(30)
    })

    it('should return 90 records for 90-day period', () => {
      setPeriod(90)
      const records = getFilteredRecords()
      expect(records.length).toBe(90)
    })

    it('should return most recent records', () => {
      setPeriod(7)
      const records = getFilteredRecords()
      const latestRecord = efficiencyState.records[efficiencyState.records.length - 1]
      expect(records[records.length - 1].date).toBe(latestRecord.date)
    })

    it('should return records in chronological order', () => {
      setPeriod(7)
      const records = getFilteredRecords()
      for (let i = 1; i < records.length; i++) {
        expect(new Date(records[i].date).getTime()).toBeGreaterThan(new Date(records[i - 1].date).getTime())
      }
    })
  })

  describe('getLatestRecord', () => {
    it('should return the most recent record', () => {
      const latest = getLatestRecord()
      expect(latest).not.toBeNull()
      expect(latest?.date).toBe(efficiencyState.records[efficiencyState.records.length - 1].date)
    })
  })

  describe('getAverageMetrics', () => {
    it('should return null for empty records', () => {
      const originalRecords = [...efficiencyState.records]
      while (efficiencyState.records.length > 0) {
        efficiencyState.records.pop()
      }

      const result = getAverageMetrics()
      expect(result).toBeNull()

      originalRecords.forEach((r) => efficiencyState.records.push(r))
    })

    it('should return average metrics for selected period', () => {
      setPeriod(7)
      const metrics = getAverageMetrics()

      expect(metrics).not.toBeNull()
      expect(metrics).toHaveProperty('focusScore')
      expect(metrics).toHaveProperty('taskCompletionRate')
      expect(metrics).toHaveProperty('timeUtilization')
      expect(metrics).toHaveProperty('rhythmStability')
      expect(metrics).toHaveProperty('recoveryEfficiency')

      const records = getFilteredRecords()
      const expectedFocus = Math.round(records.reduce((s, r) => s + r.focusScore, 0) / records.length)
      expect(metrics?.focusScore).toBe(expectedFocus)
    })

    it('should return integers for all metrics', () => {
      setPeriod(7)
      const metrics = getAverageMetrics()

      expect(metrics).not.toBeNull()
      expect(Number.isInteger(metrics?.focusScore)).toBe(true)
      expect(Number.isInteger(metrics?.taskCompletionRate)).toBe(true)
      expect(Number.isInteger(metrics?.timeUtilization)).toBe(true)
      expect(Number.isInteger(metrics?.rhythmStability)).toBe(true)
      expect(Number.isInteger(metrics?.recoveryEfficiency)).toBe(true)
    })

    it('should return metrics within 0-100 range', () => {
      setPeriod(30)
      const metrics = getAverageMetrics()

      expect(metrics).not.toBeNull()
      expect(metrics!.focusScore).toBeGreaterThanOrEqual(0)
      expect(metrics!.focusScore).toBeLessThanOrEqual(100)
      expect(metrics!.taskCompletionRate).toBeGreaterThanOrEqual(0)
      expect(metrics!.taskCompletionRate).toBeLessThanOrEqual(100)
    })
  })

  describe('weekend effect', () => {
    it('should have lower scores on weekends', () => {
      const weekendRecords: EfficiencyRecord[] = []
      const weekdayRecords: EfficiencyRecord[] = []

      efficiencyState.records.forEach((record) => {
        const dayOfWeek = new Date(record.date).getDay()
        if (dayOfWeek === 0 || dayOfWeek === 6) {
          weekendRecords.push(record)
        } else {
          weekdayRecords.push(record)
        }
      })

      if (weekendRecords.length > 0 && weekdayRecords.length > 0) {
        const weekendAvg = weekendRecords.reduce((s, r) => s + r.focusScore, 0) / weekendRecords.length
        const weekdayAvg = weekdayRecords.reduce((s, r) => s + r.focusScore, 0) / weekdayRecords.length
        expect(weekendAvg).toBeLessThan(weekdayAvg)
      }
    })
  })
})
