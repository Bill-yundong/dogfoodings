import React, { useEffect, useRef, useCallback } from 'react';
import { usePipelineStore } from '../../store/usePipelineStore';
import { useSimulationStore } from '../../store/useSimulationStore';
import type { PipelineNode, PipelineSegment, Warning } from '../../types';

interface PipelineCanvasProps {
  width: number;
  height: number;
}

const nodeColors: Record<string, string> = {
  reservoir: '#22C55E',
  junction: '#6B7280',
  valve: '#F59E0B',
  pump: '#3B82F6',
  sensor: '#8B5CF6',
};

const nodeIcons: Record<string, string> = {
  reservoir: '■',
  junction: '●',
  valve: '◈',
  pump: '⚙',
  sensor: '◎',
};

export const PipelineCanvas: React.FC<PipelineCanvasProps> = ({ width, height }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const waveParticlesRef = useRef<Array<{
    segmentId: string;
    position: number;
    direction: number;
    amplitude: number;
    speed: number;
    opacity: number;
  }>>([]);

  const { nodes, segments, regions, selectedNodeId, selectedSegmentId, pan, zoom, selectNode, selectSegment } =
    usePipelineStore();
  const { segmentPressures, nodePressures, warnings } = useSimulationStore();

  const getPressureColor = useCallback((pressure: number, minP: number = 0, maxP: number = 10000000) => {
    const normalized = Math.max(0, Math.min(1, (pressure - minP) / (maxP - minP)));
    const hue = 240 - normalized * 240;
    return `hsl(${hue}, 80%, 50%)`;
  }, []);

  const screenToWorld = useCallback(
    (screenX: number, screenY: number) => {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return { x: 0, y: 0 };
      return {
        x: (screenX - rect.left - pan.x) / zoom,
        y: (screenY - rect.top - pan.y) / zoom,
      };
    },
    [pan, zoom]
  );

  const findNodeAtPosition = useCallback(
    (x: number, y: number) => {
      for (const node of nodes) {
        const dx = node.x - x;
        const dy = node.y - y;
        if (dx * dx + dy * dy < 400) {
          return node;
        }
      }
      return null;
    },
    [nodes]
  );

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;

      const world = screenToWorld(e.clientX, e.clientY);
      const node = findNodeAtPosition(world.x, world.y);

      if (node) {
        selectNode(node.id);
      } else {
        selectNode(null);
        selectSegment(null);
      }
    },
    [screenToWorld, findNodeAtPosition, selectNode, selectSegment]
  );

  const drawRegions = useCallback(
    (ctx: CanvasRenderingContext2D) => {
      regions.forEach((region) => {
        ctx.save();
        ctx.fillStyle = region.color + '10';
        ctx.strokeStyle = region.color + '60';
        ctx.lineWidth = 2 / zoom;
        ctx.setLineDash([5 / zoom, 5 / zoom]);
        ctx.beginPath();
        ctx.roundRect(
          region.bounds.x,
          region.bounds.y,
          region.bounds.width,
          region.bounds.height,
          8 / zoom
        );
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = region.color + 'CC';
        ctx.font = `${14 / zoom}px system-ui`;
        ctx.fillText(region.name, region.bounds.x + 10 / zoom, region.bounds.y + 25 / zoom);
        ctx.restore();
      });
    },
    [regions, zoom]
  );

  const drawSegments = useCallback(
    (ctx: CanvasRenderingContext2D) => {
      segments.forEach((segment) => {
        const fromNode = nodes.find((n) => n.id === segment.fromNodeId);
        const toNode = nodes.find((n) => n.id === segment.toNodeId);
        if (!fromNode || !toNode) return;

        const pressures = segmentPressures[segment.id] || [];
        const isSelected = selectedSegmentId === segment.id;

        ctx.save();
        ctx.lineWidth = isSelected ? 6 / zoom : 4 / zoom;
        ctx.lineCap = 'round';

        if (pressures.length > 1) {
          const gradient = ctx.createLinearGradient(fromNode.x, fromNode.y, toNode.x, toNode.y);
          const step = 1 / (pressures.length - 1);
          pressures.forEach((p, i) => {
            gradient.addColorStop(i * step, getPressureColor(p));
          });
          ctx.strokeStyle = gradient;
        } else {
          ctx.strokeStyle = isSelected ? '#60A5FA' : '#475569';
        }

        ctx.beginPath();
        ctx.moveTo(fromNode.x, fromNode.y);
        ctx.lineTo(toNode.x, toNode.y);
        ctx.stroke();

        if (pressures.length > 0) {
          const midX = (fromNode.x + toNode.x) / 2;
          const midY = (fromNode.y + toNode.y) / 2;
          const avgPressure = pressures.reduce((a, b) => a + b, 0) / pressures.length;

          ctx.fillStyle = '#1E293B';
          ctx.strokeStyle = getPressureColor(avgPressure);
          ctx.lineWidth = 1 / zoom;
          const labelWidth = 70 / zoom;
          const labelHeight = 20 / zoom;
          ctx.beginPath();
          ctx.roundRect(midX - labelWidth / 2, midY - labelHeight / 2, labelWidth, labelHeight, 4 / zoom);
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = '#F8FAFC';
          ctx.font = `${11 / zoom}px monospace`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(`${(avgPressure / 1000000).toFixed(2)} MPa`, midX, midY);
        }

        ctx.restore();
      });
    },
    [segments, nodes, segmentPressures, selectedSegmentId, zoom, getPressureColor]
  );

  const drawNodes = useCallback(
    (ctx: CanvasRenderingContext2D) => {
      nodes.forEach((node) => {
        const isSelected = selectedNodeId === node.id;
        const pressure = nodePressures[node.id] || node.pressure;
        const nodeWarnings = warnings.filter((w) => w.nodeId === node.id);
        const hasWarning = nodeWarnings.length > 0;
        const maxSeverity = hasWarning
          ? nodeWarnings.reduce((max, w) => {
              const severityOrder: Record<string, number> = { low: 1, medium: 2, high: 3, critical: 4 };
              return severityOrder[w.severity] > severityOrder[max] ? w.severity : max;
            }, 'low')
          : null;

        ctx.save();

        if (hasWarning && maxSeverity) {
          const pulseSize = 30 / zoom + Math.sin(Date.now() / 200) * 5 / zoom;
          const warningColors: Record<string, string> = {
            low: '#3B82F6',
            medium: '#F59E0B',
            high: '#F97316',
            critical: '#EF4444',
          };
          ctx.beginPath();
          ctx.arc(node.x, node.y, pulseSize, 0, Math.PI * 2);
          ctx.fillStyle = warningColors[maxSeverity] + '30';
          ctx.fill();
        }

        ctx.beginPath();
        ctx.arc(node.x, node.y, isSelected ? 22 / zoom : 18 / zoom, 0, Math.PI * 2);
        ctx.fillStyle = nodeColors[node.type] || '#6B7280';
        ctx.fill();

        if (isSelected) {
          ctx.strokeStyle = '#60A5FA';
          ctx.lineWidth = 3 / zoom;
          ctx.stroke();
        }

        ctx.fillStyle = '#FFFFFF';
        ctx.font = `${isSelected ? 16 : 14 / zoom}px system-ui`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(nodeIcons[node.type] || '●', node.x, node.y);

        ctx.fillStyle = '#94A3B8';
        ctx.font = `${10 / zoom}px system-ui`;
        ctx.fillText(node.name, node.x, node.y + 30 / zoom);

        if (node.type === 'valve') {
          ctx.fillStyle = '#F8FAFC';
          ctx.font = `${9 / zoom}px monospace`;
          ctx.fillText(`${(pressure / 1000000).toFixed(1)} MPa`, node.x, node.y + 42 / zoom);
        }

        ctx.restore();
      });
    },
    [nodes, selectedNodeId, nodePressures, warnings, zoom]
  );

  const drawWaveParticles = useCallback(
    (ctx: CanvasRenderingContext2D) => {
      const particles = waveParticlesRef.current;

      particles.forEach((particle, index) => {
        const segment = segments.find((s) => s.id === particle.segmentId);
        if (!segment) return;

        const fromNode = nodes.find((n) => n.id === segment.fromNodeId);
        const toNode = nodes.find((n) => n.id === segment.toNodeId);
        if (!fromNode || !toNode) return;

        const t = particle.position / segment.length;
        const x = fromNode.x + (toNode.x - fromNode.x) * t;
        const y = fromNode.y + (toNode.y - fromNode.y) * t;

        ctx.save();
        ctx.globalAlpha = particle.opacity;

        const gradient = ctx.createRadialGradient(x, y, 0, x, y, 15 / zoom);
        gradient.addColorStop(0, `rgba(139, 92, 246, ${0.8 * particle.opacity})`);
        gradient.addColorStop(0.5, `rgba(139, 92, 246, ${0.3 * particle.opacity})`);
        gradient.addColorStop(1, 'rgba(139, 92, 246, 0)');

        ctx.beginPath();
        ctx.arc(x, y, 15 / zoom, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();

        ctx.restore();
      });
    },
    [segments, nodes, zoom]
  );

  const updateWaveParticles = useCallback(() => {
    const particles = waveParticlesRef.current;
    const { config } = useSimulationStore.getState();

    particles.forEach((particle, index) => {
      const segment = segments.find((s) => s.id === particle.segmentId);
      if (!segment) return;

      particle.position += particle.direction * particle.speed * config.timeStep;
      particle.opacity -= 0.002;

      if (particle.position < 0 || particle.position > segment.length || particle.opacity <= 0) {
        particles.splice(index, 1);
      }
    });
  }, [segments]);

  const spawnWaveParticles = useCallback(() => {
    const { segmentPressures } = useSimulationStore.getState();
    const particles = waveParticlesRef.current;

    segments.forEach((segment) => {
      const pressures = segmentPressures[segment.id];
      if (!pressures || pressures.length < 3) return;

      for (let i = 1; i < pressures.length - 1; i++) {
        const gradient = Math.abs(pressures[i + 1] - pressures[i - 1]);
        if (gradient > 500000 && Math.random() < 0.1) {
          particles.push({
            segmentId: segment.id,
            position: (i / (pressures.length - 1)) * segment.length,
            direction: pressures[i + 1] > pressures[i - 1] ? 1 : -1,
            amplitude: gradient,
            speed: segment.waveSpeed,
            opacity: 0.8,
          });
        }
      }
    });
  }, [segments]);

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#0F172A';
    ctx.fillRect(0, 0, width, height);

    ctx.save();
    ctx.translate(pan.x, pan.y);
    ctx.scale(zoom, zoom);

    ctx.strokeStyle = '#1E293B';
    ctx.lineWidth = 1 / zoom;
    const gridSize = 50;
    for (let x = -1000; x < 2000; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, -1000);
      ctx.lineTo(x, 2000);
      ctx.stroke();
    }
    for (let y = -1000; y < 2000; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(-1000, y);
      ctx.lineTo(2000, y);
      ctx.stroke();
    }

    drawRegions(ctx);
    drawSegments(ctx);
    drawWaveParticles(ctx);
    drawNodes(ctx);

    ctx.restore();
  }, [width, height, pan, zoom, drawRegions, drawSegments, drawWaveParticles, drawNodes]);

  useEffect(() => {
    let lastTime = 0;
    const animate = (time: number) => {
      if (time - lastTime > 16) {
        updateWaveParticles();
        if (Math.random() < 0.05) {
          spawnWaveParticles();
        }
        render();
        lastTime = time;
      }
      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [render, updateWaveParticles, spawnWaveParticles]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      onClick={handleClick}
      className="rounded-lg cursor-crosshair"
      style={{ background: '#0F172A' }}
    />
  );
};
