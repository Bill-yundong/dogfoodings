import { DoorState } from '../value-objects/DoorState';

export interface Door {
  readonly id: string;
  state: DoorState;
  position: number;
  speed: number;
  motorCurrent: number;
  lastUpdated: number;
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

export const updateDoorMetrics = (
  door: Door,
  position: number,
  speed: number,
  motorCurrent: number
): Door => ({
  ...door,
  position,
  speed,
  motorCurrent,
  lastUpdated: Date.now()
});
