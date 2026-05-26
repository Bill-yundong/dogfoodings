import type {
  PassengerAgent,
  TerminalLayout,
  SimulationEvent,
  CompactAgentState,
  SimulationMetrics,
  FlowSnapshot,
  FlightWave,
  SocialForceParams,
  WorkerControlMessage,
  WorkerUpdateMessage,
  EventType,
  AgentStatus,
  Queue,
} from '@/types';
import { TYPE_CODE, STATUS_CODE } from '@/types';
import { SocialForceEngine } from '@/lib/simulation/social-force-engine';
import { EventScheduler, generatePoissonArrivals } from '@/lib/simulation/event-scheduler';
import { QueueManager } from '@/lib/simulation/queueing-theory';
import { createDefaultTerminalLayout, getFacilityById } from '@/lib/simulation/terminal-layout';
import {
  createPassengerAgent,
  assignNextTarget,
  hasReachedTarget,
  updatePatience,
  getExpectedServiceTime,
  generatePassengerType,
  generateFlightId,
} from '@/lib/simulation/agent-behavior';

const FIXED_DT = 0.016;
const MAX_AGENTS = 2000;
const SNAPSHOT_INTERVAL = 5000;

class SimulationWorker {
  private layout: TerminalLayout;
  private socialForce: SocialForceEngine;
  private scheduler: EventScheduler;
  private queueManager: QueueManager;
  private agents: Map<string, PassengerAgent>;
  private agentIdToIndex: Map<string, number>;
  private isRunning: boolean;
  private isPaused: boolean;
  private speedMultiplier: number;
  private simulationTime: number;
  private realTime: number;
  private lastFrameTime: number;
  private accumulator: number;
  private currentWave: FlightWave | null;
  private pendingArrivals: Array<{ time: number; count: number }>;
  private lastSnapshotTime: number;
  private frameCount: number;
  private fpsUpdateTime: number;
  private currentFps: number;
  private totalServed: number;
  private waitTimes: Record<string, number[]>;

  constructor() {
    this.layout = createDefaultTerminalLayout();
    this.socialForce = new SocialForceEngine();
    this.socialForce.setLayout(this.layout);
    this.scheduler = new EventScheduler();
    this.queueManager = new QueueManager();
    this.agents = new Map();
    this.agentIdToIndex = new Map();
    this.isRunning = false;
    this.isPaused = false;
    this.speedMultiplier = 1;
    this.simulationTime = 0;
    this.realTime = 0;
    this.lastFrameTime = 0;
    this.accumulator = 0;
    this.currentWave = null;
    this.pendingArrivals = [];
    this.lastSnapshotTime = 0;
    this.frameCount = 0;
    this.fpsUpdateTime = 0;
    this.currentFps = 60;
    this.totalServed = 0;
    this.waitTimes = {};

    this.initializeQueues();
    this.setupEventHandlers();
  }

  private initializeQueues(): void {
    this.queueManager.createQueue(
      'queue_checkin_a',
      '值机队列 A',
      'checkin',
      3,
      0.5,
      50
    );
    this.queueManager.createQueue(
      'queue_checkin_b',
      '值机队列 B',
      'checkin',
      3,
      0.5,
      50
    );
    this.queueManager.createQueue(
      'queue_security_a',
      '安检队列 A',
      'security',
      2,
      0.8,
      40
    );
    this.queueManager.createQueue(
      'queue_security_b',
      '安检队列 B',
      'security',
      1,
      0.8,
      40
    );
  }

  private setupEventHandlers(): void {
    this.scheduler.on('ARRIVAL', (e) => this.handleArrival(e));
    this.scheduler.on('CHECKIN_START', (e) => this.handleCheckinStart(e));
    this.scheduler.on('CHECKIN_END', (e) => this.handleCheckinEnd(e));
    this.scheduler.on('SECURITY_ENTER', (e) => this.handleSecurityEnter(e));
    this.scheduler.on('SECURITY_EXIT', (e) => this.handleSecurityExit(e));
    this.scheduler.on('SHOP_ENTER', (e) => this.handleShopEnter(e));
    this.scheduler.on('SHOP_EXIT', (e) => this.handleShopExit(e));
    this.scheduler.on('GATE_REACHED', (e) => this.handleGateReached(e));
    this.scheduler.on('BOARDING_CALL', (e) => this.handleBoardingCall(e));
    this.scheduler.on('BOARDING_COMPLETE', (e) => this.handleBoardingComplete(e));
  }

