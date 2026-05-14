import React from 'react';

interface HeaderProps {
  isRunning: boolean;
  onStart: () => void;
  onStop: () => void;
  onReset: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  isRunning,
  onStart,
  onStop,
  onReset
}) => {
  return (
    <header className="bg-gray-800 border-b border-gray-700 px-8 py-5">
      <div className="flex items-center justify-between max-w-full">
        <div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 via-cyan-400 to-purple-400 bg-clip-text text-transparent">
            📦 SortingNexus - 智能快递分拣系统
          </h1>
          <p className="text-gray-500 mt-1 text-sm">
            WCS-PLC 毫秒级对齐 · 异步 Dijkstra 路径规划 · IndexedDB 快照缓存
          </p>
        </div>
        
        <div className="flex gap-3">
          <button
            onClick={isRunning ? onStop : onStart}
            className={`px-6 py-2.5 rounded-xl font-semibold transition-all transform hover:scale-105 flex items-center gap-2 shadow-lg ${
              isRunning
                ? 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white shadow-red-500/30'
                : 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white shadow-green-500/30'
            }`}
          >
            {isRunning ? '⏹️ 停止' : '▶️ 开始'}
          </button>
          
          <button
            onClick={onReset}
            className="px-6 py-2.5 rounded-xl font-semibold bg-gray-700 hover:bg-gray-600 text-white transition-all transform hover:scale-105 border border-gray-600 flex items-center gap-2"
          >
            🔄 重置
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;
