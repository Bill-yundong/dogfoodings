import type { PumpUnit, Vector3, OceanCurrent, ForceBalance } from '$lib/types';

export class MultiBodyDynamicsEngine {
  private pumps: PumpUnit[] = [];
  private gravity: number = 9.81;
  private waterDensity: number = 1025;
  private dragCoefficient: number = 0.47;
  private timeStep: number = 0.016;

  constructor() {}

  addPump(pump: PumpUnit): void {
    this.pumps.push({ ...pump });
  }

  removePump(pumpId: string): void {
    this.pumps = this.pumps.filter(p => p.id !== pumpId);
  }

  getPumps(): PumpUnit[] {
    return [...this.pumps];
  }

  async updateAsync(current: OceanCurrent): Promise<PumpUnit[]> {
    return new Promise((resolve) => {
      setTimeout(() => {
        this.updatePumps(current);
        resolve([...this.pumps]);
      }, 0);
    });
  }

  private updatePumps(current: OceanCurrent): void {
    this.pumps = this.pumps.map(pump => {
      if (!pump.isActive) return pump;

      const forces = this.calculateForces(pump, current);
      const acceleration = {
        x: forces.netForce.x / pump.mass,
        y: forces.netForce.y / pump.mass,
        z: forces.netForce.z / pump.mass
      };

      const newVelocity = {
        x: pump.velocity.x + acceleration.x * this.timeStep,
        y: pump.velocity.y + acceleration.y * this.timeStep,
        z: pump.velocity.z + acceleration.z * this.timeStep
      };

      const damping = 0.98;
      const dampedVelocity = {
        x: newVelocity.x * damping,
        y: newVelocity.y * damping,
        z: newVelocity.z * damping
      };

      const newPosition = {
        x: pump.position.x + dampedVelocity.x * this.timeStep,
        y: Math.max(1, Math.min(49, pump.position.y + dampedVelocity.y * this.timeStep)),
        z: pump.position.z + dampedVelocity.z * this.timeStep
      };

      const torque = this.calculateTorque(pump, current);
      const newRotation = {
        x: pump.rotation.x + torque.x * this.timeStep,
        y: pump.rotation.y + torque.y * this.timeStep,
        z: pump.rotation.z + torque.z * this.timeStep
      };

      return {
        ...pump,
        position: newPosition,
        velocity: dampedVelocity,
        rotation: newRotation,
        forces: forces.netForce
      };
    });
  }

  calculateForces(pump: PumpUnit, current: OceanCurrent): ForceBalance {
    const volume = pump.mass / 7850;
    
    const weight: Vector3 = {
      x: 0,
      y: -pump.mass * this.gravity,
      z: 0
    };

    const buoyancy: Vector3 = {
      x: 0,
      y: this.waterDensity * volume * this.gravity,
      z: 0
    };

    const relativeVelocity = {
      x: current.velocity.x - pump.velocity.x,
      y: current.velocity.y - pump.velocity.y,
      z: current.velocity.z - pump.velocity.z
    };

    const crossSectionalArea = 2;
    const dragMagnitude = 0.5 * this.waterDensity * crossSectionalArea * this.dragCoefficient;
    
    const drag: Vector3 = {
      x: dragMagnitude * relativeVelocity.x * Math.abs(relativeVelocity.x),
      y: dragMagnitude * relativeVelocity.y * Math.abs(relativeVelocity.y),
      z: dragMagnitude * relativeVelocity.z * Math.abs(relativeVelocity.z)
    };

    const currentForce: Vector3 = {
      x: current.velocity.x * 100,
      y: current.velocity.y * 50,
      z: current.velocity.z * 100
    };

    const tension: Vector3 = {
      x: -pump.position.x * 50,
      y: (25 - pump.position.y) * 100,
      z: -pump.position.z * 50
    };

    const netForce: Vector3 = {
      x: weight.x + buoyancy.x + drag.x + currentForce.x + tension.x,
      y: weight.y + buoyancy.y + drag.y + currentForce.y + tension.y,
      z: weight.z + buoyancy.z + drag.z + currentForce.z + tension.z
    };

    return {
      buoyancy,
      drag,
      currentForce,
      tension,
      weight,
      netForce
    };
  }

  private calculateTorque(pump: PumpUnit, current: OceanCurrent): Vector3 {
    const relativeVelocity = {
      x: current.velocity.x - pump.velocity.x,
      y: current.velocity.y - pump.velocity.y,
      z: current.velocity.z - pump.velocity.z
    };

    const torqueMagnitude = 0.1;
    return {
      x: relativeVelocity.y * torqueMagnitude - relativeVelocity.z * torqueMagnitude,
      y: relativeVelocity.z * torqueMagnitude - relativeVelocity.x * torqueMagnitude,
      z: relativeVelocity.x * torqueMagnitude - relativeVelocity.y * torqueMagnitude
    };
  }

  getForceBalance(pumpId: string, current: OceanCurrent): ForceBalance | null {
    const pump = this.pumps.find(p => p.id === pumpId);
    if (!pump) return null;
    return this.calculateForces(pump, current);
  }

  reset(): void {
    this.pumps = this.pumps.map(pump => ({
      ...pump,
      velocity: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      forces: { x: 0, y: 0, z: 0 }
    }));
  }

  setPumpPower(pumpId: string, power: number): void {
    const pump = this.pumps.find(p => p.id === pumpId);
    if (pump) {
      pump.power = power;
      pump.flowRate = power * 0.1;
    }
  }

  togglePump(pumpId: string): void {
    const pump = this.pumps.find(p => p.id === pumpId);
    if (pump) {
      pump.isActive = !pump.isActive;
    }
  }
}
