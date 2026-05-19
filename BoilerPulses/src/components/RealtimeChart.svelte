<script>
  import { onMount, onDestroy } from 'svelte';
  import * as d3 from 'd3';

  export let data = [];
  export let color = '#3b82f6';
  export let yLabel = 'Value';
  export let yMin = null;
  export let yMax = null;
  export let height = 200;
  export let showArea = true;

  let container;
  let svg;
  let width = 0;
  let resizeObserver;

  const margin = { top: 10, right: 20, bottom: 30, left: 50 };

  function render() {
    if (!container || data.length === 0) return;
    width = container.clientWidth;
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;
    d3.select(container).selectAll('*').remove();
    svg = d3.select(container)
      .append('svg')
      .attr('width', width)
      .attr('height', height);
    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);
    const xExtent = d3.extent(data, d => d.timestamp);
    const xScale = d3.scaleTime()
      .domain(xExtent)
      .range([0, innerWidth]);
    const values = data.map(d => d.value);
    const actualYMin = yMin !== null ? yMin : Math.min(...values) * 0.95;
    const actualYMax = yMax !== null ? yMax : Math.max(...values) * 1.05;
    const yScale = d3.scaleLinear()
      .domain([actualYMin, actualYMax])
      .range([innerHeight, 0]);
    const xAxis = d3.axisBottom(xScale)
      .ticks(5)
      .tickFormat(d3.timeFormat('%H:%M:%S'));
    const yAxis = d3.axisLeft(yScale).ticks(5);
    g.append('g')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(xAxis)
      .selectAll('text')
      .attr('fill', '#64748b')
      .style('font-size', '10px');
    g.append('g')
      .call(yAxis)
      .selectAll('text')
      .attr('fill', '#64748b')
      .style('font-size', '10px');
    g.selectAll('.domain, .tick line')
      .attr('stroke', '#334155');
    const grid = g.append('g').attr('class', 'grid');
    yScale.ticks(5).forEach(tick => {
      grid.append('line')
        .attr('x1', 0)
        .attr('x2', innerWidth)
        .attr('y1', yScale(tick))
        .attr('y2', yScale(tick))
        .attr('stroke', '#1e293b')
        .attr('stroke-dasharray', '2,2');
    });
    const line = d3.line()
      .x(d => xScale(d.timestamp))
      .y(d => yScale(d.value))
      .curve(d3.curveMonotoneX);
    if (showArea) {
      const area = d3.area()
        .x(d => xScale(d.timestamp))
        .y0(innerHeight)
        .y1(d => yScale(d.value))
        .curve(d3.curveMonotoneX);
      const gradient = svg.append('defs')
        .append('linearGradient')
        .attr('id', `gradient-${Math.random().toString(36).substr(2, 9)}`)
        .attr('x1', '0%')
        .attr('y1', '0%')
        .attr('x2', '0%')
        .attr('y2', '100%');
      gradient.append('stop').attr('offset', '0%').attr('stop-color', color).attr('stop-opacity', 0.3);
      gradient.append('stop').attr('offset', '100%').attr('stop-color', color).attr('stop-opacity', 0);
      g.append('path')
        .datum(data)
        .attr('fill', `url(#${gradient.attr('id')})`)
        .attr('d', area);
    }
    g.append('path')
      .datum(data)
      .attr('fill', 'none')
      .attr('stroke', color)
      .attr('stroke-width', 2)
      .attr('d', line);
    if (data.length > 0) {
      const lastPoint = data[data.length - 1];
      g.append('circle')
        .attr('cx', xScale(lastPoint.timestamp))
        .attr('cy', yScale(lastPoint.value))
        .attr('r', 4)
        .attr('fill', color)
        .attr('stroke', '#fff')
        .attr('stroke-width', 2);
    }
    g.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('y', -40)
      .attr('x', -innerHeight / 2)
      .attr('text-anchor', 'middle')
      .attr('fill', '#64748b')
      .style('font-size', '11px')
      .text(yLabel);
  }

  $: if (svg) render();

  onMount(() => {
    render();
    resizeObserver = new ResizeObserver(() => {
      render();
    });
    resizeObserver.observe(container);
  });

  onDestroy(() => {
    if (resizeObserver) {
      resizeObserver.disconnect();
    }
  });
</script>

<div bind:this={container} class="chart-container w-full"></div>

<style>
  .chart-container {
    min-height: 200px;
  }
</style>
