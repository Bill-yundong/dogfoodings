import { Route, Router } from '@solidjs/router';
import { onMount, createSignal, Show } from 'solid-js';
import AppLayout from './components/layout/AppLayout';
import Dashboard from './pages/Dashboard';
import SimulationWorkbench from './pages/SimulationWorkbench';
import ParameterManager from './pages/ParameterManager';
import SemanticMapping from './pages/SemanticMapping';
import CollaborationCenter from './pages/CollaborationCenter';
import AnalyticsReport from './pages/AnalyticsReport';
import SystemSettings from './pages/SystemSettings';
import { initDatabase } from './db';
import { useAppStore } from './stores/appStore';
import { Loader2 } from 'lucide-solid';

export default function App() {
  const { setDbReady } = useAppStore();
  const [isLoading, setIsLoading] = createSignal(true);
  const [initError, setInitError] = createSignal<string | null>(null);

  onMount(async () => {
    try {
      await initDatabase();
      setDbReady(true);
      console.log('[MoldNexus] Database initialized successfully');
      setIsLoading(false);
    } catch (error) {
      console.error('[MoldNexus] Failed to initialize database:', error);
      setInitError(error instanceof Error ? error.message : 'Unknown error');
      setIsLoading(false);
    }
  });

  return (
    <Show when={!isLoading()} fallback={
      <div class="h-screen w-screen flex flex-col items-center justify-center bg-dark-300">
        <Loader2 class="w-12 h-12 text-primary-500 animate-spin mb-4" />
        <p class="text-gray-400 text-lg">正在初始化数据库...</p>
        <p class="text-gray-600 text-sm mt-2">MoldNexus 注塑成型仿真平台</p>
      </div>
    }>
      <Show when={!initError()} fallback={
        <div class="h-screen w-screen flex flex-col items-center justify-center bg-dark-300">
          <div class="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mb-4">
            <svg class="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <p class="text-red-400 text-lg font-medium">数据库初始化失败</p>
          <p class="text-gray-500 text-sm mt-2 max-w-md text-center">{initError()}</p>
          <button 
            onClick={() => window.location.reload()} 
            class="mt-6 px-6 py-2 bg-primary-600 hover:bg-primary-500 text-white rounded-lg transition-colors"
          >
            重新加载
          </button>
        </div>
      }>
        <Router root={AppLayout}>
          <Route path="/" component={Dashboard} />
          <Route path="/simulation" component={SimulationWorkbench} />
          <Route path="/parameters" component={ParameterManager} />
          <Route path="/mapping" component={SemanticMapping} />
          <Route path="/collaboration" component={CollaborationCenter} />
          <Route path="/analytics" component={AnalyticsReport} />
          <Route path="/settings" component={SystemSettings} />
        </Router>
      </Show>
    </Show>
  );
}
