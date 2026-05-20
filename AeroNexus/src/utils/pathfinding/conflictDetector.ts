import type { EquipmentState, DispatchCommand, ConflictAlert, Position, PathPoint } from '@/types';
import { getDynamicsParams, checkCollision } from '../dynamics/multiBodyDynamics';

export interface ConflictDetectionConfig {
  predictionHorizon: number;
  timeStep: number;
  safetyMargin: number;
  criticalTTC: number;
  warningTTC: number;
}

const DEFAULT_CONFIG: ConflictDetectionConfig = {
  predictionHorizon: 30,
  timeStep: 0.1,
  safetyMargin: 1.0,
  criticalTTC: 3,
  warningTTC: 8,
};

interface PredictedState {
  equipmentId: string;
  positions: Position[];
  timestamps: number[];
  length: number;
  width: number;
}

export class ConflictDetector {
  private config: ConflictDetectionConfig;

  constructor(config?: Partial<ConflictDetectionConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  detectConflicts(
    equipmentStates: EquipmentState[],
    commands: DispatchCommand[]
  ): ConflictAlert[] {
    const alerts: ConflictAlert[] = [];
    const predictedStates = this.predictAllStates(equipmentStates, commands);
    
    const pairs = this.getEquipmentPairs(predictedStates);
    
    for (const [state1, state2] of pairs) {
      const conflict = this.checkPairConflict(state1, state2);
      if (conflict) {
        alerts.push(conflict);
      }
    }
    
    alerts.push(...this.checkZoneViolations(equipmentStates, predictedStates));
    
    return alerts.sort((a, b) => a.timeToCollision - b.timeToCollision);
  }

  private predictAllStates(
    equipmentStates: EquipmentState[],
    commands: DispatchCommand[]
  ): PredictedState[] {
    return equipmentStates.map((equipment) => {
      const command = commands.find((c) => c.equipmentId === equipment.id && c.status === 'executing');
      const positions = this.predictEquipmentPath(equipment, command);
      
      return {
        equipmentId: equipment.id,
        positions,
        timestamps: positions.map((_, i) => i * this.config.timeStep),
        length: equipment.dimensions.length,
        width: equipment.dimensions.width,
      };
    });
  }

  private predictEquipmentPath(
    equipment: EquipmentState,
    command: DispatchCommand | undefined
  ): Position[] {
    const { predictionHorizon, timeStep } = this.config;
    const steps = Math.ceil(predictionHorizon / timeStep);
    const path: Position[] = [];
    
    const params = getDynamicsParams(equipment.type);
    let currentPos = { ...equipment.position };
    let currentSpeed = equipment.velocity.linear;
    
    if (command && command.path.length > 0) {
      let pathIndex = 0;
      
      for (let i = 0; i < steps; i++) {
        const t = i * timeStep;
        
        while (pathIndex < command.path.length - 1 && command.path[pathIndex + 1].t <= t) {
          pathIndex++;
        }
        
        const pathPoint = command.path[pathIndex];
        const nextPoint = command.path[Math.min(pathIndex + 1, command.path.length - 1)];
        
        const segmentT = nextPoint.t > pathPoint.t
          ? (t - pathPoint.t) / (nextPoint.t - pathPoint.t)
          : 1;
        
        const x = pathPoint.x + (nextPoint.x - pathPoint.x) * Math.min(1, segmentT);
        const y = pathPoint.y + (nextPoint.y - pathPoint.y) * Math.min(1, segmentT);
        const heading = Math.atan2(nextPoint.y - pathPoint.y, nextPoint.x - pathPoint.x);
        
        path.push({ x, y, heading });
      }
    } else {
      for (let i = 0; i < steps; i++) {
        const dt = i * timeStep;
        const x = currentPos.x + currentSpeed * Math.cos(currentPos.heading) * dt;
        const y = currentPos.y + currentSpeed * Math.sin(currentPos.heading) * dt;
        
        path.push({ x, y, heading: currentPos.heading });
      }
    }
    
    return path;
  }

  private getEquipmentPairs(states: PredictedState[]): [PredictedState, PredictedState][] {
    const pairs: [PredictedState, PredictedState][] = [];
    
    for (let i = 0; i < states.length; i++) {
      for (let j = i + 1; j < states.length; j++) {
        const state1 = states[i];
        const state2 = states[j];
        
        const pos1 = state1.positions[0];
        const pos2 = state2.positions[0];
        const dx = pos1.x - pos2.x;
        const dy = pos1.y - pos2.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < 50) {
          pairs.push([state1, state2]);
        }
      }
    }
    
    return pairs;
  }

  private checkPairConflict(
    state1: PredictedState,
    state2: PredictedState
  ): ConflictAlert | null {
    const { safetyMargin, criticalTTC, warningTTC } = this.config;
    
    let minDistance = Infinity;
    let collisionTime = -1;
    let collisionPos: Position | null = null;
    
    const steps = Math.min(state1.positions.length, state2.positions.length);
    
    for (let i = 0; i < steps; i++) {
      const pos1 = state1.positions[i];
      const pos2 = state2.positions[i];
      
      const dx = pos1.x - pos2.x;
      const dy = pos1.y - pos2.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance < minDistance) {
        minDistance = distance;
      }
      
      if (checkCollision(
        pos1, state1.length, state1.width,
        pos2, state2.length, state2.width,
        safetyMargin
      )) {
        collisionTime = state1.timestamps[i];
        collisionPos = {
          x: (pos1.x + pos2.x) / 2,
          y: (pos1.y + pos2.y) / 2,
          heading: 0,
        };
        break;
      }
    }
    
