<script>
  import { onMount, onDestroy } from 'svelte';
  import * as d3 from 'd3';

  export let value;
  export let max = 100;
  export let min = 0;
  export let label = '效率';
  export let unit = '%';
  export let thresholds = { warning: 85, danger: 75 };

  let container;
  let svg;
  let width = 240;
  let height = 140;

  $: percentage = ((value - min) / (max - min)) * 100;
  $: color = value >= thresholds.warning ? '#10b981' : value >= thresholds.danger ? '#f59e0b' : '#ef4444';

  function render() {
    if (!container) return;
    d3.select(container).selectAll('*').remove();
    svg = d3.select(container)
      .append('svg')
      .attr('width', width)
      .attr('height', height)
      .attr('viewBox', `0 0 ${width} ${height}`);
    const centerX = width / 2;
    const centerY = height * 0.75;
    const radius = Math.min(width, height * 1.5) / 2 - 20;
    const startAngle = Math.PI * 0.75;
    const endAngle = Math.PI * 2.25;
    const arcAngle = startAngle + (percentage / 100) * (endAngle - startAngle);
    const bgArc = d3.arc()
      .innerRadius(radius - 15)
      .outerRadius(radius)
      .startAngle(startAngle)
      .endAngle(endAngle);
    svg.append('path')
      .attr('d', bgArc)
      .attr('fill', '#1e293b')
      .attr('transform', `translate(${centerX}, ${centerY})`);
    const valueArc = d3.arc()
      .innerRadius(radius - 15)
      .outerRadius(radius)
      .startAngle(startAngle)
      .endAngle(arcAngle);
    const gradient = svg.append('defs')
      .append('linearGradient')
      .attr('id', 'gauge-gradient')
      .attr('x1', '0%')
      .attr('y1', '0%')
      .attr('x2', '100%')
      .attr('y2', '0%');
    gradient.append('stop').attr('offset', '0%').attr('stop-color', color).attr('stop-opacity', 0.8);
    gradient.append('stop').attr('offset', '100%').attr('stop-color', color);
    svg.append('path')
      .attr('d', valueArc)
      .attr('fill', 'url(#gauge-gradient)')
      .attr('transform', `translate(${centerX}, ${centerY})`)
      .attr('filter', 'drop-shadow(0 0 8px ' + color + ')');
    const tickCount = 11;
    for (let i = 0; i < tickCount; i++) {
      const tickAngle = startAngle + (i / (tickCount - 1)) * (endAngle - startAngle);
      const innerR = radius - 22;
      const outerR = i % 2 === 0 ? radius - 18 : radius - 20;
      const x1 = centerX + innerR * Math.cos(tickAngle);
      const y1 = centerY + innerR * Math.sin(tickAngle);
      const x2 = centerX + outerR * Math.cos(tickAngle);
      const y2 = centerY + outerR * Math.sin(tickAngle);
      svg.append('line')
        .attr('x1', x1)
        .attr('y1', y1)
        .attr('x2', x2)
        .attr('y2', y2)
        .attr('stroke', '#475569')
        .attr('stroke-width', i % 2 === 0 ? 2 : 1);
    }
    svg.append('text')
      .attr('x', centerX)
      .attr('y', centerY - 10)
      .attr('text-anchor', 'middle')
      .attr('fill', color)
      .style('font-size', '32px')
      .style('font-weight', 'bold')
      .style('font-variant-numeric', 'tabular-nums')
      .text(value.toFixed(1));
    svg.append('text')
      .attr('x', centerX)
      .attr('y', centerY + 15)
      .attr('text-anchor', 'middle')
      .attr('fill', '#64748b')
      .style('font-size', '14px')
      .text(`${label} (${unit})`);
    [
      { value: min, label: min },
      { value: (min + max) / 2, label: (min + max) / 2 },
      { value: max, label: max }
    ].forEach((tick, i) => {
      const angle = startAngle + (i / 2) * (endAngle - startAngle);
      const r = radius + 10;
      const x = centerX + r * Math.cos(angle);
      const y = centerY + r * Math.sin(angle);
      svg.append('text')
        .attr('x', x)
        .attr('y', y)
        .attr('text-anchor', 'middle')
        .attr('fill', '#64748b')
        .style('font-size', '10px')
        .text(tick.label);
    });
  }

  $: if (svg) render();

  onMount(() => {
    render();
  });
</script>

<div bind:this={container} class="gauge-container"></div>

<style>
  .gauge-container {
    display: flex;
    justify-content: center;
    align-items: center;
  }
</style>
