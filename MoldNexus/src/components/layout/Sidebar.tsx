import { Component } from 'solid-js';
import { A, useLocation } from '@solidjs/router';
import {
  LayoutDashboard,
  Beaker,
  Database,
  ArrowRightLeft,
  Users,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
} from 'lucide-solid';
import { useAppStore } from '@/stores/appStore';

const menuItems = [
  { path: '/', icon: LayoutDashboard, label: '仪表盘' },
  { path: '/simulation', icon: Beaker, label: '模拟工作台' },
  { path: '/parameters', icon: Database, label: '参数管理' },
  { path: '/mapping', icon: ArrowRightLeft, label: '语义映射' },
  { path: '/collaboration', icon: Users, label: '协作中心' },
  { path: '/analytics', icon: BarChart3, label: '分析报告' },
  { path: '/settings', icon: Settings, label: '系统设置' },
];

const Sidebar: Component = () => {
  const location = useLocation();
  const { state, toggleSidebar } = useAppStore();

  return (
    <aside
      class={`fixed left-0 top-14 bottom-0 bg-dark-200 border-r border-dark-100 transition-all duration-300 z-40 ${
        state.sidebarCollapsed ? 'w-16' : 'w-64'
      }`}
    >
      <div class="flex flex-col h-full">
        <nav class="flex-1 py-4">
          <ul class="space-y-1 px-2">
            {menuItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <li>
                  <A
                    href={item.path}
                    class={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 ${
                      isActive
                        ? 'bg-primary-600 text-white shadow-lg shadow-primary-600/30'
                        : 'text-gray-400 hover:bg-dark-100 hover:text-gray-200'
                    }`}
                  >
                    <item.icon class="w-5 h-5 flex-shrink-0" />
                    {!state.sidebarCollapsed && (
                      <span class="text-sm font-medium">{item.label}</span>
                    )}
                  </A>
                </li>
              );
            })}
          </ul>
        </nav>

        <button
          onClick={toggleSidebar}
          class="p-3 border-t border-dark-100 text-gray-400 hover:text-gray-200 hover:bg-dark-100 transition-colors flex items-center justify-center"
        >
          {state.sidebarCollapsed ? (
            <ChevronRight class="w-5 h-5" />
          ) : (
            <ChevronLeft class="w-5 h-5" />
          )}
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
