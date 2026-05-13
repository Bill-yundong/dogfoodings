import { Particle } from './Particle.js'

export class DEMEngine {
  constructor(width, height) {
    this.width = width
    this.height = height
    this.particles = []
    this.gravity = 980
    this.wallStiffness = 5000
    this.particleStiffness = 2000
    this.damping = 0.95
    this.friction = 0.3
    this.wallPressures = { left: 0, right: 0, bottom: 0 }
    this.gridCellSize = 30
    this.spatialHash = new Map()
    this.nextParticleId = 0
    this.isRunning = false
    this.worker = null
  }

  addParticle(x, y, radius, density, type) {
    const particle = new Particle(this.nextParticleId++, x, y, radius, density, type)
    this.particles.push(particle)
    return particle
  }

  buildSpatialHash() {
    this.spatialHash.clear()
    for (const particle of this.particles) {
      const cellX = Math.floor(particle.x / this.gridCellSize)
      const cellY = Math.floor(particle.y / this.gridCellSize)
      const key = `${cellX},${cellY}`
      if (!this.spatialHash.has(key)) {
        this.spatialHash.set(key, [])
      }
      this.spatialHash.get(key).push(particle)
    }
  }

  getNearbyParticles(particle) {
    const nearby = []
    const cellX = Math.floor(particle.x / this.gridCellSize)
    const cellY = Math.floor(particle.y / this.gridCellSize)
    
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        const key = `${cellX + dx},${cellY + dy}`
        const cellParticles = this.spatialHash.get(key)
        if (cellParticles) {
          for (const p of cellParticles) {
            if (p.id !== particle.id) {
              nearby.push(p)
            }
          }
        }
      }
    }
    return nearby
  }

  calculateParticleCollision(p1, p2) {
    const dx = p2.x - p1.x
    const dy = p2.y - p1.y
    const dist = Math.sqrt(dx * dx + dy * dy)
    const minDist = p1.radius + p2.radius

    if (dist < minDist && dist > 0) {
      const overlap = minDist - dist
      const nx = dx / dist
      const ny = dy / dist

      const relVx = p2.vx - p1.vx
      const relVy = p2.vy - p1.vy
      const relVn = relVx * nx + relVy * ny

      if (relVn < 0) {
        const force = this.particleStiffness * overlap
        const fx = force * nx
        const fy = force * ny

        p1.applyForce(fx, fy)
        p2.applyForce(-fx, -fy)

        const tangentX = -ny
        const tangentY = nx
        const relVt = relVx * tangentX + relVy * tangentY
        
        if (Math.abs(relVt) > 0.01) {
          const fricForce = Math.min(this.friction * force, Math.abs(relVt) * (p1.mass * p2.mass) / (p1.mass + p2.mass))
          const fricDir = relVt > 0 ? -1 : 1
          p1.applyForce(fricDir * fricForce * tangentX, fricDir * fricForce * tangentY)
          p2.applyForce(-fricDir * fricForce * tangentX, -fricDir * fricForce * tangentY)
        }

        p1.collisionCount++
        p2.collisionCount++
      }
    }
  }

  calculateWallCollisions(particle) {
    const wallLeft = 50
    const wallRight = this.width - 50
    const wallBottom = this.height - 30

    if (particle.x - particle.radius < wallLeft) {
      const overlap = particle.radius - (particle.x - wallLeft)
      const force = this.wallStiffness * overlap
      particle.applyForce(force, 0)
      particle.x = wallLeft + particle.radius
      particle.vx *= -this.damping
      this.wallPressures.left += force
    }

    if (particle.x + particle.radius > wallRight) {
      const overlap = particle.radius - (wallRight - particle.x)
      const force = this.wallStiffness * overlap
      particle.applyForce(-force, 0)
      particle.x = wallRight - particle.radius
      particle.vx *= -this.damping
      this.wallPressures.right += force
    }

    if (particle.y + particle.radius > wallBottom) {
      const overlap = particle.radius - (wallBottom - particle.y)
      const force = this.wallStiffness * overlap
      particle.applyForce(0, -force)
      particle.y = wallBottom - particle.radius
      particle.vy *= -this.damping
      this.wallPressures.bottom += force
    }
  }

  async step(dt) {
    return new Promise((resolve) => {
      this.wallPressures = { left: 0, right: 0, bottom: 0 }

      for (const particle of this.particles) {
        particle.applyForce(0, particle.mass * this.gravity)
      }

      this.buildSpatialHash()

      for (const p1 of this.particles) {
        const nearby = this.getNearbyParticles(p1)
        for (const p2 of nearby) {
          if (p1.id < p2.id) {
            this.calculateParticleCollision(p1, p2)
          }
        }
      }

      for (const particle of this.particles) {
        this.calculateWallCollisions(particle)
        particle.update(dt, this.damping)
      }

      resolve({
        particles: this.particles.map(p => ({
          id: p.id,
          x: p.x,
          y: p.y,
          radius: p.radius,
          color: p.color,
          type: p.type,
          vx: p.vx,
          vy: p.vy
        })),
        wallPressures: { ...this.wallPressures }
      })
    })
  }

  async runSimulation(steps, dt = 0.016) {
    this.isRunning = true
    const results = []
    for (let i = 0; i < steps && this.isRunning; i++) {
      const result = await this.step(dt)
      results.push(result)
      if (i % 10 === 0) {
        await new Promise(r => setTimeout(r, 0))
      }
    }
    return results
  }

  stop() {
    this.isRunning = false
  }

  getSegregationIndex() {
    if (this.particles.length < 2) return 0

    const types = [...new Set(this.particles.map(p => p.type))]
    if (types.length < 2) return 0

    let totalMixing = 0
    let pairs = 0

    for (let i = 0; i < this.particles.length; i++) {
      for (let j = i + 1; j < this.particles.length; j++) {
        const p1 = this.particles[i]
        const p2 = this.particles[j]
        const dist = Math.sqrt((p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2)
        if (dist < 100) {
          totalMixing += p1.type === p2.type ? 1 : 0
          pairs++
        }
      }
    }

    return pairs > 0 ? totalMixing / pairs : 0
  }
}
