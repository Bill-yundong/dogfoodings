import React from 'react';
import { GridCell, TrafficLevel } from '@/lib/types/traffic';

interface TrafficGridProps {
  grid: GridCell[][];
  cellSize?: number;
}

export function TrafficGrid({ grid, cellSize = 20 }: TrafficGridProps) {
  const getTrafficColor = (cell: GridCell): string => {
    if (cell.type === 'building') {
      return 'bg-slate-700';
    }
    if (cell.type === 'park') {
      return 'bg-emerald-900/50';
    }
    if (cell.type === 'intersection') {
      return 'bg-slate-600';
    }
    
    switch (cell.trafficLevel) {
      case TrafficLevel.SMOOTH:
        return 'bg-traffic-green';
      case TrafficLevel.SLOW:
        return 'bg-traffic-yellow';
      case TrafficLevel.CONGESTED:
        return 'bg-orange-500';
      case TrafficLevel.SEVERE:
        return 'bg-traffic-red';
      default:
        return 'bg-slate-600';
    }
  };

  const getCellBorder = (cell: GridCell): string => {
    if (cell.type === 'intersection') {
      return 'border-2 border-yellow-400';
    }
    if (cell.type === 'road') {
      return 'border border-slate-700';
    }
    return 'border border-slate-800';
  };

  if (grid.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 bg-slate-800 rounded-lg">
        <p className="text-slate-400">初始化仿真中...</p>
      </div>
    );
  }

  return (
    <div className="bg-slate-900 rounded-lg p-4 overflow-auto">
      <div 
        className="grid gap-0 inline-block"
        style={{
          gridTemplateColumns: `repeat(${grid[0]?.length || 0}, ${cellSize}px)`,
          gridTemplateRows: `repeat(${grid.length}, ${cellSize}px)`,
        }}
      >
        {grid.map((row, y) =>
          row.map((cell, x) => (
            <div
              key={`${x}-${y}`}
              className={`grid-cell ${getTrafficColor(cell)} ${getCellBorder(cell)} ${
                cell.vehicle ? 'ring-1 ring-white/30' : ''
              } ${cell.trafficLevel >= TrafficLevel.CONGESTED ? 'animate-pulse' : ''}`}
              style={{ width: cellSize, height: cellSize }}
              title={`(${x}, ${y}) - ${cell.trafficLevel} - ${cell.type}`}
            />
          ))
        )}
      </div>
    </div>
  );
}