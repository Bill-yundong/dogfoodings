import type { RobotModel, RobotPose, CollisionWarning } from '@/types/robot';
import { forwardKinematics, computeJacobian } from '@/lib/robotics/kinematics';
import { clampJointAngle, checkJointLimits } from '@/lib/robotics/robotModel';
import {
  computeTotalForce,
  computeJointVelocityFromForce,
  APFTarget,
} from '@/lib/planning/potentialField';
import {
  createOBBFromLink,
  checkAllCollisions,
  OBB,
} from '@/lib/planning/collision';
import { createDataFrame, calculateDeviation } from '@/lib/sync/dataAlignment';
import { robotDB } from '@/lib/storage/indexedDB';
import { useSimulationStore } from '@/store/simulationStore';

export class SimulationEngine {
  private lastFrameTime: number = 0;
  private animationFrameId: number | null = null;
  private isRunning: boolean = false;
  private snapshotInterval: number = 100;
  private lastSnapshotTime: number = 0;

  constructor() {}

  start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.lastFrameTime = performance.now();
    this.lastSnapshotTime = Date.now();
    this.loop();
  }

  stop(): void {
    this.isRunning = false;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  private loop = (): void => {
    if (!this.isRunning) return;

    const now = performance.now();
    const deltaTime = Math.min((now - this.lastFrameTime) / 1000, 0.1);
    this.lastFrameTime = now;

    this.update(deltaTime);

    this.animationFrameId = requestAnimationFrame(this.loop);
  };

  private update(deltaTime: number): void {
    const state = useSimulationStore.getState();
    if (state.status !== 'running') return;

    const {
      robotModels,
      robotPoses,
      robotTargets,
      obstacles,
      apfParameters,
      frameNumber,
      simulationTime,
      speedMultiplier,
    } = state;

    const newPoses = new Map<string, RobotPose>();
    const allLinkOBBs: OBB[][] = [];
    const robotEndPositions: Array<{ position: [number, number, number]; radius: number }> = [];

    for (const model of robotModels) {
      const pose = robotPoses.get(model.id);
      if (!pose) continue;

      const target = robotTargets.get(model.id);
      if (!target) continue;

      const fkResult = forwardKinematics(model.dhParameters, pose.joints, model.basePosition);

      const otherRobotPositions = robotModels
        .filter(m => m.id !== model.id)
        .map(m => {
          const otherPose = robotPoses.get(m.id);
          return otherPose ? {
            position: otherPose.endEffector.position,
            radius: 0.3,
          } : null;
        })
        .filter((p): p is { position: [number, number, number]; radius: number } => p !== null);

      const apfTarget: APFTarget = { position: target.position };
      const force = computeTotalForce(
        fkResult.position,
        apfTarget,
        obstacles,
        otherRobotPositions,
        apfParameters
      );

      const jacobian = computeJacobian(model.dhParameters, pose.joints, model.basePosition);
      const jointVelocities = computeJointVelocityFromForce(force, jacobian, model.maxJointVelocities);

      const scaledDeltaTime = deltaTime * speedMultiplier;
      let newJoints = pose.joints.map((joint, i) => {
        let newJoint = joint + jointVelocities[i] * apfParameters.gain * scaledDeltaTime * 60;
        newJoint = clampJointAngle(newJoint, model.jointLimits[i].min, model.jointLimits[i].max);
        return newJoint;
      });

      if (!checkJointLimits(newJoints, model.jointLimits)) {
        newJoints = newJoints.map((j, i) =>
          clampJointAngle(j, model.jointLimits[i].min, model.jointLimits[i].max)
        );
      }

      const newFKResult = forwardKinematics(model.dhParameters, newJoints, model.basePosition);

      const newJointStates = newJoints.map((j, i) => ({
        position: j,
        velocity: (j - pose.joints[i]) / deltaTime,
        effort: 0,
      }));

      const newPose: RobotPose = {
        robotId: model.id,
        timestamp: Date.now(),
        frameNumber: frameNumber + 1,
        joints: newJoints,
        jointStates: newJointStates,
        endEffector: {
          position: newFKResult.position,
          orientation: newFKResult.orientation,
        },
      };

      newPoses.set(model.id, newPose);
      robotEndPositions.push({ position: newFKResult.position, radius: 0.3 });

      const linkOBBs: OBB[] = [];
      for (let i = 0; i < newFKResult.linkTransforms.length - 1; i++) {
        linkOBBs.push(createOBBFromLink(newFKResult.linkTransforms[i + 1], model.linkDimensions[i]));
      }
      allLinkOBBs.push(linkOBBs);

      const masterFrame = createDataFrame(model.id, frameNumber + 1, newJoints, Date.now());
      const monitorFrame = createDataFrame(model.id, frameNumber + 1, newJoints.map(j => j + (Math.random() - 0.5) * 0.0001), Date.now() + Math.random() * 5);

      state.dataAlignmentBuffer.addMasterFrame(masterFrame);
      state.dataAlignmentBuffer.addMonitorFrame(monitorFrame);
    }

    const collisionWarnings = checkAllCollisions(allLinkOBBs, obstacles, robotModels);

    const alignedPair = state.dataAlignmentBuffer.getLatestAlignedPair();
    const isDataAligned = alignedPair ? alignedPair.isAligned : true;
    const maxDeviation = alignedPair ? alignedPair.maxDeviation : 0;

    const now = Date.now();
    if (now - this.lastSnapshotTime >= this.snapshotInterval) {
      for (const [robotId, pose] of newPoses) {
        const hasWarning = collisionWarnings.some(w => w.robotId === robotId);
        const warning = collisionWarnings.find(w => w.robotId === robotId);
        robotDB.queueSnapshot({
          robotId,
          timestamp: now,
          pose,
          simulationTime: simulationTime + deltaTime * speedMultiplier,
          collisionWarning: hasWarning,
          warningLevel: warning?.level || 'safe',
        });
      }
      this.lastSnapshotTime = now;
    }

    useSimulationStore.setState({
      robotPoses: newPoses,
      collisionWarnings,
      isDataAligned,
      maxDeviation,
      frameNumber: frameNumber + 1,
      simulationTime: simulationTime + deltaTime * speedMultiplier,
      fps: Math.round(1 / deltaTime),
    });
  }

  getIsRunning(): boolean {
    return this.isRunning;
  }
}

export const simulationEngine = new SimulationEngine();
