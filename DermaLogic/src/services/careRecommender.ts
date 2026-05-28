import type { SkinFeatures, CarePlan, CareRecommendation } from '../types'

export class CareRecommenderService {
  private ingredientDatabase = {
    hyaluronic_acid: {
      name: '透明质酸',
      benefits: ['保湿', '修复屏障'],
      targets: ['moisture', 'elasticity']
    },
    niacinamide: {
      name: '烟酰胺',
      benefits: ['控油', '提亮', '收缩毛孔'],
      targets: ['oiliness', 'poreSize']
    },
    vitamin_c: {
      name: '维生素C',
      benefits: ['抗氧化', '提亮', '胶原蛋白生成'],
      targets: ['elasticity', 'wrinkles']
    },
    retinol: {
      name: '视黄醇',
      benefits: ['抗皱', '促进角质代谢'],
      targets: ['wrinkles', 'roughness']
    },
    peptides: {
      name: '肽类',
      benefits: ['修复', '抗衰'],
      targets: ['elasticity', 'wrinkles']
    },
    salicylic_acid: {
      name: '水杨酸',
      benefits: ['去角质', '清洁毛孔'],
      targets: ['roughness', 'poreSize']
    },
    ceramides: {
      name: '神经酰胺',
      benefits: ['修复屏障', '保湿'],
      targets: ['moisture']
    },
    centella: {
      name: '积雪草',
      benefits: ['舒缓', '修复'],
      targets: ['moisture', 'elasticity']
    }
  }

  private productDatabase: Record<string, { ingredients: string[]; type: CareRecommendation['type'] }> = {
    '温和洁面乳': { ingredients: ['centella', 'ceramides'], type: 'cleanser' },
    '控油爽肤水': { ingredients: ['niacinamide', 'salicylic_acid'], type: 'toner' },
    '玻尿酸精华': { ingredients: ['hyaluronic_acid', 'ceramides'], type: 'serum' },
    '维C亮肤精华': { ingredients: ['vitamin_c', 'niacinamide'], type: 'serum' },
    '视黄醇抗皱精华': { ingredients: ['retinol', 'peptides'], type: 'serum' },
    '修护保湿霜': { ingredients: ['ceramides', 'centella'], type: 'moisturizer' },
    '清透防晒乳': { ingredients: [], type: 'sunscreen' }
  }

