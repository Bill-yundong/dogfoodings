// Value Objects
export * from './value-objects/DoorState';
export * from './value-objects/SemanticLevel';
export * from './value-objects/FaultType';

// Entities
export * from './entities/Door';
export * from './entities/FaultSignal';
export * from './entities/Cycle';

// Ports (Interfaces)
export * from './ports/ICycleRepository';
export * from './ports/IFaultPublisher';

// Domain Services
export * from './services/FaultChainService';

// Constants
export const DOOR_IDS = ['PSD-01', 'PSD-02', 'PSD-03', 'PSD-04', 'PSD-05', 'PSD-06'] as const;
export const DB_NAME = 'MetroSafeDB';
export const DB_VERSION = 1;
export const STORE_NAME = 'cycles';
