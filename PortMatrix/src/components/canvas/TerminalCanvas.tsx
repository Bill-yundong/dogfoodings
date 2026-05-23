'use client';

import React, { useEffect, useRef, useCallback, useState } from 'react';
import type { CompactAgentState, TerminalLayout, PassengerType, AgentStatus } from '@/types';
import { PASSENGER_TYPE_COLORS } from '@/types';
import { createDefaultTerminalLayout } from '@/lib/simulation/terminal-layout';
import { V, Geometry } from '@/lib/math/vector2d';

interface TerminalCanvasProps {
  agents: CompactAgentState[];
  layout?: TerminalLayout;
  showVectors?: boolean;
  showHeatmap?: boolean;
  showTrails?: boolean;
  filterTypes?: PassengerType[];
  filterStatuses?: AgentStatus[];
  onAgentClick?: (agentIdx: number) => void;
  onHoverZone?: (zoneId: string | null) => void;
  width?: number;
  height?: number;
}

const TYPE_COLORS: Record<number, string> = {
  0: PASSENGER_TYPE_COLORS.business,
  1: PASSENGER_TYPE_COLORS.tourist,
  2: PASSENGER_TYPE_COLORS.transfer,
  3: PASSENGER_TYPE_COLORS.special,
};

const STATUS_NAMES: Record<number, string> = {
  0: '抵达',
  1: '值机排队',
  2: '值机中',
  3: '安检排队',
  4: '安检中',
  5: '行走',
  6: '购物',
  7: '等待登机',
  8: '登机中',
  9: '已离开',
};

