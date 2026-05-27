<script lang="ts">
  import { onMount } from 'svelte';

  let {
    data,
    height = 120,
    color = '#00D4AA',
    anomalyColor = '#EF4444',
    anomalies: anomalyIndices = [],
    showGrid = true,
  } = $props<{
    data: number[];
    height?: number;
    color?: string;
    anomalyColor?: string;
    anomalies?: number[];
    showGrid?: boolean;
  }>();

  let canvas: HTMLCanvasElement | undefined;
  let ctx: CanvasRenderingContext2D | null = null;

  const padding = { top: 10, right: 10, bottom: 10, left: 10 };

  const minValue = $derived(() => {
    if (data.length === 0) return 0;
    return Math.min(...data) * 0.9;
  });

  const maxValue = $derived(() => {
    if (data.length === 0) return 100;
    return Math.max(...data) * 1.1;
  });

  onMount(() => {
    if (canvas) {
      ctx = canvas.getContext('2d');
      draw();
    }
  });

  $effect(() => {
    if (ctx && canvas) {
      draw();
    }
  });

  function draw() {
    if (!ctx || !canvas || data.length === 0) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    const width = rect.width;

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, width, height);

    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;
    const range = maxValue() - minValue();

    function getX(index: number): number {
      return padding.left + (index / (data.length - 1)) * chartWidth;
    }

    function getY(value: number): number {
      if (range === 0) return padding.top + chartHeight / 2;
      return padding.top + chartHeight - ((value - minValue()) / range) * chartHeight;
    }

    if (showGrid) {
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.1)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);

      for (let i = 0; i <= 4; i++) {
        const y = padding.top + (i / 4) * chartHeight;
        ctx.beginPath();
        ctx.moveTo(padding.left, y);
        ctx.lineTo(padding.left + chartWidth, y);
        ctx.stroke();
      }
      ctx.setLineDash([]);
    }

    const gradient = ctx.createLinearGradient(0, padding.top, 0, padding.top + chartHeight);
    gradient.addColorStop(0, color + '40');
    gradient.addColorStop(1, color + '00');

    ctx.beginPath();
    ctx.moveTo(getX(0), padding.top + chartHeight);
    for (let i = 0; i < data.length; i++) {
      ctx.lineTo(getX(i), getY(data[i]));
    }
    ctx.lineTo(getX(data.length - 1), padding.top + chartHeight);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(getX(0), getY(data[0]));
    for (let i = 1; i < data.length; i++) {
      const x0 = getX(i - 1);
      const y0 = getY(data[i - 1]);
      const x1 = getX(i);
      const y1 = getY(data[i]);
      
      const cpX = (x0 + x1) / 2;
      ctx.bezierCurveTo(cpX, y0, cpX, y1, x1, y1);
    }
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.stroke();

    anomalyIndices.forEach((index: number) => {
      if (index >= 0 && index < data.length) {
        const x = getX(index);
        const y = getY(data[index]);

        if (ctx) {
          ctx.beginPath();
          ctx.arc(x, y, 8, 0, Math.PI * 2);
          ctx.fillStyle = anomalyColor + '30';
          ctx.fill();
          ctx.strokeStyle = anomalyColor;
          ctx.lineWidth = 2;
          ctx.stroke();

          ctx.beginPath();
          ctx.arc(x, y, 3, 0, Math.PI * 2);
          ctx.fillStyle = anomalyColor;
          ctx.fill();
        }
      }
    });
  }
</script>

<canvas
  bind:this={canvas}
  class="waveform-canvas"
  style="height: {height}px;"
/>

<style>
  .waveform-canvas {
    width: 100%;
    display: block;
  }
</style>
