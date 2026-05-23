import { Location, AlgorithmType, OptimizationGoal, TransportMode, TSPSolveRequest, TSPResult, PathSegment, DailyItinerary, ItineraryActivity } from '@/lib/types';
import { generateId, parseTimeString, getDayEndTime, formatDate, formatTime } from '@/lib/utils/helpers';
import { buildDistanceMatrix } from './distance-matrix';
import { DEFAULT_CONFIG, AlgorithmResult } from './types';
import { solveNearestNeighbor } from './algorithms/nearest-neighbor';
import { solveGenetic } from './algorithms/genetic';
import { solveSimulatedAnnealing } from './algorithms/simulated-annealing';
import { solveAntColony } from './algorithms/ant-colony';
import { addDays, differenceInDays, isAfter, addMinutes } from 'date-fns';

export interface OptimizeOptions {
  generateAlternatives?: boolean;
  onProgress?: (algorithm: AlgorithmType, progress: number, extra?: Record<string, unknown>) => void;
}

export class TSPOptimizer {
  private request: TSPSolveRequest;
  private abortController: AbortController;

  constructor(request: TSPSolveRequest) {
    this.request = request;
    this.abortController = new AbortController();
  }

  async optimize(
    options: OptimizeOptions = {}
  ): Promise<TSPResult> {
    const { generateAlternatives = false, onProgress } = options;
    const { locations, transportMode, algorithm, optimizationGoal } = this.request;

    if (locations.length < 2) {
      return this.buildResult(locations, [], 0, 0, 0, algorithm);
    }

    const matrix = buildDistanceMatrix(locations, transportMode);
    const mainResult = await this.runAlgorithm(algorithm, matrix, optimizationGoal, onProgress);

    let alternativePaths: TSPResult[] = [];
    if (generateAlternatives && locations.length > 3) {
      alternativePaths = await this.generateAlternatives(matrix, optimizationGoal);
    }

    return this.buildResult(
      mainResult.path,
      mainResult.path.map((_, idx) => idx < mainResult.path.length - 1 ? this.createSegment(mainResult.path[idx], mainResult.path[idx + 1], matrix, transportMode) : null).filter(Boolean) as PathSegment[],
      mainResult.distance,
      mainResult.duration,
      mainResult.cost,
      algorithm,
      mainResult.fitness,
      alternativePaths
    );
  }

  private async runAlgorithm(
    algorithm: AlgorithmType,
    matrix: ReturnType<typeof buildDistanceMatrix>,
    goal: OptimizationGoal,
    onProgress?: (algorithm: AlgorithmType, progress: number, extra?: Record<string, unknown>) => void
  ): Promise<AlgorithmResult> {
    const progressWrapper = (iteration: number, progress: number, ...extra: unknown[]) => {
      const extraObj = extra.length > 0 && typeof extra[0] === 'object' ? extra[0] as Record<string, unknown> : undefined;
      onProgress?.(algorithm, progress, extraObj);
    };

    switch (algorithm) {
      case 'nearest_neighbor':
        return solveNearestNeighbor(matrix, goal, progressWrapper);
      case 'genetic':
        return solveGenetic(matrix, goal, progressWrapper);
      case 'simulated_annealing':
        return solveSimulatedAnnealing(matrix, goal, progressWrapper);
      case 'ant_colony':
        return solveAntColony(matrix, goal, progressWrapper);
      default:
        return solveNearestNeighbor(matrix, goal, progressWrapper);
    }
  }

  private async generateAlternatives(
    matrix: ReturnType<typeof buildDistanceMatrix>,
    goal: OptimizationGoal
  ): Promise<TSPResult[]> {
    const alternatives: TSPResult[] = [];
    const algorithms: AlgorithmType[] = ['genetic', 'simulated_annealing', 'ant_colony'];

    for (const alg of algorithms.slice(0, 2)) {
      try {
        const result = await this.runAlgorithm(alg, matrix, goal);
        alternatives.push(
          this.buildResult(
            result.path,
            result.path.map((_, idx) => 
              idx < result.path.length - 1 ? 
                this.createSegment(result.path[idx], result.path[idx + 1], matrix, this.request.transportMode) : null
            ).filter(Boolean) as PathSegment[],
            result.distance,
            result.duration,
            result.cost,
            alg,
            result.fitness,
            []
          )
        );
      } catch (e) {
        console.warn(`Alternative algorithm ${alg} failed:`, e);
      }
    }

    return alternatives;
  }

