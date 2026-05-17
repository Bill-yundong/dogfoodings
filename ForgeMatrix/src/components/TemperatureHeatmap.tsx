import React from 'react';
import { TemperaturePoint } from '../types';

interface TemperatureHeatmapProps {
  data: TemperaturePoint[][];
  width?: number;
  height?: number;
}

export const TemperatureHeatmap: React.FC<TemperatureHeatmapProps> = ({
  data,
  width = 400,
  height = 400
}) => {
  if (!data || data.length === 0) {
    return <div style={{ width, height, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      暂无数据
    </div>;
  }

  const rows = data.length;
  const cols = data[0].length;
  const cellWidth = width / cols;
  const cellHeight = height / rows;

  const getColor = (temp: number): string => {
    const normalized = Math.min(Math.max((temp - 25) / (1200 - 25), 0), 1);
    const r = Math.round(normalized * 255);
    const g = Math.round((1 - Math.abs(normalized - 0.5) * 2) * 150);
    const b = Math.round((1 - normalized) * 255);
    return `rgb(${r}, ${g}, ${b})`;
  };

  return (
    <div style={{ width, height: height + 40, paddingBottom: 40 }}>
      <svg width={width} height={height}>
        {data.map((row, i) =>
          row.map((point, j) => (
            <rect
              key={`${i}-${j}`}
              x={j * cellWidth}
              y={i * cellHeight}
              width={cellWidth}
              height={cellHeight}
              fill={getColor(point.temperature)}
              stroke="rgba(255,255,255,0.1)"
              strokeWidth="0.5"
            />
          ))
        )}
      </svg>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        fontSize: '12px',
        color: '#666',
        marginTop: 8,
        padding: '0 4px'
      }}>
        <span>25°C</span>
        <span>600°C</span>
        <span>1200°C</span>
      </div>
    </div>
  );
};
