export class MixingAnalyzer {
  constructor(gridSize = { x: 64, y: 64 }) {
    this.nx = gridSize.x
    this.ny = gridSize.y
    this.tankRadius = 0.48
    this.centerX = this.nx / 2
    this.centerY = this.ny / 2
  }

  idx(i, j) {
    return i * this.ny + j
  }

  calculateMixingUniformity(concentrationField) {
    let sumConc = 0
    let sumConcSq = 0
    let count = 0
    const values = []

    for (let i = 0; i < this.nx; i++) {
      for (let j = 0; j < this.ny; j++) {
        const idx = this.idx(i, j)
        const dx = (i - this.centerX) / this.nx
        const dy = (j - this.centerY) / this.ny
        const dist = Math.sqrt(dx * dx + dy * dy)

        if (dist <= this.tankRadius) {
          const conc = concentrationField[idx]
          sumConc += conc
          sumConcSq += conc * conc
          values.push(conc)
          count++
        }
      }
    }

    if (count === 0) {
      return {
        uniformity: 0,
        mean: 0,
        variance: 0,
        stdDev: 0,
        coefficientOfVariation: 1,
        intensityOfSegregation: 1,
        scaleOfSegregation: 0
      }
    }

    const mean = sumConc / count
    const variance = (sumConcSq / count) - mean * mean
    const stdDev = Math.sqrt(Math.max(0, variance))
    const coefficientOfVariation = mean > 0 ? stdDev / mean : 0
    
    const maxPossibleVariance = mean * (1 - mean)
    const intensityOfSegregation = maxPossibleVariance > 0 ? variance / maxPossibleVariance : 0
    
    const uniformity = Math.max(0, 1 - coefficientOfVariation)

    const scaleOfSegregation = this.calculateSegregationScale(concentrationField, mean)

    return {
      uniformity,
      mean,
      variance,
      stdDev,
      coefficientOfVariation,
      intensityOfSegregation,
      scaleOfSegregation
    }
  }

  calculateSegregationScale(concentrationField, mean) {
    let sumCorrelation = 0
    let count = 0
    const maxLag = Math.min(10, Math.floor(this.nx / 6))

    for (let lag = 1; lag <= maxLag; lag++) {
      let correlation = 0
      let pairCount = 0

      for (let i = 0; i < this.nx - lag; i++) {
        for (let j = 0; j < this.ny; j++) {
          const idx1 = this.idx(i, j)
          const idx2 = this.idx(i + lag, j)
          
          const dx1 = (i - this.centerX) / this.nx
          const dy1 = (j - this.centerY) / this.ny
          const dist1 = Math.sqrt(dx1 * dx1 + dy1 * dy1)
          
          const dx2 = (i + lag - this.centerX) / this.nx
          const dy2 = (j - this.centerY) / this.ny
          const dist2 = Math.sqrt(dx2 * dx2 + dy2 * dy2)

          if (dist1 <= this.tankRadius && dist2 <= this.tankRadius) {
            const c1 = concentrationField[idx1] - mean
            const c2 = concentrationField[idx2] - mean
            correlation += c1 * c2
            pairCount++
          }
        }
      }

      if (pairCount > 0) {
        correlation /= pairCount
        sumCorrelation += correlation
        count++
      }
    }

    return count > 0 ? Math.max(0, sumCorrelation / count) : 0
  }

  detectDeadZones(velocityField, deadZoneFlags, threshold = 0.05) {
    const deadZones = []
    const vx = velocityField.vx
    const vy = velocityField.vy

    for (let i = 0; i < this.nx; i++) {
      for (let j = 0; j < this.ny; j++) {
        const idx = this.idx(i, j)
        const dx = (i - this.centerX) / this.nx
        const dy = (j - this.centerY) / this.ny
        const dist = Math.sqrt(dx * dx + dy * dy)

        if (dist <= this.tankRadius && dist > this.tankRadius * 0.6) {
          const velMag = Math.sqrt(vx[idx] * vx[idx] + vy[idx] * vy[idx])
          const deadFlag = deadZoneFlags ? deadZoneFlags[idx] : 0

          if (velMag < threshold && deadFlag > 100) {
            deadZones.push({
              i,
              j,
              x: dx,
              y: dy,
              velocity: velMag,
              deadZoneScore: deadFlag / 255,
              radius: dist
            })
          }
        }
      }
    }

    const clusteredZones = this.clusterDeadZones(deadZones)
    
    return {
      deadZoneCount: deadZones.length,
      deadZoneRatio: deadZones.length / (this.nx * this.ny),
      deadZones: clusteredZones,
      totalArea: deadZones.length / (this.nx * this.ny)
    }
  }

