import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { ConveyorNode, Package } from '../types/core';
import { getNodeColor, getPackageColor } from '../config/topology';

interface TopologyVisualizerProps {
  nodes: ConveyorNode[];
  packages: Package[];
  selectedPackageId: string | null;
  onPackageClick: (packageId: string | null) => void;
}

export const TopologyVisualizer: React.FC<TopologyVisualizerProps> = ({
  nodes,
  packages,
  selectedPackageId,
  onPackageClick
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!svgRef.current || nodes.length === 0) return;

    const width = containerRef.current?.clientWidth || 800;
    const height = 550;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();
    svg.attr('width', width).attr('height', height);

    const defs = svg.append('defs');
    
    const conveyorGradient = defs.append('linearGradient')
      .attr('id', 'conveyorGradient')
      .attr('x1', '0%').attr('y1', '0%')
      .attr('x2', '100%').attr('y2', '0%');
    conveyorGradient.append('stop').attr('offset', '0%').attr('stop-color', '#4a5568');
    conveyorGradient.append('stop').attr('offset', '50%').attr('stop-color', '#718096');
    conveyorGradient.append('stop').attr('offset', '100%').attr('stop-color', '#4a5568');

    const nodeMap = new Map(nodes.map(n => [n.id, n]));

    nodes.forEach(node => {
      node.neighbors.forEach(neighborId => {
        const neighbor = nodeMap.get(neighborId);
        if (!neighbor) return;

        const dx = neighbor.x - node.x;
        const dy = neighbor.y - node.y;
        const offset = 12;
        const perpX = -dy / Math.sqrt(dx * dx + dy * dy) * offset;
        const perpY = dx / Math.sqrt(dx * dx + dy * dy) * offset;

        svg.append('line')
          .attr('x1', node.x + perpX).attr('y1', node.y + perpY)
          .attr('x2', neighbor.x + perpX).attr('y2', neighbor.y + perpY)
          .attr('stroke', 'url(#conveyorGradient)')
          .attr('stroke-width', 16)
          .attr('stroke-linecap', 'round');
      });
    });

    const nodeGroups = svg.selectAll('.node')
      .data(nodes)
      .enter()
      .append('g')
      .attr('class', 'node')
      .attr('transform', d => `translate(${d.x}, ${d.y})`);

    nodeGroups.append('circle')
      .attr('r', 24)
      .attr('fill', d => getNodeColor(d.type, d.isActive))
      .attr('stroke', '#2d3748')
      .attr('stroke-width', 3);

    nodeGroups.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', 5)
      .attr('fill', 'white')
      .attr('font-size', '10px')
      .attr('font-weight', 'bold')
      .text(d => d.name.slice(0, 6));

    const packageGroups = svg.selectAll('.package')
      .data(packages.filter(p => p.status !== 'sorted'))
      .enter()
      .append('g')
      .attr('class', 'package')
      .attr('transform', d => {
        const node = nodeMap.get(d.currentPosition);
        if (!node) return 'translate(-100, -100)';
        const jitterX = (Math.random() - 0.5) * 20;
        const jitterY = (Math.random() - 0.5) * 20;
        return `translate(${node.x + jitterX}, ${node.y + jitterY})`;
      })
      .style('cursor', 'pointer')
      .on('click', (event, d) => {
        event.stopPropagation();
        onPackageClick(selectedPackageId === d.id ? null : d.id);
      });

    packageGroups.append('rect')
      .attr('x', -12).attr('y', -10)
      .attr('width', 24).attr('height', 20)
      .attr('rx', 4)
      .attr('fill', d => getPackageColor(d.status))
      .attr('stroke', d => selectedPackageId === d.id ? '#fbbf24' : '#2d3748')
      .attr('stroke-width', d => selectedPackageId === d.id ? 3 : 1.5);

    packageGroups.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', 4)
      .attr('fill', '#1a202c')
      .attr('font-size', '8px')
      .attr('font-weight', 'bold')
      .text(d => d.destination.slice(0, 2));

    svg.on('click', () => onPackageClick(null));

  }, [nodes, packages, selectedPackageId, onPackageClick]);

  return (
    <div ref={containerRef} className="bg-gray-900 rounded-lg p-4 overflow-hidden">
      <svg ref={svgRef} className="w-full" />
    </div>
  );
};

export default TopologyVisualizer;
