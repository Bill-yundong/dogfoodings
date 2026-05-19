import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  Bot,
  Warehouse,
  BarChart3,
  Settings,
  Bell,
} from 'lucide-react';
import { useWarehouseStore } from '@/store/useWarehouseStore';
import { classNames } from '@/utils/formatters';

interface SidebarProps {
  collapsed?: boolean;
}

const navItems = [
  { path: '/dashboard', label: '综合仪表盘', icon: LayoutDashboard },
  { path: '/allocation', label: '货位分配', icon: Package },
  { path: '/stacker', label: '堆垛机监控', icon: Bot },
  { path: '/space', label: '空间管理', icon: Warehouse },
  { path: '/sku', label: 'SKU 分析', icon: BarChart3 },
];

export const Sidebar: React.FC<SidebarProps> = ({ collapsed = false }) => {
  const { alerts } = useWarehouseStore();
  const unreadCount = alerts.filter((a) => !a.read).length;

  return (
    <aside
      className={classNames(
        'h-screen bg-wms-panel border-r border-wms-border flex flex-col transition-all duration-300',
        collapsed ? 'w-16' : 'w-60'
      )}
    >
      <div className="h-16 flex items-center px-4 border-b border-wms-border">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-wms-primary to-wms-accent flex items-center justify-center">
            <Warehouse className="w-5 h-5 text-white" />
          </div>
          {!collapsed && (
            <div>
              <h1 className="font-display font-bold text-lg text-gradient">WMS</h1>
              <p className="text-xs text-wms-subtext">智能仓储系统</p>
            </div>
          )}
        </div>
      </div>

      <nav className="flex-1 py-4 px-2 overflow-y-auto wms-scrollbar">
        <ul className="space-y-1">
          {navItems.map((item) => (
            <li key={item.path}>
              <NavLink
                to={item.path}
                className={({ isActive }) =>
                  classNames(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group',
                    isActive
                      ? 'bg-wms-primary/15 text-wms-primary'
                      : 'text-wms-subtext hover:text-wms-text hover:bg-wms-bg/50'
                  )
                }
              >
                <item.icon className="w-5 h-5 flex-shrink-0" />
                {!collapsed && <span className="font-medium text-sm">{item.label}</span>}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <div className="border-t border-wms-border p-3">
        <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-wms-bg/50">
          <div className="relative">
            <Bell className="w-5 h-5 text-wms-subtext" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-wms-danger text-white text-xs rounded-full flex items-center justify-center">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </div>
          {!collapsed && (
            <div className="flex-1">
              <p className="text-sm text-wms-text">{unreadCount} 条未读</p>
            </div>
          )}
        </div>

        {!collapsed && (
          <div className="mt-3 flex items-center gap-3 px-3 py-2 rounded-lg text-wms-subtext hover:text-wms-text hover:bg-wms-bg/50 cursor-pointer transition-colors">
            <Settings className="w-5 h-5" />
            <span className="font-medium text-sm">系统设置</span>
          </div>
        )}
      </div>
    </aside>
  );
};
