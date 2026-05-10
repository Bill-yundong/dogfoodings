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

    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = '#2a2a4e';
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
</script>

<div class="p-4 bg-gray-900 rounded-lg shadow-lg">
  <h3 class="text-xl font-bold text-white mb-4 flex items-center gap-2">
    <span class="text-2xl">📍</span>
    实时运行轨迹复原
  </h3>

  <div class="relative bg-gray-800 rounded-lg p-2 mb-4">
    <canvas
      bind:this={canvasRef}
      width={600}
      height={400}
      class="w-full rounded"
    ></canvas>

    <div class="absolute top-4 left-4 bg-black bg-opacity-50 px-3 py-2 rounded text-sm">
      <div class="flex items-center gap-4">
        <div class="flex items-center gap-1">
          <span class="w-3 h-3 rounded-full bg-cyan-400"></span>
          <span class="text-gray-300">融合数据</span>
        </div>
        <div class="flex items-center gap-1">
          <span class="w-3 h-3 rounded-full bg-pink-400"></span>
          <span class="text-gray-300">视觉数据</span>
        </div>
        <div class="flex items-center gap-1">
          <span class="w-3 h-3 rounded-full bg-purple-400"></span>
          <span class="text-gray-300">GPS数据</span>
        </div>
      </div>
    </div>

    {#if points.length === 0}
      <div class="absolute inset-0 flex items-center justify-center text-gray-400">
        等待轨迹数据...
      </div>
    {/if}
  </div>

  {#if points.length > 0}
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div class="bg-gray-800 p-3 rounded-lg">
        <div class="text-gray-400 text-sm">数据点数量</div>
        <div class="text-xl font-bold text-white">{points.length}</div>
      </div>

      <div class="bg-gray-800 p-3 rounded-lg">
        <div class="text-gray-400 text-sm">当前里程</div>
        <div class="text-xl font-bold text-cyan-400">
          K{formatMileage(points[points.length - 1].mileage)}
        </div>
      </div>

      <div class="bg-gray-800 p-3 rounded-lg">
        <div class="text-gray-400 text-sm">当前速度</div>
        <div class="text-xl font-bold text-green-400">
          {points[points.length - 1].speed.toFixed(1)} km/h
        </div>
      </div>

      <div class="bg-gray-800 p-3 rounded-lg">
        <div class="text-gray-400 text-sm">数据来源</div>
        <div class="text-xl font-bold text-purple-400">
          {(() => {
            const latest = points[points.length - 1];
            switch (latest.source) {
              case 'visual': return '视觉';
              case 'gps': return 'GPS';
              case 'inertial': return '惯性';
              default: return '融合';
            }
          })()}
        </div>
      </div>
    </div>
  {/if}
</div>
