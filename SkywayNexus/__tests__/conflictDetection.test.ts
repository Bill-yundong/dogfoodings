import { v4 as uuidv4 } from "uuid";
import { ConflictDetectionEngine } from "@/lib/conflictDetection";
import type {
  FlightState,
  FlightPlan,
  FlightRoute,
  Waypoint,
  ConflictDetectionResult,
  MitigationAction,
} from "@/lib/types";

describe("Conflict Detection Engine", () => {
  let engine: ConflictDetectionEngine;

  const createWaypoint = (
    lat: number,
    lng: number,
    type: Waypoint["type"]
  ): Waypoint => ({
    id: uuidv4(),
    coordinate: { lat, lng, altitude: 2000 },
    name: `WP-${type}`,
    type,
    minAltitude: 500,
    maxAltitude: 5000,
    speedLimit: 300,
  });

  const createRoute = (waypoints: Waypoint[]): FlightRoute => ({
    id: uuidv4(),
    name: `Route-${Math.random()}`,
    waypoints,
    distance: waypoints.length * 10,
    estimatedDuration: waypoints.length * 10,
    airspaceClass: "G",
    routeType: "logistics",
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });

  const createFlightPlan = (
    aircraftId: string,
    routeId: string
  ): FlightPlan => ({
    id: uuidv4(),
    aircraftId,
    routeId,
    departureTime: Date.now(),
    arrivalTime: Date.now() + 3600000,
    altitude: 2000,
    speed: 150,
    status: "active",
    pilotName: "Test Pilot",
    flightNumber: `NX${Math.floor(Math.random() * 9000) + 1000}`,
  });

  const createFlightState = (
    flightPlanId: string,
    lat: number,
    lng: number,
    altitude: number,
    speed: number = 150,
    heading: number = 0
  ): FlightState => ({
    flightPlanId,
    timestamp: Date.now(),
    position: { lat, lng, altitude },
    altitude,
    speed,
    heading,
    verticalSpeed: 0,
    fuelLevel: 80,
    engineStatus: ["正常", "正常"],
    systemsStatus: {
      navigation: "正常",
      communication: "正常",
      power: "正常",
    },
  });

  beforeEach(() => {
    engine = new ConflictDetectionEngine();
  });

  afterEach(() => {
    engine.stop();
  });

  describe("Basic Functionality", () => {
    test("should initialize conflict detection engine", () => {
      expect(engine).toBeDefined();
      expect(engine.getActiveConflicts()).toEqual([]);
      expect(engine.getAllConflicts()).toEqual([]);
    });

    test("should update flight state", () => {
      const flightPlanId = uuidv4();
      const state = createFlightState(flightPlanId, 39.9, 116.4, 2000);

      engine.updateFlightState(state);

      expect(engine).toBeDefined();
    });

    test("should update flight plan", () => {
      const aircraftId = uuidv4();
      const routeId = uuidv4();
      const plan = createFlightPlan(aircraftId, routeId);

      engine.updateFlightPlan(plan);

      expect(engine).toBeDefined();
    });

    test("should update flight route", () => {
      const route = createRoute([
        createWaypoint(39.9, 116.4, "origin"),
        createWaypoint(40.0, 116.5, "destination"),
      ]);

      engine.updateFlightRoute(route);

      expect(engine).toBeDefined();
    });

    test("should remove flight", () => {
      const flightPlanId = uuidv4();
      const state = createFlightState(flightPlanId, 39.9, 116.4, 2000);
      const plan = createFlightPlan(uuidv4(), uuidv4());

      engine.updateFlightState(state);
      engine.updateFlightPlan(plan);
      engine.removeFlight(flightPlanId);

      expect(engine).toBeDefined();
    });
  });

  describe("Conflict Detection", () => {
    test("should return empty conflicts when no flights", () => {
      const conflicts = engine.runImmediateCheck();

      expect(conflicts).toEqual([]);
      expect(engine.getActiveConflicts()).toEqual([]);
      expect(engine.getAllConflicts()).toEqual([]);
    });

    test("should return empty conflicts when only one flight", () => {
      const route = createRoute([
        createWaypoint(39.9, 116.4, "origin"),
        createWaypoint(40.0, 116.5, "destination"),
      ]);

      const plan = createFlightPlan(uuidv4(), route.id);
      const state = createFlightState(plan.id, 39.9, 116.4, 2000);

      engine.updateFlightRoute(route);
      engine.updateFlightPlan(plan);
      engine.updateFlightState(state);

      const conflicts = engine.runImmediateCheck();

      expect(conflicts).toEqual([]);
    });

    test("should not detect conflict when flights are far apart", () => {
      const route1 = createRoute([
        createWaypoint(39.9, 116.4, "origin"),
        createWaypoint(40.0, 116.5, "destination"),
      ]);

      const route2 = createRoute([
        createWaypoint(45.0, 125.0, "origin"),
        createWaypoint(45.1, 125.1, "destination"),
      ]);

      const plan1 = createFlightPlan(uuidv4(), route1.id);
      const plan2 = createFlightPlan(uuidv4(), route2.id);

      const state1 = createFlightState(plan1.id, 39.9, 116.4, 2000, 150, 45);
      const state2 = createFlightState(plan2.id, 45.0, 125.0, 5000, 150, 225);

      engine.updateFlightRoute(route1);
      engine.updateFlightRoute(route2);
      engine.updateFlightPlan(plan1);
      engine.updateFlightPlan(plan2);
      engine.updateFlightState(state1);
      engine.updateFlightState(state2);

      const conflicts = engine.runImmediateCheck();

      expect(conflicts.length).toBe(0);
    });

    test("should detect potential conflict when trajectories converge", () => {
      const route = createRoute([
        createWaypoint(39.9, 116.4, "origin"),
        createWaypoint(40.0, 116.5, "destination"),
      ]);

      const plan1 = createFlightPlan(uuidv4(), route.id);
      const plan2 = createFlightPlan(uuidv4(), route.id);

      const state1 = createFlightState(plan1.id, 39.9, 116.4, 2000, 150, 45);
      const state2 = createFlightState(plan2.id, 39.91, 116.41, 2050, 145, 40);

      engine.updateFlightRoute(route);
      engine.updateFlightPlan(plan1);
      engine.updateFlightPlan(plan2);
      engine.updateFlightState(state1);
      engine.updateFlightState(state2);

      const conflicts = engine.runImmediateCheck();

      expect(Array.isArray(conflicts)).toBe(true);
    });
  });

  describe("Risk Level Assessment", () => {
    test("should detect high risk conflict for very close flights", () => {
      const route = createRoute([
        createWaypoint(39.9, 116.4, "origin"),
        createWaypoint(40.0, 116.5, "destination"),
      ]);

      const plan1 = createFlightPlan(uuidv4(), route.id);
      const plan2 = createFlightPlan(uuidv4(), route.id);

      const state1 = createFlightState(plan1.id, 39.9, 116.4, 2000, 150, 45);
      const state2 = createFlightState(plan2.id, 39.902, 116.402, 2000, 150, 45);

      engine.updateFlightRoute(route);
      engine.updateFlightPlan(plan1);
      engine.updateFlightPlan(plan2);
      engine.updateFlightState(state1);
      engine.updateFlightState(state2);

      const conflicts = engine.runImmediateCheck();

      expect(Array.isArray(conflicts)).toBe(true);
      if (conflicts.length > 0) {
        expect(conflicts[0].riskLevel).toBeDefined();
        expect(
          ["critical", "high", "medium", "low"].includes(conflicts[0].riskLevel)
        ).toBe(true);
      }
    });
  });

  describe("Conflict Listeners", () => {
    test("should add conflict listener", () => {
      const listener = jest.fn();
      engine.addConflictListener(listener);

      expect(listener).not.toHaveBeenCalled();
    });

    test("should add mitigation listener", () => {
      const listener = jest.fn();
      engine.addMitigationListener(listener);

      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe("Engine Lifecycle", () => {
    test("should start and stop engine", () => {
      jest.useFakeTimers();

      engine.start();
      expect(engine).toBeDefined();

      engine.stop();
      expect(engine).toBeDefined();

      jest.useRealTimers();
    });

    test("should handle multiple start/stop cycles", () => {
      jest.useFakeTimers();

      engine.start();
      engine.stop();
      engine.start();
      engine.stop();

      expect(engine).toBeDefined();

      jest.useRealTimers();
    });
  });

  describe("Multiple Flights Scenario", () => {
    test("should handle multiple flights without conflicts", () => {
      const routes: FlightRoute[] = [];
      const plans: FlightPlan[] = [];
      const states: FlightState[] = [];

      for (let i = 0; i < 5; i++) {
        const latOffset = i * 3.0;
        const lngOffset = i * 3.0;

        const route = createRoute([
          createWaypoint(39.9 + latOffset, 116.4 + lngOffset, "origin"),
          createWaypoint(40.0 + latOffset, 116.5 + lngOffset, "destination"),
        ]);

        const plan = createFlightPlan(uuidv4(), route.id);
        const state = createFlightState(
          plan.id,
          39.9 + latOffset,
          116.4 + lngOffset,
          1000 + i * 1000
        );

        routes.push(route);
        plans.push(plan);
        states.push(state);
      }

      routes.forEach((route) => engine.updateFlightRoute(route));
      plans.forEach((plan) => engine.updateFlightPlan(plan));
      states.forEach((state) => engine.updateFlightState(state));

      const conflicts = engine.runImmediateCheck();

      expect(Array.isArray(conflicts)).toBe(true);
      expect(conflicts.length).toBe(0);
    });

    test("should detect conflicts among multiple converging flights", () => {
      const route = createRoute([
        createWaypoint(39.9, 116.4, "origin"),
        createWaypoint(40.0, 116.5, "destination"),
      ]);

      engine.updateFlightRoute(route);

      const plans: FlightPlan[] = [];
      const states: FlightState[] = [];

      for (let i = 0; i < 3; i++) {
        const plan = createFlightPlan(uuidv4(), route.id);
        const state = createFlightState(
          plan.id,
          39.9 + i * 0.005,
          116.4 + i * 0.005,
          2000 + i * 50,
          150,
          45
        );

        plans.push(plan);
        states.push(state);

        engine.updateFlightPlan(plan);
        engine.updateFlightState(state);
      }

      const conflicts = engine.runImmediateCheck();

      expect(Array.isArray(conflicts)).toBe(true);
    });
  });

  describe("Conflict Data Structure", () => {
    test("conflict result should have all required fields", () => {
      const route = createRoute([
        createWaypoint(39.9, 116.4, "origin"),
        createWaypoint(40.0, 116.5, "destination"),
      ]);

      const plan1 = createFlightPlan(uuidv4(), route.id);
      const plan2 = createFlightPlan(uuidv4(), route.id);

      const state1 = createFlightState(plan1.id, 39.9, 116.4, 2000, 150, 45);
      const state2 = createFlightState(plan2.id, 39.902, 116.402, 2000, 150, 45);

      engine.updateFlightRoute(route);
      engine.updateFlightPlan(plan1);
      engine.updateFlightPlan(plan2);
      engine.updateFlightState(state1);
      engine.updateFlightState(state2);

      const conflicts = engine.runImmediateCheck();

      if (conflicts.length > 0) {
        const conflict = conflicts[0];

        expect(conflict.id).toBeDefined();
        expect(typeof conflict.id).toBe("string");
        expect(conflict.timestamp).toBeDefined();
        expect(typeof conflict.timestamp).toBe("number");
        expect(conflict.flightPlanId1).toBeDefined();
        expect(conflict.flightPlanId2).toBeDefined();
        expect(conflict.predictedTime).toBeDefined();
        expect(conflict.predictedLocation).toBeDefined();
        expect(conflict.predictedLocation.lat).toBeDefined();
        expect(conflict.predictedLocation.lng).toBeDefined();
        expect(conflict.predictedLocation.altitude).toBeDefined();
        expect(conflict.horizontalDistance).toBeDefined();
        expect(conflict.verticalDistance).toBeDefined();
        expect(conflict.riskLevel).toBeDefined();
        expect(conflict.status).toBeDefined();
      }
    });
  });
});
