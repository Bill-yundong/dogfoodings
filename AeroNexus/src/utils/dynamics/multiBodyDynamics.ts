import type { Position, Velocity, PathPoint } from '@/types';

export interface DynamicsParams {
  mass: number;
  length: number;
  width: number;
  wheelBase: number;
  maxSpeed: number;
  maxAcceleration: number;
  maxDeceleration: number;
  maxSteeringAngle: number;
  frictionCoefficient: number;
  airResistanceCoefficient: number;
}

export interface DynamicState {
  position: Position;
  velocity: Velocity;
  acceleration: number;
  steeringAngle: number;
  timestamp: number;
}

export const DEFAULT_DYNAMICS_PARAMS: Record<string, DynamicsParams> = {
  tug: {
    mass: 5000,
    length: 4.5,
    width: 2.2,
    wheelBase: 3.0,
    maxSpeed: 8.33,
    maxAcceleration: 1.5,
    maxDeceleration: 3.0,
    maxSteeringAngle: 0.52,
    frictionCoefficient: 0.015,
    airResistanceCoefficient: 0.3,
  },
  baggage: {
    mass: 3500,
    length: 6.0,
    width: 2.5,
    wheelBase: 4.0,
    maxSpeed: 6.94,
    maxAcceleration: 1.2,
    maxDeceleration: 2.5,
    maxSteeringAngle: 0.44,
    frictionCoefficient: 0.018,
    airResistanceCoefficient: 0.4,
  },
  fuel: {
    mass: 15000,
    length: 10.0,
    width: 3.0,
    wheelBase: 6.0,
    maxSpeed: 5.56,
    maxAcceleration: 0.8,
    maxDeceleration: 2.0,
    maxSteeringAngle: 0.35,
    frictionCoefficient: 0.02,
    airResistanceCoefficient: 0.5,
  },
  catering: {
    mass: 8000,
    length: 8.0,
    width: 2.8,
    wheelBase: 5.0,
    maxSpeed: 6.94,
    maxAcceleration: 1.0,
    maxDeceleration: 2.2,
    maxSteeringAngle: 0.38,
    frictionCoefficient: 0.017,
    airResistanceCoefficient: 0.45,
  },
  bus: {
    mass: 12000,
    length: 12.0,
    width: 3.2,
    wheelBase: 7.0,
    maxSpeed: 8.33,
    maxAcceleration: 1.0,
    maxDeceleration: 2.5,
    maxSteeringAngle: 0.40,
    frictionCoefficient: 0.016,
    airResistanceCoefficient: 0.55,
  },
};

export class MultiBodyDynamics {
  private params: DynamicsParams;

  constructor(params: DynamicsParams) {
    this.params = params;
  }

  computeAcceleration(
    velocity: number,
    throttle: number,
    brake: number,
    gradient: number = 0
  ): number {
    const { mass, maxAcceleration, maxDeceleration, frictionCoefficient, airResistanceCoefficient } = this.params;
    
    const tractionForce = throttle * mass * maxAcceleration;
    const brakeForce = brake * mass * maxDeceleration;
    const rollingResistance = frictionCoefficient * mass * 9.81 * Math.cos(gradient);
    const airResistance = airResistanceCoefficient * velocity * velocity;
    const gravityForce = mass * 9.81 * Math.sin(gradient);
    
    const netForce = tractionForce - brakeForce - rollingResistance - airResistance - gravityForce;
    const acceleration = netForce / mass;
    
    return Math.max(-maxDeceleration, Math.min(maxAcceleration, acceleration));
  }

  computeAngularVelocity(
    velocity: number,
    steeringAngle: number
  ): number {
    const { wheelBase, maxSteeringAngle } = this.params;
    const clampedSteering = Math.max(-maxSteeringAngle, Math.min(maxSteeringAngle, steeringAngle));
    
    if (Math.abs(velocity) < 0.01) return 0;
    
    return velocity * Math.tan(clampedSteering) / wheelBase;
  }

  step(
    currentState: DynamicState,
    throttle: number,
    brake: number,
    steeringAngle: number,
    dt: number,
    gradient: number = 0
  ): DynamicState {
    const { maxSpeed } = this.params;
    
    const speed = Math.abs(currentState.velocity.linear);
    const acceleration = this.computeAcceleration(speed, throttle, brake, gradient);
    
    let newSpeed = speed + acceleration * dt;
    newSpeed = Math.max(0, Math.min(maxSpeed, newSpeed));
    
    const direction = currentState.velocity.linear >= 0 ? 1 : -1;
    const newLinearVelocity = newSpeed * direction;
    
    const angularVelocity = this.computeAngularVelocity(newLinearVelocity, steeringAngle);
    const newHeading = currentState.position.heading + angularVelocity * dt;
    
    const avgVelocity = (currentState.velocity.linear + newLinearVelocity) / 2;
    const newX = currentState.position.x + avgVelocity * Math.cos(currentState.position.heading) * dt;
    const newY = currentState.position.y + avgVelocity * Math.sin(currentState.position.heading) * dt;
    
    return {
      position: {
        x: newX,
        y: newY,
        heading: this.normalizeAngle(newHeading),
      },
      velocity: {
        linear: newLinearVelocity,
        angular: angularVelocity,
      },
      acceleration,
      steeringAngle,
      timestamp: currentState.timestamp + dt * 1000,
    };
  }

