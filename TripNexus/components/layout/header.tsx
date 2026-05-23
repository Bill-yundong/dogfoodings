'use client';

import { useRouter } from 'next/navigation';
import { Menu, Map, Wifi, WifiOff, Cloud, CloudOff, Settings, Bell } from 'lucide-react';
import { useUIStore, useOfflineStore } from '@/lib/store';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';

export function Header() {
  const router = useRouter();
  const { toggleSidebar, showToast } = useUIStore();
  const { isOnline, networkLatency, syncStatus, lastSyncTime, pendingOperations } = useOfflineStore();

  const getSyncStatusIcon = () => {
    switch (syncStatus) {
      case 'syncing':
        return <Cloud className="w-4 h-4 text-primary-500 animate-pulse" />;
      case 'error':
        return <CloudOff className="w-4 h-4 text-red-500" />;
      default:
        return isOnline ? <Cloud className="w-4 h-4 text-green-500" /> : <CloudOff className="w-4 h-4 text-yellow-500" />;
    }
  };

  const getSyncStatusText = () => {
    if (syncStatus === 'syncing') return '同步中...';
    if (syncStatus === 'error') return '同步失败';
    if (!isOnline) return '离线模式';
    if (pendingOperations > 0) return `${pendingOperations} 项待同步`;
    if (lastSyncTime) return `最后同步 ${format(lastSyncTime, 'HH:mm', { locale: zhCN })}`;
    return '已同步';
  };

  return (
    <header className="header h-16 flex-shrink-0 backdrop-blur-lg border-b flex items-center justify-between px-6 bg-dark-50 dark:bg-dark-900">
      <div className="flex items-center gap-4">
        <button
          onClick={toggleSidebar}
          className="header-icon p-2 rounded-xl transition-colors lg:hidden"
        >
          <Menu className="w-5 h-5" />
        </button>
        
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-primary rounded-xl flex items-center justify-center shadow-glow">
            <Map className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-display font-bold gradient-text">TripNexus</h1>
            <p className="text-xs text-dark-400 dark:text-dark-500">智能多目的地旅行规划</p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="hidden md:flex items-center gap-2 px-3 py-2 rounded-xl bg-dark-50 dark:bg-dark-700">
          {isOnline ? (
            <Wifi className="w-4 h-4 text-green-500" />
          ) : (
            <WifiOff className="w-4 h-4 text-red-500" />
          )}
          <span className="text-sm text-dark-600 dark:text-dark-300">
            {isOnline ? `在线 ${networkLatency > 0 ? `(${networkLatency}ms)` : ''}` : '离线'}
          </span>
        </div>

        <div className="hidden md:flex items-center gap-2 px-3 py-2 rounded-xl bg-dark-50 dark:bg-dark-700 cursor-help" title={getSyncStatusText()}>
          {getSyncStatusIcon()}
          <span className="text-sm text-dark-600 dark:text-dark-300">{getSyncStatusText()}</span>
        </div>

        <button
          onClick={() => {
            if (pendingOperations > 0) {
              showToast('info', `有 ${pendingOperations} 项操作待同步`);
            } else {
              showToast('info', '暂无待处理通知');
            }
          }}
          className="header-icon relative p-2 rounded-xl transition-colors"
        >
          <Bell className="w-5 h-5" />
          {pendingOperations > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-accent-500 text-white text-xs font-medium rounded-full flex items-center justify-center">
              {pendingOperations}
            </span>
          )}
        </button>

        <button
          onClick={() => router.push('/settings')}
          className="header-icon p-2 rounded-xl transition-colors"
        >
          <Settings className="w-5 h-5" />
        </button>
      </div>
    </header>
  );
}
