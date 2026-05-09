import { v4 as uuidv4 } from "uuid";
import {
  semanticAlignmentService,
} from "@/lib/semanticAlignment";
import type { FlightPlan, Aircraft, FlightRoute } from "@/lib/types";

const createFlightPlan = (status: FlightPlan["status"]): FlightPlan => ({
  id: uuidv4(),
  aircraftId: uuidv4(),
  routeId: uuidv4(),
  departureTime: Date.now(),
  arrivalTime: Date.now() + 3600000,
  altitude: 2000,
  speed: 150,
  status,
  pilotName: "Test Pilot",
  flightNumber: "NX1234",
});

describe("Semantic Alignment Service", () => {
  describe("Flight Plan Alignment", () => {

    test("should align flight plan from operator to CAAC system", () => {
      const plan = createFlightPlan("active");

      const result = semanticAlignmentService.alignFlightPlan(
        plan,
        "operator",
        "caac"
      );

      expect(result).toBeDefined();
      expect(result.alignedAt).toBeGreaterThan(0);
      expect(result.sourceSystem).toBe("operator");
      expect(result.alignedFields).toContain("status");
      expect(result.alignmentConfidence).toBeGreaterThanOrEqual(0.5);
      expect(result.data.id).toBe(plan.id);
    });

    test("should align flight plan from CAAC to operator system", () => {
      const plan = createFlightPlan("planned");

      const result = semanticAlignmentService.alignFlightPlan(
        plan,
        "caac",
        "operator"
      );

      expect(result).toBeDefined();
      expect(result.alignedAt).toBeGreaterThan(0);
      expect(result.sourceSystem).toBe("caac");
      expect(result.alignedFields).toContain("status");
      expect(result.alignmentConfidence).toBeGreaterThanOrEqual(0.5);
    });

    test("should align flight plan from logistics to CAAC system", () => {
      const plan = createFlightPlan("completed");

      const result = semanticAlignmentService.alignFlightPlan(
        plan,
        "logistics",
        "caac"
      );

      expect(result).toBeDefined();
      expect(result.alignedFields).toContain("status");
      expect(result.data.status).toBe("completed");
    });

    test("should preserve flight plan data during alignment", () => {
      const plan = createFlightPlan("cancelled");

      const result = semanticAlignmentService.alignFlightPlan(
        plan,
        "operator",
        "caac"
      );

      expect(result.data.id).toBe(plan.id);
      expect(result.data.aircraftId).toBe(plan.aircraftId);
      expect(result.data.routeId).toBe(plan.routeId);
      expect(result.data.flightNumber).toBe(plan.flightNumber);
      expect(result.data.pilotName).toBe(plan.pilotName);
      expect(result.data.altitude).toBe(plan.altitude);
      expect(result.data.speed).toBe(plan.speed);
    });

    test("should handle all flight status values correctly", () => {
      const statuses: FlightPlan["status"][] = [
        "planned",
        "active",
        "completed",
        "cancelled",
        "diverted",
      ];

      for (const status of statuses) {
        const plan = createFlightPlan(status);
        const result = semanticAlignmentService.alignFlightPlan(
          plan,
          "operator",
          "caac"
        );

        expect(result.data.status).toBe(status);
        expect(result.alignmentConfidence).toBeGreaterThan(0);
      }
    });
  });

  describe("Aircraft Alignment", () => {
    const createAircraft = (status: Aircraft["status"]): Aircraft => ({
      id: uuidv4(),
      registration: "CN-1234",
      type: "固定翼",
      model: "DJI M300",
      maxSpeed: 150,
      maxAltitude: 5000,
      maxPayload: 20,
      status,
    });

    test("should align aircraft from operator to CAAC system", () => {
      const aircraft = createAircraft("cruise");

      const result = semanticAlignmentService.alignAircraft(
        aircraft,
        "operator",
        "caac"
      );

      expect(result).toBeDefined();
      expect(result.alignedAt).toBeGreaterThan(0);
      expect(result.sourceSystem).toBe("operator");
      expect(result.alignedFields).toContain("status");
      expect(result.alignmentConfidence).toBeGreaterThanOrEqual(0.5);
    });

    test("should align aircraft from CAAC to logistics system", () => {
      const aircraft = createAircraft("idle");

      const result = semanticAlignmentService.alignAircraft(
        aircraft,
        "caac",
        "logistics"
      );

      expect(result).toBeDefined();
      expect(result.alignedFields).toContain("status");
      expect(result.data.status).toBe("idle");
    });

    test("should handle all aircraft status values correctly", () => {
      const statuses: Aircraft["status"][] = [
        "idle",
        "taxiing",
        "takeoff",
        "cruise",
        "landing",
        "emergency",
      ];

      for (const status of statuses) {
        const aircraft = createAircraft(status);
        const result = semanticAlignmentService.alignAircraft(
          aircraft,
          "operator",
          "caac"
        );

        expect(result.data.status).toBe(status);
        expect(result.alignmentConfidence).toBeGreaterThan(0);
      }
    });

    test("should preserve aircraft data during alignment", () => {
      const aircraft = createAircraft("takeoff");

      const result = semanticAlignmentService.alignAircraft(
        aircraft,
        "operator",
        "caac"
      );

      expect(result.data.id).toBe(aircraft.id);
      expect(result.data.registration).toBe(aircraft.registration);
      expect(result.data.model).toBe(aircraft.model);
      expect(result.data.type).toBe(aircraft.type);
      expect(result.data.maxSpeed).toBe(aircraft.maxSpeed);
      expect(result.data.maxAltitude).toBe(aircraft.maxAltitude);
      expect(result.data.maxPayload).toBe(aircraft.maxPayload);
    });
  });

  describe("Route Alignment", () => {
    const createRoute = (routeType: FlightRoute["routeType"]): FlightRoute => ({
      id: uuidv4(),
      name: "Test Route",
      waypoints: [
        {
          id: uuidv4(),
          coordinate: { lat: 39.9, lng: 116.4, altitude: 1000 },
          name: "WP1",
          type: "origin",
        },
        {
          id: uuidv4(),
          coordinate: { lat: 40.0, lng: 116.5, altitude: 1000 },
          name: "WP2",
          type: "destination",
        },
      ],
      distance: 100,
      estimatedDuration: 60,
      airspaceClass: "G",
      routeType,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    test("should align route from operator to CAAC system", () => {
      const route = createRoute("commercial");

      const result = semanticAlignmentService.alignRoute(
        route,
        "operator",
        "caac"
      );

      expect(result).toBeDefined();
      expect(result.alignedAt).toBeGreaterThan(0);
      expect(result.sourceSystem).toBe("operator");
      expect(result.alignedFields).toContain("routeType");
      expect(result.alignmentConfidence).toBeGreaterThanOrEqual(0.5);
    });

    test("should align route from logistics to operator system", () => {
      const route = createRoute("logistics");

      const result = semanticAlignmentService.alignRoute(
        route,
        "logistics",
        "operator"
      );

      expect(result).toBeDefined();
      expect(result.alignedFields).toContain("routeType");
      expect(result.data.routeType).toBe("logistics");
    });

    test("should handle all route types correctly", () => {
      const routeTypes: FlightRoute["routeType"][] = [
        "commercial",
        "private",
        "logistics",
        "emergency",
      ];

      for (const routeType of routeTypes) {
        const route = createRoute(routeType);
        const result = semanticAlignmentService.alignRoute(
          route,
          "operator",
          "caac"
        );

        expect(result.data.routeType).toBe(routeType);
        expect(result.alignmentConfidence).toBeGreaterThan(0);
      }
    });

    test("should preserve route data during alignment", () => {
      const route = createRoute("emergency");

      const result = semanticAlignmentService.alignRoute(
        route,
        "operator",
        "caac"
      );

      expect(result.data.id).toBe(route.id);
      expect(result.data.name).toBe(route.name);
      expect(result.data.distance).toBe(route.distance);
      expect(result.data.estimatedDuration).toBe(route.estimatedDuration);
      expect(result.data.airspaceClass).toBe(route.airspaceClass);
      expect(result.data.waypoints.length).toBe(route.waypoints.length);
    });
  });

  describe("Semantic Mapping Management", () => {
    test("should get all mappings", () => {
      const mappings = semanticAlignmentService.getMappings();

      expect(mappings).toBeDefined();
      expect(mappings.length).toBeGreaterThan(0);
    });

    test("should add and remove custom mappings", () => {
      const customMapping = {
        id: uuidv4(),
        sourceSystem: "caac" as const,
        targetSystem: "logistics" as const,
        entityType: "flight_plan" as const,
        sourceField: "customField",
        targetField: "customField",
        transformation: "custom",
        mappingRules: [],
      };

      const initialCount = semanticAlignmentService.getMappings().length;
      const mappingId = semanticAlignmentService.addMapping(customMapping);
      const afterAddCount = semanticAlignmentService.getMappings().length;

      expect(afterAddCount).toBe(initialCount + 1);
      expect(mappingId).toBe(customMapping.id);

      const removed = semanticAlignmentService.removeMapping(mappingId);
      expect(removed).toBe(true);

      const finalCount = semanticAlignmentService.getMappings().length;
      expect(finalCount).toBe(initialCount);
    });

    test("should return false when removing non-existent mapping", () => {
      const nonExistentId = uuidv4();
      const result = semanticAlignmentService.removeMapping(nonExistentId);

      expect(result).toBe(false);
    });
  });

  describe("Cross-System Alignment Scenarios", () => {
    test("should support bidirectional alignment", () => {
      const plan = createFlightPlan("active");

      const toCAAC = semanticAlignmentService.alignFlightPlan(
        plan,
        "operator",
        "caac"
      );
      const backToOperator = semanticAlignmentService.alignFlightPlan(
        toCAAC.data,
        "caac",
        "operator"
      );

      expect(backToOperator.data.status).toBe(plan.status);
    });

    test("should align across all three systems", () => {
      const plan = createFlightPlan("completed");

      const toCAAC = semanticAlignmentService.alignFlightPlan(
        plan,
        "operator",
        "caac"
      );
      const toLogistics = semanticAlignmentService.alignFlightPlan(
        toCAAC.data,
        "caac",
        "logistics"
      );
      const backToOperator = semanticAlignmentService.alignFlightPlan(
        toLogistics.data,
        "logistics",
        "operator"
      );

      expect(backToOperator.data.status).toBe(plan.status);
    });
  });
});
