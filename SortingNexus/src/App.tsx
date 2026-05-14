import React, { useState, useEffect, useRef, useCallback } from 'react';
import * as d3 from 'd3';
import { SortingEngine } from './engine/SortingEngine';
import { Package, ConveyorNode, ErrorEvent, PerformanceMetrics, PLCStatus } from './core/types';
import { getNodeColor, getPackageColor } from './core/topology';

const App: React.FC = () => {
  const engineRef = useRef<SortingEngine | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [selectedPackageId, setSelectedPackageId] = useState<string | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const [state, setState] = useState<{
    packages: Package[];
    nodes: ConveyorNode[];
    metrics: PerformanceMetrics;
    errors: ErrorEvent[];
    plcStatus: PLCStatus[];
    isRunning: boolean;
    averageLatency: number;
  }>({
    packages: [],
    nodes: [],
    metrics: { throughput: 0, averageSortTime: 0, errorRate: 0, utilizationRate: 0, totalPackages: 0, sortedPackages: 0 },
    errors: [],
    plcStatus: [],
    isRunning: false,
    averageLatency: 0
  });

  useEffect(() => {
    const engine = new SortingEngine();
    engineRef.current = engine;

    engine.setStateChangeHandler(() => {
      setState({
        packages: engine.getPackages(),
        nodes: engine.getNodes(),
        metrics: engine.getMetrics(),
        errors: engine.getErrors(),
        plcStatus: engine.getPlcStatus(),
        isRunning: engine.getIsRunning(),
        averageLatency: engine.getAverageLatency()
      });
    });

    setState(prev => ({
      ...prev,
      nodes: engine.getNodes(),
      plcStatus: engine.getPlcStatus()
    }));

    setIsInitialized(true);

    return () => engine.destroy();
  }, []);

  const handleStart = useCallback(() => engineRef.current?.start(), []);
  const handleStop = useCallback(() => engineRef.current?.stop(), []);
  const handleReset = useCallback(() => engineRef.current?.reset(), []);

  useEffect(() => {
    if (!svgRef.current || state.nodes.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const nodeMap = new Map(state.nodes.map(n => [n.id, n]));

    state.nodes.forEach(node => {
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
      .data(state.nodes)
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
      .data(state.packages.filter(p => p.status !== 'sorted'))
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
        setSelectedPackageId(prev => prev === d.id ? null : d.id);
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

    svg.on('click', () => setSelectedPackageId(null));
  }, [state.nodes, state.packages, selectedPackageId]);

  const selectedPackage = state.packages.find(p => p.id === selectedPackageId) || null;
  const unresolvedErrors = state.errors.filter(e => !e.resolved);

  if (!isInitialized) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4 animate-spin">⚙️</div>
          <h2 className="text-xl text-gray-400">系统初始化中...</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <header className="bg-gray-800 border-b border-gray-700 px-8 py-5">
        <div className="flex items-center justify-between max-w-full">
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 via-cyan-400 to-purple-400 bg-clip-text text-transparent">
              📦 SortingNexus - 智能快递分拣系统
            </h1>
            <p className="text-gray-500 mt-1 text-sm">WCS-PLC 毫秒级对齐 · 异步 Dijkstra 路径规划 · IndexedDB 快照缓存</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={state.isRunning ? handleStop : handleStart}
              className={`px-6 py-2.5 rounded-xl font-semibold transition-all transform hover:scale-105 flex items-center gap-2 ${
                state.isRunning
                  ? 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 shadow-lg shadow-red-500/30'
                  : 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 shadow-lg shadow-green-500/30'
              }`}
            >
              {state.isRunning ? '⏹️ 停止' : '▶️ 开始'}
            </button>
            <button
              onClick={handleReset}
              className="px-6 py-2.5 rounded-xl font-semibold bg-gray-700 hover:bg-gray-600 transition-all transform hover:scale-105 border border-gray-600"
            >
              🔄 重置
            </button>
          </div>
        </div>
      </header>

      <div className="flex">
        <aside className="w-80 bg-gray-800 border-r border-gray-700 p-5 min-h-screen">
          <h2 className="text-lg font-semibold text-gray-300 mb-5 flex items-center gap-2">
            <span>📊</span> 性能指标
          </h2>
          
          <div className="space-y-3">
            <MetricCard icon="📦" label="总包裹数" value={String(state.metrics.totalPackages)} color="blue" />
            <MetricCard icon="✅" label="已分拣" value={String(state.metrics.sortedPackages)} color="green" />
            <MetricCard icon="⚡" label="分拣效率" value={`${state.metrics.throughput.toFixed(1)}/s`} color="yellow" />
            <MetricCard icon="📈" label="设备利用率" value={`${(state.metrics.utilizationRate * 100).toFixed(0)}%`} color="purple" />
            <MetricCard icon="⏱️" label="平均延迟" value={`${state.averageLatency.toFixed(0)}ms`} color="cyan" />
            <MetricCard icon="⚠️" label="错误率" value={`${(state.metrics.errorRate * 100).toFixed(1)}%`} color={state.metrics.errorRate > 0.1 ? 'red' : 'gray'} />
          </div>

          <h2 className="text-lg font-semibold text-gray-300 mt-8 mb-4 flex items-center gap-2">
            <span>🔧</span> PLC 设备状态
          </h2>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {state.plcStatus.slice(0, 8).map(status => {
              const node = state.nodes.find(n => n.id === status.nodeId);
              return (
                <div key={status.nodeId} className="flex items-center justify-between bg-gray-700/50 rounded-lg px-3 py-2.5">
                  <span className="text-sm font-medium">{node?.name || status.nodeId}</span>
                  <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                    status.isRunning ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                  }`}>
                    {status.isRunning ? '运行中' : '停止'}
                  </span>
                </div>
              );
            })}
          </div>
        </aside>

        <main className="flex-1 p-6">
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

          <div className="grid grid-cols-3 gap-5 mt-6">
            <FeatureCard icon="🧭" title="异步 Dijkstra 算法" description="动态最优路径规划，实时考虑节点负载和包裹优先级" color="blue" />
            <FeatureCard icon="⚡" title="WCS-PLC 毫秒级对齐" description="实时指令同步与状态验证，确保分拣精度" color="cyan" />
            <FeatureCard icon="💾" title="IndexedDB 快照缓存" description="自动持久化系统状态，支持异常回溯与快速恢复" color="purple" />
          </div>
        </main>

        <aside className="w-96 bg-gray-800 border-l border-gray-700 p-5 min-h-screen">
          <h2 className="text-lg font-semibold text-gray-300 mb-4 flex items-center gap-2">
            <span>📋</span> 包裹详情
          </h2>
          
          {selectedPackage ? (
            <div className="bg-gray-700/50 rounded-xl p-4 space-y-4">
              <InfoRow label="条码" value={selectedPackage.barcode} mono />
              <InfoRow label="目的地" value={selectedPackage.destination} />
              <InfoRow label="状态" value={
                <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                  selectedPackage.status === 'sorted' ? 'bg-green-500/20 text-green-400' :
                  selectedPackage.status === 'sorting' ? 'bg-blue-500/20 text-blue-400' :
                  'bg-gray-500/20 text-gray-400'
                }`}>
                  {selectedPackage.status === 'sorted' ? '已分拣' :
                   selectedPackage.status === 'sorting' ? '分拣中' : '待处理'}
                </span>
              } />
              <InfoRow label="当前位置" value={selectedPackage.currentPosition} />
              <InfoRow label="重量" value={`${selectedPackage.weight.toFixed(2)} kg`} />
              <InfoRow label="体积" value={`${selectedPackage.volume.toFixed(3)} m³`} />
              <InfoRow label="优先级" value={'⭐'.repeat(selectedPackage.priority + 1)} />
              
              {selectedPackage.assignedPath.length > 0 && (
                <div>
                  <div className="text-gray-500 text-xs mb-2">分拣路径</div>
                  <div className="flex flex-wrap items-center gap-1">
                    {selectedPackage.assignedPath.map((node, index) => (
                      <React.Fragment key={node}>
                        <span className={`px-2 py-1 rounded text-xs ${
                          node === selectedPackage.currentPosition 
                            ? 'bg-blue-500 text-white font-bold' 
                            : 'bg-gray-600 text-gray-300'
                        }`}>
                          {node}
                        </span>
                        {index < selectedPackage.assignedPath.length - 1 && (
                          <span className="text-gray-600">→</span>
                        )}
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center text-gray-500 py-12 bg-gray-700/30 rounded-xl">
              <span className="text-4xl block mb-3">👆</span>
              <p className="text-sm">点击拓扑图中的包裹查看详情</p>
            </div>
          )}

          <h2 className="text-lg font-semibold text-gray-300 mt-8 mb-4 flex items-center gap-2">
            <span>🚨</span> 异常日志
            {unresolvedErrors.length > 0 && (
              <span className="ml-auto text-sm bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full">
                {unresolvedErrors.length} 待处理
              </span>
            )}
          </h2>
          
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {state.errors.length === 0 ? (
              <div className="text-center text-gray-500 py-8 bg-gray-700/30 rounded-xl">
                <span className="text-4xl block mb-2">✅</span>
                系统运行正常
              </div>
            ) : (
              state.errors.slice(-10).reverse().map(error => (
                <div
                  key={error.id}
                  className={`rounded-xl px-3 py-3 text-sm ${
                    error.severity === 'critical' ? 'bg-red-500/10 border border-red-500/30' :
                    error.severity === 'high' ? 'bg-orange-500/10 border border-orange-500/30' :
                    error.severity === 'medium' ? 'bg-yellow-500/10 border border-yellow-500/30' :
                    'bg-blue-500/10 border border-blue-500/30'
                  } ${error.resolved ? 'opacity-50' : ''}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className={`font-semibold ${
                      error.severity === 'critical' ? 'text-red-400' :
                      error.severity === 'high' ? 'text-orange-400' :
                      error.severity === 'medium' ? 'text-yellow-400' :
                      'text-blue-400'
                    }`}>[{error.type}]</span>
                    <span className="text-xs text-gray-500 whitespace-nowrap">
                      {new Date(error.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <p className="mt-1.5 text-gray-300 text-xs">{error.message}</p>
                  {error.resolved && <p className="mt-1 text-green-400 text-xs italic">✓ 已解决</p>}
                </div>
              ))
            )}
          </div>
        </aside>
      </div>
    </div>
  );
};

const MetricCard: React.FC<{ icon: string; label: string; value: string; color: string }> = ({ icon, label, value, color }) => {
  const colorClasses: Record<string, string> = {
    blue: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    green: 'bg-green-500/10 text-green-400 border-green-500/20',
    yellow: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
    purple: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    cyan: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
    red: 'bg-red-500/10 text-red-400 border-red-500/20',
    gray: 'bg-gray-500/10 text-gray-400 border-gray-500/20'
  };

  return (
    <div className={`rounded-xl p-4 border ${colorClasses[color] || colorClasses.gray} transition-all hover:scale-[1.02]`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xl">{icon}</span>
        <span className="text-gray-500 text-xs">{label}</span>
      </div>
      <div className={`text-2xl font-bold`}>{value}</div>
    </div>
  );
};

const Legend: React.FC<{ color: string; label: string }> = ({ color, label }) => (
  <div className="flex items-center gap-2">
    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
    <span>{label}</span>
  </div>
);

const FeatureCard: React.FC<{ icon: string; title: string; description: string; color: string }> = ({ icon, title, description, color }) => {
  const colorClasses: Record<string, string> = {
    blue: 'border-blue-500/30 hover:border-blue-500/50',
    cyan: 'border-cyan-500/30 hover:border-cyan-500/50',
    purple: 'border-purple-500/30 hover:border-purple-500/50'
  };

  return (
    <div className={`bg-gray-800 rounded-xl p-5 border ${colorClasses[color] || colorClasses.blue} transition-all hover:bg-gray-750`}>
      <span className="text-3xl block mb-3">{icon}</span>
      <h3 className={`font-semibold mb-2 text-${color}-400`}>{title}</h3>
      <p className="text-gray-500 text-sm leading-relaxed">{description}</p>
    </div>
  );
};

const InfoRow: React.FC<{ label: string; value: React.ReactNode; mono?: boolean }> = ({ label, value, mono }) => (
  <div className="flex justify-between items-center py-2 border-b border-gray-600/50 last:border-0">
    <span className="text-gray-500 text-xs">{label}</span>
    <span className={`text-sm ${mono ? 'font-mono' : ''} text-gray-200`}>{value}</span>
  </div>
);

export default App;
