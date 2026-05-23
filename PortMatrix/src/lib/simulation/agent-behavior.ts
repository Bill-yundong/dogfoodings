import type {
  PassengerAgent,
  PassengerType,
  AgentStatus,
  TerminalLayout,
  Facility,
  Vector2D,
  PassengerAgent as P,
} from '@/types';
import { V } from '@/lib/math/vector2d';
import {
  getShops,
  getGates,
  getCheckinCounters,
  getSecurityChannels,
  getRandomEntrance,
  getNearestFacility,
  getFacilityById,
} from './terminal-layout';

let agentIdCounter = 0;

export const generateId = (): string => {
  return `agent_${++agentIdCounter}`;
};

export const resetIdCounter = (): void => {
  agentIdCounter = 0;
};

export const createPassengerAgent = (
  type: PassengerType,
  layout: TerminalLayout,
  flightId: string,
  boardingTime: number,
  currentTime: number
): PassengerAgent => {
  const entrance = getRandomEntrance(layout);
  const hasBaggage = Math.random() < 0.6;
  const shoppingInterest = generateShoppingInterest(type);

  const baseSpeed = type === 'special' ? 0.8 : type === 'tourist' ? 1.0 : type === 'transfer' ? 1.3 : 1.5;
  const maxPatience = type === 'business' ? 300 : type === 'tourist' ? 600 : type === 'transfer' ? 200 : 800;

  const gates = getGates(layout);
  const targetGate = gates[Math.floor(Math.random() * gates.length)];

  return {
    id: generateId(),
    type,
    position: V.clone(entrance),
    velocity: V.zero(),
    desiredVelocity: V.zero(),
    target: null,
    targetFacilityId: null,
    currentZone: 'zone_entrance',
    status: 'arriving',
    patience: maxPatience,
    maxPatience,
    hasBaggage,
    shoppingInterest,
    flightId,
    boardingTime,
    arrivalTime: currentTime,
    checkinStartTime: 0,
    securityStartTime: 0,
    shoppingStartTime: 0,
    visitedShops: [],
    trail: [],
  };
};

const generateShoppingInterest = (type: PassengerType): number => {
  switch (type) {
    case 'business':
      return 0.2 + Math.random() * 0.2;
    case 'tourist':
      return 0.6 + Math.random() * 0.3;
    case 'transfer':
      return 0.3 + Math.random() * 0.3;
    case 'special':
      return 0.1 + Math.random() * 0.1;
    default:
      return 0.3;
  }
};

export const generatePassengerType = (): PassengerType => {
  const r = Math.random();
  if (r < 0.25) return 'business';
  if (r < 0.6) return 'tourist';
  if (r < 0.9) return 'transfer';
  return 'special';
};

export const generateFlightId = (): string => {
  const airlines = ['CA', 'MU', 'CZ', 'HU', '3U', 'ZH'];
  const airline = airlines[Math.floor(Math.random() * airlines.length)];
  const number = Math.floor(Math.random() * 9000) + 1000;
  return `${airline}${number}`;
};

export const assignNextTarget = (
  agent: PassengerAgent,
  layout: TerminalLayout,
  currentTime: number
): void => {
  switch (agent.status) {
    case 'arriving':
      setTargetToCheckin(agent, layout);
      break;
    case 'in_checkin_queue':
    case 'at_checkin':
      break;
    case 'walking':
      if (shouldGoShopping(agent, currentTime)) {
        setTargetToShop(agent, layout);
      } else {
        setTargetToGate(agent, layout);
      }
      break;
    case 'in_security_queue':
    case 'at_security':
      break;
    case 'shopping':
      break;
    case 'waiting_gate':
      setTargetToBoarding(agent, layout);
      break;
    default:
      break;
  }
};

const setTargetToCheckin = (agent: P, layout: TerminalLayout): void => {
  if (!agent.hasBaggage) {
    setTargetToSecurity(agent, layout);
    return;
  }

  const counters = getCheckinCounters(layout);
  const nearest = getNearestFacility(agent.position, counters);

  if (nearest) {
    agent.target = V.clone(nearest.position);
    agent.target.x -= 3;
    agent.targetFacilityId = nearest.id;
    agent.status = 'in_checkin_queue';
  } else {
    setTargetToSecurity(agent, layout);
  }
};

const setTargetToSecurity = (agent: P, layout: TerminalLayout): void => {
  const channels = getSecurityChannels(layout);
  const nearest = getNearestFacility(agent.position, channels);

  if (nearest) {
    agent.target = V.clone(nearest.position);
    agent.target.x -= 3;
    agent.targetFacilityId = nearest.id;
    agent.status = 'in_security_queue';
  } else {
    setTargetToGate(agent, layout);
  }
};

