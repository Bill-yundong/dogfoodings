import { Coordinate, TrajectoryOffset, BusStatus, GPSPoint } from '../models/dataModels';

const MAX_DISTANCE_THRESHOLD = 0.1;
const TIME_WINDOW_MS = 5 * 60 * 1000;
const MIN_POINTS_FOR_FITTING = 3;

class PointSegment {
  constructor(timestamp, distanceFromRoute, speed) {
    this.timestamp = timestamp;
    this.distanceFromRoute = distanceFromRoute;
    this.speed = speed;
  }
}

function pointToSegmentDistance(point, segmentStart, segmentEnd) {
  const A = point.lat - segmentStart.lat;
  const B = point.lng - segmentStart.lng;
  const C = segmentEnd.lat - segmentStart.lat;
  const D = segmentEnd.lng - segmentStart.lng;
  
  const dot = A * C + B * D;
  const lenSq = C * C + D * D;
  let param = -1;
  
  if (lenSq !== 0) param = dot / lenSq;
  
  let xx, yy;
  
  if (param < 0) {
    xx = segmentStart.lat;
    yy = segmentStart.lng;
  } else if (param > 1) {
    xx = segmentEnd.lat;
    yy = segmentEnd.lng;
  } else {
    xx = segmentStart.lat + param * C;
    yy = segmentStart.lng + param * D;
  }
  
  const dx = point.lat - xx;
  const dy = point.lng - yy;
  return Math.sqrt(dx * dx + dy * dy);
}

function calculateDistanceFromRoute(point, routePath) {
  if (!routePath || routePath.length < 2) return Infinity;
  
  let minDistance = Infinity;
  
  for (let i = 0; i < routePath.length - 1; i++) {
    const dist = pointToSegmentDistance(
      point, 
      routePath[i], 
      routePath[i + 1]
    );
    minDistance = Math.min(minDistance, dist);
  }
  
  return minDistance * 111;
}

function findNearestStop(point, stops) {
  if (!stops || stops.length === 0) return null;
  
  let nearestStop = null;
  let minDistance = Infinity;
  
  for (const stop of stops) {
    const stopCoord = stop.coordinate;
    const distance = Math.sqrt(
      Math.pow(point.lat - stopCoord.lat, 2) +
      Math.pow(point.lng - stopCoord.lng, 2)
    ) * 111;
    
    if (distance < minDistance) {
      minDistance = distance;
      nearestStop = stop;
    }
  }
  
  return nearestStop;
}

function movingAverageFilter(points, windowSize = 5) {
  if (points.length < windowSize) return points;
  
  const filtered = [];
  
  for (let i = 0; i < points.length; i++) {
    const start = Math.max(0, i - Math.floor(windowSize / 2));
    const end = Math.min(points.length, i + Math.floor(windowSize / 2) + 1);
    const window = points.slice(start, end);
    
    const avgDistance = window.reduce((sum, p) => sum + p.distanceFromRoute, 0) / window.length;
    const avgSpeed = window.reduce((sum, p) => sum + p.speed, 0) / window.length;
    
    filtered.push(new PointSegment(
      points[i].timestamp,
      avgDistance,
      avgSpeed
    ));
  }
  
  return filtered;
}

function linearRegression(points) {
  if (points.length < 2) return { slope: 0, intercept: 0, r2: 0 };
  
  const n = points.length;
  let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0, sumYY = 0;
  
  const minTime = Math.min(...points.map(p => p.timestamp));
  
  for (const point of points) {
    const x = (point.timestamp - minTime) / 1000;
    const y = point.distanceFromRoute;
    
    sumX += x;
    sumY += y;
    sumXY += x * y;
    sumXX += x * x;
    sumYY += y * y;
  }
  
  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;
  
  const ssTot = sumYY - (sumY * sumY) / n;
  const ssRes = sumYY - slope * sumXY - intercept * sumY;
  const r2 = ssTot === 0 ? 1 : 1 - ssRes / ssTot;
  
  return { slope, intercept, r2, minTime };
}

