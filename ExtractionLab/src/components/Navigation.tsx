'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  Coffee,
  Home,
  FlaskConical,
  Store,
  BarChart3,
  Settings,
  Bell,
  Search,
  RefreshCw,
} from 'lucide-react';
import { Badge } from './ui/Card';
import { useState, useEffect } from 'react';
import { syncEngine } from '@/lib/syncEngine';

const navItems = [
  {
    href: '/',
    label: '控制中心',
    icon: Home,
  },
  {
    href: '/rnd',
    label: '研发中心',
    icon: FlaskConical,
  },
  {
    href: '/stores',
    label: '门店系统',
    icon: Store,
  },
  {
    href: '/analytics',
    label: '数据分析',
    icon: BarChart3,
  },
];

export function Navigation() {
  const pathname = usePathname();
  const [syncStatus, setSyncStatus] = useState<{
    pending: number;
    completed: number;
    failed: number;
  } | null>(null);

  useEffect(() => {
    const updateStatus = async () => {
      try {
        const status = await syncEngine.getSyncStatus();
        setSyncStatus(status);
      } catch (e) {
        // IndexedDB not ready yet
      }
    };

    updateStatus();
    const interval = setInterval(updateStatus, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleSync = async () => {
    try {
      await syncEngine.forceSync();
      const status = await syncEngine.getSyncStatus();
      setSyncStatus(status);
    } catch (e) {
      console.error('Sync failed:', e);
    }
  };

  return (
    <nav className="bg-white border-b border-coffee-100 sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-coffee-600 to-coffee-800 rounded-xl flex items-center justify-center shadow-lg shadow-coffee-700/20">
                <Coffee className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-coffee-700 to-coffee-500 bg-clip-text text-transparent">
                  ExtractionLab
                </h1>
                <p className="text-xs text-coffee-500 -mt-0.5">精品咖啡萃取品质管理系统</p>
              </div>
            </Link>

            <div className="hidden md:flex items-center gap-1">
              {navItems.map(item => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200',
                      isActive
                        ? 'bg-gradient-to-r from-coffee-100 to-amber-50 text-coffee-800 shadow-sm'
                        : 'text-coffee-600 hover:text-coffee-800 hover:bg-coffee-50'
                    )}
                  >
                    <Icon className="w-4 h-4" />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative hidden md:block">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-coffee-400" />
              <input
                type="text"
                placeholder="搜索配方、门店、实验..."
                className="w-64 pl-10 pr-4 py-2 bg-coffee-50 border border-coffee-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-coffee-500 focus:border-transparent transition-all"
              />
            </div>

            <button
              onClick={handleSync}
              className="relative p-2 rounded-xl hover:bg-coffee-50 transition-colors group"
              title="同步数据"
            >
              <RefreshCw className="w-5 h-5 text-coffee-600 group-hover:text-coffee-800" />
              {syncStatus && syncStatus.pending > 0 && (
                <Badge
                  size="sm"
                  variant="warning"
                  className="absolute -top-1 -right-1 min-w-[18px] h-[18px] justify-center px-1"
                >
                  {syncStatus.pending}
                </Badge>
              )}
            </button>

            <button className="relative p-2 rounded-xl hover:bg-coffee-50 transition-colors">
              <Bell className="w-5 h-5 text-coffee-600" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
            </button>

            <button className="p-2 rounded-xl hover:bg-coffee-50 transition-colors">
              <Settings className="w-5 h-5 text-coffee-600" />
            </button>

            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-coffee-400 to-coffee-600 flex items-center justify-center text-white font-medium text-sm shadow-md">
              管
            </div>
          </div>
        </div>
      </div>

      <div className="md:hidden border-t border-coffee-100 px-4 py-2">
        <div className="flex justify-around">
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex flex-col items-center gap-1 px-4 py-2 rounded-xl text-xs font-medium transition-all',
                  isActive
                    ? 'text-coffee-800 bg-coffee-50'
                    : 'text-coffee-500'
                )}
              >
                <Icon className="w-5 h-5" />
                {item.label}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
