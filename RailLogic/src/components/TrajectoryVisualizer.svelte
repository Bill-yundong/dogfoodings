<script lang="ts">
  import { trajectoryPoints } from '../lib/stores';
  import type { TrajectoryPoint } from '../types';

  let points = $state<TrajectoryPoint[]>([]);
  let canvasRef = $state<HTMLCanvasElement | null>(null);

  $effect(() => {
    const unsub = trajectoryPoints.subscribe((pts) => {
      points = pts.slice(-100);
    });
    return unsub;
  });

  $effect(() => {
    if (canvasRef && points.length > 0) {
      renderTrajectory();
    }
  });

  function renderTrajectory(): void {
    const canvas = canvasRef;
    if (!canvas || points.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= 10; i++) {
      const x = (i / 10) * width;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();

      const y = (i / 10) * height;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    const minX = Math.min(...points.map((p) => p.x));
    const maxX = Math.max(...points.map((p) => p.x));
    const minY = Math.min(...points.map((p) => p.y));
    const maxY = Math.max(...points.map((p) => p.y));

    const rangeX = maxX - minX || 1;
    const rangeY = maxY - minY || 1;

    const padding = 40;
    const scaleX = (width - 2 * padding) / rangeX;
    const scaleY = (height - 2 * padding) / rangeY;
    const scale = Math.min(scaleX, scaleY);

    const offsetX = (width - rangeX * scale) / 2;
    const offsetY = (height - rangeY * scale) / 2;

    if (points.length > 1) {
      ctx.beginPath();
      ctx.strokeStyle = '#4fd1c5';
      ctx.lineWidth = 2;

      for (let i = 0; i < points.length; i++) {
        const point = points[i];
        const x = offsetX + (point.x - minX) * scale;
        const y = offsetY + (point.y - minY) * scale;

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.stroke();
    }

    for (let i = 0; i < points.length; i++) {
      const point = points[i];
      const x = offsetX + (point.x - minX) * scale;
      const y = offsetY + (point.y - minY) * scale;

      const alpha = 0.3 + (i / points.length) * 0.7;

      let color = '#4fd1c5';
      if (point.source === 'visual') color = '#f687b3';
      if (point.source === 'gps') color = '#9f7aea';

      ctx.beginPath();
      ctx.fillStyle = color;
      ctx.globalAlpha = alpha;
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    const latest = points[points.length - 1];
    if (latest) {
      const x = offsetX + (latest.x - minX) * scale;
      const y = offsetY + (latest.y - minY) * scale;

      ctx.beginPath();
      ctx.strokeStyle = '#ff6b6b';
      ctx.lineWidth = 2;
      ctx.arc(x, y, 10, 0, Math.PI * 2);
      ctx.stroke();

      ctx.beginPath();
      ctx.fillStyle = '#ff6b6b';
      ctx.arc(x, y, 5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function formatMileage(mileage: number): string {
    return (mileage / 1000).toFixed(3);
  }

  function getSourceText(source: string): string {
    switch (source) {
      case 'visual': return '视觉';
      case 'gps': return 'GPS';
      case 'inertial': return '惯性';
      default: return '融合';
    }
  }
</script>

<div class="card">
  <div class="card-header">
    <span class="card-icon">📍</span>
    <h3 class="card-title">实时运行轨迹复原</h3>
  </div>

  <div class="canvas-container">
    <canvas
      bind:this={canvasRef}
      width={600}
      height={400}
    ></canvas>

    <div class="canvas-legend">
      <div class="legend-item">
        <span class="legend-dot cyan"></span>
        <span>融合数据</span>
      </div>
      <div class="legend-item">
        <span class="legend-dot pink"></span>
        <span>视觉数据</span>
      </div>
      <div class="legend-item">
        <span class="legend-dot purple"></span>
        <span>GPS数据</span>
      </div>
    </div>

    {#if points.length === 0}
      <div class="alert-empty">等待轨迹数据...</div>
    {/if}
  </div>

  {#if points.length > 0}
    <div class="trajectory-metrics">
      <div class="trajectory-metric">
        <div class="trajectory-metric-label">数据点</div>
        <div class="trajectory-metric-value">{points.length}</div>
      </div>
      <div class="trajectory-metric">
        <div class="trajectory-metric-label">当前里程</div>
        <div class="trajectory-metric-value">K{formatMileage(points[points.length - 1].mileage)}</div>
      </div>
      <div class="trajectory-metric">
        <div class="trajectory-metric-label">当前速度</div>
        <div class="trajectory-metric-value">{points[points.length - 1].speed.toFixed(1)} km/h</div>
      </div>
      <div class="trajectory-metric">
        <div class="trajectory-metric-label">数据来源</div>
        <div class="trajectory-metric-value">{getSourceText(points[points.length - 1].source)}</div>
      </div>
    </div>
  {/if}
</div>
