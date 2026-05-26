import type { 
  Trajectory4D, 
  Waypoint, 
  Conflict, 
  ResolutionOption, 
  AirspaceSector,
  FlowManagementPlan,
  TrafficFlowData
} from '@/types';
import type { GeoCoordinate } from '@/types/common';

const MIN_SEPARATION_HORIZONTAL = 500;
const MIN_SEPARATION_VERTICAL = 100;
const CONFLICT_LOOKAHEAD_MINUTES = 15;

export class TrajectoryPlanner {
  public generate4DTrajectory(
    flightId: string,
    aircraftId: string,
    origin: GeoCoordinate,
    destination: GeoCoordinate,
    startTime: Date,
    cruiseSpeed: number,
    cruiseAltitude: number
  ): Trajectory4D {
    const waypoints: Waypoint[] = [];
    const distance = this.calculateDistance(origin, destination);
    const flightTimeHours = distance / cruiseSpeed;
    const totalMinutes = flightTimeHours * 60;
    
    const climbRate = 500;
    const descentRate = 400;
    const climbMinutes = cruiseAltitude / climbRate;
    const descentMinutes = cruiseAltitude / descentRate;
    const cruiseMinutes = Math.max(0, totalMinutes - climbMinutes - descentMinutes);

    let currentTime = new Date(startTime);
    let currentAltitude = origin.altitude || 0;

    const totalWaypoints = 20;
    for (let i = 0; i <= totalWaypoints; i++) {
      const progress = i / totalWaypoints;
      const lat = origin.lat + (destination.lat - origin.lat) * progress;
      const lng = origin.lng + (destination.lng - origin.lng) * progress;
      
      let altitude: number;
      if (progress < climbMinutes / totalMinutes) {
        altitude = currentAltitude + (cruiseAltitude - currentAltitude) * (progress * totalMinutes / climbMinutes);
      } else if (progress > (totalMinutes - descentMinutes) / totalMinutes) {
        const descentProgress = (progress * totalMinutes - (totalMinutes - descentMinutes)) / descentMinutes;
        altitude = cruiseAltitude - (cruiseAltitude - (destination.altitude || 0)) * descentProgress;
      } else {
        altitude = cruiseAltitude;
      }

      waypoints.push({
        coordinate: { lat, lng, altitude },
        timestamp: new Date(currentTime.getTime() + i * (totalMinutes / totalWaypoints) * 60 * 1000),
        speed: cruiseSpeed * (progress > 0.1 && progress < 0.9 ? 1 : 0.7),
        altitude
      });
    }

    return {
      id: `traj_${flightId}_${Date.now()}`,
      flightId,
      aircraftId,
      waypoints,
      startTime,
      endTime: new Date(startTime.getTime() + totalMinutes * 60 * 1000),
      status: 'planned'
    };
  }

  private calculateDistance(p1: GeoCoordinate, p2: GeoCoordinate): number {
    const R = 6371;
    const dLat = (p2.lat - p1.lat) * Math.PI / 180;
    const dLng = (p2.lng - p1.lng) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(p1.lat * Math.PI / 180) * Math.cos(p2.lat * Math.PI / 180) *
      Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }
}

export class ConflictDetector {
  public detectConflicts(
    trajectories: Trajectory4D[],
    lookaheadMinutes: number = CONFLICT_LOOKAHEAD_MINUTES
  ): Conflict[] {
    const conflicts: Conflict[] = [];
    const now = new Date();
    const lookaheadEnd = new Date(now.getTime() + lookaheadMinutes * 60 * 1000);

    for (let i = 0; i < trajectories.length; i++) {
      for (let j = i + 1; j < trajectories.length; j++) {
        const conflict = this.checkTrajectoryConflict(
          trajectories[i], 
          trajectories[j], 
          now, 
          lookaheadEnd
        );
        
        if (conflict) {
          conflicts.push(conflict);
        }
      }
    }

    return conflicts;
  }

