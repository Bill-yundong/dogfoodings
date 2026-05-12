import { SecurityNode, BiometricHash, AccessEvent, Snapshot, AlignmentResult, SpaceConsistencyCheck } from '@/types/security';
import { BiometricHasher } from './biometricHash';
import { AccessController, MillisecondAligner } from './accessControl';
import { SpaceConsistencyDetector, AsyncImageRecognition, FrameData } from './spaceConsistency';
import { SnapshotStore } from './indexedDB';

export class SecurityHub {
  private accessController: AccessController;
  private spaceDetector: SpaceConsistencyDetector;
  private imageRecognition: AsyncImageRecognition;
  private snapshotStore: SnapshotStore;
  private nodes: Map<string, SecurityNode> = new Map();
  private authorizedUsers: Set<string> = new Set();
  private isInitialized: boolean = false;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private snapshotInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.accessController = new AccessController();
    this.spaceDetector = new SpaceConsistencyDetector();
    this.imageRecognition = new AsyncImageRecognition();
    this.snapshotStore = new SnapshotStore();
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    await this.snapshotStore.init();
    this.setupHeartbeatMonitor();
    this.setupAutomaticSnapshots();
    this.isInitialized = true;
  }

  private setupHeartbeatMonitor(): void {
    this.heartbeatInterval = setInterval(() => {
      for (const node of this.nodes.values()) {
        const timeSinceHeartbeat = Date.now() - node.lastHeartbeat;
        
        if (timeSinceHeartbeat > 30000 && node.status === 'online') {
          node.status = 'warning';
        } else if (timeSinceHeartbeat > 60000 && node.status === 'warning') {
          node.status = 'offline';
        }
        
        node.latency = Math.floor(Math.random() * 15) + 2;
      }
    }, 5000);
  }

  private setupAutomaticSnapshots(): void {
    this.snapshotInterval = setInterval(async () => {
      const nodes = Array.from(this.nodes.values());
      const events = this.accessController.getRecentEvents(50);
      await this.snapshotStore.createSnapshot(nodes, events);
    }, 60000);
  }

  registerNode(node: SecurityNode): void {
    this.nodes.set(node.id, node);
    this.snapshotStore.saveNode(node);
  }

  registerNodes(nodes: SecurityNode[]): void {
    for (const node of nodes) {
      this.nodes.set(node.id, node);
    }
    this.snapshotStore.saveNodes(nodes);
  }

  getNode(id: string): SecurityNode | undefined {
    return this.nodes.get(id);
  }

  getAllNodes(): SecurityNode[] {
    return Array.from(this.nodes.values());
  }

  updateNodeHeartbeat(nodeId: string): void {
    const node = this.nodes.get(nodeId);
    if (node) {
      node.lastHeartbeat = Date.now();
      node.status = 'online';
    }
  }

  registerAuthorizedUser(hash: BiometricHash, securityLevel: number = 1): void {
    this.accessController.registerAuthorizedUser(hash, securityLevel);
    this.authorizedUsers.add(hash.userId);
  }

  async processAccessRequest(
    biometricData: string,
    hashType: BiometricHash['hashType'],
    userId: string,
    nodeId: string
  ): Promise<AccessEvent> {
    const node = this.nodes.get(nodeId);
    if (!node) {
      throw new Error('Security node not found');
    }

    const hash = BiometricHasher.generateHash(biometricData, hashType, userId, nodeId);
    const event = await this.accessController.verifyAccess(hash, node);

    await this.snapshotStore.saveEvent(event);

    if (event.result === 'granted') {
      await this.performPostAccessChecks(hash, node);
    }

    return event;
  }

  private async performPostAccessChecks(hash: BiometricHash, node: SecurityNode): Promise<void> {
    const relatedNodes = this.getRelatedNodes(node);
    if (relatedNodes.length > 0) {
      await MillisecondAligner.alignAcrossNodes(hash, relatedNodes);
    }

    const cameraNodes = relatedNodes.filter(n => n.type === 'camera');
    if (cameraNodes.length > 0) {
      const imageData = new Map<string, string>();
      cameraNodes.forEach(n => imageData.set(n.id, `camera-data-${n.id}-${Date.now()}`));
      
      await this.imageRecognition.batchRecognize(cameraNodes, imageData);
      await this.spaceDetector.processMultiNodeFrames(cameraNodes, async (node) => ({
        id: `frame-${Date.now()}`,
        timestamp: Date.now(),
        nodeId: node.id,
        features: Array(128).fill(0).map(() => Math.random()),
        confidence: 0.9,
      }));
    }
  }

  private getRelatedNodes(node: SecurityNode): SecurityNode[] {
    const nearbyLevel = node.level;
    return Array.from(this.nodes.values()).filter(n => 
      n.id !== node.id && 
      Math.abs(n.level - nearbyLevel) <= 1 &&
      n.status === 'online'
    );
  }

  async alignBiometricData(
    sourceHash: BiometricHash,
    targetNodeIds: string[]
  ): Promise<AlignmentResult> {
    const targetNodes = targetNodeIds
      .map(id => this.nodes.get(id))
      .filter((n): n is SecurityNode => n !== undefined);

    return MillisecondAligner.alignAcrossNodes(sourceHash, targetNodes);
  }

  async checkSpatialConsistency(nodeIds: string[]): Promise<SpaceConsistencyCheck> {
    const nodes = nodeIds
      .map(id => this.nodes.get(id))
      .filter((n): n is SecurityNode => n !== undefined);

    return this.spaceDetector.processMultiNodeFrames(nodes, async (node) => ({
      id: `frame-${Date.now()}-${node.id}`,
      timestamp: Date.now(),
      nodeId: node.id,
      features: Array(128).fill(0).map(() => Math.random()),
      confidence: 0.85 + Math.random() * 0.14,
    }));
  }

  getRecentAccessEvents(limit: number = 50): AccessEvent[] {
    return this.accessController.getRecentEvents(limit);
  }

  getRecentConsistencyChecks(limit: number = 20): SpaceConsistencyCheck[] {
    return this.spaceDetector.getRecentChecks(limit);
  }

  async createManualSnapshot(): Promise<Snapshot> {
    const nodes = Array.from(this.nodes.values());
    const events = this.accessController.getRecentEvents(100);
    return this.snapshotStore.createSnapshot(nodes, events);
  }

  async getRecentSnapshots(limit: number = 10): Promise<Snapshot[]> {
    return this.snapshotStore.getRecentSnapshots(limit);
  }

  async getSystemStats(): Promise<{
    totalNodes: number;
    onlineNodes: number;
    offlineNodes: number;
    warningNodes: number;
    authorizedUsers: number;
    accessEventsToday: number;
    avgLatency: number;
  }> {
    const nodes = Array.from(this.nodes.values());
    const events = this.getRecentAccessEvents(1000);
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayEvents = events.filter(e => e.timestamp >= today.getTime());

    const avgLatency = nodes.length > 0
      ? nodes.reduce((sum, n) => sum + n.latency, 0) / nodes.length
      : 0;

    return {
      totalNodes: nodes.length,
      onlineNodes: nodes.filter(n => n.status === 'online').length,
      offlineNodes: nodes.filter(n => n.status === 'offline').length,
      warningNodes: nodes.filter(n => n.status === 'warning').length,
      authorizedUsers: this.authorizedUsers.size,
      accessEventsToday: todayEvents.length,
      avgLatency: Math.round(avgLatency * 100) / 100,
    };
  }

  destroy(): void {
    if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);
    if (this.snapshotInterval) clearInterval(this.snapshotInterval);
    this.spaceDetector.clearBuffer();
    this.imageRecognition.clearResults();
    this.snapshotStore.close();
    this.isInitialized = false;
  }
}

export const securityHub = new SecurityHub();