  private createSegment(
    from: Location,
    to: Location,
    matrix: ReturnType<typeof buildDistanceMatrix>,
    mode: TransportMode
  ): PathSegment {
    const fromIdx = matrix.locations.findIndex(l => l.id === from.id);
    const toIdx = matrix.locations.findIndex(l => l.id === to.id);
    const distance = fromIdx !== -1 && toIdx !== -1 ? matrix.distances[fromIdx][toIdx] : 0;
    const duration = fromIdx !== -1 && toIdx !== -1 ? matrix.durations[fromIdx][toIdx] : 0;

    return {
      id: generateId(),
      from,
      to,
      distance,
      duration,
      cost: distance * 0.001,
      mode,
      polyline: this.generatePolyline(from.coordinates, to.coordinates),
    };
  }

  private generatePolyline(from: { lat: number; lng: number }, to: { lat: number; lng: number }): string {
    const points = [from, to];
    return btoa(JSON.stringify(points));
  }

  private buildResult(
    path: Location[],
    segments: PathSegment[],
    totalDistance: number,
    totalDuration: number,
    totalCost: number,
    algorithmUsed: AlgorithmType,
    fitnessScore: number = 0,
    alternativePaths: TSPResult[] = []
  ): TSPResult {
    const dailyItineraries = this.generateDailyItineraries(path, segments);

    return {
      id: generateId(),
      optimalPath: path,
      optimizedOrder: path,
      totalDistance,
      totalDuration,
      totalTime: totalDuration,
      totalCost,
      segments,
      routeLegs: segments,
      dailyItineraries,
      algorithmUsed,
      fitnessScore,
      alternativePaths,
    };
  }

