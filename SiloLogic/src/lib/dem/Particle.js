export class Particle {
  constructor(id, x, y, radius, density, type) {
    this.id = id
    this.x = x
    this.y = y
    this.radius = radius
    this.vx = 0
    this.vy = 0
    this.ax = 0
    this.ay = 0
    this.density = density
    this.mass = density * Math.PI * radius * radius
    this.type = type
    this.color = this.getTypeColor(type)
    this.collisionCount = 0
    this.age = 0
  }

  getTypeColor(type) {
    const colors = {
      ore: '#ff6b6b',
      gravel: '#4ecdc4',
      sand: '#ffe66d',
      cement: '#95e1d3',
      coal: '#2d3436'
    }
    return colors[type] || '#6c5ce7'
  }

  applyForce(fx, fy) {
    this.ax += fx / this.mass
    this.ay += fy / this.mass
  }

  update(dt, damping = 0.98) {
    this.vx += this.ax * dt
    this.vy += this.ay * dt
    this.vx *= damping
    this.vy *= damping
    this.x += this.vx * dt
    this.y += this.vy * dt
    this.ax = 0
    this.ay = 0
    this.age++
  }
}
