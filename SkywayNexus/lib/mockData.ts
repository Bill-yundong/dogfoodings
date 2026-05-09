import { v4 as uuidv4 } from "uuid";
import {
  Aircraft,
  FlightPlan,
  FlightRoute,
  Waypoint,
  FlightState,
  Coordinate,
} from "@/lib/types";

const BEIJING_CENTER = { lat: 39.9042, lng: 116.4074 };

function generateRandomWaypoint(
  baseLat: number,
  baseLng: number,
  type: Waypoint["type"],
  index: number
): Waypoint {
  const latOffset = (Math.random() - 0.5) * 0.5;
  const lngOffset = (Math.random() - 0.5) * 0.5;

  return {
    id: uuidv4(),
    coordinate: {
      lat: baseLat + latOffset,
      lng: baseLng + lngOffset,
      altitude: 1000 + Math.random() * 2000,
    },
    name: `${type.toUpperCase()}-${String.fromCharCode(65 + index)}`,
    type,
    minAltitude: 500,
    maxAltitude: 5000,
    speedLimit: 300,
  };
}

function generateRoute(): FlightRoute {
  const waypoints: Waypoint[] = [
    generateRandomWaypoint(
      BEIJING_CENTER.lat - 0.2,
      BEIJING_CENTER.lng - 0.2,
      "origin",
      0
    ),
  ];

  const numIntermediate = 3 + Math.floor(Math.random() * 3);
  for (let i = 0; i < numIntermediate; i++) {
    waypoints.push(
      generateRandomWaypoint(
        BEIJING_CENTER.lat + (i - 1) * 0.3,
        BEIJING_CENTER.lng + i * 0.2,
        "intermediate",
        i + 1
      )
    );
  }

  waypoints.push(
    generateRandomWaypoint(
      BEIJING_CENTER.lat + 0.2,
      BEIJING_CENTER.lng + 0.3,
      "destination",
      waypoints.length
    )
  );

  const routeTypes: FlightRoute["routeType"][] = [
    "commercial",
    "logistics",
    "private",
  ];
  const airspaceClasses: FlightRoute["airspaceClass"][] = ["G", "E", "D"];

  return {
    id: uuidv4(),
    name: `Route-${Math.floor(Math.random() * 1000)}`,
    waypoints,
    distance: 50 + Math.random() * 200,
    estimatedDuration: 30 + Math.random() * 120,
    airspaceClass: airspaceClasses[Math.floor(Math.random() * airspaceClasses.length)],
    routeType: routeTypes[Math.floor(Math.random() * routeTypes.length)],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

function generateAircraft(): Aircraft {
  const types = ["固定翼", "多旋翼", "混合动力"];
  const models = ["DJI M300", "Ehang 216", "Volocopter", "Autel Dragonfish"];
  const statuses: Aircraft["status"][] = [
    "idle",
    "cruise",
    "takeoff",
    "landing",
  ];

  return {
    id: uuidv4(),
    registration: `CN-${String(Math.floor(Math.random() * 9000) + 1000)}`,
    type: types[Math.floor(Math.random() * types.length)],
    model: models[Math.floor(Math.random() * models.length)],
    maxSpeed: 80 + Math.random() * 120,
    maxAltitude: 3000 + Math.random() * 3000,
    maxPayload: 5 + Math.random() * 50,
    status: statuses[Math.floor(Math.random() * statuses.length)],
  };
}

function generateFlightPlan(
  aircraftId: string,
  routeId: string
): FlightPlan {
  const now = Date.now();
  const statuses: FlightPlan["status"][] = [
    "planned",
    "active",
    "completed",
  ];

  return {
    id: uuidv4(),
    aircraftId,
    routeId,
    departureTime: now - Math.random() * 3600000,
    arrivalTime: now + Math.random() * 7200000,
    altitude: 1500 + Math.random() * 2000,
    speed: 100 + Math.random() * 100,
    status: statuses[Math.floor(Math.random() * statuses.length)],
    pilotName: `Pilot-${Math.floor(Math.random() * 100)}`,
    flightNumber: `NX${String(Math.floor(Math.random() * 9000) + 1000)}`,
  };
}

function generateFlightState(
  flightPlanId: string,
  route: FlightRoute
): FlightState {
  const randomWaypoint =
    route.waypoints[Math.floor(Math.random() * route.waypoints.length)];
  const coordinate: Coordinate = {
    lat: randomWaypoint.coordinate.lat + (Math.random() - 0.5) * 0.1,
    lng: randomWaypoint.coordinate.lng + (Math.random() - 0.5) * 0.1,
    altitude: randomWaypoint.coordinate.altitude,
  };

  return {
    flightPlanId,
    timestamp: Date.now(),
    position: coordinate,
    altitude: coordinate.altitude,
    speed: 80 + Math.random() * 100,
    heading: Math.random() * 360,
    verticalSpeed: -500 + Math.random() * 1000,
    fuelLevel: 20 + Math.random() * 80,
    engineStatus: ["正常", "正常"],
    systemsStatus: {
      navigation: "正常",
      communication: "正常",
      power: "正常",
    },
  };
}

export function generateInitialMockData() {
  const routes: FlightRoute[] = [];
  const aircraftList: Aircraft[] = [];
  const flightPlans: FlightPlan[] = [];
  const flightStates: FlightState[] = [];

  for (let i = 0; i < 5; i++) {
    routes.push(generateRoute());
  }

  for (let i = 0; i < 8; i++) {
    const aircraft = generateAircraft();
    aircraftList.push(aircraft);

    const route = routes[i % routes.length];
    const flightPlan = generateFlightPlan(aircraft.id, route.id);
    flightPlans.push(flightPlan);

    if (flightPlan.status === "active") {
      flightStates.push(generateFlightState(flightPlan.id, route));
    }
  }

  return {
    routes,
    aircraft: aircraftList,
    flightPlans,
    flightStates,
  };
}

export function updateFlightState(
  currentState: FlightState,
  route: FlightRoute
): FlightState {
  const timeDelta = 5;
  const speedKmPerMinute = (currentState.speed / 1.852) / 60;
  const distanceDelta = speedKmPerMinute * timeDelta;

  const headingRad = (currentState.heading * Math.PI) / 180;
  const latChange = (distanceDelta * Math.cos(headingRad)) / 60;
  const lngChange =
    (distanceDelta * Math.sin(headingRad)) /
    (60 * Math.cos((currentState.position.lat * Math.PI) / 180));

  const newHeading = currentState.heading + (Math.random() - 0.5) * 10;
  const newAltitude =
    currentState.altitude +
    currentState.verticalSpeed * (timeDelta / 60);

  const boundedAltitude = Math.max(
    500,
    Math.min(5000, newAltitude)
  );

  return {
    ...currentState,
    timestamp: Date.now(),
    position: {
      lat: currentState.position.lat + latChange,
      lng: currentState.position.lng + lngChange,
      altitude: boundedAltitude,
    },
    altitude: boundedAltitude,
    heading: ((newHeading % 360) + 360) % 360,
    verticalSpeed: Math.max(
      -1000,
      Math.min(1000, currentState.verticalSpeed + (Math.random() - 0.5) * 100)
    ),
    fuelLevel: Math.max(0, currentState.fuelLevel - Math.random() * 0.5),
  };
}
