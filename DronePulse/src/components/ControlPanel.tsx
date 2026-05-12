import React from 'react';
import { Drone } from '../types';

interface ControlPanelProps {
  droneCount: number;
  isRunning: boolean;
  isPatrolling: boolean;
  totalCoverage: number;
  drones: Drone[];
  onDroneCountChange: (count: number) => void;
  onStartSimulation: () => void;
  onStopSimulation: () => void;
  onStartPatrolling: () => void;
  onStopPatrolling: () => void;
  onRecalculateVoronoi: () => void;
  onSyncNow: () => void;
}

export const ControlPanel: React.FC<ControlPanelProps> = ({
  droneCount,
  isRunning,
  isPatrolling,
  totalCoverage,
  drones,
  onDroneCountChange,
  onStartSimulation,
  onStopSimulation,
  onStartPatrolling,
  onStopPatrolling,
  onRecalculateVoronoi,
  onSyncNow,
}) => {
  const statusCounts = {
    patrolling: drones.filter(d => d.status === 'patrolling').length,
    idle: drones.filter(d => d.status === 'idle').length,
    charging: drones.filter(d => d.status === 'charging').length,
    fault: drones.filter(d => d.status === 'fault').length,
  };

  const avgBattery = drones.length > 0
    ? (drones.reduce((sum, d) => sum + d.battery, 0) / drones.length).toFixed(1)
    : '0';

  return (
    <div style={{
      backgroundColor: '#1E293B',
      borderRadius: '8px',
      padding: '16px',
      color: '#E2E8F0',
      minWidth: '280px',
    }}>
      <h2 style={{ margin: '0 0 16px 0', fontSize: '18px', color: '#38BDF8' }}>
        指挥中心控制
      </h2>

      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px' }}>
          无人机数量: {droneCount}
        </label>
        <input
          type="range"
          min="3"
          max="10"
          value={droneCount}
          onChange={(e) => onDroneCountChange(Number(e.target.value))}
          disabled={isRunning}
          style={{ width: '100%' }}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '20px' }}>
        <button
          onClick={onStartSimulation}
          disabled={isRunning}
          style={{
            padding: '8px 16px',
            backgroundColor: isRunning ? '#475569' : '#10B981',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: isRunning ? 'not-allowed' : 'pointer',
          }}
        >
          启动仿真
        </button>
        <button
          onClick={onStopSimulation}
          disabled={!isRunning}
          style={{
            padding: '8px 16px',
            backgroundColor: !isRunning ? '#475569' : '#EF4444',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: !isRunning ? 'not-allowed' : 'pointer',
          }}
        >
          停止仿真
        </button>
        <button
          onClick={onStartPatrolling}
          disabled={!isRunning || isPatrolling}
          style={{
            padding: '8px 16px',
            backgroundColor: !isRunning || isPatrolling ? '#475569' : '#3B82F6',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: !isRunning || isPatrolling ? 'not-allowed' : 'pointer',
          }}
        >
          开始巡逻
        </button>
        <button
          onClick={onStopPatrolling}
          disabled={!isRunning || !isPatrolling}
          style={{
            padding: '8px 16px',
            backgroundColor: !isRunning || !isPatrolling ? '#475569' : '#F59E0B',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: !isRunning || !isPatrolling ? 'not-allowed' : 'pointer',
          }}
        >
          暂停巡逻
        </button>
      </div>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
        <button
          onClick={onRecalculateVoronoi}
          style={{
            flex: 1,
            padding: '8px 16px',
            backgroundColor: '#8B5CF6',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          重算 Voronoi
        </button>
        <button
          onClick={onSyncNow}
          style={{
            flex: 1,
            padding: '8px 16px',
            backgroundColor: '#06B6D4',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          立即同步
        </button>
      </div>

      <div style={{ marginBottom: '16px' }}>
        <h3 style={{ margin: '0 0 12px 0', fontSize: '14px', color: '#94A3B8' }}>
          状态概览
        </h3>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
          <span style={{ color: '#10B981' }}>● 巡逻中</span>
          <span>{statusCounts.patrolling}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
          <span style={{ color: '#64748B' }}>● 待命</span>
          <span>{statusCounts.idle}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
          <span style={{ color: '#F59E0B' }}>● 充电中</span>
          <span>{statusCounts.charging}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: '#EF4444' }}>● 故障</span>
          <span>{statusCounts.fault}</span>
        </div>
      </div>

      <div style={{ marginBottom: '16px' }}>
        <h3 style={{ margin: '0 0 12px 0', fontSize: '14px', color: '#94A3B8' }}>
          系统状态
        </h3>
        <div style={{ marginBottom: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
            <span>区域覆盖率</span>
            <span>{totalCoverage.toFixed(1)}%</span>
          </div>
          <div style={{
            width: '100%',
            height: '8px',
            backgroundColor: '#334155',
            borderRadius: '4px',
            overflow: 'hidden',
          }}>
            <div style={{
              width: `${totalCoverage}%`,
              height: '100%',
              backgroundColor: totalCoverage > 80 ? '#10B981' : totalCoverage > 50 ? '#3B82F6' : '#F59E0B',
              transition: 'width 0.3s',
            }} />
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>平均电量</span>
          <span style={{
            color: Number(avgBattery) > 50 ? '#10B981' : Number(avgBattery) > 20 ? '#F59E0B' : '#EF4444',
          }}>
            {avgBattery}%
          </span>
        </div>
      </div>
    </div>
  );
};
