import { createConflictDetector } from '../utils/pathfinding/conflictDetector';
import type { WorkerMessage, ConflictDetectionRequest, ConflictDetectionResult } from '../types';

interface PendingRequest {
  id: string;
  startTime: number;
  callback: (result: ConflictDetectionResult) => void;
}

class ConflictDetectionWorker {
  private worker: Worker | null = null;
  private pendingRequests = new Map<string, PendingRequest>();

  init(): void {
    if (this.worker) return;
    
    const workerCode = `
      import { createConflictDetector } from '${new URL('../utils/pathfinding/conflictDetector.ts', import.meta.url).href}';
      
      const detector = createConflictDetector();
      
      self.onmessage = function(e) {
        const { type, payload, requestId, timestamp } = e.data;
        
        if (type === 'DETECT_CONFLICTS') {
          const startTime = performance.now();
          
          try {
            const alerts = detector.detectConflicts(
              payload.equipmentStates,
              payload.commands
            );
            
            const processingTime = performance.now() - startTime;
            
            self.postMessage({
              type: 'CONFLICT_RESULT',
              payload: {
                requestId,
                alerts,
                processingTime,
              },
            });
          } catch (error) {
            const processingTime = performance.now() - startTime;
            
            self.postMessage({
              type: 'CONFLICT_RESULT',
              payload: {
                requestId,
                alerts: [],
                processingTime,
              },
            });
          }
        }
      };
    `;
    
    const blob = new Blob([workerCode], { type: 'application/javascript' });
    const url = URL.createObjectURL(blob);
    this.worker = new Worker(url);
    
    this.worker.onmessage = (e) => {
      const { type, payload } = e.data;
      
      if (type === 'CONFLICT_RESULT') {
        const result = payload as ConflictDetectionResult;
        const pending = this.pendingRequests.get(result.requestId);
        if (pending) {
          pending.callback(result);
          this.pendingRequests.delete(result.requestId);
        }
      }
    };
    
    this.worker.onerror = (error) => {
      console.error('ConflictDetectionWorker error:', error);
    };
  }

  async detectConflicts(request: ConflictDetectionRequest): Promise<ConflictDetectionResult> {
    this.init();
    
    const requestId = `conflict_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    return new Promise((resolve) => {
      this.pendingRequests.set(requestId, {
        id: requestId,
        startTime: performance.now(),
        callback: resolve,
      });
      
      this.worker!.postMessage({
        type: 'DETECT_CONFLICTS',
        payload: request,
        requestId,
        timestamp: Date.now(),
      });
      
      setTimeout(() => {
        const pending = this.pendingRequests.get(requestId);
        if (pending) {
          resolve({
            requestId,
            alerts: [],
            processingTime: performance.now() - pending.startTime,
          });
          this.pendingRequests.delete(requestId);
        }
      }, 2000);
    });
  }

  terminate(): void {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
    this.pendingRequests.clear();
  }
}

export const conflictDetectionWorker = new ConflictDetectionWorker();
