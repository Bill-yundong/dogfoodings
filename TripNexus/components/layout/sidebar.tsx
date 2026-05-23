'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { Map, Calendar, Route, Database, Settings, Home, BarChart3 } from 'lucide-react';
import { useUIStore } from '@/lib/store';
import { useState, useEffect } from 'react';

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
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      return mobile;
    };
    
    const handleResize = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      if (mobile && sidebarOpen) {
        setSidebarOpen(false);
      }
    };
    
    const mobile = checkMobile();
    if (mobile && sidebarOpen) {
      setSidebarOpen(false);
    }
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleNavClick = () => {
    if (isMobile) {
      setSidebarOpen(false);
    }
  };

  const sidebarContent = (
    <aside
      className={`sidebar h-full w-64 border-r flex flex-col bg-dark-50 dark:bg-dark-900 ${
        sidebarOpen ? '' : 'lg:w-20'
      } transition-all duration-300 ease-out`}
    >
      <div className="h-16 flex-shrink-0 flex items-center justify-center border-b border-dark-100 dark:border-dark-700">
        <div className="w-10 h-10 bg-gradient-primary rounded-xl flex items-center justify-center shadow-glow">
          <Map className="w-5 h-5 text-white" />
        </div>
        {sidebarOpen && (
          <span className="ml-3 text-xl font-display font-bold gradient-text">TripNexus</span>
        )}
      </div>

      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          
          return (
            <Link
              key={item.href}
              href={item.href}
              scroll={false}
              onClick={handleNavClick}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
                isActive
                  ? 'bg-gradient-primary text-white shadow-glow'
                  : 'text-dark-600 hover:bg-dark-100 hover:text-primary-600 dark:hover:bg-dark-800'
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
        <div className="flex-shrink-0 p-4 border-t border-dark-100 dark:border-dark-700">
          <div className="p-4 rounded-xl bg-gradient-to-br from-primary-50 to-accent-50 dark:from-primary-900/30 dark:to-accent-900/30">
            <p className="text-sm font-medium text-primary-700 dark:text-primary-400 mb-2">💡 使用提示</p>
            <p className="text-xs text-dark-500 dark:text-dark-400">
              即使在离线状态下，您也可以创建和编辑行程，系统会自动在恢复网络时同步。
            </p>
          </div>
        </div>
      )}
    </aside>
  );

  if (isMobile) {
    return (
      <>
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
            onClick={() => setSidebarOpen(false)}
          />
        )}
        
        <div
          className={`fixed top-0 left-0 h-full z-50 transform transition-transform duration-300 ease-out ${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          {sidebarContent}
        </div>
      </>
    );
  }

  return sidebarContent;
}
