<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import type { WaveformSnapshot } from '$lib/types';

  let { snapshot }: { snapshot: WaveformSnapshot | null } = $props();

  let canvasEl: HTMLCanvasElement | undefined = $state();
  let width = 800;
  let height = 400;
  let selectedChannel = $state(0);

  const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  const draw = () => {
    if (!canvasEl || !snapshot) return;

    const ctx = canvasEl.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvasEl.width = width * dpr;
    canvasEl.height = height * dpr;
    canvasEl.style.width = `${width}px`;
    canvasEl.style.height = `${height}px`;
    ctx.scale(dpr, dpr);

    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, width, height);

    const channel = snapshot.channels[selectedChannel];
    if (!channel || channel.data.length === 0) return;

    const padding = { top: 30, right: 20, bottom: 40, left: 60 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    const minVal = Math.min(...channel.data) * 0.95;
    const maxVal = Math.max(...channel.data) * 1.05;
    const range = maxVal - minVal || 1;

    ctx.strokeStyle = 'rgba(71, 85, 105, 0.2)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 5; i++) {
      const y = padding.top + (chartHeight * i) / 5;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(width - padding.right, y);
      ctx.stroke();

      ctx.fillStyle = '#64748b';
      ctx.font = '11px JetBrains Mono, monospace';
      ctx.textAlign = 'right';
      const value = maxVal - (range * i) / 5;
      ctx.fillText(value.toFixed(2), padding.left - 8, y + 4);
    }

    const color = colors[selectedChannel % colors.length];

    const gradient = ctx.createLinearGradient(0, padding.top, 0, height - padding.bottom);
    gradient.addColorStop(0, color + '30');
    gradient.addColorStop(1, color + '00');

    ctx.beginPath();
    ctx.moveTo(padding.left, height - padding.bottom);
    channel.data.forEach((value, index) => {
      const x = padding.left + (chartWidth * index) / (channel.data.length - 1 || 1);
      const y = padding.top + chartHeight - ((value - minVal) / range) * chartHeight;
      ctx.lineTo(x, y);
    });
    ctx.lineTo(width - padding.right, height - padding.bottom);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();

    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    channel.data.forEach((value, index) => {
      const x = padding.left + (chartWidth * index) / (channel.data.length - 1 || 1);
      const y = padding.top + chartHeight - ((value - minVal) / range) * chartHeight;
      if (index === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    const startTime = new Date(snapshot.startTime);
    const endTime = new Date(snapshot.endTime);
    ctx.fillStyle = '#64748b';
    ctx.font = '11px JetBrains Mono, monospace';
    ctx.textAlign = 'left';
    ctx.fillText(startTime.toLocaleTimeString('zh-CN'), padding.left, height - 15);
    ctx.textAlign = 'right';
    ctx.fillText(endTime.toLocaleTimeString('zh-CN'), width - padding.right, height - 15);

    ctx.fillStyle = color;
    ctx.font = '12px Noto Sans SC, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`${channel.name} (${channel.unit})`, padding.left, 18);
  };

  $effect(() => {
    draw();
  });

  onMount(() => {
    const handleResize = () => {
      if (canvasEl?.parentElement) {
        width = canvasEl.parentElement.clientWidth;
        draw();
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
  });

  onDestroy(() => {
    window.removeEventListener('resize', () => {});
  });
</script>

{#if snapshot}
  <div class="space-y-3">
    <div class="flex flex-wrap gap-2">
      {#each snapshot.channels as channel, index}
        <button
          class={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
            selectedChannel === index
              ? 'bg-blue-600 text-white'
              : 'bg-slate-700/50 text-slate-400 hover:bg-slate-700'
          }`}
          onclick={() => (selectedChannel = index)}
        >
          {channel.name}
        </button>
      {/each}
    </div>
    <div class="w-full rounded-lg overflow-hidden border border-slate-700/50">
      <canvas bind:this={canvasEl}></canvas>
    </div>
  </div>
{/if}
