import type {
  RobotState,
  RobotPose,
  JointState,
  Vector3,
  MasterControlCommand,
  DataSyncMessage,
  Obstacle,
  PlannedPath,
} from "@/types";
import { PathPlanner, smoothPath } from "./path-planner";
import { saveRobotState, savePoseSnapshot, savePlannedPath } from "./indexedDB";

type StateChangeListener = (state: RobotState) => void;
type CommandListener = (command: MasterControlCommand) => void;

interface JointLimit {
  min: number;
  max: number;
  maxVelocity: number;
  maxTorque: number;
}

const DEFAULT_JOINT_LIMITS: JointLimit[] = [
  { min: -180, max: 180, maxVelocity: 180, maxTorque: 500 },
  { min: -90, max: 90, maxVelocity: 150, maxTorque: 400 },
  { min: -180, max: 180, maxVelocity: 180, maxTorque: 300 },
  { min: -180, max: 180, maxVelocity: 200, maxTorque: 200 },
  { min: -180, max: 180, maxVelocity: 200, maxTorque: 100 },
  { min: -360, max: 360, maxVelocity: 300, maxTorque: 50 },
];

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function vectorDistance(a: Vector3, b: Vector3): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = a.z - b.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function lerpVector(a: Vector3, b: Vector3, t: number): Vector3 {
  return {
    x: lerp(a.x, b.x, t),
    y: lerp(a.y, b.y, t),
    z: lerp(a.z, b.z, t),
  };
}

export class MasterController {
  private robots: Map<string, RobotState> = new Map();
  private obstacles: Obstacle[] = [];
  private stateListeners: Map<string, Set<StateChangeListener>> = new Map();
  private commandListeners: Set<CommandListener> = new Set();
  private pathPlanner: PathPlanner;
  private sequenceCounter: number = 0;
  private currentSessionId: string | null = null;
  private plannedPaths: Map<string, PlannedPath> = new Map();
  private pathProgress: Map<string, number> = new Map();
  private animationFrameId: number | null = null;
  private isRunning: boolean = false;

  constructor() {
    this.pathPlanner = new PathPlanner();
  }

  setSessionId(sessionId: string): void {
    this.currentSessionId = sessionId;
  }

  registerRobot(robotId: string, name: string, initialPose?: RobotPose): RobotState {
    const defaultPose: RobotPose = initialPose || {
      position: { x: 0, y: 0, z: 0 },
      orientation: { x: 0, y: 0, z: 0 },
      joints: DEFAULT_JOINT_LIMITS.map((_, i) => ({
        jointId: i,
        angle: 0,
        velocity: 0,
        torque: 0,
        temperature: 25,
      })),
    };

    const state: RobotState = {
      id: robotId,
      name,
      timestamp: Date.now(),
      pose: defaultPose,
      status: "idle",
      batteryLevel: 100,
      safetyDistance: 0.5,
    };

    this.robots.set(robotId, state);
    this.stateListeners.set(robotId, new Set());

    void saveRobotState(state);
    return state;
  }

  unregisterRobot(robotId: string): void {
    this.robots.delete(robotId);
    this.stateListeners.delete(robotId);
    this.plannedPaths.delete(robotId);
    this.pathProgress.delete(robotId);
  }

  getRobotState(robotId: string): RobotState | undefined {
    return this.robots.get(robotId);
  }

  getAllRobotStates(): RobotState[] {
    return Array.from(this.robots.values());
  }

  addObstacle(obstacle: Obstacle): void {
    this.obstacles.push(obstacle);
  }

  removeObstacle(obstacleId: string): void {
    this.obstacles = this.obstacles.filter((o) => o.id !== obstacleId);
  }

  getObstacles(): Obstacle[] {
    return [...this.obstacles];
  }

  updateObstacles(obstacles: Obstacle[]): void {
    this.obstacles = obstacles;
  }

  addStateListener(robotId: string, listener: StateChangeListener): () => void {
    const listeners = this.stateListeners.get(robotId);
    if (listeners) {
      listeners.add(listener);
    }
    return () => listeners?.delete(listener);
  }

  addCommandListener(listener: CommandListener): () => void {
    this.commandListeners.add(listener);
    return () => this.commandListeners.delete(listener);
  }

  private notifyStateListeners(robotId: string, state: RobotState): void {
    const listeners = this.stateListeners.get(robotId);
    if (listeners) {
      for (const listener of listeners) {
        try {
          listener(state);
        } catch (e) {
          console.error("Error in state listener:", e);
        }
      }
    }
  }

  private notifyCommandListeners(command: MasterControlCommand): void {
    for (const listener of this.commandListeners) {
      try {
        listener(command);
      } catch (e) {
        console.error("Error in command listener:", e);
      }
    }
  }

