<script lang="ts">

  let {
    title,
    value,
    unit = '',
    icon: IconComponent,
    trend = 0,
    trendLabel = '',
    color = '#00D4AA',
    delay = 0,
  } = $props<{
    title: string;
    value: number | string | (() => number | string);
    unit?: string;
    icon?: any;
    trend?: number;
    trendLabel?: string;
    color?: string;
    delay?: number;
  }>();

  const resolvedValue = $derived(() => {
    if (typeof value === 'function') {
      return value();
    }
    return value;
  });

  const trendColor = $derived(() => {
    if (trend > 0) return '#EF4444';
    if (trend < 0) return '#10B981';
    return '#64748B';
  });

  const trendIcon = $derived(() => {
    if (trend > 0) return '↑';
    if (trend < 0) return '↓';
    return '→';
  });

  let displayNumber = $state(0);
  let isAnimating = $state(false);

  $effect(() => {
    const currentValue = resolvedValue();
    if (typeof currentValue === 'number') {
      isAnimating = true;
      const start = displayNumber;
      const end = currentValue;
      const duration = 500;
      const startTime = Date.now();

      function animate() {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const ease = 1 - Math.pow(1 - progress, 3);
        displayNumber = start + (end - start) * ease;
        
        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          isAnimating = false;
        }
      }

      requestAnimationFrame(animate);
    }
  });

  const formatDisplay = $derived(() => {
    const currentValue = resolvedValue();
    if (typeof currentValue === 'string') return currentValue;
    const num = isAnimating ? displayNumber : currentValue as number;
    if (num >= 1000) return (num / 1000).toFixed(2);
    if (num >= 100) return num.toFixed(1);
    return num.toFixed(1);
  });
</script>

<div 
  class="glass-card glow-border p-5 animate-fade-in-up"
  style="animation-delay: {delay}ms;"
>
  <div class="flex items-start justify-between mb-3">
    <span class="text-sm text-slate-400 font-medium">{title}</span>
    {#if IconComponent}
      <div 
        class="w-10 h-10 rounded-lg flex items-center justify-center"
        style="background: {color}20; color: {color};"
      >
        <IconComponent size={20} />
      </div>
    {/if}
  </div>
  
  <div class="flex items-baseline gap-2 mb-2">
    <span 
      class="text-3xl font-bold data-value"
      style="color: {color};"
    >
      {formatDisplay()}
    </span>
    <span class="text-sm text-slate-400">{unit}</span>
  </div>

  {#if trend !== 0 || trendLabel}
    <div class="flex items-center gap-2">
      <span 
        class="text-sm font-medium"
        style="color: {trendColor()};"
      >
        {trendIcon()} {Math.abs(trend).toFixed(1)}%
      </span>
      {#if trendLabel}
        <span class="text-xs text-slate-500">{trendLabel}</span>
      {/if}
    </div>
  {/if}
</div>