    if (collisionTime >= 0 && collisionPos) {
      const ttc = collisionTime;
      let level: 'critical' | 'warning' | 'info' = 'info';
      
      if (ttc <= criticalTTC) {
        level = 'critical';
      } else if (ttc <= warningTTC) {
        level = 'warning';
      }
      
      return {
        id: `conflict_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        level,
        type: 'collision',
        involvedEquipment: [state1.equipmentId, state2.equipmentId],
        predictedTime: Date.now() + collisionTime * 1000,
        predictedPosition: collisionPos,
        timeToCollision: ttc,
        suggestedAction: this.generateSuggestedAction(state1, state2, collisionTime),
        timestamp: Date.now(),
        acknowledged: false,
        resolved: false,
      };
    }
    
    return null;
  }

  private generateSuggestedAction(
    state1: PredictedState,
    state2: PredictedState,
    collisionTime: number
  ): ConflictAlert['suggestedAction'] {
    const pos1 = state1.positions[0];
    const pos2 = state2.positions[0];
    const futurePos1 = state1.positions[Math.min(Math.floor(collisionTime / this.config.timeStep), state1.positions.length - 1)];
    const futurePos2 = state2.positions[Math.min(Math.floor(collisionTime / this.config.timeStep), state2.positions.length - 1)];
    
    const v1x = (futurePos1.x - pos1.x) / collisionTime;
    const v1y = (futurePos1.y - pos1.y) / collisionTime;
    const v2x = (futurePos2.x - pos2.x) / collisionTime;
    const v2y = (futurePos2.y - pos2.y) / collisionTime;
    
    const speed1 = Math.sqrt(v1x * v1x + v1y * v1y);
    const speed2 = Math.sqrt(v2x * v2x + v2y * v2y);
    
    if (speed1 > speed2) {
      return {
        type: 'slow_down',
        equipmentId: state1.equipmentId,
      };
    } else {
      return {
        type: 'reroute',
        equipmentId: state2.equipmentId,
        newPath: this.generateAlternativePath(state2, collisionTime),
      };
    }
  }

  private generateAlternativePath(
    state: PredictedState,
    collisionTime: number
  ): PathPoint[] {
    const path: PathPoint[] = [];
    const collisionIndex = Math.floor(collisionTime / this.config.timeStep);
    
    for (let i = 0; i < state.positions.length; i++) {
      const pos = state.positions[i];
      const t = state.timestamps[i];
      
      if (i < collisionIndex) {
        path.push({ x: pos.x, y: pos.y, t });
      } else {
        const offsetAngle = Math.PI / 4;
        const offsetDistance = 3;
        const originalHeading = pos.heading;
        const x = pos.x + Math.cos(originalHeading + offsetAngle) * offsetDistance;
        const y = pos.y + Math.sin(originalHeading + offsetAngle) * offsetDistance;
        path.push({ x, y, t });
      }
    }
    
    return path;
  }

  private checkZoneViolations(
    equipmentStates: EquipmentState[],
    predictedStates: PredictedState[]
  ): ConflictAlert[] {
    const alerts: ConflictAlert[] = [];
    const restrictedZones = this.getRestrictedZones();
    
    for (const state of predictedStates) {
      const equipment = equipmentStates.find((e) => e.id === state.equipmentId);
      if (!equipment) continue;
      
      for (const zone of restrictedZones) {
        for (let i = 0; i < state.positions.length; i++) {
          const pos = state.positions[i];
          if (this.isPointInPolygon(pos, zone.polygon)) {
            const ttc = state.timestamps[i];
            if (ttc < this.config.warningTTC) {
              alerts.push({
                id: `zone_violation_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                level: ttc < this.config.criticalTTC ? 'critical' : 'warning',
                type: 'zone_violation',
                involvedEquipment: [state.equipmentId],
                predictedTime: Date.now() + ttc * 1000,
                predictedPosition: pos,
                timeToCollision: ttc,
                suggestedAction: {
                  type: 'stop',
                  equipmentId: state.equipmentId,
                },
                timestamp: Date.now(),
                acknowledged: false,
                resolved: false,
              });
              break;
            }
          }
        }
      }
    }
    
    return alerts;
  }

  private getRestrictedZones(): { id: string; polygon: Position[] }[] {
    return [
      {
        id: 'runway_1',
        polygon: [
          { x: 100, y: 0, heading: 0 },
          { x: 100, y: 500, heading: 0 },
          { x: 150, y: 500, heading: 0 },
          { x: 150, y: 0, heading: 0 },
        ],
      },
      {
        id: 'runway_2',
        polygon: [
          { x: 300, y: 0, heading: 0 },
          { x: 300, y: 500, heading: 0 },
          { x: 350, y: 500, heading: 0 },
          { x: 350, y: 0, heading: 0 },
        ],
      },
    ];
  }

  private isPointInPolygon(point: Position, polygon: Position[]): boolean {
    let inside = false;
    
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i].x, yi = polygon[i].y;
      const xj = polygon[j].x, yj = polygon[j].y;
      
      if (((yi > point.y) !== (yj > point.y)) &&
          (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi)) {
        inside = !inside;
      }
    }
    
    return inside;
  }
}

export function createConflictDetector(
  config?: Partial<ConflictDetectionConfig>
): ConflictDetector {
  return new ConflictDetector(config);
}
