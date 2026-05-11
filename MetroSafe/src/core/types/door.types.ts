export const DoorState = {
  CLOSED: 'closed',
  OPENING: 'opening',
  OPEN: 'open',
  CLOSING: 'closing',
  FAULT: 'fault'
} as const;

export type DoorState = typeof DoorState[keyof typeof DoorState];

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
