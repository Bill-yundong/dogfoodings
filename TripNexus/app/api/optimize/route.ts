import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { TSPOptimizer } from '@/lib/tsp';
import type { Location, TransportMode, TSPSolveRequest } from '@/lib/types';
import type { AlgorithmType, OptimizationGoal } from '@/lib/tsp/types';

const optimizeRequestSchema = z.object({
  locations: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      address: z.string().optional(),
      coordinates: z.object({
        lat: z.number(),
        lng: z.number(),
      }),
      duration: z.number().optional(),
      stayDuration: z.number().optional(),
      priority: z.number().optional(),
    })
  ).min(2, '至少需要2个地点'),
  algorithm: z.enum(['nearest_neighbor', 'genetic', 'simulated_annealing', 'ant_colony']),
  optimizationGoal: z.enum(['distance', 'time', 'cost', 'balanced']),
  transportMode: z.enum(['driving', 'transit', 'walking', 'cycling', 'flying']),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  dailyStartTime: z.string().optional(),
  dailyEndTime: z.string().optional(),
  returnToStart: z.boolean().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = optimizeRequestSchema.parse(body);
    
    const locations: Location[] = validated.locations.map(loc => ({
      ...loc,
      duration: loc.stayDuration || loc.duration || 60,
      priority: (loc.priority as 1 | 2 | 3) || 2,
      address: loc.address || '',
    }));

    const tspRequest: TSPSolveRequest = {
      locations,
      startDate: validated.startDate || new Date().toISOString().split('T')[0],
      endDate: validated.endDate || new Date().toISOString().split('T')[0],
      transportMode: validated.transportMode as TransportMode,
      algorithm: validated.algorithm as AlgorithmType,
      optimizationGoal: validated.optimizationGoal as OptimizationGoal,
      constraints: {
        dailyHours: {
          start: validated.dailyStartTime || '09:00',
          end: validated.dailyEndTime || '18:00',
        },
        maxDailyDistance: 500000,
        avoidTolls: false,
      },
    };
    
    const optimizer = new TSPOptimizer(tspRequest);
    
    const result = await optimizer.optimize({
      generateAlternatives: true,
      onProgress: (algorithm, progress, extra) => {
        console.log(`[API] 优化进度: ${algorithm} ${progress}%`, extra || '');
      },
    });
    
    return NextResponse.json({
      success: true,
      data: result,
      progress: 100,
    });
    
  } catch (error) {
    console.error('[API] 优化失败:', error);
    
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
        error: error instanceof Error ? error.message : '路径优化失败',
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    success: true,
    data: {
      algorithms: [
        { id: 'nearest_neighbor', name: '最近邻算法', description: '快速启发式算法，适合小规模问题' },
        { id: 'genetic', name: '遗传算法', description: '进化算法，适合中等规模问题' },
        { id: 'simulated_annealing', name: '模拟退火算法', description: '概率搜索算法，全局寻优能力强' },
        { id: 'ant_colony', name: '蚁群算法', description: '群体智能算法，适合复杂路网' },
      ],
      optimizationGoals: [
        { id: 'distance', name: '最短距离', description: '优先最小化总行驶距离' },
        { id: 'time', name: '最短时间', description: '优先最小化总旅行时间' },
        { id: 'cost', name: '最低成本', description: '优先最小化旅行成本' },
        { id: 'balanced', name: '综合均衡', description: '距离、时间、成本均衡优化' },
      ],
      transportModes: [
        { id: 'driving', name: '驾车', speed: 60, costPerKm: 0.8 },
        { id: 'transit', name: '公共交通', speed: 35, costPerKm: 0.3 },
        { id: 'walking', name: '步行', speed: 5, costPerKm: 0 },
        { id: 'cycling', name: '骑行', speed: 15, costPerKm: 0 },
        { id: 'flying', name: '飞行', speed: 800, costPerKm: 2.5 },
      ],
    },
  });
}
