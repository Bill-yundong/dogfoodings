import React, { useEffect, useRef, useCallback } from 'react';
import { Drone, VoronoiCell, Point } from '../types';

interface VoronoiCanvasProps {
  width: number;
  height: number;
  drones: Drone[];
  cells: VoronoiCell[];
  waypoints: Map<string, Point[]>;
  visitedWaypoints: Map<string, Point[]>;
}

const COLORS = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
  '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1',
];

export const VoronoiCanvas: React.FC<VoronoiCanvasProps> = ({
  width,
  height,
  drones,
  cells,
  waypoints,
  visitedWaypoints,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#0F172A';
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = '#1E293B';
    ctx.lineWidth = 1;
    for (let x = 0; x < width; x += 50) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y < height; y += 50) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    cells.forEach((cell, index) => {
      const color = COLORS[index % COLORS.length];
      
      if (cell.polygon.length > 2) {
        ctx.beginPath();
        ctx.moveTo(cell.polygon[0].x, cell.polygon[0].y);
        for (let i = 1; i < cell.polygon.length; i++) {
          ctx.lineTo(cell.polygon[i].x, cell.polygon[i].y);
        }
        ctx.closePath();
        ctx.fillStyle = color + '20';
        ctx.fill();
        ctx.strokeStyle = color + '60';
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      ctx.beginPath();
      ctx.arc(cell.centroid.x, cell.centroid.y, 4, 0, Math.PI * 2);
      ctx.fillStyle = color + '80';
      ctx.fill();
    });

    drones.forEach((drone, index) => {
      const color = COLORS[index % COLORS.length];
      const wp = waypoints.get(drone.id) || [];
      const visited = visitedWaypoints.get(drone.id) || [];

      if (wp.length > 1) {
        ctx.beginPath();
        ctx.moveTo(wp[0].x, wp[0].y);
        for (let i = 1; i < wp.length; i++) {
          ctx.lineTo(wp[i].x, wp[i].y);
        }
        ctx.strokeStyle = color + '40';
        ctx.lineWidth = 1;
        ctx.setLineDash([5, 5]);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      visited.forEach(point => {
        ctx.beginPath();
        ctx.arc(point.x, point.y, 50, 0, Math.PI * 2);
        ctx.fillStyle = '#10B981' + '30';
        ctx.fill();
      });

      wp.forEach((point, i) => {
        ctx.beginPath();
        ctx.arc(point.x, point.y, 3, 0, Math.PI * 2);
        ctx.fillStyle = i === 0 ? color : color + '60';
        ctx.fill();
      });

      visited.forEach(point => {
        ctx.beginPath();
        ctx.arc(point.x, point.y, 4, 0, Math.PI * 2);
        ctx.fillStyle = '#10B981';
        ctx.fill();
      });

      const size = 12;
      ctx.save();
      ctx.translate(drone.position.x, drone.position.y);
      ctx.rotate(Math.atan2(drone.velocity.y, drone.velocity.x));

      ctx.beginPath();
      ctx.moveTo(size, 0);
      ctx.lineTo(-size * 0.7, -size * 0.6);
      ctx.lineTo(-size * 0.4, 0);
      ctx.lineTo(-size * 0.7, size * 0.6);
      ctx.closePath();
      ctx.fillStyle = color;
      ctx.fill();
      ctx.restore();

      const batteryColor = drone.battery > 50 ? '#10B981' : drone.battery > 20 ? '#F59E0B' : '#EF4444';
      ctx.fillStyle = batteryColor;
      ctx.fillRect(drone.position.x - 15, drone.position.y - 25, 30 * (drone.battery / 100), 4);
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 1;
      ctx.strokeRect(drone.position.x - 15, drone.position.y - 25, 30, 4);

      ctx.fillStyle = '#E2E8F0';
      ctx.font = '10px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(drone.id.slice(-4), drone.position.x, drone.position.y - 32);

      const statusColors: Record<string, string> = {
        patrolling: '#10B981',
        idle: '#64748B',
        charging: '#F59E0B',
        fault: '#EF4444',
      };
      ctx.fillStyle = statusColors[drone.status] || '#64748B';
      ctx.beginPath();
      ctx.arc(drone.position.x + 18, drone.position.y - 23, 3, 0, Math.PI * 2);
      ctx.fill();
    });
  }, [width, height, drones, cells, waypoints, visitedWaypoints]);

  useEffect(() => {
    draw();
  }, [draw]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      style={{ border: '2px solid #334155', borderRadius: '8px' }}
    />
  );
};
