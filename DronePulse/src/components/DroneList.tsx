import React from 'react';
import { Drone } from '../types';

interface DroneListProps {
  drones: Drone[];
  selectedDrone: string | null;
  onSelectDrone: (id: string | null) => void;
}

export const DroneList: React.FC<DroneListProps> = ({
  drones,
  selectedDrone,
  onSelectDrone,
}) => {
  const getStatusText = (status: string) => {
    const map: Record<string, string> = {
      patrolling: '巡逻中',
      idle: '待命',
      charging: '充电中',
      fault: '故障',
    };
    return map[status] || status;
  };

  const getStatusColor = (status: string) => {
    const map: Record<string, string> = {
      patrolling: '#10B981',
      idle: '#64748B',
      charging: '#F59E0B',
      fault: '#EF4444',
    };
    return map[status] || '#64748B';
  };

  return (
    <div style={{
      backgroundColor: '#1E293B',
      borderRadius: '8px',
      padding: '16px',
      color: '#E2E8F0',
      marginTop: '16px',
    }}>
      <h3 style={{ margin: '0 0 12px 0', fontSize: '14px', color: '#94A3B8' }}>
        无人机列表
      </h3>
      <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
        {drones.map(drone => (
          <div
            key={drone.id}
            onClick={() => onSelectDrone(selectedDrone === drone.id ? null : drone.id)}
            style={{
              padding: '10px',
              marginBottom: '8px',
              backgroundColor: selectedDrone === drone.id ? '#334155' : '#0F172A',
              borderRadius: '6px',
              cursor: 'pointer',
              border: `1px solid ${selectedDrone === drone.id ? '#38BDF8' : '#334155'}`,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <span style={{ fontFamily: 'monospace', fontSize: '12px' }}>
                {drone.id}
              </span>
              <span style={{
                fontSize: '11px',
                padding: '2px 6px',
                borderRadius: '4px',
                backgroundColor: getStatusColor(drone.status) + '30',
                color: getStatusColor(drone.status),
              }}>
                {getStatusText(drone.status)}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#94A3B8' }}>
              <span>位置: ({drone.position.x.toFixed(0)}, {drone.position.y.toFixed(0)})</span>
              <span style={{
                color: drone.battery > 50 ? '#10B981' : drone.battery > 20 ? '#F59E0B' : '#EF4444',
              }}>
                电量: {drone.battery.toFixed(1)}%
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
