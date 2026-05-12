import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { FaultChainSimulator } from '../../application';
import { FaultType, SemanticLevel, DOOR_IDS } from '../../domain';

describe('FaultChainSimulator - 异步逻辑门阵列故障链模拟器', () => {
  let simulator: FaultChainSimulator;

  beforeEach(() => {
    simulator = new FaultChainSimulator();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('初始化', () => {
    it('should initialize with 4 fault chains', () => {
      const chainStates = simulator.getAllChainStates();
      expect(chainStates.length).toBe(4);
    });

    it('should have all chains in inactive state initially', () => {
      const chainStates = simulator.getAllChainStates();
      chainStates.forEach((chain: any) => {
        expect(chain.active).toBe(false);
      });
    });
  });

  describe('故障触发回调', () => {
    it('should allow setting fault callback', () => {
      const callback = vi.fn();
      simulator.setFaultCallback(callback);
      expect(callback).toBeDefined();
    });
  });

  describe('故障触发', () => {
    it('should set chain to active when fault is triggered', () => {
      simulator.triggerFault('motor_failure', 'current_sensor');

      const chainStates = simulator.getAllChainStates();
      const motorChain = chainStates.find((c: any) => c.id === 'motor_failure');
      expect(motorChain?.active).toBe(true);
    });
  });

  describe('故障链重置', () => {
    it('should reset a single chain', () => {
      simulator.triggerFault('motor_failure', 'current_sensor');
      simulator.resetChain('motor_failure');

      const chainStates = simulator.getAllChainStates();
      const motorChain = chainStates.find((c: any) => c.id === 'motor_failure');
      expect(motorChain?.active).toBe(false);
    });

    it('should reset all chains at once', () => {
      simulator.triggerFault('motor_failure', 'current_sensor');
      simulator.triggerFault('sensor_error', 'position_sensor');

      simulator.resetAll();

      const chainStates = simulator.getAllChainStates();
      chainStates.forEach((chain: any) => {
        expect(chain.active).toBe(false);
      });
    });
  });

  describe('模拟模式', () => {
    it('should not be simulating initially', () => {
      expect(simulator.isSimulating()).toBe(false);
    });

    it('should start simulation', () => {
      simulator.startSimulation();
      expect(simulator.isSimulating()).toBe(true);
    });

    it('should stop simulation', () => {
      simulator.startSimulation();
      simulator.stopSimulation();
      expect(simulator.isSimulating()).toBe(false);
    });
  });
});
