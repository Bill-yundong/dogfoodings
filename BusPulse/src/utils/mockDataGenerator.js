import { 
  BusStop, 
  BusRoute, 
  GPSPoint, 
  PassengerFlow, 
  Schedule,
  Coordinate 
} from '../models/dataModels';

function randomInRange(min, max) {
  return Math.random() * (max - min) + min;
}

function randomInt(min, max) {
  return Math.floor(randomInRange(min, max + 1));
}

export function generateMockStops(count = 10000, baseLat = 39.9, baseLng = 116.4) {
  const stops = [];
  const routesCount = Math.ceil(count / 20);
  
  for (let i = 0; i < count; i++) {
    const routeIndex = Math.floor(i / 20);
    const stopOrder = i % 20;
    
    const lat = baseLat + randomInRange(-0.1, 0.1) + (routeIndex * 0.01);
    const lng = baseLng + randomInRange(-0.1, 0.1) + (stopOrder * 0.005);
    
    stops.push({
      id: `STOP_${String(i + 1).padStart(5, '0')}`,
      name: `站点 ${i + 1}`,
      coordinate: new Coordinate(lat, lng),
      order: stopOrder,
      routeId: `ROUTE_${String(routeIndex + 1).padStart(3, '0')}`
    });
  }
  
  return stops;
}

export function generateMockRoutes(stops) {
  const routesMap = new Map();
  
  for (const stop of stops) {
    if (!routesMap.has(stop.routeId)) {
      routesMap.set(stop.routeId, {
        id: stop.routeId,
        name: `线路 ${stop.routeId.split('_')[1]}`,
        stops: [],
        routePath: []
      });
    }
    routesMap.get(stop.routeId).stops.push(stop);
  }
  
  const routes = [];
  
  for (const [, routeData] of routesMap) {
    routeData.stops.sort((a, b) => a.order - b.order);
    
    routeData.routePath = routeData.stops.map(stop => ({
      lat: stop.coordinate.lat,
      lng: stop.coordinate.lng
    }));
    
    routes.push(new BusRoute(
      routeData.id,
      routeData.name,
      routeData.stops,
      routeData.routePath
    ));
  }
  
  return routes;
}

export function generateGPSPoints(busId, route, startTime, count = 20, delayVariation = 0) {
  const points = [];
  const path = route.routePath;
  const interval = 30000;
  
  for (let i = 0; i < count; i++) {
    const progress = i / (count - 1);
    const pathIndex = Math.min(
      Math.floor(progress * (path.length - 1)),
      path.length - 2
    );
    const pathProgress = (progress * (path.length - 1)) - pathIndex;
    
    const startPoint = path[pathIndex];
    const endPoint = path[pathIndex + 1];
    
    const lat = startPoint.lat + (endPoint.lat - startPoint.lat) * pathProgress;
    const lng = startPoint.lng + (endPoint.lng - startPoint.lng) * pathProgress;
    
    const noiseLat = randomInRange(-0.001, 0.001);
    const noiseLng = randomInRange(-0.001, 0.001);
    
    const delayOffset = delayVariation > 0 ? randomInRange(-delayVariation, delayVariation) * 1000 : 0;
    
    points.push(new GPSPoint(
      startTime + i * interval + delayOffset,
      new Coordinate(lat + noiseLat, lng + noiseLng),
      randomInRange(15, 45),
      randomInRange(0, 360)
    ));
  }
  
  return { busId, points };
}

export function generatePassengerFlowData(stops, days = 7) {
  const flows = [];
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;
  
  for (let day = 0; day < days; day++) {
    const dayStart = now - day * dayMs;
    
    for (const stop of stops) {
      for (let hour = 6; hour <= 22; hour++) {
        let peakFactor = 1;
        if ((hour >= 7 && hour <= 9) || (hour >= 17 && hour <= 19)) {
          peakFactor = 2.5;
        } else if (hour >= 11 && hour <= 13) {
          peakFactor = 1.5;
        }
        
        const baseBoarding = randomInt(10, 50);
        const baseAlighting = randomInt(10, 50);
        
        flows.push({
          stopId: stop.id,
          timestamp: dayStart + hour * 60 * 60 * 1000,
          boardingCount: Math.round(baseBoarding * peakFactor),
          alightingCount: Math.round(baseAlighting * peakFactor),
          occupancyRate: randomInRange(0.3, 0.9),
          peakFactor
        });
      }
    }
  }
  
  return flows;
}

export function generateSchedules(routes, busesPerRoute = 3) {
  const schedules = [];
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;
  
  for (const route of routes) {
    for (let busIndex = 0; busIndex < busesPerRoute; busIndex++) {
      const busId = `BUS_${route.id.split('_')[1]}_${String(busIndex + 1).padStart(2, '0')}`;
      
      const startHour = 6 + busIndex * 2;
      const startTime = now - (now % dayMs) + startHour * 60 * 60 * 1000;
      const endTime = startTime + 2 * 60 * 60 * 1000;
      
      const stopTimes = route.stops.map((stop, index) => {
        const stopTime = startTime + index * 5 * 60 * 1000;
        return {
          stopId: stop.id,
          arrivalTime: stopTime,
          departureTime: stopTime + 30000
        };
      });
      
      schedules.push(new Schedule(
        `SCH_${route.id}_${String(busIndex + 1).padStart(2, '0')}`,
        route.id,
        busId,
        startTime,
        endTime,
        stopTimes,
        'active'
      ));
    }
  }
  
  return schedules;
}

export function generateDelayedGPSPoints(busId, route, startTime, count = 20, delaySeconds = 300) {
  const result = generateGPSPoints(busId, route, startTime + delaySeconds * 1000, count, 60);
  return result;
}

export function generateFullMockDataset() {
  const stops = generateMockStops(1000);
  const routes = generateMockRoutes(stops);
  const schedules = generateSchedules(routes, 2);
  const passengerFlow = generatePassengerFlowData(stops.slice(0, 100), 3);
  
  const gpsData = [];
  for (const schedule of schedules) {
    const route = routes.find(r => r.id === schedule.routeId);
    if (route) {
      const isDelayed = Math.random() > 0.7;
      if (isDelayed) {
        gpsData.push(generateDelayedGPSPoints(schedule.busId, route, schedule.startTime, 15, 240));
      } else {
        gpsData.push(generateGPSPoints(schedule.busId, route, schedule.startTime, 15));
      }
    }
  }
  
  return {
    stops,
    routes,
    schedules,
    passengerFlow,
    gpsData
  };
}
