import React, { useState, useEffect } from 'react';
import { AppShell } from './components/layout/AppShell';
import DashboardPage from './pages/DashboardPage';
import NetworkBuilderPage from './pages/NetworkBuilderPage';
import ValveControlPage from './pages/ValveControlPage';
import AnalysisPage from './pages/AnalysisPage';
import SettingsPage from './pages/SettingsPage';
import { initDB } from './db/indexed-db';

type Route = 'dashboard' | 'network' | 'valves' | 'analysis' | 'settings';

function App() {
  const [currentRoute, setCurrentRoute] = useState<Route>('dashboard');
  const [dbReady, setDbReady] = useState(false);

  useEffect(() => {
    initDB()
      .then(() => setDbReady(true))
      .catch((error) => console.error('IndexedDB init failed:', error));
  }, []);

  const handleNavigate = (route: string) => {
    setCurrentRoute(route as Route);
  };

  const renderPage = () => {
    switch (currentRoute) {
      case 'dashboard':
        return <DashboardPage />;
      case 'network':
        return <NetworkBuilderPage />;
      case 'valves':
        return <ValveControlPage />;
      case 'analysis':
        return <AnalysisPage />;
      case 'settings':
        return <SettingsPage />;
      default:
        return <DashboardPage />;
    }
  };

  if (!dbReady) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-slate-400">初始化数据库中...</p>
        </div>
      </div>
    );
  }

  return (
    <AppShell currentRoute={currentRoute} onNavigate={handleNavigate}>
      {renderPage()}
    </AppShell>
  );
}

export default App;
