import { Door, DoorState, updateDoorState, updateDoorMetrics } from '../../domain';

export class UpdateDoorStateUseCase {
  execute(doors: Door[], doorId: string, state: DoorState): Door[] {
    return doors.map(door =>
      door.id === doorId ? updateDoorState(door, state) : door
    );
  }
}