const setTargetToGate = (agent: P, layout: TerminalLayout): void => {
  const gates = getGates(layout);
  const targetGate = gates.find(g => g.name === agent.flightId) ||
    gates[Math.floor(Math.random() * gates.length)];

  if (targetGate) {
    agent.target = V.clone(targetGate.position);
    agent.targetFacilityId = targetGate.id;
    agent.status = 'walking';
  }
};

const setTargetToShop = (agent: P, layout: TerminalLayout): void => {
  const shops = getShops(layout).filter(s => !agent.visitedShops.includes(s.id));
  if (shops.length === 0) {
    setTargetToGate(agent, layout);
    return;
  }

  const weightedShops = shops.map(s => ({
    shop: s,
    weight: s.attractiveness * agent.shoppingInterest /
      (V.distance(agent.position, s.position) + 1),
  }));

  const totalWeight = weightedShops.reduce((sum, ws) => sum + ws.weight, 0);
  let r = Math.random() * totalWeight;

  for (const ws of weightedShops) {
    r -= ws.weight;
    if (r <= 0) {
      agent.target = V.clone(ws.shop.position);
      agent.targetFacilityId = ws.shop.id;
      agent.status = 'walking';
      return;
    }
  }

  setTargetToGate(agent, layout);
};

const setTargetToBoarding = (agent: P, layout: TerminalLayout): void => {
  const facility = getFacilityById(layout, agent.targetFacilityId || '');
  if (facility) {
    agent.target = V.clone(facility.position);
    agent.status = 'boarding';
  }
};

const shouldGoShopping = (agent: P, currentTime: number): boolean => {
  if (agent.status !== 'walking') return false;
  if (agent.shoppingInterest < 0.2) return false;
  if (agent.visitedShops.length >= 3) return false;

  const timeUntilBoarding = agent.boardingTime - currentTime;
  if (timeUntilBoarding < 120) return false;

  return Math.random() < agent.shoppingInterest * 0.3;
};

export const hasReachedTarget = (agent: P): boolean => {
  if (!agent.target) return false;
  return V.distance(agent.position, agent.target) < 1.5;
};

export const updatePatience = (agent: P, dt: number, isWaiting: boolean): void => {
  if (isWaiting) {
    agent.patience -= dt * 1.5;
  } else {
    agent.patience -= dt * 0.3;
  }

  agent.patience = Math.max(0, agent.patience);
};

export const isPatient = (agent: P): boolean => {
  return agent.patience > 0;
};

export const getStatusPriority = (status: AgentStatus): number => {
  const priorities: Record<AgentStatus, number> = {
    boarding: 0,
    at_security: 1,
    at_checkin: 2,
    in_security_queue: 3,
    in_checkin_queue: 4,
    waiting_gate: 5,
    shopping: 6,
    walking: 7,
    arriving: 8,
    exited: 9,
  };
  return priorities[status];
};

export const selectShortestQueue = (
  queues: Array<{ id: string; length: number }>
): string | null => {
  if (queues.length === 0) return null;

  let shortest = queues[0];
  for (const q of queues) {
    if (q.length < shortest.length) {
      shortest = q;
    }
  }

  return shortest.id;
};

export const getExpectedServiceTime = (
  agent: P,
  facilityType: string
): number => {
  let baseTime: number;

  switch (facilityType) {
    case 'checkin_counter':
      baseTime = agent.hasBaggage ? 120 : 45;
      break;
    case 'security_channel':
      baseTime = 60;
      break;
    case 'shop':
      baseTime = 180 + Math.random() * 240;
      break;
    default:
      baseTime = 60;
  }

  if (agent.type === 'special') {
    baseTime *= 1.5;
  }

  return baseTime;
};

export const generatePassengerBatch = (
  count: number,
  layout: TerminalLayout,
  startTime: number,
  duration: number
): Array<{ agent: PassengerAgent; arrivalTime: number }> => {
  const result: Array<{ agent: PassengerAgent; arrivalTime: number }> = [];
  const flightId = generateFlightId();
  const boardingTime = startTime + duration * 0.8;

  for (let i = 0; i < count; i++) {
    const type = generatePassengerType();
    const arrivalOffset = Math.random() * duration * 0.6;
    const arrivalTime = startTime + arrivalOffset;

    const agent = createPassengerAgent(
      type,
      layout,
      flightId,
      boardingTime,
      arrivalTime
    );

    result.push({ agent, arrivalTime });
  }

  return result;
};

export const findPathTarget = (
  agent: P,
  layout: TerminalLayout
): Vector2D | null => {
  if (agent.target) return agent.target;

  const currentZone = layout.zones.find(z => z.id === agent.currentZone);
  if (!currentZone) return null;

  if (currentZone.type === 'entrance') {
    return V.create(35, 40);
  }
  if (currentZone.type === 'checkin') {
    return V.create(60, 40);
  }
  if (currentZone.type === 'security') {
    return V.create(85, 40);
  }
  if (currentZone.type === 'corridor') {
    return V.create(100, 40);
  }

  return null;
};
