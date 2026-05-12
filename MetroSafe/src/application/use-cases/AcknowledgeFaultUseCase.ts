import { FaultSignal, acknowledgeFault } from '../../domain';

export class AcknowledgeFaultUseCase {
  execute(faults: FaultSignal[], faultId: string): FaultSignal[] {
    return faults.map(fault =>
      fault.id === faultId ? acknowledgeFault(fault) : fault
    );
  }
}