  generateCarePlan(features: SkinFeatures, userId: string): CarePlan {
    const recommendations: CareRecommendation[] = []
    
    const priorityFeatures = this.analyzeSkinNeeds(features)
    
    priorityFeatures.forEach((need, index) => {
      const products = this.findMatchingProducts(need.feature, need.severity)
      products.forEach((product, pIndex) => {
        recommendations.push({
          id: `rec-${index}-${pIndex}`,
          type: product.type,
          product: product.name,
          ingredients: product.ingredients.map(i => 
            this.ingredientDatabase[i as keyof typeof this.ingredientDatabase]?.name || i
          ),
          frequency: this.getFrequency(product.type),
          matchScore: Math.round(70 + Math.random() * 25)
        })
      })
    })

    const uniqueRecommendations = this.dedupeRecommendations(recommendations)

    return {
      id: `plan-${Date.now()}`,
      userId,
      recommendations: uniqueRecommendations.slice(0, 6),
      startDate: new Date(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    }
  }

  private analyzeSkinNeeds(features: SkinFeatures): { feature: string; severity: number }[] {
    const needs: { feature: string; severity: number }[] = []

    if (features.moisture < 50) {
      needs.push({ feature: 'moisture', severity: (50 - features.moisture) / 50 })
    }
    if (features.oiliness > 65) {
      needs.push({ feature: 'oiliness', severity: (features.oiliness - 65) / 35 })
    }
    if (features.elasticity < 60) {
      needs.push({ feature: 'elasticity', severity: (60 - features.elasticity) / 60 })
    }
    if (features.roughness > 50) {
      needs.push({ feature: 'roughness', severity: (features.roughness - 50) / 50 })
    }
    if (features.poreSize > 50) {
      needs.push({ feature: 'poreSize', severity: (features.poreSize - 50) / 50 })
    }
    if (features.wrinkles > 40) {
      needs.push({ feature: 'wrinkles', severity: (features.wrinkles - 40) / 60 })
    }

    return needs.sort((a, b) => b.severity - a.severity)
  }

  private findMatchingProducts(feature: string, severity: number): Array<{ name: string; ingredients: string[]; type: CareRecommendation['type'] }> {
    const results: Array<{ name: string; ingredients: string[]; type: CareRecommendation['type'] }> = []
    
    const relevantIngredients = Object.entries(this.ingredientDatabase)
      .filter(([_, data]) => data.targets.includes(feature))
      .map(([key]) => key)

    Object.entries(this.productDatabase).forEach(([name, product]) => {
      const matchCount = product.ingredients.filter(i => 
        relevantIngredients.includes(i)
      ).length
      
      if (matchCount > 0 || severity > 0.5) {
        results.push({ name, ingredients: product.ingredients, type: product.type })
      }
    })

    return results
  }

  private dedupeRecommendations(recommendations: CareRecommendation[]): CareRecommendation[] {
    const seen = new Set<CareRecommendation['type']>()
    return recommendations.filter(rec => {
      if (seen.has(rec.type)) {
        return rec.type === 'serum' && Array.from(seen).filter(t => t === 'serum').length < 2
      }
      seen.add(rec.type)
      return true
    })
  }

  private getFrequency(type: CareRecommendation['type']): string {
    const frequencies: Record<CareRecommendation['type'], string> = {
      cleanser: '早晚各一次',
      toner: '早晚各一次',
      serum: '每日一次',
      moisturizer: '早晚各一次',
      sunscreen: '每日早上'
    }
    return frequencies[type]
  }

  getIngredientInfo(key: string): { name: string; benefits: string[] } | null {
    const info = this.ingredientDatabase[key as keyof typeof this.ingredientDatabase]
    return info || null
  }

  generateDetailedReport(carePlan: CarePlan, features: SkinFeatures): string {
    const typeLabels: Record<string, string> = {
      cleanser: '洁面',
      toner: '爽肤水',
      serum: '精华',
      moisturizer: '保湿',
      sunscreen: '防晒'
    }

    const featureLabels: Record<string, string> = {
      moisture: '含水量',
      oiliness: '油脂分泌',
      elasticity: '肌肤弹性',
      roughness: '粗糙度',
      poreSize: '毛孔大小',
      wrinkles: '细纹程度'
    }

    let report = '='.repeat(50) + '\n'
    report += '           DermaLogic 个性化护理方案报告\n'
    report += '='.repeat(50) + '\n\n'
    report += `生成日期: ${new Date().toLocaleDateString('zh-CN')}\n`
    report += `方案有效期: ${new Date(carePlan.startDate).toLocaleDateString('zh-CN')} - ${new Date(carePlan.endDate).toLocaleDateString('zh-CN')}\n\n`

    report += '-'.repeat(50) + '\n'
    report += '一、肤质检测分析\n'
    report += '-'.repeat(50) + '\n\n'

    Object.entries(features).forEach(([key, value]) => {
      if (key !== 'activeIngredients') {
        const label = featureLabels[key] || key
        const status = (value as number) >= 70 ? '优秀' : (value as number) >= 50 ? '良好' : '需改善'
        report += `  ${label}: ${Math.round(value as number)}% [${status}]\n`
      }
    })

    report += '\n' + '-'.repeat(50) + '\n'
    report += '二、活性成分分布\n'
    report += '-'.repeat(50) + '\n\n'

    Object.entries(features.activeIngredients).forEach(([key, data]) => {
      const name = key === 'hyaluronic_acid' ? '透明质酸' :
                   key === 'niacinamide' ? '烟酰胺' :
                   key === 'vitamin_c' ? '维生素C' :
                   key === 'retinol' ? '视黄醇' : '肽类'
      report += `  ${name}: ${Math.round((data as { concentration: number }).concentration)}%\n`
    })

    report += '\n' + '-'.repeat(50) + '\n'
    report += '三、推荐护理流程\n'
    report += '-'.repeat(50) + '\n\n'

    carePlan.recommendations.forEach((rec, index) => {
      report += `${index + 1}. [${typeLabels[rec.type] || rec.type}] ${rec.product}\n`
      report += `   匹配度: ${rec.matchScore}%\n`
      report += `   使用频率: ${rec.frequency}\n`
      report += `   核心成分: ${rec.ingredients.join('、')}\n\n`
    })

    report += '-'.repeat(50) + '\n'
    report += '四、护理建议\n'
    report += '-'.repeat(50) + '\n\n'
    report += '  1. 请按照推荐频率坚持使用产品\n'
    report += '  2. 建议每2周进行一次肤质检测，追踪护理效果\n'
    report += '  3. 如出现皮肤不适，请立即停用并咨询专业人士\n'
    report += '  4. 保持良好的作息和饮食习惯，由内而外改善肤质\n\n'

    report += '='.repeat(50) + '\n'
    report += '                祝您拥有健康美丽的肌肤！\n'
    report += '='.repeat(50) + '\n'

    return report
  }
}

export const careRecommender = new CareRecommenderService()
