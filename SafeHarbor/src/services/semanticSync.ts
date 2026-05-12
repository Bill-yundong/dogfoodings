import { v4 as uuidv4 } from 'uuid';
import type { SemanticSyncMessage, AnchorStatus } from '../types';
import { db } from '../db';

const SEMANTIC_VERSION = '1.0.0';

const calculateSemanticHash = (payload: any, type: string): string => {
  const data = JSON.stringify({ payload, type, version: SEMANTIC_VERSION });
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16);
};

export class SemanticSynchronizer {
  private listeners: Map<string, (message: SemanticSyncMessage) => void> = new Map();
  private lastSyncTime: number = 0;

  createMessage(
    source: 'monitoring' | 'ship',
    type: 'status_update' | 'alert' | 'command' | 'acknowledgment',
    payload: any
  ): SemanticSyncMessage {
    return {
      id: uuidv4(),
      source,
      timestamp: Date.now(),
      type,
      payload,
      semanticHash: calculateSemanticHash(payload, type)
    };
  }

  validateMessage(message: SemanticSyncMessage): boolean {
    const expectedHash = calculateSemanticHash(message.payload, message.type);
    return message.semanticHash === expectedHash;
  }

  async sendMessage(message: SemanticSyncMessage): Promise<void> {
    if (!this.validateMessage(message)) {
      throw new Error('Invalid semantic hash');
    }
    await db.addSyncMessage(message);
    this.notifyListeners(message);
  }

  async receiveMessages(since?: number): Promise<SemanticSyncMessage[]> {
    const cutoff = since || this.lastSyncTime;
    const messages = await db.getSyncMessages(cutoff);
    this.lastSyncTime = Date.now();
    return messages.filter(msg => this.validateMessage(msg));
  }

  subscribe(id: string, callback: (message: SemanticSyncMessage) => void): void {
    this.listeners.set(id, callback);
  }

  unsubscribe(id: string): void {
    this.listeners.delete(id);
  }

  private notifyListeners(message: SemanticSyncMessage): void {
    this.listeners.forEach(callback => callback(message));
  }

  createAnchorStatusUpdate(shipId: string, status: AnchorStatus): SemanticSyncMessage {
    return this.createMessage('ship', 'status_update', {
      shipId,
      anchorStatus: status,
      syncTime: new Date().toISOString()
    });
  }

  createAlert(shipId: string, alertType: string, severity: string, description: string): SemanticSyncMessage {
    return this.createMessage('monitoring', 'alert', {
      shipId,
      alertType,
      severity,
      description,
      timestamp: Date.now()
    });
  }

  createCommand(targetShipId: string, command: string, parameters: any): SemanticSyncMessage {
    return this.createMessage('monitoring', 'command', {
      targetShipId,
      command,
      parameters,
      issuedAt: Date.now()
    });
  }

  createAcknowledgment(messageId: string): SemanticSyncMessage {
    return this.createMessage('ship', 'acknowledgment', {
      acknowledgedMessageId: messageId,
      receivedAt: Date.now()
    });
  }
}

export const semanticSynchronizer = new SemanticSynchronizer();

export const syncAnchorStatus = async (shipId: string, status: AnchorStatus): Promise<void> => {
  const message = semanticSynchronizer.createAnchorStatusUpdate(shipId, status);
  await semanticSynchronizer.sendMessage(message);
};

export const sendDragAlert = async (shipId: string, riskLevel: string): Promise<void> => {
  const message = semanticSynchronizer.createAlert(
    shipId,
    'DRAG_RISK',
    riskLevel,
    `船舶走锚风险等级: ${riskLevel}`
  );
  await semanticSynchronizer.sendMessage(message);
};

export const sendChainAdjustmentCommand = async (shipId: string, newScope: number): Promise<void> => {
  const message = semanticSynchronizer.createCommand(
    shipId,
    'ADJUST_CHAIN_SCOPE',
    { targetScope: newScope }
  );
  await semanticSynchronizer.sendMessage(message);
};
