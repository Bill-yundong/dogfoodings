import { ref } from 'vue'
import type { Ingredient, MaillardSimulationResult, MaillardProfile } from '@/types'

const GAS_CONSTANT = 8.314
const ACTIVATION_ENERGY = 100000
const PRE_EXPONENTIAL = 1e12

export function useMaillardEngine() {
  const calculateReactionRate = (temperature: number): number => {
    const tempK = temperature + 273.15
    return PRE_EXPONENTIAL * Math.exp(-ACTIVATION_ENERGY / (GAS_CONSTANT * tempK))
  }

  const simulateReaction = (
    temp: number,
    time: number,
    pH: number = 7.0
  ): MaillardSimulationResult => {
    const timePoints: number[] = []
    const browningLevels: number[] = []
    const aromaIntensities: number[] = []
    
    const rate = calculateReactionRate(temp)
    const pHFactor = 1 + (pH - 7) * 0.15

    for (let t = 0; t <= time; t += Math.max(1, time / 20)) {
      timePoints.push(t)
      
      const progress = 1 - Math.exp(-rate * t * pHFactor * 0.01)
      const browning = Math.min(100, progress * 100 * (temp / 200))
      browningLevels.push(Math.round(browning * 10) / 10)
      
      const aroma = Math.min(100, browning * (0.6 + 0.4 * Math.sin(progress * Math.PI)))
      aromaIntensities.push(Math.round(aroma * 10) / 10)
    }

    const flavorCompounds = [
      { compound: '吡嗪类', concentration: Math.round(Math.random() * 30 + 20) },
      { compound: '呋喃类', concentration: Math.round(Math.random() * 25 + 15) },
      { compound: '噻吩类', concentration: Math.round(Math.random() * 20 + 10) },
      { compound: '羰基化合物', concentration: Math.round(Math.random() * 35 + 25) }
    ]

    return {
      time: timePoints,
      browningLevel: browningLevels,
      aromaIntensity: aromaIntensities,
      flavorCompounds
    }
  }

  const optimizeCookingParams = (
    ingredients: Ingredient[],
    targetBrowning: number = 70,
    maxTime: number = 30
  ): { temperature: number; time: number; expectedAroma: number } => {
    if (ingredients.length === 0) {
      return { temperature: 160, time: 15, expectedAroma: 60 }
    }

    const avgMaillard = ingredients.reduce((sum, ing) => {
      return sum + ing.maillard.browningRate
    }, 0) / ingredients.length

    let bestTemp = 160
    let bestTime = 15
    let bestScore = Infinity

    for (let temp = 120; temp <= 220; temp += 5) {
      for (let time = 5; time <= maxTime; time += 1) {
        const rate = calculateReactionRate(temp)
        const progress = 1 - Math.exp(-rate * time * avgMaillard * 0.01)
        const browning = Math.min(100, progress * 100 * (temp / 200))
        const score = Math.abs(browning - targetBrowning) + time * 0.5
        
        if (score < bestScore) {
          bestScore = score
          bestTemp = temp
          bestTime = time
        }
      }
    }

    const expectedAroma = Math.round(targetBrowning * (0.7 + avgMaillard * 0.3))

    return {
      temperature: bestTemp,
      time: bestTime,
      expectedAroma: Math.min(100, expectedAroma)
    }
  }

  const getMaillardStage = (browningLevel: number): { stage: string; description: string; color: string } => {
    if (browningLevel < 20) {
      return {
        stage: '起始阶段',
        description: '羰氨缩合反应开始，产生初步香气',
        color: '#FEF3C7'
      }
    } else if (browningLevel < 50) {
      return {
        stage: '发展阶段',
        description: 'Amadori重排，风味化合物快速形成',
        color: '#FCD34D'
      }
    } else if (browningLevel < 80) {
      return {
        stage: '黄金阶段',
        description: '美拉德反应高峰期，风味最丰富',
        color: '#F59E0B'
      }
    } else {
      return {
        stage: '深度阶段',
        description: '类黑素形成，注意避免焦苦',
        color: '#92400E'
      }
    }
  }

  const calculateCombinedMaillard = (ingredients: Ingredient[]): MaillardProfile => {
    if (ingredients.length === 0) {
      return {
        optimalTemp: 160,
        optimalTime: 15,
        browningRate: 0.5,
        aromaIntensity: 50,
        flavorCompounds: []
      }
    }

    const allCompounds = new Set<string>()
    let totalTemp = 0
    let totalTime = 0
    let totalBrowning = 0
    let totalAroma = 0

    ingredients.forEach(ing => {
      totalTemp += ing.maillard.optimalTemp
      totalTime += ing.maillard.optimalTime
      totalBrowning += ing.maillard.browningRate
      totalAroma += ing.maillard.aromaIntensity
      ing.maillard.flavorCompounds.forEach(c => allCompounds.add(c))
    })

    return {
      optimalTemp: Math.round(totalTemp / ingredients.length),
      optimalTime: Math.round(totalTime / ingredients.length),
      browningRate: Math.round((totalBrowning / ingredients.length) * 100) / 100,
      aromaIntensity: Math.round(totalAroma / ingredients.length),
      flavorCompounds: Array.from(allCompounds)
    }
  }

  return {
    simulateReaction,
    optimizeCookingParams,
    getMaillardStage,
    calculateCombinedMaillard,
    calculateReactionRate
  }
}
