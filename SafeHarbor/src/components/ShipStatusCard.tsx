import React from 'react';
import type { Ship, AnchorStatus } from '../types';
import { formatForce, formatNumber, getDragRiskLabel } from '../utils/format';
import type { DragRiskLevel } from '../types';

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
  const riskLevel: DragRiskLevel = status?.dragRisk || 'low';

  const getBorderClass = () => {
    switch (riskLevel) {
      case 'low': return 'ship-card-border-low';
      case 'medium': return 'ship-card-border-medium';
      case 'high': return 'ship-card-border-high';
      case 'critical': return 'ship-card-border-critical';
      default: return 'ship-card-border-low';
    }
  };

  const getBadgeClass = () => {
    switch (riskLevel) {
      case 'low': return 'badge-low';
      case 'medium': return 'badge-medium';
      case 'high': return 'badge-high';
      case 'critical': return 'badge-critical';
      default: return 'badge-low';
    }
  };

  const getRiskIndicatorClass = () => {
    switch (riskLevel) {
      case 'low': return 'risk-indicator-low';
      case 'medium': return 'risk-indicator-medium';
      case 'high': return 'risk-indicator-high';
      case 'critical': return 'risk-indicator-critical';
      default: return 'risk-indicator-low';
    }
  };

  return (
    <div className={`card ${getBorderClass()} overflow-hidden animate-slide-in`}>
      <div className="card-header flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-ocean-100 flex items-center justify-center">
            <svg className="w-5 h-5 text-ocean-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <div>
            <h3 className="font-semibold text-navy-800">{ship.name}</h3>
            <p className="text-xs text-navy-500">MMSI: {ship.mmsi}</p>
          </div>
        </div>
        {status && (
          <span className={`badge ${getBadgeClass()} flex items-center gap-1.5`}>
            <span className={`risk-indicator ${getRiskIndicatorClass()}`}></span>
            {getDragRiskLabel(riskLevel)}
          </span>
        )}
      </div>

      <div className="card-body">
        <div className="grid grid-cols-2 gap-4 mb-4">
          <DataItem label="总长" value={`${ship.length} m`} />
          <DataItem label="型宽" value={`${ship.width} m`} />
          <DataItem label="吃水" value={`${ship.draft} m`} />
          <DataItem label="总吨" value={`${ship.grossTonnage} GT`} />
        </div>

        {status && (
          <div className="bg-navy-50 rounded-lg p-4 mb-4">
            <h4 className="text-sm font-medium text-navy-700 mb-3 flex items-center gap-2">
              <svg className="w-4 h-4 text-ocean-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              锚泊状态
            </h4>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <DataItem
                label="出链比"
                value={formatNumber(status.scope, 1)}
                highlight
              />
              <DataItem
                label="抓力"
                value={formatForce(status.holdingPower)}
                highlight
              />
              <DataItem
                label="风速"
                value={`${formatNumber(status.weather.windSpeed, 1)} m/s`}
                highlight
              />
              <DataItem
                label="浪高"
                value={`${formatNumber(status.weather.waveHeight, 1)} m`}
                highlight
              />
            </div>
          </div>
        )}

        <button
          onClick={() => onSimulate(ship.id)}
          disabled={isSimulating}
          className="w-full btn-primary flex items-center justify-center gap-2"
        >
          {isSimulating ? (
            <>
              <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              模拟计算中...
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              模拟锚泊稳定性
            </>
          )}
        </button>
      </div>
    </div>
  );
};

interface DataItemProps {
  label: string;
  value: string;
  highlight?: boolean;
}

const DataItem: React.FC<DataItemProps> = ({ label, value, highlight = false }) => (
  <div>
    <p className="text-xs text-navy-500">{label}</p>
    <p className={`font-medium ${highlight ? 'text-ocean-600' : 'text-navy-700'}`}>{value}</p>
  </div>
);
