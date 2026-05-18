import React from 'react';
import { LayoutDashboard, Network, ToggleLeft, BarChart3, Settings } from 'lucide-react';

type Route = 'dashboard' | 'network' | 'valves' | 'analysis' | 'settings';

const navItems: { id: Route; label: string; icon: React.ElementType }[] = [
  { id: 'dashboard', label: '监控面板', icon: LayoutDashboard },
  { id: 'network', label: '管网建模', icon: Network },
  { id: 'valves', label: '阀门控制', icon: ToggleLeft },
  { id: 'analysis', label: '数据分析', icon: BarChart3 },
  { id: 'settings', label: '系统设置', icon: Settings },
];

interface SidebarProps {
  currentRoute: Route;
  onNavigate: (route: Route) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentRoute, onNavigate }) => {
  return (
    <div className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col h-full">
      <div className="p-6 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-400 rounded-lg flex items-center justify-center">
            <ToggleLeft className="text-white" size={20} />
          </div>
          <div>
            <h1 className="text-white font-bold text-lg">ValveLogic</h1>
            <p className="text-xs text-slate-400">水锤效应仿真系统</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
              currentRoute === item.id
                ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <item.icon size={18} />
            <span className="font-medium">{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="p-4 border-t border-slate-800">
        <div className="bg-slate-800/50 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-xs text-green-400">系统运行正常</span>
          </div>
          <p className="text-xs text-slate-500">版本 1.0.0</p>
        </div>
      </div>
    </div>
  );
};
