<script lang="ts">
  interface Segment {
    label: string;
    value: number;
    color: string;
  }

  let {
    segments,
    size = 180,
    thickness = 24,
    showLabels = true,
    animate = true,
  } = $props<{
    segments: Segment[];
    size?: number;
    thickness?: number;
    showLabels?: boolean;
    animate?: boolean;
  }>();

  const total = $derived(() => segments.reduce((sum: number, s: Segment) => sum + s.value, 0));
  const center = $derived(() => size / 2);
  const radius = $derived(() => (size - thickness) / 2);
  const circumference = $derived(() => 2 * Math.PI * radius());

  const sortedSegments = $derived(() => 
    [...segments].sort((a, b) => b.value - a.value)
  );

  function getStrokeDasharray(index: number): string {
    const seg = sortedSegments()[index];
    const ratio = seg.value / total();
    const dashLength = ratio * circumference();
    const gapLength = circumference() - dashLength;
    return `${dashLength} ${gapLength}`;
  }

  function getStrokeDashoffset(index: number): number {
    let offset = 0;
    for (let i = 0; i < index; i++) {
      const ratio = sortedSegments()[i].value / total();
      offset += ratio * circumference();
    }
    return -offset + circumference() * 0.25;
  }

  const centerLabel = $derived(() => {
    if (total() >= 1000) return `${(total() / 1000).toFixed(1)}k`;
    return total().toFixed(1);
  });

  let hoveredIndex: number | null = $state(null);

  function handleMouseEnter(index: number) {
    hoveredIndex = index;
  }

  function handleMouseLeave() {
    hoveredIndex = null;
  }
</script>

<div class="donut-container" style="width: {size}px; height: {size}px;">
  <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
    <circle
      cx={center()}
      cy={center()}
      r={radius()}
      fill="none"
      stroke="rgba(51, 65, 85, 0.5)"
      stroke-width={thickness}
    />

    {#each sortedSegments() as segment, i}
      <circle
        cx={center()}
        cy={center()}
        r={radius()}
        fill="none"
        stroke={segment.color}
        stroke-width={thickness}
        stroke-dasharray={getStrokeDasharray(i)}
        stroke-dashoffset={getStrokeDashoffset(i)}
        stroke-linecap="butt"
        class="segment"
        role="button"
        tabindex={0}
        style={`
          ${animate ? 'transition: stroke-dasharray 0.8s cubic-bezier(0.4, 0, 0.2, 1), stroke-dashoffset 0.8s cubic-bezier(0.4, 0, 0.2, 1);' : ''}
          transform-origin: ${center()}px ${center()}px;
          ${hoveredIndex === i ? 'transform: scale(1.02); filter: brightness(1.2);' : ''}
        `}
        on:mouseenter={() => handleMouseEnter(i)}
        on:mouseleave={handleMouseLeave}
      />
    {/each}

    <text
      x={center()}
      y={center() - 6}
      text-anchor="middle"
      dominant-baseline="middle"
      fill="#F1F5F9"
      font-size="28"
      font-weight="700"
      font-family="JetBrains Mono, monospace"
    >
      {centerLabel()}
    </text>
    <text
      x={center()}
      y={center() + 18}
      text-anchor="middle"
      dominant-baseline="middle"
      fill="#94A3B8"
      font-size="12"
    >
      总计
    </text>
  </svg>

  {#if showLabels}
    <div class="legend">
      {#each sortedSegments() as segment, i}
        <div 
          class="legend-item"
          class:hovered={hoveredIndex === i}
          on:mouseenter={() => handleMouseEnter(i)}
          on:mouseleave={handleMouseLeave}
        >
          <span class="dot" style="background: {segment.color};" />
          <span class="label">{segment.label}</span>
          <span class="value">{segment.value.toFixed(1)}</span>
          <span class="percent">
            {((segment.value / total()) * 100).toFixed(0)}%
          </span>
        </div>
      {/each}
    </div>
  {/if}
</div>

<style>
  .donut-container {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 16px;
  }

  .segment {
    cursor: pointer;
    transition: transform 0.2s ease, filter 0.2s ease;
  }

  .legend {
    display: flex;
    flex-wrap: wrap;
    gap: 8px 16px;
    justify-content: center;
    width: 100%;
  }

  .legend-item {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 4px 8px;
    border-radius: 6px;
    transition: all 0.2s ease;
    cursor: pointer;
  }

  .legend-item:hover,
  .legend-item.hovered {
    background: rgba(0, 212, 170, 0.1);
  }

  .dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
  }

  .label {
    color: #94A3B8;
    font-size: 12px;
  }

  .value {
    color: #F1F5F9;
    font-size: 12px;
    font-weight: 600;
    font-family: 'JetBrains Mono', monospace;
  }

  .percent {
    color: #00D4AA;
    font-size: 11px;
    font-weight: 500;
  }
</style>