  clusterDeadZones(deadZones) {
    if (deadZones.length === 0) return []

    const clusters = []
    const visited = new Set()
    const gridMap = new Map()

    for (const zone of deadZones) {
      gridMap.set(`${zone.i},${zone.j}`, zone)
    }

    for (const zone of deadZones) {
      const key = `${zone.i},${zone.j}`
      if (visited.has(key)) continue

      const cluster = []
      const queue = [zone]
      visited.add(key)

      while (queue.length > 0) {
        const current = queue.shift()
        cluster.push(current)

        const neighbors = [
          [current.i + 1, current.j],
          [current.i - 1, current.j],
          [current.i, current.j + 1],
          [current.i, current.j - 1]
        ]

        for (const [ni, nj] of neighbors) {
          const nKey = `${ni},${nj}`
          if (gridMap.has(nKey) && !visited.has(nKey)) {
            visited.add(nKey)
            queue.push(gridMap.get(nKey))
          }
        }
      }

      if (cluster.length >= 4) {
        const centerI = cluster.reduce((sum, z) => sum + z.i, 0) / cluster.length
        const centerJ = cluster.reduce((sum, z) => sum + z.j, 0) / cluster.length
        const avgVelocity = cluster.reduce((sum, z) => sum + z.velocity, 0) / cluster.length
        const avgDeadScore = cluster.reduce((sum, z) => sum + z.deadZoneScore, 0) / cluster.length

        clusters.push({
          centerX: (centerI - this.centerX) / this.nx,
          centerY: (centerJ - this.centerY) / this.ny,
          pixelX: centerI,
          pixelY: centerJ,
          size: cluster.length,
          avgVelocity,
          avgDeadScore,
          cells: cluster
        })
      }
    }

    return clusters.sort((a, b) => b.size - a.size)
  }

  calculateMixingEfficiency(concentrationField, initialConcentration, timeStep) {
    const currentMetrics = this.calculateMixingUniformity(concentrationField)
    const initialMetrics = this.calculateMixingUniformity(initialConcentration)

    const mixingRate = initialMetrics.variance > 0
      ? (initialMetrics.variance - currentMetrics.variance) / (initialMetrics.variance * timeStep)
      : 0

    const mixingTime = currentMetrics.uniformity > 0.95
      ? timeStep
      : timeStep * (0.95 / Math.max(0.01, currentMetrics.uniformity))

    return {
      mixingRate,
      mixingTime,
      currentUniformity: currentMetrics.uniformity,
      improvement: initialMetrics.uniformity > 0
        ? (currentMetrics.uniformity - initialMetrics.uniformity) / initialMetrics.uniformity
        : 0
    }
  }

  generateMixingReport(concentrationField, velocityField, deadZoneFlags, params) {
    const uniformityReport = this.calculateMixingUniformity(concentrationField)
    const deadZoneReport = this.detectDeadZones(velocityField, deadZoneFlags)

    const recommendations = []

    if (uniformityReport.uniformity < 0.7) {
      recommendations.push({
        type: 'warning',
        message: '混合均匀度较低，建议增加搅拌时间或提高搅拌转速'
      })
    }

    if (deadZoneReport.deadZoneRatio > 0.1) {
      recommendations.push({
        type: 'danger',
        message: `检测到 ${deadZoneReport.deadZones.length} 个死区，总面积占比 ${(deadZoneReport.deadZoneRatio * 100).toFixed(1)}%，建议优化搅拌器设计`
      })
    }

    if (uniformityReport.intensityOfSegregation > 0.3) {
      recommendations.push({
        type: 'warning',
        message: '离析强度较高，流体混合效果需要改善'
      })
    }

    return {
      timestamp: Date.now(),
      parameters: params,
      uniformity: uniformityReport,
      deadZones: deadZoneReport,
      recommendations,
      qualityScore: this.calculateQualityScore(uniformityReport, deadZoneReport)
    }
  }

  calculateQualityScore(uniformity, deadZones) {
    const uniformityScore = uniformity.uniformity * 60
    const deadZonePenalty = deadZones.deadZoneRatio * 30 * 100
    const segregationPenalty = uniformity.intensityOfSegregation * 10

    return Math.max(0, Math.min(100, uniformityScore - deadZonePenalty - segregationPenalty))
  }

  analyzeHistoricalData(snapshots) {
    if (snapshots.length < 2) {
      return { trend: 'insufficient', data: [] }
    }

    const timeSeries = snapshots.map((snap, index) => ({
      step: index,
      uniformity: snap.uniformity || 0,
      deadZoneRatio: snap.deadZoneRatio || 0,
      timestamp: snap.timestamp
    }))

    const firstUniformity = timeSeries[0].uniformity
    const lastUniformity = timeSeries[timeSeries.length - 1].uniformity

    let trend = 'stable'
    if (lastUniformity > firstUniformity + 0.1) trend = 'improving'
    else if (lastUniformity < firstUniformity - 0.1) trend = 'degrading'

    const avgUniformity = timeSeries.reduce((sum, t) => sum + t.uniformity, 0) / timeSeries.length
    const maxUniformity = Math.max(...timeSeries.map(t => t.uniformity))

    return {
      trend,
      timeSeries,
      avgUniformity,
      maxUniformity,
      improvementRate: firstUniformity > 0 ? (lastUniformity - firstUniformity) / firstUniformity : 0
    }
  }
}

export function calculateMixingIndex(concentrationValues) {
  if (concentrationValues.length === 0) return 0

  const mean = concentrationValues.reduce((a, b) => a + b, 0) / concentrationValues.length
  const variance = concentrationValues.reduce((sum, val) => sum + (val - mean) ** 2, 0) / concentrationValues.length
  const stdDev = Math.sqrt(variance)

  return mean > 0 ? 1 - (stdDev / mean) : 0
}

export function estimateMixingTime(initialVariance, targetUniformity = 0.95, mixingRate = 0.01) {
  const targetVariance = initialVariance * (1 - targetUniformity)
  if (targetVariance <= 0 || mixingRate <= 0) return Infinity
  
  return -Math.log(targetVariance / initialVariance) / mixingRate
}
