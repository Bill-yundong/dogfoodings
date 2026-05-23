import type { PassengerAgent, SocialForceParams, Vector2D, Obstacle, TerminalLayout } from '@/types';
import { V, SpatialGrid, Geometry } from '@/lib/math/vector2d';

const DEFAULT_PARAMS: SocialForceParams = {
  selfDrivingCoeff: 2.0,
  socialRepulsionCoeff: 15.0,
  socialRepulsionRange: 2.5,
  boundaryRepulsionCoeff: 10.0,
  attractionCoeff: 0.5,
  maxSpeed: 3.0,
  relaxationTime: 0.5,
};

export class SocialForceEngine {
  private params: SocialForceParams;
  private spatialGrid: SpatialGrid;
  private agentMap: Map<string, PassengerAgent>;
  private layout: TerminalLayout | null;

  constructor(params: Partial<SocialForceParams> = {}) {
    this.params = { ...DEFAULT_PARAMS, ...params };
    this.spatialGrid = new SpatialGrid(this.params.socialRepulsionRange * 2);
    this.agentMap = new Map();
    this.layout = null;
  }

  setLayout(layout: TerminalLayout): void {
    this.layout = layout;
  }

  setParams(params: Partial<SocialForceParams>): void {
    this.params = { ...this.params, ...params };
    this.spatialGrid = new SpatialGrid(this.params.socialRepulsionRange * 2);
  }

  getParams(): SocialForceParams {
    return { ...this.params };
  }

  setAgents(agents: PassengerAgent[]): void {
    this.agentMap.clear();
    for (const agent of agents) {
      this.agentMap.set(agent.id, agent);
    }
  }

  addAgent(agent: PassengerAgent): void {
    this.agentMap.set(agent.id, agent);
  }

  removeAgent(agentId: string): void {
    this.agentMap.delete(agentId);
  }

  update(dt: number): void {
    this.buildSpatialGrid();

    for (const agent of this.agentMap.values()) {
      if (agent.status === 'exited' || agent.status === 'boarding') continue;

      const forces = this.computeForces(agent);
      this.updateAgent(agent, dt, forces);
    }

    this.updateZoneCounts();
  }

  private buildSpatialGrid(): void {
    this.spatialGrid.clear();
    for (const agent of this.agentMap.values()) {
      if (agent.status !== 'exited') {
        this.spatialGrid.insert(agent.id, agent.position.x, agent.position.y);
      }
    }
  }

  computeForces(agent: PassengerAgent): Vector2D {
    const totalForce = V.zero();

    const selfDrivingForce = this.computeSelfDrivingForce(agent);
    V.add(totalForce, selfDrivingForce);

    const socialForce = this.computeSocialRepulsionForce(agent);
    V.add(totalForce, socialForce);

    if (this.layout) {
      const boundaryForce = this.computeBoundaryRepulsionForce(agent);
      V.add(totalForce, boundaryForce);

      const obstacleForce = this.computeObstacleRepulsionForce(agent);
      V.add(totalForce, obstacleForce);
    }

    if (agent.target) {
      const attractionForce = this.computeAttractionForce(agent);
      V.add(totalForce, attractionForce);
    }

    return totalForce;
  }

  private computeSelfDrivingForce(agent: PassengerAgent): Vector2D {
    if (!agent.target) {
      return V.zero();
    }

    const desiredDir = V.normalize(V.sub(agent.target, agent.position));
    const desiredVel = V.mul(desiredDir, this.getDesiredSpeed(agent));

    const velDiff = V.sub(desiredVel, agent.velocity);
    return V.mul(velDiff, this.params.selfDrivingCoeff / this.params.relaxationTime);
  }

  private getDesiredSpeed(agent: PassengerAgent): number {
    let baseSpeed = this.params.maxSpeed * 0.6;

    switch (agent.type) {
      case 'business':
        baseSpeed *= 1.3;
        break;
      case 'tourist':
        baseSpeed *= 0.85;
        break;
      case 'transfer':
        baseSpeed *= 1.1;
        break;
      case 'special':
        baseSpeed *= 0.5;
        break;
    }

    const timePressure = Math.max(0, 1 - agent.patience / agent.maxPatience);
    baseSpeed *= (1 + timePressure * 0.5);

    return Math.min(baseSpeed, this.params.maxSpeed);
  }

  private computeSocialRepulsionForce(agent: PassengerAgent): Vector2D {
    const force = V.zero();
    const neighborIds = this.spatialGrid.query(
      agent.position.x,
      agent.position.y,
      this.params.socialRepulsionRange
    );

    for (const neighborId of neighborIds) {
      if (neighborId === agent.id) continue;

      const neighbor = this.agentMap.get(neighborId);
      if (!neighbor || neighbor.status === 'exited') continue;

      const diff = V.sub(agent.position, neighbor.position);
      const dist = V.length(diff);

      if (dist < this.params.socialRepulsionRange && dist > 0) {
        const dir = V.div(diff, dist);
        const magnitude = this.params.socialRepulsionCoeff *
          Math.exp(-dist / this.params.socialRepulsionRange * 2);
        V.add(force, V.mul(dir, magnitude));
      }
    }

    return force;
  }

