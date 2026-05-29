import { ref, computed } from 'vue'
import type { Ingredient, MatchResult, MatchType, SynergyInfo } from '@/types'

const SYNERGY_PATTERNS: { compounds: string[]; effect: string; mechanism: string }[] = [
  { compounds: ['谷氨酸', '肌苷酸'], effect: '鲜味倍增效应', mechanism: "5'-核苷酸与谷氨酸协同作用于味觉受体" },
  { compounds: ['谷氨酸', '鸟苷酸'], effect: '鲜味增强', mechanism: '味觉受体变构调节' },
  { compounds: ['硫化物', '呋喃'], effect: '肉香放大', mechanism: '香气化合物协同释放' },
  { compounds: ['柠檬酸', '甜味物质'], effect: '甜酸平衡', mechanism: '味觉对比效应' },
  { compounds: ['辣椒素', '鲜味物质'], effect: '风味层次感', mechanism: '三叉神经与味觉系统交互' }
]

export function useMolecularMatcher() {
  const matchQueue = ref<{ ingredients: Ingredient[]; timestamp: number }[]>([])
  const isProcessing = ref(false)
  const matchResults = ref<MatchResult[]>([])

  const analyzeSharedCompounds = (a: Ingredient, b: Ingredient): string[] => {
    const setA = new Set(a.flavorCompounds)
    const setB = new Set(b.flavorCompounds)
    return Array.from(setA).filter(x => setB.has(x))
  }

  const calculateJaccardSimilarity = (a: Ingredient, b: Ingredient): number => {
    const setA = new Set(a.flavorCompounds)
    const setB = new Set(b.flavorCompounds)
    const intersection = Array.from(setA).filter(x => setB.has(x)).length
    const union = new Set([...setA, ...setB]).size
    return union > 0 ? intersection / union : 0
  }

  const detectSynergy = (combination: Ingredient[]): SynergyInfo[] => {
    const synergies: SynergyInfo[] = []
    const allCompounds = new Set<string>()
    
    combination.forEach(ing => {
      ing.flavorCompounds.forEach(c => allCompounds.add(c))
    })

    SYNERGY_PATTERNS.forEach(pattern => {
      const foundCompounds = pattern.compounds.filter(c => 
        Array.from(allCompounds).some(ac => ac.includes(c) || c.includes(ac))
      )
      
      if (foundCompounds.length >= 2) {
        synergies.push({
          ingredients: combination.map(i => i.name),
          effect: pattern.effect,
          intensity: Math.round((foundCompounds.length / pattern.compounds.length) * 100),
          mechanism: pattern.mechanism
        })
      }
    })

    return synergies
  }

  const determineMatchType = (a: Ingredient, b: Ingredient): MatchType => {
    const tasteDiff = Math.abs(a.taste.umami - b.taste.umami)
    const compoundSimilarity = calculateJaccardSimilarity(a, b)
    
    if (compoundSimilarity > 0.3 && tasteDiff < 30) {
      return 'enhance'
    } else if (compoundSimilarity > 0.15) {
      return 'complement'
    } else {
      return 'contrast'
    }
  }

  const calculateMatchScore = (a: Ingredient, b: Ingredient): number => {
    const compoundScore = calculateJaccardSimilarity(a, b) * 50
    
    const tasteA = Object.values(a.taste)
    const tasteB = Object.values(b.taste)
    let tasteCorrelation = 0
    for (let i = 0; i < tasteA.length; i++) {
      tasteCorrelation += Math.abs(tasteA[i] - tasteB[i])
    }
    const tasteScore = Math.max(0, 50 - tasteCorrelation / 10)
    
    const synergies = detectSynergy([a, b])
    const synergyBonus = synergies.length * 10

    return Math.min(100, Math.round(compoundScore + tasteScore + synergyBonus))
  }

  const generateMatchDescription = (a: Ingredient, b: Ingredient, matchType: MatchType, score: number): string => {
    const descriptions: Record<MatchType, string[]> = {
      complement: [
        `${a.name}与${b.name}的风味化合物形成完美互补`,
        `${a.name}的鲜香能够平衡${b.name}的特质`,
        `两者结合产生丰富的味觉层次`
      ],
      enhance: [
        `${a.name}与${b.name}共享关键风味物质，互相增强`,
        `分子层面的协同作用使鲜味倍增`,
        `经典搭配，经过科学验证的黄金组合`
      ],
      contrast: [
        `${a.name}与${b.name}形成有趣的味觉对比`,
        `差异创造惊喜，挑战传统味蕾体验`,
        `创意料理的探索之选`
      ]
    }

    const baseDesc = descriptions[matchType][Math.floor(Math.random() * descriptions[matchType].length)]
    const scoreComment = score >= 80 ? '绝佳搭配！' : score >= 60 ? '值得尝试' : '创意挑战'
    
    return `${baseDesc} - ${scoreComment}`
  }

  const findMatches = (baseIngredient: Ingredient, allIngredients: Ingredient[], count: number = 5): MatchResult[] => {
    const results: MatchResult[] = []
    
    allIngredients.forEach(candidate => {
      if (candidate.id === baseIngredient.id) return
      
      const sharedCompounds = analyzeSharedCompounds(baseIngredient, candidate)
      const matchType = determineMatchType(baseIngredient, candidate)
      const score = calculateMatchScore(baseIngredient, candidate)
      const description = generateMatchDescription(baseIngredient, candidate, matchType, score)
      
      const synergies = detectSynergy([baseIngredient, candidate])
      const synergyEffect = synergies.length > 0 ? synergies[0].effect : '风味融合'

      results.push({
        id: `match-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        ingredientA: baseIngredient.id,
        ingredientB: candidate.id,
        score,
        matchType,
        sharedCompounds,
        synergyEffect,
        description
      })
    })

    return results.sort((a, b) => b.score - a.score).slice(0, count)
  }

  const generateInnovativeCombos = (baseIngredients: Ingredient[], allIngredients: Ingredient[], count: number = 5): MatchResult[] => {
    if (baseIngredients.length === 0) return []
    
    const results: MatchResult[] = []
    const usedIds = new Set(baseIngredients.map(i => i.id))
    
    const candidates = allIngredients.filter(i => !usedIds.has(i.id))
    
    for (let i = 0; i < Math.min(count, candidates.length); i++) {
      const candidate = candidates[Math.floor(Math.random() * candidates.length)]
      const baseForMatch = baseIngredients[Math.floor(Math.random() * baseIngredients.length)]
      
      const sharedCompounds = analyzeSharedCompounds(baseForMatch, candidate)
      const matchType = determineMatchType(baseForMatch, candidate)
      const score = calculateMatchScore(baseForMatch, candidate)
      const description = `将${candidate.name}加入组合，创造独特风味体验`
      const synergies = detectSynergy([...baseIngredients, candidate])
      const synergyEffect = synergies.length > 0 ? synergies[0].effect : '创新融合'

      results.push({
        id: `innovative-${Date.now()}-${i}`,
        ingredientA: baseForMatch.id,
        ingredientB: candidate.id,
        score: Math.min(100, score + 15),
        matchType,
        sharedCompounds,
        synergyEffect,
        description
      })
    }

    return results.sort((a, b) => b.score - a.score)
  }

  const topMatches = computed(() => {
    return [...matchResults.value].sort((a, b) => b.score - a.score)
  })

  return {
    matchQueue,
    isProcessing,
    matchResults,
    topMatches,
    analyzeSharedCompounds,
    calculateJaccardSimilarity,
    detectSynergy,
    findMatches,
    generateInnovativeCombos,
    calculateMatchScore
  }
}
