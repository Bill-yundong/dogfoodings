'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Search, User, Wifi, WifiOff, X, AlertTriangle, CheckCircle, Info } from 'lucide-react';
import { useAppStore } from '@/store';

export function Header() {
  const router = useRouter();
  const { isConnected, currentPart, currentBatch } = useAppStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [showNotifications, setShowNotifications] = useState(false);

  const notifications = [
    { id: 1, type: 'warning', title: '表面粗糙度预警', message: '当前预测Ra接近阈值，请关注加工参数', time: '2分钟前' },
    { id: 2, type: 'success', title: '参数优化完成', message: '已生成新的进给参数优化方案', time: '15分钟前' },
    { id: 3, type: 'info', title: '模型更新', message: 'AI预测模型已自动更新至v1.2.0', time: '1小时前' },
  ];

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/fingerprint?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'warning': return <AlertTriangle className="w-4 h-4 text-warning-400" />;
      case 'success': return <CheckCircle className="w-4 h-4 text-accent-400" />;
      default: return <Info className="w-4 h-4 text-primary-400" />;
    }
  };

  return (
    <motion.header
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="fixed top-0 right-0 left-72 h-16 backdrop-blur-xl border-b z-30 flex items-center justify-between px-6"
      style={{
        backgroundColor: 'color-mix(in srgb, var(--bg-secondary) 80%, transparent)',
        borderBottomColor: 'var(--border-color)',
      }}
    >
      <div className="flex items-center gap-6">
        <div>
          <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>当前加工</h2>
          <div className="flex items-center gap-4 text-xs" style={{ color: 'var(--text-secondary)' }}>
            <span>零件: {currentPart}</span>
            <span>批次: {currentBatch}</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <form onSubmit={handleSearch} className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-tertiary)' }} />
          <input
            type="text"
            placeholder="搜索零件、批次..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-64 pl-9 pr-4 py-2 border rounded-lg text-sm focus:outline-none focus:border-primary-500/50 focus:ring-1 focus:ring-primary-500/30 transition-all"
            style={{
              backgroundColor: 'color-mix(in srgb, var(--bg-tertiary) 50%, transparent)',
              borderColor: 'color-mix(in srgb, var(--border-color) 50%, transparent)',
              color: 'var(--text-primary)',
            }}
          />
        </form>

        <div
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg"
          style={{ backgroundColor: 'color-mix(in srgb, var(--bg-tertiary) 50%, transparent)' }}
        >
          {isConnected ? (
            <Wifi className="w-4 h-4 text-accent-400" />
          ) : (
            <WifiOff className="w-4 h-4 text-warning-400" />
          )}
          <span className={`text-xs font-medium ${isConnected ? 'text-accent-400' : 'text-warning-400'}`}>
            {isConnected ? '已连接' : '断开连接'}
          </span>
        </div>

        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2 rounded-lg transition-colors"
            style={{ backgroundColor: 'transparent' }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'color-mix(in srgb, var(--bg-tertiary) 50%, transparent)')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
          >
            <Bell className="w-5 h-5" style={{ color: 'var(--text-secondary)' }} />
            <span className="absolute top-1 right-1 w-2 h-2 bg-warning-400 rounded-full" />
          </button>

          <AnimatePresence>
            {showNotifications && (
              <motion.div
                initial={{ opacity: 0, y: -10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 top-full mt-2 w-80 glass-card p-4 z-50"
              >
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>通知</h3>
                  <button
                    onClick={() => setShowNotifications(false)}
                    className="p-1 rounded transition-colors"
                    style={{ backgroundColor: 'transparent' }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'color-mix(in srgb, var(--bg-tertiary) 50%, transparent)')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    <X className="w-4 h-4" style={{ color: 'var(--text-tertiary)' }} />
                  </button>
                </div>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {notifications.map((notif) => (
                    <div
                      key={notif.id}
                      className="p-3 rounded-lg transition-colors cursor-pointer"
                      style={{ backgroundColor: 'color-mix(in srgb, var(--bg-tertiary) 30%, transparent)' }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'color-mix(in srgb, var(--bg-tertiary) 50%, transparent)')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'color-mix(in srgb, var(--bg-tertiary) 30%, transparent)')}
                    >
                      <div className="flex items-start gap-2">
                        {getNotificationIcon(notif.type)}
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{notif.title}</div>
                          <div className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>{notif.message}</div>
                          <div className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>{notif.time}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="flex items-center gap-3 pl-4" style={{ borderLeftColor: 'var(--border-color)' }}>
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center">
            <User className="w-4 h-4 text-white" />
          </div>
          <div className="hidden sm:block">
            <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>工程师</div>
            <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>工艺管理员</div>
          </div>
        </div>
      </div>
    </motion.header>
  );
}
