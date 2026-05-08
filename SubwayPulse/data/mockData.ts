import type { Station, CrowdPressure, TrainSchedule, CapacityPrediction } from "@/types";

export const mockStations: Station[] = [
  {
    id: "station-001",
    name: "人民广场站",
    line: "1号线",
    platforms: 4,
    maxCapacity: 5000,
    location: { x: 100, y: 200 },
  },
  {
    id: "station-002",
    name: "南京东路站",
    line: "2号线",
    platforms: 3,
    maxCapacity: 3500,
    location: { x: 200, y: 250 },
  },
  {
    id: "station-003",
    name: "徐家汇站",
    line: "1号线",
    platforms: 5,
    maxCapacity: 6000,
    location: { x: 150, y: 350 },
  },
  {
    id: "station-004",
    name: "陆家嘴站",
    line: "2号线",
    platforms: 2,
    maxCapacity: 2800,
    location: { x: 300, y: 300 },
  },
];

export const generateMockCrowdPressure = (stationId: string, timestamp: number): CrowdPressure => {
  const station = mockStations.find((s) => s.id === stationId);
  if (!station) {
    throw new Error(`Station not found: ${stationId}`);
  }

  const baseDensity = 0.3 + Math.random() * 0.5;
  const currentDensity = Math.min(1.2, Math.max(0.1, baseDensity + Math.sin(timestamp / 60000) * 0.1));
  
  const riskLevel = currentDensity < 0.4 ? "low" : 
    currentDensity < 0.6 ? "medium" : 
    currentDensity < 0.85 ? "high" : "critical";

  return {
    stationId,
    timestamp,
    currentDensity,
    maxDensity: 1.0,
    riskLevel,
    entryRate: Math.floor(50 + Math.random() * 100),
    exitRate: Math.floor(40 + Math.random() * 90),
    platformLoad: Array(station.platforms).fill(0).map(() => 
      Math.min(1, 0.2 + Math.random() * 0.6)
    ),
  };
};

export const generateMockTrainSchedules = (stationId: string, timestamp: number): TrainSchedule[] => {
  const now = timestamp;
  const trains: TrainSchedule[] = [];
  
  for (let i = 0; i < 5; i++) {
    const isDelayed = Math.random() > 0.8;
    const delayMinutes = isDelayed ? Math.floor(Math.random() * 5) + 1 : 0;
    
    trains.push({
      id: `train-${Date.now()}-${i}`,
      line: "1号线",
      stationId,
      arrivalTime: now + (i * 3 * 60000) + (delayMinutes * 60000),
      departureTime: now + (i * 3 * 60000) + (delayMinutes * 60000) + 30000,
      capacity: 1000,
      currentLoad: Math.min(1, 0.3 + Math.random() * 0.6),
      status: isDelayed ? "delayed" : "on-time",
    });
  }
  
  return trains;
};

export const generateMockCapacityPrediction = (
  stationId: string, 
  crowdPressure: CrowdPressure,
  trainSchedules: TrainSchedule[]
): CapacityPrediction => {
  const serviceRate = trainSchedules.length * (trainSchedules[0]?.capacity || 1000) / 3;
  const arrivalRate = crowdPressure.entryRate;
  
  const trafficIntensity = arrivalRate / serviceRate;
  const queueLength = trafficIntensity > 1 
    ? (arrivalRate - serviceRate) * 5 
    : (trafficIntensity * trafficIntensity) / (1 - trafficIntensity);
  
  const averageWaitTime = queueLength / arrivalRate;
  const utilization = Math.min(1, trafficIntensity);
  const capacityGap = Math.max(0, arrivalRate - serviceRate * 0.85);

  return {
    stationId,
    timestamp: Date.now(),
    predictedArrivalRate: arrivalRate,
    predictedServiceRate: serviceRate,
    averageWaitTime: isFinite(averageWaitTime) ? averageWaitTime : 999,
    queueLength: isFinite(queueLength) ? queueLength : 9999,
    utilization,
    capacityGap,
    confidence: 0.7 + Math.random() * 0.25,
  };
};
