import { describe, it, expect } from 'vitest';
import {
  FAULT_CHAIN_CONFIGS,
  evaluateGateOutput,
  LogicGateType
} from '../../domain';

describe('FaultChainService - 故障链领域服务', () => {
  describe('Fault Chain Configurations', () => {
    it('should have 4 fault chains configured', () => {
      expect(FAULT_CHAIN_CONFIGS.length).toBe(4);
    });

    it('should have motor failure chain with correct gates', () => {
      const motorChain = FAULT_CHAIN_CONFIGS.find((c: any) => c.id === 'motor_failure');
      expect(motorChain).toBeDefined();
      expect(motorChain?.name).toBe('电机故障链');
      expect(motorChain?.gates.length).toBe(4);
    });

    it('should have sensor error chain configured', () => {
      const sensorChain = FAULT_CHAIN_CONFIGS.find((c: any) => c.id === 'sensor_error');
      expect(sensorChain).toBeDefined();
      expect(sensorChain?.name).toBe('传感器错误链');
    });

    it('should have communication chain configured', () => {
      const commChain = FAULT_CHAIN_CONFIGS.find((c: any) => c.id === 'communication');
      expect(commChain).toBeDefined();
      expect(commChain?.name).toBe('通信故障链');
    });

    it('should have obstacle chain configured', () => {
      const obstacleChain = FAULT_CHAIN_CONFIGS.find((c: any) => c.id === 'obstacle');
      expect(obstacleChain).toBeDefined();
      expect(obstacleChain?.name).toBe('障碍物检测链');
    });
  });

  describe('Logic Gate Evaluation', () => {
    describe('AND Gate', () => {
      it('should return true when all inputs are true', () => {
        expect(evaluateGateOutput('AND' as LogicGateType, [true, true, true])).toBe(true);
      });

      it('should return false when any input is false', () => {
        expect(evaluateGateOutput('AND' as LogicGateType, [true, false, true])).toBe(false);
      });
    });

    describe('OR Gate', () => {
      it('should return true when any input is true', () => {
        expect(evaluateGateOutput('OR' as LogicGateType, [false, true, false])).toBe(true);
      });

      it('should return false when all inputs are false', () => {
        expect(evaluateGateOutput('OR' as LogicGateType, [false, false, false])).toBe(false);
      });
    });

    describe('NOT Gate', () => {
      it('should invert the first input', () => {
        expect(evaluateGateOutput('NOT' as LogicGateType, [true])).toBe(false);
        expect(evaluateGateOutput('NOT' as LogicGateType, [false])).toBe(true);
      });
    });

    describe('NAND Gate', () => {
      it('should return false when all inputs are true', () => {
        expect(evaluateGateOutput('NAND' as LogicGateType, [true, true, true])).toBe(false);
      });

      it('should return true when any input is false', () => {
        expect(evaluateGateOutput('NAND' as LogicGateType, [true, false, true])).toBe(true);
      });
    });

    describe('NOR Gate', () => {
      it('should return true when all inputs are false', () => {
        expect(evaluateGateOutput('NOR' as LogicGateType, [false, false, false])).toBe(true);
      });

      it('should return false when any input is true', () => {
        expect(evaluateGateOutput('NOR' as LogicGateType, [true, false, false])).toBe(false);
      });
    });

    describe('XOR Gate', () => {
      it('should return true when odd number of true inputs', () => {
        expect(evaluateGateOutput('XOR' as LogicGateType, [true])).toBe(true);
      });

      it('should return false when even number of true inputs', () => {
        expect(evaluateGateOutput('XOR' as LogicGateType, [true, true])).toBe(false);
      });
    });
  });
});
