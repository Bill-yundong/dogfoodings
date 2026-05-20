<script lang="ts">
  import { onMount, onDestroy } from 'svelte';

  export let deltaData: Float64Array = new Float64Array();
  export let omegaData: Float64Array = new Float64Array();
  export let width: number = 400;
  export let height: number = 400;

  let canvas: HTMLCanvasElement;
  let animationFrame: number;

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

    const padding = 50;
    const plotWidth = width - 2 * padding;
    const plotHeight = height - 2 * padding;

    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = 'rgba(6, 182, 212, 0.05)';
    ctx.lineWidth = 1;
    
    for (let i = 0; i <= 10; i++) {
      const pos = padding + (i / 10) * Math.min(plotWidth, plotHeight);
      ctx.beginPath();
      ctx.moveTo(padding, pos);
      ctx.lineTo(width - padding, pos);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(pos, padding);
      ctx.lineTo(pos, height - padding);
      ctx.stroke();
    }

    ctx.strokeStyle = 'rgba(148, 163, 184, 0.3)';
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(padding, height / 2);
    ctx.lineTo(width - padding, height / 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(width / 2, padding);
    ctx.lineTo(width / 2, height - padding);
    ctx.stroke();
    ctx.setLineDash([]);

    if (deltaData.length > 0 && omegaData.length > 0) {
      let deltaMin = Infinity, deltaMax = -Infinity;
      let omegaMin = Infinity, omegaMax = -Infinity;
      
      for (let i = 0; i < deltaData.length; i++) {
        deltaMin = Math.min(deltaMin, deltaData[i]);
        deltaMax = Math.max(deltaMax, deltaData[i]);
        omegaMin = Math.min(omegaMin, omegaData[i]);
        omegaMax = Math.max(omegaMax, omegaData[i]);
      }

      const deltaRange = deltaMax - deltaMin || 1;
      const omegaRange = omegaMax - omegaMin || 1;
      const scale = Math.min(plotWidth / deltaRange, plotHeight / omegaRange) * 0.8;

      ctx.beginPath();
      for (let i = 0; i < deltaData.length; i++) {
        const x = width / 2 + (deltaData[i] - (deltaMin + deltaMax) / 2) * scale;
        const y = height / 2 - (omegaData[i] - (omegaMin + omegaMax) / 2) * scale;
        
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      const startTime = deltaData[0];
      const endTime = deltaData[deltaData.length - 1];
      
      const startX = width / 2 + (startTime - (deltaMin + deltaMax) / 2) * scale;
      const startY = height / 2 - (omegaData[0] - (omegaMin + omegaMax) / 2) * scale;
      const endX = width / 2 + (endTime - (deltaMin + deltaMax) / 2) * scale;
      const endY = height / 2 - (omegaData[omegaData.length - 1] - (omegaMin + omegaMax) / 2) * scale;

      ctx.fillStyle = '#22c55e';
      ctx.beginPath();
      ctx.arc(startX, startY, 6, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(endX, endY, 6, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#94a3b8';
      ctx.font = '10px JetBrains Mono, monospace';
      ctx.textAlign = 'left';
      ctx.fillText('δ (rad)', width - padding + 5, height / 2 + 4);
      ctx.textAlign = 'center';
      ctx.fillText('ω (pu)', width / 2, padding - 10);
    }

    ctx.fillStyle = '#e2e8f0';
    ctx.font = 'bold 14px Inter, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('相空间轨迹', padding, 25);

    ctx.font = '10px Inter, sans-serif';
    ctx.fillStyle = '#22c55e';
    ctx.fillRect(padding, height - 30, 10, 10);
    ctx.fillStyle = '#94a3b8';
    ctx.fillText('起始点', padding + 15, height - 22);
    
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(padding + 80, height - 30, 10, 10);
    ctx.fillStyle = '#94a3b8';
    ctx.fillText('终止点', padding + 95, height - 22);
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
