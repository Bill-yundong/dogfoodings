import { describe, it, expect } from 'vitest';
import {
  DoorState,
  DoorStateLabel,
  DoorStateColor,
  createDoor,
  updateDoorState,
  DOOR_IDS
} from '../../domain';

describe('DoorState Value Object', () => {
  it('should have all 5 door states', () => {
    expect(DoorState).toEqual({
      CLOSED: 'closed',
      OPENING: 'opening',
      OPEN: 'open',
      CLOSING: 'closing',
      FAULT: 'fault'
    });
  });

  it('should have correct Chinese labels for all states', () => {
    expect(DoorStateLabel[DoorState.CLOSED]).toBe('关闭');
    expect(DoorStateLabel[DoorState.OPENING]).toBe('开启中');
    expect(DoorStateLabel[DoorState.OPEN]).toBe('开启');
    expect(DoorStateLabel[DoorState.CLOSING]).toBe('关闭中');
    expect(DoorStateLabel[DoorState.FAULT]).toBe('故障');
  });

  it('should have correct color codes for all states', () => {
    expect(DoorStateColor[DoorState.CLOSED]).toBe('#4CAF50');
    expect(DoorStateColor[DoorState.OPENING]).toBe('#FFC107');
    expect(DoorStateColor[DoorState.OPEN]).toBe('#2196F3');
    expect(DoorStateColor[DoorState.CLOSING]).toBe('#FF9800');
    expect(DoorStateColor[DoorState.FAULT]).toBe('#F44336');
  });
});

describe('Door Entity', () => {
  it('should create a door with default values', () => {
    const door = createDoor('PSD-01');

    expect(door.id).toBe('PSD-01');
    expect(door.state).toBe(DoorState.CLOSED);
    expect(door.position).toBe(0);
    expect(door.speed).toBe(0);
    expect(door.motorCurrent).toBe(0);
    expect(door.lastUpdated).toBeDefined();
  });

  it('should have correct door IDs constant', () => {
    expect(DOOR_IDS).toEqual(['PSD-01', 'PSD-02', 'PSD-03', 'PSD-04', 'PSD-05', 'PSD-06']);
    expect(DOOR_IDS.length).toBe(6);
  });

  it('should update door state correctly', () => {
    const door = createDoor('PSD-01');

    const updatedDoor = updateDoorState(door, DoorState.OPEN);

    expect(updatedDoor.state).toBe(DoorState.OPEN);
    expect(updatedDoor.lastUpdated).toBeGreaterThanOrEqual(door.lastUpdated);
  });

  it('should set position to 100 when state is OPEN', () => {
    const door = createDoor('PSD-01');
    const updatedDoor = updateDoorState(door, DoorState.OPEN);

    expect(updatedDoor.state).toBe(DoorState.OPEN);
    expect(updatedDoor.position).toBe(100);
  });

  it('should set position to 0 when state is CLOSED', () => {
    const door = createDoor('PSD-01');
    const updatedDoor = updateDoorState(door, DoorState.CLOSED);

    expect(updatedDoor.state).toBe(DoorState.CLOSED);
    expect(updatedDoor.position).toBe(0);
  });
});