export const TerminalCanvas: React.FC<TerminalCanvasProps> = ({
  agents,
  layout: customLayout,
  showVectors = false,
  showHeatmap = true,
  showTrails = false,
  filterTypes,
  filterStatuses,
  onAgentClick,
  onHoverZone,
  width = 960,
  height = 640,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const staticCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationRef = useRef<number>(0);
  const lastFrameRef = useRef<number>(0);
  const prevAgentsRef = useRef<Map<number, { x: number; y: number }>>(new Map());
  const [hoveredZone, setHoveredZone] = useState<string | null>(null);

  const layout = customLayout || createDefaultTerminalLayout();
  const scale = Math.min(width / layout.width, height / layout.height);
  const offsetX = (width - layout.width * scale) / 2;
  const offsetY = (height - layout.height * scale) / 2;

  const worldToScreen = useCallback((x: number, y: number) => ({
    x: offsetX + x * scale,
    y: offsetY + y * scale,
  }), [offsetX, offsetY, scale]);

  const screenToWorld = useCallback((x: number, y: number) => ({
    x: (x - offsetX) / scale,
    y: (y - offsetY) / scale,
  }), [offsetX, offsetY, scale]);

  const renderStaticLayer = useCallback((ctx: CanvasRenderingContext2D) => {
    ctx.clearRect(0, 0, width, height);

    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, '#050d18');
    gradient.addColorStop(1, '#0a1628');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = 'rgba(0, 212, 255, 0.08)';
    ctx.lineWidth = 0.5;

    for (let x = 0; x <= layout.width; x += 5) {
      const screen = worldToScreen(x, 0);
      ctx.beginPath();
      ctx.moveTo(screen.x, 0);
      ctx.lineTo(screen.x, height);
      ctx.stroke();
    }

    for (let y = 0; y <= layout.height; y += 5) {
      const screen = worldToScreen(0, y);
      ctx.beginPath();
      ctx.moveTo(0, screen.y);
      ctx.lineTo(width, screen.y);
      ctx.stroke();
    }

    for (const zone of layout.zones) {
      const screenPts = zone.polygon.map(p => worldToScreen(p.x, p.y));

      ctx.beginPath();
      ctx.moveTo(screenPts[0].x, screenPts[0].y);
      for (let i = 1; i < screenPts.length; i++) {
        ctx.lineTo(screenPts[i].x, screenPts[i].y);
      }
      ctx.closePath();

      ctx.fillStyle = zone.color;
      ctx.fill();

      ctx.strokeStyle = zone.color.replace('0.15', '0.5');
      ctx.lineWidth = 1;
      ctx.stroke();

      const center = Geometry.polygonCenter(zone.polygon);
      const screenCenter = worldToScreen(center.x, center.y);

      ctx.fillStyle = 'rgba(0, 212, 255, 0.6)';
      ctx.font = '10px JetBrains Mono, monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(zone.name, screenCenter.x, screenCenter.y);
    }

    for (const obstacle of layout.obstacles) {
      const screenPts = obstacle.polygon.map(p => worldToScreen(p.x, p.y));

      ctx.beginPath();
      ctx.moveTo(screenPts[0].x, screenPts[0].y);
      for (let i = 1; i < screenPts.length; i++) {
        ctx.lineTo(screenPts[i].x, screenPts[i].y);
      }
      ctx.closePath();

      ctx.fillStyle = 'rgba(100, 100, 120, 0.5)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(150, 150, 170, 0.8)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    for (const facility of layout.facilities) {
      const pos = worldToScreen(facility.position.x, facility.position.y);

      let color = '#00d4ff';
      let size = 6;

      switch (facility.type) {
        case 'checkin_counter':
          color = '#7c4dff';
          size = 8;
          break;
        case 'security_channel':
          color = '#ffb300';
          size = 8;
          break;
        case 'shop':
          color = '#ff4081';
          size = 5;
          break;
        case 'gate':
          color = '#00e676';
          size = 7;
          break;
      }

      if (facility.status === 'closed') {
        color = 'rgba(100, 100, 100, 0.5)';
      }

      ctx.beginPath();
      ctx.arc(pos.x, pos.y, size, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();

      ctx.shadowColor = color;
      ctx.shadowBlur = 8;
      ctx.fill();
      ctx.shadowBlur = 0;
    }
  }, [width, height, layout, worldToScreen]);

  useEffect(() => {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    staticCanvasRef.current = canvas;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      renderStaticLayer(ctx);
    }

    return () => {
      if (staticCanvasRef.current) {
        staticCanvasRef.current = null;
      }
    };
  }, [width, height, layout, renderStaticLayer]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let frameCount = 0;
    let lastFpsUpdate = performance.now();
    let currentFps = 60;

    const render = (timestamp: number) => {
      const deltaTime = timestamp - lastFrameRef.current;
      lastFrameRef.current = timestamp;

      frameCount++;
      if (timestamp - lastFpsUpdate >= 1000) {
        currentFps = frameCount;
        frameCount = 0;
        lastFpsUpdate = timestamp;
      }

      ctx.clearRect(0, 0, width, height);

      if (staticCanvasRef.current) {
        ctx.drawImage(staticCanvasRef.current, 0, 0);
      }

      if (showHeatmap) {
        renderHeatmap(ctx);
      }

      renderAgents(ctx, deltaTime);

      if (showVectors) {
        renderVectors(ctx);
      }

      renderHUD(ctx, currentFps);

      animationRef.current = requestAnimationFrame(render);
    };

    const renderHeatmap = (ctx: CanvasRenderingContext2D) => {
      const gridSize = 10;
      const densityGrid: number[][] = [];

      for (let i = 0; i < Math.ceil(layout.width / gridSize); i++) {
        densityGrid[i] = [];
        for (let j = 0; j < Math.ceil(layout.height / gridSize); j++) {
          densityGrid[i][j] = 0;
        }
      }

      for (const agent of agents) {
        if (filterTypes && !filterTypes.includes(getTypeFromCode(agent.typeCode))) continue;
        if (filterStatuses && !filterStatuses.includes(getStatusFromCode(agent.statusCode))) continue;

        const gridX = Math.floor(agent.x / gridSize);
        const gridY = Math.floor(agent.y / gridSize);

        if (gridX >= 0 && gridX < densityGrid.length &&
            gridY >= 0 && gridY < densityGrid[0].length) {
          densityGrid[gridX][gridY]++;
        }
      }

      ctx.globalCompositeOperation = 'lighter';

      for (let i = 0; i < densityGrid.length; i++) {
        for (let j = 0; j < densityGrid[i].length; j++) {
          const density = densityGrid[i][j];
          if (density === 0) continue;

          const centerX = (i + 0.5) * gridSize;
          const centerY = (j + 0.5) * gridSize;
          const screen = worldToScreen(centerX, centerY);

          const intensity = Math.min(density / 10, 1);
          const radius = gridSize * scale * (1 + intensity);

          const gradient = ctx.createRadialGradient(
            screen.x, screen.y, 0,
            screen.x, screen.y, radius
          );

          const hue = 240 - intensity * 240;
          gradient.addColorStop(0, `hsla(${hue}, 100%, 60%, ${0.3 * intensity})`);
          gradient.addColorStop(1, `hsla(${hue}, 100%, 60%, 0)`);

          ctx.fillStyle = gradient;
          ctx.beginPath();
          ctx.arc(screen.x, screen.y, radius, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      ctx.globalCompositeOperation = 'source-over';
    };

    const renderAgents = (ctx: CanvasRenderingContext2D, deltaTime: number) => {
      for (const agent of agents) {
        if (filterTypes && !filterTypes.includes(getTypeFromCode(agent.typeCode))) continue;
        if (filterStatuses && !filterStatuses.includes(getStatusFromCode(agent.statusCode))) continue;

        const prev = prevAgentsRef.current.get(agent.idIdx);
        let x = agent.x;
        let y = agent.y;

        if (prev && deltaTime > 0) {
          const t = Math.min(1, deltaTime / 16);
          x = prev.x + (agent.x - prev.x) * t;
          y = prev.y + (agent.y - prev.y) * t;
        }

        prevAgentsRef.current.set(agent.idIdx, { x: agent.x, y: agent.y });

        const screen = worldToScreen(x, y);
        const color = TYPE_COLORS[agent.typeCode] || '#ffffff';
        const size = 3;

        if (showTrails) {
          ctx.beginPath();
          ctx.moveTo(screen.x, screen.y);
          ctx.lineTo(screen.x - agent.vx * scale * 3, screen.y - agent.vy * scale * 3);
          ctx.strokeStyle = color + '40';
          ctx.lineWidth = 2;
          ctx.stroke();
        }

        ctx.beginPath();
        ctx.arc(screen.x, screen.y, size, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();

        ctx.shadowColor = color;
        ctx.shadowBlur = 4;
        ctx.fill();
        ctx.shadowBlur = 0;
      }
    };

    const renderVectors = (ctx: CanvasRenderingContext2D) => {
      for (const agent of agents) {
        if (filterTypes && !filterTypes.includes(getTypeFromCode(agent.typeCode))) continue;
        if (filterStatuses && !filterStatuses.includes(getStatusFromCode(agent.statusCode))) continue;

        const screen = worldToScreen(agent.x, agent.y);
        const velLen = Math.sqrt(agent.vx * agent.vx + agent.vy * agent.vy);
        if (velLen < 0.1) continue;

        const endX = screen.x + agent.vx * scale * 5;
        const endY = screen.y + agent.vy * scale * 5;

        const intensity = Math.min(velLen / 2, 1);
        const hue = 240 - intensity * 120;

        ctx.beginPath();
        ctx.moveTo(screen.x, screen.y);
        ctx.lineTo(endX, endY);
        ctx.strokeStyle = `hsla(${hue}, 100%, 60%, 0.6)`;
        ctx.lineWidth = 1;
        ctx.stroke();

        const angle = Math.atan2(agent.vy, agent.vx);
        const arrowSize = 4;
        ctx.beginPath();
        ctx.moveTo(endX, endY);
        ctx.lineTo(
          endX - arrowSize * Math.cos(angle - Math.PI / 6),
          endY - arrowSize * Math.sin(angle - Math.PI / 6)
        );
        ctx.moveTo(endX, endY);
        ctx.lineTo(
          endX - arrowSize * Math.cos(angle + Math.PI / 6),
          endY - arrowSize * Math.sin(angle + Math.PI / 6)
        );
        ctx.stroke();
      }
    };

    const renderHUD = (ctx: CanvasRenderingContext2D, fps: number) => {
      ctx.fillStyle = 'rgba(10, 22, 40, 0.8)';
      ctx.fillRect(10, 10, 120, 30);

      ctx.strokeStyle = 'rgba(0, 212, 255, 0.5)';
      ctx.lineWidth = 1;
      ctx.strokeRect(10, 10, 120, 30);

      ctx.fillStyle = fps >= 50 ? '#00e676' : fps >= 30 ? '#ffb300' : '#ff5252';
      ctx.font = '12px JetBrains Mono, monospace';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(`${fps.toFixed(0)} FPS`, 20, 25);

      ctx.fillStyle = 'rgba(0, 212, 255, 0.6)';
      ctx.fillText(`| ${agents.length} 旅客`, 60, 25);
    };

    animationRef.current = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationRef.current);
    };
  }, [agents, showVectors, showHeatmap, showTrails, filterTypes, filterStatuses, width, height, layout, scale, worldToScreen]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const world = screenToWorld(x, y);

    let foundZone: string | null = null;
    for (const zone of layout.zones) {
      if (Geometry.pointInPolygon(world, zone.polygon)) {
        foundZone = zone.id;
        break;
      }
    }

    if (foundZone !== hoveredZone) {
      setHoveredZone(foundZone);
      onHoverZone?.(foundZone);
    }
  }, [screenToWorld, layout, hoveredZone, onHoverZone]);

  const handleClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const world = screenToWorld(x, y);

    for (const agent of agents) {
      const dist = V.distance(world, { x: agent.x, y: agent.y });
      if (dist < 2) {
        onAgentClick?.(agent.idIdx);
        break;
      }
    }
  }, [screenToWorld, agents, onAgentClick]);

  return (
    <div className="relative">
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className="border border-cyber-blue/30 rounded-lg cursor-crosshair"
        onMouseMove={handleMouseMove}
        onClick={handleClick}
      />

      {hoveredZone && (
        <div className="absolute top-4 right-4 bg-deep-space/90 border border-cyber-blue/50 rounded px-3 py-2 text-sm">
          <span className="text-cyber-blue">{layout.zones.find(z => z.id === hoveredZone)?.name}</span>
          <span className="text-gray-400 ml-2">
            {layout.zones.find(z => z.id === hoveredZone)?.currentCount || 0} 人
          </span>
        </div>
      )}
    </div>
  );
};

const getTypeFromCode = (code: number): PassengerType => {
  const types: PassengerType[] = ['business', 'tourist', 'transfer', 'special'];
  return types[code] || 'tourist';
};

const getStatusFromCode = (code: number): AgentStatus => {
  const statuses: AgentStatus[] = [
    'arriving',
    'in_checkin_queue',
    'at_checkin',
    'in_security_queue',
    'at_security',
    'walking',
    'shopping',
    'waiting_gate',
    'boarding',
    'exited',
  ];
  return statuses[code] || 'walking';
};
