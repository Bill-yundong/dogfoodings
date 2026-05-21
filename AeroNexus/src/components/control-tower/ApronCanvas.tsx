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

const STATUS_COLORS: Record<string, string> = {
  idle: '#5A7A9A',
  moving: '#00D4FF',
  working: '#00E676',
  charging: '#FFD600',
  error: '#FF5252',
  offline: '#37474F',
};

const ZONE_COLORS: Record<string, { fill: string; stroke: string }> = {
  gate: { fill: 'rgba(0, 212, 255, 0.08)', stroke: 'rgba(0, 212, 255, 0.4)' },
  taxiway: { fill: 'rgba(255, 255, 255, 0.03)', stroke: 'rgba(255, 255, 255, 0.1)' },
  parking: { fill: 'rgba(255, 107, 53, 0.08)', stroke: 'rgba(255, 107, 53, 0.3)' },
  charging: { fill: 'rgba(255, 214, 0, 0.08)', stroke: 'rgba(255, 214, 0, 0.3)' },
  restricted: { fill: 'rgba(255, 82, 82, 0.08)', stroke: 'rgba(255, 82, 82, 0.3)' },
};

export const ApronCanvas: React.FC<ApronCanvasProps> = ({ width, height }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>();
  const trailsRef = useRef<Map<string, { x: number; y: number; t: number }[]>>(new Map());
  
  const {
    equipmentStates,
    commands,
    alerts,
    showTrails,
    showLabels,
    selectedEquipmentId,
    selectEquipment,
    isSimulationRunning,
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

  const drawBackground = useCallback((ctx: CanvasRenderingContext2D) => {
    const gradient = ctx.createRadialGradient(
      width / 2, height / 2, 0,
      width / 2, height / 2, Math.max(width, height) / 1.5
    );
    gradient.addColorStop(0, '#0F2137');
    gradient.addColorStop(1, '#0A1628');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
  }, [width, height]);

  const drawGrid = useCallback((ctx: CanvasRenderingContext2D) => {
    ctx.strokeStyle = 'rgba(0, 212, 255, 0.06)';
    ctx.lineWidth = 1;
    
    for (let x = 0; x <= 300; x += 10) {
      const p = toCanvas(x, 0);
      ctx.beginPath();
      ctx.moveTo(p.x, offsetY);
      ctx.lineTo(p.x, offsetY + 350 * scale);
      ctx.stroke();
    }
    
    for (let y = 0; y <= 350; y += 10) {
      const p = toCanvas(0, y);
      ctx.beginPath();
      ctx.moveTo(offsetX, p.y);
      ctx.lineTo(offsetX + 300 * scale, p.y);
      ctx.stroke();
    }
    
    ctx.strokeStyle = 'rgba(0, 212, 255, 0.15)';
    ctx.lineWidth = 2;
    for (let x = 0; x <= 300; x += 50) {
      const p = toCanvas(x, 0);
      ctx.beginPath();
      ctx.moveTo(p.x, offsetY);
      ctx.lineTo(p.x, offsetY + 350 * scale);
      ctx.stroke();
      
      ctx.fillStyle = 'rgba(0, 212, 255, 0.3)';
      ctx.font = '10px monospace';
      ctx.fillText(`${x}`, p.x + 3, offsetY - 3);
    }
    
    for (let y = 0; y <= 350; y += 50) {
      const p = toCanvas(0, y);
      ctx.beginPath();
      ctx.moveTo(offsetX, p.y);
      ctx.lineTo(offsetX + 300 * scale, p.y);
      ctx.stroke();
      
      ctx.fillStyle = 'rgba(0, 212, 255, 0.3)';
      ctx.font = '10px monospace';
      ctx.fillText(`${y}`, offsetX - 18, p.y + 3);
    }
  }, [toCanvas, offsetX, offsetY, scale]);

  const drawZones = useCallback((ctx: CanvasRenderingContext2D) => {
    const zones = [
      { type: 'gate', polygon: [{ x: 30, y: 80 }, { x: 70, y: 80 }, { x: 70, y: 120 }, { x: 30, y: 120 }], label: 'G1' },
      { type: 'gate', polygon: [{ x: 80, y: 80 }, { x: 120, y: 80 }, { x: 120, y: 120 }, { x: 80, y: 120 }], label: 'G2' },
      { type: 'gate', polygon: [{ x: 130, y: 80 }, { x: 170, y: 80 }, { x: 170, y: 120 }, { x: 130, y: 120 }], label: 'G3' },
      { type: 'gate', polygon: [{ x: 180, y: 80 }, { x: 220, y: 80 }, { x: 220, y: 120 }, { x: 180, y: 120 }], label: 'G4' },
      { type: 'gate', polygon: [{ x: 230, y: 80 }, { x: 270, y: 80 }, { x: 270, y: 120 }, { x: 230, y: 120 }], label: 'G5' },
      { type: 'gate', polygon: [{ x: 30, y: 180 }, { x: 70, y: 180 }, { x: 70, y: 220 }, { x: 30, y: 220 }], label: 'G6' },
      { type: 'gate', polygon: [{ x: 80, y: 180 }, { x: 120, y: 180 }, { x: 120, y: 220 }, { x: 80, y: 220 }], label: 'G7' },
      { type: 'gate', polygon: [{ x: 130, y: 180 }, { x: 170, y: 180 }, { x: 170, y: 220 }, { x: 130, y: 220 }], label: 'G8' },
      { type: 'gate', polygon: [{ x: 180, y: 180 }, { x: 220, y: 180 }, { x: 220, y: 220 }, { x: 180, y: 220 }], label: 'G9' },
      { type: 'gate', polygon: [{ x: 230, y: 180 }, { x: 270, y: 180 }, { x: 270, y: 220 }, { x: 230, y: 220 }], label: 'G10' },
      { type: 'taxiway', polygon: [{ x: 0, y: 145 }, { x: 300, y: 145 }, { x: 300, y: 175 }, { x: 0, y: 175 }], label: '' },
      { type: 'parking', polygon: [{ x: 270, y: 0 }, { x: 300, y: 0 }, { x: 300, y: 350 }, { x: 270, y: 350 }], label: 'P' },
      { type: 'charging', polygon: [{ x: 0, y: 0 }, { x: 30, y: 0 }, { x: 30, y: 70 }, { x: 0, y: 70 }], label: '⚡' },
      { type: 'restricted', polygon: [{ x: 100, y: 250 }, { x: 200, y: 250 }, { x: 200, y: 340 }, { x: 100, y: 340 }], label: '✈️' },
    ];

    zones.forEach((zone) => {
      const colors = ZONE_COLORS[zone.type];
      
      ctx.fillStyle = colors.fill;
      ctx.strokeStyle = colors.stroke;
      ctx.lineWidth = zone.type === 'restricted' ? 2 : 1;
      
      if (zone.type === 'restricted') {
        ctx.setLineDash([5, 5]);
      }
      
      ctx.beginPath();
      zone.polygon.forEach((point, i) => {
        const p = toCanvas(point.x, point.y);
        if (i === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      });
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.setLineDash([]);
      
      if (zone.label) {
        const centerX = (zone.polygon[0].x + zone.polygon[2].x) / 2;
        const centerY = (zone.polygon[0].y + zone.polygon[2].y) / 2;
        const p = toCanvas(centerX, centerY);
        
        ctx.fillStyle = colors.stroke;
        ctx.font = `${Math.max(9, 11 * scale)}px monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(zone.label, p.x, p.y);
      }
    });
  }, [toCanvas, scale]);

  const drawTrails = useCallback((ctx: CanvasRenderingContext2D, equipment: EquipmentState) => {
    if (!showTrails) return;
    
    const trails = trailsRef.current.get(equipment.id) || [];
    
    if (equipment.status === 'moving' || equipment.status === 'working') {
      trails.push({ x: equipment.position.x, y: equipment.position.y, t: Date.now() });
      if (trails.length > 50) trails.shift();
      trailsRef.current.set(equipment.id, trails);
    }
    
    if (trails.length < 2) return;
    
    const color = EQUIPMENT_COLORS[equipment.type] || '#00D4FF';
    
    for (let i = 1; i < trails.length; i++) {
      const alpha = i / trails.length;
      const p1 = toCanvas(trails[i - 1].x, trails[i - 1].y);
      const p2 = toCanvas(trails[i].x, trails[i].y);
      
      ctx.strokeStyle = color;
      ctx.globalAlpha = alpha * 0.5;
      ctx.lineWidth = 1 + alpha;
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }, [toCanvas, showTrails]);

  const drawEquipment = useCallback((ctx: CanvasRenderingContext2D, equipment: EquipmentState) => {
    const p = toCanvas(equipment.position.x, equipment.position.y);
    const color = EQUIPMENT_COLORS[equipment.type] || '#00D4FF';
    const statusColor = STATUS_COLORS[equipment.status] || '#5A7A9A';
    const isSelected = equipment.id === selectedEquipmentId;
    const size = Math.max(6, 10 * scale);
    
    drawTrails(ctx, equipment);
    
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(equipment.position.heading);
    
    if (isSelected) {
      ctx.shadowColor = color;
      ctx.shadowBlur = 25;
      
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, size * 2.5, 0, Math.PI * 2);
      ctx.stroke();
    }
    
    if (equipment.status === 'error') {
      ctx.strokeStyle = '#FF5252';
      ctx.lineWidth = 2;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.arc(0, 0, size * 2, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    
    ctx.fillStyle = color;
    ctx.strokeStyle = isSelected ? '#FFFFFF' : statusColor;
    ctx.lineWidth = isSelected ? 2 : 1.5;
    
    ctx.beginPath();
    ctx.moveTo(size * 1.2, 0);
    ctx.lineTo(-size * 0.7, -size * 0.6);
    ctx.lineTo(-size * 0.9, 0);
    ctx.lineTo(-size * 0.7, size * 0.6);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.beginPath();
    ctx.arc(size * 0.3, 0, size * 0.25, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(size * 0.3, 0, size * 0.15, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.restore();
    
    if (showLabels) {
      const bgWidth = Math.max(50, equipment.name.length * 8 + 10);
      const bgHeight = 16;
      
      ctx.fillStyle = 'rgba(10, 22, 40, 0.85)';
      ctx.strokeStyle = `${color}40`;
      ctx.lineWidth = 1;
      
      const bgX = p.x - bgWidth / 2;
      const bgY = p.y - size * 2.5 - bgHeight - 4;
      
      ctx.beginPath();
      ctx.roundRect(bgX, bgY, bgWidth, bgHeight, 3);
      ctx.fill();
      ctx.stroke();
      
      ctx.fillStyle = '#E8F4FF';
      ctx.font = `${Math.max(8, 10 * scale)}px monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(equipment.name, p.x, bgY + bgHeight / 2);
      
      const batteryWidth = bgWidth - 4;
      const batteryHeight = 3;
      const batteryX = bgX + 2;
      const batteryY = bgY + bgHeight + 2;
      
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.fillRect(batteryX, batteryY, batteryWidth, batteryHeight);
      
      const batteryColor = equipment.battery > 30 ? '#00E676' : equipment.battery > 10 ? '#FFD600' : '#FF5252';
      ctx.fillStyle = batteryColor;
      ctx.fillRect(batteryX, batteryY, batteryWidth * (equipment.battery / 100), batteryHeight);
    }
  }, [toCanvas, scale, selectedEquipmentId, showLabels, drawTrails]);

  const drawPathPreviews = useCallback((ctx: CanvasRenderingContext2D) => {
    Array.from(commands.values())
      .filter((c) => c.status === 'executing' && c.path.length > 1)
      .forEach((command) => {
        const equipment = equipmentStates.get(command.equipmentId);
        if (!equipment) return;
        
        const color = EQUIPMENT_COLORS[equipment.type] || '#00D4FF';
        
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 4]);
        ctx.globalAlpha = 0.6;
        
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
        ctx.globalAlpha = 0.3;
        ctx.beginPath();
        ctx.arc(tp.x, tp.y, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
        
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(tp.x, tp.y, 6, 0, Math.PI * 2);
        ctx.stroke();
      });
  }, [toCanvas, commands, equipmentStates]);

  const drawConflictAlerts = useCallback((ctx: CanvasRenderingContext2D) => {
    const unresolvedAlerts = Array.from(alerts.values()).filter((a) => !a.resolved);
    
    unresolvedAlerts.forEach((alert) => {
      const p = toCanvas(alert.predictedPosition.x, alert.predictedPosition.y);
      
      const color = alert.level === 'critical' ? '#FF5252' : alert.level === 'warning' ? '#FFD600' : '#00D4FF';
      const radius = alert.level === 'critical' ? 30 : alert.level === 'warning' ? 22 : 15;
      
      const time = Date.now() / 300;
      const pulse = 0.5 + Math.sin(time) * 0.5;
      
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.globalAlpha = 0.2 + pulse * 0.3;
      ctx.beginPath();
      ctx.arc(p.x, p.y, radius + pulse * 12, 0, Math.PI * 2);
      ctx.stroke();
      
      ctx.globalAlpha = 0.7;
      ctx.beginPath();
      ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
      ctx.stroke();
      
      ctx.fillStyle = color;
      ctx.globalAlpha = 0.15;
      ctx.beginPath();
      ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      
      if (alert.level === 'critical') {
        ctx.fillStyle = '#FF5252';
        ctx.font = 'bold 16px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('!', p.x, p.y);
      }
    });
  }, [toCanvas, alerts]);

  const drawSelectedInfo = useCallback((ctx: CanvasRenderingContext2D) => {
    if (!selectedEquipmentId) return;
    
    const equipment = equipmentStates.get(selectedEquipmentId);
    if (!equipment) return;
    
    const p = toCanvas(equipment.position.x, equipment.position.y);
    
    const panelWidth = 180;
    const panelHeight = 100;
    const panelX = p.x + 20;
    const panelY = p.y - panelHeight / 2;
    
    ctx.fillStyle = 'rgba(15, 33, 55, 0.95)';
    ctx.strokeStyle = '#00D4FF';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(panelX, panelY, panelWidth, panelHeight, 6);
    ctx.fill();
    ctx.stroke();
    
    const color = EQUIPMENT_COLORS[equipment.type] || '#00D4FF';
    ctx.fillStyle = color;
    ctx.font = 'bold 12px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(equipment.name, panelX + 10, panelY + 20);
    
    ctx.fillStyle = '#9FB8D1';
    ctx.font = '10px monospace';
    ctx.fillText(`位置: (${equipment.position.x.toFixed(1)}, ${equipment.position.y.toFixed(1)})`, panelX + 10, panelY + 38);
    ctx.fillText(`速度: ${equipment.velocity.linear.toFixed(2)} m/s`, panelX + 10, panelY + 52);
    ctx.fillText(`朝向: ${(equipment.position.heading * 180 / Math.PI).toFixed(0)}°`, panelX + 10, panelY + 66);
    ctx.fillText(`电量: ${equipment.battery.toFixed(0)}%`, panelX + 10, panelY + 80);
  }, [toCanvas, selectedEquipmentId, equipmentStates]);

  const render = useCallback((ctx: CanvasRenderingContext2D) => {
    drawBackground(ctx);
    drawGrid(ctx);
    drawZones(ctx);
    drawPathPreviews(ctx);
    drawConflictAlerts(ctx);
    
    const sortedEquipment = Array.from(equipmentStates.values()).sort((a, b) => {
      if (a.id === selectedEquipmentId) return 1;
      if (b.id === selectedEquipmentId) return -1;
      return 0;
    });
    
    sortedEquipment.forEach((e) => drawEquipment(ctx, e));
    
    drawSelectedInfo(ctx);
    
    ctx.strokeStyle = 'rgba(0, 212, 255, 0.4)';
    ctx.lineWidth = 2;
    ctx.strokeRect(offsetX, offsetY, 300 * scale, 350 * scale);
    
    const cornerSize = 15 * scale;
    ctx.strokeStyle = '#00D4FF';
    ctx.lineWidth = 2;
    
    ctx.beginPath();
    ctx.moveTo(offsetX, offsetY + cornerSize);
    ctx.lineTo(offsetX, offsetY);
    ctx.lineTo(offsetX + cornerSize, offsetY);
    ctx.stroke();
    
    ctx.beginPath();
    ctx.moveTo(offsetX + 300 * scale - cornerSize, offsetY);
    ctx.lineTo(offsetX + 300 * scale, offsetY);
    ctx.lineTo(offsetX + 300 * scale, offsetY + cornerSize);
    ctx.stroke();
    
    ctx.beginPath();
    ctx.moveTo(offsetX, offsetY + 350 * scale - cornerSize);
    ctx.lineTo(offsetX, offsetY + 350 * scale);
    ctx.lineTo(offsetX + cornerSize, offsetY + 350 * scale);
    ctx.stroke();
    
    ctx.beginPath();
    ctx.moveTo(offsetX + 300 * scale - cornerSize, offsetY + 350 * scale);
    ctx.lineTo(offsetX + 300 * scale, offsetY + 350 * scale);
    ctx.lineTo(offsetX + 300 * scale, offsetY + 350 * scale - cornerSize);
    ctx.stroke();
  }, [drawBackground, drawGrid, drawZones, drawPathPreviews, drawConflictAlerts, drawEquipment, drawSelectedInfo, offsetX, offsetY, scale, equipmentStates, selectedEquipmentId]);

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
      
      if (distance < 6 && distance < minDistance) {
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
    
    const animate = () => {
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
    <div className="relative w-full h-full overflow-hidden">
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        onClick={handleCanvasClick}
        className="cursor-crosshair"
      />
      
      <div className="absolute top-3 right-3 bg-[#0A1628]/90 backdrop-blur-sm rounded-lg p-2 border border-[#2A4A6F]">
        <div className="text-[10px] text-[#5A7A9A] mb-1">图例</div>
        <div className="flex flex-col gap-1">
          {Object.entries(EQUIPMENT_COLORS).map(([type, color]) => (
            <div key={type} className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
              <span className="text-[9px] text-[#9FB8D1]">
                {type === 'tug' ? '牵引车' : type === 'baggage' ? '行李车' : type === 'fuel' ? '加油车' : type === 'catering' ? '餐车' : '摆渡车'}
              </span>
            </div>
          ))}
        </div>
      </div>
      
      <div className="absolute bottom-3 left-3 flex items-center gap-2 text-[10px] text-[#5A7A9A]">
        <span className="px-1.5 py-0.5 bg-[#0A1628]/80 rounded border border-[#2A4A6F]">
          W: {width}px
        </span>
        <span className="px-1.5 py-0.5 bg-[#0A1628]/80 rounded border border-[#2A4A6F]">
          H: {height}px
        </span>
        <span className="px-1.5 py-0.5 bg-[#0A1628]/80 rounded border border-[#2A4A6F]">
          比例: 1:{(1/scale).toFixed(0)}
        </span>
      </div>
    </div>
  );
};
