import {
  FAULT_CHAIN_CONFIGS,
  evaluateGateOutput,
  ChainState,
  FaultType,
  SemanticLevel,
  DOOR_IDS,
  LogicGateType
} from '../../domain';

export type FaultTriggerCallback = (fault: {
  faultType: FaultType;
  source: 'sensor';
  semanticLevel: SemanticLevel;
  doorId: string;
  description: string;
}) => void;

interface InternalGateState {
  id: string;
  type: LogicGateType;
  inputs: Map<string, boolean>;
  output: boolean;
  delay: number;
  faultType?: FaultType;
  semanticLevel?: SemanticLevel;
  description?: string;
  triggeredAt?: number;
}

interface InternalChainState {
  id: string;
  name: string;
  gates: Map<string, InternalGateState>;
  connections: Map<string, string[]>;
  active: boolean;
  triggeredAt?: number;
}

export class FaultChainSimulator {
  private chains: Map<string, InternalChainState> = new Map();
  private simulationInterval: number | null = null;
  private onFaultTriggered: FaultTriggerCallback | null = null;

  constructor() {
    this.initializeChains();
  }

  setFaultCallback(callback: FaultTriggerCallback): void {
    this.onFaultTriggered = callback;
  }

  private initializeChains(): void {
    FAULT_CHAIN_CONFIGS.forEach(config => {
      const gates = new Map<string, InternalGateState>();
      const connections = new Map<string, string[]>();

      config.gates.forEach(gateConfig => {
        gates.set(gateConfig.id, {
          id: gateConfig.id,
          type: gateConfig.type,
          inputs: new Map(),
          output: false,
          delay: gateConfig.delay,
          faultType: gateConfig.faultType,
          semanticLevel: gateConfig.semanticLevel,
          description: gateConfig.description
        });
      });

      config.connections.forEach(([from, to]) => {
        const existing = connections.get(from) || [];
        existing.push(to);
        connections.set(from, existing);
      });

      this.chains.set(config.id, {
        id: config.id,
        name: config.name,
        gates,
        connections,
        active: false
      });
    });
  }

  private async propagateSignal(chainId: string, gateId: string, sourceId: string, value: boolean): Promise<void> {
    const chain = this.chains.get(chainId);
    if (!chain) return;

    const gate = chain.gates.get(gateId);
    if (!gate) return;

    gate.inputs.set(sourceId, value);

    await new Promise(resolve => setTimeout(resolve, gate.delay));

    const inputs = Array.from(gate.inputs.values());
    const newOutput = evaluateGateOutput(gate.type, inputs);

    if (newOutput !== gate.output) {
      gate.output = newOutput;
      gate.triggeredAt = newOutput ? Date.now() : undefined;

      if (newOutput && gate.faultType && gate.semanticLevel && this.onFaultTriggered) {
        const randomDoorId = DOOR_IDS[Math.floor(Math.random() * DOOR_IDS.length)];
        this.onFaultTriggered({
          faultType: gate.faultType,
          source: 'sensor',
          semanticLevel: gate.semanticLevel,
          doorId: randomDoorId,
          description: gate.description || gate.faultType
        });
      }

      if (newOutput) {
        const downstreamGates = chain.connections.get(gateId) || [];
        for (const downstreamGateId of downstreamGates) {
          await this.propagateSignal(chainId, downstreamGateId, gateId, true);
        }
      }
    }
  }

  triggerFault(chainId: string, gateId: string): void {
    const chain = this.chains.get(chainId);
    if (!chain) return;

    chain.active = true;
    chain.triggeredAt = Date.now();
    this.propagateSignal(chainId, gateId, 'external_trigger', true);
  }

  triggerRandomFault(): void {
    const chainIds = Array.from(this.chains.keys());
    const randomChainId = chainIds[Math.floor(Math.random() * chainIds.length)];
    const chain = this.chains.get(randomChainId)!;
    const gateIds = Array.from(chain.gates.keys()).slice(0, 2);
    const randomGateId = gateIds[Math.floor(Math.random() * gateIds.length)];

    this.triggerFault(randomChainId, randomGateId);

    setTimeout(() => {
      this.resetChain(randomChainId);
    }, 3000 + Math.random() * 2000);
  }

  resetChain(chainId: string): void {
    const chain = this.chains.get(chainId);
    if (!chain) return;

    chain.active = false;
    chain.triggeredAt = undefined;
    chain.gates.forEach(gate => {
      gate.inputs.clear();
      gate.output = false;
      gate.triggeredAt = undefined;
    });
  }

  resetAll(): void {
    this.chains.forEach((_, id) => this.resetChain(id));
  }

  getAllChainStates(): ChainState[] {
    return Array.from(this.chains.values()).map(chain => ({
      id: chain.id,
      name: chain.name,
      active: chain.active,
      triggeredAt: chain.triggeredAt,
      gates: Array.from(chain.gates.values()).map(gate => ({
        id: gate.id,
        type: gate.type,
        inputs: Array.from(gate.inputs.values()),
        output: gate.output,
        triggeredAt: gate.triggeredAt
      }))
    }));
  }

  startSimulation(interval: number = 5000): void {
    if (this.simulationInterval) return;

    this.simulationInterval = window.setInterval(() => {
      if (Math.random() > 0.7) {
        this.triggerRandomFault();
      }
    }, interval);
  }

  stopSimulation(): void {
    if (this.simulationInterval) {
      clearInterval(this.simulationInterval);
      this.simulationInterval = null;
    }
  }

  isSimulating(): boolean {
    return this.simulationInterval !== null;
  }
}
