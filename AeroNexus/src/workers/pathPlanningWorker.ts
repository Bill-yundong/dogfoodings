import { createPathPlanner } from '../utils/pathfinding/pathPlanner';
import type { WorkerMessage, PathPlanningRequest, PathPlanningResult } from '../types';

interface PendingRequest {
  id: string;
  startTime: number;
  callback: (result: PathPlanningResult) => void;
}

class PathPlanningWorker {
  private worker: Worker | null = null;
  private pendingRequests = new Map<string, PendingRequest>();

  init(): void {
    if (this.worker) return;
    
    const workerCode = `
      import { createPathPlanner } from '${new URL('../utils/pathfinding/pathPlanner.ts', import.meta.url).href}';
      
      const planners = new Map();
      
      function getPlanner(equipmentType) {
        if (!planners.has(equipmentType)) {
          planners.set(equipmentType, createPathPlanner(equipmentType));
        }
        return planners.get(equipmentType);
      }
      
      self.onmessage = function(e) {
        const { type, payload, requestId, timestamp } = e.data;
        
        if (type === 'PLAN_PATH') {
          const { equipmentType, startPosition, targetPosition, obstacles, constraints } = payload;
          
          try {
            const planner = getPlanner(equipmentType);
            const path = planner.planPath(startPosition, targetPosition, obstacles);
            
            if (path) {
              const duration = path[path.length - 1]?.t || 0;
              let distance = 0;
              for (let i = 1; i < path.length; i++) {
                const dx = path[i].x - path[i-1].x;
                const dy = path[i].y - path[i-1].y;
                distance += Math.sqrt(dx * dx + dy * dy);
              }
              
              self.postMessage({
                type: 'PATH_RESULT',
                payload: {
                  requestId,
                  equipmentId: payload.equipmentId,
                  path,
                  duration,
                  distance,
                  success: true,
                },
              });
            } else {
              self.postMessage({
                type: 'PATH_RESULT',
                payload: {
                  requestId,
                  equipmentId: payload.equipmentId,
                  path: [],
                  duration: 0,
                  distance: 0,
                  success: false,
                  error: 'No valid path found',
                },
              });
            }
          } catch (error) {
            self.postMessage({
              type: 'PATH_RESULT',
              payload: {
                requestId,
                equipmentId: payload.equipmentId,
                path: [],
                duration: 0,
                distance: 0,
                success: false,
                error: error.message,
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
      
      if (type === 'PATH_RESULT') {
        const result = payload as PathPlanningResult;
        const pending = this.pendingRequests.get(result.requestId);
        if (pending) {
          pending.callback(result);
          this.pendingRequests.delete(result.requestId);
        }
      }
    };
    
    this.worker.onerror = (error) => {
      console.error('PathPlanningWorker error:', error);
    };
  }

  async planPath(request: PathPlanningRequest): Promise<PathPlanningResult> {
    this.init();
    
    const requestId = `path_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    return new Promise((resolve) => {
      this.pendingRequests.set(requestId, {
        id: requestId,
        startTime: performance.now(),
        callback: resolve,
      });
      
      this.worker!.postMessage({
        type: 'PLAN_PATH',
        payload: {
          ...request,
          equipmentType: request.equipmentId.split('_')[0] || 'tug',
        },
        requestId,
        timestamp: Date.now(),
      });
      
      setTimeout(() => {
        const pending = this.pendingRequests.get(requestId);
        if (pending) {
          resolve({
            requestId,
            equipmentId: request.equipmentId,
            path: [],
            duration: 0,
            distance: 0,
            success: false,
            error: 'Timeout',
          });
          this.pendingRequests.delete(requestId);
        }
      }, 5000);
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

export const pathPlanningWorker = new PathPlanningWorker();
