import type { SkinFeatures, SkinScan, TrendReport } from '../types'

export class FeatureExtractorService {
  private worker: Worker | null = null

  initWorker(): void {
    const workerCode = `
      self.onmessage = async function(e) {
        const { imageData, type } = e.data
        
        if (type === 'extractFeatures') {
          const features = await extractFeaturesAsync(imageData)
          self.postMessage({ type: 'features', data: features })
        } else if (type === 'trendAnalysis') {
          const report = analyzeTrends(imageData)
          self.postMessage({ type: 'trend', data: report })
        }
      }

      function extractFeaturesAsync(imageData) {
        return new Promise((resolve) => {
          setTimeout(() => {
            const features = analyzeImageTexture(imageData)
            resolve(features)
          }, 100)
        })
      }

      function analyzeImageTexture(imageData) {
        const data = imageData.data
        const width = imageData.width
        const height = imageData.height
        
        let totalBrightness = 0
        let varianceSum = 0
        let edgeCount = 0
        
        for (let y = 0; y < height; y++) {
          for (let x = 0; x < width; x++) {
            const idx = (y * width + x) * 4
            const brightness = (data[idx] + data[idx + 1] + data[idx + 2]) / 3
            totalBrightness += brightness
            
            if (x > 0 && y > 0) {
              const leftIdx = (y * width + x - 1) * 4
              const topIdx = ((y - 1) * width + x) * 4
              const leftBrightness = (data[leftIdx] + data[leftIdx + 1] + data[leftIdx + 2]) / 3
              const topBrightness = (data[topIdx] + data[topIdx + 1] + data[topIdx + 2]) / 3
              
              varianceSum += Math.pow(brightness - leftBrightness, 2)
              
              if (Math.abs(brightness - leftBrightness) > 20 || Math.abs(brightness - topBrightness) > 20) {
                edgeCount++
              }
            }
          }
        }
        
        const pixelCount = width * height
        const avgBrightness = totalBrightness / pixelCount
        const roughness = Math.sqrt(varianceSum / pixelCount) / 50
        const edgeDensity = edgeCount / pixelCount * 100
        
        const moisture = Math.max(0, Math.min(100, 75 - roughness * 30 + Math.random() * 10))
        const oiliness = Math.max(0, Math.min(100, avgBrightness / 2.55 * 0.6 + Math.random() * 20))
        const elasticity = Math.max(0, Math.min(100, 85 - edgeDensity * 2 + Math.random() * 15))
        const poreSize = Math.max(0, Math.min(100, roughness * 80 + Math.random() * 10))
        const wrinkles = Math.max(0, Math.min(100, edgeDensity * 5 + Math.random() * 10))
        
        return {
          moisture,
          oiliness,
          elasticity,
          roughness: Math.min(100, roughness * 100),
          poreSize,
          wrinkles,
          activeIngredients: generateIngredientData()
        }
      }

      function generateIngredientData() {
        const ingredients = ['hyaluronic_acid', 'niacinamide', 'vitamin_c', 'retinol', 'peptides']
        const result = {}
        
        ingredients.forEach(ingredient => {
          const distribution = []
          for (let i = 0; i < 10; i++) {
            const row = []
            for (let j = 0; j < 10; j++) {
              row.push(Math.random())
            }
            distribution.push(row)
          }
          
          result[ingredient] = {
            concentration: Math.random() * 100,
            penetration: Math.random() * 100,
            distribution
          }
        })
        
        return result
      }

      function analyzeTrends(scans) {
        const featureTrends = {}
        const features = ['moisture', 'oiliness', 'elasticity', 'roughness', 'poreSize', 'wrinkles']
        
        features.forEach(feature => {
          const values = scans.map(scan => scan.features[feature])
          const change = values.length > 1 
            ? ((values[values.length - 1] - values[0]) / values[0]) * 100 
            : 0
          
          featureTrends[feature] = { values, change }
        })
        
        const overallScores = scans.map(s => s.overallScore)
        const overallChange = overallScores.length > 1
          ? ((overallScores[overallScores.length - 1] - overallScores[0]) / overallScores[0]) * 100
          : 0
        
        const insights = generateInsights(featureTrends)
        
        return {
          period: scans.length + '天',
          overallChange,
          featureTrends,
          insights
        }
      }

      function generateInsights(trends) {
        const insights = []
        
        if (trends.moisture.change > 5) {
          insights.push('肌肤含水量显著提升，继续保持当前补水方案')
        } else if (trends.moisture.change < -5) {
          insights.push('肌肤含水量有所下降，建议加强补水护理')
        }
        
        if (trends.oiliness.change < -3) {
          insights.push('油脂分泌得到有效控制')
        }
        
        if (trends.elasticity.change > 3) {
          insights.push('肌肤弹性有所改善，抗衰护理见效')
        }
        
        if (trends.wrinkles.change < -2) {
          insights.push('细纹有所减轻，继续使用抗皱产品')
        }
        
        if (insights.length === 0) {
          insights.push('肤质状态稳定，继续保持当前护理方案')
        }
        
        return insights
      }
    `

    const blob = new Blob([workerCode], { type: 'application/javascript' })
    this.worker = new Worker(URL.createObjectURL(blob))
  }

  async extractFeatures(imageData: ImageData): Promise<SkinFeatures> {
    if (!this.worker) {
      this.initWorker()
    }

    return new Promise((resolve) => {
      this.worker!.onmessage = (e) => {
        if (e.data.type === 'features') {
          resolve(e.data.data)
        }
      }
      this.worker!.postMessage({ imageData, type: 'extractFeatures' })
    })
  }

  async analyzeTrends(scans: SkinScan[]): Promise<TrendReport> {
    if (!this.worker) {
      this.initWorker()
    }

    return new Promise((resolve) => {
      this.worker!.onmessage = (e) => {
        if (e.data.type === 'trend') {
          resolve(e.data.data)
        }
      }
      this.worker!.postMessage({ imageData: scans, type: 'trendAnalysis' })
    })
  }

  calculateOverallScore(features: SkinFeatures): number {
    const weights = {
      moisture: 0.25,
      oiliness: 0.15,
      elasticity: 0.20,
      roughness: 0.15,
      poreSize: 0.15,
      wrinkles: 0.10
    }

    const normalizedOiliness = 100 - Math.abs(features.oiliness - 50) * 2

    const score =
      features.moisture * weights.moisture +
      normalizedOiliness * weights.oiliness +
      features.elasticity * weights.elasticity +
      (100 - features.roughness) * weights.roughness +
      (100 - features.poreSize) * weights.poreSize +
      (100 - features.wrinkles) * weights.wrinkles

    return Math.round(Math.max(0, Math.min(100, score)))
  }

  terminate(): void {
    if (this.worker) {
      this.worker.terminate()
      this.worker = null
    }
  }
}

export const featureExtractor = new FeatureExtractorService()
