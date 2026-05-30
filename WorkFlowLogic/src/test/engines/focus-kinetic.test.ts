import { describe, it, expect } from 'vitest'
import {
  computeKineticFrame,
  generateWaveformPoints,
  smoothWaveform,
  getGlowIntensity,
  getGlowColor,
} from '~/engines/focus-kinetic'
import type { FocusSample } from '~/types'

describe('FocusKinetic Engine', () => {
  const createSample = (value: number, type: FocusSample['type'] = 'moderate'): FocusSample => ({
    timestamp: Date.now(),
    value,
    type,
  })

  describe('computeKineticFrame', () => {
    it('should return default frame for empty samples', () => {
      const result = computeKineticFrame([])
      expect(result).toEqual({
        value: 0,
        level: 'idle',
        velocity: 0,
        acceleration: 0,
        momentum: 0,
      })
    })

    it('should compute correct value and level from last sample', () => {
      const samples = [createSample(75, 'deep')]
      const result = computeKineticFrame(samples)
      expect(result.value).toBe(75)
      expect(result.level).toBe('deep')
    })

    it('should compute velocity with 2 samples', () => {
      const samples = [createSample(50), createSample(60)]
      const result = computeKineticFrame(samples)
      expect(result.velocity).toBe(10)
    })

    it('should compute acceleration with 3+ samples', () => {
      const samples = [createSample(40), createSample(50), createSample(65)]
      const result = computeKineticFrame(samples)
      expect(result.velocity).toBe(15)
      expect(result.acceleration).toBe(5)
    })

    it('should compute momentum correctly', () => {
      const samples = [createSample(50), createSample(60)]
      const result = computeKineticFrame(samples)
      const expectedMomentum = 60 * Math.abs(10 + 1) / 100
      expect(result.momentum).toBeCloseTo(expectedMomentum)
    })

    it('should handle decreasing values correctly', () => {
      const samples = [createSample(80), createSample(70), createSample(55)]
      const result = computeKineticFrame(samples)
      expect(result.velocity).toBe(-15)
      expect(result.acceleration).toBe(-5)
    })
  })

  describe('generateWaveformPoints', () => {
    it('should return empty array for empty samples', () => {
      const result = generateWaveformPoints([], 800, 200)
      expect(result).toEqual([])
    })

    it('should generate points within canvas bounds', () => {
      const samples = Array.from({ length: 10 }, (_, i) => createSample(30 + i * 5))
      const result = generateWaveformPoints(samples, 800, 200)

      expect(result.length).toBeGreaterThan(0)
      result.forEach((point) => {
        expect(point.x).toBeGreaterThanOrEqual(0)
        expect(point.x).toBeLessThanOrEqual(800)
        expect(point.y).toBeGreaterThanOrEqual(0)
        expect(point.y).toBeLessThanOrEqual(200)
      })
    })

    it('should map value 100 to top of canvas', () => {
      const samples = [createSample(0), createSample(100)]
      const result = generateWaveformPoints(samples, 100, 200)
      expect(result[1].y).toBe(0)
    })

    it('should map value 0 to bottom of canvas', () => {
      const samples = [createSample(0), createSample(100)]
      const result = generateWaveformPoints(samples, 100, 200)
      expect(result[0].y).toBe(200)
    })
  })

  describe('smoothWaveform', () => {
    it('should return empty string for less than 2 points', () => {
      expect(smoothWaveform([])).toBe('')
      expect(smoothWaveform([{ x: 0, y: 0 }])).toBe('')
    })

    it('should generate valid SVG path', () => {
      const points = [
        { x: 0, y: 100 },
        { x: 50, y: 50 },
        { x: 100, y: 75 },
      ]
      const path = smoothWaveform(points)
      expect(path).toContain('M ')
      expect(path).toContain(' C ')
      expect(path).toMatch(/^M \d+ \d+/)
    })

    it('should respect tension parameter', () => {
      const points = [
        { x: 0, y: 100 },
        { x: 50, y: 50 },
        { x: 100, y: 75 },
      ]
      const pathLowTension = smoothWaveform(points, 0.1)
      const pathHighTension = smoothWaveform(points, 0.5)
      expect(pathLowTension).not.toBe(pathHighTension)
    })
  })

  describe('getGlowIntensity', () => {
    it('should return highest intensity for deep focus', () => {
      expect(getGlowIntensity('deep')).toBe(1.0)
    })

    it('should return correct intensities for all levels', () => {
      expect(getGlowIntensity('deep')).toBeGreaterThan(getGlowIntensity('moderate'))
      expect(getGlowIntensity('moderate')).toBeGreaterThan(getGlowIntensity('distracted'))
      expect(getGlowIntensity('distracted')).toBeGreaterThan(getGlowIntensity('idle'))
    })

    it('should return values between 0 and 1', () => {
      const levels: Array<FocusSample['type']> = ['deep', 'moderate', 'distracted', 'idle']
      levels.forEach((level) => {
        const intensity = getGlowIntensity(level)
        expect(intensity).toBeGreaterThanOrEqual(0)
        expect(intensity).toBeLessThanOrEqual(1)
      })
    })
  })

  describe('getGlowColor', () => {
    it('should return valid hex color strings', () => {
      const levels: Array<FocusSample['type']> = ['deep', 'moderate', 'distracted', 'idle']
      levels.forEach((level) => {
        const color = getGlowColor(level)
        expect(color).toMatch(/^#[0-9A-Fa-f]{6}$/)
      })
    })

    it('should return distinct colors for each level', () => {
      const colors = new Set()
      const levels: Array<FocusSample['type']> = ['deep', 'moderate', 'distracted', 'idle']
      levels.forEach((level) => {
        colors.add(getGlowColor(level))
      })
      expect(colors.size).toBe(4)
    })
  })
})
