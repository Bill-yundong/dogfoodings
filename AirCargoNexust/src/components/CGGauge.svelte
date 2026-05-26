<script lang="ts">
  import { onMount, onDestroy } from 'svelte';

  let {
    cgPercent = 30,
    forwardLimit = 14,
    aftLimit = 46,
    size = 200
  }: {
    cgPercent?: number;
    forwardLimit?: number;
    aftLimit?: number;
    size?: number;
  } = $props();

  let canvas: HTMLCanvasElement;
  let animationFrame: number;
  let displayCgPercent = $state(cgPercent);

  function drawGauge() {
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    displayCgPercent += (cgPercent - displayCgPercent) * 0.1;

    ctx.clearRect(0, 0, size, size);
    
    const centerX = size / 2;
    const centerY = size / 2;
    const radius = size * 0.4;
    const startAngle = Math.PI * 0.75;
    const endAngle = Math.PI * 2.25;
    const totalAngle = endAngle - startAngle;

    const safeStartAngle = startAngle + (forwardLimit / 100) * totalAngle;
    const safeEndAngle = startAngle + (aftLimit / 100) * totalAngle;

    ctx.lineWidth = size * 0.06;
    ctx.lineCap = 'round';

    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, startAngle, endAngle);
    ctx.strokeStyle = '#252542';
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, safeStartAngle, safeEndAngle);
    ctx.strokeStyle = '#2EC4B6';
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, startAngle, safeStartAngle);
    ctx.strokeStyle = '#FF6B35';
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, safeEndAngle, endAngle);
    ctx.strokeStyle = '#FF6B35';
    ctx.stroke();

    const indicatorAngle = startAngle + Math.max(0, Math.min(100, displayCgPercent)) / 100 * totalAngle;
    const indicatorLength = radius * 0.7;

    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(indicatorAngle);
    
    ctx.beginPath();
    ctx.moveTo(-size * 0.05, 0);
    ctx.lineTo(indicatorLength, 0);
    ctx.lineWidth = size * 0.03;
    ctx.strokeStyle = '#E63946';
    ctx.lineCap = 'round';
    ctx.stroke();
    
    ctx.restore();

    ctx.beginPath();
    ctx.arc(centerX, centerY, size * 0.08, 0, Math.PI * 2);
    ctx.fillStyle = '#1A1A2E';
    ctx.fill();
    ctx.strokeStyle = '#E63946';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = '#E8E8E8';
    ctx.font = `bold ${size * 0.12}px JetBrains Mono, monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${displayCgPercent.toFixed(1)}%`, centerX, centerY + size * 0.05);

    ctx.fillStyle = '#6B7280';
    ctx.font = `${size * 0.06}px JetBrains Mono, monospace`;
    ctx.fillText('% MAC', centerX, centerY + size * 0.18);

    ctx.fillStyle = '#FF6B35';
    ctx.font = `${size * 0.05}px JetBrains Mono, monospace`;
    ctx.textAlign = 'left';
    ctx.fillText(`${forwardLimit}%`, centerX - radius * 0.8, centerY + radius * 0.3);
    ctx.textAlign = 'right';
    ctx.fillText(`${aftLimit}%`, centerX + radius * 0.8, centerY + radius * 0.3);

    const isInSafeRange = displayCgPercent >= forwardLimit && displayCgPercent <= aftLimit;
    ctx.fillStyle = isInSafeRange ? '#2EC4B6' : '#E63946';
    ctx.font = `${size * 0.05}px JetBrains Mono, monospace`;
    ctx.textAlign = 'center';
    ctx.fillText(isInSafeRange ? '正常' : '超限', centerX, centerY - radius * 0.6);
  }

  function animate() {
    drawGauge();
    animationFrame = requestAnimationFrame(animate);
  }

  onMount(() => {
    animate();
  });

  onDestroy(() => {
    cancelAnimationFrame(animationFrame);
  });
</script>

<div class="flex flex-col items-center">
  <canvas 
    bind:this={canvas} 
    {size}
    height={size}
    width={size}
  ></canvas>
</div>
