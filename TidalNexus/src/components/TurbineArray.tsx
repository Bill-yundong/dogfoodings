import React from 'react';
import { ArrayLayout } from '../types/tidal';

interface TurbineArrayProps {
  layout: ArrayLayout;
}

export const TurbineArray: React.FC<TurbineArrayProps> = ({ layout }) => {
  const latitudes = layout.turbines.map((t) => t.location.latitude);
  const longitudes = layout.turbines.map((t) => t.location.longitude);
  const minLat = Math.min(...latitudes);
  const maxLat = Math.max(...latitudes);
  const minLon = Math.min(...longitudes);
  const maxLon = Math.max(...longitudes);

  const padding = 0.0001;
  const viewBox = {
    minLat: minLat - padding,
    maxLat: maxLat + padding,
    minLon: minLon - padding,
    maxLon: maxLon + padding,
  };

  const svgWidth = 400;
  const svgHeight = 300;

  const toSvgX = (lon: number) => {
    return ((lon - viewBox.minLon) / (viewBox.maxLon - viewBox.minLon)) * svgWidth;
  };

  const toSvgY = (lat: number) => {
    return svgHeight - ((lat - viewBox.minLat) / (viewBox.maxLat - viewBox.minLat)) * svgHeight;
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-4">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">潮流能发电阵列布局</h3>
      
      <svg width={svgWidth} height={svgHeight} className="mx-auto border border-gray-200 rounded">
        <defs>
          <radialGradient id="turbineGradient" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#3B82F6" />
            <stop offset="100%" stopColor="#1E40AF" />
          </radialGradient>
        </defs>

        <line
          x1={toSvgX(viewBox.minLon)}
          y1={toSvgY(layout.centerLocation.latitude)}
          x2={toSvgX(viewBox.maxLon)}
          y2={toSvgY(layout.centerLocation.latitude)}
          stroke="#E5E7EB"
          strokeWidth="1"
          strokeDasharray="5,5"
        />
        <line
          x1={toSvgX(layout.centerLocation.longitude)}
          y1={toSvgY(viewBox.maxLat)}
          x2={toSvgX(layout.centerLocation.longitude)}
          y2={toSvgY(viewBox.minLat)}
          stroke="#E5E7EB"
          strokeWidth="1"
          strokeDasharray="5,5"
        />

        {layout.turbines.map((turbine) => {
          const x = toSvgX(turbine.location.longitude);
          const y = toSvgY(turbine.location.latitude);
          const rotorRadius = 12;

          return (
            <g key={turbine.id}>
              <circle cx={x} cy={y} r={rotorRadius + 5} fill="#DBEAFE" />
              <line
                x1={x - rotorRadius}
                y1={y}
                x2={x + rotorRadius}
                y2={y}
                stroke="#3B82F6"
                strokeWidth="3"
              />
              <line
                x1={x}
                y1={y - rotorRadius}
                x2={x}
                y2={y + rotorRadius}
                stroke="#3B82F6"
                strokeWidth="3"
              />
              <circle cx={x} cy={y} r={5} fill="url(#turbineGradient)" />
            </g>
          );
        })}
      </svg>

      <div className="mt-4 text-sm text-gray-600 space-y-1">
        <div className="flex justify-between">
        <span>涡轮机数量:</span>
        <span className="font-medium">{layout.turbines.length} 台</span>
      </div>
      <div className="flex justify-between">
        <span>纵向间距:</span>
        <span className="font-medium">{layout.spacing.longitudinal.toFixed(1)} m</span>
      </div>
      <div className="flex justify-between">
        <span>横向间距:</span>
        <span className="font-medium">{layout.spacing.lateral.toFixed(1)} m</span>
      </div>
      </div>
    </div>
  );
};