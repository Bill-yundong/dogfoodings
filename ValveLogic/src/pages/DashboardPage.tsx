import React, { useEffect, useRef, useCallback, useState } from 'react';
import { PipelineCanvas } from '../components/pipeline/PipelineCanvas';
import { PlaybackControls } from '../components/common/PlaybackControls';
import { NodeMetricCard } from '../components/monitoring/NodeMetricCard';
import { usePipelineStore } from '../store/usePipelineStore';
import { useSimulationStore } from '../store/useSimulationStore';
import { useValveStore } from '../store/useValveStore';
import { createSimulation } from '../db/snapshot-repository';
import { AlertTriangle, Activity, Gauge, Waves } from 'lucide-react';

const DashboardPage: React.FC = () => {
  const { nodes, segments, loadDemoPipeline, selectedNodeId, selectNode } = usePipelineStore();
  const {
    status,
    currentTime,
    speed,
    config,
    warnings,
    nodePressures,
    segmentPressures,
    setStatus,
    setSpeed,
    setConfig,
    setSimulationId,
    initializeSimulation,
    stepSimulation,
    resetSimulation,
  } = useSimulationStore();
  const { valves, loadDemoValves, updateValvesStep } = useValveStore();

  const animationRef = useRef<number>(0);
  const lastStepTimeRef = useRef<number>(0);
  const [canvasSize, setCanvasSize] = useState({ width: 900, height: 600 });
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadDemoPipeline();
    loadDemoValves();
  }, [loadDemoPipeline, loadDemoValves]);

  useEffect(() => {
    if (nodes.length > 0 && valves.length > 0) {
      initializeSimulation(nodes, segments, valves);
    }
  }, [nodes.length, valves.length]);

  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setCanvasSize({ width: Math.floor(rect.width), height: 600 });
      }
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  const runSimulationStep = useCallback(() => {
    const now = performance.now();
    const timeStep = config.timeStep * speed;

    if (now - lastStepTimeRef.current >= 16) {
      updateValvesStep(timeStep);
      stepSimulation([...nodes], segments, valves);
      lastStepTimeRef.current = now;
    }

    if (status === 'running') {
      animationRef.current = requestAnimationFrame(runSimulationStep);
    }
  }, [status, speed, config.timeStep, nodes, segments, valves, updateValvesStep, stepSimulation]);

  useEffect(() => {
    if (status === 'running') {
      animationRef.current = requestAnimationFrame(runSimulationStep);
    }
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [status, runSimulationStep]);

  const handleStart = useCallback(async () => {
    if (status === 'idle') {
      const simId = await createSimulation(
        `仿真 ${new Date().toLocaleString()}`,
        config,
        nodes,
        segments,
        valves
      );
      setSimulationId(simId);
    }
    setStatus('running');
  }, [status, config, nodes, segments, valves, setStatus, setSimulationId]);

  const handlePause = useCallback(() => {
    setStatus('paused');
  }, [setStatus]);

  const handleReset = useCallback(() => {
    cancelAnimationFrame(animationRef.current);
    resetSimulation();
    initializeSimulation(nodes, segments, valves);
  }, [resetSimulation, initializeSimulation, nodes, segments, valves]);

  const handleStep = useCallback(() => {
    updateValvesStep(config.timeStep);
    stepSimulation([...nodes], segments, valves);
  }, [config.timeStep, nodes, segments, valves, updateValvesStep, stepSimulation]);

  const handleSeek = useCallback((time: number) => {
    console.log('Seek to:', time);
  }, []);

  const criticalWarnings = warnings.filter(
    (w) => w.severity === 'critical' || w.severity === 'high'
  );

  const avgPressure =
    Object.values(nodePressures).length > 0
      ? Object.values(nodePressures).reduce((a, b) => a + b, 0) / Object.values(nodePressures).length
      : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">仿真监控面板</h1>
          <p className="text-slate-400 text-sm mt-1">实时监控管线压力波传播与阀门状态</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-2 bg-slate-800 rounded-lg">
            <Activity size={16} className="text-green-400" />
            <span className="text-sm text-slate-300">
              {nodes.length} 节点 · {segments.length} 管段 · {valves.length} 阀门
            </span>
          </div>
        </div>
      </div>

      {criticalWarnings.length > 0 && (
        <div className="bg-red-900/30 border border-red-500/50 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="text-red-400" size={20} />
            <span className="text-red-400 font-medium">系统警报</span>
          </div>
          <div className="space-y-1">
            {criticalWarnings.slice(0, 3).map((warning) => (
              <p key={warning.id} className="text-sm text-red-300">
                {warning.message}
              </p>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-4 gap-4">
        <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Gauge className="text-blue-400" size={16} />
            <span className="text-slate-400 text-sm">平均压力</span>
          </div>
          <p className="text-2xl font-bold text-white">
            {(avgPressure / 1000000).toFixed(2)} <span className="text-sm text-slate-400">MPa</span>
          </p>
        </div>
        <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Waves className="text-purple-400" size={16} />
            <span className="text-slate-400 text-sm">管段数量</span>
          </div>
          <p className="text-2xl font-bold text-white">
            {Object.keys(segmentPressures).length} <span className="text-sm text-slate-400">条</span>
          </p>
        </div>
        <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="text-green-400" size={16} />
            <span className="text-slate-400 text-sm">活动阀门</span>
          </div>
          <p className="text-2xl font-bold text-white">
            {valves.filter((v) => v.opening > 0.01).length} <span className="text-sm text-slate-400">个</span>
          </p>
        </div>
        <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="text-yellow-400" size={16} />
            <span className="text-slate-400 text-sm">警报数量</span>
          </div>
          <p className={`text-2xl font-bold ${warnings.length > 0 ? 'text-red-400' : 'text-green-400'}`}>
            {warnings.length} <span className="text-sm text-slate-400">条</span>
          </p>
        </div>
      </div>

      <div ref={containerRef} className="bg-slate-900 rounded-lg overflow-hidden border border-slate-700">
        <PipelineCanvas width={canvasSize.width} height={canvasSize.height} />
      </div>

      <PlaybackControls
        status={status}
        currentTime={currentTime}
        totalTime={config.totalTime}
        speed={speed}
        onPlay={handleStart}
        onPause={handlePause}
        onReset={handleReset}
        onStep={handleStep}
        onSpeedChange={setSpeed}
        onSeek={handleSeek}
      />

      <div>
        <h2 className="text-lg font-semibold text-white mb-4">节点监控</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {nodes.slice(0, 6).map((node) => (
            <NodeMetricCard
              key={node.id}
              node={node}
              realTimePressure={nodePressures[node.id]}
              warnings={warnings}
              isSelected={selectedNodeId === node.id}
              onClick={() => selectNode(node.id)}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
