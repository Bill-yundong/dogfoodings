<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import type { TemperaturePoint } from '@/types';
  import { interpolateColor, formatTemperature, formatDistance } from '@/utils/format';

  let { data, maxTemp = 90, minTemp = 10 } = $props<{
    data: TemperaturePoint[];
    maxTemp?: number;
    minTemp?: number;
  }>();

  let canvasRef: HTMLCanvasElement | null = null;
  let containerRef: HTMLDivElement | null = null;
  let hoveredPoint: { point: TemperaturePoint; x: number; y: number } | null = null;
  let animationId: number | null = null;
  let time = 0;

  const draw = () => {
    if (!canvasRef || !containerRef) return;

    const canvas = canvasRef;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = containerRef.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;
    const padding = { top: 40, right: 60, bottom: 50, left: 60 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    ctx.clearRect(0, 0, width, height);

    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, 'rgba(15, 23, 42, 0.9)');
    gradient.addColorStop(1, 'rgba(13, 17, 23, 0.95)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = 'rgba(62, 146, 204, 0.1)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 10; i++) {
      const x = padding.left + (i / 10) * chartWidth;
      ctx.beginPath();
      ctx.moveTo(x, padding.top);
      ctx.lineTo(x, height - padding.bottom);
      ctx.stroke();
    }
    for (let i = 0; i <= 5; i++) {
      const y = padding.top + (i / 5) * chartHeight;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(width - padding.right, y);
      ctx.stroke();
    }

    if (data.length < 2) return;

    const maxDistance = Math.max(...data.map((d: TemperaturePoint) => d.position.distance));
    const maxDepth = Math.max(...data.map((d: TemperaturePoint) => d.position.depth));
    const minDepth = Math.min(...data.map((d: TemperaturePoint) => d.position.depth));

    const sortedData = [...data].sort((a, b) => a.position.distance - b.position.distance);

    for (let i = 0; i < sortedData.length - 1; i++) {
      const p1 = sortedData[i];
      const p2 = sortedData[i + 1];

      const x1 = padding.left + (p1.position.distance / maxDistance) * chartWidth;
      const x2 = padding.left + (p2.position.distance / maxDistance) * chartWidth;
      const y1 = padding.top + ((p1.position.depth - minDepth) / (maxDepth - minDepth || 1)) * chartHeight;
      const y2 = padding.top + ((p2.position.depth - minDepth) / (maxDepth - minDepth || 1)) * chartHeight;

      const tempGrad = ctx.createLinearGradient(x1, y1, x2, y2);
      tempGrad.addColorStop(0, interpolateColor(p1.temperature, minTemp, maxTemp));
      tempGrad.addColorStop(1, interpolateColor(p2.temperature, minTemp, maxTemp));

      const cableWidth = 12;
      const angle = Math.atan2(y2 - y1, x2 - x1);
      const perpX = Math.sin(angle) * cableWidth / 2;
      const perpY = -Math.cos(angle) * cableWidth / 2;

      ctx.beginPath();
      ctx.moveTo(x1 - perpX, y1 - perpY);
      ctx.lineTo(x2 - perpX, y2 - perpY);
      ctx.lineTo(x2 + perpX, y2 + perpY);
      ctx.lineTo(x1 + perpX, y1 + perpY);
      ctx.closePath();
      ctx.fillStyle = tempGrad;
      ctx.fill();

      const glowIntensity = (Math.max(p1.temperature, p2.temperature) - minTemp) / (maxTemp - minTemp);
      if (glowIntensity > 0.7) {
        ctx.shadowColor = interpolateColor(Math.max(p1.temperature, p2.temperature), minTemp, maxTemp);
        ctx.shadowBlur = 15 + Math.sin(time / 10 + i) * 5;
        ctx.fill();
        ctx.shadowBlur = 0;
      }
    }

    for (const point of sortedData) {
      const x = padding.left + (point.position.distance / maxDistance) * chartWidth;
      const y = padding.top + ((point.position.depth - minDepth) / (maxDepth - minDepth || 1)) * chartHeight;
      const tempRatio = (point.temperature - minTemp) / (maxTemp - minTemp);
      const pulseSize = 4 + tempRatio * 4 + Math.sin(time / 8 + point.position.distance / 100) * 2;

      ctx.beginPath();
      ctx.arc(x, y, pulseSize, 0, Math.PI * 2);
      ctx.fillStyle = interpolateColor(point.temperature, minTemp, maxTemp);
      ctx.fill();

      if (tempRatio > 0.8) {
        ctx.beginPath();
        ctx.arc(x, y, pulseSize + 3, 0, Math.PI * 2);
        ctx.strokeStyle = interpolateColor(point.temperature, minTemp, maxTemp);
        ctx.globalAlpha = 0.5 + Math.sin(time / 5) * 0.3;
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
    }

    ctx.fillStyle = '#94A3B8';
    ctx.font = '11px Inter, sans-serif';
    ctx.textAlign = 'center';
    for (let i = 0; i <= 5; i++) {
      const distance = (i / 5) * maxDistance;
      const x = padding.left + (i / 5) * chartWidth;
      ctx.fillText(formatDistance(distance, 0), x, height - padding.bottom + 20);
    }

    ctx.textAlign = 'right';
    for (let i = 0; i <= 5; i++) {
      const depth = minDepth + (i / 5) * (maxDepth - minDepth);
      const y = padding.top + (i / 5) * chartHeight;
      ctx.fillText(`${depth.toFixed(0)}m`, padding.left - 10, y + 4);
    }

    const colorBarWidth = 12;
    const colorBarX = width - padding.right + 20;
    const colorBarGrad = ctx.createLinearGradient(0, padding.top, 0, height - padding.bottom);
    for (let i = 0; i <= 10; i++) {
      const temp = minTemp + (i / 10) * (maxTemp - minTemp);
      colorBarGrad.addColorStop(i / 10, interpolateColor(temp, minTemp, maxTemp));
    }
    ctx.fillStyle = colorBarGrad;
    ctx.fillRect(colorBarX, padding.top, colorBarWidth, chartHeight);

    ctx.fillStyle = '#94A3B8';
    ctx.textAlign = 'left';
    ctx.font = '10px Inter, sans-serif';
    ctx.fillText(`${maxTemp}°C`, colorBarX + colorBarWidth + 8, padding.top + 4);
    ctx.fillText(`${minTemp}°C`, colorBarX + colorBarWidth + 8, height - padding.bottom);

    ctx.fillStyle = '#CBD5E1';
    ctx.font = '12px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('距离 (m)', width / 2, height - 15);

    ctx.save();
    ctx.translate(20, height / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.textAlign = 'center';
    ctx.fillText('深度 (m)', 0, 0);
    ctx.restore();

    if (hoveredPoint) {
      const point = hoveredPoint.point;
      const tooltipX = hoveredPoint.x + 15;
      const tooltipY = hoveredPoint.y - 40;

      ctx.fillStyle = 'rgba(15, 23, 42, 0.95)';
      ctx.strokeStyle = 'rgba(62, 146, 204, 0.5)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(tooltipX, tooltipY, 180, 60, 8);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#F1FAEE';
      ctx.font = '11px IBM Plex Mono, monospace';
      ctx.textAlign = 'left';
      ctx.fillText(`传感器: ${point.sensorId}`, tooltipX + 10, tooltipY + 20);
      ctx.fillStyle = interpolateColor(point.temperature, minTemp, maxTemp);
      ctx.fillText(`温度: ${formatTemperature(point.temperature)}`, tooltipX + 10, tooltipY + 36);
      ctx.fillStyle = '#94A3B8';
      ctx.fillText(`位置: ${formatDistance(point.position.distance)}`, tooltipX + 10, tooltipY + 52);
    }

    time++;
    animationId = requestAnimationFrame(draw);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!canvasRef || !containerRef) return;
    const rect = canvasRef.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const padding = { top: 40, right: 60, bottom: 50, left: 60 };
    const chartWidth = rect.width - padding.left - padding.right;
    const chartHeight = rect.height - padding.top - padding.bottom;
    const maxDistance = Math.max(...data.map((d: TemperaturePoint) => d.position.distance));
    const maxDepth = Math.max(...data.map((d: TemperaturePoint) => d.position.depth));
    const minDepth = Math.min(...data.map((d: TemperaturePoint) => d.position.depth));

    let closest: { point: TemperaturePoint; dist: number } | null = null;
    for (const point of data) {
      const px = padding.left + (point.position.distance / maxDistance) * chartWidth;
      const py = padding.top + ((point.position.depth - minDepth) / (maxDepth - minDepth || 1)) * chartHeight;
      const dist = Math.sqrt((x - px) ** 2 + (y - py) ** 2);
      if (dist < 20 && (!closest || dist < closest.dist)) {
        closest = { point, dist };
      }
    }

    hoveredPoint = closest ? { point: closest.point, x, y } : null;
  };

  onMount(() => {
    draw();
    if (containerRef) {
      containerRef.addEventListener('mousemove', handleMouseMove);
      containerRef.addEventListener('mouseleave', () => { hoveredPoint = null; });
    }
    window.addEventListener('resize', draw);
  });

  onDestroy(() => {
    if (animationId) cancelAnimationFrame(animationId);
    if (containerRef) {
      containerRef.removeEventListener('mousemove', handleMouseMove);
    }
    window.removeEventListener('resize', draw);
  });
</script>

<div bind:this={containerRef} class="w-full h-full min-h-[300px] relative cursor-crosshair">
  <canvas bind:this={canvasRef} class="absolute inset-0"></canvas>
</div>
