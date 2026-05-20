'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  Send,
  LineChart,
  Database,
  Settings,
  Menu,
  X,
  LogOut,
  User,
  Activity,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { useGasMatrixStore } from '@/store';
import { cn } from '@/utils';

interface LayoutProps {
  children: React.ReactNode;
}

const navItems = [
  { path: '/dashboard', label: '实时监控', icon: LayoutDashboard },
  { path: '/commands', label: '指令中心', icon: Send },
  { path: '/prediction', label: '管存预测', icon: LineChart },
  { path: '/history', label: '历史数据', icon: Database },
  { path: '/settings', label: '系统设置', icon: Settings },
];

export default function Layout({ children }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { user, isConnected, logout } = useGasMatrixStore();

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  return (
    <div className="min-h-screen bg-dark-950 text-dark-100">
      <div className="fixed inset-0 bg-grid-pattern bg-[size:50px_50px] pointer-events-none opacity-30" />
      
      <aside
        className={cn(
          'fixed left-0 top-0 h-full z-40 transition-all duration-300 bg-dark-900/95 backdrop-blur-lg border-r border-dark-700/50',
          sidebarOpen ? 'w-64' : 'w-20'
        )}
      >
        <div className="flex items-center justify-between p-4 border-b border-dark-700/50">
          <AnimatePresence mode="wait">
            {sidebarOpen && (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="flex items-center gap-3"
              >
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center">
                  <Activity className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="font-bold text-lg text-primary-400">GasMatrix</h1>
                  <p className="text-xs text-dark-400">管网动态平衡系统</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 rounded-lg hover:bg-dark-700/50 transition-colors"
          >
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        <nav className="p-4 space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.path;
            return (
              <Link
                key={item.path}
                href={item.path}
                className={cn(
                  'flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200',
                  isActive
                    ? 'bg-primary-600/20 text-primary-400 border border-primary-500/30'
                    : 'hover:bg-dark-700/50 text-dark-300 hover:text-dark-100'
                )}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                <AnimatePresence mode="wait">
                  {sidebarOpen && (
                    <motion.span
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                      className="whitespace-nowrap"
                    >
                      {item.label}
                    </motion.span>
                  )}
                </AnimatePresence>
              </Link>
            );
          })}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-dark-700/50">
          <div className="flex items-center gap-2 px-4 py-2">
            {isConnected ? (
              <Wifi className="w-4 h-4 text-success-500" />
            ) : (
              <WifiOff className="w-4 h-4 text-danger-500" />
            )}
            <AnimatePresence mode="wait">
              {sidebarOpen && (
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className={cn(
                    'text-sm',
                    isConnected ? 'text-success-400' : 'text-danger-400'
                  )}
                >
                  {isConnected ? '实时连接' : '连接断开'}
                </motion.span>
              )}
            </AnimatePresence>
          </div>
        </div>
      </aside>

      <div
        className={cn(
          'transition-all duration-300',
          sidebarOpen ? 'ml-64' : 'ml-20'
        )}
      >
        <header className="sticky top-0 z-30 h-16 bg-dark-900/80 backdrop-blur-lg border-b border-dark-700/50 flex items-center justify-between px-6">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-semibold">
              {navItems.find((item) => item.path === pathname)?.label || 'GasMatrix'}
            </h2>
          </div>

          <div className="flex items-center gap-4">
            <div className="relative">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-dark-700/50 transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center">
                  <User className="w-4 h-4 text-white" />
                </div>
                <span className="text-sm">{user?.name || '用户'}</span>
              </button>

              <AnimatePresence>
                {userMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute right-0 top-full mt-2 w-48 bg-dark-800 border border-dark-700 rounded-lg shadow-xl overflow-hidden"
                  >
                    <div className="p-3 border-b border-dark-700">
                      <p className="font-medium text-dark-100">{user?.name}</p>
                      <p className="text-xs text-dark-400">{user?.role}</p>
                    </div>
                    <button
                      onClick={handleLogout}
                      className="w-full px-3 py-2 text-left text-sm text-danger-400 hover:bg-dark-700/50 flex items-center gap-2"
                    >
                      <LogOut className="w-4 h-4" />
                      退出登录
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </header>

        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}
