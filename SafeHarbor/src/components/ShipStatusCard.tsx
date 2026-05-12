import React from 'react';
import type { Ship, AnchorStatus } from '../types';
import { getRiskColor, getRiskLabel } from '../models/catenary';

interface ShipStatusCardProps {
  ship: Ship;
  status?: AnchorStatus;
  onSimulate: (shipId: string) => void;
}

export const ShipStatusCard: React.FC<ShipStatusCardProps> = ({ ship, status, onSimulate }) => {
  return (
    <div className="bg-white rounded-lg shadow-md p-6 border-l-4" 
         style={{ borderLeftColor: status ? getRiskColor(status.dragRisk) : '#94a3b8' }}>
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-800">{ship.name}</h3>
          <p className="text-sm text-gray-500">MMSI: {ship.mmsi}</p>
        </div>
        {status && (
          <span 
            className="px-3 py-1 rounded-full text-white text-sm font-medium"
            style={{ backgroundColor: getRiskColor(status.dragRisk) }}
          >
            {getRiskLabel(status.dragRisk)}
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
        <div>
          <p className="text-gray-500">总长</p>
          <p className="font-medium">{ship.length} m</p>
        </div>
        <div>
          <p className="text-gray-500">型宽</p>
          <p className="font-medium">{ship.width} m</p>
        </div>
        <div>
          <p className="text-gray-500">吃水</p>
          <p className="font-medium">{ship.draft} m</p>
        </div>
        <div>
          <p className="text-gray-500">总吨</p>
          <p className="font-medium">{ship.grossTonnage} GT</p>
        </div>
        <div>
          <p className="text-gray-500">锚链长度</p>
          <p className="font-medium">{ship.anchorChainLength} m</p>
        </div>
        <div>
          <p className="text-gray-500">锚重</p>
          <p className="font-medium">{ship.anchorWeight} t</p>
        </div>
      </div>

      {status && (
        <div className="border-t pt-4 mb-4">
          <h4 className="font-medium text-gray-700 mb-3">锚泊状态</h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-500">出链比</p>
              <p className="font-medium">{status.scope.toFixed(1)}</p>
            </div>
            <div>
              <p className="text-gray-500">抓力</p>
              <p className="font-medium">{(status.holdingPower / 1000).toFixed(1)} kN</p>
            </div>
            <div>
              <p className="text-gray-500">风速</p>
              <p className="font-medium">{status.weather.windSpeed.toFixed(1)} m/s</p>
            </div>
            <div>
              <p className="text-gray-500">浪高</p>
              <p className="font-medium">{status.weather.waveHeight.toFixed(1)} m</p>
            </div>
          </div>
        </div>
      )}

      <button
        onClick={() => onSimulate(ship.id)}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
      >
        模拟锚泊稳定性
      </button>
    </div>
  );
};
