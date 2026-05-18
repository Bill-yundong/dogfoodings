import { LayoutDashboard, Package, Truck, Database, BarChart3, Settings, Layers } from 'lucide-react';
import { motion } from 'framer-motion';

interface NavItem {
  id: string;
  label: string;
  icon: typeof LayoutDashboard;
}

const navItems: NavItem[] = [
  { id: 'dashboard', label: '仪表盘', icon: LayoutDashboard },
  { id: 'location', label: '货位分配', icon: Layers },
  { id: 'stacker', label: '堆垛机控制', icon: Truck },
  { id: 'defrag', label: '碎片整理', icon: Database },
  { id: 'sku', label: 'SKU 管理', icon: Package },
  { id: 'analytics', label: '效率分析', icon: BarChart3 },
];

interface SidebarProps {
  currentPage: string;
  onPageChange: (page: string) => void;
}

export default function Sidebar({ currentPage, onPageChange }: SidebarProps) {
  return (
    <motion.aside
      initial={{ x: -280 }}
      animate={{ x: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="w-64 bg-surface border-r border-surface-border h-screen fixed left-0 top-0 flex flex-col z-50"
    >
      <div className="p-6 border-b border-surface-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-primary to-primary-dark rounded-lg flex items-center justify-center glow-primary">
            <Layers className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-text-primary">StackMatrix</h1>
            <p className="text-xs text-text-muted">智能仓储管理系统</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        {navItems.map((item, index) => {
          const Icon = item.icon;
          const isActive = currentPage === item.id;
          
          return (
            <motion.button
              key={item.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              onClick={() => onPageChange(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-300 group ${
                isActive
                  ? 'bg-primary/20 text-primary shadow-lg shadow-primary/10'
                  : 'text-text-secondary hover:bg-surface-hover hover:text-text-primary'
              }`}
            >
              <Icon className={`w-5 h-5 transition-transform duration-300 ${
                isActive ? 'scale-110' : 'group-hover:scale-110'
              }`} />
              <span className="font-medium text-sm">{item.label}</span>
              {isActive && (
                <motion.div
                  layoutId="activeIndicator"
                  className="ml-auto w-2 h-2 rounded-full bg-primary animate-pulse"
                />
              )}
            </motion.button>
          );
        })}
      </nav>

      <div className="p-4 border-t border-surface-border">
        <div className="bg-background rounded-lg p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 bg-gradient-to-br from-accent-amber to-accent-amber/50 rounded-full flex items-center justify-center">
              <Settings className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-sm font-medium text-text-primary">系统状态</p>
              <p className="text-xs text-text-muted">运行正常</p>
            </div>
            <div className="ml-auto">
              <span className="status-dot status-running" />
            </div>
          </div>
          <div className="text-xs text-text-muted">
            <p>v1.0.0 | 数据同步正常</p>
          </div>
        </div>
      </div>
    </motion.aside>
  );
}
