import { NavLink } from 'react-router-dom';
import { Activity, ScanSearch, History } from 'lucide-react';

const navItems = [
  { path: '/', label: '运动仪表盘', icon: Activity },
  { path: '/keypoints', label: '关键点分析', icon: ScanSearch },
  { path: '/history', label: '历史对比', icon: History },
];

export default function Sidebar() {
  return (
    <aside className="w-56 h-screen bg-[#0D1117] border-r border-[#1E2433] flex flex-col shrink-0">
      <div className="px-5 py-6 border-b border-[#1E2433]">
        <h1 className="font-['Orbitron',monospace] text-lg font-bold text-[#00F0B5] tracking-wider">
          KINETIC<span className="text-[#6366F1]">PRO</span>
        </h1>
        <p className="text-[10px] text-[#6B7280] mt-1 tracking-widest uppercase">
          Biomechanics Analysis
        </p>
      </div>

      <nav className="flex-1 py-4 px-3 space-y-1">
        {navItems.map(item => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200 ${
                isActive
                  ? 'bg-[#00F0B5]/10 text-[#00F0B5] border border-[#00F0B5]/20'
                  : 'text-[#8B95A5] hover:text-[#E8ECF4] hover:bg-[#1A1F2E]/50'
              }`
            }
          >
            <item.icon size={18} strokeWidth={1.5} />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="px-4 py-4 border-t border-[#1E2433]">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-[#00F0B5] animate-pulse" />
          <span className="text-xs text-[#6B7280]">系统在线</span>
        </div>
        <p className="text-[10px] text-[#4B5563] mt-1">v1.0.0 · 数据集成总线</p>
      </div>
    </aside>
  );
}
