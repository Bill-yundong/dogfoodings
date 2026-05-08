import { useRef, useEffect } from 'react';
import { SignalPhase } from '../types';

const CELL_SIZE = 5;
const ROAD_COLOR = '#333';
const LANE_LINE_COLOR = '#555';
const VEHICLE_COLOR = '#4CAF50';
const VEHICLE_COLOR_2 = '#2196F3';
const INTERSECTION_COLOR = '#666';
const PHASE_COLORS = {
  [SignalPhase.GREEN]: '#4CAF50',
  [SignalPhase.YELLOW]: '#FFC107',
  [SignalPhase.RED]: '#F44336'
};

export function RoadNetworkCanvas({ 
  simulation, 
  width = 800, 
  height = 600,
  cellSize = CELL_SIZE 
}) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !simulation) return;

    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, width, height);

    drawRoads(ctx, width, height, cellSize);
    drawGrid(ctx, simulation, cellSize);
    drawVehicles(ctx, simulation, cellSize);
    drawIntersections(ctx, simulation, cellSize);
  }, [simulation, width, height, cellSize]);

  function drawRoads(ctx, w, h, cs) {
    const midX = Math.floor(w / 2);
    const midY = Math.floor(h / 2);
    
    ctx.fillStyle = ROAD_COLOR;
    ctx.fillRect(0, midY - cs * 2, w, cs * 4);
    ctx.fillRect(midX - cs * 2, 0, cs * 4, h);

    ctx.strokeStyle = LANE_LINE_COLOR;
    ctx.lineWidth = 1;
    ctx.setLineDash([10, 5]);
    
    ctx.beginPath();
    ctx.moveTo(0, midY);
    ctx.lineTo(w, midY);
    ctx.stroke();
    
    ctx.beginPath();
    ctx.moveTo(midX, 0);
    ctx.lineTo(midX, h);
    ctx.stroke();
    
    ctx.setLineDash([]);
  }

  function drawGrid(ctx, sim, cs) {
    const grid = sim.getGridState();
    
    for (let y = 0; y < grid.length; y++) {
      for (let x = 0; x < grid[y].length; x++) {
        const cell = grid[y][x];
        
        if (cell.isIntersection) {
          ctx.fillStyle = INTERSECTION_COLOR;
          ctx.fillRect(x * cs, y * cs, cs, cs);
        }
      }
    }
  }

  function drawVehicles(ctx, sim, cs) {
    const grid = sim.getGridState();
    
    for (let y = 0; y < grid.length; y++) {
      for (let x = 0; x < grid[y].length; x++) {
        const cell = grid[y][x];
        
        if (cell.hasVehicle) {
          const vehicle = sim.vehicles.find(v => v.id === cell.vehicleId);
          ctx.fillStyle = vehicle?.speed === 0 ? VEHICLE_COLOR_2 : VEHICLE_COLOR;
          
          const padding = 1;
          ctx.fillRect(
            x * cs + padding, 
            y * cs + padding, 
            cs - padding * 2, 
            cs - padding * 2
          );
        }
      }
    }
  }

  function drawIntersections(ctx, sim, cs) {
    const intersections = sim.getIntersectionStates();
    
    for (const id in intersections) {
      const int = intersections[id];
      const phaseColor = PHASE_COLORS[int.phase] || '#999';
      
      const centerX = int.x * cs + cs / 2;
      const centerY = int.y * cs + cs / 2;
      const radius = cs;
      
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      ctx.fillStyle = phaseColor;
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.stroke();
      
      ctx.fillStyle = '#fff';
      ctx.font = '10px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(int.direction[0].toUpperCase(), centerX, centerY);
      
      const progress = int.timer / int.config[
        int.phase === SignalPhase.GREEN 
          ? (int.direction === 'north' ? 'greenTimeNS' : 'greenTimeEW')
          : 'yellowTime'
      ] || 0;
      
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius + 3, -Math.PI / 2, -Math.PI / 2 + progress * Math.PI * 2);
      ctx.strokeStyle = phaseColor;
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      style={{
        border: '2px solid #ddd',
        borderRadius: '8px',
        backgroundColor: '#f8f9fa'
      }}
    />
  );
}
