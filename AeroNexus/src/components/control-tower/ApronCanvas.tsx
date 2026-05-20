import React, { useRef, useEffect, useCallback } from 'react';
import type { EquipmentState, MapZone, ConflictAlert, DispatchCommand } from '@/types';
import { useControlTowerStore } from '@/store/controlTower';

interface ApronCanvasProps {
  width: number;
  height: number;
}

const EQUIPMENT_COLORS: Record<string, string> = {
  tug: '#00D4FF',
  baggage: '#00E676',
  fuel: '#FFD600',
  catering: '#FF6B35',
  bus: '#A855F7',
};

const EQUIPMENT_ICONS: Record<string, string> = {
  tug: '🚛',
  baggage: '🛄',
  fuel: '⛽',
  catering: '🍽️',
  bus: '🚌',
};

const STATUS_COLORS: Record<string, string> = {
  idle: '#5A7A9A',
  moving: '#00D4FF',
  working: '#00E676',
  charging: '#FFD600',
  error: '#FF5252',
  offline: '#37474F',
};

export const ApronCanvas: React.FC<ApronCanvasProps> = ({ width, height }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>();
  const lastTimeRef = useRef<number>(0);
  
  const {
    equipmentStates,
    commands,
    alerts,
    showTrails,
    showLabels,
    selectedEquipmentId,
    selectEquipment,
    isSimulationRunning,
    simulationSpeed,
  } = useControlTowerStore();

  const scale = Math.min(width / 300, height / 350);
  const offsetX = (width - 300 * scale) / 2;
  const offsetY = (height - 350 * scale) / 2;

  const toCanvas = useCallback((x: number, y: number) => ({
    x: offsetX + x * scale,
    y: offsetY + y * scale,
  }), [offsetX, offsetY, scale]);

  const toWorld = useCallback((x: number, y: number) => ({
    x: (x - offsetX) / scale,
    y: (y - offsetY) / scale,
  }), [offsetX, offsetY, scale]);

  const drawGrid = useCallback((ctx: CanvasRenderingContext2D) => {
    ctx.strokeStyle = 'rgba(0, 212, 255, 0.1)';
    ctx.lineWidth = 1;
    
    for (let x = 0; x <= 300; x += 20) {
      const p = toCanvas(x, 0);
      ctx.beginPath();
      ctx.moveTo(p.x, offsetY);
      ctx.lineTo(p.x, offsetY + 350 * scale);
      ctx.stroke();
    }
    
    for (let y = 0; y <= 350; y += 20) {
      const p = toCanvas(0, y);
      ctx.beginPath();
      ctx.moveTo(offsetX, p.y);
      ctx.lineTo(offsetX + 300 * scale, p.y);
      ctx.stroke();
    }
  }, [toCanvas, offsetX, offsetY, scale]);

  const drawZones = useCallback((ctx: CanvasRenderingContext2D) => {
    const zones = [
      { type: 'gate', polygon: [{ x: 30, y: 80 }, { x: 70, y: 80 }, { x: 70, y: 120 }, { x: 30, y: 120 }], color: 'rgba(0, 212, 255, 0.1)' },
      { type: 'gate', polygon: [{ x: 80, y: 80 }, { x: 120, y: 80 }, { x: 120, y: 120 }, { x: 80, y: 120 }], color: 'rgba(0, 212, 255, 0.1)' },
      { type: 'gate', polygon: [{ x: 130, y: 80 }, { x: 170, y: 80 }, { x: 170, y: 120 }, { x: 130, y: 120 }], color: 'rgba(0, 212, 255, 0.1)' },
      { type: 'gate', polygon: [{ x: 180, y: 80 }, { x: 220, y: 80 }, { x: 220, y: 120 }, { x: 180, y: 120 }], color: 'rgba(0, 212, 255, 0.1)' },
      { type: 'gate', polygon: [{ x: 230, y: 80 }, { x: 270, y: 80 }, { x: 270, y: 120 }, { x: 230, y: 120 }], color: 'rgba(0, 212, 255, 0.1)' },
      { type: 'gate', polygon: [{ x: 30, y: 180 }, { x: 70, y: 180 }, { x: 70, y: 220 }, { x: 30, y: 220 }], color: 'rgba(0, 212, 255, 0.1)' },
      { type: 'gate', polygon: [{ x: 80, y: 180 }, { x: 120, y: 180 }, { x: 120, y: 220 }, { x: 80, y: 220 }], color: 'rgba(0, 212, 255, 0.1)' },
      { type: 'gate', polygon: [{ x: 130, y: 180 }, { x: 170, y: 180 }, { x: 170, y: 220 }, { x: 130, y: 220 }], color: 'rgba(0, 212, 255, 0.1)' },
      { type: 'gate', polygon: [{ x: 180, y: 180 }, { x: 220, y: 180 }, { x: 220, y: 220 }, { x: 180, y: 220 }], color: 'rgba(0, 212, 255, 0.1)' },
      { type: 'gate', polygon: [{ x: 230, y: 180 }, { x: 270, y: 180 }, { x: 270, y: 220 }, { x: 230, y: 220 }], color: 'rgba(0, 212, 255, 0.1)' },
      { type: 'taxiway', polygon: [{ x: 0, y: 145 }, { x: 300, y: 145 }, { x: 300, y: 175 }, { x: 0, y: 175 }], color: 'rgba(255, 255, 255, 0.05)' },
      { type: 'parking', polygon: [{ x: 270, y: 0 }, { x: 300, y: 0 }, { x: 300, y: 350 }, { x: 270, y: 350 }], color: 'rgba(255, 107, 53, 0.1)' },
      { type: 'charging', polygon: [{ x: 0, y: 0 }, { x: 30, y: 0 }, { x: 30, y: 70 }, { x: 0, y: 70 }], color: 'rgba(255, 214, 0, 0.1)' },
    ];

    zones.forEach((zone) => {
      ctx.fillStyle = zone.color;
      ctx.strokeStyle = zone.color.replace('0.1', '0.3');
      ctx.lineWidth = 1;
      
      ctx.beginPath();
      zone.polygon.forEach((point, i) => {
        const p = toCanvas(point.x, point.y);
        if (i === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      });
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    });
  }, [toCanvas]);

  const drawEquipment = useCallback((ctx: CanvasRenderingContext2D, equipment: EquipmentState) => {
    const p = toCanvas(equipment.position.x, equipment.position.y);
    const color = EQUIPMENT_COLORS[equipment.type] || '#00D4FF';
    const statusColor = STATUS_COLORS[equipment.status] || '#5A7A9A';
    const isSelected = equipment.id === selectedEquipmentId;
    const size = Math.max(8, 12 * scale);
    
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(equipment.position.heading);
    
    if (isSelected) {
      ctx.shadowColor = color;
      ctx.shadowBlur = 20;
    }
    
    ctx.fillStyle = color;
    ctx.strokeStyle = isSelected ? '#FFFFFF' : statusColor;
    ctx.lineWidth = isSelected ? 2 : 1;
    
    ctx.beginPath();
    ctx.moveTo(size, 0);
    ctx.lineTo(-size * 0.6, -size * 0.5);
    ctx.lineTo(-size * 0.8, 0);
    ctx.lineTo(-size * 0.6, size * 0.5);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(size * 0.3, 0, size * 0.2, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.restore();
    
    if (showLabels) {
      ctx.fillStyle = '#E8F4FF';
      ctx.font = `${Math.max(9, 11 * scale)}px ${getComputedStyle(document.documentElement).getPropertyValue('--font-mono')}`;
      ctx.textAlign = 'center';
      ctx.fillText(equipment.name, p.x, p.y - size - 4);
      
      const batteryWidth = size * 2;
      const batteryHeight = 3;
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.fillRect(p.x - batteryWidth / 2, p.y + size + 2, batteryWidth, batteryHeight);
      
      const batteryColor = equipment.battery > 30 ? '#00E676' : equipment.battery > 10 ? '#FFD600' : '#FF5252';
      ctx.fillStyle = batteryColor;
      ctx.fillRect(p.x - batteryWidth / 2, p.y + size + 2, batteryWidth * (equipment.battery / 100), batteryHeight);
    }
    
    if (equipment.status === 'error') {
      ctx.strokeStyle = '#FF5252';
      ctx.lineWidth = 2;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.arc(p.x, p.y, size + 5, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }, [toCanvas, scale, selectedEquipmentId, showLabels]);

  const drawTrails = useCallback((ctx: CanvasRenderingContext2D, command: DispatchCommand) => {
    if (!showTrails || command.path.length < 2) return;
    
    const equipment = equipmentStates.get(command.equipmentId);
    if (!equipment) return;
    
    const color = EQUIPMENT_COLORS[equipment.type] || '#00D4FF';
    
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.globalAlpha = 0.4;
    
    ctx.beginPath();
    command.path.forEach((point, i) => {
      const p = toCanvas(point.x, point.y);
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    });
    ctx.stroke();
    
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;
    
    const target = command.path[command.path.length - 1];
    const tp = toCanvas(target.x, target.y);
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.6;
    ctx.beginPath();
    ctx.arc(tp.x, tp.y, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }, [toCanvas, showTrails, equipmentStates]);

  const drawConflictAlerts = useCallback((ctx: CanvasRenderingContext2D) => {
    const unresolvedAlerts = Array.from(alerts.values()).filter((a) => !a.resolved);
    
    unresolvedAlerts.forEach((alert) => {
      const p = toCanvas(alert.predictedPosition.x, alert.predictedPosition.y);
      
      const color = alert.level === 'critical' ? '#FF5252' : alert.level === 'warning' ? '#FFD600' : '#00D4FF';
      const radius = alert.level === 'critical' ? 25 : alert.level === 'warning' ? 20 : 15;
      
      const time = Date.now() / 500;
      const pulse = 0.5 + Math.sin(time) * 0.5;
      
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.globalAlpha = 0.3 + pulse * 0.4;
      ctx.beginPath();
      ctx.arc(p.x, p.y, radius + pulse * 10, 0, Math.PI * 2);
      ctx.stroke();
      
      ctx.globalAlpha = 0.8;
      ctx.beginPath();
      ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
      ctx.stroke();
      
      ctx.fillStyle = color;
      ctx.globalAlpha = 0.2;
      ctx.beginPath();
      ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.globalAlpha = 1;
    });
  }, [toCanvas, alerts]);

  const render = useCallback((ctx: CanvasRenderingContext2D) => {
    ctx.fillStyle = '#0A1628';
    ctx.fillRect(0, 0, width, height);
    
    drawGrid(ctx);
    drawZones(ctx);
    
    Array.from(commands.values())
      .filter((c) => c.status === 'executing')
      .forEach((c) => drawTrails(ctx, c));
    
    drawConflictAlerts(ctx);
    
    Array.from(equipmentStates.values()).forEach((e) => drawEquipment(ctx, e));
    
    ctx.strokeStyle = 'rgba(0, 212, 255, 0.3)';
    ctx.lineWidth = 2;
    ctx.strokeRect(offsetX, offsetY, 300 * scale, 350 * scale);
    
    ctx.fillStyle = 'rgba(0, 212, 255, 0.1)';
    ctx.fillRect(offsetX, offsetY, 300 * scale, 350 * scale);
  }, [width, height, drawGrid, drawZones, drawEquipment, drawTrails, drawConflictAlerts, offsetX, offsetY, scale, equipmentStates, commands]);

  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    const world = toWorld(mouseX, mouseY);
    
    let clickedEquipment: EquipmentState | null = null;
    let minDistance = Infinity;
    
    for (const equipment of equipmentStates.values()) {
      const dx = equipment.position.x - world.x;
      const dy = equipment.position.y - world.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance < 5 && distance < minDistance) {
        minDistance = distance;
        clickedEquipment = equipment;
      }
    }
    
    selectEquipment(clickedEquipment ? clickedEquipment.id : null);
  }, [toWorld, equipmentStates, selectEquipment]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    let lastFrameTime = performance.now();
    
    const animate = (currentTime: number) => {
      const deltaTime = (currentTime - lastFrameTime) / 1000;
      lastFrameTime = currentTime;
      
      if (isSimulationRunning) {
        render(ctx);
      }
      
      animationFrameRef.current = requestAnimationFrame(animate);
    };
    
    animationFrameRef.current = requestAnimationFrame(animate);
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [render, isSimulationRunning]);

  return (
    <div className="relative w-full h-full overflow-hidden bg-[#0A1628]">
      <div className="scan-line" />
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        onClick={handleCanvasClick}
        className="cursor-crosshair"
      />
      
      <div className="absolute bottom-2 left-2 flex gap-2 text-xs">
        <div className="flex items-center gap-1 px-2 py-1 bg-black/50 rounded">
          <span className="w-3 h-3 rounded-full bg-[#00D4FF]" />
          <span className="text-[#9FB8D1]">牵引车</span>
        </div>
        <div className="flex items-center gap-1 px-2 py-1 bg-black/50 rounded">
          <span className="w-3 h-3 rounded-full bg-[#00E676]" />
          <span className="text-[#9FB8D1]">行李车</span>
        </div>
        <div className="flex items-center gap-1 px-2 py-1 bg-black/50 rounded">
          <span className="w-3 h-3 rounded-full bg-[#FFD600]" />
          <span className="text-[#9FB8D1]">加油车</span>
        </div>
        <div className="flex items-center gap-1 px-2 py-1 bg-black/50 rounded">
          <span className="w-3 h-3 rounded-full bg-[#FF6B35]" />
          <span className="text-[#9FB8D1]">餐车</span>
        </div>
      </div>
    </div>
  );
};
