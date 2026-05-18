'use client';

import { motion } from 'framer-motion';
import { Bell, Search, User, Wifi, WifiOff } from 'lucide-react';
import { useAppStore } from '@/store';

export function Header() {
  const { isConnected, currentPart, currentBatch } = useAppStore();

  return (
    <motion.header
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="fixed top-0 right-0 left-72 h-16 bg-dark-800/80 backdrop-blur-xl border-b border-dark-700/50 z-30 flex items-center justify-between px-6"
    >
      <div className="flex items-center gap-6">
        <div>
          <h2 className="text-lg font-semibold text-white">当前加工</h2>
          <div className="flex items-center gap-4 text-xs text-dark-400">
            <span>零件: {currentPart}</span>
            <span>批次: {currentBatch}</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-dark-500" />
          <input
            type="text"
            placeholder="搜索零件、批次..."
            className="w-64 pl-9 pr-4 py-2 bg-dark-700/50 border border-dark-600/50 rounded-lg text-sm text-dark-200 placeholder-dark-500 focus:outline-none focus:border-primary-500/50 focus:ring-1 focus:ring-primary-500/30 transition-all"
          />
        </div>

        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-dark-700/50">
          {isConnected ? (
            <Wifi className="w-4 h-4 text-accent-400" />
          ) : (
            <WifiOff className="w-4 h-4 text-warning-400" />
          )}
          <span className={`text-xs font-medium ${isConnected ? 'text-accent-400' : 'text-warning-400'}`}>
            {isConnected ? '已连接' : '断开连接'}
          </span>
        </div>

        <button className="relative p-2 rounded-lg hover:bg-dark-700/50 transition-colors">
          <Bell className="w-5 h-5 text-dark-300" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-warning-400 rounded-full" />
        </button>

        <div className="flex items-center gap-3 pl-4 border-l border-dark-700">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center">
            <User className="w-4 h-4 text-white" />
          </div>
          <div className="hidden sm:block">
            <div className="text-sm font-medium text-white">工程师</div>
            <div className="text-xs text-dark-500">工艺管理员</div>
          </div>
        </div>
      </div>
    </motion.header>
  );
}