  public generateDailyItineraries(
    path: Location[],
    segments: PathSegment[]
  ): DailyItinerary[] {
    const { startDate, endDate, constraints } = this.request;
    const itineraries: DailyItinerary[] = [];
    
    if (!startDate || !endDate) {
      return [this.createSingleDayItinerary(path, segments, new Date())];
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    const totalDays = Math.max(1, differenceInDays(end, start) + 1);
    const dailyStart = parseTimeString(constraints.dailyHours.start);
    const dailyEnd = parseTimeString(constraints.dailyHours.end);

    let currentDate = new Date(start);
    let locationIndex = 0;
    let dayStartMinutes = dailyStart.hours * 60 + dailyStart.minutes;
    const dayEndMinutes = dailyEnd.hours * 60 + dailyEnd.minutes;

    while (currentDate <= end && locationIndex < path.length) {
      const dayLocations: Location[] = [];
      let currentMinutes = dayStartMinutes;
      let dayDistance = 0;
      let dayDuration = 0;

      while (locationIndex < path.length) {
        const location = path[locationIndex];
        let arrivalMinutes = currentMinutes;

        if (dayLocations.length > 0) {
          const lastLoc = dayLocations[dayLocations.length - 1];
          const segment = segments.find(s => s.from.id === lastLoc.id && s.to.id === location.id);
          if (segment) {
            arrivalMinutes = currentMinutes + segment.duration;
            dayDistance += segment.distance;
            dayDuration += segment.duration;
          }
        }

        const departureMinutes = arrivalMinutes + location.duration;

        if (departureMinutes > dayEndMinutes && dayLocations.length > 0) {
          break;
        }

        dayLocations.push({ ...location, orderIndex: dayLocations.length });
        dayDuration += location.duration;
        currentMinutes = departureMinutes;
        locationIndex++;
      }

      if (dayLocations.length > 0) {
        const daySegments = segments.filter(s => 
          dayLocations.some(dl => dl.id === s.from.id) && 
          dayLocations.some(dl => dl.id === s.to.id)
        );
        const activities = this.generateActivities(dayLocations, daySegments, dayStartMinutes);
        
        itineraries.push({
          id: generateId(),
          date: formatDate(currentDate),
          locations: dayLocations,
          activities,
          startTime: this.minutesToTime(dayStartMinutes),
          endTime: this.minutesToTime(Math.min(currentMinutes, dayEndMinutes)),
          totalDistance: dayDistance,
          totalDuration: dayDuration,
          summary: `${dayLocations.length} 个目的地，总距离 ${(dayDistance / 1000).toFixed(1)} km`,
        });
      }

      currentDate = addDays(currentDate, 1);
      dayStartMinutes = dailyStart.hours * 60 + dailyStart.minutes;
    }

    if (locationIndex < path.length) {
      const remainingLocations = path.slice(locationIndex);
      const lastDate = itineraries.length > 0 ? new Date(itineraries[itineraries.length - 1].date) : currentDate;
      itineraries.push(this.createSingleDayItinerary(remainingLocations, segments, lastDate));
    }

    return itineraries;
  }

  private createSingleDayItinerary(
    locations: Location[],
    segments: PathSegment[],
    date: Date
  ): DailyItinerary {
    const totalDistance = segments.reduce((sum, s) => sum + s.distance, 0);
    const totalDuration = locations.reduce((sum, l) => sum + l.duration, 0) + 
                          segments.reduce((sum, s) => sum + s.duration, 0);
    const dayStartMinutes = 9 * 60;
    const activities = this.generateActivities(locations, segments, dayStartMinutes);

    return {
      id: generateId(),
      date: formatDate(date),
      locations: locations.map((loc, idx) => ({ ...loc, orderIndex: idx })),
      activities,
      startTime: '09:00',
      endTime: '18:00',
      totalDistance,
      totalDuration,
      summary: `${locations.length} 个目的地，总距离 ${(totalDistance / 1000).toFixed(1)} km`,
    };
  }

  private generateActivities(
    locations: Location[],
    segments: PathSegment[],
    dayStartMinutes: number
  ): ItineraryActivity[] {
    const activities: ItineraryActivity[] = [];
    let currentMinutes = dayStartMinutes;

    for (let i = 0; i < locations.length; i++) {
      const location = locations[i];
      
      if (i > 0) {
        const prevLocation = locations[i - 1];
        const segment = segments.find(s => s.from.id === prevLocation.id && s.to.id === location.id);
        if (segment) {
          activities.push({
            id: generateId(),
            type: 'travel',
            locationName: `前往 ${location.name}`,
            address: segment.to.address,
            coordinates: segment.to.coordinates,
            transportMode: segment.mode,
            startTime: this.minutesToTime(currentMinutes),
            endTime: this.minutesToTime(currentMinutes + segment.duration),
            duration: segment.duration,
            distance: segment.distance,
            description: `从 ${prevLocation.name} 前往 ${location.name}`,
          });
          currentMinutes += segment.duration;
        }
      }

      activities.push({
        id: generateId(),
        type: 'visit',
        location,
        locationName: location.name,
        address: location.address,
        coordinates: location.coordinates,
        startTime: this.minutesToTime(currentMinutes),
        endTime: this.minutesToTime(currentMinutes + location.duration),
        duration: location.duration,
        description: `参观 ${location.name}`,
      });
      currentMinutes += location.duration;
    }

    return activities;
  }

  private minutesToTime(minutes: number): string {
    const hours = Math.floor(minutes / 60) % 24;
    const mins = Math.round(minutes % 60);
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  }

  abort(): void {
    this.abortController.abort();
  }

  static getDefaultConfig(algorithm: AlgorithmType) {
    return DEFAULT_CONFIG[algorithm] || DEFAULT_CONFIG.nearest_neighbor;
  }
}

export const optimizePath = async (
  request: TSPSolveRequest,
  options?: OptimizeOptions
): Promise<TSPResult> => {
  const optimizer = new TSPOptimizer(request);
  return optimizer.optimize(options);
};
