'use client';

import { Play, Pause, RotateCcw, Database } from 'lucide-react';

interface SimulationControlsProps {
  isRunning: boolean;
  weldPointCount: number;
  onToggle: () => void;
  onReset: () => void;
  onAddNormal: () => void;
  onAddDefect: () => void;
}

export function SimulationControls({
  isRunning,
  weldPointCount,
  onToggle,
  onReset,
  onAddNormal,
  onAddDefect,
}: SimulationControlsProps) {
  return (
    <div className="p-4 bg-gray-800 rounded-lg">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-white">模拟控制</h3>
        <div className="flex items-center gap-2">
          <Database className="w-4 h-4 text-blue-400" />
          <span className="text-sm text-gray-400">存储焊点: {weldPointCount}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <button
          onClick={onToggle}
          className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
            isRunning
              ? 'bg-red-600 hover:bg-red-700 text-white'
              : 'bg-green-600 hover:bg-green-700 text-white'
          }`}
        >
          {isRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          {isRunning ? '停止模拟' : '开始模拟'}
        </button>
        <button
          onClick={onReset}
          className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-white font-medium transition-all"
        >
          <RotateCcw className="w-4 h-4" />
          重置数据
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={onAddNormal}
          className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-all"
        >
          + 正常焊点
        </button>
        <button
          onClick={onAddDefect}
          className="px-4 py-2 rounded-lg bg-orange-600 hover:bg-orange-700 text-white text-sm font-medium transition-all"
        >
          + 缺陷焊点
        </button>
      </div>

      <div className="mt-4 p-3 bg-gray-900 rounded-lg">
        <p className="text-xs text-gray-500">
          模拟状态: <span className={isRunning ? 'text-green-400' : 'text-gray-400'}>
            {isRunning ? '运行中' : '已停止'}
          </span>
        </p>
        <p className="text-xs text-gray-500 mt-1">
          数据通过 IndexedDB 本地存储，支持万级焊点数据持久化
        </p>
      </div>
    </div>
  );
}
