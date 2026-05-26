import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/utils/format';
import {
  LayoutDashboard,
  PlaneTakeoff,
  Battery,
  Zap,
  Radar,
  BarChart3,
  Settings
} from 'lucide-react';

const navItems = [
  { href: '/', label: '枢纽总览', icon: LayoutDashboard },
  { href: '/scheduling', label: '调度控制', icon: PlaneTakeoff },
  { href: '/battery', label: '电池管理', icon: Battery },
  { href: '/energy', label: '能源协同', icon: Zap },
  { href: '/airspace', label: '空域管理', icon: Radar },
  { href: '/reports', label: '分析报告', icon: BarChart3 },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-space-blue/80 backdrop-blur-md border-r border-electric-blue/20 flex flex-col h-screen">
      <div className="p-4 border-b border-electric-blue/20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-electric-blue/20 flex items-center justify-center">
            <Zap className="w-6 h-6 text-electric-blue" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white font-display">VertiPulset</h1>
            <p className="text-xs text-metal-gray">eVTOL 智能管理系统</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href || 
            (item.href !== '/' && pathname.startsWith(item.href));
          const Icon = item.icon;
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group',
                isActive
                  ? 'bg-electric-blue/20 text-electric-blue border border-electric-blue/30'
                  : 'text-metal-gray hover:text-white hover:bg-white/5 border border-transparent'
              )}
            >
              <Icon className={cn(
                'w-5 h-5 transition-colors',
                isActive ? 'text-electric-blue' : 'group-hover:text-electric-blue'
              )} />
              <span className="text-sm font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-3 border-t border-electric-blue/20">
        <div className="glass-card p-3">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 rounded-full bg-status-green pulse-dot"></div>
            <span className="text-xs text-status-green">系统运行正常</span>
          </div>
          <p className="text-xs text-metal-gray">v1.0.0 | 2026</p>
        </div>
      </div>
    </aside>
  );
}
