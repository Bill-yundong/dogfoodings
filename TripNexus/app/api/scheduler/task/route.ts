import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import type { AlgorithmType, OptimizationGoal } from '@/lib/tsp/types';
import type { Location, TransportMode, TSPSolveRequest } from '@/lib/types';
import type { TaskPriority, MultiVariableScanConfig } from '@/lib/scheduler/types';

const taskRequestSchema = z.object({
  type: z.enum(['optimization', 'multi_variable_scan']),
  locations: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      coordinates: z.object({
        lat: z.number(),
        lng: z.number(),
      }),
    })
  ).min(2),
  algorithm: z.enum(['nearest_neighbor', 'genetic', 'simulated_annealing', 'ant_colony']).optional(),
  optimizationGoal: z.enum(['distance', 'time', 'cost', 'balanced']).optional(),
  transportMode: z.enum(['driving', 'transit', 'walking', 'cycling']),
  priority: z.enum(['high', 'medium', 'low']).optional(),
  scanConfig: z.object({
    algorithms: z.array(z.string()).optional(),
    goals: z.array(z.string()).optional(),
    transportModes: z.array(z.string()).optional(),
    compareCount: z.number().optional(),
  }).optional(),
});

interface TaskStoreItem {
  id: string;
  status: 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  progressMessage?: string;
  result?: any;
  error?: string;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
}

const taskStore = (globalThis as any)._taskStore || new Map<string, TaskStoreItem>();
(globalThis as any)._taskStore = taskStore;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = taskRequestSchema.parse(body);
    
    const taskId = uuidv4();
    const task = {
      id: taskId,
      status: 'queued' as const,
      progress: 0,
      createdAt: new Date(),
      data: {
        type: validated.type,
        locations: validated.locations,
        algorithm: validated.algorithm,
        optimizationGoal: validated.optimizationGoal,
        transportMode: validated.transportMode,
        priority: validated.priority || 'medium',
        scanConfig: validated.scanConfig,
      },
    };
    
    taskStore.set(taskId, {
      id: taskId,
      status: 'queued',
      progress: 0,
      createdAt: new Date(),
    });
    
    processTask(taskId, task.data);
    
    return NextResponse.json({
      success: true,
      data: {
        taskId,
        status: 'queued',
        message: '任务已提交到调度队列',
        pollUrl: `/api/scheduler/task/${taskId}`,
      },
    }, { status: 202 });
    
  } catch (error) {
    console.error('[API] 任务提交失败:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: '参数验证失败',
          details: error.errors,
        },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '任务提交失败',
      },
      { status: 500 }
    );
  }
}

async function processTask(taskId: string, data: any) {
  const task = taskStore.get(taskId);
  if (!task) return;
  
  task.status = 'running';
  task.startedAt = new Date();
  taskStore.set(taskId, task);
  
  try {
    if (data.type === 'optimization') {
      await simulateOptimization(taskId, data);
    } else if (data.type === 'multi_variable_scan') {
      await simulateMultiVariableScan(taskId, data);
    }
    
    task.status = 'completed';
    task.completedAt = new Date();
    task.progress = 100;
    taskStore.set(taskId, task);
    
  } catch (error) {
    task.status = 'failed';
    task.error = error instanceof Error ? error.message : '任务执行失败';
    task.completedAt = new Date();
    taskStore.set(taskId, task);
  }
}

async function simulateOptimization(taskId: string, data: any) {
  const { TSPOptimizer } = await import('@/lib/tsp');
  
  const request: TSPSolveRequest = {
    locations: data.locations as Location[],
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    transportMode: data.transportMode as TransportMode,
    algorithm: data.algorithm as AlgorithmType,
    optimizationGoal: data.optimizationGoal as OptimizationGoal,
    constraints: {
      dailyHours: { start: '09:00', end: '18:00' },
      maxDailyDistance: 500000,
      avoidTolls: false,
    },
  };
  
  const optimizer = new TSPOptimizer(request);
  
  for (let i = 0; i <= 90; i += 10) {
    await new Promise(resolve => setTimeout(resolve, 100));
    const task = taskStore.get(taskId);
    if (task) {
      task.progress = i;
      taskStore.set(taskId, task);
    }
  }
  
  const result = await optimizer.optimize();
  
  const task = taskStore.get(taskId);
  if (task) {
    task.result = result;
    taskStore.set(taskId, task);
  }
}

async function simulateMultiVariableScan(taskId: string, data: any) {
  const { TSPOptimizer } = await import('@/lib/tsp');
  
  const algorithms = data.scanConfig?.algorithms || ['nearest_neighbor', 'genetic'];
  const goals = data.scanConfig?.goals || ['distance', 'time', 'balanced'];
  const results: any[] = [];
  
  const totalSteps = algorithms.length * goals.length;
  let completedSteps = 0;
  
  for (const algo of algorithms) {
    for (const goal of goals) {
      const request: TSPSolveRequest = {
        locations: data.locations as Location[],
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0],
        transportMode: data.transportMode as TransportMode,
        algorithm: algo as AlgorithmType,
        optimizationGoal: goal as OptimizationGoal,
        constraints: {
          dailyHours: { start: '09:00', end: '18:00' },
          maxDailyDistance: 500000,
          avoidTolls: false,
        },
      };
      
      const optimizer = new TSPOptimizer(request);
      const result = await optimizer.optimize();
      
      results.push({
        algorithm: algo,
        goal,
        result,
      });
      
      completedSteps++;
      const task = taskStore.get(taskId);
      if (task) {
        task.progress = Math.round((completedSteps / totalSteps) * 90);
        taskStore.set(taskId, task);
      }
    }
  }
  
  const task = taskStore.get(taskId);
  if (task) {
    task.result = {
      totalScans: results.length,
      bestResult: results.reduce((best, curr) => 
        curr.result.fitnessScore < best.result.fitnessScore ? curr : best
      ),
      allResults: results,
    };
    taskStore.set(taskId, task);
  }
}

export async function GET() {
  const tasks = Array.from(taskStore.values() as IterableIterator<TaskStoreItem>).map((t) => ({
    id: t.id,
    status: t.status,
    progress: t.progress,
    createdAt: t.createdAt,
    startedAt: t.startedAt,
    completedAt: t.completedAt,
    error: t.error,
  }));
  
  return NextResponse.json({
    success: true,
    data: tasks,
  });
}
