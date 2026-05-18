import React from 'react';
import { Play, Pause, RotateCcw, SkipForward, Gauge } from 'lucide-react';
import type { SimulationStatus } from '../../types';

interface PlaybackControlsProps {
  status: SimulationStatus;
  currentTime: number;
  totalTime: number;
  speed: number;
  onPlay: () => void;
  onPause: () => void;
  onReset: () => void;
  onStep: () => void;
  onSpeedChange: (speed: number) => void;
  onSeek: (time: number) => void;
}

export const PlaybackControls: React.FC<PlaybackControlsProps> = ({
  status,
  currentTime,
  totalTime,
  speed,
  onPlay,
  onPause,
  onReset,
  onStep,
  onSpeedChange,
  onSeek,
}) => {
  const formatTime = (t: number) => {
    const minutes = Math.floor(t / 60);
    const seconds = Math.floor(t % 60);
    const ms = Math.floor((t % 1) * 100);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
  };

  const progress = totalTime > 0 ? (currentTime / totalTime) * 100 : 0;

  return (
    <div className="bg-slate-800/90 backdrop-blur border border-slate-700 rounded-lg p-4">
      <div className="flex items-center gap-4 mb-3">
        <div className="flex items-center gap-2">
          <button
            onClick={onReset}
            className="p-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-white/80 hover:text-white transition-all"
            title="重置"
          >
            <RotateCcw size={18} />
          </button>
          <button
            onClick={onStep}
            className="p-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-white/80 hover:text-white transition-all"
            title="单步执行"
          >
            <SkipForward size={18} />
          </button>
          <button
            onClick={status === 'running' ? onPause : onPlay}
            className={`p-3 rounded-lg transition-all ${
              status === 'running'
                ? 'bg-yellow-600 hover:bg-yellow-500 text-white'
                : 'bg-green-600 hover:bg-green-500 text-white'
            }`}
            title={status === 'running' ? '暂停' : '开始'}
          >
            {status === 'running' ? <Pause size={20} /> : <Play size={20} />}
          </button>
        </div>

        <div className="flex-1 flex items-center gap-3">
          <span className="text-white/60 text-sm font-mono w-20">{formatTime(currentTime)}</span>
          <div className="flex-1 relative">
            <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 transition-all duration-100"
                style={{ width: `${progress}%` }}
              />
            </div>
            <input
              type="range"
              min={0}
              max={totalTime}
              step={0.01}
              value={currentTime}
              onChange={(e) => onSeek(parseFloat(e.target.value))}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
          </div>
          <span className="text-white/60 text-sm font-mono w-20 text-right">{formatTime(totalTime)}</span>
        </div>

        <div className="flex items-center gap-2">
          <Gauge size={16} className="text-white/60" />
          <select
            value={speed}
            onChange={(e) => onSpeedChange(parseFloat(e.target.value))}
            className="bg-slate-700 text-white text-sm rounded px-2 py-1 border border-slate-600 focus:outline-none focus:border-blue-500"
          >
            <option value={0.25}>0.25x</option>
            <option value={0.5}>0.5x</option>
            <option value={1}>1x</option>
            <option value={2}>2x</option>
            <option value={4}>4x</option>
            <option value={8}>8x</option>
          </select>
        </div>
      </div>
    </div>
  );
};
