'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Activity, Gauge, Database, Settings, Play, Square, Zap } from 'lucide-react';
import { useMonitoringStore, startDataSimulation, stopDataSimulation } from '@/store';
import StatusIndicator from './StatusIndicator';

const navItems = [
  { href: '/dashboard', label: '监控面板', icon: Gauge },
  { href: '/analysis', label: '波形分析', icon: Activity },
  { href: '/welds', label: '焊点数据', icon: Database },
  { href: '/settings', label: '系统配置', icon: Settings },
];

export default function Navbar() {
  const pathname = usePathname();
  const { isRunning, robotStatuses } = useMonitoringStore();

  const handleToggleMonitoring = () => {
    if (isRunning) {
      stopDataSimulation();
    } else {
      startDataSimulation();
    }
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-industrial-950/90 backdrop-blur-md border-b border-industrial-800">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-8">
            <Link href="/dashboard" className="flex items-center gap-2">
              <div className="p-2 bg-industrial-800 rounded-lg">
                <Zap className="w-6 h-6 text-tech-cyan" />
              </div>
              <span className="text-lg font-bold text-white">TankNexus</span>
              <span className="text-xs text-tech-cyan bg-tech-cyan/10 px-2 py-0.5 rounded">WMS</span>
            </Link>

            <div className="hidden md:flex items-center gap-1">
              {navItems.map((item) => {
                const isActive = pathname === item.href;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      isActive
                        ? 'bg-industrial-800 text-tech-cyan'
                        : 'text-gray-400 hover:text-white hover:bg-industrial-800/50'
                    }`}
                  >
                    <Icon size={18} />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden lg:flex items-center gap-4">
              {Object.entries(robotStatuses).map(([robotId, status]) => (
                <div key={robotId} className="flex items-center gap-2">
                  <StatusIndicator status={status} size="sm" />
                  <span className="text-xs text-gray-400 font-mono">{robotId}</span>
                </div>
              ))}
            </div>

            <button
              onClick={handleToggleMonitoring}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                isRunning
                  ? 'bg-tech-red/20 text-tech-red hover:bg-tech-red/30'
                  : 'bg-tech-green/20 text-tech-green hover:bg-tech-green/30'
              }`}
            >
              {isRunning ? (
                <>
                  <Square size={16} fill="currentColor" />
                  停止监控
                </>
              ) : (
                <>
                  <Play size={16} fill="currentColor" />
                  开始监控
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
