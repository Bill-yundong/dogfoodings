import { Component, createEffect, onMount, onCleanup, createSignal } from 'solid-js';
import type { FlowFieldData, MoldGeometry, Defect, PressureWaveData } from '../types';
import { getDefectTypeColor } from '../engine/defectEngine';

interface FluidCanvasProps {
  width: number;
  height: number;
  geometry: MoldGeometry | null;
  flowField: FlowFieldData | null;
  defects: Defect[];
  pressureWaves: PressureWaveData[];
  showVectors?: boolean;
  showPressure?: boolean;
  showTemperature?: boolean;
  cellSize?: number;
}

const FluidCanvas: Component<FluidCanvasProps> = (props) => {
  let canvasRef: HTMLCanvasElement | undefined;
  const [canvasSize, setCanvasSize] = createSignal({ width: 0, height: 0 });

  const cellSize = () => props.cellSize || 6;
  const gridWidth = () => props.width;
  const gridHeight = () => props.height;

  onMount(() => {
    if (canvasRef) {
      resizeCanvas();
      window.addEventListener('resize', resizeCanvas);
      render();
    }
  });

  onCleanup(() => {
    window.removeEventListener('resize', resizeCanvas);
  });

  const resizeCanvas = () => {
    if (!canvasRef) return;
    const rect = canvasRef.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvasRef.width = rect.width * dpr;
    canvasRef.height = rect.height * dpr;
    const ctx = canvasRef.getContext('2d');
    if (ctx) {
      ctx.scale(dpr, dpr);
    }
    setCanvasSize({ width: rect.width, height: rect.height });
  };

  createEffect(() => {
    if (!canvasRef || !canvasSize().width) return;
    render();
  });

  const render = () => {
    if (!canvasRef) return;
    const ctx = canvasRef.getContext('2d');
    if (!ctx) return;

    const { width: canvasW, height: canvasH } = canvasSize();
    const cs = cellSize();
    const offsetX = (canvasW - gridWidth() * cs) / 2;
    const offsetY = (canvasH - gridHeight() * cs) / 2;

    ctx.clearRect(0, 0, canvasW, canvasH);

    drawBackground(ctx, canvasW, canvasH);
    drawGrid(ctx, offsetX, offsetY, cs);

    if (props.geometry) {
      drawGeometry(ctx, props.geometry, offsetX, offsetY, cs);
    }

    if (props.flowField) {
      drawFlowField(ctx, props.flowField, offsetX, offsetY, cs);
    }

    if (props.pressureWaves && props.pressureWaves.length > 0) {
      drawPressureWaves(ctx, props.pressureWaves, offsetX, offsetY, cs);
    }

    if (props.defects && props.defects.length > 0) {
      drawDefects(ctx, props.defects, offsetX, offsetY, cs);
    }

    if (props.showVectors && props.flowField) {
      drawVelocityVectors(ctx, props.flowField, offsetX, offsetY, cs);
    }
  };

  const drawBackground = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
    const gradient = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w);
    gradient.addColorStop(0, '#0f172a');
    gradient.addColorStop(1, '#020617');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);
  };

  const drawGrid = (ctx: CanvasRenderingContext2D, offsetX: number, offsetY: number, cs: number) => {
    ctx.strokeStyle = 'rgba(30, 58, 95, 0.3)';
    ctx.lineWidth = 0.5;

    for (let x = 0; x <= gridWidth(); x++) {
      ctx.beginPath();
      ctx.moveTo(offsetX + x * cs, offsetY);
      ctx.lineTo(offsetX + x * cs, offsetY + gridHeight() * cs);
      ctx.stroke();
    }

    for (let y = 0; y <= gridHeight(); y++) {
      ctx.beginPath();
      ctx.moveTo(offsetX, offsetY + y * cs);
      ctx.lineTo(offsetX + gridWidth() * cs, offsetY + y * cs);
      ctx.stroke();
    }

    ctx.strokeStyle = 'rgba(56, 189, 248, 0.5)';
    ctx.lineWidth = 2;
    ctx.strokeRect(offsetX, offsetY, gridWidth() * cs, gridHeight() * cs);
  };

  const drawGeometry = (
    ctx: CanvasRenderingContext2D,
    geometry: MoldGeometry,
    offsetX: number,
    offsetY: number,
    cs: number
  ) => {
    ctx.fillStyle = 'rgba(71, 85, 105, 0.8)';
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.8)';
    ctx.lineWidth = 1.5;

    for (const obstacle of geometry.obstacles) {
      const x = offsetX + obstacle.x * cs;
      const y = offsetY + obstacle.y * cs;

      ctx.beginPath();
      if (obstacle.type === 'circle' && obstacle.radius) {
        ctx.arc(x, y, obstacle.radius * cs, 0, Math.PI * 2);
      } else if (obstacle.type === 'rectangle' && obstacle.width && obstacle.height) {
        ctx.rect(x - (obstacle.width / 2) * cs, y - (obstacle.height / 2) * cs, obstacle.width * cs, obstacle.height * cs);
      }
      ctx.fill();
      ctx.stroke();
    }

    for (const gate of geometry.gates) {
      const x = offsetX + gate.x * cs;
      const y = offsetY + gate.y * cs;
      const w = gate.width * cs;
      const h = gate.height * cs;

      const gradient = ctx.createLinearGradient(x - w / 2, y, x + w / 2, y);
      gradient.addColorStop(0, 'rgba(16, 185, 129, 0.9)');
      gradient.addColorStop(1, 'rgba(16, 185, 129, 0.3)');

      ctx.fillStyle = gradient;
      ctx.strokeStyle = '#10B981';
      ctx.lineWidth = 2;
      ctx.fillRect(x - w / 2, y - h / 2, w, h);
      ctx.strokeRect(x - w / 2, y - h / 2, w, h);

      const arrowSize = 12;
      ctx.fillStyle = '#10B981';
      ctx.beginPath();
      ctx.moveTo(x + w / 2 + 5, y);
      ctx.lineTo(x + w / 2 + 5 + arrowSize, y - arrowSize / 2);
      ctx.lineTo(x + w / 2 + 5 + arrowSize, y + arrowSize / 2);
      ctx.closePath();
      ctx.fill();
    }
  };

  const drawFlowField = (
    ctx: CanvasRenderingContext2D,
    flowField: FlowFieldData,
    offsetX: number,
    offsetY: number,
    cs: number
  ) => {
    const { density, pressure, temperature } = flowField;

    for (let y = 0; y < gridHeight(); y++) {
      for (let x = 0; x < gridWidth(); x++) {
        const idx = y * gridWidth() + x;
        const dens = density[idx];

        if (dens < 0.05) continue;

        const px = offsetX + x * cs;
        const py = offsetY + y * cs;

        let color: string;

        if (props.showPressure) {
          const p = Math.min(1, Math.max(0, pressure[idx] * 3));
          color = getPressureColor(p);
        } else if (props.showTemperature) {
          const t = Math.min(1, Math.max(0, (temperature[idx] - 50) / 200));
          color = getTemperatureColor(t);
        } else {
          const d = Math.min(1, dens);
          color = getDensityColor(d);
        }

        ctx.fillStyle = color;
        ctx.fillRect(px, py, cs - 0.5, cs - 0.5);
      }
    }
  };

  const getDensityColor = (t: number): string => {
    const r = Math.floor(6 + 50 * t);
    const g = Math.floor(182 + 73 * t);
    const b = Math.floor(212 - 100 * t);
    return `rgba(${r}, ${g}, ${b}, ${0.3 + 0.7 * t})`;
  };

  const getPressureColor = (t: number): string => {
    const r = Math.floor(30 + 200 * t);
    const g = Math.floor(58 + 100 * (1 - t));
    const b = Math.floor(138 - 100 * t);
    return `rgba(${r}, ${g}, ${b}, ${0.4 + 0.6 * t})`;
  };

  const getTemperatureColor = (t: number): string => {
    let r, g, b;
    if (t < 0.25) {
      r = 0;
      g = Math.floor(255 * (t * 4));
      b = 255;
    } else if (t < 0.5) {
      r = 0;
      g = 255;
      b = Math.floor(255 * (1 - (t - 0.25) * 4));
    } else if (t < 0.75) {
      r = Math.floor(255 * ((t - 0.5) * 4));
      g = 255;
      b = 0;
    } else {
      r = 255;
      g = Math.floor(255 * (1 - (t - 0.75) * 4));
      b = 0;
    }
    return `rgba(${r}, ${g}, ${b}, 0.7)`;
  };

  const drawPressureWaves = (
    ctx: CanvasRenderingContext2D,
    waves: PressureWaveData[],
    offsetX: number,
    offsetY: number,
    cs: number
  ) => {
    const time = Date.now() / 1000;

    for (const wave of waves) {
      const x = offsetX + wave.position.x * cs;
      const y = offsetY + wave.position.y * cs;
      const baseRadius = (time * wave.propagationSpeed * 50) % 200;
      const alpha = Math.max(0, 1 - baseRadius / 200) * wave.amplitude;

      ctx.strokeStyle = `rgba(56, 189, 248, ${alpha})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x, y, baseRadius, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = `rgba(56, 189, 248, ${alpha * 0.5})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(x, y, baseRadius * 0.7, 0, Math.PI * 2);
      ctx.stroke();
    }
  };

  const drawDefects = (
    ctx: CanvasRenderingContext2D,
    defects: Defect[],
    offsetX: number,
    offsetY: number,
    cs: number
  ) => {
    const time = Date.now() / 500;

    for (const defect of defects) {
      const x = offsetX + defect.position.x * cs;
      const y = offsetY + defect.position.y * cs;
      const color = getDefectTypeColor(defect.type);
      const pulse = 0.5 + 0.5 * Math.sin(time + defect.position.x * 0.1);
      const size = (15 + defect.severity * 20) * (0.8 + 0.4 * pulse);

      const gradient = ctx.createRadialGradient(x, y, 0, x, y, size);
      gradient.addColorStop(0, color);
      gradient.addColorStop(0.5, color + '80');
      gradient.addColorStop(1, 'transparent');

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.strokeRect(x - size / 2, y - size / 2, size, size);
      ctx.setLineDash([]);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 10px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`${(defect.severity * 100).toFixed(0)}%`, x, y);
    }
  };

  const drawVelocityVectors = (
    ctx: CanvasRenderingContext2D,
    flowField: FlowFieldData,
    offsetX: number,
    offsetY: number,
    cs: number
  ) => {
    const { velocityX, velocityY, density } = flowField;
    const step = 4;

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.lineWidth = 1;

    for (let y = 0; y < gridHeight(); y += step) {
      for (let x = 0; x < gridWidth(); x += step) {
        const idx = y * gridWidth() + x;
        if (density[idx] < 0.3) continue;

        const vx = velocityX[idx];
        const vy = velocityY[idx];
        const speed = Math.sqrt(vx * vx + vy * vy);

        if (speed < 0.01) continue;

        const px = offsetX + x * cs + cs / 2;
        const py = offsetY + y * cs + cs / 2;
        const scale = 15;
        const arrowLength = Math.min(speed * scale, 20);

        const endX = px + (vx / speed) * arrowLength;
        const endY = py + (vy / speed) * arrowLength;

        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(endX, endY);
        ctx.stroke();

        const angle = Math.atan2(vy, vx);
        const arrowSize = 3;
        ctx.beginPath();
        ctx.moveTo(endX, endY);
        ctx.lineTo(
          endX - arrowSize * Math.cos(angle - Math.PI / 6),
          endY - arrowSize * Math.sin(angle - Math.PI / 6)
        );
        ctx.lineTo(
          endX - arrowSize * Math.cos(angle + Math.PI / 6),
          endY - arrowSize * Math.sin(angle + Math.PI / 6)
        );
        ctx.closePath();
        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.fill();
      }
    }
  };

  return (
    <canvas
      ref={canvasRef}
      class="w-full h-full"
      style={{ 'aspect-ratio': `${props.width}/${props.height}` } as any}
    />
  );
};

export default FluidCanvas;
