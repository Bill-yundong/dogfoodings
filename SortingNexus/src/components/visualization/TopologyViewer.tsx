import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { ConveyorNode, Package } from '../../types';
import { getNodeColor, getPackageColor } from '../../config/topology';

interface TopologyViewerProps {
  nodes: ConveyorNode[];
  packages: Package[];
  selectedPackageId: string | null;
  onPackageClick: (packageId: string | null) => void;
}

const nodeMap = new Map<string, ConveyorNode>();

export const TopologyViewer: React.FC<TopologyViewerProps> = ({
  nodes,
  packages,
  selectedPackageId,
  onPackageClick
}) => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || nodes.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    nodes.forEach(node => nodeMap.set(node.id, node));

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
          .attr('stroke', '#4a5568')
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

    const activePackages = packages.filter(p => p.status !== 'sorted');
    const packageGroups = svg.selectAll('.package')
      .data(activePackages)
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
    <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-xl font-semibold text-gray-300 flex items-center gap-2">
          <span>🔍</span> 传送带拓扑图
        </h2>
        <div className="flex items-center gap-6 text-sm text-gray-500">
          <Legend color="#48bb78" label="入口" />
          <Legend color="#667eea" label="交叉带" />
          <Legend color="#9f7aea" label="分拣口" />
          <Legend color="#ed8936" label="滑槽" />
          <Legend color="#f56565" label="出口" />
        </div>
      </div>
      <div className="bg-gray-900 rounded-xl p-4 overflow-hidden flex justify-center">
        <svg ref={svgRef} width="850" height="550" />
      </div>
    </div>
  );
};

const Legend: React.FC<{ color: string; label: string }> = ({ color, label }) => (
  <div className="flex items-center gap-2">
    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
    <span>{label}</span>
  </div>
);

export default TopologyViewer;
