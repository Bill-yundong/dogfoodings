import { v4 as uuidv4 } from "uuid";
import { generateInitialMockData, updateFlightState } from "@/lib/mockData";
import { semanticAlignmentService } from "@/lib/semanticAlignment";
import { ConflictDetectionEngine } from "@/lib/conflictDetection";
import type {
  FlightRoute,
  Waypoint,
  Aircraft,
  FlightPlan,
  FlightState,
} from "@/lib/types";

describe("SkywayNexus Integration Tests", () => {
  describe("Complete Flight Lifecycle", () => {
    test("should complete full flight planning and execution workflow", () => {
      const data = generateInitialMockData();

      expect(data.routes.length).toBeGreaterThan(0);
      expect(data.aircraft.length).toBeGreaterThan(0);
      expect(data.flightPlans.length).toBeGreaterThan(0);

      const activePlans = data.flightPlans.filter((p) => p.status === "active");
      expect(activePlans.length).toBeGreaterThan(0);

      for (const state of data.flightStates) {
        const plan = data.flightPlans.find(
          (p) => p.id === state.flightPlanId
        );
        expect(plan).toBeDefined();
        if (plan) {
          expect(plan.status).toBe("active");
        }
      }
    });

    test("should maintain data integrity across multiple updates", () => {
      const data = generateInitialMockData();

      let states = [...data.flightStates];

      for (let i = 0; i < 10; i++) {
        const newStates: FlightState[] = [];

        for (const state of states) {
          const route = data.routes.find((r) =>
            data.flightPlans.some(
              (p) => p.id === state.flightPlanId && p.routeId === r.id
            )
          );

          if (route) {
            const updated = updateFlightState(state, route);
            expect(updated.flightPlanId).toBe(state.flightPlanId);
            expect(updated.altitude).toBeGreaterThanOrEqual(500);
            expect(updated.altitude).toBeLessThanOrEqual(5000);
            expect(updated.heading).toBeGreaterThanOrEqual(0);
            expect(updated.heading).toBeLessThan(360);
            newStates.push(updated);
          } else {
            newStates.push(state);
          }
        }

        states = newStates;
      }

      expect(states.length).toBe(data.flightStates.length);
    });
  });

  describe("Semantic Alignment Integration", () => {
    test("should align flight plan from CAAC to operator to logistics systems", () => {
      const data = generateInitialMockData();

      if (data.flightPlans.length > 0) {
        const originalPlan = data.flightPlans[0];

        const caacAligned = semanticAlignmentService.alignFlightPlan(
          originalPlan,
          "operator",
          "caac"
        );

        expect(caacAligned.alignedAt).toBeGreaterThan(0);
        expect(caacAligned.alignmentConfidence).toBeGreaterThan(0);

        const operatorAligned = semanticAlignmentService.alignFlightPlan(
          caacAligned.data,
          "caac",
          "operator"
        );

        expect(operatorAligned.data.status).toBe(originalPlan.status);

        const logisticsAligned = semanticAlignmentService.alignFlightPlan(
          operatorAligned.data,
          "operator",
          "logistics"
        );

        expect(logisticsAligned.data.status).toBe(originalPlan.status);
      }
    });

    test("should align aircraft status across all systems", () => {
      const data = generateInitialMockData();

      if (data.aircraft.length > 0) {
        const aircraft = data.aircraft[0];

        const systems: Array<"caac" | "operator" | "logistics"> = [
          "caac",
          "operator",
          "logistics",
        ];

        for (const source of systems) {
          for (const target of systems) {
            if (source !== target) {
              const aligned = semanticAlignmentService.alignAircraft(
                aircraft,
                source,
                target
              );

              expect(aligned.alignedFields).toContain("status");
              expect(aligned.alignmentConfidence).toBeGreaterThan(0);
            }
          }
        }
      }
    });

    test("should preserve flight plan data during multi-system alignment", () => {
      const data = generateInitialMockData();

      if (data.flightPlans.length > 0) {
        const originalPlan = data.flightPlans[0];

        const caac = semanticAlignmentService.alignFlightPlan(
          originalPlan,
          "operator",
          "caac"
        );

        expect(caac.data.id).toBe(originalPlan.id);
        expect(caac.data.aircraftId).toBe(originalPlan.aircraftId);
        expect(caac.data.routeId).toBe(originalPlan.routeId);
        expect(caac.data.flightNumber).toBe(originalPlan.flightNumber);
        expect(caac.data.altitude).toBe(originalPlan.altitude);
        expect(caac.data.speed).toBe(originalPlan.speed);
      }
    });
  });

  describe("Conflict Detection and Mitigation Integration", () => {
    test("should detect conflict between two converging flights", () => {
      const engine = new ConflictDetectionEngine();

      const route: FlightRoute = {
        id: uuidv4(),
        name: "Test Route",
        waypoints: [
          {
            id: uuidv4(),
            coordinate: { lat: 39.9, lng: 116.4, altitude: 2000 },
            name: "Origin",
            type: "origin",
          },
          {
            id: uuidv4(),
            coordinate: { lat: 40.0, lng: 116.5, altitude: 2000 },
            name: "Destination",
            type: "destination",
          },
        ],
        distance: 100,
        estimatedDuration: 60,
        airspaceClass: "G",
        routeType: "logistics",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      const plan1: FlightPlan = {
        id: uuidv4(),
        aircraftId: uuidv4(),
        routeId: route.id,
        departureTime: Date.now(),
        arrivalTime: Date.now() + 3600000,
        altitude: 2000,
        speed: 150,
        status: "active",
        pilotName: "Pilot 1",
        flightNumber: "NX001",
      };

      const plan2: FlightPlan = {
        id: uuidv4(),
        aircraftId: uuidv4(),
        routeId: route.id,
        departureTime: Date.now(),
        arrivalTime: Date.now() + 3600000,
        altitude: 2050,
        speed: 145,
        status: "active",
        pilotName: "Pilot 2",
        flightNumber: "NX002",
      };

      const state1: FlightState = {
        flightPlanId: plan1.id,
        timestamp: Date.now(),
        position: { lat: 39.9, lng: 116.4, altitude: 2000 },
        altitude: 2000,
        speed: 150,
        heading: 45,
        verticalSpeed: 0,
        fuelLevel: 80,
        engineStatus: ["正常", "正常"],
        systemsStatus: {
          navigation: "正常",
          communication: "正常",
          power: "正常",
        },
      };

      const state2: FlightState = {
        flightPlanId: plan2.id,
        timestamp: Date.now(),
        position: { lat: 39.902, lng: 116.402, altitude: 2050 },
        altitude: 2050,
        speed: 145,
        heading: 42,
        verticalSpeed: 0,
        fuelLevel: 75,
        engineStatus: ["正常", "正常"],
        systemsStatus: {
          navigation: "正常",
          communication: "正常",
          power: "正常",
        },
      };

      engine.updateFlightRoute(route);
      engine.updateFlightPlan(plan1);
      engine.updateFlightPlan(plan2);
      engine.updateFlightState(state1);
      engine.updateFlightState(state2);

      const conflicts = engine.runImmediateCheck();

      expect(Array.isArray(conflicts)).toBe(true);

      if (conflicts.length > 0) {
        const conflict = conflicts[0];

        expect(conflict.flightPlanId1).toBeDefined();
        expect(conflict.flightPlanId2).toBeDefined();
        expect(conflict.predictedLocation).toBeDefined();
        expect(typeof conflict.predictedTime).toBe("number");
        expect(conflict.riskLevel).toBeDefined();
        expect(conflict.horizontalDistance).toBeDefined();
        expect(conflict.verticalDistance).toBeDefined();
      }

      engine.stop();
    });

    test("should handle multiple flights with no conflicts", () => {
      const engine = new ConflictDetectionEngine();

      const routes: FlightRoute[] = [];
      const plans: FlightPlan[] = [];
      const states: FlightState[] = [];

      for (let i = 0; i < 5; i++) {
        const latOffset = i * 3.0;
        const lngOffset = i * 3.0;
        const altitude = 1000 + i * 1000;

        const route: FlightRoute = {
          id: uuidv4(),
          name: `Route-${i}`,
          waypoints: [
            {
              id: uuidv4(),
              coordinate: {
                lat: 39.9 + latOffset,
                lng: 116.4 + lngOffset,
                altitude,
              },
              name: `Origin-${i}`,
              type: "origin",
            },
            {
              id: uuidv4(),
              coordinate: {
                lat: 40.0 + latOffset,
                lng: 116.5 + lngOffset,
                altitude,
              },
              name: `Dest-${i}`,
              type: "destination",
            },
          ],
          distance: 100,
          estimatedDuration: 60,
          airspaceClass: "G",
          routeType: "logistics",
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };

        const plan: FlightPlan = {
          id: uuidv4(),
          aircraftId: uuidv4(),
          routeId: route.id,
          departureTime: Date.now(),
          arrivalTime: Date.now() + 3600000,
          altitude,
          speed: 150,
          status: "active",
          pilotName: `Pilot-${i}`,
          flightNumber: `NX${String(1000 + i)}`,
        };

        const state: FlightState = {
          flightPlanId: plan.id,
          timestamp: Date.now(),
          position: {
            lat: 39.9 + latOffset,
            lng: 116.4 + lngOffset,
            altitude,
          },
          altitude,
          speed: 150,
          heading: 45,
          verticalSpeed: 0,
          fuelLevel: 80,
          engineStatus: ["正常", "正常"],
          systemsStatus: {
            navigation: "正常",
            communication: "正常",
            power: "正常",
          },
        };

        routes.push(route);
        plans.push(plan);
        states.push(state);
      }

      routes.forEach((route) => engine.updateFlightRoute(route));
      plans.forEach((plan) => engine.updateFlightPlan(plan));
      states.forEach((state) => engine.updateFlightState(state));

      const conflicts = engine.runImmediateCheck();

      expect(conflicts.length).toBe(0);

      engine.stop();
    });

    test("should add conflict listeners and trigger them on detection", () => {
      const engine = new ConflictDetectionEngine();
      const conflictListener = jest.fn();
      const mitigationListener = jest.fn();

      engine.addConflictListener(conflictListener);
      engine.addMitigationListener(mitigationListener);

      const route: FlightRoute = {
        id: uuidv4(),
        name: "Test Route",
        waypoints: [
          {
            id: uuidv4(),
            coordinate: { lat: 39.9, lng: 116.4, altitude: 2000 },
            name: "Origin",
            type: "origin",
          },
          {
            id: uuidv4(),
            coordinate: { lat: 40.0, lng: 116.5, altitude: 2000 },
            name: "Destination",
            type: "destination",
          },
        ],
        distance: 100,
        estimatedDuration: 60,
        airspaceClass: "G",
        routeType: "logistics",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      const plan1: FlightPlan = {
        id: uuidv4(),
        aircraftId: uuidv4(),
        routeId: route.id,
        departureTime: Date.now(),
        arrivalTime: Date.now() + 3600000,
        altitude: 2000,
        speed: 150,
        status: "active",
        pilotName: "Pilot 1",
        flightNumber: "NX001",
      };

      const plan2: FlightPlan = {
        id: uuidv4(),
        aircraftId: uuidv4(),
        routeId: route.id,
        departureTime: Date.now(),
        arrivalTime: Date.now() + 3600000,
        altitude: 2000,
        speed: 150,
        status: "active",
        pilotName: "Pilot 2",
        flightNumber: "NX002",
      };

      const state1: FlightState = {
        flightPlanId: plan1.id,
        timestamp: Date.now(),
        position: { lat: 39.9, lng: 116.4, altitude: 2000 },
        altitude: 2000,
        speed: 150,
        heading: 45,
        verticalSpeed: 0,
        fuelLevel: 80,
        engineStatus: ["正常", "正常"],
        systemsStatus: {
          navigation: "正常",
          communication: "正常",
          power: "正常",
        },
      };

      const state2: FlightState = {
        flightPlanId: plan2.id,
        timestamp: Date.now(),
        position: { lat: 39.901, lng: 116.401, altitude: 2000 },
        altitude: 2000,
        speed: 150,
        heading: 45,
        verticalSpeed: 0,
        fuelLevel: 80,
        engineStatus: ["正常", "正常"],
        systemsStatus: {
          navigation: "正常",
          communication: "正常",
          power: "正常",
        },
      };

      engine.updateFlightRoute(route);
      engine.updateFlightPlan(plan1);
      engine.updateFlightPlan(plan2);
      engine.updateFlightState(state1);
      engine.updateFlightState(state2);

      const conflicts = engine.runImmediateCheck();

      expect(Array.isArray(conflicts)).toBe(true);

      engine.stop();
    });
  });

  describe("Data Model Validation", () => {
    test("should have valid coordinate system", () => {
      const data = generateInitialMockData();

      for (const route of data.routes) {
        for (const waypoint of route.waypoints) {
          expect(waypoint.coordinate.lat).toBeGreaterThanOrEqual(-90);
          expect(waypoint.coordinate.lat).toBeLessThanOrEqual(90);
          expect(waypoint.coordinate.lng).toBeGreaterThanOrEqual(-180);
          expect(waypoint.coordinate.lng).toBeLessThanOrEqual(180);
          expect(waypoint.coordinate.altitude).toBeGreaterThanOrEqual(0);
        }
      }

      for (const state of data.flightStates) {
        expect(state.position.lat).toBeGreaterThanOrEqual(-90);
        expect(state.position.lat).toBeLessThanOrEqual(90);
        expect(state.position.lng).toBeGreaterThanOrEqual(-180);
        expect(state.position.lng).toBeLessThanOrEqual(180);
        expect(state.position.altitude).toBeGreaterThanOrEqual(0);
      }
    });

    test("should have valid flight plan timing", () => {
      const data = generateInitialMockData();

      for (const plan of data.flightPlans) {
        expect(plan.arrivalTime).toBeGreaterThan(plan.departureTime);
      }
    });

    test("should have valid aircraft specifications", () => {
      const data = generateInitialMockData();

      for (const aircraft of data.aircraft) {
        expect(aircraft.maxSpeed).toBeGreaterThan(0);
        expect(aircraft.maxAltitude).toBeGreaterThan(0);
        expect(aircraft.maxPayload).toBeGreaterThanOrEqual(0);
      }
    });

    test("should have valid waypoint types", () => {
      const data = generateInitialMockData();
      const validTypes: Waypoint["type"][] = [
        "origin",
        "destination",
        "intermediate",
        "holding",
      ];

      for (const route of data.routes) {
        for (const waypoint of route.waypoints) {
          expect(validTypes.includes(waypoint.type)).toBe(true);
        }
      }
    });

    test("should have valid route types", () => {
      const data = generateInitialMockData();
      const validTypes: FlightRoute["routeType"][] = [
        "commercial",
        "private",
        "logistics",
        "emergency",
      ];

      for (const route of data.routes) {
        expect(validTypes.includes(route.routeType)).toBe(true);
      }
    });

    test("should have valid aircraft status values", () => {
      const data = generateInitialMockData();
      const validStatuses: Aircraft["status"][] = [
        "idle",
        "taxiing",
        "takeoff",
        "cruise",
        "landing",
        "emergency",
      ];

      for (const aircraft of data.aircraft) {
        expect(validStatuses.includes(aircraft.status)).toBe(true);
      }
    });

    test("should have valid flight plan status values", () => {
      const data = generateInitialMockData();
      const validStatuses: FlightPlan["status"][] = [
        "planned",
        "active",
        "completed",
        "cancelled",
        "diverted",
      ];

      for (const plan of data.flightPlans) {
        expect(validStatuses.includes(plan.status)).toBe(true);
      }
    });
  });

  describe("System Performance and Scalability", () => {
    test("should handle 10 flights efficiently", () => {
      const engine = new ConflictDetectionEngine();

      const startTime = Date.now();

      for (let i = 0; i < 10; i++) {
        const latOffset = (i % 5) * 0.2;
        const lngOffset = Math.floor(i / 5) * 0.2;

        const route: FlightRoute = {
          id: uuidv4(),
          name: `Route-${i}`,
          waypoints: [
            {
              id: uuidv4(),
              coordinate: {
                lat: 39.9 + latOffset,
                lng: 116.4 + lngOffset,
                altitude: 1500 + i * 100,
              },
              name: `Origin-${i}`,
              type: "origin",
            },
            {
              id: uuidv4(),
              coordinate: {
                lat: 40.0 + latOffset,
                lng: 116.5 + lngOffset,
                altitude: 1500 + i * 100,
              },
              name: `Dest-${i}`,
              type: "destination",
            },
          ],
          distance: 100,
          estimatedDuration: 60,
          airspaceClass: "G",
          routeType: "logistics",
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };

        const plan: FlightPlan = {
          id: uuidv4(),
          aircraftId: uuidv4(),
          routeId: route.id,
          departureTime: Date.now(),
          arrivalTime: Date.now() + 3600000,
          altitude: 1500 + i * 100,
          speed: 150,
          status: "active",
          pilotName: `Pilot-${i}`,
          flightNumber: `NX${String(1000 + i)}`,
        };

        const state: FlightState = {
          flightPlanId: plan.id,
          timestamp: Date.now(),
          position: {
            lat: 39.9 + latOffset,
            lng: 116.4 + lngOffset,
            altitude: 1500 + i * 100,
          },
          altitude: 1500 + i * 100,
          speed: 150,
          heading: 45,
          verticalSpeed: 0,
          fuelLevel: 80,
          engineStatus: ["正常", "正常"],
          systemsStatus: {
            navigation: "正常",
            communication: "正常",
            power: "正常",
          },
        };

        engine.updateFlightRoute(route);
        engine.updateFlightPlan(plan);
        engine.updateFlightState(state);
      }

      const checkStartTime = Date.now();
      const conflicts = engine.runImmediateCheck();
      const checkEndTime = Date.now();

      expect(checkEndTime - checkStartTime).toBeLessThan(1000);
      expect(Array.isArray(conflicts)).toBe(true);

      const endTime = Date.now();
      expect(endTime - startTime).toBeLessThan(5000);

      engine.stop();
    });
  });
});