  private handleArrival(event: SimulationEvent): void {
    const count = (event.data?.count as number) || 1;
    const flightId = (event.data?.flightId as string) || generateFlightId();
    const boardingTime = event.timestamp + 1800 + Math.random() * 1200;

    for (let i = 0; i < count; i++) {
      if (this.agents.size >= MAX_AGENTS) break;

      const type = generatePassengerType();
      const agent = createPassengerAgent(
        type,
        this.layout,
        flightId,
        boardingTime,
        event.timestamp
      );

      this.agents.set(agent.id, agent);
      this.agentIdToIndex.set(agent.id, this.agentIdToIndex.size);
      this.socialForce.addAgent(agent);

      assignNextTarget(agent, this.layout, event.timestamp);

      if (agent.status === 'in_checkin_queue' && agent.targetFacilityId) {
        const facility = getFacilityById(this.layout, agent.targetFacilityId);
        if (facility?.queueId) {
          this.queueManager.enqueue(facility.queueId, agent.id);
        }
      } else if (agent.status === 'in_security_queue' && agent.targetFacilityId) {
        const facility = getFacilityById(this.layout, agent.targetFacilityId);
        if (facility?.queueId) {
          this.queueManager.enqueue(facility.queueId, agent.id);
        }
      }
    }
  }

  private handleCheckinStart(event: SimulationEvent): void {
    const agent = this.agents.get(event.passengerId);
    if (!agent) return;

    agent.status = 'at_checkin';
    agent.checkinStartTime = event.timestamp;

    const serviceTime = getExpectedServiceTime(agent, 'checkin_counter');
    this.scheduler.scheduleAt(
      'CHECKIN_END',
      event.timestamp + serviceTime,
      agent.id
    );
  }

  private handleCheckinEnd(event: SimulationEvent): void {
    const agent = this.agents.get(event.passengerId);
    if (!agent) return;

    for (const queue of this.queueManager.getAllQueues()) {
      if (queue.type === 'checkin') {
        const idx = queue.waitingLine.indexOf(agent.id);
        if (idx !== -1) {
          queue.waitingLine.splice(idx, 1);
        }
        for (const server of queue.servers) {
          if (server.currentPassenger === agent.id) {
            this.queueManager.completeService(queue.id, queue.servers.indexOf(server), event.timestamp);
          }
        }
      }
    }

    const waitTime = event.timestamp - agent.checkinStartTime;
    this.recordWaitTime('checkin', waitTime);
    this.totalServed++;

    assignNextTarget(agent, this.layout, event.timestamp);

    if (agent.status === 'in_security_queue' && agent.targetFacilityId) {
      const facility = getFacilityById(this.layout, agent.targetFacilityId);
      if (facility?.queueId) {
        this.queueManager.enqueue(facility.queueId, agent.id);
      }
    }
  }

  private handleSecurityEnter(event: SimulationEvent): void {
    const agent = this.agents.get(event.passengerId);
    if (!agent) return;

    agent.status = 'at_security';
    agent.securityStartTime = event.timestamp;

    const serviceTime = getExpectedServiceTime(agent, 'security_channel');
    this.scheduler.scheduleAt(
      'SECURITY_EXIT',
      event.timestamp + serviceTime,
      agent.id
    );
  }

  private handleSecurityExit(event: SimulationEvent): void {
    const agent = this.agents.get(event.passengerId);
    if (!agent) return;

    for (const queue of this.queueManager.getAllQueues()) {
      if (queue.type === 'security') {
        const idx = queue.waitingLine.indexOf(agent.id);
        if (idx !== -1) {
          queue.waitingLine.splice(idx, 1);
        }
        for (const server of queue.servers) {
          if (server.currentPassenger === agent.id) {
            this.queueManager.completeService(queue.id, queue.servers.indexOf(server), event.timestamp);
          }
        }
      }
    }

    const waitTime = event.timestamp - agent.securityStartTime;
    this.recordWaitTime('security', waitTime);
    this.totalServed++;

    agent.status = 'walking';
    assignNextTarget(agent, this.layout, event.timestamp);
  }

