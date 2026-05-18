import React from 'react';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';

type Route = 'dashboard' | 'network' | 'valves' | 'analysis' | 'settings';

interface AppShellProps {
  children: React.ReactNode;
  currentRoute: Route;
  onNavigate: (route: Route) => void;
}

export const AppShell: React.FC<AppShellProps> = ({ children, currentRoute, onNavigate }) => {
  return (
    <div className="flex h-screen bg-slate-950 text-white overflow-hidden">
      <Sidebar currentRoute={currentRoute} onNavigate={onNavigate} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Topbar />
        <main className="flex-1 overflow-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
};
