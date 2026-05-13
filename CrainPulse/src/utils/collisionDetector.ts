import type { CraneState, CraneEnvelope, CollisionRisk, Point3D } from '../types/crane';
import { envelopeGenerator } from './envelopeGenerator';

export class CollisionDetector {
  private safetyDistance: number = 5;
  private criticalDistance: number = 2;

  private distance3D(a: Point3D, b: Point3D): number {
    return Math.sqrt(
      Math.pow(a.x - b.x, 2) +
      Math.pow(a.y - b.y, 2) +
      Math.pow(a.z - b.z, 2)
    );
  }

  calculateKineticEnergy(crane: CraneState): number {
    const mass = crane.loadWeight + 500;
    const velocity = envelopeGenerator.calculateVelocity(crane);
    const speed = Math.sqrt(
      Math.pow(velocity.x, 2) +
      Math.pow(velocity.y, 2) +
      Math.pow(velocity.z, 2)
    );
    return 0.5 * mass * speed * speed;
  }

  checkJibCollision(craneA: CraneState, craneB: CraneState): { colliding: boolean; distance: number } {
    const tipA = envelopeGenerator.calculateJibTipPosition(craneA);
    const tipB = envelopeGenerator.calculateJibTipPosition(craneB);

    const baseToBase = this.distance3D(craneA.position, craneB.position);
    const tipToTip = this.distance3D(tipA, tipB);
    const minDistance = Math.max(0, baseToBase - craneA.jibLength - craneB.jibLength);

    return {
      colliding: minDistance < this.safetyDistance,
      distance: Math.min(tipToTip, minDistance)
    };
  }

  checkHookCollision(envelopeA: CraneEnvelope, envelopeB: CraneEnvelope): CollisionRisk | null {
    let closestDistance = Infinity;
    let closestTime = 0;
    let closestPointA: Point3D = { x: 0, y: 0, z: 0 };
    let closestPointB: Point3D = { x: 0, y: 0, z: 0 };

    const maxPoints = Math.min(envelopeA.points.length, envelopeB.points.length);

    for (let i = 0; i < maxPoints; i++) {
      const pointA = envelopeA.points[i];
      const pointB = envelopeB.points[i];
      const distance = this.distance3D(pointA.position, pointB.position);

      if (distance < closestDistance) {
        closestDistance = distance;
        closestTime = pointA.timestamp;
        closestPointA = pointA.position;
        closestPointB = pointB.position;
      }

      if (distance < this.criticalDistance) break;
    }

    if (closestDistance < this.safetyDistance) {
      const riskLevel = this.getRiskLevel(closestDistance);
      const craneA = { id: envelopeA.craneId } as CraneState;
      const craneB = { id: envelopeB.craneId } as CraneState;

      return {
        id: `collision-${Date.now()}-${Math.random()}`,
        craneA: envelopeA.craneId,
        craneB: envelopeB.craneId,
        riskLevel,
        distance: closestDistance,
        predictedTime: closestTime - Date.now(),
        kineticEnergyA: this.calculateKineticEnergy(craneA),
        kineticEnergyB: this.calculateKineticEnergy(craneB),
        positionA: closestPointA,
        positionB: closestPointB,
        timestamp: Date.now()
      };
    }

    return null;
  }

  async detectCollisionsAsync(
    cranes: CraneState[],
    envelopes: Map<string, CraneEnvelope>
  ): Promise<CollisionRisk[]> {
    const risks: CollisionRisk[] = [];

    await new Promise(resolve => setTimeout(resolve, 0));

    for (let i = 0; i < cranes.length; i++) {
      for (let j = i + 1; j < cranes.length; j++) {
        const craneA = cranes[i];
        const craneB = cranes[j];
        const envelopeA = envelopes.get(craneA.id);
        const envelopeB = envelopes.get(craneB.id);

        if (envelopeA && envelopeB) {
          const hookRisk = this.checkHookCollision(envelopeA, envelopeB);
          if (hookRisk) {
            hookRisk.kineticEnergyA = this.calculateKineticEnergy(craneA);
            hookRisk.kineticEnergyB = this.calculateKineticEnergy(craneB);
            risks.push(hookRisk);
          }

          const jibCheck = this.checkJibCollision(craneA, craneB);
          if (jibCheck.colliding && jibCheck.distance < this.safetyDistance) {
            risks.push({
              id: `jib-collision-${Date.now()}-${Math.random()}`,
              craneA: craneA.id,
              craneB: craneB.id,
              riskLevel: this.getRiskLevel(jibCheck.distance),
              distance: jibCheck.distance,
              predictedTime: 0,
              kineticEnergyA: this.calculateKineticEnergy(craneA),
              kineticEnergyB: this.calculateKineticEnergy(craneB),
              positionA: envelopeGenerator.calculateJibTipPosition(craneA),
              positionB: envelopeGenerator.calculateJibTipPosition(craneB),
              timestamp: Date.now()
            });
          }
        }
      }
    }

    return risks.sort((a, b) => b.distance - a.distance);
  }

  private getRiskLevel(distance: number): CollisionRisk['riskLevel'] {
    if (distance < this.criticalDistance) return 'critical';
    if (distance < this.safetyDistance * 0.6) return 'high';
    if (distance < this.safetyDistance * 0.8) return 'medium';
    return 'low';
  }

  getWarningMessage(risk: CollisionRisk): string {
    const timeSeconds = Math.max(0, Math.round(risk.predictedTime / 1000));
    const energyTotal = risk.kineticEnergyA + risk.kineticEnergyB;
    
    if (risk.riskLevel === 'critical') {
      return `紧急！塔吊 ${risk.craneA} 和 ${risk.craneB} 即将碰撞，距离 ${risk.distance.toFixed(1)}m，总动能 ${energyTotal.toFixed(0)}J`;
    }
    if (risk.riskLevel === 'high') {
      return `高危！塔吊 ${risk.craneA} 和 ${risk.craneB} 存在碰撞风险，预计 ${timeSeconds} 秒后接触`;
    }
    return `注意：塔吊 ${risk.craneA} 和 ${risk.craneB} 作业区域重叠`;
  }
}

export const collisionDetector = new CollisionDetector();
