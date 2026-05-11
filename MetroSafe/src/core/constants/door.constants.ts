import { DoorState } from '../types';

export const DOOR_IDS = ['PSD-01', 'PSD-02', 'PSD-03', 'PSD-04', 'PSD-05', 'PSD-06'] as const;

export const DOOR_STATE_LABELS: Record<DoorState, string> = {
  [DoorState.CLOSED]: '关闭',
  [DoorState.OPENING]: '开启中',
  [DoorState.OPEN]: '开启',
  [DoorState.CLOSING]: '关闭中',
  [DoorState.FAULT]: '故障'
};

export const DOOR_STATE_COLORS: Record<DoorState, string> = {
  [DoorState.CLOSED]: 'bg-green-500',
  [DoorState.OPENING]: 'bg-yellow-500',
  [DoorState.OPEN]: 'bg-blue-500',
  [DoorState.CLOSING]: 'bg-orange-500',
  [DoorState.FAULT]: 'bg-red-500'
};

export const DEFAULT_DOOR_STATUS = {
  state: DoorState.CLOSED,
  position: 0,
  speed: 0,
  motorCurrent: 0
};
