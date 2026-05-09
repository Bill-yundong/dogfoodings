import {
  FlightState,
  FlightPlan,
  FlightRoute,
  Coordinate,
  ConflictDetectionResult,
  MitigationAction,
} from "@/lib/types";
import { v4 as uuidv4 } from "uuid";

const MIN_HORIZONTAL_SEPARATION = 5;
const MIN_VERTICAL_SEPARATION = 300;
const PREDICTION_WINDOW_MINUTES = 10;
const CONFLICT_CHECK_INTERVAL = 5000;

interface FlightPrediction {
  flightPlanId: string;
  positions: Array<{
    time: number;
    coordinate: Coordinate;
    altitude: number;
  }>;
}

interface ConflictContext {
  flight1: {
    state: FlightState;
    plan: FlightPlan;
    route: FlightRoute;
  };
  flight2: {
    state: FlightState;
    plan: FlightPlan;
    route: FlightRoute;
  };
}

export class ConflictDetectionEngine {
  private activeFlightStates: Map<string, FlightState> = new Map();
  private flightPlans: Map<string, FlightPlan> = new Map();
  private flightRoutes: Map<string, FlightRoute> = new Map();
  private detectedConflicts: Map<string, ConflictDetectionResult> = new Map();
  private isRunning = false;
  private checkInterval: number | null = null;
  private conflictListeners: Array<
    (conflict: ConflictDetectionResult) => void
  > = [];
  private mitigationListeners: Array<
    (mitigation: MitigationAction) => void
  > = [];

  updateFlightState(state: FlightState): void {
    this.activeFlightStates.set(state.flightPlanId, state);
  }

  updateFlightPlan(plan: FlightPlan): void {
    this.flightPlans.set(plan.id, plan);
  }

  updateFlightRoute(route: FlightRoute): void {
    this.flightRoutes.set(route.id, route);
  }

  removeFlight(flightPlanId: string): void {
    this.activeFlightStates.delete(flightPlanId);
    this.flightPlans.delete(flightPlanId);
  }

