import type { SedimentParticle, Vector3, OceanCurrent } from '$lib/types';

export class SedimentDiffusionSimulator {
  private particles: SedimentParticle[] = [];
  private diffusionCoefficient: number = 0.05;
  private settlingVelocity: number = 0.01;
  private gridSize: Vector3 = { x: 100, y: 50, z: 100 };

  constructor() {}

  generateParticles(count: number, sourcePosition: Vector3, releaseRate: number): SedimentParticle[] {
    const newParticles: SedimentParticle[] = [];
    
    for (let i = 0; i < count; i++) {
      const particle: SedimentParticle = {
        id: `particle-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        position: {
          x: sourcePosition.x + (Math.random() - 0.5) * 2,
          y: sourcePosition.y + (Math.random() - 0.5) * 2,
          z: sourcePosition.z + (Math.random() - 0.5) * 2
        },
        velocity: {
          x: (Math.random() - 0.5) * 0.1,
          y: (Math.random() - 0.5) * 0.1,
          z: (Math.random() - 0.5) * 0.1
        },
        concentration: 0.8 + Math.random() * 0.2,
        size: 0.001 + Math.random() * 0.005,
        createdAt: Date.now()
      };
      newParticles.push(particle);
    }
    
    this.particles = [...this.particles, ...newParticles];
    return newParticles;
  }

  update(dt: number, current: OceanCurrent): void {
    this.particles = this.particles.map(particle => {
      const turbulentVelocity = this.calculateTurbulentVelocity(current.turbulence);
      
      const advection: Vector3 = {
        x: current.velocity.x * dt,
        y: current.velocity.y * dt,
        z: current.velocity.z * dt
      };
      
      const diffusion: Vector3 = {
        x: turbulentVelocity.x * dt,
        y: turbulentVelocity.y * dt,
        z: turbulentVelocity.z * dt
      };
      
      const settling: Vector3 = {
        x: 0,
        y: -this.settlingVelocity * dt,
        z: 0
      };
      
      const newPosition: Vector3 = {
        x: particle.position.x + advection.x + diffusion.x + settling.x,
        y: particle.position.y + advection.y + diffusion.y + settling.y,
        z: particle.position.z + advection.z + diffusion.z + settling.z
      };
      
      const boundedPosition = this.applyBoundaryConditions(newPosition);
      const newVelocity = {
        x: (boundedPosition.x - particle.position.x) / dt,
        y: (boundedPosition.y - particle.position.y) / dt,
        z: (boundedPosition.z - particle.position.z) / dt
      };
      
      const age = (Date.now() - particle.createdAt) / 1000;
      const decayFactor = Math.exp(-age / 60);
      
      return {
        ...particle,
        position: boundedPosition,
        velocity: newVelocity,
        concentration: Math.max(0, particle.concentration * decayFactor)
      };
    }).filter(particle => particle.concentration > 0.01 && particle.position.y > 0);
  }

  private calculateTurbulentVelocity(turbulence: number): Vector3 {
    const intensity = this.diffusionCoefficient * turbulence;
    return {
      x: this.gaussianRandom() * intensity,
      y: this.gaussianRandom() * intensity,
      z: this.gaussianRandom() * intensity
    };
  }

  private gaussianRandom(): number {
    let u = 0, v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  }

  private applyBoundaryConditions(position: Vector3): Vector3 {
    return {
      x: Math.max(0, Math.min(this.gridSize.x, position.x)),
      y: Math.max(0, Math.min(this.gridSize.y, position.y)),
      z: Math.max(0, Math.min(this.gridSize.z, position.z))
    };
  }

  getParticles(): SedimentParticle[] {
    return [...this.particles];
  }

  getParticleCount(): number {
    return this.particles.length;
  }

  getConcentrationAtPosition(position: Vector3, radius: number = 5): number {
    const nearbyParticles = this.particles.filter(p => {
      const dx = p.position.x - position.x;
      const dy = p.position.y - position.y;
      const dz = p.position.z - position.z;
      return Math.sqrt(dx * dx + dy * dy + dz * dz) < radius;
    });
    
    if (nearbyParticles.length === 0) return 0;
    
    const totalConcentration = nearbyParticles.reduce((sum, p) => sum + p.concentration, 0);
    return totalConcentration / nearbyParticles.length;
  }

  clear(): void {
    this.particles = [];
  }

  getGridSize(): Vector3 {
    return { ...this.gridSize };
  }
}
