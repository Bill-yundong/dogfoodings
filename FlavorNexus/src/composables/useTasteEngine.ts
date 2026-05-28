import { computed } from 'vue'
import type { TasteCoordinate, Ingredient, BalanceAnalysis } from '@/types'
import { TASTE_DIMENSIONS } from '@/types'

export function useTasteEngine() {
  const calculateCombinedTaste = (ingredients: Ingredient[]): TasteCoordinate => {
    if (ingredients.length === 0) {
      return { sweet: 0, sour: 0, bitter: 0, salty: 0, umami: 0 }
    }

    const totalWeight = ingredients.length
    const combined: TasteCoordinate = { sweet: 0, sour: 0, bitter: 0, salty: 0, umami: 0 }

    ingredients.forEach(ing => {
      combined.sweet += ing.taste.sweet
      combined.sour += ing.taste.sour
      combined.bitter += ing.taste.bitter
      combined.salty += ing.taste.salty
      combined.umami += ing.taste.umami
    })

    return {
      sweet: Math.round(combined.sweet / totalWeight),
      sour: Math.round(combined.sour / totalWeight),
      bitter: Math.round(combined.bitter / totalWeight),
      salty: Math.round(combined.salty / totalWeight),
      umami: Math.round(combined.umami / totalWeight)
    }
  }

  const calculateTasteDistance = (a: TasteCoordinate, b: TasteCoordinate): number => {
    const distances = TASTE_DIMENSIONS.map(dim => {
      return Math.pow(a[dim] - b[dim], 2)
    })
    return Math.sqrt(distances.reduce((sum, d) => sum + d, 0))
  }

  const calculateSimilarity = (a: TasteCoordinate, b: TasteCoordinate): number => {
    const maxDistance = Math.sqrt(5 * Math.pow(100, 2))
    const distance = calculateTasteDistance(a, b)
    return Math.round((1 - distance / maxDistance) * 100)
  }

  const analyzeBalance = (taste: TasteCoordinate): BalanceAnalysis => {
    const values = TASTE_DIMENSIONS.map(dim => taste[dim])
    const mean = values.reduce((sum, v) => sum + v, 0) / values.length
    const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length
    const stdDev = Math.sqrt(variance)

    const thresholdHigh = mean + stdDev * 0.5
    const thresholdLow = mean - stdDev * 0.5

    const dominantTastes: string[] = []
    const weakTastes: string[] = []
    const tasteLabels: Record<string, string> = {
      sweet: '甜',
      sour: '酸',
      bitter: '苦',
      salty: '咸',
      umami: '鲜'
    }

    TASTE_DIMENSIONS.forEach(dim => {
      if (taste[dim] > thresholdHigh) {
        dominantTastes.push(tasteLabels[dim])
      } else if (taste[dim] < thresholdLow) {
        weakTastes.push(tasteLabels[dim])
      }
    })

    const overallScore = Math.round(Math.max(0, 100 - stdDev * 1.5))

    const suggestions: string[] = []
    if (weakTastes.length > 0) {
      suggestions.push(`可以增加${weakTastes.join('、')}味食材`)
    }
    if (dominantTastes.length > 2) {
      suggestions.push(`整体味道偏重，注意${dominantTastes.join('、')}味的平衡`)
    }
    if (overallScore >= 80) {
      suggestions.push('风味平衡良好！')
    }

    return {
      overallScore,
      dominantTastes,
      weakTastes,
      suggestions,
      standardDeviation: Math.round(stdDev * 10) / 10
    }
  }

  const getTasteEmoji = (taste: string): string => {
    const emojis: Record<string, string> = {
      sweet: '🍬',
      sour: '🍋',
      bitter: '☕',
      salty: '🧂',
      umami: '🍄'
    }
    return emojis[taste] || '❓'
  }

  const getTasteLabel = (taste: string): string => {
    const labels: Record<string, string> = {
      sweet: '甜',
      sour: '酸',
      bitter: '苦',
      salty: '咸',
      umami: '鲜'
    }
    return labels[taste] || taste
  }

  const tasteColor = (taste: string): string => {
    const colors: Record<string, string> = {
      sweet: '#FBBF24',
      sour: '#EF4444',
      bitter: '#6B7280',
      salty: '#3B82F6',
      umami: '#8B5CF6'
    }
    return colors[taste] || '#9CA3AF'
  }

  return {
    calculateCombinedTaste,
    calculateTasteDistance,
    calculateSimilarity,
    analyzeBalance,
    getTasteEmoji,
    getTasteLabel,
    tasteColor
  }
}