  private handleShopEnter(event: SimulationEvent): void {
    const agent = this.agents.get(event.passengerId);
    if (!agent) return;

    agent.status = 'shopping';
    agent.shoppingStartTime = event.timestamp;
    agent.visitedShops.push(agent.targetFacilityId || '');

    const serviceTime = getExpectedServiceTime(agent, 'shop');
    this.scheduler.scheduleAt(
      'SHOP_EXIT',
      event.timestamp + serviceTime,
      agent.id
    );
  }

  private handleShopExit(event: SimulationEvent): void {
    const agent = this.agents.get(event.passengerId);
    if (!agent) return;

    const waitTime = event.timestamp - agent.shoppingStartTime;
    this.recordWaitTime('shopping', waitTime);

    agent.status = 'walking';
    assignNextTarget(agent, this.layout, event.timestamp);
  }

  private handleGateReached(event: SimulationEvent): void {
    const agent = this.agents.get(event.passengerId);
    if (!agent) return;

    agent.status = 'waiting_gate';
    agent.target = null;

    const timeUntilBoarding = agent.boardingTime - event.timestamp;
    if (timeUntilBoarding > 0) {
      this.scheduler.scheduleAt(
        'BOARDING_CALL',
        agent.boardingTime,
        agent.id
      );
    } else {
      this.scheduler.scheduleAt(
        'BOARDING_CALL',
        event.timestamp + 10,
        agent.id
      );
    }
  }

  private handleBoardingCall(event: SimulationEvent): void {
    const agent = this.agents.get(event.passengerId);
    if (!agent) return;

    agent.status = 'boarding';
    assignNextTarget(agent, this.layout, event.timestamp);

    this.scheduler.scheduleAt(
      'BOARDING_COMPLETE',
      event.timestamp + 60,
      agent.id
    );
  }

  private handleBoardingComplete(event: SimulationEvent): void {
    const agent = this.agents.get(event.passengerId);
    if (!agent) return;

    agent.status = 'exited';
    agent.target = null;
    agent.velocity = { x: 0, y: 0 };

    const totalTime = event.timestamp - agent.arrivalTime;
    this.recordWaitTime('total', totalTime);
  }

  private recordWaitTime(type: string, time: number): void {
    if (!this.waitTimes[type]) {
      this.waitTimes[type] = [];
    }
    this.waitTimes[type].push(time);
    if (this.waitTimes[type].length > 100) {
      this.waitTimes[type].shift();
    }
  }

  private getAvgWaitTime(type: string): number {
    const times = this.waitTimes[type];
    if (!times || times.length === 0) return 0;
    return times.reduce((a, b) => a + b, 0) / times.length;
  }

  start(wave?: FlightWave): void {
    this.currentWave = wave || this.createDefaultWave();
    this.reset();

    this.pendingArrivals = generatePoissonArrivals(
      0.5,
      this.currentWave.endTime - this.currentWave.startTime,
      this.currentWave.startTime
    );

    for (const arrival of this.pendingArrivals) {
      this.scheduler.scheduleAt(
        'ARRIVAL',
        arrival.time,
        `batch_${arrival.time}`,
        { count: arrival.count, flightId: this.currentWave.flightIds[0] }
      );
    }

    for (let i = 0; i < 20; i++) {
      this.scheduler.scheduleAt(
        'ARRIVAL',
        i * 0.5,
        `initial_${i}`,
        { count: 1, flightId: this.currentWave.flightIds[0] }
      );
    }

    this.isRunning = true;
    this.isPaused = false;
    this.lastFrameTime = performance.now();
    setTimeout(this.loop, 16);
  }

  private createDefaultWave(): FlightWave {
    return {
      id: `wave_${Date.now()}`,
      name: '早高峰航班波',
      startTime: 0,
      endTime: 3600,
      expectedPassengers: 1500,
      flightIds: [generateFlightId(), generateFlightId()],
      createdAt: Date.now(),
    };
  }

  pause(): void {
    this.isPaused = true;
  }

  resume(): void {
    this.isPaused = false;
    this.lastFrameTime = performance.now();
    setTimeout(this.loop, 16);
  }

