import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as d3 from 'd3';
import { Package, ConveyorNode, WCSCommand, PerformanceMetrics, PLCStatus } from '../types';
import AsyncDijkstraPlanner from '../engine/PathPlanner';
import WCSPLCAligner from '../alignment/WCSPLCAligner';
import SnapshotStore from '../cache/SnapshotStore';
import ErrorHandler, { ErrorEvent } from '../engine/ErrorHandler';
import { v4 as uuidv4 } from 'uuid';

const SortingDashboard: React.FC = () => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [packages, setPackages] = useState<Package[]>([]);
  const [nodes, setNodes] = useState<ConveyorNode[]>([]);
  const [commands, setCommands] = useState<WCSCommand[]>([]);
  const [plcStatusList, setPlcStatusList] = useState<PLCStatus[]>([]);
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    throughput: 0,
    averageSortTime: 0,
    errorRate: 0,
    utilizationRate: 0,
    totalPackages: 0,
    sortedPackages: 0
  });
  const [errors, setErrors] = useState<ErrorEvent[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<string | null>(null);

  const plannerRef = useRef(new AsyncDijkstraPlanner());
  const alignerRef = useRef(new WCSPLCAligner());
  const storeRef = useRef(new SnapshotStore());
  const errorHandlerRef = useRef(new ErrorHandler());
  const animationRef = useRef<number>();
  const nodeMapRef = useRef<Map<string, ConveyorNode>>(new Map());
  const destinationMapRef = useRef<Map<string, string>>(new Map());

  useEffect(() => {
    const init = async () => {
      await storeRef.current.init();
      initializeConveyorSystem();
    };
    init();

    errorHandlerRef.current.setEventHandlers(
      (error) => setErrors(prev => [...prev, error]),
      (error) => console.log('Recovered:', error)
    );
  }, []);

  const initializeConveyorSystem = useCallback(() => {
    const conveyorNodes: ConveyorNode[] = [
      { id: 'ENTRY_1', name: '入口1', type: 'entry', x: 50, y: 200, neighbors: ['CB_1'], capacity: 20, currentLoad: 0, isActive: true },
      { id: 'ENTRY_2', name: '入口2', type: 'entry', x: 50, y: 350, neighbors: ['CB_2'], capacity: 20, currentLoad: 0, isActive: true },
      { id: 'CB_1', name: '交叉带1', type: 'cross-belt', x: 150, y: 150, neighbors: ['CB_2', 'JUNCTION_1'], capacity: 30, currentLoad: 0, isActive: true },
      { id: 'CB_2', name: '交叉带2', type: 'cross-belt', x: 150, y: 400, neighbors: ['CB_1', 'JUNCTION_2'], capacity: 30, currentLoad: 0, isActive: true },
      { id: 'JUNCTION_1', name: '分拣口1', type: 'junction', x: 300, y: 150, neighbors: ['CHUTE_A', 'CHUTE_B', 'CB_3'], capacity: 15, currentLoad: 0, isActive: true },
      { id: 'JUNCTION_2', name: '分拣口2', type: 'junction', x: 300, y: 400, neighbors: ['CHUTE_C', 'CHUTE_D', 'CB_3'], capacity: 15, currentLoad: 0, isActive: true },
      { id: 'CB_3', name: '交叉带3', type: 'cross-belt', x: 450, y: 275, neighbors: ['JUNCTION_1', 'JUNCTION_2', 'EXIT'], capacity: 40, currentLoad: 0, isActive: true },
      { id: 'CHUTE_A', name: '滑槽A-北京', type: 'chute', x: 450, y: 80, neighbors: [], capacity: 50, currentLoad: 0, isActive: true },
      { id: 'CHUTE_B', name: '滑槽B-上海', type: 'chute', x: 450, y: 160, neighbors: [], capacity: 50, currentLoad: 0, isActive: true },
      { id: 'CHUTE_C', name: '滑槽C-广州', type: 'chute', x: 450, y: 390, neighbors: [], capacity: 50, currentLoad: 0, isActive: true },
      { id: 'CHUTE_D', name: '滑槽D-深圳', type: 'chute', x: 450, y: 470, neighbors: [], capacity: 50, currentLoad: 0, isActive: true },
      { id: 'EXIT', name: '出口', type: 'exit', x: 600, y: 275, neighbors: [], capacity: 100, currentLoad: 0, isActive: true },
      { id: 'RECOVERY_CHUTE', name: '回收滑槽', type: 'chute', x: 600, y: 450, neighbors: [], capacity: 30, currentLoad: 0, isActive: true },
    ];

    const destinations = new Map<string, string>();
    destinations.set('北京', 'CHUTE_A');
    destinations.set('上海', 'CHUTE_B');
    destinations.set('广州', 'CHUTE_C');
    destinations.set('深圳', 'CHUTE_D');
    destinations.set('默认', 'EXIT');

    const nodeMap = new Map<string, ConveyorNode>();
    conveyorNodes.forEach(node => nodeMap.set(node.id, node));

    const initialPlcStatus: PLCStatus[] = conveyorNodes.map(node => ({
      nodeId: node.id,
      isRunning: node.isActive,
      currentSpeed: 1.0,
      packageCount: 0,
      lastUpdate: Date.now()
    }));

    setNodes(conveyorNodes);
    setPlcStatusList(initialPlcStatus);
    nodeMapRef.current = nodeMap;
    destinationMapRef.current = destinations;
    plannerRef.current.updateNodes(conveyorNodes);
  }, []);

  const generatePackage = useCallback((): Package => {
    const destinations = ['北京', '上海', '广州', '深圳'];
    const entryNodes = ['ENTRY_1', 'ENTRY_2'];
    const destination = destinations[Math.floor(Math.random() * destinations.length)];
    const entryNode = entryNodes[Math.floor(Math.random() * entryNodes.length)];

    return {
      id: uuidv4(),
      barcode: `BC${Date.now()}${Math.floor(Math.random() * 1000)}`,
      destination,
      weight: Math.random() * 10 + 0.5,
      volume: Math.random() * 0.1 + 0.01,
      entryTime: Date.now(),
      priority: Math.floor(Math.random() * 3),
      status: 'pending',
      currentPosition: entryNode,
      assignedPath: [],
      actualPath: [entryNode]
    };
  }, []);

  const processPackage = useCallback(async (pkg: Package) => {
    const targetNode = destinationMapRef.current.get(pkg.destination) || 'EXIT';
    const path = await plannerRef.current.findOptimalPath(pkg.currentPosition, targetNode, pkg);

    if (!path) {
      errorHandlerRef.current.reportError('PATH_NOT_FOUND', `No path found for package ${pkg.id}`, 'high', { packageId: pkg.id });
      return;
    }

    setPackages(prev => prev.map(p => 
      p.id === pkg.id ? { ...p, assignedPath: path.nodes, status: 'sorting' as const } : p
    ));

    const command = alignerRef.current.createCommand(pkg.id, 'route', path.nodes[1] || targetNode);
    alignerRef.current.enqueueCommand(command);
    setCommands(prev => [...prev, command]);
  }, []);

  const movePackages = useCallback(() => {
    setPackages(prev => {
      return prev.map(pkg => {
        if (pkg.status !== 'sorting' || pkg.assignedPath.length === 0) return pkg;

        const currentIndex = pkg.assignedPath.indexOf(pkg.currentPosition);
        if (currentIndex === -1 || currentIndex >= pkg.assignedPath.length - 1) {
          return { ...pkg, status: 'sorted' as const };
        }

        const nextPosition = pkg.assignedPath[currentIndex + 1];
        const alignment = alignerRef.current.verifyAlignment(pkg.id, nextPosition);

        if (!alignment.isAligned && Math.random() < 0.05) {
          const recoveryCmd = alignerRef.current.handleMisalignment(pkg.id, pkg.assignedPath);
          if (recoveryCmd) {
            alignerRef.current.enqueueCommand(recoveryCmd);
            setCommands(c => [...c, recoveryCmd]);
          }
          return pkg;
        }

        alignerRef.current.updatePackagePosition(pkg.id, nextPosition, Date.now());

        if (nextPosition.startsWith('CHUTE_') || nextPosition === 'EXIT') {
          return {
            ...pkg,
            currentPosition: nextPosition,
            actualPath: [...pkg.actualPath, nextPosition],
            status: 'sorted' as const
          };
        }

        return {
          ...pkg,
          currentPosition: nextPosition,
          actualPath: [...pkg.actualPath, nextPosition]
        };
      });
    });
  }, []);

  const updateMetrics = useCallback(() => {
    setPackages(currentPackages => {
      const total = currentPackages.length;
      const sorted = currentPackages.filter(p => p.status === 'sorted').length;
      const sorting = currentPackages.filter(p => p.status === 'sorting').length;
      const errorPackages = currentPackages.filter(p => p.status === 'error').length;
      const utilization = plannerRef.current.getUtilizationRate();
      const avgTime = sorting > 0 ? 1500 : 0;

      setMetrics({
        throughput: sorted / Math.max((Date.now() - (currentPackages[0]?.entryTime || Date.now())) / 1000, 1),
        averageSortTime: avgTime,
        errorRate: total > 0 ? errorPackages / total : 0,
        utilizationRate: utilization,
        totalPackages: total,
        sortedPackages: sorted
      });

      return currentPackages;
    });
  }, []);

  const createSnapshotIfNeeded = useCallback(async () => {
    if (storeRef.current.shouldCreateSnapshot()) {
      try {
        const snapshot = await storeRef.current.createSnapshot(
          packages,
          commands,
          plcStatusList,
          metrics
        );
        console.log('Snapshot created:', snapshot.version);
      } catch (error) {
        console.error('Failed to create snapshot:', error);
      }
    }
  }, [packages, commands, plcStatusList, metrics]);

  useEffect(() => {
    if (!isRunning) return;

    let lastPackageTime = 0;
    let lastMoveTime = 0;
    let lastMetricsTime = 0;

    const gameLoop = (timestamp: number) => {
      if (timestamp - lastPackageTime > 800) {
        setPackages(prev => [...prev, generatePackage()]);
        lastPackageTime = timestamp;
      }

      if (timestamp - lastMoveTime > 500) {
        movePackages();
        lastMoveTime = timestamp;
      }

      if (timestamp - lastMetricsTime > 1000) {
        updateMetrics();
        createSnapshotIfNeeded();
        lastMetricsTime = timestamp;
      }

      setPackages(currentPackages => {
        const pendingPackages = currentPackages.filter(p => p.status === 'pending');
        pendingPackages.forEach(pkg => processPackage(pkg));
        return currentPackages;
      });

      animationRef.current = requestAnimationFrame(gameLoop);
    };

    animationRef.current = requestAnimationFrame(gameLoop);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isRunning, generatePackage, movePackages, updateMetrics, createSnapshotIfNeeded, processPackage]);

  useEffect(() => {
    if (!svgRef.current || nodes.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const width = 700;
    const height = 550;

    svg.attr('width', width).attr('height', height);

    const defs = svg.append('defs');
    const conveyorGradient = defs.append('linearGradient')
      .attr('id', 'conveyorGradient')
      .attr('x1', '0%')
      .attr('y1', '0%')
      .attr('x2', '100%')
      .attr('y2', '0%');
    conveyorGradient.append('stop').attr('offset', '0%').attr('stop-color', '#4a5568');
    conveyorGradient.append('stop').attr('offset', '50%').attr('stop-color', '#718096');
    conveyorGradient.append('stop').attr('offset', '100%').attr('stop-color', '#4a5568');

    nodes.forEach(node => {
      node.neighbors.forEach(neighborId => {
        const neighbor = nodes.find(n => n.id === neighborId);
        if (neighbor) {
          svg.append('line')
            .attr('x1', node.x)
            .attr('y1', node.y)
            .attr('x2', neighbor.x)
            .attr('y2', neighbor.y)
            .attr('stroke', 'url(#conveyorGradient)')
            .attr('stroke-width', 12)
            .attr('stroke-linecap', 'round');
        }
      });
    });

    nodes.forEach(node => {
      const group = svg.append('g')
        .attr('class', 'node')
        .attr('transform', `translate(${node.x}, ${node.y})`);

      let color = '#4299e1';
      if (node.type === 'entry') color = '#48bb78';
      else if (node.type === 'chute') color = '#ed8936';
      else if (node.type === 'exit') color = '#f56565';
      else if (node.type === 'cross-belt') color = '#667eea';
      else if (node.type === 'junction') color = '#9f7aea';

      if (!node.isActive) color = '#a0aec0';

      group.append('circle')
        .attr('r', 22)
        .attr('fill', color)
        .attr('stroke', '#2d3748')
        .attr('stroke-width', 3);

      group.append('text')
        .attr('text-anchor', 'middle')
        .attr('dy', 5)
        .attr('fill', 'white')
        .attr('font-size', '10px')
        .attr('font-weight', 'bold')
        .text(node.name.slice(0, 6));
    });

    packages.forEach(pkg => {
      const node = nodeMapRef.current.get(pkg.currentPosition);
      if (!node) return;

      let pkgColor = '#68d391';
      if (pkg.status === 'sorted') pkgColor = '#48bb78';
      else if (pkg.status === 'error') pkgColor = '#fc8181';
      else if (pkg.status === 'sorting') pkgColor = '#63b3ed';

      const jitterX = (Math.random() - 0.5) * 15;
      const jitterY = (Math.random() - 0.5) * 15;

      const pkgGroup = svg.append('g')
        .attr('class', `package ${selectedPackage === pkg.id ? 'selected' : ''}`)
        .attr('transform', `translate(${node.x + jitterX}, ${node.y + jitterY})`)
        .style('cursor', 'pointer')
        .on('click', () => setSelectedPackage(pkg.id === selectedPackage ? null : pkg.id));

      pkgGroup.append('rect')
        .attr('x', -10)
        .attr('y', -8)
        .attr('width', 20)
        .attr('height', 16)
        .attr('rx', 3)
        .attr('fill', pkgColor)
        .attr('stroke', '#2d3748')
        .attr('stroke-width', selectedPackage === pkg.id ? 3 : 1.5);

      pkgGroup.append('text')
        .attr('text-anchor', 'middle')
        .attr('dy', 4)
        .attr('fill', '#1a202c')
        .attr('font-size', '8px')
        .attr('font-weight', 'bold')
        .text(pkg.destination.slice(0, 2));
    });
  }, [nodes, packages, selectedPackage]);

  const selectedPkgData = packages.find(p => p.id === selectedPackage);

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-blue-400">
            📦 SortingNexus - 快递分拣吞吐建模系统
          </h1>
          <div className="flex gap-3">
            <button
              onClick={() => setIsRunning(!isRunning)}
              className={`px-6 py-2 rounded-lg font-semibold transition-colors ${
                isRunning 
                  ? 'bg-red-500 hover:bg-red-600' 
                  : 'bg-green-500 hover:bg-green-600'
              }`}
            >
              {isRunning ? '⏹ 停止' : '▶ 开始'}
            </button>
            <button
              onClick={() => {
                setPackages([]);
                setCommands([]);
                setErrors([]);
              }}
              className="px-6 py-2 rounded-lg font-semibold bg-gray-600 hover:bg-gray-700 transition-colors"
            >
              🗑 清空
            </button>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
            <div className="text-gray-400 text-sm">总包裹数</div>
            <div className="text-3xl font-bold text-blue-400">{metrics.totalPackages}</div>
          </div>
          <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
            <div className="text-gray-400 text-sm">已分拣</div>
            <div className="text-3xl font-bold text-green-400">{metrics.sortedPackages}</div>
          </div>
          <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
            <div className="text-gray-400 text-sm">分拣效率</div>
            <div className="text-3xl font-bold text-yellow-400">{metrics.throughput.toFixed(1)}/s</div>
          </div>
          <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
            <div className="text-gray-400 text-sm">设备利用率</div>
            <div className="text-3xl font-bold text-purple-400">{(metrics.utilizationRate * 100).toFixed(0)}%</div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-6">
          <div className="col-span-2 bg-gray-800 rounded-xl p-4 border border-gray-700">
            <h2 className="text-lg font-semibold mb-4 text-gray-300">传送带拓扑图</h2>
            <div className="bg-gray-900 rounded-lg p-2 overflow-hidden">
              <svg ref={svgRef} className="w-full" style={{ height: '550px' }} />
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
              <h2 className="text-lg font-semibold mb-3 text-gray-300">PLC 状态监控</h2>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {plcStatusList.slice(0, 6).map(status => {
                  const node = nodes.find(n => n.id === status.nodeId);
                  return (
                    <div key={status.nodeId} className="flex items-center justify-between bg-gray-700 rounded-lg px-3 py-2">
                      <span className="text-sm">{node?.name || status.nodeId}</span>
                      <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                        status.isRunning ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                      }`}>
                        {status.isRunning ? '运行中' : '停止'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
              <h2 className="text-lg font-semibold mb-3 text-gray-300">WCS-PLC 对齐延迟</h2>
              <div className="text-4xl font-bold text-center text-cyan-400">
                {alignerRef.current.getAverageLatency().toFixed(0)}
                <span className="text-lg text-gray-400 ml-2">ms</span>
              </div>
              <div className="text-center text-gray-500 text-sm mt-2">
                平均指令执行延迟
              </div>
            </div>

            <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
              <h2 className="text-lg font-semibold mb-3 text-gray-300">异常告警</h2>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {errors.slice(-5).reverse().map(error => (
                  <div 
                    key={error.id} 
                    className={`text-sm px-3 py-2 rounded-lg ${
                      error.severity === 'critical' ? 'bg-red-500/20 text-red-400' :
                      error.severity === 'high' ? 'bg-orange-500/20 text-orange-400' :
                      error.severity === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                      'bg-blue-500/20 text-blue-400'
                    } ${error.resolved ? 'opacity-50' : ''}`}
                  >
                    <span className="font-semibold">[{error.type}]</span> {error.message}
                    {error.resolved && <span className="ml-2 text-green-400">✓</span>}
                  </div>
                ))}
                {errors.length === 0 && (
                  <div className="text-gray-500 text-center py-4">暂无异常</div>
                )}
              </div>
            </div>

            {selectedPkgData && (
              <div className="bg-gray-800 rounded-xl p-4 border border-blue-500/50">
                <h2 className="text-lg font-semibold mb-3 text-blue-400">包裹详情</h2>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">条码:</span>
                    <span className="font-mono">{selectedPkgData.barcode}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">目的地:</span>
                    <span>{selectedPkgData.destination}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">状态:</span>
                    <span className={`px-2 py-0.5 rounded text-xs ${
                      selectedPkgData.status === 'sorted' ? 'bg-green-500/20 text-green-400' :
                      selectedPkgData.status === 'sorting' ? 'bg-blue-500/20 text-blue-400' :
                      selectedPkgData.status === 'error' ? 'bg-red-500/20 text-red-400' :
                      'bg-gray-500/20 text-gray-400'
                    }`}>
                      {selectedPkgData.status === 'sorted' ? '已分拣' :
                       selectedPkgData.status === 'sorting' ? '分拣中' :
                       selectedPkgData.status === 'error' ? '异常' : '待处理'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">当前位置:</span>
                    <span>{selectedPkgData.currentPosition}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">路径长度:</span>
                    <span>{selectedPkgData.assignedPath.length} 节点</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="mt-6 grid grid-cols-3 gap-4 text-center text-gray-500 text-sm">
          <div className="bg-gray-800 rounded-lg p-3 border border-gray-700">
            <span className="text-blue-400 font-semibold">异步 Dijkstra 算法</span> - 动态最优路径规划
          </div>
          <div className="bg-gray-800 rounded-lg p-3 border border-gray-700">
            <span className="text-cyan-400 font-semibold">WCS-PLC 毫秒对齐</span> - 实时指令同步
          </div>
          <div className="bg-gray-800 rounded-lg p-3 border border-gray-700">
            <span className="text-purple-400 font-semibold">IndexedDB 快照</span> - 异常回溯与恢复
          </div>
        </div>
      </div>
    </div>
  );
};

export default SortingDashboard;