  private checkTrajectoryConflict(
    traj1: Trajectory4D,
    traj2: Trajectory4D,
    startTime: Date,
    endTime: Date
  ): Conflict | null {
    const intervalSeconds = 30;
    let currentTime = new Date(startTime);

    while (currentTime <= endTime) {
      const pos1 = this.getPositionAtTime(traj1, currentTime);
      const pos2 = this.getPositionAtTime(traj2, currentTime);

      if (pos1 && pos2) {
        const horizontalDistance = this.horizontalDistance(pos1.coordinate, pos2.coordinate);
        const verticalDistance = Math.abs(pos1.altitude - pos2.altitude);

        if (horizontalDistance < MIN_SEPARATION_HORIZONTAL || verticalDistance < MIN_SEPARATION_VERTICAL) {
          const severity = horizontalDistance < 200 || verticalDistance < 50 ? 'critical'
            : horizontalDistance < 300 || verticalDistance < 75 ? 'high'
            : horizontalDistance < 400 ? 'medium' : 'low';

          return {
            id: `conflict_${traj1.flightId}_${traj2.flightId}_${Date.now()}`,
            flightId1: traj1.flightId,
            flightId2: traj2.flightId,
            detectionTime: new Date(),
            predictedTime: currentTime,
            minimumDistance: Math.min(horizontalDistance, verticalDistance * 5),
            altitudeDifference: verticalDistance,
            severity,
            status: 'detected',
            location: pos1.coordinate
          };
        }
      }

      currentTime = new Date(currentTime.getTime() + intervalSeconds * 1000);
    }

    return null;
  }

  private getPositionAtTime(trajectory: Trajectory4D, time: Date): Waypoint | null {
    if (time < trajectory.startTime || time > trajectory.endTime) {
      return null;
    }

    for (let i = 0; i < trajectory.waypoints.length - 1; i++) {
      const wp1 = trajectory.waypoints[i];
      const wp2 = trajectory.waypoints[i + 1];
      
      if (time >= wp1.timestamp && time <= wp2.timestamp) {
        const totalDuration = wp2.timestamp.getTime() - wp1.timestamp.getTime();
        const elapsed = time.getTime() - wp1.timestamp.getTime();
        const progress = totalDuration > 0 ? elapsed / totalDuration : 0;

        return {
          coordinate: {
            lat: wp1.coordinate.lat + (wp2.coordinate.lat - wp1.coordinate.lat) * progress,
            lng: wp1.coordinate.lng + (wp2.coordinate.lng - wp1.coordinate.lng) * progress,
            altitude: wp1.altitude + (wp2.altitude - wp1.altitude) * progress
          },
          timestamp: time,
          speed: wp1.speed + (wp2.speed - wp1.speed) * progress,
          altitude: wp1.altitude + (wp2.altitude - wp1.altitude) * progress
        };
      }
    }

    return trajectory.waypoints[trajectory.waypoints.length - 1];
  }

  private horizontalDistance(p1: GeoCoordinate, p2: GeoCoordinate): number {
    return this.calculateDistance(p1, p2) * 1000;
  }

  private calculateDistance(p1: GeoCoordinate, p2: GeoCoordinate): number {
    const R = 6371;
    const dLat = (p2.lat - p1.lat) * Math.PI / 180;
    const dLng = (p2.lng - p1.lng) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(p1.lat * Math.PI / 180) * Math.cos(p2.lat * Math.PI / 180) *
      Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }
}

export class ResolutionGenerator {
  public generateResolutions(conflict: Conflict, trajectories: Trajectory4D[]): ResolutionOption[] {
    const options: ResolutionOption[] = [];
    const traj1 = trajectories.find(t => t.flightId === conflict.flightId1);
    const traj2 = trajectories.find(t => t.flightId === conflict.flightId2);

    if (!traj1 || !traj2) return options;

    options.push({
      id: `res_alt_${conflict.id}`,
      conflictId: conflict.id,
      type: 'altitude',
      description: '调整飞行器1高度+300英尺',
      deviation: 300,
      delayMinutes: 0,
      fuelCost: 5,
      safetyScore: 0.9,
      recommended: true
    });

    options.push({
      id: `res_speed_${conflict.id}`,
      conflictId: conflict.id,
      type: 'speed',
      description: '飞行器2减速10%',
      deviation: 10,
      delayMinutes: 2,
      fuelCost: 3,
      safetyScore: 0.85,
      recommended: false
    });

    options.push({
      id: `res_route_${conflict.id}`,
      conflictId: conflict.id,
      type: 'route',
      description: '飞行器1侧向偏移1海里',
      deviation: 1852,
      delayMinutes: 1,
      fuelCost: 8,
      safetyScore: 0.8,
      recommended: false
    });

    options.push({
      id: `res_time_${conflict.id}`,
      conflictId: conflict.id,
      type: 'time',
      description: '飞行器1延迟3分钟起飞',
      deviation: 0,
      delayMinutes: 3,
      fuelCost: 2,
      safetyScore: 0.95,
      recommended: conflict.severity === 'critical'
    });

    return options.sort((a, b) => b.safetyScore - a.safetyScore);
  }
}