  reset(): void {
    this.agents.clear();
    this.agentIdToIndex.clear();
    this.socialForce.setAgents([]);
    this.scheduler.clear();
    this.queueManager.reset();
    this.simulationTime = 0;
    this.realTime = 0;
    this.accumulator = 0;
    this.lastFrameTime = 0;
    this.pendingArrivals = [];
    this.lastSnapshotTime = 0;
    this.totalServed = 0;
    this.waitTimes = {};
    this.isRunning = false;
    this.isPaused = false;

    for (const zone of this.layout.zones) {
      zone.currentCount = 0;
    }
  }

  setSpeed(speed: number): void {
    this.speedMultiplier = speed;
  }

  setParams(params: Partial<SocialForceParams>): void {
    this.socialForce.setParams(params);
  }

  private loop = (): void => {
    if (!this.isRunning || this.isPaused) return;

    const now = performance.now();
    let frameTime = (now - this.lastFrameTime) / 1000;
    this.lastFrameTime = now;

    if (frameTime > 0.25) frameTime = 0.25;

    this.accumulator += frameTime * this.speedMultiplier;

    while (this.accumulator >= FIXED_DT) {
      this.step(FIXED_DT);
      this.accumulator -= FIXED_DT;
    }

    this.frameCount++;
    if (now - this.fpsUpdateTime >= 1000) {
      this.currentFps = this.frameCount;
      this.frameCount = 0;
      this.fpsUpdateTime = now;
    }

    this.sendUpdate();

    if (now - this.lastSnapshotTime >= SNAPSHOT_INTERVAL) {
      this.createSnapshot();
      this.lastSnapshotTime = now;
    }

    setTimeout(this.loop, 16);
  };

  private step(dt: number): void {
    this.simulationTime += dt;
    this.realTime += dt;
    this.scheduler.setCurrentTime(this.simulationTime);

    this.scheduler.processNext(100, this.simulationTime);

    this.processQueues();

    this.processAgentTransitions();

    this.socialForce.update(dt);

    this.updatePatienceAll(dt);

    this.removeExitedAgents();
  }

  private processQueues(): void {
    for (const queue of this.queueManager.getAllQueues()) {
      let idleIdx: number;
      while ((idleIdx = this.queueManager.getIdleServerIndex(queue.id)) !== -1 &&
             queue.waitingLine.length > 0) {
        const passengerId = this.queueManager.dequeue(queue.id, idleIdx, this.simulationTime);
        if (passengerId) {
          const eventType: EventType = queue.type === 'checkin' ? 'CHECKIN_START' : 'SECURITY_ENTER';
          this.scheduler.schedule(eventType, 0, passengerId);
        }
      }
    }
  }

  private processAgentTransitions(): void {
    for (const agent of this.agents.values()) {
      if (agent.status === 'exited') continue;

      if (agent.status === 'walking' && hasReachedTarget(agent)) {
        if (agent.targetFacilityId?.startsWith('shop_')) {
          this.scheduler.schedule('SHOP_ENTER', 0, agent.id);
        } else if (agent.targetFacilityId?.startsWith('gate_')) {
          this.scheduler.schedule('GATE_REACHED', 0, agent.id);
        } else if (!agent.targetFacilityId) {
          assignNextTarget(agent, this.layout, this.simulationTime);
        }
      }
    }
  }

  private updatePatienceAll(dt: number): void {
    for (const agent of this.agents.values()) {
      const isWaiting =
        agent.status === 'in_checkin_queue' ||
        agent.status === 'in_security_queue' ||
        agent.status === 'waiting_gate';
      updatePatience(agent, dt, isWaiting);
    }
  }

  private removeExitedAgents(): void {
    for (const [id, agent] of this.agents) {
      if (agent.status === 'exited' && this.simulationTime - agent.arrivalTime > 60) {
        this.agents.delete(id);
        this.agentIdToIndex.delete(id);
        this.socialForce.removeAgent(id);
      }
    }
  }

  private sendUpdate(): void {
    const agents: CompactAgentState[] = [];

    for (const [id, agent] of this.agents) {
      if (agent.status === 'exited') continue;

      const idx = this.agentIdToIndex.get(id) || 0;
      agents.push({
        idIdx: idx,
        x: agent.position.x,
        y: agent.position.y,
        vx: agent.velocity.x,
        vy: agent.velocity.y,
        typeCode: TYPE_CODE[agent.type],
        statusCode: STATUS_CODE[agent.status],
      });
    }

    const metrics = this.computeMetrics();

    const message: WorkerUpdateMessage = {
      type: 'agent_states',
      agents,
      metrics,
      timestamp: performance.now(),
    };

    self.postMessage(message);
  }

