import React from 'react';
import { useApp } from '@/context/AppContext';
import type { TabType } from '@/types';

const tabs: { id: TabType; label: string; icon: string }[] = [
  { id: 'dashboard', label: '总览', icon: '📊' },
  { id: 'monitoring', label: '环境监控', icon: '🌡️' },
  { id: 'assets', label: '资产管理', icon: '🍷' },
  { id: 'prediction', label: '适饮预测', icon: '📈' },
  { id: 'alignment', label: '语义对齐', icon: '🔗' },
  { id: 'simulation', label: '仿真引擎', icon: '🧪' },
];

export const Navigation: React.FC = () => {
  const { state, dispatch } = useApp();

  return (
    <nav className="p-4">
      <div className="space-y-1">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => dispatch({ type: 'SET_ACTIVE_TAB', payload: tab.id })}
            className={`w-full px-4 py-3 rounded-lg transition-all duration-200 flex items-center gap-3 text-sm font-medium ${
              state.activeTab === tab.id
                ? 'bg-wine-600 text-white shadow-md'
                : 'text-cellar-300 hover:bg-cellar-800 hover:text-white'
            }`}
          >
            <span className="text-lg">{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      <div className="mt-8 p-4 bg-cellar-800/50 rounded-lg">
        <div className="text-xs text-cellar-400 mb-2">系统状态</div>
        <div className="flex items-center gap-2 mb-2">
          <div className={`w-2 h-2 rounded-full ${
            state.systemStatus.activeAlerts > 0 ? 'bg-red-500 animate-pulse' : 'bg-green-500'
          }`} />
          <span className="text-sm text-cellar-200">
            {state.systemStatus.wineCount} 瓶藏酒
          </span>
        </div>
        <div className="text-xs text-cellar-500">
          {state.systemStatus.sensorCount} 个传感器
        </div>
      </div>
    </nav>
  );
};
