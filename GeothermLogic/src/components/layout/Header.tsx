'use client';

import { Bell, User, RefreshCw } from 'lucide-react';
import { useAppStore } from '@/store/use-app-store';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';

export default function Header() {
  const { systemStats, refreshSystemStats } = useAppStore();

  return (
    <header className="sticky top-0 z-40 bg-gray-900/80 backdrop-blur-md border-b border-gray-800">
      <div className="flex items-center justify-between px-8 py-4">
        <div>
          <h2 className="text-lg font-semibold text-white">地热能源管理系统</h2>
          <p className="text-xs text-gray-400">
            最后更新: {format(new Date(systemStats.lastUpdateTime), 'yyyy-MM-dd HH:mm:ss', { locale: zhCN })}
          </p>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={refreshSystemStats}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
            title="刷新数据"
          >
            <RefreshCw className="w-5 h-5" />
          </button>

          <button className="relative p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors">
            <Bell className="w-5 h-5" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-accent-500 rounded-full" />
          </button>

          <div className="flex items-center gap-3 pl-4 border-l border-gray-800">
            <div className="w-9 h-9 rounded-full bg-primary-600 flex items-center justify-center">
              <User className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-sm font-medium text-white">管理员</p>
              <p className="text-xs text-gray-400">系统管理员</p>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
