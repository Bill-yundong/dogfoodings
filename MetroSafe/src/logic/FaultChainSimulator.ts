import type { LogicGateInput, LogicGateOutput } from '../types';
import { FaultType, SemanticLevel } from '../types';
import { addFaultSignal } from '../store/doorStore';

type LogicGateType = 'AND' | 'OR' | 'NOT' | 'NAND' | 'NOR' | 'XOR';

interface AsyncLogicGate {
  id: string;
  type: LogicGateType;
  inputs: LogicGateInput[];
  output: LogicGateOutput;
  delay: number;
  faultType?: FaultType;
  description?: string;
  semanticLevel?: SemanticLevel;
}

interface FaultChain {
  id: string;
  gates: AsyncLogicGate[];
  connections: Map<string, string[]>;
  active: boolean;
}

class FaultChainSimulator {
  private chains: Map<string, FaultChain> = new Map();
  private gateOutputs: Map<string, LogicGateOutput> = new Map();
  private simulationInterval: number | null = null;

  constructor() {
    this.initializeChains();
  }

  private initializeChains() {
    this.chains.set('motor_failure_chain', this.createMotorFailureChain());
    this.chains.set('sensor_error_chain', this.createSensorErrorChain());
    this.chains.set('obstacle_detection_chain', this.createObstacleDetectionChain());
    this.chains.set('communication_chain', this.createCommunicationChain());
  }

  private createMotorFailureChain(): FaultChain {
    return {
      id: 'motor_failure_chain',
      gates: [
        {
          id: 'current_sensor',
          type: 'OR',
          inputs: [],
          output: { value: false, propagated: false, timestamp: 0 },
          delay: 10
        },
        {
          id: 'overload_detector',
          type: 'AND',
          inputs: [],
          output: { value: false, propagated: false, timestamp: 0 },
          delay: 25,
          faultType: FaultType.MOTOR_FAILURE,
          description: '电机电流过载检测',
          semanticLevel: SemanticLevel.CRITICAL
        },
        {
          id: 'thermal_protection',
          type: 'AND',
          inputs: [],
          output: { value: false, propagated: false, timestamp: 0 },
          delay: 50,
          faultType: FaultType.MOTOR_FAILURE,
          description: '电机过热保护触发',
          semanticLevel: SemanticLevel.EMERGENCY
        },
        {
          id: 'emergency_stop',
          type: 'OR',
          inputs: [],
          output: { value: false, propagated: false, timestamp: 0 },
          delay: 15,
          faultType: FaultType.MOTOR_FAILURE,
          description: '紧急停止信号激活',
          semanticLevel: SemanticLevel.EMERGENCY
        }
      ],
      connections: new Map([
        ['current_sensor', ['overload_detector']],
        ['overload_detector', ['thermal_protection']],
        ['thermal_protection', ['emergency_stop']]
      ]),
      active: false
    };
  }

  private createSensorErrorChain(): FaultChain {
    return {
      id: 'sensor_error_chain',
      gates: [
        {
          id: 'position_sensor_a',
          type: 'NOT',
          inputs: [],
          output: { value: false, propagated: false, timestamp: 0 },
          delay: 8
        },
        {
          id: 'position_sensor_b',
          type: 'NOT',
          inputs: [],
          output: { value: false, propagated: false, timestamp: 0 },
          delay: 8
        },
        {
          id: 'position_comparator',
          type: 'XOR',
          inputs: [],
          output: { value: false, propagated: false, timestamp: 0 },
          delay: 20,
          faultType: FaultType.SENSOR_ERROR,
          description: '位置传感器数据不一致',
          semanticLevel: SemanticLevel.WARNING
        },
        {
          id: 'sensor_fault_confirmed',
          type: 'AND',
          inputs: [],
          output: { value: false, propagated: false, timestamp: 0 },
          delay: 30,
          faultType: FaultType.SENSOR_ERROR,
          description: '传感器故障确认',
          semanticLevel: SemanticLevel.CRITICAL
        }
      ],
      connections: new Map([
        ['position_sensor_a', ['position_comparator']],
        ['position_sensor_b', ['position_comparator']],
        ['position_comparator', ['sensor_fault_confirmed']]
      ]),
      active: false
    };
  }

  private createObstacleDetectionChain(): FaultChain {
    return {
      id: 'obstacle_detection_chain',
      gates: [
        {
          id: 'light_curtain_triggered',
          type: 'OR',
          inputs: [],
          output: { value: false, propagated: false, timestamp: 0 },
          delay: 5
        },
        {
          id: 'force_sensor_triggered',
          type: 'OR',
          inputs: [],
          output: { value: false, propagated: false, timestamp: 0 },
          delay: 5
        },
        {
          id: 'obstacle_detected',
          type: 'OR',
          inputs: [],
          output: { value: false, propagated: false, timestamp: 0 },
          delay: 10,
          faultType: FaultType.OBSTACLE_DETECTED,
          description: '障碍物检测触发',
          semanticLevel: SemanticLevel.WARNING
        },
        {
          id: 'obstacle_persistent',
          type: 'AND',
          inputs: [],
          output: { value: false, propagated: false, timestamp: 0 },
          delay: 100,
          faultType: FaultType.OBSTACLE_DETECTED,
          description: '障碍物持续存在',
          semanticLevel: SemanticLevel.CRITICAL
        }
      ],
      connections: new Map([
        ['light_curtain_triggered', ['obstacle_detected']],
        ['force_sensor_triggered', ['obstacle_detected']],
        ['obstacle_detected', ['obstacle_persistent']]
      ]),
      active: false
    };
  }

