import React, { useRef, useEffect } from 'react';
import * as d3 from 'd3';
import { TidalData, GeoLocation } from '../types/tidal';
import { calculateVectorComponents } from '../utils/tidalMath';

interface VectorFieldProps {
  tidalData: TidalData[];
  centerLocation: GeoLocation;
  width?: number;
  height?: number;
}

export const VectorField: React.FC<VectorFieldProps> = ({
  tidalData,
  centerLocation,
  width = 400,
  height = 300,
}) => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || tidalData.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const margin = { top: 20, right: 20, bottom: 20, left: 20 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const g = svg
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    const gridSize = 20;
    const cols = Math.floor(innerWidth / gridSize);
    const rows = Math.floor(innerHeight / gridSize);

    const currentDataIndex = Math.floor(tidalData.length / 2);
    const currentData = tidalData[currentDataIndex];

    const velocityScale = d3
      .scaleLinear()
      .domain([0, d3.max(tidalData, (d) => d.velocity.magnitude) || 5])
      .range([0, gridSize * 0.8]);

    const colorScale = d3
      .scaleSequential(d3.interpolateViridis)
      .domain([0, d3.max(tidalData, (d) => d.velocity.magnitude) || 5]);

    for (let i = 0; i < rows; i++) {
      for (let j = 0; j < cols; j++) {
        const x = j * gridSize + gridSize / 2;
        const y = i * gridSize + gridSize / 2;

        const distFromCenter = Math.sqrt(
          Math.pow(j - cols / 2, 2) + Math.pow(i - rows / 2, 2)
        );
        const spatialFactor = Math.exp(-distFromCenter / Math.max(cols, rows) * 0.5);
        const magnitude = currentData.velocity.magnitude * spatialFactor;

        const { u, v } = calculateVectorComponents(
          magnitude,
          currentData.velocity.direction
        );

        const arrowLength = velocityScale(magnitude);

        const angle = Math.atan2(v, u);
        const endX = x + Math.cos(angle) * arrowLength;
        const endY = y + Math.sin(angle) * arrowLength;

        g.append('line')
          .attr('x1', x)
          .attr('y1', y)
          .attr('x2', endX)
          .attr('y2', endY)
          .attr('stroke', colorScale(magnitude))
          .attr('stroke-width', 2)
          .attr('marker-end', 'url(#arrowhead)');

        g.append('circle')
          .attr('cx', x)
          .attr('cy', y)
          .attr('r', 3)
          .attr('fill', colorScale(magnitude));
      }
    }

    g.append('defs')
      .append('marker')
      .attr('id', 'arrowhead')
      .attr('markerWidth', 10)
      .attr('markerHeight', 7)
      .attr('refX', 9)
      .attr('refY', 3.5)
      .attr('orient', 'auto')
      .append('polygon')
      .attr('points', '0 0, 10 3.5, 0 7')
      .attr('fill', '#666');

    const legendWidth = 20;
    const legendHeight = 100;
    const legendX = innerWidth - 30;
    const legendY = 20;

    const legendScale = d3
      .scaleLinear()
      .domain([0, d3.max(tidalData, (d) => d.velocity.magnitude) || 5])
      .range([legendHeight, 0]);

    const legend = g.append('g')
      .attr('transform', `translate(${legendX},${legendY})`);

    const legendGradient = svg.append('defs')
      .append('linearGradient')
      .attr('id', 'legend-gradient')
      .attr('x1', '0%')
      .attr('y1', '100%')
      .attr('x2', '0%')
      .attr('y2', '0%');

    for (let i = 0; i <= 10; i++) {
      const offset = i * 10;
      const value = (d3.max(tidalData, (d) => d.velocity.magnitude) || 5) * (i / 10);
      legendGradient.append('stop')
        .attr('offset', `${offset}%`)
        .attr('stop-color', colorScale(value));
    }

    legend.append('rect')
      .attr('width', legendWidth)
      .attr('height', legendHeight)
      .style('fill', 'url(#legend-gradient)');

    legend.append('g')
      .attr('transform', `translate(${legendWidth}, 0)`)
      .call(d3.axisRight(legendScale).ticks(5).tickFormat((d) => `${Number(d).toFixed(1)}`))
      .selectAll('text')
      .style('font-size', '10px');

    legend.append('text')
      .attr('x', legendWidth / 2)
      .attr('y', -5)
      .attr('text-anchor', 'middle')
      .style('font-size', '10px')
      .text('m/s');
  }, [tidalData, width, height]);

  return (
    <div className="bg-white rounded-lg shadow-md p-4">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">潮流流速矢量场</h3>
      <svg ref={svgRef} width={width} height={height} className="mx-auto" />
      <div className="mt-2 text-sm text-gray-500 text-center">
        位置: {centerLocation.latitude.toFixed(4)}°N, {centerLocation.longitude.toFixed(4)}°E
      </div>
    </div>
  );
};