  async sendCommand(command: MasterControlCommand): Promise<void> {
    this.notifyCommandListeners(command);

    const robot = this.robots.get(command.robotId);
    if (!robot) return;

    switch (command.commandType) {
      case "move_to":
        if (command.targetPose) {
          await this.moveRobotTo(command.robotId, command.targetPose);
        }
        break;
      case "pause":
        this.updateRobotStatus(command.robotId, "paused");
        break;
      case "resume":
        this.updateRobotStatus(command.robotId, "moving");
        break;
      case "stop":
        this.stopRobot(command.robotId);
        break;
      case "home":
        await this.moveRobotToHome(command.robotId);
        break;
    }
  }

  async planAndExecutePath(
    robotId: string,
    targetPosition: Vector3,
    targetOrientation?: Vector3
  ): Promise<PlannedPath | null> {
    const robot = this.robots.get(robotId);
    if (!robot) return null;

    this.updateRobotStatus(robotId, "moving");

    const path = await this.pathPlanner.plan(
      robotId,
      robot.pose.position,
      targetPosition,
      this.obstacles
    );

    path.points = smoothPath(path.points, 3);
    this.plannedPaths.set(robotId, path);
    this.pathProgress.set(robotId, 0);

    void savePlannedPath(path);

    return path;
  }

  private async moveRobotTo(robotId: string, targetPose: RobotPose): Promise<void> {
    const robot = this.robots.get(robotId);
    if (!robot) return;

    const path = await this.planAndExecutePath(robotId, targetPose.position, targetPose.orientation);
    if (!path) return;

    robot.targetPose = targetPose;
    this.robots.set(robotId, robot);
    this.notifyStateListeners(robotId, robot);
  }

  private async moveRobotToHome(robotId: string): Promise<void> {
    const homePose: RobotPose = {
      position: { x: 0, y: 0, z: 0 },
      orientation: { x: 0, y: 0, z: 0 },
      joints: DEFAULT_JOINT_LIMITS.map((_, i) => ({
        jointId: i,
        angle: 0,
        velocity: 0,
        torque: 0,
        temperature: 25,
      })),
    };
    await this.moveRobotTo(robotId, homePose);
  }

  private stopRobot(robotId: string): void {
    this.plannedPaths.delete(robotId);
    this.pathProgress.delete(robotId);
    this.updateRobotStatus(robotId, "idle");

    const robot = this.robots.get(robotId);
    if (robot) {
      robot.targetPose = undefined;
      this.robots.set(robotId, robot);
      this.notifyStateListeners(robotId, robot);
    }
  }

  private updateRobotStatus(robotId: string, status: RobotState["status"]): void {
    const robot = this.robots.get(robotId);
    if (robot) {
      robot.status = status;
      robot.timestamp = Date.now();
      this.robots.set(robotId, robot);
      this.notifyStateListeners(robotId, robot);
      void saveRobotState(robot);
    }
  }

  updateRobotPose(robotId: string, pose: Partial<RobotPose>): void {
    const robot = this.robots.get(robotId);
    if (!robot) return;

    if (pose.position) {
      robot.pose.position = { ...robot.pose.position, ...pose.position };
    }
    if (pose.orientation) {
      robot.pose.orientation = { ...robot.pose.orientation, ...pose.orientation };
    }
    if (pose.joints) {
      robot.pose.joints = pose.joints.map((joint, i) => ({
        ...robot.pose.joints[i],
        ...joint,
      }));
    }

    robot.timestamp = Date.now();
    this.robots.set(robotId, robot);
    this.notifyStateListeners(robotId, robot);
    void saveRobotState(robot);
  }

  updateJointState(robotId: string, jointId: number, jointState: Partial<JointState>): void {
    const robot = this.robots.get(robotId);
    if (!robot || !robot.pose.joints[jointId]) return;

    robot.pose.joints[jointId] = {
      ...robot.pose.joints[jointId],
      ...jointState,
    };
    robot.timestamp = Date.now();
    this.robots.set(robotId, robot);
    this.notifyStateListeners(robotId, robot);
  }

  createSyncMessage(type: DataSyncMessage["type"], payload: unknown): DataSyncMessage {
    return {
      type,
      source: "master",
      payload,
      timestamp: Date.now(),
      sequence: this.sequenceCounter++,
    };
  }

  validateJointAngles(jointAngles: number[]): { valid: boolean; violations: string[] } {
    const violations: string[] = [];

    for (let i = 0; i < jointAngles.length; i++) {
      const limits = DEFAULT_JOINT_LIMITS[i];
      if (!limits) continue;

      if (jointAngles[i] < limits.min || jointAngles[i] > limits.max) {
        violations.push(`Joint ${i}: angle ${jointAngles[i].toFixed(2)}° out of range [${limits.min}°, ${limits.max}°]`);
      }
    }

    return { valid: violations.length === 0, violations };
  }

