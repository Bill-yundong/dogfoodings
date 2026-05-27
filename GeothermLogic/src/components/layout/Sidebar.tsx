'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, ThermometerSun, TrendingDown, Database, RefreshCw, Settings } from 'lucide-react';

const navigation = [
  { name: '系统首页', href: '/', icon: LayoutDashboard },
  { name: '热平衡分析', href: '/thermal-balance', icon: ThermometerSun },
  { name: '热漂移预测', href: '/thermal-drift', icon: TrendingDown },
  { name: '换热孔管理', href: '/boreholes', icon: Database },
  { name: '数据同步', href: '/data-sync', icon: RefreshCw },
  { name: '系统设置', href: '/settings', icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-gray-900 border-r border-gray-800">
      <div className="p-6 border-b border-gray-800">
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <ThermometerSun className="w-6 h-6 text-primary-500" />
          GeothermLogic
        </h1>
        <p className="text-xs text-gray-400 mt-1">地热能源管理系统</p>
      </div>

      <nav className="p-4 space-y-1">
        {navigation.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                isActive
                  ? 'bg-primary-600 text-white shadow-lg shadow-primary-600/20'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-white'
              }`}
            >
              <item.icon className="w-5 h-5" />
              <span className="text-sm font-medium">{item.name}</span>
            </Link>
          );
        })}
      </nav>

      <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-800">
        <div className="bg-gray-800 rounded-lg p-4">
          <p className="text-xs text-gray-400 mb-2">系统状态</p>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-sm text-white">运行正常</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
