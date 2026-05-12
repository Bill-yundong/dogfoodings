import { FaultSignal, createFaultSignal, FaultType, FaultSource, SemanticLevel, IFaultPublisher } from '../../domain';

export type AddFaultCommand = {
  faultType: FaultType;
  source: FaultSource;
  semanticLevel: SemanticLevel;
  doorId: string;
  description: string;
};

export class AddFaultSignalUseCase {
  constructor(private faultPublisher: IFaultPublisher) {}

  async execute(command: AddFaultCommand): Promise<FaultSignal> {
    const faultSignal = createFaultSignal(
      command.faultType,
      command.source,
      command.semanticLevel,
      command.doorId,
      command.description
    );

    await this.faultPublisher.publish(faultSignal);

    return faultSignal;
  }
}
