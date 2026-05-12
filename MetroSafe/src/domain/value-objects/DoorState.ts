export const DoorState = {
  CLOSED: 'closed',
  OPENING: 'opening',
  OPEN: 'open',
  CLOSING: 'closing',
  FAULT: 'fault'
} as const;

export type DoorState = typeof DoorState[keyof typeof DoorState];

export const DoorStateLabel: Record<DoorState, string> = {
  [DoorState.CLOSED]: '关闭',
  [DoorState.OPENING]: '开启中',
  [DoorState.OPEN]: '开启',
  [DoorState.CLOSING]: '关闭中',
  [DoorState.FAULT]: '故障'
};

export const DoorStateColor: Record<DoorState, string> = {
  [DoorState.CLOSED]: '#4CAF50',
  [DoorState.OPENING]: '#FFC107',
  [DoorState.OPEN]: '#2196F3',
  [DoorState.CLOSING]: '#FF9800',
  [DoorState.FAULT]: '#F44336'
};