  predictTrajectory(
    initialState: DynamicState,
    throttleProfile: number[],
    brakeProfile: number[],
    steeringProfile: number[],
    dt: number,
    horizon: number
  ): PathPoint[] {
    const trajectory: PathPoint[] = [];
    let currentState = initialState;
    
    const steps = Math.ceil(horizon / dt);
    
    for (let i = 0; i < steps; i++) {
      const throttle = throttleProfile[Math.min(i, throttleProfile.length - 1)];
      const brake = brakeProfile[Math.min(i, brakeProfile.length - 1)];
      const steering = steeringProfile[Math.min(i, steeringProfile.length - 1)];
      
      currentState = this.step(currentState, throttle, brake, steering, dt);
      
      trajectory.push({
        x: currentState.position.x,
        y: currentState.position.y,
        t: i * dt,
        v: currentState.velocity.linear,
      });
    }
    
    return trajectory;
  }

  computeMinimumTurningRadius(): number {
    return this.params.wheelBase / Math.tan(this.params.maxSteeringAngle);
  }

  computeStoppingDistance(velocity: number): number {
    const { maxDeceleration } = this.params;
    return (velocity * velocity) / (2 * maxDeceleration);
  }

  private normalizeAngle(angle: number): number {
    while (angle > Math.PI) angle -= 2 * Math.PI;
    while (angle < -Math.PI) angle += 2 * Math.PI;
    return angle;
  }
}

export function getDynamicsParams(equipmentType: string): DynamicsParams {
  return DEFAULT_DYNAMICS_PARAMS[equipmentType] || DEFAULT_DYNAMICS_PARAMS.tug;
}

export function getBoundingPolygon(
  position: Position,
  length: number,
  width: number
): Position[] {
  const cos = Math.cos(position.heading);
  const sin = Math.sin(position.heading);
  
  const halfLength = length / 2;
  const halfWidth = width / 2;
  
  const corners = [
    { x: halfLength, y: -halfWidth },
    { x: halfLength, y: halfWidth },
    { x: -halfLength, y: halfWidth },
    { x: -halfLength, y: -halfWidth },
  ];
  
  return corners.map((corner) => ({
    x: position.x + corner.x * cos - corner.y * sin,
    y: position.y + corner.x * sin + corner.y * cos,
    heading: position.heading,
  }));
}

export function checkCollision(
  pos1: Position,
  length1: number,
  width1: number,
  pos2: Position,
  length2: number,
  width2: number,
  safetyMargin: number = 0.5
): boolean {
  const dx = pos1.x - pos2.x;
  const dy = pos1.y - pos2.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  
  const minDistance = Math.max(length1, width1) / 2 + Math.max(length2, width2) / 2 + safetyMargin;
  
  if (distance > minDistance) return false;
  
  const poly1 = getBoundingPolygon(pos1, length1 + safetyMargin * 2, width1 + safetyMargin * 2);
  const poly2 = getBoundingPolygon(pos2, length2, width2);
  
  return checkPolygonIntersection(poly1, poly2);
}

function checkPolygonIntersection(poly1: Position[], poly2: Position[]): boolean {
  for (const polygon of [poly1, poly2]) {
    for (let i = 0; i < polygon.length; i++) {
      const p1 = polygon[i];
      const p2 = polygon[(i + 1) % polygon.length];
      
      const normal = { x: p2.y - p1.y, y: -(p2.x - p1.x) };
      
      let min1 = Infinity, max1 = -Infinity;
      for (const p of poly1) {
        const projected = normal.x * p.x + normal.y * p.y;
        min1 = Math.min(min1, projected);
        max1 = Math.max(max1, projected);
      }
      
      let min2 = Infinity, max2 = -Infinity;
      for (const p of poly2) {
        const projected = normal.x * p.x + normal.y * p.y;
        min2 = Math.min(min2, projected);
        max2 = Math.max(max2, projected);
      }
      
      if (max1 < min2 || max2 < min1) {
        return false;
      }
    }
  }
  
  return true;
}
