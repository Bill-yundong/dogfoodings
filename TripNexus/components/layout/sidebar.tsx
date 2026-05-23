'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { Map, Calendar, Route, Database, Settings, Home, BarChart3 } from 'lucide-react';
import { useUIStore } from '@/lib/store';

const navItems = [
  { href: '/', label: '首页', icon: Home },
  { href: '/trips', label: '行程管理', icon: Map },
  { href: '/planner', label: '路径规划', icon: Route },
  { href: '/calendar', label: '日程同步', icon: Calendar },
  { href: '/scheduler', label: '调度引擎', icon: BarChart3 },
  { href: '/offline', label: '离线中心', icon: Database },
  { href: '/settings', label: '设置', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const { sidebarOpen, setSidebarOpen } = useUIStore();

  return (
    <>
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      
      <aside
        className={`fixed lg:sticky top-0 left-0 h-screen w-64 bg-white border-r border-dark-100 z-50 transform transition-transform duration-300 ease-out ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0 lg:w-20'
        }`}
      >
        <div className="h-16 flex items-center justify-center border-b border-dark-100">
          <div className="w-10 h-10 bg-gradient-primary rounded-xl flex items-center justify-center shadow-glow">
            <Map className="w-5 h-5 text-white" />
          </div>
          {sidebarOpen && (
            <span className="ml-3 text-xl font-display font-bold gradient-text">TripNexus</span>
          )}
        </div>

        <nav className="p-4 space-y-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
                  isActive
                    ? 'bg-gradient-primary text-white shadow-glow'
                    : 'text-dark-600 hover:bg-dark-50 hover:text-primary-600'
                }`}
              >
                <Icon className={`w-5 h-5 flex-shrink-0 ${isActive ? '' : 'group-hover:scale-110 transition-transform'}`} />
                {sidebarOpen && (
                  <motion.span
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="font-medium"
                  >
                    {item.label}
                  </motion.span>
                )}
                {isActive && sidebarOpen && (
                  <motion.div
                    layoutId="activeIndicator"
                    className="ml-auto w-2 h-2 bg-white rounded-full"
                  />
                )}
              </Link>
            );
          })}
        </nav>

        {sidebarOpen && (
          <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-dark-100">
            <div className="p-4 rounded-xl bg-gradient-to-br from-primary-50 to-accent-50">
              <p className="text-sm font-medium text-primary-700 mb-2">💡 使用提示</p>
              <p className="text-xs text-dark-500">
                即使在离线状态下，您也可以创建和编辑行程，系统会自动在恢复网络时同步。
              </p>
            </div>
          </div>
        )}
      </aside>
    </>
  );
}
