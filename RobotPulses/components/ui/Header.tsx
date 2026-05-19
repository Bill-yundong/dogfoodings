'use client';

import { Play, Pause, RotateCcw, Gauge, Database } from 'lucide-react';
import { useSimulationStore } from '@/store/simulationStore';

export const Header = () => {
  const {
    status,
    simulationTime,
    frameNumber,
    fps,
    speedMultiplier,
    storedSnapshotCount,
    actions,
  } = useSimulationStore();

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 100);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
  };

  return (
    <header className="bg-industrial-800 border-b border-industrial-600 px-6 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold text-accent-cyan font-display tracking-wider">
            RobotPulses
          </h1>
          <span className="text-industrial-500 text-sm">
            多协作机器人运动避障仿真平台
          </span>
        </div>

        <div className="flex items-center gap-6">
          <div className="flex items-center gap-4 bg-industrial-900 px-4 py-2 rounded-lg">
            <div className="flex items-center gap-2">
              <Gauge className="w-4 h-4 text-accent-cyan" />
              <span className="text-xs text-industrial-400">FPS</span>
              <span className="text-sm font-mono text-accent-cyan">{fps}</span>
            </div>
            <div className="w-px h-6 bg-industrial-600" />
            <div className="flex items-center gap-2">
              <span className="text-xs text-industrial-400">时间</span>
              <span className="text-sm font-mono text-white">{formatTime(simulationTime)}</span>
            </div>
            <div className="w-px h-6 bg-industrial-600" />
            <div className="flex items-center gap-2">
              <span className="text-xs text-industrial-400">帧</span>
              <span className="text-sm font-mono text-white">{frameNumber}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-industrial-900 px-4 py-2 rounded-lg">
            <Database className="w-4 h-4 text-accent-green" />
            <span className="text-xs text-industrial-400">快照</span>
            <span className="text-sm font-mono text-accent-green">{storedSnapshotCount}</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-industrial-400">速度</span>
            <select
              value={speedMultiplier}
              onChange={(e) => actions.setSpeed(parseFloat(e.target.value))}
              className="bg-industrial-900 text-white text-sm px-3 py-2 rounded-lg border border-industrial-600 focus:outline-none focus:border-accent-cyan"
            >
              <option value={0.5}>0.5x</option>
              <option value={1}>1x</option>
              <option value={2}>2x</option>
              <option value={4}>4x</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            {status !== 'running' ? (
              <button
                onClick={actions.start}
                className="flex items-center gap-2 bg-accent-green hover:bg-accent-green/80 text-white px-4 py-2 rounded-lg transition-colors"
              >
                <Play className="w-4 h-4" />
                开始
              </button>
            ) : (
              <button
                onClick={actions.pause}
                className="flex items-center gap-2 bg-accent-yellow hover:bg-accent-yellow/80 text-white px-4 py-2 rounded-lg transition-colors"
              >
                <Pause className="w-4 h-4" />
                暂停
              </button>
            )}
            <button
              onClick={actions.reset}
              className="flex items-center gap-2 bg-industrial-600 hover:bg-industrial-500 text-white px-4 py-2 rounded-lg transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              重置
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