  start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.checkInterval = window.setInterval(() => {
      this.runConflictDetection();
    }, CONFLICT_CHECK_INTERVAL);
  }

  stop(): void {
    this.isRunning = false;
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  addConflictListener(
    listener: (conflict: ConflictDetectionResult) => void
  ): void {
    this.conflictListeners.push(listener);
  }

  addMitigationListener(
    listener: (mitigation: MitigationAction) => void
  ): void {
    this.mitigationListeners.push(listener);
  }

  private async runConflictDetection(): Promise<void> {
    const activeFlights = Array.from(this.activeFlightStates.values());
    
    if (activeFlights.length < 2) return;

    const predictions = this.predictFlightTrajectories(activeFlights);

    for (let i = 0; i < predictions.length; i++) {
      for (let j = i + 1; j < predictions.length; j++) {
        const conflict = this.detectConflictBetween(
          predictions[i],
          predictions[j]
        );

        if (conflict) {
          const existingConflict = this.detectedConflicts.get(conflict.id);
          if (!existingConflict) {
            this.detectedConflicts.set(conflict.id, conflict);
            this.notifyConflictListeners(conflict);
            await this.initiateMitigation(conflict);
          }
        }
      }
    }

    this.cleanupResolvedConflicts();
  }

  private predictFlightTrajectories(
    flightStates: FlightState[]
  ): FlightPrediction[] {
    const now = Date.now();
    const predictions: FlightPrediction[] = [];

    for (const state of flightStates) {
      const plan = this.flightPlans.get(state.flightPlanId);
      const route = plan ? this.flightRoutes.get(plan.routeId) : null;

      const positions = this.generatePredictedPositions(
        state,
        route,
        now,
        PREDICTION_WINDOW_MINUTES
      );

      predictions.push({
        flightPlanId: state.flightPlanId,
        positions,
      });
    }

    return predictions;
  }

  private generatePredictedPositions(
    state: FlightState,
    route: FlightRoute | undefined,
    startTime: number,
    windowMinutes: number
  ): FlightPrediction["positions"] {
    const positions: FlightPrediction["positions"] = [];
    const timeStep = 30000;

    for (let offset = 0; offset <= windowMinutes * 60000; offset += timeStep) {
      const time = startTime + offset;
      const coordinate = this.predictPositionAtTime(
        state,
        route,
        offset
      );

      positions.push({
        time,
        coordinate,
        altitude: state.altitude + state.verticalSpeed * (offset / 60000),
      });
    }

    return positions;
  }

  private predictPositionAtTime(
    state: FlightState,
    route: FlightRoute | undefined,
    timeOffsetMs: number
  ): Coordinate {
    const timeOffsetHours = timeOffsetMs / 3600000;
    const distanceTraveled = (state.speed / 1.852) * timeOffsetHours;

    const headingRad = (state.heading * Math.PI) / 180;
    const latChange = (distanceTraveled * Math.cos(headingRad)) / 60;
    const lngChange =
      (distanceTraveled * Math.sin(headingRad)) /
      (60 * Math.cos((state.position.lat * Math.PI) / 180));

    return {
      lat: state.position.lat + latChange,
      lng: state.position.lng + lngChange,
      altitude: state.altitude + state.verticalSpeed * (timeOffsetMs / 60000),
    };
  }

  private detectConflictBetween(
    pred1: FlightPrediction,
    pred2: FlightPrediction
  ): ConflictDetectionResult | null {
    let earliestConflict: {
      time: number;
      location: Coordinate;
      horizontalDistance: number;
      verticalDistance: number;
    } | null = null;

    for (const pos1 of pred1.positions) {
      const matchingPos2 = pred2.positions.find(
        (p2) => Math.abs(p2.time - pos1.time) < 5000
      );

      if (!matchingPos2) continue;

      const horizontalDist = this.calculateHorizontalDistance(
        pos1.coordinate,
        matchingPos2.coordinate
      );

      const verticalDist = Math.abs(pos1.altitude - matchingPos2.altitude);

      const riskLevel = this.assessRiskLevel(horizontalDist, verticalDist);

      if (
        riskLevel === "medium" ||
        riskLevel === "high" ||
        riskLevel === "critical"
      ) {
        if (
          !earliestConflict ||
          pos1.time < earliestConflict.time
        ) {
          earliestConflict = {
            time: pos1.time,
            location: {
              lat: (pos1.coordinate.lat + matchingPos2.coordinate.lat) / 2,
              lng: (pos1.coordinate.lng + matchingPos2.coordinate.lng) / 2,
              altitude: (pos1.altitude + matchingPos2.altitude) / 2,
            },
            horizontalDistance: horizontalDist,
            verticalDistance: verticalDist,
          };
        }
      }
    }

    if (!earliestConflict) return null;

    const finalRiskLevel = this.assessRiskLevel(
      earliestConflict.horizontalDistance,
      earliestConflict.verticalDistance
    );

    return {
      id: this.generateConflictId(pred1.flightPlanId, pred2.flightPlanId),
      timestamp: Date.now(),
      flightPlanId1: pred1.flightPlanId,
      flightPlanId2: pred2.flightPlanId,
      predictedTime: earliestConflict.time,
      predictedLocation: earliestConflict.location,
      horizontalDistance: earliestConflict.horizontalDistance,
      verticalDistance: earliestConflict.verticalDistance,
      riskLevel: finalRiskLevel,
      status: "detected",
    };
  }

  private calculateHorizontalDistance(
    coord1: Coordinate,
    coord2: Coordinate
  ): number {
    const R = 6371;
    const dLat = ((coord2.lat - coord1.lat) * Math.PI) / 180;
    const dLng = ((coord2.lng - coord1.lng) * Math.PI) / 180;

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((coord1.lat * Math.PI) / 180) *
        Math.cos((coord2.lat * Math.PI) / 180) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }

  private assessRiskLevel(
    horizontalDist: number,
    verticalDist: number
  ): ConflictDetectionResult["riskLevel"] {
    const horizontalRatio = horizontalDist / MIN_HORIZONTAL_SEPARATION;
    const verticalRatio = verticalDist / MIN_VERTICAL_SEPARATION;

    const minRatio = Math.min(horizontalRatio, verticalRatio);

    if (minRatio <= 0.3) return "critical";
    if (minRatio <= 0.5) return "high";
    if (minRatio <= 0.8) return "medium";
    return "low";
  }

  private async initiateMitigation(
    conflict: ConflictDetectionResult
  ): Promise<void> {
    const state1 = this.activeFlightStates.get(conflict.flightPlanId1);
    const state2 = this.activeFlightStates.get(conflict.flightPlanId2);

    if (!state1 || !state2) return;

    const mitigation = this.determineMitigationStrategy(conflict, state1, state2);

    if (mitigation) {
      this.detectedConflicts.set(conflict.id, {
        ...conflict,
        status: "mitigation_in_progress",
      });

      this.notifyMitigationListeners(mitigation);

      setTimeout(() => {
        const updatedConflict = this.detectedConflicts.get(conflict.id);
        if (updatedConflict) {
          this.detectedConflicts.set(conflict.id, {
            ...updatedConflict,
            status: "resolved",
          });
        }
      }, 10000);
    }
  }

  private determineMitigationStrategy(
    conflict: ConflictDetectionResult,
    state1: FlightState,
    state2: FlightState
  ): MitigationAction | null {
    if (conflict.riskLevel === "critical" || conflict.riskLevel === "high") {
      const altitudeChange = state1.altitude > state2.altitude ? 500 : -500;

      return {
        id: uuidv4(),
        conflictId: conflict.id,
        flightPlanId: conflict.flightPlanId1,
        actionType: "altitude_change",
        parameters: {
          newAltitude: state1.altitude + altitudeChange,
          rate: 1000,
        },
        startTime: Date.now(),
        endTime: Date.now() + 30000,
        status: "active",
      };
    } else if (conflict.riskLevel === "medium") {
      return {
        id: uuidv4(),
        conflictId: conflict.id,
        flightPlanId: conflict.flightPlanId1,
        actionType: "speed_change",
        parameters: {
          speedAdjustment: state1.speed > state2.speed ? -20 : 20,
        },
        startTime: Date.now(),
        endTime: Date.now() + 60000,
        status: "active",
      };
    }

    return null;
  }

  private cleanupResolvedConflicts(): void {
    const now = Date.now();
    const maxAge = 3600000;

    for (const [id, conflict] of this.detectedConflicts.entries()) {
      if (
        conflict.status === "resolved" &&
        now - conflict.timestamp > maxAge
      ) {
        this.detectedConflicts.delete(id);
      }
    }
  }

  private generateConflictId(
    flightId1: string,
    flightId2: string
  ): string {
    const sorted = [flightId1, flightId2].sort();
    return `conflict-${sorted[0]}-${sorted[1]}-${Date.now()}`;
  }

  private notifyConflictListeners(
    conflict: ConflictDetectionResult
  ): void {
    for (const listener of this.conflictListeners) {
      listener(conflict);
    }
  }

  private notifyMitigationListeners(
    mitigation: MitigationAction
  ): void {
    for (const listener of this.mitigationListeners) {
      listener(mitigation);
    }
  }

  getActiveConflicts(): ConflictDetectionResult[] {
    return Array.from(this.detectedConflicts.values()).filter(
      (c) => c.status !== "resolved"
    );
  }

  getAllConflicts(): ConflictDetectionResult[] {
    return Array.from(this.detectedConflicts.values());
  }

  runImmediateCheck(): ConflictDetectionResult[] {
    this.runConflictDetection();
    return this.getActiveConflicts();
  }
}

export const conflictDetectionEngine = new ConflictDetectionEngine();
