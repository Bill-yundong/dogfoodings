import { generateInitialMockData, updateFlightState } from "@/lib/mockData";
import type { FlightState, FlightRoute } from "@/lib/types";

describe("Mock Data Generator", () => {
  describe("Initial Mock Data Generation", () => {
    test("should generate initial mock data", () => {
      const data = generateInitialMockData();

      expect(data).toBeDefined();
      expect(data.routes).toBeDefined();
      expect(data.aircraft).toBeDefined();
      expect(data.flightPlans).toBeDefined();
      expect(data.flightStates).toBeDefined();
    });

    test("should generate routes with correct structure", () => {
      const data = generateInitialMockData();

      expect(data.routes.length).toBeGreaterThan(0);

      for (const route of data.routes) {
        expect(route.id).toBeDefined();
        expect(typeof route.id).toBe("string");
        expect(route.name).toBeDefined();
        expect(route.waypoints).toBeDefined();
        expect(route.waypoints.length).toBeGreaterThanOrEqual(2);
        expect(route.distance).toBeGreaterThan(0);
        expect(route.estimatedDuration).toBeGreaterThan(0);
        expect(route.airspaceClass).toBeDefined();
        expect(route.routeType).toBeDefined();
        expect(route.createdAt).toBeGreaterThan(0);
        expect(route.updatedAt).toBeGreaterThan(0);
      }
    });

    test("should generate aircraft with correct structure", () => {
      const data = generateInitialMockData();

      expect(data.aircraft.length).toBeGreaterThan(0);

      for (const aircraft of data.aircraft) {
        expect(aircraft.id).toBeDefined();
        expect(typeof aircraft.id).toBe("string");
        expect(aircraft.registration).toBeDefined();
        expect(aircraft.type).toBeDefined();
        expect(aircraft.model).toBeDefined();
        expect(aircraft.maxSpeed).toBeGreaterThan(0);
        expect(aircraft.maxAltitude).toBeGreaterThan(0);
        expect(aircraft.maxPayload).toBeGreaterThan(0);
        expect(aircraft.status).toBeDefined();
      }
    });

    test("should generate flight plans with correct structure", () => {
      const data = generateInitialMockData();

      expect(data.flightPlans.length).toBeGreaterThan(0);

      for (const plan of data.flightPlans) {
        expect(plan.id).toBeDefined();
        expect(typeof plan.id).toBe("string");
        expect(plan.aircraftId).toBeDefined();
        expect(plan.routeId).toBeDefined();
        expect(plan.departureTime).toBeGreaterThan(0);
        expect(plan.arrivalTime).toBeGreaterThan(plan.departureTime);
        expect(plan.altitude).toBeGreaterThan(0);
        expect(plan.speed).toBeGreaterThan(0);
        expect(plan.status).toBeDefined();
        expect(plan.pilotName).toBeDefined();
        expect(plan.flightNumber).toBeDefined();
      }
    });

    test("should generate flight states for active flights", () => {
      const data = generateInitialMockData();

      for (const state of data.flightStates) {
        expect(state.flightPlanId).toBeDefined();
        expect(state.timestamp).toBeGreaterThan(0);
        expect(state.position).toBeDefined();
        expect(state.position.lat).toBeDefined();
        expect(state.position.lng).toBeDefined();
        expect(state.position.altitude).toBeDefined();
        expect(state.altitude).toBeDefined();
        expect(state.speed).toBeDefined();
        expect(state.heading).toBeGreaterThanOrEqual(0);
        expect(state.heading).toBeLessThanOrEqual(360);
        expect(state.verticalSpeed).toBeDefined();
        expect(state.fuelLevel).toBeGreaterThanOrEqual(0);
        expect(state.fuelLevel).toBeLessThanOrEqual(100);
        expect(state.engineStatus).toBeDefined();
        expect(state.systemsStatus).toBeDefined();
      }
    });

    test("should link aircraft to flight plans", () => {
      const data = generateInitialMockData();

      for (const plan of data.flightPlans) {
        const hasAircraft = data.aircraft.some((a) => a.id === plan.aircraftId);
        expect(hasAircraft).toBe(true);
      }
    });

    test("should link routes to flight plans", () => {
      const data = generateInitialMockData();

      for (const plan of data.flightPlans) {
        const hasRoute = data.routes.some((r) => r.id === plan.routeId);
        expect(hasRoute).toBe(true);
      }
    });
  });

  describe("Flight State Update", () => {
    test("should update flight state over time", () => {
      const data = generateInitialMockData();

      if (data.flightStates.length > 0 && data.routes.length > 0) {
        const initialState = data.flightStates[0];
        const route = data.routes.find((r) =>
          data.flightPlans.some(
            (p) => p.id === initialState.flightPlanId && p.routeId === r.id
          )
        );

        if (route) {
          const updatedState = updateFlightState(initialState, route);

          expect(updatedState).toBeDefined();
          expect(updatedState.flightPlanId).toBe(initialState.flightPlanId);
          expect(updatedState.timestamp).toBeGreaterThanOrEqual(initialState.timestamp);
        }
      }
    });

    test("should maintain valid altitude bounds", () => {
      const data = generateInitialMockData();

      if (data.flightStates.length > 0 && data.routes.length > 0) {
        const initialState = data.flightStates[0];
        const route = data.routes.find((r) =>
          data.flightPlans.some(
            (p) => p.id === initialState.flightPlanId && p.routeId === r.id
          )
        );

        if (route) {
          const updatedState = updateFlightState(initialState, route);

          expect(updatedState.altitude).toBeGreaterThanOrEqual(500);
          expect(updatedState.altitude).toBeLessThanOrEqual(5000);
        }
      }
    });

    test("should maintain valid heading bounds", () => {
      const data = generateInitialMockData();

      if (data.flightStates.length > 0 && data.routes.length > 0) {
        const initialState = data.flightStates[0];
        const route = data.routes.find((r) =>
          data.flightPlans.some(
            (p) => p.id === initialState.flightPlanId && p.routeId === r.id
          )
        );

        if (route) {
          const updatedState = updateFlightState(initialState, route);

          expect(updatedState.heading).toBeGreaterThanOrEqual(0);
          expect(updatedState.heading).toBeLessThan(360);
        }
      }
    });

    test("should maintain valid vertical speed bounds", () => {
      const data = generateInitialMockData();

      if (data.flightStates.length > 0 && data.routes.length > 0) {
        const initialState = data.flightStates[0];
        const route = data.routes.find((r) =>
          data.flightPlans.some(
            (p) => p.id === initialState.flightPlanId && p.routeId === r.id
          )
        );

        if (route) {
          const updatedState = updateFlightState(initialState, route);

          expect(updatedState.verticalSpeed).toBeGreaterThanOrEqual(-1000);
          expect(updatedState.verticalSpeed).toBeLessThanOrEqual(1000);
        }
      }
    });

    test("should simulate fuel consumption", () => {
      const data = generateInitialMockData();

      if (data.flightStates.length > 0 && data.routes.length > 0) {
        const initialState = data.flightStates[0];
        const route = data.routes.find((r) =>
          data.flightPlans.some(
            (p) => p.id === initialState.flightPlanId && p.routeId === r.id
          )
        );

        if (route) {
          const updatedState = updateFlightState(initialState, route);

          expect(updatedState.fuelLevel).toBeLessThanOrEqual(
            initialState.fuelLevel
          );
          expect(updatedState.fuelLevel).toBeGreaterThanOrEqual(0);
        }
      }
    });

    test("should update position based on heading and speed", () => {
      const data = generateInitialMockData();

      if (data.flightStates.length > 0 && data.routes.length > 0) {
        const initialState = data.flightStates[0];
        const route = data.routes.find((r) =>
          data.flightPlans.some(
            (p) => p.id === initialState.flightPlanId && p.routeId === r.id
          )
        );

        if (route) {
          const updatedState = updateFlightState(initialState, route);

          expect(updatedState.position).toBeDefined();
          expect(typeof updatedState.position.lat).toBe("number");
          expect(typeof updatedState.position.lng).toBe("number");
        }
      }
    });

    test("should preserve engine and system status during update", () => {
      const data = generateInitialMockData();

      if (data.flightStates.length > 0 && data.routes.length > 0) {
        const initialState = data.flightStates[0];
        const route = data.routes.find((r) =>
          data.flightPlans.some(
            (p) => p.id === initialState.flightPlanId && p.routeId === r.id
          )
        );

        if (route) {
          const updatedState = updateFlightState(initialState, route);

          expect(updatedState.engineStatus).toEqual(initialState.engineStatus);
          expect(updatedState.systemsStatus).toEqual(initialState.systemsStatus);
        }
      }
    });
  });

  describe("Waypoint Data Structure", () => {
    test("generated routes should have valid waypoints", () => {
      const data = generateInitialMockData();

      for (const route of data.routes) {
        expect(route.waypoints[0].type).toBe("origin");
        expect(route.waypoints[route.waypoints.length - 1].type).toBe(
          "destination"
        );

        for (const waypoint of route.waypoints) {
          expect(waypoint.id).toBeDefined();
          expect(waypoint.coordinate).toBeDefined();
          expect(waypoint.coordinate.lat).toBeDefined();
          expect(waypoint.coordinate.lng).toBeDefined();
          expect(waypoint.coordinate.altitude).toBeDefined();
          expect(waypoint.name).toBeDefined();
          expect(waypoint.type).toBeDefined();
        }
      }
    });
  });

  describe("Data Consistency", () => {
    test("should generate consistent data across multiple calls", () => {
      const data1 = generateInitialMockData();
      const data2 = generateInitialMockData();

      expect(data1.routes.length).toBe(data2.routes.length);
      expect(data1.aircraft.length).toBe(data2.aircraft.length);
      expect(data1.flightPlans.length).toBe(data2.flightPlans.length);
    });

    test("should have unique IDs for all entities", () => {
      const data = generateInitialMockData();

      const routeIds = new Set(data.routes.map((r) => r.id));
      const aircraftIds = new Set(data.aircraft.map((a) => a.id));
      const planIds = new Set(data.flightPlans.map((p) => p.id));

      expect(routeIds.size).toBe(data.routes.length);
      expect(aircraftIds.size).toBe(data.aircraft.length);
      expect(planIds.size).toBe(data.flightPlans.length);
    });
  });
});