export class FlowManager {
  public calculateFlowData(
    sector: AirspaceSector,
    trajectories: Trajectory4D[],
    timeWindow: number = 15
  ): TrafficFlowData {
    const now = new Date();
    const windowStart = new Date(now.getTime() - timeWindow * 60 * 1000);
    const windowEnd = new Date(now.getTime() + timeWindow * 60 * 1000);

    let entryCount = 0;
    let exitCount = 0;
    let transitCount = 0;
    const speeds: number[] = [];

    for (const traj of trajectories) {
      const inSector = this.isTrajectoryInSector(traj, sector, windowStart, windowEnd);
      
      if (inSector === 'entering') entryCount++;
      else if (inSector === 'exiting') exitCount++;
      else if (inSector === 'transiting') {
        transitCount++;
        const midPoint = traj.waypoints[Math.floor(traj.waypoints.length / 2)];
        if (midPoint) speeds.push(midPoint.speed);
      }
    }

    const averageSpeed = speeds.length > 0 
      ? speeds.reduce((a, b) => a + b, 0) / speeds.length 
      : 0;

    const sectorArea = this.calculateSectorArea(sector);
    const density = sectorArea > 0 ? transitCount / sectorArea : 0;

    return {
      timestamp: now,
      sectorId: sector.id,
      entryCount,
      exitCount,
      transitCount,
      averageSpeed,
      density
    };
  }

  private isTrajectoryInSector(
    trajectory: Trajectory4D,
    sector: AirspaceSector,
    startTime: Date,
    endTime: Date
  ): 'entering' | 'exiting' | 'transiting' | null {
    let startIn = false;
    let endIn = false;

    for (const wp of trajectory.waypoints) {
      if (wp.timestamp < startTime || wp.timestamp > endTime) continue;
      
      const inSector = this.isPointInSector(wp.coordinate, sector);
      if (wp.timestamp <= startTime) startIn = inSector;
      if (wp.timestamp >= endTime) endIn = inSector;
    }

    if (!startIn && endIn) return 'entering';
    if (startIn && !endIn) return 'exiting';
    if (startIn && endIn) return 'transiting';
    return null;
  }

  private isPointInSector(point: GeoCoordinate, sector: AirspaceSector): boolean {
    if (point.altitude !== undefined) {
      if (point.altitude < sector.altitudeMin || point.altitude > sector.altitudeMax) {
        return false;
      }
    }

    const polygon = sector.geometry;
    let inside = false;
    
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i].lat, yi = polygon[i].lng;
      const xj = polygon[j].lat, yj = polygon[j].lng;
      
      if (((yi > point.lng) !== (yj > point.lng)) &&
          (point.lat < (xj - xi) * (point.lng - yi) / (yj - yi) + xi)) {
        inside = !inside;
      }
    }

    return inside;
  }

  private calculateSectorArea(sector: AirspaceSector): number {
    const polygon = sector.geometry;
    let area = 0;
    
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      area += polygon[i].lat * polygon[j].lng;
      area -= polygon[j].lat * polygon[i].lng;
    }

    return Math.abs(area / 2);
  }

  public generateFlowPlan(
    sector: AirspaceSector,
    currentFlow: TrafficFlowData,
    forecast: Array<{ time: Date; demand: number }>
  ): FlowManagementPlan {
    const maxCapacity = sector.capacity;
    const currentDemand = currentFlow.entryCount;
    
    let entryRate = currentDemand;
    if (currentDemand > maxCapacity * 0.8) {
      entryRate = maxCapacity * 0.7;
    }

    return {
      id: `flow_${sector.id}_${Date.now()}`,
      sectorId: sector.id,
      startTime: new Date(),
      endTime: new Date(Date.now() + 2 * 60 * 60 * 1000),
      maxCapacity,
      entryRate,
      milesInTrail: 5
    };
  }
}

export const trajectoryPlanner = new TrajectoryPlanner();
export const conflictDetector = new ConflictDetector();
export const resolutionGenerator = new ResolutionGenerator();
export const flowManager = new FlowManager();
