'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useSimulationStore } from '@/lib/state/simulation-store';
import { TerminalCanvas } from '@/components/canvas/TerminalCanvas';
import { MetricsPanel } from '@/components/dashboard/MetricsPanel';
import { ControlPanel } from '@/components/dashboard/ControlPanel';
import { SecurityPanel } from '@/components/security/SecurityPanel';
import { GroundServicePanel } from '@/components/ground-service/GroundServicePanel';
import { RetailPanel } from '@/components/retail/RetailPanel';
import { Activity, Shield, Plane, ShoppingBag, Database, Play, Pause, RotateCcw, Settings } from 'lucide-react';
import { snapshotStorage } from '@/lib/storage/snapshot-storage';
import type { FlowSnapshot, CompactAgentState, SimulationMetrics } from '@/types';

type TabType = 'dashboard' | 'security' | 'ground' | 'retail' | 'history';

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [showControlPanel, setShowControlPanel] = useState(true);

  const {
    agents,
    metrics,
    isRunning,
    isPaused,
    speedMultiplier,
    showVectors,
    showHeatmap,
    showTrails,
    filterTypes,
    filterStatuses,
    setWorker,
    setAgents,
    setMetrics,
    addSnapshot,
    setRunning,
    setPaused,
    setSpeed,
    reset,
  } = useSimulationStore();

  const handleWorkerMessage = useCallback((e: MessageEvent) => {
    const msg = e.data;
    if (msg.type === 'agent_states') {
      if (msg.agents) {
        setAgents(msg.agents as CompactAgentState[]);
      }
      if (msg.metrics) {
        setMetrics(msg.metrics as SimulationMetrics);
      }
    } else if (msg.type === 'metrics' && msg.metrics) {
      setMetrics(msg.metrics as SimulationMetrics);
    } else if (msg.type === 'snapshot' && msg.snapshot) {
      const snapshot = msg.snapshot as FlowSnapshot;
      addSnapshot(snapshot);
      snapshotStorage.saveSnapshot(snapshot).catch(console.error);
    } else if (msg.type === 'error') {
      console.error('Worker error:', msg.error);
    }
  }, [setAgents, setMetrics, addSnapshot]);

  useEffect(() => {
    const worker = new Worker(
      new URL('@/workers/simulation.worker.ts', import.meta.url),
      { type: 'module' }
    );

    worker.onmessage = handleWorkerMessage;
    worker.onerror = (e) => console.error('Worker error:', e);

    worker.postMessage({
      type: 'init',
      data: { params: useSimulationStore.getState().socialForceParams },
    });

    setWorker(worker);

    return () => {
      worker.terminate();
      setWorker(null);
    };
  }, [setWorker, handleWorkerMessage]);

  const handleStart = () => {
    const { worker } = useSimulationStore.getState();
    if (worker) {
      worker.postMessage({ type: 'start' });
      setRunning(true);
      setPaused(false);
    }
  };

  const handlePause = () => {
    const { worker } = useSimulationStore.getState();
    if (worker) {
      worker.postMessage({ type: 'pause' });
      setPaused(true);
    }
  };

  const handleReset = () => {
    reset();
  };

  const tabs = [
    { id: 'dashboard' as TabType, label: '主控看板', icon: Activity, color: 'cyber-blue' },
    { id: 'security' as TabType, label: '安检中枢', icon: Shield, color: 'alert-amber' },
    { id: 'ground' as TabType, label: '地服调度', icon: Plane, color: 'biz-purple' },
    { id: 'retail' as TabType, label: '免税零售', icon: ShoppingBag, color: 'retail-pink' },
    { id: 'history' as TabType, label: '历史快照', icon: Database, color: 'safe-green' },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <div className="h-full flex flex-col">
            <div className="flex-1 flex gap-4 p-4 overflow-hidden">
              <div className="flex-1 flex flex-col gap-4 overflow-hidden">
                <div className="flex-1 flex items-center justify-center bg-deep-space-light/30 rounded-lg border border-cyber-blue/20 overflow-hidden">
                  <TerminalCanvas
                    agents={agents}
                    showVectors={showVectors}
                    showHeatmap={showHeatmap}
                    showTrails={showTrails}
                    filterTypes={filterTypes}
                    filterStatuses={filterStatuses}
                    width={900}
                    height={600}
                  />
                </div>
                <MetricsPanel metrics={metrics} />
              </div>
              <div className="w-96 flex-shrink-0 overflow-y-auto">
                <ControlPanel />
              </div>
            </div>
          </div>
        );
      case 'security':
        return <SecurityPanel metrics={metrics} />;
      case 'ground':
        return <GroundServicePanel metrics={metrics} />;
      case 'retail':
        return <RetailPanel metrics={metrics} />;
      case 'history':
        return <HistoryPanel />;
      default:
        return null;
    }
  };

  return (
    <div className="h-screen flex flex-col bg-deep-space overflow-hidden">
      <header className="h-16 bg-deep-space-dark border-b border-cyber-blue/30 flex items-center justify-between px-6 flex-shrink-0">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-cyber-blue to-biz-purple rounded-lg flex items-center justify-center">
              <Plane className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-display text-cyber-blue">PortMatrix</h1>
              <p className="text-xs text-gray-500">空港旅客吞吐仿真系统 v1.0</p>
            </div>
          </div>

          <div className="h-8 w-px bg-cyber-blue/20 mx-4" />

          <nav className="flex items-center gap-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                  activeTab === tab.id
                    ? `bg-${tab.color}/20 text-${tab.color} border border-${tab.color}/30`
                    : 'text-gray-400 hover:text-gray-200 hover:bg-deep-space-light/50'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                <span className="text-sm font-mono">{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          {activeTab === 'dashboard' && (
            <div className="flex items-center gap-2 mr-4">
              {!isRunning ? (
                <button
                  onClick={handleStart}
                  className="flex items-center gap-2 px-4 py-2 bg-safe-green/20 text-safe-green border border-safe-green/30 rounded-lg hover:bg-safe-green/30 transition-all"
                >
                  <Play className="w-4 h-4" />
                  <span className="text-sm font-mono">开始仿真</span>
                </button>
              ) : isPaused ? (
                <button
                  onClick={handleStart}
                  className="flex items-center gap-2 px-4 py-2 bg-safe-green/20 text-safe-green border border-safe-green/30 rounded-lg hover:bg-safe-green/30 transition-all"
                >
                  <Play className="w-4 h-4" />
                  <span className="text-sm font-mono">继续</span>
                </button>
              ) : (
                <button
                  onClick={handlePause}
                  className="flex items-center gap-2 px-4 py-2 bg-alert-amber/20 text-alert-amber border border-alert-amber/30 rounded-lg hover:bg-alert-amber/30 transition-all"
                >
                  <Pause className="w-4 h-4" />
                  <span className="text-sm font-mono">暂停</span>
                </button>
              )}
              <button
                onClick={handleReset}
                className="flex items-center gap-2 px-4 py-2 bg-gray-700/20 text-gray-300 border border-gray-700/30 rounded-lg hover:bg-gray-700/30 transition-all"
              >
                <RotateCcw className="w-4 h-4" />
                <span className="text-sm font-mono">重置</span>
              </button>
            </div>
          )}

          <div className="flex items-center gap-2 px-3 py-1.5 bg-deep-space-light/50 rounded-lg border border-cyber-blue/20">
            <div className={`w-2 h-2 rounded-full ${isRunning && !isPaused ? 'bg-safe-green animate-pulse' : 'bg-gray-500'}`} />
            <span className="text-xs font-mono text-gray-400">
              {isRunning && !isPaused ? '运行中' : isPaused ? '已暂停' : '待机'}
            </span>
            {metrics && (
              <>
                <span className="text-xs text-gray-600">|</span>
                <span className="text-xs font-mono text-cyber-blue">{metrics.fps} FPS</span>
              </>
            )}
          </div>

          <button
            onClick={() => setShowControlPanel(!showControlPanel)}
            className={`p-2 rounded-lg transition-all ${showControlPanel ? 'bg-cyber-blue/20 text-cyber-blue' : 'text-gray-400 hover:text-gray-200'}`}
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-hidden">
        {renderContent()}
      </main>
    </div>
  );
}

