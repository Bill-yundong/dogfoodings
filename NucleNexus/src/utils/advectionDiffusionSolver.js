class AdvectionDiffusionSolver {
  constructor() {
    this.gridSize = { x: 100, y: 100 }
    this.timeStep = 0.1
    this.diffusionCoefficient = 0.01
    this.intakePosition = { x: 50, y: 50 }
    this.blockageThreshold = 3000
  }

  calculateRiskScore(data) {
    const { planktonDensity, jellyfishCount, algaeConcentration, waterTemperature, currentSpeed } = data
    
    const tempFactor = Math.max(0, (waterTemperature - 15) / 15)
    const planktonFactor = planktonDensity / 5000
    const jellyfishFactor = jellyfishCount / 200
    const algaeFactor = algaeConcentration / 100
    const currentFactor = Math.max(0, 1 - currentSpeed)
    
    const score = (
      tempFactor * 0.15 +
      planktonFactor * 0.35 +
      jellyfishFactor * 0.25 +
      algaeFactor * 0.15 +
      currentFactor * 0.10
    ) * 100
    
    return Math.min(100, Math.max(0, score))
  }

  async solveAdvectionDiffusion(initialConcentration, velocityField, hours) {
    return new Promise((resolve) => {
      setTimeout(() => {
        const steps = Math.floor(hours / this.timeStep)
        let concentration = JSON.parse(JSON.stringify(initialConcentration))
        
        for (let step = 0; step < steps; step++) {
          const newConcentration = this.step(concentration, velocityField)
          concentration = newConcentration
        }
        
        resolve(concentration)
      }, 10)
    })
  }

  step(concentration, velocity) {
    const { x: nx, y: ny } = this.gridSize
    const newConcentration = Array(ny).fill(null).map(() => Array(nx).fill(0))
    
    for (let j = 1; j < ny - 1; j++) {
      for (let i = 1; i < nx - 1; i++) {
        const diffX = this.diffusionCoefficient * (
          concentration[j][i + 1] - 2 * concentration[j][i] + concentration[j][i - 1]
        )
        const diffY = this.diffusionCoefficient * (
          concentration[j + 1][i] - 2 * concentration[j][i] + concentration[j - 1][i]
        )
        
        const advX = -velocity.u[j][i] * (concentration[j][i + 1] - concentration[j][i - 1]) / 2
        const advY = -velocity.v[j][i] * (concentration[j + 1][i] - concentration[j - 1][i]) / 2
        
        newConcentration[j][i] = concentration[j][i] + this.timeStep * (
          diffX + diffY + advX + advY
        )
        
        newConcentration[j][i] = Math.max(0, newConcentration[j][i])
      }
    }
    
    return newConcentration
  }

  createVelocityField(currentSpeed, direction = 0) {
    const { x: nx, y: ny } = this.gridSize
    const u = Array(ny).fill(null).map(() => Array(nx).fill(0))
    const v = Array(ny).fill(null).map(() => Array(nx).fill(0))
    
    for (let j = 0; j < ny; j++) {
      for (let i = 0; i < nx; i++) {
        const dx = i - this.intakePosition.x
        const dy = j - this.intakePosition.y
        const dist = Math.sqrt(dx * dx + dy * dy)
        
        if (dist > 5) {
          u[j][i] = currentSpeed * Math.cos(direction) * (1 + 0.1 * Math.sin(i * 0.1))
          v[j][i] = currentSpeed * Math.sin(direction) * (1 + 0.1 * Math.cos(j * 0.1))
        } else {
          u[j][i] = currentSpeed * dx / dist * 0.5
          v[j][i] = currentSpeed * dy / dist * 0.5
        }
      }
    }
    
    return { u, v }
  }

  createInitialConcentration(planktonDensity, jellyfishCount) {
    const { x: nx, y: ny } = this.gridSize
    const concentration = Array(ny).fill(null).map(() => Array(nx).fill(0))
    
    for (let j = 0; j < ny; j++) {
      for (let i = 0; i < nx; i++) {
        const baseNoise = (Math.sin(i * 0.05) + Math.cos(j * 0.07)) * 100
        const distFromCenter = Math.sqrt(
          Math.pow(i - nx / 2, 2) + Math.pow(j - ny / 2, 2)
        )
        const gaussian = Math.exp(-distFromCenter * distFromCenter / 2000)
        
        concentration[j][i] = (planktonDensity * 0.5 + jellyfishCount * 10 + baseNoise) * (0.5 + gaussian * 0.5)
      }
    }
    
    return concentration
  }

  getIntakeConcentration(concentration) {
    const { x, y } = this.intakePosition
    let total = 0
    let count = 0
    
    for (let j = y - 3; j <= y + 3; j++) {
      for (let i = x - 3; i <= x + 3; i++) {
        if (j >= 0 && j < this.gridSize.y && i >= 0 && i < this.gridSize.x) {
          total += concentration[j][i]
          count++
        }
      }
    }
    
    return count > 0 ? total / count : 0
  }

  predict(data, hoursAhead = 24) {
    const initialConcentration = this.createInitialConcentration(
      data.planktonDensity,
      data.jellyfishCount
    )
    
    const velocityField = this.createVelocityField(data.currentSpeed)
    
    const finalConcentration = []
    let currentConc = initialConcentration
    const stepHours = hoursAhead / 10
    
    for (let h = 0; h <= hoursAhead; h += stepHours) {
      const stepConc = this.solveStep(currentConc, velocityField, stepHours)
      currentConc = stepConc
      finalConcentration.push({
        hour: h,
        intakeConc: this.getIntakeConcentration(stepConc)
      })
    }
    
    const maxConc = Math.max(...finalConcentration.map(c => c.intakeConc))
    const hoursToBlockage = this.estimateBlockageTime(finalConcentration)
    
    let riskLevel = 'normal'
    if (maxConc > this.blockageThreshold * 0.8) {
      riskLevel = 'danger'
    } else if (maxConc > this.blockageThreshold * 0.5) {
      riskLevel = 'warning'
    }
    
    return {
      riskLevel,
      riskScore: this.calculateRiskScore(data),
      maxConcentration: maxConc,
      hoursToBlockage,
      concentrationHistory: finalConcentration
    }
  }

  solveStep(concentration, velocityField, hours) {
    const steps = Math.floor(hours / this.timeStep)
    let conc = concentration
    
    for (let s = 0; s < Math.min(steps, 10); s++) {
      conc = this.step(conc, velocityField)
    }
    
    return conc
  }

  estimateBlockageTime(concentrationHistory) {
    for (const point of concentrationHistory) {
      if (point.intakeConc >= this.blockageThreshold) {
        return point.hour
      }
    }
    return Infinity
  }

  async getPredictionTrend(data, hours = 72) {
    const results = []
    const initialConcentration = this.createInitialConcentration(
      data.planktonDensity,
      data.jellyfishCount
    )
    const velocityField = this.createVelocityField(data.currentSpeed)
    
    let currentConc = initialConcentration
    const step = 6
    
    for (let h = 0; h <= hours; h += step) {
      const intakeConc = this.getIntakeConcentration(currentConc)
      results.push({
        hour: h,
        concentration: intakeConc,
        riskLevel: intakeConc > this.blockageThreshold * 0.8 ? 'danger' : 
                   intakeConc > this.blockageThreshold * 0.5 ? 'warning' : 'normal'
      })
      currentConc = this.solveStep(currentConc, velocityField, step)
    }
    
    return results
  }
}

export default AdvectionDiffusionSolver