import { generateId } from '@/lib/utils/helpers';
import { OperationLog, Trip, Location } from '@/lib/types';

interface CRDTOperation {
  id: string;
  type: 'create' | 'update' | 'delete';
  entityType: 'trip' | 'location' | 'snapshot';
  entityId: string;
  field?: string;
  value: unknown;
  timestamp: number;
  lamportClock: number;
  actorId: string;
}

export class CRDTResolver {
  private actorId: string;
  private lamportClock: number;
  private operations: Map<string, CRDTOperation>;

  constructor(actorId?: string) {
    this.actorId = actorId || generateId();
    this.lamportClock = 0;
    this.operations = new Map();
  }

  createOperation(
    type: 'create' | 'update' | 'delete',
    entityType: 'trip' | 'location' | 'snapshot',
    entityId: string,
    value: unknown,
    field?: string
  ): OperationLog {
    this.lamportClock++;

    const crdtOp: CRDTOperation = {
      id: generateId(),
      type,
      entityType,
      entityId,
      field,
      value,
      timestamp: Date.now(),
      lamportClock: this.lamportClock,
      actorId: this.actorId,
    };

    this.operations.set(crdtOp.id, crdtOp);

    return {
      id: crdtOp.id,
      tripId: '',
      snapshotId: '',
      entityId: crdtOp.entityId,
      type: crdtOp.type,
      entityType: crdtOp.entityType,
      payload: {
        entityId: crdtOp.entityId,
        field: crdtOp.field,
        value: crdtOp.value,
        lamportClock: crdtOp.lamportClock,
        actorId: crdtOp.actorId,
      },
      timestamp: new Date(crdtOp.timestamp).toISOString(),
      offline: !navigator.onLine,
    };
  }

  merge(operations: OperationLog[]): OperationLog[] {
    const resolved: OperationLog[] = [];
    const seen = new Set<string>();

    const allOps = [...this.getOperations(), ...operations].sort((a, b) => {
      const aClock = a.payload.lamportClock as number || 0;
      const bClock = b.payload.lamportClock as number || 0;
      if (aClock !== bClock) return aClock - bClock;
      return (a.payload.actorId as string || '').localeCompare(b.payload.actorId as string || '');
    });

    for (const op of allOps) {
      if (!seen.has(op.id)) {
        seen.add(op.id);
        resolved.push(op);
        this.lamportClock = Math.max(this.lamportClock, (op.payload.lamportClock as number) || 0);
      }
    }

    return resolved;
  }

  resolveConflict(local: Trip, remote: Trip): Trip {
    if (local.updatedAt > remote.updatedAt) {
      return local;
    }
    if (local.updatedAt < remote.updatedAt) {
      return remote;
    }
    return this.mergeTrips(local, remote);
  }

  private mergeTrips(local: Trip, remote: Trip): Trip {
    const merged: Trip = { ...local, ...remote };

    if (local.locations.length > 0 || remote.locations.length > 0) {
      merged.locations = this.mergeLocations(local.locations, remote.locations);
    }

    merged.updatedAt = new Date(Math.max(
      new Date(local.updatedAt).getTime(),
      new Date(remote.updatedAt).getTime()
    )).toISOString();

    return merged;
  }

  private mergeLocations(local: Location[], remote: Location[]): Location[] {
    const locationMap = new Map<string, Location>();

    for (const loc of [...local, ...remote]) {
      const existing = locationMap.get(loc.id);
      if (!existing) {
        locationMap.set(loc.id, { ...loc });
      } else {
        locationMap.set(loc.id, this.mergeLocation(existing, loc));
      }
    }

    return Array.from(locationMap.values()).sort((a, b) => 
      (a.orderIndex ?? 0) - (b.orderIndex ?? 0)
    );
  }

  private mergeLocation(local: Location, remote: Location): Location {
    const localTime = new Date(local.tripId ? local.tripId : '').getTime();
    const remoteTime = new Date(remote.tripId ? remote.tripId : '').getTime();

    if (localTime >= remoteTime) {
      return local;
    }
    return remote;
  }

  applyOperations(base: Trip, operations: OperationLog[]): Trip {
    let result: Trip = { ...base };

    const sortedOps = [...operations].sort((a, b) => {
      const aClock = a.payload.lamportClock as number || 0;
      const bClock = b.payload.lamportClock as number || 0;
      return aClock - bClock;
    });

    for (const op of sortedOps) {
      result = this.applyOperation(result, op);
    }

    return result;
  }

  private applyOperation(trip: Trip, op: OperationLog): Trip {
    const { entityId, field, value } = op.payload;
    const timestampStr = typeof op.timestamp === 'string' ? op.timestamp : op.timestamp.toISOString();

    if (op.entityType === 'trip' && entityId === trip.id) {
      if (op.type === 'update' && field) {
        const fieldKey = field as string;
        return { ...trip, [fieldKey]: value, updatedAt: timestampStr };
      }
      if (op.type === 'delete') {
        return { ...trip, status: 'cancelled', updatedAt: timestampStr };
      }
    }

    if (op.entityType === 'location') {
      const locations = [...trip.locations];
      
      if (op.type === 'create') {
        locations.push(value as Location);
      } else if (op.type === 'update' && field) {
        const idx = locations.findIndex(l => l.id === entityId);
        if (idx !== -1) {
          const fieldKey = field as string;
          locations[idx] = { ...locations[idx], [fieldKey]: value };
        }
      } else if (op.type === 'delete') {
        const idx = locations.findIndex(l => l.id === entityId);
        if (idx !== -1) {
          locations.splice(idx, 1);
        }
      }

      return { ...trip, locations, updatedAt: timestampStr };
    }

    return trip;
  }

  getOperations(): OperationLog[] {
    return Array.from(this.operations.values()).map(op => ({
      id: op.id,
      tripId: '',
      snapshotId: '',
      entityId: op.entityId,
      type: op.type,
      entityType: op.entityType,
      payload: {
        entityId: op.entityId,
        field: op.field,
        value: op.value,
        lamportClock: op.lamportClock,
        actorId: op.actorId,
      },
      timestamp: new Date(op.timestamp).toISOString(),
      offline: true,
    }));
  }

  getActorId(): string {
    return this.actorId;
  }

  getClock(): number {
    return this.lamportClock;
  }

  reset(): void {
    this.operations.clear();
    this.lamportClock = 0;
  }
}

export const createCRDTResolver = (actorId?: string): CRDTResolver => {
  return new CRDTResolver(actorId);
};
