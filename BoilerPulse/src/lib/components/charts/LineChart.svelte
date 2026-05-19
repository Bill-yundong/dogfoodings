<script lang="ts">
  import { onMount, onDestroy } from 'svelte';

  let {
    data,
    labels,
    color = '#3b82f6',
    height = 200,
    showArea = true,
    yMin,
    yMax
  }: {
    data: number[];
    labels?: string[];
    color?: string;
    height?: number;
    showArea?: boolean;
    yMin?: number;
    yMax?: number;
  } = $props();

  let canvasEl: HTMLCanvasElement | undefined;
  let containerEl: HTMLDivElement | undefined;
  let width = 600;
  let animationFrame: number | null = null;

  const draw = () => {
    if (!canvasEl || data.length === 0) return;

    const ctx = canvasEl.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvasEl.width = width * dpr;
    canvasEl.height = height * dpr;
    canvasEl.style.width = `${width}px`;
    canvasEl.style.height = `${height}px`;
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, width, height);

    const padding = { top: 10, right: 10, bottom: 20, left: 40 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    const min = yMin ?? Math.min(...data) * 0.95;
    const max = yMax ?? Math.max(...data) * 1.05;
    const range = max - min || 1;

    ctx.strokeStyle = 'rgba(71, 85, 105, 0.3)';
    ctx.lineWidth = 1;

    for (let i = 0; i <= 4; i++) {
      const y = padding.top + (chartHeight * i) / 4;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(width - padding.right, y);
      ctx.stroke();

      ctx.fillStyle = '#64748b';
      ctx.font = '10px JetBrains Mono, monospace';
      ctx.textAlign = 'right';
      const value = max - (range * i) / 4;
      ctx.fillText(value.toFixed(1), padding.left - 5, y + 3);
    }

    if (showArea) {
      const gradient = ctx.createLinearGradient(0, padding.top, 0, height - padding.bottom);
      gradient.addColorStop(0, color + '40');
      gradient.addColorStop(1, color + '00');

      ctx.beginPath();
      ctx.moveTo(padding.left, height - padding.bottom);
      data.forEach((value, index) => {
        const x = padding.left + (chartWidth * index) / (data.length - 1 || 1);
        const y = padding.top + chartHeight - ((value - min) / range) * chartHeight;
        ctx.lineTo(x, y);
      });
      ctx.lineTo(width - padding.right, height - padding.bottom);
      ctx.closePath();
      ctx.fillStyle = gradient;
      ctx.fill();
    }

    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    data.forEach((value, index) => {
      const x = padding.left + (chartWidth * index) / (data.length - 1 || 1);
      const y = padding.top + chartHeight - ((value - min) / range) * chartHeight;

      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    ctx.stroke();

    if (labels && labels.length > 0) {
      ctx.fillStyle = '#64748b';
      ctx.font = '10px JetBrains Mono, monospace';
      ctx.textAlign = 'center';
      const step = Math.ceil(labels.length / 6);
      labels.forEach((label, index) => {
        if (index % step === 0) {
          const x = padding.left + (chartWidth * index) / (labels.length - 1 || 1);
          ctx.fillText(label, x, height - 5);
        }
      });
    }
  };

  const updateSize = () => {
    if (containerEl) {
      width = containerEl.clientWidth;
      draw();
    }
  };

  $effect(() => {
    draw();
  });

  onMount(() => {
    updateSize();
    window.addEventListener('resize', updateSize);
  });

  onDestroy(() => {
    window.removeEventListener('resize', updateSize);
    if (animationFrame) {
      cancelAnimationFrame(animationFrame);
    }
  });
</script>

<div bind:this={containerEl} class="w-full">
  <canvas bind:this={canvasEl}></canvas>
</div>