  private computeBoundaryRepulsionForce(agent: PassengerAgent): Vector2D {
    if (!this.layout) return V.zero();

    const force = V.zero();
    const { x, y } = agent.position;
    const range = 3.0;
    const coeff = this.params.boundaryRepulsionCoeff;

    if (x < range) {
      force.x += coeff * Math.exp(-x);
    } else if (x > this.layout.width - range) {
      force.x -= coeff * Math.exp(x - this.layout.width);
    }

    if (y < range) {
      force.y += coeff * Math.exp(-y);
    } else if (y > this.layout.height - range) {
      force.y -= coeff * Math.exp(y - this.layout.height);
    }

    return force;
  }

  private computeObstacleRepulsionForce(agent: PassengerAgent): Vector2D {
    if (!this.layout) return V.zero();

    const force = V.zero();
    const range = 2.0;

    for (const obstacle of this.layout.obstacles) {
      const dist = Geometry.distanceToPolygon(agent.position, obstacle.polygon);
      if (dist < range && dist > 0) {
        const nearest = this.findNearestPointOnPolygon(agent.position, obstacle.polygon);
        const dir = V.normalize(V.sub(agent.position, nearest));
        const magnitude = this.params.boundaryRepulsionCoeff * Math.exp(-dist * 2);
        V.add(force, V.mul(dir, magnitude));
      }
    }

    return force;
  }

  private findNearestPointOnPolygon(p: Vector2D, polygon: Vector2D[]): Vector2D {
    let nearest = polygon[0];
    let minDist = Infinity;

    for (let i = 0; i < polygon.length; i++) {
      const a = polygon[i];
      const b = polygon[(i + 1) % polygon.length];

      const ab = V.sub(b, a);
      const ap = V.sub(p, a);
      const t = Math.max(0, Math.min(1, V.dot(ap, ab) / V.lengthSquared(ab)));
      const proj = V.add(a, V.mul(ab, t));
      const dist = V.distanceSquared(p, proj);

      if (dist < minDist) {
        minDist = dist;
        nearest = proj;
      }
    }

    return nearest;
  }

  private computeAttractionForce(agent: PassengerAgent): Vector2D {
    if (!agent.target) return V.zero();

    const diff = V.sub(agent.target, agent.position);
    const dist = V.length(diff);

    if (dist < 0.5) return V.zero();

    const dir = V.normalize(diff);
    const magnitude = this.params.attractionCoeff * Math.min(dist, 5);

    return V.mul(dir, magnitude);
  }

  updateAgent(agent: PassengerAgent, dt: number, forces: Vector2D): void {
    const mass = 1.0;
    const acceleration = V.div(forces, mass);

    agent.velocity = V.add(agent.velocity, V.mul(acceleration, dt));
    agent.velocity = V.limit(agent.velocity, this.params.maxSpeed);

    const newPosition = V.add(agent.position, V.mul(agent.velocity, dt));

    if (this.isValidPosition(newPosition)) {
      agent.position = newPosition;
    } else {
      agent.velocity = V.mul(agent.velocity, -0.3);
    }

    agent.desiredVelocity = agent.target
      ? V.setLength(V.sub(agent.target, agent.position), this.getDesiredSpeed(agent))
      : V.zero();

    if (Math.random() < 0.05) {
      agent.trail.push(V.clone(agent.position));
      if (agent.trail.length > 10) {
        agent.trail.shift();
      }
    }
  }

  private isValidPosition(pos: Vector2D): boolean {
    if (!this.layout) return true;

    if (pos.x < 0 || pos.x > this.layout.width ||
        pos.y < 0 || pos.y > this.layout.height) {
      return false;
    }

    for (const obstacle of this.layout.obstacles) {
      if (Geometry.pointInPolygon(pos, obstacle.polygon)) {
        return false;
      }
    }

    return true;
  }

  private updateZoneCounts(): void {
    if (!this.layout) return;

    for (const zone of this.layout.zones) {
      zone.currentCount = 0;
    }

    for (const agent of this.agentMap.values()) {
      if (agent.status === 'exited') continue;

      for (const zone of this.layout.zones) {
        if (Geometry.pointInPolygon(agent.position, zone.polygon)) {
          zone.currentCount++;
          agent.currentZone = zone.id;
          break;
        }
      }
    }
  }

  getAgentById(id: string): PassengerAgent | undefined {
    return this.agentMap.get(id);
  }

  getAllAgents(): PassengerAgent[] {
    return Array.from(this.agentMap.values());
  }

  getActiveAgents(): PassengerAgent[] {
    return this.getAllAgents().filter(a => a.status !== 'exited');
  }
}
