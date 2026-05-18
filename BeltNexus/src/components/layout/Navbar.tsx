import { Component } from 'solid-js';
import { A, useLocation } from '@solidjs/router';
import { alarmState } from '@/stores/alarmStore';

const navItems = [
  { path: '/', label: '监控大屏', icon: 'M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z' },
  { path: '/sensors', label: '传感器', icon: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z' },
  { path: '/alarms', label: '报警中心', icon: 'M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.63-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.64 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2zm-2 1H8v-6c0-2.48 1.51-4.5 4-4.5s4 2.02 4 4.5v6z' },
  { path: '/analysis', label: '磨损分析', icon: 'M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z' },
  { path: '/settings', label: '系统配置', icon: 'M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z' },
];

export const Navbar: Component = () => {
  const location = useLocation();

  return (
    <nav class="fixed left-0 top-0 h-full w-20 bg-industrial-900/95 backdrop-blur-md border-r border-industrial-800 flex flex-col items-center py-6 z-50">
      <div class="mb-8">
        <div class="w-12 h-12 rounded-xl bg-gradient-to-br from-industrial-500 to-industrial-700 flex items-center justify-center shadow-lg shadow-industrial-500/20">
          <svg viewBox="0 0 24 24" fill="white" class="w-6 h-6">
            <path d="M12 2L2 7v10l10 5 10-5V7L12 2zm0 2.18l6.9 3.45L12 11.09 5.1 7.63 12 4.18zM4 8.82l7 3.5v7.36l-7-3.5V8.82zm9 10.86v-7.36l7-3.5v7.36l-7 3.5z" />
          </svg>
        </div>
        <div class="text-center mt-2 text-xs font-semibold text-industrial-300">BeltNexus</div>
      </div>

      <div class="flex-1 flex flex-col gap-2">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <A
              href={item.path}
              class={`w-14 h-14 rounded-xl flex flex-col items-center justify-center gap-1 transition-all duration-200 group relative ${
                isActive
                  ? 'bg-industrial-700/50 text-tech-400'
                  : 'text-gray-500 hover:text-gray-300 hover:bg-industrial-800/50'
              }`}
            >
              {isActive && (
                <div class="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-tech-400 rounded-r-full" />
              )}
              <svg viewBox="0 0 24 24" fill="currentColor" class="w-5 h-5">
                <path d={item.icon} />
              </svg>
              <span class="text-[10px]">{item.label}</span>
              {item.path === '/alarms' && alarmState.unacknowledgedCount > 0 && (
                <div class="absolute top-1 right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center text-[10px] text-white font-bold animate-pulse">
                  {Math.min(alarmState.unacknowledgedCount, 9)}
                </div>
              )}
            </A>
          );
        })}
      </div>

      <div class="mt-auto">
        <div class="w-10 h-10 rounded-full bg-gradient-to-br from-industrial-600 to-industrial-800 flex items-center justify-center border border-industrial-600">
          <svg viewBox="0 0 24 24" fill="currentColor" class="w-5 h-5 text-gray-400">
            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
          </svg>
        </div>
      </div>
    </nav>
  );
};
