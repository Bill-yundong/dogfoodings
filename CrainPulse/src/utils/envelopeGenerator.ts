import type { CraneState, CraneEnvelope, EnvelopePoint, Point3D } from '../types/crane';

export class EnvelopeGenerator {
  private predictionHorizon: number = 5000;
  private timeStep: number = 100;

  calculateHookPosition(crane: CraneState): Point3D {
    const radAngle = (crane.jibAngle * Math.PI) / 180;
    const radius = crane.trolleyPosition;
    
    return {
      x: crane.position.x + Math.cos(radAngle) * radius,
      y: crane.position.y + Math.sin(radAngle) * radius,
      z: crane.position.z - crane.hookHeight
    };
  }

  calculateJibTipPosition(crane: CraneState): Point3D {
    const radAngle = (crane.jibAngle * Math.PI) / 180;
    
    return {
      x: crane.position.x + Math.cos(radAngle) * crane.jibLength,
      y: crane.position.y + Math.sin(radAngle) * crane.jibLength,
      z: crane.position.z
    };
  }

  calculateVelocity(crane: CraneState): Point3D {
    const radAngle = (crane.jibAngle * Math.PI) / 180;
    const omega = (crane.rotationSpeed * Math.PI) / 180;
    const r = crane.trolleyPosition;

    const vx = -r * omega * Math.sin(radAngle) + crane.trolleySpeed * Math.cos(radAngle);
    const vy = r * omega * Math.cos(radAngle) + crane.trolleySpeed * Math.sin(radAngle);
    const vz = crane.hoistSpeed;

    return { x: vx, y: vy, z: vz };
  }

  predictNextState(crane: CraneState, dt: number): CraneState {
    const dtSeconds = dt / 1000;
    
    return {
      ...crane,
      jibAngle: crane.jibAngle + crane.rotationSpeed * dtSeconds,
      trolleyPosition: Math.max(0, Math.min(crane.jibLength, 
        crane.trolleyPosition + crane.trolleySpeed * dtSeconds)),
      hookHeight: Math.max(0, crane.hookHeight + crane.hoistSpeed * dtSeconds),
      timestamp: crane.timestamp + dt
    };
  }

  generateEnvelope(crane: CraneState): CraneEnvelope {
    const points: EnvelopePoint[] = [];
    const startTime = Date.now();
    let currentState = { ...crane };

    for (let t = 0; t <= this.predictionHorizon; t += this.timeStep) {
      const hookPos = this.calculateHookPosition(currentState);
      const velocity = this.calculateVelocity(currentState);

      points.push({
        position: hookPos,
        timestamp: startTime + t,
        velocity
      });

      currentState = this.predictNextState(currentState, this.timeStep);
    }

    return {
      craneId: crane.id,
      points,
      startTime,
      endTime: startTime + this.predictionHorizon
    };
  }

  generateJibEnvelope(crane: CraneState): Point3D[] {
    const points: Point3D[] = [];
    const segments = 20;

    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const angle = crane.jibAngle + t * crane.rotationSpeed * (this.predictionHorizon / 1000);
      const radAngle = (angle * Math.PI) / 180;
      
      points.push({
        x: crane.position.x + Math.cos(radAngle) * crane.jibLength,
        y: crane.position.y + Math.sin(radAngle) * crane.jibLength,
        z: crane.position.z
      });
    }

    return points;
  }

  getEnvelopeAtTime(envelope: CraneEnvelope, timestamp: number): EnvelopePoint | null {
    if (timestamp < envelope.startTime || timestamp > envelope.endTime) {
      return null;
    }

    const index = Math.floor((timestamp - envelope.startTime) / this.timeStep);
    return envelope.points[Math.min(index, envelope.points.length - 1)];
  }
}

export const envelopeGenerator = new EnvelopeGenerator();
