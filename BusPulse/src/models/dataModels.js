export const BusStatus = {
  ON_TIME: 'ON_TIME',
  EARLY: 'EARLY',
  DELAYED: 'DELAYED'
};

export class Coordinate {
  constructor(lat, lng) {
    this.lat = lat;
    this.lng = lng;
  }
  
  distanceTo(other) {
    const R = 6371;
    const dLat = (other.lat - this.lat) * Math.PI / 180;
    const dLng = (other.lng - this.lng) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(this.lat * Math.PI / 180) * Math.cos(other.lat * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }
}

export class BusStop {
  constructor(id, name, coordinate, order) {
    this.id = id;
    this.name = name;
    this.coordinate = coordinate;
    this.order = order;
  }
}

export class BusRoute {
  constructor(id, name, stops, routePath) {
    this.id = id;
    this.name = name;
    this.stops = stops;
    this.routePath = routePath;
  }
}

export class GPSPoint {
  constructor(timestamp, coordinate, speed, heading) {
    this.timestamp = timestamp;
    this.coordinate = coordinate;
    this.speed = speed;
    this.heading = heading;
  }
}

export class TrajectoryOffset {
  constructor(busId, routeId, timestamp, 
              distanceFromRoute, expectedStopId, 
              actualStopId, delaySeconds, status) {
    this.busId = busId;
    this.routeId = routeId;
    this.timestamp = timestamp;
    this.distanceFromRoute = distanceFromRoute;
    this.expectedStopId = expectedStopId;
    this.actualStopId = actualStopId;
    this.delaySeconds = delaySeconds;
    this.status = status;
  }
}

export class PunctualityMetrics {
  constructor(routeId, timestamp, 
              onTimeCount, earlyCount, delayedCount, 
              avgDelay, onTimeRate) {
    this.routeId = routeId;
    this.timestamp = timestamp;
    this.onTimeCount = onTimeCount;
    this.earlyCount = earlyCount;
    this.delayedCount = delayedCount;
    this.avgDelay = avgDelay;
    this.onTimeRate = onTimeRate;
  }
  
  get totalCount() {
    return this.onTimeCount + this.earlyCount + this.delayedCount;
  }
}

export class PassengerFlow {
  constructor(stopId, timestamp, 
              boardingCount, alightingCount, 
              occupancyRate, peakFactor) {
    this.stopId = stopId;
    this.timestamp = timestamp;
    this.boardingCount = boardingCount;
    this.alightingCount = alightingCount;
    this.occupancyRate = occupancyRate;
    this.peakFactor = peakFactor;
  }
}

export class Schedule {
  constructor(id, routeId, busId, 
              startTime, endTime, 
              stopTimes, status) {
    this.id = id;
    this.routeId = routeId;
    this.busId = busId;
    this.startTime = startTime;
    this.endTime = endTime;
    this.stopTimes = stopTimes;
    this.status = status;
  }
}

export class ScheduleAdjustment {
  constructor(scheduleId, reason, 
              newStartTime, newEndTime, 
              adjustedStopTimes, timestamp) {
    this.scheduleId = scheduleId;
    this.reason = reason;
    this.newStartTime = newStartTime;
    this.newEndTime = newEndTime;
    this.adjustedStopTimes = adjustedStopTimes;
    this.timestamp = timestamp;
  }
}
