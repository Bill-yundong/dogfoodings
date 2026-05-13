import React from 'react';
import type { Ship, AnchorStatus } from '../types';
import { getDragRiskColor, getDragRiskLabel, formatForce, formatNumber } from '../utils/format';

interface ShipStatusCardProps {
  ship: Ship;
  status?: AnchorStatus;
  onSimulate: (shipId: string) => void;
  isSimulating?: boolean;
}

export const ShipStatusCard: React.FC<ShipStatusCardProps> = ({ 
  ship, 
  status, 
  onSimulate,
  isSimulating = false
}) => {
  const borderColor = status ? getDragRiskColor(status.dragRisk) : '#94a3b8';

  return (
    <div 
      className="bg-white rounded-lg shadow-md p-6 border-l-4 transition-all"
      style={{ borderLeftColor: borderColor }}
    >
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-800">{ship.name}</h3>
          <p className="text-sm text-gray-500">MMSI: {ship.mmsi}</p>
        </div>
        {status && (
          <span 
            className="px-3 py-1 rounded-full text-white text-sm font-medium"
            style={{ backgroundColor: getDragRiskColor(status.dragRisk) }}
          >
            {getDragRiskLabel(status.dragRisk)}
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
        <ShipInfoItem label="总长" value={`${ship.length} m`} />
        <ShipInfoItem label="型宽" value={`${ship.width} m`} />
        <ShipInfoItem label="吃水" value={`${ship.draft} m`} />
        <ShipInfoItem label="总吨" value={`${ship.grossTonnage} GT`} />
        <ShipInfoItem label="锚链长度" value={`${ship.anchorChainLength} m`} />
        <ShipInfoItem label="锚重" value={`${ship.anchorWeight} t`} />
      </div>

      {status && (
        <div className="border-t pt-4 mb-4">
          <h4 className="font-medium text-gray-700 mb-3">锚泊状态</h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <ShipInfoItem label="出链比" value={formatNumber(status.scope, 1)} />
            <ShipInfoItem label="抓力" value={formatForce(status.holdingPower)} />
            <ShipInfoItem label="风速" value={`${formatNumber(status.weather.windSpeed, 1)} m/s`} />
            <ShipInfoItem label="浪高" value={`${formatNumber(status.weather.waveHeight, 1)} m`} />
          </div>
        </div>
      )}

      <button
        onClick={() => onSimulate(ship.id)}
        disabled={isSimulating}
        className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-2 px-4 rounded-lg transition-colors"
      >
        {isSimulating ? '模拟中...' : '模拟锚泊稳定性'}
      </button>
    </div>
  );
};

const ShipInfoItem: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div>
    <p className="text-gray-500">{label}</p>
    <p className="font-medium">{value}</p>
  </div>
);
