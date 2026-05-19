import type { RobotState, SafetyAlert, JointState, Vector3, DataSyncMessage } from "@/types";
import { saveSafetyAlert, getUnacknowledgedAlerts, acknowledgeAlert } from "./indexedDB";

type AlertListener = (alert: SafetyAlert) => void;
type StateSyncListener = (state: RobotState) => void;

interface SafetyThresholds {
  minSafetyDistance: number;
  warningSafetyDistance: number;
  maxJointTemperature: number;
  maxJointVelocity: number;
  maxJointTorque: number;
  pathDeviationThreshold: number;
}

const DEFAULT_THRESHOLDS: SafetyThresholds = {
  minSafetyDistance: 0.1,
  warningSafetyDistance: 0.3,
  maxJointTemperature: 75,
  maxJointVelocity: 150,
  maxJointTorque: 450,
  pathDeviationThreshold: 0.15,
};

function generateAlertId(): string {
  return `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function vectorDistance(a: Vector3, b: Vector3): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = a.z - b.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

export class SafetyMonitor {
  private robotStates: Map<string, RobotState> = new Map();
  private alertListeners: Set<AlertListener> = new Set();
  private stateSyncListeners: Set<StateSyncListener> = new Set();
  private thresholds: SafetyThresholds;
  private lastAlertTimes: Map<string, number> = new Map();
  private alertCooldown: number = 1000;
  private expectedPaths: Map<string, Vector3[]> = new Map();

  constructor(customThresholds?: Partial<SafetyThresholds>) {
    this.thresholds = { ...DEFAULT_THRESHOLDS, ...customThresholds };
  }

  updateThresholds(customThresholds: Partial<SafetyThresholds>): void {
    this.thresholds = { ...this.thresholds, ...customThresholds };
  }

  getThresholds(): SafetyThresholds {
    return { ...this.thresholds };
  }

  addAlertListener(listener: AlertListener): () => void {
    this.alertListeners.add(listener);
    return () => this.alertListeners.delete(listener);
  }

  addStateSyncListener(listener: StateSyncListener): () => void {
    this.stateSyncListeners.add(listener);
    return () => this.stateSyncListeners.delete(listener);
  }

  setExpectedPath(robotId: string, path: Vector3[]): void {
    this.expectedPaths.set(robotId, path);
  }

  clearExpectedPath(robotId: string): void {
    this.expectedPaths.delete(robotId);
  }

  processRobotState(state: RobotState): SafetyAlert[] {
    const previousState = this.robotStates.get(state.id);
    this.robotStates.set(state.id, state);

    this.notifyStateSyncListeners(state);

    const alerts: SafetyAlert[] = [];

    const distanceAlert = this.checkSafetyDistance(state);
    if (distanceAlert) alerts.push(distanceAlert);

    const jointAlerts = this.checkJointLimits(state);
    alerts.push(...jointAlerts);

    const pathAlert = this.checkPathDeviation(state);
    if (pathAlert) alerts.push(pathAlert);

    if (state.status === "collision") {
      const collisionAlert = this.createAlert(
        state.id,
        "collision_warning",
        "critical",
        `机器人 ${state.name} 发生碰撞！已紧急停止。`
      );
      alerts.push(collisionAlert);
    }

    for (const alert of alerts) {
      this.notifyAlertListeners(alert);
      void saveSafetyAlert(alert);
    }

    return alerts;
  }

  processSyncMessage(message: DataSyncMessage): void {
    if (message.type === "state_update" && typeof message.payload === "object" && message.payload !== null) {
      const state = message.payload as RobotState;
      void this.processRobotState(state);
    }
  }

  private checkSafetyDistance(state: RobotState): SafetyAlert | null {
    const safetyDist = state.safetyDistance ?? Infinity;

    if (safetyDist < this.thresholds.minSafetyDistance) {
      return this.createAlert(
        state.id,
        "collision_warning",
        "critical",
        `机器人 ${state.name} 距离障碍物过近：${safetyDist.toFixed(3)}m，低于安全阈值 ${this.thresholds.minSafetyDistance}m`
      );
    }

    if (safetyDist < this.thresholds.warningSafetyDistance) {
      return this.createAlert(
        state.id,
        "collision_warning",
        "warning",
        `机器人 ${state.name} 接近障碍物：${safetyDist.toFixed(3)}m`
      );
    }

    return null;
  }

  private checkJointLimits(state: RobotState): SafetyAlert[] {
    const alerts: SafetyAlert[] = [];

    for (const joint of state.pose.joints) {
      if (joint.temperature > this.thresholds.maxJointTemperature) {
        alerts.push(
          this.createAlert(
            state.id,
            "temperature_warning",
            joint.temperature > this.thresholds.maxJointTemperature + 10 ? "critical" : "warning",
            `机器人 ${state.name} 关节 ${joint.jointId} 温度过高：${joint.temperature.toFixed(1)}°C`
          )
        );
      }

      if (Math.abs(joint.velocity) > this.thresholds.maxJointVelocity) {
        alerts.push(
          this.createAlert(
            state.id,
            "velocity_limit",
            "warning",
            `机器人 ${state.name} 关节 ${joint.jointId} 速度超限：${joint.velocity.toFixed(1)}°/s`
          )
        );
      }

      if (Math.abs(joint.torque) > this.thresholds.maxJointTorque) {
        alerts.push(
          this.createAlert(
            state.id,
            "joint_limit",
            "warning",
            `机器人 ${state.name} 关节 ${joint.jointId} 扭矩超限：${joint.torque.toFixed(1)}N·m`
          )
        );
      }
    }

    return alerts;
  }

  private checkPathDeviation(state: RobotState): SafetyAlert | null {
    const expectedPath = this.expectedPaths.get(state.id);
    if (!expectedPath || expectedPath.length < 2) return null;

    const currentPos = state.pose.position;
    let minDistance = Infinity;

    for (let i = 0; i < expectedPath.length - 1; i++) {
      const p1 = expectedPath[i];
      const p2 = expectedPath[i + 1];
      const dist = this.pointToLineDistance(currentPos, p1, p2);
      minDistance = Math.min(minDistance, dist);
    }

    if (minDistance > this.thresholds.pathDeviationThreshold) {
      return this.createAlert(
        state.id,
        "path_deviation",
        "warning",
        `机器人 ${state.name} 路径偏离：${minDistance.toFixed(3)}m，超过阈值 ${this.thresholds.pathDeviationThreshold}m`
      );
    }

    return null;
  }

  private pointToLineDistance(point: Vector3, lineStart: Vector3, lineEnd: Vector3): number {
    const lineVec = {
      x: lineEnd.x - lineStart.x,
      y: lineEnd.y - lineStart.y,
      z: lineEnd.z - lineStart.z,
    };
    const pointVec = {
      x: point.x - lineStart.x,
      y: point.y - lineStart.y,
      z: point.z - lineStart.z,
    };

    const lineMag = Math.sqrt(lineVec.x ** 2 + lineVec.y ** 2 + lineVec.z ** 2);
    if (lineMag === 0) return vectorDistance(point, lineStart);

    const t = Math.max(0, Math.min(1, (pointVec.x * lineVec.x + pointVec.y * lineVec.y + pointVec.z * lineVec.z) / (lineMag * lineMag)));

    const projection = {
      x: lineStart.x + t * lineVec.x,
      y: lineStart.y + t * lineVec.y,
      z: lineStart.z + t * lineVec.z,
    };

    return vectorDistance(point, projection);
  }

  private createAlert(
    robotId: string,
    type: SafetyAlert["type"],
    severity: SafetyAlert["severity"],
    message: string
  ): SafetyAlert {
    const alertKey = `${robotId}-${type}`;
    const now = Date.now();
    const lastAlert = this.lastAlertTimes.get(alertKey);

    if (lastAlert && now - lastAlert < this.alertCooldown) {
      return {} as SafetyAlert;
    }

    this.lastAlertTimes.set(alertKey, now);

    return {
      id: generateAlertId(),
      robotId,
      type,
      severity,
      message,
      timestamp: now,
      acknowledged: false,
    };
  }

  private notifyAlertListeners(alert: SafetyAlert): void {
    if (!alert.id) return;

    for (const listener of this.alertListeners) {
      try {
        listener(alert);
      } catch (e) {
        console.error("Error in alert listener:", e);
      }
    }
  }

  private notifyStateSyncListeners(state: RobotState): void {
    for (const listener of this.stateSyncListeners) {
      try {
        listener(state);
      } catch (e) {
        console.error("Error in state sync listener:", e);
      }
    }
  }

  async acknowledgeAlert(alertId: string): Promise<void> {
    await acknowledgeAlert(alertId);
  }

  async getPendingAlerts(): Promise<SafetyAlert[]> {
    return getUnacknowledgedAlerts();
  }

  validateStateTransition(
    currentState: RobotState,
    targetState: Partial<RobotState>
  ): { valid: boolean; reason?: string } {
    if (targetState.status === "moving" && currentState.status === "collision") {
      return { valid: false, reason: "碰撞状态下无法启动移动" };
    }

    if (targetState.pose?.joints) {
      for (const joint of targetState.pose.joints) {
        if (joint.temperature && joint.temperature > this.thresholds.maxJointTemperature + 20) {
          return { valid: false, reason: `关节 ${joint.jointId} 温度过高，禁止运动` };
        }
      }
    }

    return { valid: true };
  }

  getRobotState(robotId: string): RobotState | undefined {
    return this.robotStates.get(robotId);
  }

  getAllRobotStates(): RobotState[] {
    return Array.from(this.robotStates.values());
  }

  clearRobotState(robotId: string): void {
    this.robotStates.delete(robotId);
    this.expectedPaths.delete(robotId);
  }

  clearAll(): void {
    this.robotStates.clear();
    this.expectedPaths.clear();
    this.lastAlertTimes.clear();
  }

  getJointStatusSummary(joint: JointState): { status: "normal" | "warning" | "critical"; messages: string[] } {
    const messages: string[] = [];
    let status: "normal" | "warning" | "critical" = "normal";

    if (joint.temperature > this.thresholds.maxJointTemperature) {
      status = joint.temperature > this.thresholds.maxJointTemperature + 10 ? "critical" : "warning";
      messages.push(`温度: ${joint.temperature.toFixed(1)}°C`);
    }

    if (Math.abs(joint.velocity) > this.thresholds.maxJointVelocity) {
      status = status === "critical" ? "critical" : "warning";
      messages.push(`速度: ${joint.velocity.toFixed(1)}°/s`);
    }

    if (Math.abs(joint.torque) > this.thresholds.maxJointTorque) {
      status = status === "critical" ? "critical" : "warning";
      messages.push(`扭矩: ${joint.torque.toFixed(1)}N·m`);
    }

    return { status, messages };
  }
}

export const safetyMonitor = new SafetyMonitor();
