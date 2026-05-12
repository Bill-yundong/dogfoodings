import type { FaultSignal } from '../../core/domain';
import { FaultType, SemanticLevel } from '../../core/domain';
import { FAULT_CHAIN_CONFIGS, DOOR_IDS } from '../../core/constants/app.constants';

type LogicGateType = 'AND' | 'OR' | 'NOT' | 'NAND' | 'NOR' | 'XOR';

interface LogicGate {
  id: string;
  type: LogicGateType;
  inputs: Array<{ id: string; value: boolean; timestamp: number }>;
  output: boolean;
  delay: number;
  faultType?: FaultType;
  semanticLevel?: SemanticLevel;
  description?: string;
  triggeredAt?: number;
}

interface FaultChainState {
  id: string;
  name: string;
  gates: Map<string, LogicGate>;
  connections: Map<string, string[]>;
  active: boolean;
  triggeredAt?: number;
}

export type FaultTriggerCallback = (fault: Omit<FaultSignal, 'id' | 'timestamp' | 'acknowledged'>) => void;

export class FaultChainSimulator {
  private chains: Map<string, FaultChainState> = new Map();
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
      this.createChain(config as any);
    });
  }

  private createChain(config: {
    id: string;
    name: string;
    gates: Array<{ id: string; type: LogicGateType; delay: number; faultType?: FaultType; semanticLevel?: SemanticLevel; description?: string }>;
    connections: Array<[string, string]>;
  }): void {
    const gates = new Map<string, LogicGate>();
    const connections = new Map<string, string[]>();

    config.gates.forEach(gateConfig => {
      gates.set(gateConfig.id, {
        id: gateConfig.id,
        type: gateConfig.type,
        inputs: [],
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
  }

  private evaluateGateOutput(gate: LogicGate): boolean {
    const inputs = gate.inputs.map(i => i.value);

    switch (gate.type) {
      case 'AND':
        return inputs.length > 0 && inputs.every(v => v);
      case 'OR':
        return inputs.some(v => v);
      case 'NOT':
        return inputs.length > 0 ? !inputs[0] : false;
      case 'NAND':
        return inputs.length > 0 ? !inputs.every(v => v) : true;
      case 'NOR':
        return !inputs.some(v => v);
      case 'XOR':
        return inputs.filter(v => v).length % 2 === 1;
      default:
        return false;
    }
  }

  private async propagateSignal(chainId: string, gateId: string, sourceId: string, value: boolean): Promise<void> {
    const chain = this.chains.get(chainId);
    if (!chain) return;

    const gate = chain.gates.get(gateId);
    if (!gate) return;

    gate.inputs.push({
      id: sourceId,
      value,
      timestamp: Date.now()
    });

    await new Promise(resolve => setTimeout(resolve, gate.delay));

    const newOutput = this.evaluateGateOutput(gate);
    
    if (newOutput !== gate.output) {
      gate.output = newOutput;
      gate.triggeredAt = newOutput ? Date.now() : undefined;

      if (newOutput && gate.faultType && gate.semanticLevel && this.onFaultTriggered) {
        const randomDoorId = DOOR_IDS[Math.floor(Math.random() * DOOR_IDS.length)];
        this.onFaultTriggered({
          faultType: gate.faultType as FaultType,
          source: 'sensor',
          semanticLevel: gate.semanticLevel as SemanticLevel,
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

  triggerFault(chainId: string, gateId: string, value: boolean = true): void {
    const chain = this.chains.get(chainId);
    if (!chain) return;

    chain.active = true;
    chain.triggeredAt = Date.now();
    this.propagateSignal(chainId, gateId, 'external_trigger', value);
  }

  triggerRandomFault(): void {
    const chainIds = Array.from(this.chains.keys());
    const randomChainId = chainIds[Math.floor(Math.random() * chainIds.length)];
    const chain = this.chains.get(randomChainId)!;
    const gateIds = Array.from(chain.gates.keys()).slice(0, 2);
    const randomGateId = gateIds[Math.floor(Math.random() * gateIds.length)];
    
    this.triggerFault(randomChainId, randomGateId, true);
    
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
      gate.inputs = [];
      gate.output = false;
      gate.triggeredAt = undefined;
    });
  }

  resetAll(): void {
    this.chains.forEach((_, id) => this.resetChain(id));
  }

  getChainState(chainId: string) {
    const chain = this.chains.get(chainId);
    if (!chain) return null;

    return {
      id: chain.id,
      name: chain.name,
      active: chain.active,
      triggeredAt: chain.triggeredAt,
      gates: Array.from(chain.gates.values()).map(gate => ({
        id: gate.id,
        type: gate.type,
        output: gate.output,
        triggeredAt: gate.triggeredAt,
        faultType: gate.faultType
      }))
    };
  }

  getAllChainStates() {
    return Array.from(this.chains.keys()).map(id => this.getChainState(id)!).filter(Boolean);
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

export const faultChainSimulator = new FaultChainSimulator();
