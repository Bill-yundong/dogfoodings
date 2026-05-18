export class SlipGridSolver {
  constructor(gridSize = { x: 64, y: 64 }, params = {}) {
    this.nx = gridSize.x
    this.ny = gridSize.y
    this.impellerRadius = params.impellerRadius || 0.3
    this.impellerSpeed = params.impellerSpeed || 120
    this.viscosity = params.viscosity || 0.001
    this.density = params.density || 1000
    this.timeStep = params.timeStep || 0.01
    this.reynoldsNumber = 0
    
    this.concentration = new Float32Array(this.nx * this.ny)
    this.velocityX = new Float32Array(this.nx * this.ny)
    this.velocityY = new Float32Array(this.nx * this.ny)
    this.pressure = new Float32Array(this.nx * this.ny)
    this.deadZoneFlag = new Uint8Array(this.nx * this.ny)
    
    this.tankRadius = 0.48
    this.centerX = this.nx / 2
    this.centerY = this.ny / 2
    
    this.slipCells = []
    this.interfaceCells = []
    
    this.initializeGrid()
    this.calculateReynoldsNumber()
  }

  idx(i, j) {
    return i * this.ny + j
  }

  initializeGrid() {
    const impellerRadPx = this.impellerRadius * this.nx
    const tankRadPx = this.tankRadius * this.nx
    
    for (let i = 0; i < this.nx; i++) {
      for (let j = 0; j < this.ny; j++) {
        const idx = this.idx(i, j)
        const dx = (i - this.centerX) / this.nx
        const dy = (j - this.centerY) / this.ny
        const dist = Math.sqrt(dx * dx + dy * dy)
        
        if (dist < this.impellerRadius) {
          this.slipCells.push(idx)
        } else if (dist < this.impellerRadius + 0.05) {
          this.interfaceCells.push(idx)
        }
        
        if (dist > this.tankRadius) {
          this.concentration[idx] = 0
          this.velocityX[idx] = 0
          this.velocityY[idx] = 0
        } else {
          const angle = Math.atan2(dy, dx)
          const r = dist / this.tankRadius
          
          if (dist < this.impellerRadius) {
            const rotVel = (this.impellerSpeed * Math.PI / 30) * dist * this.nx * 0.1
            this.velocityX[idx] = -rotVel * Math.sin(angle)
            this.velocityY[idx] = rotVel * Math.cos(angle)
            this.concentration[idx] = 0.8 + Math.random() * 0.2
          } else {
            this.velocityX[idx] = 0
            this.velocityY[idx] = 0
            this.concentration[idx] = 0.1 + Math.random() * 0.1
          }
        }
        
        this.deadZoneFlag[idx] = 0
        this.pressure[idx] = 0
      }
    }
  }

  calculateReynoldsNumber() {
    const impellerDiameter = this.impellerRadius * 2
    const angularVelocity = (this.impellerSpeed * 2 * Math.PI) / 60
    const tipVelocity = angularVelocity * impellerDiameter / 2
    this.reynoldsNumber = (this.density * tipVelocity * impellerDiameter) / this.viscosity
    return this.reynoldsNumber
  }

  step() {
    this.rotateImpeller()
    this.advection()
    this.diffusion()
    this.applyBoundaryConditions()
    this.updateDeadZones()
    
    return {
      concentration: this.concentration.slice(),
      velocityX: this.velocityX.slice(),
      velocityY: this.velocityY.slice(),
      deadZone: this.deadZoneFlag.slice()
    }
  }

  rotateImpeller() {
    const omega = (this.impellerSpeed * 2 * Math.PI) / 60
    const dt = this.timeStep
    const dTheta = omega * dt
    
    const tempConcentration = new Float32Array(this.nx * this.ny)
    tempConcentration.set(this.concentration)
    
    for (const idx of this.slipCells) {
      const i = Math.floor(idx / this.ny)
      const j = idx % this.ny
      
      const dx = (i - this.centerX) / this.nx
      const dy = (j - this.centerY) / this.ny
      const dist = Math.sqrt(dx * dx + dy * dy)
      const angle = Math.atan2(dy, dx) + dTheta
      
      const newI = Math.floor(this.centerX + (dist * this.nx) * Math.cos(angle))
      const newJ = Math.floor(this.centerY + (dist * this.nx) * Math.sin(angle))
      
      if (newI >= 0 && newI < this.nx && newJ >= 0 && newJ < this.ny) {
        const newIdx = this.idx(newI, newJ)
        tempConcentration[newIdx] = this.concentration[idx]
        
        const rotVel = omega * dist * this.nx * 0.1
        this.velocityX[idx] = -rotVel * Math.sin(angle)
        this.velocityY[idx] = rotVel * Math.cos(angle)
      }
    }
    
    for (const idx of this.slipCells) {
      this.concentration[idx] = tempConcentration[idx]
    }
    
    this.interpolateInterface()
  }

  interpolateInterface() {
    for (const idx of this.interfaceCells) {
      const i = Math.floor(idx / this.ny)
      const j = idx % this.ny
      
      let sumConc = 0
      let count = 0
      
      for (let di = -1; di <= 1; di++) {
        for (let dj = -1; dj <= 1; dj++) {
          const ni = i + di
          const nj = j + dj
          if (ni >= 0 && ni < this.nx && nj >= 0 && nj < this.ny) {
            sumConc += this.concentration[this.idx(ni, nj)]
            count++
          }
        }
      }
      
      if (count > 0) {
        this.concentration[idx] = sumConc / count
      }
    }
  }

  advection() {
    const newConc = new Float32Array(this.concentration)
    const dt = this.timeStep
    const dx = 1 / this.nx
    
    for (let i = 1; i < this.nx - 1; i++) {
      for (let j = 1; j < this.ny - 1; j++) {
        const idx = this.idx(i, j)
        
        const ddx = (i - this.centerX) / this.nx
        const ddy = (j - this.centerY) / this.ny
        const dist = Math.sqrt(ddx * ddx + ddy * ddy)
        
        if (dist > this.tankRadius) continue
        
        const vx = this.velocityX[idx]
        const vy = this.velocityY[idx]
        
        const fluxX = vx * (vx > 0 
          ? (this.concentration[idx] - this.concentration[this.idx(i - 1, j)])
          : (this.concentration[this.idx(i + 1, j)] - this.concentration[idx])
        )
        
        const fluxY = vy * (vy > 0
          ? (this.concentration[idx] - this.concentration[this.idx(i, j - 1)])
          : (this.concentration[this.idx(i, j + 1)] - this.concentration[idx])
        )
        
        newConc[idx] -= dt * (fluxX + fluxY) / dx
        
        if (dist < this.impellerRadius + 0.1 && dist > this.impellerRadius - 0.05) {
          const radialVel = 0.5 * (1 - dist / this.tankRadius)
          newConc[idx] += dt * radialVel * (
            this.concentration[idx] - this.concentration[this.idx(i - 1, j)] +
            this.concentration[idx] - this.concentration[this.idx(i, j - 1)]
          ) / (2 * dx)
        }
      }
    }
    
    for (let i = 0; i < this.nx; i++) {
      for (let j = 0; j < this.ny; j++) {
        const idx = this.idx(i, j)
        const dx = (i - this.centerX) / this.nx
        const dy = (j - this.centerY) / this.ny
        const dist = Math.sqrt(dx * dx + dy * dy)
        
        if (dist > this.tankRadius) {
          newConc[idx] = 0
        } else {
          newConc[idx] = Math.max(0, Math.min(1, newConc[idx]))
        }
      }
    }
    
    this.concentration = newConc
  }

  diffusion() {
    const diffCoeff = this.viscosity < 0.01 ? 1e-5 : 5e-6
    const dt = this.timeStep
    const dx = 1 / this.nx
    const stability = dt * diffCoeff / (dx * dx)
    
    if (stability > 0.25) return
    
    const newConc = new Float32Array(this.concentration)
    
    for (let i = 1; i < this.nx - 1; i++) {
      for (let j = 1; j < this.ny - 1; j++) {
        const idx = this.idx(i, j)
        const dxVal = (i - this.centerX) / this.nx
        const dyVal = (j - this.centerY) / this.ny
        const dist = Math.sqrt(dxVal * dxVal + dyVal * dyVal)
        
        if (dist > this.tankRadius) continue
        
        const laplacian = (
          this.concentration[this.idx(i + 1, j)] +
          this.concentration[this.idx(i - 1, j)] +
          this.concentration[this.idx(i, j + 1)] +
          this.concentration[this.idx(i, j - 1)] -
          4 * this.concentration[idx]
        )
        
        newConc[idx] += dt * diffCoeff * laplacian / (dx * dx)
        newConc[idx] = Math.max(0, Math.min(1, newConc[idx]))
      }
    }
    
    this.concentration = newConc
  }

  applyBoundaryConditions() {
    for (let i = 0; i < this.nx; i++) {
      for (let j = 0; j < this.ny; j++) {
        const idx = this.idx(i, j)
        const dx = (i - this.centerX) / this.nx
        const dy = (j - this.centerY) / this.ny
        const dist = Math.sqrt(dx * dx + dy * dy)
        
        if (dist > this.tankRadius - 0.02) {
          this.velocityX[idx] = 0
          this.velocityY[idx] = 0
        }
      }
    }
  }

  updateDeadZones() {
    const velocityThreshold = 0.05
    
    for (let i = 0; i < this.nx; i++) {
      for (let j = 0; j < this.ny; j++) {
        const idx = this.idx(i, j)
        const dx = (i - this.centerX) / this.nx
        const dy = (j - this.centerY) / this.ny
        const dist = Math.sqrt(dx * dx + dy * dy)
        
        if (dist > this.tankRadius) {
          this.deadZoneFlag[idx] = 0
          continue
        }
        
        const velMag = Math.sqrt(
          this.velocityX[idx] * this.velocityX[idx] +
          this.velocityY[idx] * this.velocityY[idx]
        )
        
        if (velMag < velocityThreshold && dist > this.impellerRadius + 0.1) {
          this.deadZoneFlag[idx] = Math.min(255, this.deadZoneFlag[idx] + 5)
        } else {
          this.deadZoneFlag[idx] = Math.max(0, this.deadZoneFlag[idx] - 2)
        }
      }
    }
  }

  getMixingMetrics() {
    let sumConc = 0
    let sumConcSq = 0
    let activeCells = 0
    let deadZoneCells = 0
    let totalCells = 0
    
    for (let i = 0; i < this.nx; i++) {
      for (let j = 0; j < this.ny; j++) {
        const idx = this.idx(i, j)
        const dx = (i - this.centerX) / this.nx
        const dy = (j - this.centerY) / this.ny
        const dist = Math.sqrt(dx * dx + dy * dy)
        
        if (dist <= this.tankRadius) {
          totalCells++
          const conc = this.concentration[idx]
          sumConc += conc
          sumConcSq += conc * conc
          activeCells++
          
          if (this.deadZoneFlag[idx] > 100) {
            deadZoneCells++
          }
        }
      }
    }
    
    if (activeCells === 0) return { mixingQuality: 0, deadZoneRatio: 0, variance: 0 }
    
    const meanConc = sumConc / activeCells
    const variance = (sumConcSq / activeCells) - meanConc * meanConc
    const stdDev = Math.sqrt(Math.max(0, variance))
    const coefficientOfVariation = meanConc > 0 ? stdDev / meanConc : 1
    
    const mixingQuality = Math.max(0, 1 - coefficientOfVariation)
    const deadZoneRatio = totalCells > 0 ? deadZoneCells / totalCells : 0
    
    return {
      mixingQuality,
      deadZoneRatio,
      variance,
      meanConc,
      stdDev,
      reynoldsNumber: this.reynoldsNumber
    }
  }

  getVelocityField() {
    return {
      vx: this.velocityX.slice(),
      vy: this.velocityY.slice()
    }
  }

  setImpellerSpeed(speed) {
    this.impellerSpeed = speed
    this.calculateReynoldsNumber()
  }

  getSlipRegion() {
    return this.slipCells
  }
}

export class AsyncSimulationRunner {
  constructor(solver) {
    this.solver = solver
    this.running = false
    this.stepCallbacks = []
    this.snapshotInterval = 10
    this.currentStep = 0
  }

  onStep(callback) {
    this.stepCallbacks.push(callback)
  }

  async run(totalSteps = 1000) {
    this.running = true
    this.currentStep = 0
    
    while (this.running && this.currentStep < totalSteps) {
      const data = this.solver.step()
      const metrics = this.solver.getMixingMetrics()
      
      this.currentStep++
      
      for (const callback of this.stepCallbacks) {
        callback({
          step: this.currentStep,
          data,
          metrics
        })
      }
      
      if (this.currentStep % this.snapshotInterval === 0) {
        await new Promise(resolve => setTimeout(resolve, 0))
      }
    }
    
    this.running = false
    return this.currentStep
  }

  stop() {
    this.running = false
  }

  isRunning() {
    return this.running
  }

  setSnapshotInterval(interval) {
    this.snapshotInterval = interval
  }
}
