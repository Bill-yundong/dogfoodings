import { BiometricHash, AccessEvent, SecurityNode, AlignmentResult } from '@/types/security';
import { BiometricHasher } from './biometricHash';

export class AccessController {
  private authorizedHashes: Map<string, BiometricHash> = new Map();
  private accessLog: AccessEvent[] = [];
  private securityLevels: Map<string, number> = new Map();

  registerAuthorizedUser(hash: BiometricHash, requiredLevel: number = 1): void {
    this.authorizedHashes.set(hash.userId, hash);
    this.securityLevels.set(hash.userId, requiredLevel);
  }

  async verifyAccess(
    biometricHash: BiometricHash,
    node: SecurityNode
  ): Promise<AccessEvent> {
    const startTime = performance.now();
    
    const storedHash = this.authorizedHashes.get(biometricHash.userId);
    
    if (!storedHash) {
      return this.createAccessEvent(
        biometricHash.nodeId,
        biometricHash.userId,
        biometricHash,
        'denied',
        '未授权用户',
        performance.now() - startTime
      );
    }

    const requiredLevel = this.securityLevels.get(biometricHash.userId) || 1;
    if (node.level > requiredLevel) {
      return this.createAccessEvent(
        biometricHash.nodeId,
        biometricHash.userId,
        biometricHash,
        'denied',
        '安全级别不足',
        performance.now() - startTime
      );
    }

    const verification = BiometricHasher.fastMatch(biometricHash, [storedHash]);
    
    const result = verification.match ? 'granted' : 'denied';
    const reason = verification.match ? undefined : '生物特征验证失败';

    const event = this.createAccessEvent(
      biometricHash.nodeId,
      biometricHash.userId,
      biometricHash,
      result,
      reason,
      performance.now() - startTime + verification.latency
    );

    this.accessLog.push(event);
    return event;
  }

  private createAccessEvent(
    nodeId: string,
    userId: string,
    biometricHash: BiometricHash,
    result: AccessEvent['result'],
    reason: string | undefined,
    latency: number
  ): AccessEvent {
    return {
      id: `event-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
      nodeId,
      userId,
      biometricHash,
      timestamp: Date.now(),
      result,
      reason,
      alignmentLatency: latency,
    };
  }

  getRecentEvents(limit: number = 100): AccessEvent[] {
    return this.accessLog.slice(-limit).reverse();
  }

  clearEvents(): void {
    this.accessLog = [];
  }
}

export class MillisecondAligner {
  private static readonly TOLERANCE_MS = 50;
  private static readonly SYNC_THRESHOLD = 0.9;

  static async alignAcrossNodes(
    sourceHash: BiometricHash,
    targetNodes: SecurityNode[],
    onProgress?: (nodeId: string, progress: number) => void
  ): Promise<AlignmentResult> {
    const startTime = performance.now();
    const alignments: Promise<boolean>[] = [];

    for (const node of targetNodes) {
      alignments.push(
        this.alignSingleNode(sourceHash, node, () => {
          onProgress?.(node.id, (alignments.filter(p => p).length / targetNodes.length) * 100);
        })
      );
    }

    const results = await Promise.all(alignments);
    const successCount = results.filter(Boolean).length;
    const successRate = successCount / targetNodes.length;

    return {
      success: successRate >= this.SYNC_THRESHOLD,
      latency: performance.now() - startTime,
      sourceNode: sourceHash.nodeId,
      targetNodes: targetNodes.map(n => n.id),
      timestamp: Date.now(),
      confidence: successRate,
    };
  }

  private static async alignSingleNode(
    hash: BiometricHash,
    node: SecurityNode,
    onComplete: () => void
  ): Promise<boolean> {
    await new Promise(resolve => setTimeout(resolve, Math.random() * 10 + node.latency));
    
    const timeDiff = Math.abs(Date.now() - hash.timestamp);
    const isAligned = timeDiff <= this.TOLERANCE_MS && node.status === 'online';
    
    onComplete();
    return isAligned;
  }

  static getNetworkTime(): number {
    return performance.timeOrigin + performance.now();
  }

  static calculateClockDrift(localTime: number, networkTime: number): number {
    return Math.abs(localTime - networkTime);
  }
}