  private createCommunicationChain(): FaultChain {
    return {
      id: 'communication_chain',
      gates: [
        {
          id: 'packet_loss_detected',
          type: 'OR',
          inputs: [],
          output: { value: false, propagated: false, timestamp: 0 },
          delay: 100
        },
        {
          id: 'timeout_occurred',
          type: 'OR',
          inputs: [],
          output: { value: false, propagated: false, timestamp: 0 },
          delay: 500
        },
        {
          id: 'comm_error_warning',
          type: 'OR',
          inputs: [],
          output: { value: false, propagated: false, timestamp: 0 },
          delay: 50,
          faultType: FaultType.COMMUNICATION_ERROR,
          description: '通信异常警告',
          semanticLevel: SemanticLevel.WARNING
        },
        {
          id: 'comm_error_critical',
          type: 'AND',
          inputs: [],
          output: { value: false, propagated: false, timestamp: 0 },
          delay: 200,
          faultType: FaultType.COMMUNICATION_ERROR,
          description: '通信中断',
          semanticLevel: SemanticLevel.CRITICAL
        }
      ],
      connections: new Map([
        ['packet_loss_detected', ['comm_error_warning']],
        ['timeout_occurred', ['comm_error_warning']],
        ['comm_error_warning', ['comm_error_critical']]
      ]),
      active: false
    };
  }

  private async evaluateGate(gate: AsyncLogicGate, chain: FaultChain): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, gate.delay));

    let result = false;
    const inputs = gate.inputs.map(i => i.value);

    switch (gate.type) {
      case 'AND':
        result = inputs.length > 0 && inputs.every(v => v);
        break;
      case 'OR':
        result = inputs.some(v => v);
        break;
      case 'NOT':
        result = inputs.length > 0 ? !inputs[0] : false;
        break;
      case 'NAND':
        result = inputs.length > 0 ? !inputs.every(v => v) : true;
        break;
      case 'NOR':
        result = !inputs.some(v => v);
        break;
      case 'XOR':
        result = inputs.filter(v => v).length % 2 === 1;
        break;
    }

    const prevOutput = this.gateOutputs.get(gate.id);
    const outputChanged = !prevOutput || prevOutput.value !== result;

    const output: LogicGateOutput = {
      value: result,
      propagated: false,
      timestamp: Date.now(),
      faultChain: chain.gates.map(g => g.id)
    };

    this.gateOutputs.set(gate.id, output);
    gate.output = output;

    if (result && outputChanged && gate.faultType && gate.semanticLevel) {
      addFaultSignal({
        faultType: gate.faultType,
        source: 'sensor',
        semanticLevel: gate.semanticLevel,
        doorId: 'PSD-0' + Math.floor(Math.random() * 6 + 1),
        description: gate.description || ''
      });
    }

    if (result && outputChanged) {
      const downstreamGates = chain.connections.get(gate.id) || [];
      for (const downstreamGateId of downstreamGates) {
        const downstreamGate = chain.gates.find(g => g.id === downstreamGateId);
        if (downstreamGate) {
          downstreamGate.inputs.push({
            id: gate.id,
            value: true,
            timestamp: Date.now()
          });
          await this.evaluateGate(downstreamGate, chain);
        }
      }
    }
  }

  public triggerFault(chainId: string, gateId: string, value: boolean = true): void {
    const chain = this.chains.get(chainId);
    if (!chain) return;

    const gate = chain.gates.find(g => g.id === gateId);
    if (!gate) return;

    chain.active = true;
    gate.inputs.push({
      id: 'external_trigger',
      value,
      timestamp: Date.now()
    });

    this.evaluateGate(gate, chain);
  }

  public triggerRandomFault(): void {
    const chainIds = Array.from(this.chains.keys());
    const randomChainId = chainIds[Math.floor(Math.random() * chainIds.length)];
    const chain = this.chains.get(randomChainId)!;
    const inputGates = chain.gates.slice(0, 2);
    const randomGate = inputGates[Math.floor(Math.random() * inputGates.length)];
    
    this.triggerFault(randomChainId, randomGate.id, true);
    
    setTimeout(() => {
      this.resetChain(randomChainId);
    }, 3000 + Math.random() * 2000);
  }

  public resetChain(chainId: string): void {
    const chain = this.chains.get(chainId);
    if (!chain) return;

    chain.active = false;
    chain.gates.forEach(gate => {
      gate.inputs = [];
      gate.output = { value: false, propagated: false, timestamp: 0 };
      this.gateOutputs.delete(gate.id);
    });
  }

  public resetAll(): void {
    this.chains.forEach((_, id) => this.resetChain(id));
  }

  public getChainStatus(chainId: string) {
    const chain = this.chains.get(chainId);
    if (!chain) return null;

    return {
      id: chain.id,
      active: chain.active,
      gates: chain.gates.map(gate => ({
        id: gate.id,
        type: gate.type,
        output: gate.output,
        faultType: gate.faultType
      }))
    };
  }

  public getAllChainsStatus() {
    return Array.from(this.chains.keys()).map(id => this.getChainStatus(id)!).filter(Boolean);
  }

  public startSimulation(interval: number = 5000): void {
    if (this.simulationInterval) return;

    this.simulationInterval = window.setInterval(() => {
      if (Math.random() > 0.7) {
        this.triggerRandomFault();
      }
    }, interval);
  }

  public stopSimulation(): void {
    if (this.simulationInterval) {
      clearInterval(this.simulationInterval);
      this.simulationInterval = null;
    }
  }
}

export const faultChainSimulator = new FaultChainSimulator();
