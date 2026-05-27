'use client';

import { Bell, User, RefreshCw, X } from 'lucide-react';
import { useAppStore } from '@/store/use-app-store';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { useState } from 'react';

export default function Header() {
  const { systemStats, refreshSystemStats } = useAppStore();
  const [showNotifications, setShowNotifications] = useState(false);

  const notifications = [
    { id: 1, type: 'warning', title: '热漂移预警', message: 'BH-0876 号换热孔热饱和度下降至 65%', time: '5分钟前' },
    { id: 2, type: 'info', title: '数据同步完成', message: '系统运维与建筑节能系统数据同步完成', time: '30分钟前' },
    { id: 3, type: 'success', title: '系统状态正常', message: '所有换热孔运行状态正常', time: '1小时前' },
  ];

  const typeStyles = {
    warning: 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30',
    info: 'bg-blue-500/20 text-blue-500 border-blue-500/30',
    success: 'bg-green-500/20 text-green-500 border-green-500/30',
  };

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

          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
              aria-label="消息通知"
              title="消息通知"
            >
              <Bell className="w-5 h-5" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-accent-500 rounded-full" />
            </button>

            {showNotifications && (
              <div className="absolute right-0 top-full mt-2 w-80 bg-gray-800 rounded-lg border border-gray-700 shadow-xl z-50">
                <div className="flex items-center justify-between p-4 border-b border-gray-700">
                  <h3 className="text-sm font-semibold text-white">消息通知</h3>
                  <button
                    onClick={() => setShowNotifications(false)}
                    className="p-1 text-gray-400 hover:text-white rounded hover:bg-gray-700"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`p-4 border-b border-gray-700/50 last:border-b-0 hover:bg-gray-700/30 transition-colors`}
                    >
                      <div className="flex items-start gap-3">
                        <span className={`px-2 py-0.5 rounded text-xs border ${typeStyles[notification.type as keyof typeof typeStyles]}`}>
                          {notification.type === 'warning' ? '警告' : notification.type === 'info' ? '通知' : '成功'}
                        </span>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-white">{notification.title}</p>
                          <p className="text-xs text-gray-400 mt-1">{notification.message}</p>
                          <p className="text-xs text-gray-500 mt-2">{notification.time}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

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
