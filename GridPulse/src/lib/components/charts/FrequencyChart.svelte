<script lang="ts">
  import { onMount, onDestroy } from 'svelte';

  export let data: { time: number; frequency: number }[] = [];
  export let width: number = 800;
  export let height: number = 300;
  export let title: string = '频率动态曲线';

  let canvas: HTMLCanvasElement;
  let animationFrame: number;

  const padding = { top: 40, right: 40, bottom: 50, left: 60 };
  const fn = 50;
  const yRange = 1;

  function draw() {
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.scale(dpr, dpr);

    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = 'rgba(6, 182, 212, 0.05)';
    ctx.lineWidth = 1;
    
    for (let i = 0; i <= 10; i++) {
      const y = padding.top + (i / 10) * (height - padding.top - padding.bottom);
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(width - padding.right, y);
      ctx.stroke();
    }

    for (let i = 0; i <= 10; i++) {
      const x = padding.left + (i / 10) * (width - padding.left - padding.right);
      ctx.beginPath();
      ctx.moveTo(x, padding.top);
      ctx.lineTo(x, height - padding.bottom);
      ctx.stroke();
    }

    ctx.strokeStyle = 'rgba(34, 197, 94, 0.5)';
    ctx.setLineDash([5, 5]);
    const yNominal = padding.top + ((fn + yRange / 2) - fn) / yRange * (height - padding.top - padding.bottom);
    ctx.beginPath();
    ctx.moveTo(padding.left, yNominal);
    ctx.lineTo(width - padding.right, yNominal);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.strokeStyle = 'rgba(239, 68, 68, 0.3)';
    [fn + 0.2, fn - 0.2].forEach(limit => {
      const y = padding.top + ((fn + yRange / 2) - limit) / yRange * (height - padding.top - padding.bottom);
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(width - padding.right, y);
      ctx.stroke();
    });

    if (data.length > 1) {
      const tMin = data[0].time;
      const tMax = data[data.length - 1].time;
      const tRange = tMax - tMin || 1;

      ctx.beginPath();
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 2;

      data.forEach((point, i) => {
        const x = padding.left + ((point.time - tMin) / tRange) * (width - padding.left - padding.right);
        const y = padding.top + ((fn + yRange / 2) - point.frequency) / yRange * (height - padding.top - padding.bottom);
        
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });
      ctx.stroke();

      const gradient = ctx.createLinearGradient(0, padding.top, 0, height - padding.bottom);
      gradient.addColorStop(0, 'rgba(6, 182, 212, 0.3)');
      gradient.addColorStop(1, 'rgba(6, 182, 212, 0)');

      ctx.fillStyle = gradient;
      ctx.beginPath();
      data.forEach((point, i) => {
        const x = padding.left + ((point.time - tMin) / tRange) * (width - padding.left - padding.right);
        const y = padding.top + ((fn + yRange / 2) - point.frequency) / yRange * (height - padding.top - padding.bottom);
        
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });
      ctx.lineTo(width - padding.right, height - padding.bottom);
      ctx.lineTo(padding.left, height - padding.bottom);
      ctx.closePath();
      ctx.fill();
    }

    ctx.fillStyle = '#94a3b8';
    ctx.font = '12px Inter, sans-serif';
    ctx.textAlign = 'right';
    for (let i = 0; i <= 5; i++) {
      const freq = fn + yRange / 2 - (i / 5) * yRange;
      const y = padding.top + (i / 5) * (height - padding.top - padding.bottom);
      ctx.fillText(freq.toFixed(2), padding.left - 10, y + 4);
    }

    ctx.textAlign = 'center';
    if (data.length > 0) {
      const tMin = data[0].time;
      const tMax = data[data.length - 1].time;
      for (let i = 0; i <= 5; i++) {
        const t = tMin + (i / 5) * (tMax - tMin);
        const x = padding.left + (i / 5) * (width - padding.left - padding.right);
        ctx.fillText(t.toFixed(1) + 's', x, height - padding.bottom + 25);
      }
    }

    ctx.fillStyle = '#e2e8f0';
    ctx.font = 'bold 14px Inter, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(title, padding.left, 20);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '11px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('时间 (s)', width / 2, height - 10);

    ctx.save();
    ctx.translate(15, height / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('频率 (Hz)', 0, 0);
    ctx.restore();
  }

  function animate() {
    draw();
    animationFrame = requestAnimationFrame(animate);
  }

  onMount(() => {
    animate();
  });

  onDestroy(() => {
    if (animationFrame) {
      cancelAnimationFrame(animationFrame);
    }
  });
</script>

<div class="relative">
  <canvas bind:this={canvas} class="rounded-lg"></canvas>
</div>
