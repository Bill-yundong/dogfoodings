<script lang="ts">
  import { onMount, onDestroy } from 'svelte';

  let { data, labels, color = '#3E92CC', showArea = true, yLabel = '' } = $props<{
    data: number[];
    labels: string[];
    color?: string;
    showArea?: boolean;
    yLabel?: string;
  }>();

  let canvasRef: HTMLCanvasElement | null = null;
  let containerRef: HTMLDivElement | null = null;
  let hoveredIndex: number | null = null;

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
    const padding = { top: 20, right: 20, bottom: 30, left: 50 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    ctx.clearRect(0, 0, width, height);

    ctx.strokeStyle = 'rgba(62, 146, 204, 0.1)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 5; i++) {
      const y = padding.top + (i / 5) * chartHeight;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(width - padding.right, y);
      ctx.stroke();
    }

    if (data.length < 2) return;

    const maxVal = Math.max(...data) * 1.1;
    const minVal = Math.min(...data) * 0.9;
    const range = maxVal - minVal || 1;

    const points = data.map((val: number, i: number) => ({
      x: padding.left + (i / (data.length - 1)) * chartWidth,
      y: padding.top + ((maxVal - val) / range) * chartHeight
    }));

    if (showArea) {
      ctx.beginPath();
      ctx.moveTo(points[0].x, height - padding.bottom);
      for (const p of points) {
        ctx.lineTo(p.x, p.y);
      }
      ctx.lineTo(points[points.length - 1].x, height - padding.bottom);
      ctx.closePath();

      const gradient = ctx.createLinearGradient(0, padding.top, 0, height - padding.bottom);
      gradient.addColorStop(0, color + '40');
      gradient.addColorStop(1, color + '05');
      ctx.fillStyle = gradient;
      ctx.fill();
    }

    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      const cpx = (prev.x + curr.x) / 2;
      ctx.bezierCurveTo(cpx, prev.y, cpx, curr.y, curr.x, curr.y);
    }
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.stroke();

    for (let i = 0; i < points.length; i++) {
      const p = points[i];
      const isHovered = hoveredIndex === i;
      const size = isHovered ? 6 : 3;

      ctx.beginPath();
      ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
      ctx.fillStyle = isHovered ? '#fff' : color;
      ctx.fill();

      if (isHovered) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, 10, 0, Math.PI * 2);
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.globalAlpha = 0.5;
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
    }

    ctx.fillStyle = '#94A3B8';
    ctx.font = '10px Inter, sans-serif';
    ctx.textAlign = 'center';
    const labelStep = Math.ceil(labels.length / 8);
    for (let i = 0; i < labels.length; i += labelStep) {
      const x = padding.left + (i / (labels.length - 1)) * chartWidth;
      ctx.fillText(labels[i], x, height - padding.bottom + 18);
    }

    ctx.textAlign = 'right';
    for (let i = 0; i <= 5; i++) {
      const val = maxVal - (i / 5) * range;
      const y = padding.top + (i / 5) * chartHeight;
      ctx.fillText(val.toFixed(0), padding.left - 8, y + 4);
    }

    if (yLabel) {
      ctx.save();
      ctx.translate(15, height / 2);
      ctx.rotate(-Math.PI / 2);
      ctx.textAlign = 'center';
      ctx.fillStyle = '#64748B';
      ctx.fillText(yLabel, 0, 0);
      ctx.restore();
    }

    if (hoveredIndex !== null && points[hoveredIndex]) {
      const p = points[hoveredIndex];
      const value = data[hoveredIndex];

      ctx.fillStyle = 'rgba(15, 23, 42, 0.95)';
      ctx.strokeStyle = color + '80';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(p.x - 40, p.y - 45, 80, 35, 6);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#F1FAEE';
      ctx.font = 'bold 12px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(value.toFixed(1), p.x, p.y - 25);
      ctx.fillStyle = '#94A3B8';
      ctx.font = '10px Inter, sans-serif';
      ctx.fillText(labels[hoveredIndex] || '', p.x, p.y - 13);
    }
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!canvasRef || !containerRef || data.length < 2) return;
    const rect = canvasRef.getBoundingClientRect();
    const x = e.clientX - rect.left;

    const padding = { left: 50, right: 20 };
    const chartWidth = rect.width - padding.left - padding.right;
    const index = Math.round(((x - padding.left) / chartWidth) * (data.length - 1));
    hoveredIndex = index >= 0 && index < data.length ? index : null;
  };

  onMount(() => {
    draw();
    if (containerRef) {
      containerRef.addEventListener('mousemove', handleMouseMove);
      containerRef.addEventListener('mouseleave', () => { hoveredIndex = null; });
    }
    window.addEventListener('resize', draw);
  });

  onDestroy(() => {
    if (containerRef) {
      containerRef.removeEventListener('mousemove', handleMouseMove);
    }
    window.removeEventListener('resize', draw);
  });

  $effect(() => {
    draw();
  });
</script>

<div bind:this={containerRef} class="w-full h-full min-h-[200px]">
  <canvas bind:this={canvasRef} class="w-full h-full"></canvas>
</div>