function HistoryPanel() {
  const { snapshots, waves, setSnapshots, setWaves } = useSimulationStore();
  const [selectedWave, setSelectedWave] = useState<string | null>(null);

  const filteredSnapshots = selectedWave
    ? snapshots.filter(s => s.waveId === selectedWave)
    : snapshots;

  const handleClearSnapshots = async () => {
    try {
      await snapshotStorage.clearSnapshots();
      setSnapshots([]);
    } catch (error) {
      console.error('Failed to clear snapshots:', error);
    }
  };

  const handleClearWaves = async () => {
    try {
      await snapshotStorage.clearWaves();
      setSnapshots([]);
      setWaves([]);
      setSelectedWave(null);
    } catch (error) {
      console.error('Failed to clear waves:', error);
    }
  };

  return (
    <div className="h-full flex flex-col gap-4 p-6 overflow-auto">
      <div className="flex items-center gap-3 mb-2">
        <div className="p-2 bg-safe-green/20 rounded-lg">
          <Database className="w-6 h-6 text-safe-green" />
        </div>
        <div>
          <h1 className="text-2xl font-display text-cyber-blue">历史快照</h1>
          <p className="text-sm text-gray-400">航班波人流演变记录与回放</p>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <StatCard label="总快照数" value={snapshots.length.toString()} color="cyber-blue" />
        <StatCard label="航班波数" value={waves.length.toString()} color="biz-purple" />
        <StatCard label="最早记录" value={snapshots.length > 0 ? new Date(snapshots[0].timestamp).toLocaleTimeString() : '--'} color="safe-green" />
        <StatCard label="最新记录" value={snapshots.length > 0 ? new Date(snapshots[snapshots.length - 1].timestamp).toLocaleTimeString() : '--'} color="retail-pink" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-deep-space-light/50 rounded-lg p-4 border border-cyber-blue/20">
          <h3 className="text-cyber-blue text-sm font-mono mb-4">航班波列表</h3>
          {waves.length === 0 ? (
            <div className="text-center py-8 text-gray-500 text-sm">
              暂无航班波数据，开始仿真后将自动记录
            </div>
          ) : (
            <div className="space-y-2 max-h-80 overflow-auto">
              {waves.map((wave) => (
                <div
                  key={wave.id}
                  onClick={() => setSelectedWave(selectedWave === wave.id ? null : wave.id)}
                  className={`p-3 rounded-lg cursor-pointer transition-all ${
                    selectedWave === wave.id
                      ? 'bg-cyber-blue/20 border border-cyber-blue/40'
                      : 'bg-deep-space-dark/50 border border-transparent hover:border-cyber-blue/20'
                  }`}
                >
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm font-mono text-cyber-blue">{wave.name}</span>
                    <span className="text-xs text-gray-400">{wave.flightIds.length} 个航班</span>
                  </div>
                  <div className="text-xs text-gray-500">
                    预计旅客: {wave.expectedPassengers} 人
                  </div>
                  <div className="text-xs text-gray-500">
                    {new Date(wave.createdAt).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-deep-space-light/50 rounded-lg p-4 border border-cyber-blue/20">
          <h3 className="text-cyber-blue text-sm font-mono mb-4">人流快照时间线</h3>
          {filteredSnapshots.length === 0 ? (
            <div className="text-center py-8 text-gray-500 text-sm">
              暂无快照数据
            </div>
          ) : (
            <div className="space-y-2 max-h-80 overflow-auto">
              {filteredSnapshots.slice(-20).reverse().map((snapshot) => (
                <div
                  key={snapshot.id}
                  className="p-3 bg-deep-space-dark/50 rounded-lg border border-cyber-blue/10"
                >
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-mono text-cyber-blue">
                      {new Date(snapshot.timestamp).toLocaleTimeString()}
                    </span>
                    <span className="text-xs text-gray-400">
                      T+{Math.floor(snapshot.simulationTime)}s
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div>
                      <span className="text-gray-500">旅客数: </span>
                      <span className="text-safe-green font-mono">{snapshot.passengerCount}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">吞吐率: </span>
                      <span className="text-biz-purple font-mono">{snapshot.throughput.toFixed(1)}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">瓶颈: </span>
                      <span className={`font-mono ${snapshot.bottlenecks.length > 0 ? 'text-alert-amber' : 'text-safe-green'}`}>
                        {snapshot.bottlenecks.length}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="bg-deep-space-light/50 rounded-lg p-4 border border-cyber-blue/20">
        <h3 className="text-cyber-blue text-sm font-mono mb-3">数据管理</h3>
        <div className="flex gap-4">
          <button
            onClick={handleClearSnapshots}
            className="px-4 py-2 bg-alert-red/10 text-alert-red border border-alert-red/30 rounded-lg hover:bg-alert-red/20 transition-all text-sm font-mono"
          >
            清空所有快照
          </button>
          <button
            onClick={handleClearWaves}
            className="px-4 py-2 bg-alert-amber/10 text-alert-amber border border-alert-amber/30 rounded-lg hover:bg-alert-amber/20 transition-all text-sm font-mono"
          >
            清空航班波记录
          </button>
        </div>
      </div>
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: string;
  color: string;
}

const StatCard: React.FC<StatCardProps> = ({ label, value, color }) => (
  <div className={`bg-deep-space-light/50 rounded-lg p-4 border border-${color}/20`}>
    <div className="text-xs text-gray-400 mb-1">{label}</div>
    <div className={`text-2xl font-mono font-bold text-${color}`}>{value}</div>
  </div>
);