async function processBatch(busId, routeId, gpsPoints, route, stopTimes) {
  if (gpsPoints.length < MIN_POINTS_FOR_FITTING) {
    return [];
  }
  
  const routePath = route.routePath.map(p => new Coordinate(p.lat, p.lng));
  const stops = route.stops;
  
  const pointSegments = gpsPoints.map(point => {
    const coord = new Coordinate(point.coordinate.lat, point.coordinate.lng);
    const distance = calculateDistanceFromRoute(coord, routePath);
    return new PointSegment(point.timestamp, distance, point.speed);
  });
  
  const filteredPoints = movingAverageFilter(pointSegments);
  const regression = linearRegression(filteredPoints);
  
  const offsets = [];
  
  for (const point of gpsPoints) {
    const coord = new Coordinate(point.coordinate.lat, point.coordinate.lng);
    const distanceFromRoute = calculateDistanceFromRoute(coord, routePath);
    const nearestStop = findNearestStop(coord, stops);
    
    const expectedStopIndex = Math.floor(
      (point.timestamp - stopTimes[0].arrivalTime) / 
      ((stopTimes[stopTimes.length - 1].arrivalTime - stopTimes[0].arrivalTime) / stopTimes.length)
    );
    
    const clampedIndex = Math.max(0, Math.min(expectedStopIndex, stopTimes.length - 1));
    const expectedStopTime = stopTimes[clampedIndex];
    const expectedStop = stops.find(s => s.id === expectedStopTime.stopId);
    
    const delaySeconds = Math.round((point.timestamp - expectedStopTime.arrivalTime) / 1000);
    
    let status;
    if (Math.abs(delaySeconds) <= 60) {
      status = BusStatus.ON_TIME;
    } else if (delaySeconds < -60) {
      status = BusStatus.EARLY;
    } else {
      status = BusStatus.DELAYED;
    }
    
    offsets.push(new TrajectoryOffset(
      busId,
      routeId,
      point.timestamp,
      distanceFromRoute,
      expectedStop ? expectedStop.id : null,
      nearestStop ? nearestStop.id : null,
      delaySeconds,
      status
    ));
  }
  
  return {
    offsets,
    regression,
    averageSpeed: gpsPoints.reduce((sum, p) => sum + p.speed, 0) / gpsPoints.length,
    maxOffset: Math.max(...offsets.map(o => Math.abs(o.delaySeconds)))
  };
}

class AsyncTrajectoryFitter {
  constructor() {
    this.processingQueue = new Map();
    this.isProcessing = false;
    this.onOffsetCalculated = null;
  }
  
  setCallback(callback) {
    this.onOffsetCalculated = callback;
  }
  
  async addGPSPoints(busId, routeId, gpsPoints, route, stopTimes) {
    if (!this.processingQueue.has(busId)) {
      this.processingQueue.set(busId, {
        routeId,
        points: [],
        route,
        stopTimes
      });
    }
    
    const busData = this.processingQueue.get(busId);
    busData.points.push(...gpsPoints);
    
    if (!this.isProcessing) {
      this.processQueue();
    }
  }
  
  async processQueue() {
    this.isProcessing = true;
    
    while (this.processingQueue.size > 0) {
      for (const [busId, busData] of this.processingQueue) {
        const now = Date.now();
        const timeWindowStart = now - TIME_WINDOW_MS;
        
        const recentPoints = busData.points.filter(
          p => p.timestamp >= timeWindowStart
        );
        
        if (recentPoints.length >= MIN_POINTS_FOR_FITTING) {
          try {
            const result = await processBatch(
              busId,
              busData.routeId,
              recentPoints,
              busData.route,
              busData.stopTimes
            );
            
            if (this.onOffsetCalculated) {
              for (const offset of result.offsets) {
                this.onOffsetCalculated(offset, result);
              }
            }
            
            busData.points = recentPoints;
          } catch (error) {
            console.error(`Error processing bus ${busId}:`, error);
          }
        }
        
        await this.yieldToMainThread();
      }
      
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    this.isProcessing = false;
  }
  
  async yieldToMainThread() {
    return new Promise(resolve => {
      if (typeof requestIdleCallback !== 'undefined') {
        requestIdleCallback(resolve);
      } else {
        setTimeout(resolve, 0);
      }
    });
  }
  
  clearBus(busId) {
    this.processingQueue.delete(busId);
  }
  
  clearAll() {
    this.processingQueue.clear();
  }
}

const fitter = new AsyncTrajectoryFitter();

export {
  AsyncTrajectoryFitter,
  fitter as defaultFitter,
  processBatch,
  calculateDistanceFromRoute,
  findNearestStop,
  linearRegression,
  movingAverageFilter
};
