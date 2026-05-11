import React, { useRef, useEffect, useCallback } from 'react';
import { Building, NoiseSource } from '../types';

interface HeatmapCanvasProps {
  gridData: number[][];
  buildings: Building[];
  sources: NoiseSource[];
  width: number;
  height: number;
  cellSize: number;
  minValue?: number;
  maxValue?: number;
}

export const getColorForValue = (
  value: number,
  min: number,
  max: number,
  opacity: number = 0.8
): string => {
  const normalized = max === min ? 0 : Math.max(0, Math.min(1, (value - min) / (max - min)));

  if (normalized < 0.2) {
    const t = normalized / 0.2;
    return `rgba(${Math.floor(0 + t * 0)}, ${Math.floor(100 + t * 55)}, ${Math.floor(255 - t * 55)}, ${opacity})`;
  } else if (normalized < 0.4) {
    const t = (normalized - 0.2) / 0.2;
    return `rgba(${Math.floor(0 + t * 85)}, ${Math.floor(155 + t * 100)}, ${Math.floor(200 - t * 100)}, ${opacity})`;
  } else if (normalized < 0.6) {
    const t = (normalized - 0.4) / 0.2;
    return `rgba(${Math.floor(85 + t * 170)}, ${Math.floor(255 - t * 85)}, ${Math.floor(100 - t * 50)}, ${opacity})`;
  } else if (normalized < 0.8) {
    const t = (normalized - 0.6) / 0.2;
    return `rgba(${Math.floor(255)}, ${Math.floor(170 - t * 100)}, ${Math.floor(50 + t * 50)}, ${opacity})`;
  } else {
    const t = (normalized - 0.8) / 0.2;
    return `rgba(${Math.floor(255 - t * 55)}, ${Math.floor(70 - t * 70)}, ${Math.floor(100 + t * 100)}, ${opacity})`;
  }
};

export const HeatmapCanvas: React.FC<HeatmapCanvasProps> = ({
  gridData,
  buildings,
  sources,
  width,
  height,
  cellSize,
  minValue = 0,
  maxValue = 100
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const drawHeatmap = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, width, height);

    const rows = gridData.length;
    if (rows === 0) return;
    const cols = gridData[0].length;

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const value = gridData[row][col];
        const x = col * cellSize;
        const y = row * cellSize;

        ctx.fillStyle = getColorForValue(value, minValue, maxValue);
        ctx.fillRect(x, y, cellSize, cellSize);
      }
    }
  }, [gridData, width, height, cellSize, minValue, maxValue]);

  const drawBuildings = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    for (const building of buildings) {
      ctx.fillStyle = 'rgba(50, 50, 60, 0.9)';
      ctx.fillRect(building.x, building.y, building.width, building.height);

      ctx.strokeStyle = 'rgba(100, 100, 120, 1)';
      ctx.lineWidth = 1;
      ctx.strokeRect(building.x, building.y, building.width, building.height);

      const windowRows = Math.floor(building.height / 15);
      const windowCols = Math.floor(building.width / 12);
      const windowWidth = (building.width - 8) / windowCols;
      const windowHeight = (building.height - 8) / windowRows;

      for (let r = 0; r < windowRows; r++) {
        for (let c = 0; c < windowCols; c++) {
          const wx = building.x + 4 + c * windowWidth + 1;
          const wy = building.y + 4 + r * windowHeight + 1;
          ctx.fillStyle = Math.random() > 0.3 ? 'rgba(255, 230, 150, 0.8)' : 'rgba(50, 50, 60, 0.8)';
          ctx.fillRect(wx, wy, windowWidth - 2, windowHeight - 2);
        }
      }
    }
  }, [buildings]);

  const drawSources = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    for (const source of sources) {
      if (!source.active) continue;

      const gradient = ctx.createRadialGradient(source.x, source.y, 0, source.x, source.y, 30);
      gradient.addColorStop(0, 'rgba(255, 100, 100, 0.8)');
      gradient.addColorStop(0.5, 'rgba(255, 100, 100, 0.3)');
      gradient.addColorStop(1, 'rgba(255, 100, 100, 0)');

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(source.x, source.y, 30, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#ff4444';
      ctx.beginPath();
      ctx.arc(source.x, source.y, 8, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 10px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('♪', source.x, source.y);
    }
  }, [sources]);

  const drawLegend = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const legendX = width - 60;
    const legendY = 20;
    const legendWidth = 30;
    const legendHeight = 150;

    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.fillRect(legendX - 10, legendY - 10, legendWidth + 40, legendHeight + 40);

    ctx.strokeStyle = 'rgba(200, 200, 200, 1)';
    ctx.lineWidth = 1;
    ctx.strokeRect(legendX - 10, legendY - 10, legendWidth + 40, legendHeight + 40);

    const gradient = ctx.createLinearGradient(legendX, legendY, legendX, legendY + legendHeight);
    const steps = 10;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const value = minValue + t * (maxValue - minValue);
      const color = getColorForValue(value, minValue, maxValue, 1);
      gradient.addColorStop(t, color);
    }

    ctx.fillStyle = gradient;
    ctx.fillRect(legendX, legendY, legendWidth, legendHeight);

    ctx.fillStyle = '#333';
    ctx.font = '10px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(`${maxValue} dB`, legendX + legendWidth + 8, legendY + 5);
    ctx.fillText(`${Math.round((maxValue + minValue) / 2)} dB`, legendX + legendWidth + 8, legendY + legendHeight / 2);
    ctx.fillText(`${minValue} dB`, legendX + legendWidth + 8, legendY + legendHeight + 3);

    ctx.fillStyle = '#333';
    ctx.font = 'bold 11px Arial';
    ctx.fillText('噪声级', legendX - 5, legendY - 15);
  }, [width, minValue, maxValue]);

  useEffect(() => {
    drawHeatmap();
    drawBuildings();
    drawSources();
    drawLegend();
  }, [drawHeatmap, drawBuildings, drawSources, drawLegend]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      style={{
        border: '2px solid #333',
        borderRadius: '8px',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
      }}
    />
  );
};
