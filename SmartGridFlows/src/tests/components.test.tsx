import { describe, it, expect } from 'vitest';
import { render } from '@solidjs/testing-library';
import type { EnergyStation } from '../types/energy';
import EnergyStationCard from '../components/EnergyStationCard';

describe('能源站监控组件', () => {
  const testStation: EnergyStation = {
    id: 'station-001',
    name: '东区能源站',
    location: { lat: 39.9042, lng: 116.4074 },
    balance: {
      cooling: { current: 450, target: 500, capacity: 800, efficiency: 0.85 },
      heating: { current: 320, target: 350, capacity: 600, efficiency: 0.88 },
      electricity: { current: 280, target: 300, capacity: 500, efficiency: 0.92, renewableRatio: 0.35 },
      timestamp: Date.now(),
    },
    status: 'normal',
    lastUpdate: Date.now(),
  };

  describe('场景1: 能源站卡片渲染', () => {
    it('应正确渲染能源站名称', () => {
      const { getByText } = render(() => <EnergyStationCard station={testStation} />);
      expect(getByText('东区能源站')).toBeInTheDocument();
    });

    it('应显示制冷负荷数据', () => {
      const { getByText } = render(() => <EnergyStationCard station={testStation} />);
      expect(getByText('❄️ 制冷负荷')).toBeInTheDocument();
      expect(getByText('450')).toBeInTheDocument();
    });

    it('应显示供热负荷数据', () => {
      const { getByText } = render(() => <EnergyStationCard station={testStation} />);
      expect(getByText('🔥 供热负荷')).toBeInTheDocument();
      expect(getByText('320')).toBeInTheDocument();
    });

    it('应显示电力负荷数据', () => {
      const { getByText } = render(() => <EnergyStationCard station={testStation} />);
      expect(getByText('⚡ 电力负荷')).toBeInTheDocument();
      expect(getByText('280')).toBeInTheDocument();
    });

    it('应显示效率百分比', () => {
      const { getByText } = render(() => <EnergyStationCard station={testStation} />);
      expect(getByText('效率: 85.0%')).toBeInTheDocument();
      expect(getByText('效率: 88.0%')).toBeInTheDocument();
      expect(getByText('效率: 92.0%')).toBeInTheDocument();
    });

    it('应显示可再生能源比例', () => {
      const { getByText } = render(() => <EnergyStationCard station={testStation} />);
      expect(getByText('可再生: 35.0%')).toBeInTheDocument();
    });
  });

  describe('场景2: 不同状态能源站显示', () => {
    it('正常状态应显示正确标识', () => {
      const station: EnergyStation = { ...testStation, status: 'normal' };
      const { getByText } = render(() => <EnergyStationCard station={station} />);
      expect(getByText('正常')).toBeInTheDocument();
    });

    it('警告状态应显示正确标识', () => {
      const station: EnergyStation = { ...testStation, status: 'warning' };
      const { getByText } = render(() => <EnergyStationCard station={station} />);
      expect(getByText('警告')).toBeInTheDocument();
    });

    it('异常状态应显示正确标识', () => {
      const station: EnergyStation = { ...testStation, status: 'critical' };
      const { getByText } = render(() => <EnergyStationCard station={station} />);
      expect(getByText('异常')).toBeInTheDocument();
    });
  });

  describe('场景3: 数据边界测试', () => {
    it('零负荷数据应正常显示', () => {
      const zeroLoadStation: EnergyStation = {
        ...testStation,
        balance: {
          cooling: { current: 0, target: 0, capacity: 800, efficiency: 0.85 },
          heating: { current: 0, target: 0, capacity: 600, efficiency: 0.88 },
          electricity: { current: 0, target: 0, capacity: 500, efficiency: 0.92, renewableRatio: 0.35 },
          timestamp: Date.now(),
        },
      };
      
      const { getAllByText } = render(() => <EnergyStationCard station={zeroLoadStation} />);
      const zeros = getAllByText('0');
      expect(zeros.length).toBeGreaterThan(0);
    });

    it('满负荷数据应正常显示', () => {
      const fullLoadStation: EnergyStation = {
        ...testStation,
        balance: {
          cooling: { current: 800, target: 500, capacity: 800, efficiency: 0.85 },
          heating: { current: 600, target: 350, capacity: 600, efficiency: 0.88 },
          electricity: { current: 500, target: 300, capacity: 500, efficiency: 0.92, renewableRatio: 0.35 },
          timestamp: Date.now(),
        },
      };
      
      const { getByText } = render(() => <EnergyStationCard station={fullLoadStation} />);
      expect(getByText('800')).toBeInTheDocument();
      expect(getByText('600')).toBeInTheDocument();
      expect(getByText('500')).toBeInTheDocument();
    });
  });
});
