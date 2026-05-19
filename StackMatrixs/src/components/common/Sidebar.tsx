import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  Bot,
  Warehouse,
  BarChart3,
  Settings,
  Bell,
  X,
} from 'lucide-react';
import { useWarehouseStore } from '@/store/useWarehouseStore';
import { classNames } from '@/utils/formatters';
import { formatRelativeTime } from '@/utils/formatters';

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
  const { alerts, markAlertRead } = useWarehouseStore();
  const [showAlerts, setShowAlerts] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const unreadCount = alerts.filter((a) => !a.read).length;

  return (
    <>
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
          <button
            onClick={() => setShowAlerts(true)}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg bg-wms-bg/50 hover:bg-wms-bg transition-colors cursor-pointer"
          >
            <div className="relative">
              <Bell className="w-5 h-5 text-wms-subtext" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-wms-danger text-white text-xs rounded-full flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </div>
            {!collapsed && (
              <div className="flex-1 text-left">
                <p className="text-sm text-wms-text">{unreadCount} 条未读</p>
              </div>
            )}
          </button>

          {!collapsed && (
            <button
              onClick={() => setShowSettings(true)}
              className="w-full mt-3 flex items-center gap-3 px-3 py-2 rounded-lg text-wms-subtext hover:text-wms-text hover:bg-wms-bg/50 transition-colors cursor-pointer"
            >
              <Settings className="w-5 h-5" />
              <span className="font-medium text-sm">系统设置</span>
            </button>
          )}
        </div>
      </aside>

      {showAlerts && (
        <div className="fixed inset-0 bg-black/30 z-40" onClick={() => setShowAlerts(false)}>
          <div
            className="fixed left-60 bottom-3 w-80 bg-wms-panel border border-wms-border rounded-xl shadow-2xl overflow-hidden z-50"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-4 py-3 border-b border-wms-border flex items-center justify-between">
              <h3 className="font-semibold text-wms-text">告警通知</h3>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button
                    onClick={() => alerts.forEach((a) => markAlertRead(a.id))}
                    className="text-xs text-wms-primary hover:underline"
                  >
                    全部已读
                  </button>
                )}
                <button onClick={() => setShowAlerts(false)} className="text-wms-subtext hover:text-wms-text">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="max-h-80 overflow-y-auto wms-scrollbar">
              {alerts.length === 0 ? (
                <div className="px-4 py-8 text-center text-wms-subtext text-sm">
                  暂无告警
                </div>
              ) : (
                alerts.slice(0, 10).map((alert) => (
                  <div
                    key={alert.id}
                    className="px-4 py-3 border-b border-wms-border/50 hover:bg-wms-bg/50 cursor-pointer transition-colors"
                    onClick={() => markAlertRead(alert.id)}
                  >
                    <div className="flex items-start gap-2">
                      <span
                        className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                          alert.type === 'danger'
                            ? 'bg-wms-danger'
                            : alert.type === 'warning'
                            ? 'bg-wms-warning'
                            : alert.type === 'success'
                            ? 'bg-wms-success'
                            : 'bg-wms-primary'
                        }`}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-wms-text truncate">
                          {alert.title}
                        </p>
                        <p className="text-xs text-wms-subtext mt-0.5 truncate">
                          {alert.message}
                        </p>
                        <p className="text-xs text-wms-subtext mt-1">
                          {formatRelativeTime(alert.timestamp)}
                        </p>
                      </div>
                      {!alert.read && (
                        <span className="w-2 h-2 bg-wms-primary rounded-full flex-shrink-0" />
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {showSettings && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowSettings(false)}>
          <div
            className="bg-wms-panel border border-wms-border rounded-xl p-6 w-full max-w-md shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-wms-text">系统设置</h3>
              <button onClick={() => setShowSettings(false)} className="text-wms-subtext hover:text-wms-text">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div className="p-4 bg-wms-bg/50 rounded-lg">
                <p className="text-sm font-medium text-wms-text">分配策略权重</p>
                <div className="mt-3 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-wms-subtext">流动性权重</span>
                    <span className="text-wms-text">30%</span>
                  </div>
                  <div className="w-full h-1.5 bg-wms-panel rounded-full overflow-hidden">
                    <div className="h-full w-[30%] bg-wms-primary rounded-full" />
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-wms-subtext">关联度权重</span>
                    <span className="text-wms-text">25%</span>
                  </div>
                  <div className="w-full h-1.5 bg-wms-panel rounded-full overflow-hidden">
                    <div className="h-full w-[25%] bg-wms-success rounded-full" />
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-wms-subtext">空间利用率权重</span>
                    <span className="text-wms-text">25%</span>
                  </div>
                  <div className="w-full h-1.5 bg-wms-panel rounded-full overflow-hidden">
                    <div className="h-full w-[25%] bg-wms-warning rounded-full" />
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-wms-subtext">距离权重</span>
                    <span className="text-wms-text">20%</span>
                  </div>
                  <div className="w-full h-1.5 bg-wms-panel rounded-full overflow-hidden">
                    <div className="h-full w-[20%] bg-wms-accent rounded-full" />
                  </div>
                </div>
              </div>
              <div className="p-4 bg-wms-bg/50 rounded-lg">
                <p className="text-sm font-medium text-wms-text">碎片整理阈值</p>
                <div className="mt-2 text-xs text-wms-subtext">
                  <p>• 高优先级：碎片化指数 {'≥'} 30%</p>
                  <p>• 中优先级：碎片化指数 15% ~ 30%</p>
                  <p>• 低优先级：碎片化指数 {'<'} 15%</p>
                </div>
              </div>
              <div className="p-4 bg-wms-bg/50 rounded-lg">
                <p className="text-sm font-medium text-wms-text">系统信息</p>
                <div className="mt-2 text-xs text-wms-subtext space-y-1">
                  <p>版本：v1.0.0</p>
                  <p>最后更新：2026-05-19</p>
                  <p>数据刷新间隔：3秒</p>
                </div>
              </div>
            </div>
            <div className="flex justify-end mt-6">
              <button
                onClick={() => setShowSettings(false)}
                className="px-4 py-2 bg-wms-primary text-white rounded-lg hover:bg-wms-primary/80 transition-colors"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
