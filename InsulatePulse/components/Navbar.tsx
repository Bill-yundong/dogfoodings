'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export function Navbar() {
  const pathname = usePathname();

  const navItems = [
    { path: '/', label: '监控面板', icon: '📊' },
    { path: '/insulators', label: '设备管理', icon: '⚡' },
    { path: '/maintenance', label: '检修任务', icon: '🔧' },
    { path: '/analytics', label: '数据分析', icon: '📈' },
    { path: '/sync', label: '系统同步', icon: '🔄' },
  ];

  return (
    <nav className="bg-primary-700 text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-2">
            <span className="text-2xl">⚡</span>
            <span className="text-xl font-bold">InsulatePulse</span>
            <span className="text-sm opacity-75">特高压绝缘子污闪预警</span>
          </div>
          
          <div className="flex space-x-1">
            {navItems.map((item) => (
              <Link
                key={item.path}
                href={item.path}
                className={`px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors ${
                  pathname === item.path
                    ? 'bg-primary-600 text-white'
                    : 'hover:bg-primary-600 text-primary-100'
                }`}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </nav>
  );
}