import React from 'react';

interface ControlPanelProps {
  isRunning: boolean;
  onStart: () => void;
  onStop: () => void;
  onReset: () => void;
}

export const ControlPanel: React.FC<ControlPanelProps> = ({
  isRunning,
  onStart,
  onStop,
  onReset
}) => {
  return (
    <div className="flex items-center gap-3">
      <button
        onClick={isRunning ? onStop : onStart}
        className={`px-6 py-2.5 rounded-xl font-semibold transition-all transform hover:scale-105 flex items-center gap-2 ${
          isRunning
            ? 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white shadow-lg shadow-red-500/30'
            : 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white shadow-lg shadow-green-500/30'
        }`}
      >
        <span className="text-xl">{isRunning ? '⏹️' : '▶️'}</span>
        {isRunning ? '停止' : '开始'}
      </button>
      
      <button
        onClick={onReset}
        className="px-5 py-2.5 rounded-xl font-semibold bg-gray-700 hover:bg-gray-600 text-white transition-all transform hover:scale-105 flex items-center gap-2 border border-gray-600"
      >
        <span className="text-xl">🔄</span>
        重置
      </button>
    </div>
  );
};

export default ControlPanel;
