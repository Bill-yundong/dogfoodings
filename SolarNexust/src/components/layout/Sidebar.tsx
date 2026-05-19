import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { Sun, BarChart3, Wrench, Database, Settings, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const menuItems = [
  { icon: Sun, label: '仿真工作台', path: '/simulation' },
  { icon: BarChart3, label: '能效监控', path: '/monitoring' },
  { icon: Wrench, label: '运维管理', path: '/operation' },
  { icon: Database, label: '数据管理', path: '/data-manage' },
  { icon: Settings, label: '系统设置', path: '/settings' },
];

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  
  return (
    <motion.aside
      initial={{ width: 240 }}
      animate={{ width: collapsed ? 72 : 240 }}
      className="h-full bg-slate-900/80 backdrop-blur-xl border-r border-slate-700/50 flex flex-col"
    >
      <div className="p-4 border-b border-slate-700/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-400 to-emerald-500 flex items-center justify-center flex-shrink-0">
            <Sun className="text-white" size={22} />
          </div>
          <AnimatePresence mode="wait">
            {!collapsed && (
              <motion.div
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 'auto' }}
                exit={{ opacity: 0, width: 0 }}
                className="overflow-hidden"
              >
                <h1 className="text-lg font-bold text-white whitespace-nowrap">SolarNexus</h1>
                <p className="text-xs text-slate-400 whitespace-nowrap">光伏阵列仿真平台</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
      
      <nav className="flex-1 p-3 space-y-1">
        {menuItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => `
              flex items-center gap-3 px-3 py-3 rounded-xl transition-all
              ${isActive
                ? 'bg-cyan-500/20 text-cyan-400 shadow-lg shadow-cyan-500/10'
                : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'
              }
            `}
          >
            <item.icon size={20} className="flex-shrink-0" />
            <AnimatePresence mode="wait">
              {!collapsed && (
                <motion.span
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: 'auto' }}
                  exit={{ opacity: 0, width: 0 }}
                  className="text-sm font-medium whitespace-nowrap overflow-hidden"
                >
                  {item.label}
                </motion.span>
              )}
            </AnimatePresence>
          </NavLink>
        ))}
      </nav>
      
      <div className="p-3 border-t border-slate-700/50">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-slate-400 hover:bg-slate-800/50 hover:text-white transition-all"
        >
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          {!collapsed && <span className="text-sm">收起菜单</span>}
        </button>
      </div>
    </motion.aside>
  );
}
