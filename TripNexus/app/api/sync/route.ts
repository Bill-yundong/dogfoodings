import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getDB } from '@/lib/offline/db';
import { CRDTResolver } from '@/lib/offline/crdt';
import type { Trip, Location, TripSnapshot, OperationLog } from '@/lib/types';

const syncRequestSchema = z.object({
  clientId: z.string(),
  lastSyncTime: z.string().nullable(),
  operations: z.array(
    z.object({
      id: z.string(),
      type: z.enum(['create', 'update', 'delete']),
      entityType: z.enum(['trip', 'location', 'snapshot']),
      entityId: z.string(),
      data: z.any().optional(),
      timestamp: z.string(),
      lamportTime: z.number(),
    })
  ).optional(),
  entities: z.object({
    trips: z.array(z.any()).optional(),
    locations: z.array(z.any()).optional(),
    snapshots: z.array(z.any()).optional(),
  }).optional(),
  fullSync: z.boolean().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = syncRequestSchema.parse(body);
    
    const db = await getDB();
    const crdtResolver = new CRDTResolver(validated.clientId);
    
    const syncStartTime = new Date();
    const conflicts: any[] = [];
    const mergedOperations: any[] = [];
    
    if (validated.operations && validated.operations.length > 0) {
      for (const op of validated.operations) {
        const allLogs = await db.operationLogs.toArray();
        const serverOp = allLogs
          .filter(log => log.entityId === op.entityId)
          .sort((a, b) => (a.lamportTime || 0) - (b.lamportTime || 0))
          .pop();
        
        if (serverOp && (serverOp.lamportTime || 0) > op.lamportTime) {
          const conflict = crdtResolver.resolveConflict(
            { ...op, timestamp: new Date(op.timestamp) } as unknown as Trip,
            serverOp as unknown as Trip
          );
          conflicts.push(conflict);
        }
        
        const mergedOp: OperationLog = {
          id: op.id,
          tripId: op.entityId,
          entityId: op.entityId,
          type: op.type,
          entityType: op.entityType,
          payload: { data: op.data, lamportTime: op.lamportTime },
          timestamp: new Date(op.timestamp),
          offline: false,
          status: 'synced',
          lamportTime: op.lamportTime,
          data: op.data,
        };
        
        await db.operationLogs.put(mergedOp);
        mergedOperations.push(mergedOp);
        
        if (op.entityType === 'trip') {
          if (op.type === 'create' || op.type === 'update') {
            await db.trips.put({ 
              ...op.data, 
              id: op.entityId,
              timestamp: new Date(),
            });
          } else if (op.type === 'delete') {
            await db.trips.delete(op.entityId);
          }
        } else if (op.entityType === 'location') {
          if (op.type === 'create' || op.type === 'update') {
            await db.locations.put({ ...op.data, id: op.entityId });
          } else if (op.type === 'delete') {
            await db.locations.delete(op.entityId);
          }
        }
      }
    }
    
    let serverChanges: {
      trips: Trip[];
      locations: Location[];
      snapshots: TripSnapshot[];
      operations: OperationLog[];
    } = {
      trips: [],
      locations: [],
      snapshots: [],
      operations: [],
    };
    
    if (validated.fullSync || !validated.lastSyncTime) {
      serverChanges = {
        trips: await db.trips.toArray(),
        locations: await db.locations.toArray(),
        snapshots: await db.snapshots.toArray(),
        operations: await db.operationLogs.toArray(),
      };
    } else {
      const lastSyncDate = new Date(validated.lastSyncTime);
      const [allTrips, allLocations, allSnapshots, allOperations] = await Promise.all([
        db.trips.toArray(),
        db.locations.toArray(),
        db.snapshots.toArray(),
        db.operationLogs.toArray(),
      ]);
      
      serverChanges = {
        trips: allTrips.filter(t => new Date(t.updatedAt) > lastSyncDate),
        locations: allLocations,
        snapshots: allSnapshots.filter(s => new Date(s.createdAt) > lastSyncDate),
        operations: allOperations.filter(o => new Date(o.timestamp) > lastSyncDate),
      };
    }
    
    return NextResponse.json({
      success: true,
      data: {
        syncTime: syncStartTime.toISOString(),
        serverTime: new Date().toISOString(),
        appliedOperations: mergedOperations.length,
        conflicts: conflicts.length,
        conflictDetails: conflicts,
        changes: serverChanges,
        summary: {
          trips: serverChanges.trips.length,
          locations: serverChanges.locations.length,
          snapshots: serverChanges.snapshots.length,
          operations: serverChanges.operations.length,
        },
      },
    });
    
  } catch (error) {
    console.error('[API] 同步失败:', error);
    
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
        error: error instanceof Error ? error.message : '同步失败',
        retryAfter: 5000,
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const since = searchParams.get('since');
  
  try {
    const db = await getDB();
    
    const allOperations = await db.operationLogs.toArray();
    let recentOperations = allOperations
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    
    if (since) {
      const sinceDate = new Date(since);
      recentOperations = recentOperations.filter(o => new Date(o.timestamp) > sinceDate);
    }
    
    const pendingCount = allOperations.filter(o => o.status === 'pending').length;
    
    return NextResponse.json({
      success: true,
      data: {
        serverTime: new Date().toISOString(),
        pendingOperations: pendingCount,
        recentOperations: recentOperations.slice(0, 50),
        stats: {
          totalTrips: await db.trips.count(),
          totalLocations: await db.locations.count(),
          totalSnapshots: await db.snapshots.count(),
          totalOperations: await db.operationLogs.count(),
        },
      },
    });
    
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '获取同步状态失败',
      },
      { status: 500 }
    );
  }
}
