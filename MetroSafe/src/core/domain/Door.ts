export const DoorState = {
  CLOSED: 'closed',
  OPENING: 'opening',
  OPEN: 'open',
  CLOSING: 'closing',
  FAULT: 'fault'
} as const;

export type DoorState = typeof DoorState[keyof typeof DoorState];

export interface Door {
  id: string;
  state: DoorState;
  position: number;
  speed: number;
  motorCurrent: number;
  lastUpdated: number;
}

export interface DoorStatus {
  doorId: string;
  state: DoorState;
  position: number;
  speed: number;
  motorCurrent: number;
  timestamp: number;
}

export interface DoorCommand {
  doorId: string;
  action: 'open' | 'close' | 'stop';
  issuedBy: string;
  timestamp: number;
}

export const createDoor = (id: string): Door => ({
  id,
  state: DoorState.CLOSED,
  position: 0,
  speed: 0,
  motorCurrent: 0,
  lastUpdated: Date.now()
});

export const updateDoorState = (door: Door, state: DoorState): Door => ({
  ...door,
  state,
  position: state === DoorState.OPEN ? 100 : state === DoorState.CLOSED ? 0 : door.position,
  lastUpdated: Date.now()
});