  calculateSafetyDistance(robotPosition: Vector3): number {
    let minDistance = Infinity;

    for (const obstacle of this.obstacles) {
      const halfSize = {
        x: obstacle.size.x / 2,
        y: obstacle.size.y / 2,
        z: obstacle.size.z / 2,
      };
      const closest = {
        x: Math.max(obstacle.position.x - halfSize.x, Math.min(robotPosition.x, obstacle.position.x + halfSize.x)),
        y: Math.max(obstacle.position.y - halfSize.y, Math.min(robotPosition.y, obstacle.position.y + halfSize.y)),
        z: Math.max(obstacle.position.z - halfSize.z, Math.min(robotPosition.z, obstacle.position.z + halfSize.z)),
      };
      const dist = vectorDistance(robotPosition, closest);
      minDistance = Math.min(minDistance, dist);
    }

    for (const [otherId, otherRobot] of this.robots) {
      const dist = vectorDistance(robotPosition, otherRobot.pose.position);
      minDistance = Math.min(minDistance, dist);
    }

    return minDistance;
  }

  startSimulation(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.simulationLoop();
  }

  stopSimulation(): void {
    this.isRunning = false;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  private simulationLoop = (): void => {
    if (!this.isRunning) return;

    this.updateRobotMovements();
    this.updateDynamicObstacles();
    this.checkCollisions();
    this.saveSnapshots();

    this.animationFrameId = requestAnimationFrame(this.simulationLoop);
  };

  private updateRobotMovements(): void {
    const speed = 0.02;

    for (const [robotId, path] of this.plannedPaths) {
      const robot = this.robots.get(robotId);
      if (!robot || robot.status !== "moving") continue;

      const progress = this.pathProgress.get(robotId) || 0;
      const nextIndex = Math.min(Math.floor(progress) + 1, path.points.length - 1);

      if (nextIndex >= path.points.length - 1) {
        this.updateRobotStatus(robotId, "idle");
        robot.targetPose = undefined;
        this.plannedPaths.delete(robotId);
        continue;
      }

      const t = progress - Math.floor(progress);
      const currentPoint = path.points[Math.floor(progress)];
      const nextPoint = path.points[nextIndex];

      const newPosition = lerpVector(currentPoint.position, nextPoint.position, t);
      this.updateRobotPose(robotId, { position: newPosition });

      this.pathProgress.set(robotId, progress + speed);
    }
  }

  private updateDynamicObstacles(): void {
    for (const obstacle of this.obstacles) {
      if (obstacle.type === "dynamic" && obstacle.velocity) {
        obstacle.position.x += obstacle.velocity.x * 0.016;
        obstacle.position.y += obstacle.velocity.y * 0.016;
        obstacle.position.z += obstacle.velocity.z * 0.016;

        if (Math.abs(obstacle.position.x) > 5) {
          obstacle.velocity.x *= -1;
        }
        if (Math.abs(obstacle.position.y) > 5) {
          obstacle.velocity.y *= -1;
        }
        if (Math.abs(obstacle.position.z) > 5) {
          obstacle.velocity.z *= -1;
        }
      }
    }
  }

  private checkCollisions(): void {
    for (const [robotId, robot] of this.robots) {
      const safetyDist = this.calculateSafetyDistance(robot.pose.position);
      robot.safetyDistance = safetyDist;

      if (safetyDist < 0.1 && robot.status !== "collision") {
        this.updateRobotStatus(robotId, "collision");
        this.stopRobot(robotId);
      } else if (safetyDist < 0.3 && robot.status === "moving") {
        robot.status = "paused";
        this.notifyStateListeners(robotId, robot);
      }
    }
  }

  private lastSnapshotTime: number = 0;

  private saveSnapshots(): void {
    const now = Date.now();
    if (now - this.lastSnapshotTime < 500) return;
    this.lastSnapshotTime = now;

    if (!this.currentSessionId) return;

    for (const [robotId, robot] of this.robots) {
      void savePoseSnapshot({
        robotId,
        timestamp: now,
        pose: JSON.parse(JSON.stringify(robot.pose)),
        obstacles: JSON.parse(JSON.stringify(this.obstacles)),
        alerts: [],
        sessionId: this.currentSessionId,
      });
    }
  }

  getPathPlanner(): PathPlanner {
    return this.pathPlanner;
  }

  getPlannedPath(robotId: string): PlannedPath | undefined {
    return this.plannedPaths.get(robotId);
  }

  generateJointAngles(endEffectorPos: Vector3): number[] {
    const baseAngle = Math.atan2(endEffectorPos.y, endEffectorPos.x) * (180 / Math.PI);
    const shoulderAngle = Math.atan2(endEffectorPos.z, Math.sqrt(endEffectorPos.x ** 2 + endEffectorPos.y ** 2)) * (180 / Math.PI);

    return [
      baseAngle,
      shoulderAngle - 45,
      90 - shoulderAngle,
      0,
      shoulderAngle,
      baseAngle,
    ];
  }
}

export const masterController = new MasterController();