  private computeMetrics(): SimulationMetrics {
    const queueLengths: Record<string, number> = {};
    for (const queue of this.queueManager.getAllQueues()) {
      queueLengths[queue.id] = queue.waitingLine.length;
    }

    const zoneCounts: Record<string, number> = {};
    const zoneDensities: Record<string, number> = {};
    for (const zone of this.layout.zones) {
      zoneCounts[zone.id] = zone.currentCount;
      const area = zone.polygon.length > 2 ?
        Math.abs(zone.polygon.reduce((acc, p, i) => {
          const j = (i + 1) % zone.polygon.length;
          return acc + p.x * zone.polygon[j].y - zone.polygon[j].x * p.y;
        }, 0)) / 2 : 100;
      zoneDensities[zone.id] = zone.currentCount / Math.max(area, 1);
    }

    const avgWaitTime: Record<string, number> = {
      checkin: this.getAvgWaitTime('checkin'),
      security: this.getAvgWaitTime('security'),
      shopping: this.getAvgWaitTime('shopping'),
      total: this.getAvgWaitTime('total'),
    };

    const bottlenecks: string[] = [];
    for (const queue of this.queueManager.getAllQueues()) {
      if (queue.waitingLine.length > queue.maxLength * 0.7) {
        bottlenecks.push(queue.id);
      }
    }
    for (const zone of this.layout.zones) {
      if (zone.currentCount > zone.capacity * 0.8) {
        bottlenecks.push(zone.id);
      }
    }

    const activeAgents = Array.from(this.agents.values()).filter(a => a.status !== 'exited').length;
    const completedAgents = this.totalServed;

    return {
      simulationTime: this.simulationTime,
      realTime: this.realTime,
      speedMultiplier: this.speedMultiplier,
      totalPassengers: this.currentWave?.expectedPassengers || 0,
      activePassengers: activeAgents,
      completedPassengers: completedAgents,
      throughput: this.realTime > 0 ? completedAgents / this.realTime * 60 : 0,
      avgTotalTime: avgWaitTime.total,
      avgWaitTime,
      queueLengths,
      zoneCounts,
      zoneDensities,
      bottlenecks,
      fps: this.currentFps,
    };
  }

  private createSnapshot(): void {
    if (!this.currentWave) return;

    const agentPositions = Array.from(this.agents.values())
      .filter(a => a.status !== 'exited')
      .map(a => ({
        id: a.id,
        x: a.position.x,
        y: a.position.y,
        type: a.type,
        status: a.status,
      }));

    const metrics = this.computeMetrics();

    const snapshot: FlowSnapshot = {
      id: `snap_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      waveId: this.currentWave.id,
      timestamp: Date.now(),
      simulationTime: this.simulationTime,
      passengerCount: metrics.activePassengers,
      zoneCounts: metrics.zoneCounts,
      zoneDensities: metrics.zoneDensities,
      queueLengths: metrics.queueLengths,
      averageWaitTimes: metrics.avgWaitTime,
      throughput: metrics.throughput,
      bottlenecks: metrics.bottlenecks,
      agentPositions,
    };

    const message: WorkerUpdateMessage = {
      type: 'snapshot',
      snapshot,
      timestamp: Date.now(),
    };

    self.postMessage(message);
  }

  handleMessage = (e: MessageEvent<WorkerControlMessage>): void => {
    const { type, data } = e.data;

    switch (type) {
      case 'init':
        this.reset();
        break;
      case 'start':
        if (this.isRunning && this.isPaused) {
          this.resume();
        } else {
          this.start(data?.wave as FlightWave);
        }
        break;
      case 'pause':
        this.pause();
        break;
      case 'reset':
        this.reset();
        break;
      case 'speed_change':
        this.setSpeed((data?.speed as number) || 1);
        break;
      case 'params_update':
        this.setParams(data as Partial<SocialForceParams>);
        break;
    }
  };
}

const worker = new SimulationWorker();
onmessage = worker.handleMessage;

export {};
