import { useApp } from '@/context/AppContext';
import { Navigation } from '@/components/Navigation';
import { Dashboard } from '@/components/Dashboard';
import { MonitoringPanel } from '@/components/MonitoringPanel';
import { AssetManagement } from '@/components/AssetManagement';
import { PredictionPanel } from '@/components/PredictionPanel';
import { SemanticAlignmentPanel } from '@/components/SemanticAlignmentPanel';
import { SimulationPanel } from '@/components/SimulationPanel';

function App() {
  const { state } = useApp();
  const { isLoading } = state;

  const renderPanel = () => {
    switch (state.activeTab) {
      case 'dashboard':
        return <Dashboard />;
      case 'monitoring':
        return <MonitoringPanel />;
      case 'assets':
        return <AssetManagement />;
      case 'prediction':
        return <PredictionPanel />;
      case 'alignment':
        return <SemanticAlignmentPanel />;
      case 'simulation':
        return <SimulationPanel />;
      default:
        return <Dashboard />;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-cellar-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-wine-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <h2 className="text-wine-100 text-xl font-serif mb-2">VintageLink</h2>
          <p className="text-cellar-400">正在初始化酒窖数据...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cellar-950 text-cellar-100">
      <header className="bg-cellar-900 border-b border-cellar-800 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-wine-600 to-wine-800 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-wine-100" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-serif text-wine-100">VintageLink</h1>
              <p className="text-xs text-cellar-400">数字化私人酒窖管理系统</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-sm text-cellar-300">
                <span className="inline-flex items-center gap-1">
                  <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                  系统运行正常
                </span>
              </div>
              <div className="text-xs text-cellar-500">
                上次更新: {state.lastUpdate ? new Date(state.lastUpdate).toLocaleTimeString('zh-CN') : '--'}
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        <aside className="w-56 bg-cellar-900 min-h-[calc(100vh-73px)] border-r border-cellar-800">
          <Navigation />
        </aside>

        <main className="flex-1 p-6">
          {renderPanel()}
        </main>
      </div>
    </div>
  );
}

export default App;
