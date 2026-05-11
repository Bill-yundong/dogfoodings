'use client';

import { useEffect, useRef, useState } from 'react';
import { Building, LightSource, LightPollutionPoint, SimulationResult } from '@/lib/types';

interface LightPollutionMapProps {
  buildings: Building[];
  lightSources: LightSource[];
  simulationResult: SimulationResult | null;
  gridSize: number;
}

export function LightPollutionMap({
  buildings,
  lightSources,
  simulationResult,
  gridSize,
}: LightPollutionMapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isRendering, setIsRendering] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const render = async () => {
      setIsRendering(true);
      await new Promise((resolve) => setTimeout(resolve, 0));

      const scale = canvas.width / gridSize;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = '#0a0a0a';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      if (simulationResult) {
        renderPollutionGrid(ctx, simulationResult.grid, scale);
      }

      renderBuildings(ctx, buildings, scale);
      renderLightSources(ctx, lightSources, scale);

      setIsRendering(false);
    };

    render();
  }, [buildings, lightSources, simulationResult, gridSize]);

  const renderPollutionGrid = (
    ctx: CanvasRenderingContext2D,
    grid: LightPollutionPoint[][],
    scale: number
  ) => {
    for (let y = 0; y < grid.length; y++) {
      for (let x = 0; x < grid[y].length; x++) {
        const point = grid[y][x];
        if (point.intensity > 0.01) {
          const alpha = Math.min(point.intensity, 1);
          const hue = 60 - point.intensity * 60;
          ctx.fillStyle = `hsla(${hue}, 100%, 50%, ${alpha * 0.7})`;
          ctx.fillRect(x * scale, y * scale, scale, scale);
        }
      }
    }
  };

  const renderBuildings = (
    ctx: CanvasRenderingContext2D,
    buildings: Building[],
    scale: number
  ) => {
    for (const building of buildings) {
      const x = building.x * scale;
      const y = building.y * scale;
      const width = building.width * scale;
      const height = building.height * scale;

      ctx.fillStyle = building.facadeMaterial.color;
      ctx.fillRect(x, y, width, height);

      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1;
      ctx.strokeRect(x, y, width, height);

      ctx.fillStyle = '#ffffff';
      ctx.font = `${Math.max(8, scale * 2)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText(
        building.name,
        x + width / 2,
        y + height / 2
      );
    }
  };

  const renderLightSources = (
    ctx: CanvasRenderingContext2D,
    lightSources: LightSource[],
    scale: number
  ) => {
    for (const source of lightSources) {
      const x = source.x * scale;
      const y = source.y * scale;
      const radius = source.intensity * 5 * scale;

      const gradient = ctx.createRadialGradient(
        x,
        y,
        0,
        x,
        y,
        radius
      );

      gradient.addColorStop(0, `rgba(255, 255, 200, ${source.intensity})`);
      gradient.addColorStop(0.5, `rgba(255, 255, 150, ${source.intensity * 0.5})`);
      gradient.addColorStop(1, 'rgba(255, 255, 100, 0)');

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, 2 * Math.PI);
      ctx.fill();

      ctx.fillStyle = '#ffff00';
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, 2 * Math.PI);
      ctx.fill();
    }
  };

  return (
    <div className="relative">
      <canvas
        ref={canvasRef}
        width={600}
        height={600}
        className="border border-gray-700 rounded-lg bg-black"
      />
      {isRendering && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded-lg">
          <div className="text-white">渲染中...</div>
        </div>
      )}
    </div>
  );
}
