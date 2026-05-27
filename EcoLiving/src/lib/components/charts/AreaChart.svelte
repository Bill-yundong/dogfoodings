<script lang="ts">
  interface DataPoint {
    timestamp: number;
    value: number;
    value2?: number;
  }

  let {
    data,
    height = 200,
    color = '#00D4AA',
    color2 = '#3B82F6',
    showGradient = true,
    showArea = true,
    showLine = true,
    showDots = false,
    animate = true,
  } = $props<{
    data: DataPoint[];
    height?: number;
    color?: string;
    color2?: string;
    showGradient?: boolean;
    showArea?: boolean;
    showLine?: boolean;
    showDots?: boolean;
    animate?: boolean;
  }>();

  const width = $derived(() => data.length > 0 ? data.length * 4 : 300);
  const padding = { top: 10, right: 10, bottom: 20, left: 40 };

  const minValue = $derived(() => {
    if (data.length === 0) return 0;
    const values = data.flatMap((d: DataPoint) => [d.value, d.value2 || 0].filter(v => v > 0));
    return Math.min(...values) * 0.9;
  });

  const maxValue = $derived(() => {
    if (data.length === 0) return 100;
    const values = data.flatMap((d: DataPoint) => [d.value, d.value2 || 0]);
    return Math.max(...values) * 1.1;
  });

  const chartWidth = $derived(() => Math.max(300, width() - padding.left - padding.right));
  const chartHeight = $derived(() => height - padding.top - padding.bottom);

  function getX(index: number): number {
    if (data.length <= 1) return padding.left;
    return padding.left + (index / (data.length - 1)) * chartWidth();
  }

  function getY(value: number): number {
    const range = maxValue() - minValue();
    if (range === 0) return padding.top + chartHeight() / 2;
    return padding.top + chartHeight() - ((value - minValue()) / range) * chartHeight();
  }

  const pathD = $derived(() => {
    if (data.length === 0) return '';
    return data.map((d: DataPoint, i: number) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(d.value)}`).join(' ');
  });

  const pathD2 = $derived(() => {
    if (data.length === 0 || !data.some((d: DataPoint) => d.value2 !== undefined)) return '';
    return data.map((d: DataPoint, i: number) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(d.value2 || 0)}`).join(' ');
  });

  const areaPathD = $derived(() => {
    if (data.length === 0) return '';
    const path = pathD();
    const lastX = getX(data.length - 1);
    const firstX = getX(0);
    const baseY = padding.top + chartHeight();
    return `${path} L ${lastX} ${baseY} L ${firstX} ${baseY} Z`;
  });

  const gradientId = `gradient-${Math.random().toString(36).substring(2, 9)}`;
  const gradientId2 = `gradient2-${Math.random().toString(36).substring(2, 9)}`;

  function formatValue(value: number): string {
    if (value >= 1000) return `${(value / 1000).toFixed(1)}k`;
    return value.toFixed(0);
  }
</script>

<div class="chart-container" style="height: {height}px;">
  <svg
    viewBox="0 0 {Math.max(300, width())} {height}"
    preserveAspectRatio="none"
    class="w-full h-full"
  >
    <defs>
      {#if showGradient}
        <linearGradient id={gradientId} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color={color} stop-opacity="0.4" />
          <stop offset="100%" stop-color={color} stop-opacity="0" />
        </linearGradient>
        {#if color2}
          <linearGradient id={gradientId2} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color={color2} stop-opacity="0.3" />
            <stop offset="100%" stop-color={color2} stop-opacity="0" />
          </linearGradient>
        {/if}
      {/if}
      <filter id="glow">
        <feGaussianBlur stdDeviation="2" result="coloredBlur" />
        <feMerge>
          <feMergeNode in="coloredBlur" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
    </defs>

    {#each Array.from({ length: 5 }, (_, i) => i) as i}
      <line
        x1={padding.left}
        y1={padding.top + (i / 4) * chartHeight()}
        x2={padding.left + chartWidth()}
        y2={padding.top + (i / 4) * chartHeight()}
        stroke="rgba(148, 163, 184, 0.1)"
        stroke-width="1"
        stroke-dasharray="4,4"
      />
      <text
        x={padding.left - 8}
        y={padding.top + (i / 4) * chartHeight() + 4}
        fill="#64748B"
        font-size="10"
        font-family="JetBrains Mono, monospace"
        text-anchor="end"
      >
        {formatValue(maxValue() - (i / 4) * (maxValue() - minValue()))}
      </text>
    {/each}

    {#if showArea && data.length > 1}
      <path
        d={areaPathD()}
        fill={`url(#${gradientId})`}
        style={animate ? 'transition: d 0.3s ease;' : ''}
      />
    {/if}

    {#if showLine && data.length > 1}
      <path
        d={pathD()}
        fill="none"
        stroke={color}
        stroke-width="2"
        filter="url(#glow)"
        style={animate ? 'transition: d 0.3s ease;' : ''}
      />
    {/if}

    {#if pathD2() && data.length > 1}
      {#if showArea}
        <path
          d={`${pathD2()} L ${getX(data.length - 1)} ${padding.top + chartHeight()} L ${getX(0)} ${padding.top + chartHeight()} Z`}
          fill={`url(#${gradientId2})`}
          style={animate ? 'transition: d 0.3s ease;' : ''}
        />
      {/if}
      {#if showLine}
        <path
          d={pathD2()}
          fill="none"
          stroke={color2}
          stroke-width="2"
          stroke-dasharray="4,4"
          style={animate ? 'transition: d 0.3s ease;' : ''}
        />
      {/if}
    {/if}

    {#if showDots && data.length > 0}
      {#each data as point, i}
        <circle
          cx={getX(i)}
          cy={getY(point.value)}
          r="4"
          fill={color}
          stroke="white"
          stroke-width="2"
          style={animate ? 'transition: cx 0.3s ease, cy 0.3s ease;' : ''}
        />
      {/each}
    {/if}

    {#if data.length > 0}
      {#each [0, data.length - 1] as idx}
        <text
          x={getX(idx)}
          y={height - 5}
          fill="#64748B"
          font-size="10"
          font-family="JetBrains Mono, monospace"
          text-anchor={idx === 0 ? 'start' : 'end'}
        >
          {new Date(data[idx].timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
        </text>
      {/each}
    {/if}
  </svg>
</div>

<style>
  .chart-container {
    position: relative;
    width: 100%;
    overflow: hidden;
  }
</style>
