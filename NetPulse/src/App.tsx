import { Component, onMount } from 'solid-js';
import { Route } from '@solidjs/router';
import { HubProvider, useHub } from '@/store';
import { Header } from '@/components/layout/Header';
import { Dashboard } from '@/pages/Dashboard';
import { Paths } from '@/pages/Paths';
import { History } from '@/pages/History';
import { Settings } from '@/pages/Settings';

const AppContent: Component = () => {
  const hub = useHub();

  onMount(() => {
    const saved = localStorage.getItem('netpulse-config');
    if (saved) {
      try {
        const config = JSON.parse(saved);
        hub.updateConfig(config);
      } catch (e) {
        console.error('Load config error:', e);
      }
    }
  });

  const handleToggleMonitor = () => {
    if (hub.state.isMonitoring) {
      hub.stopMonitoring();
    } else {
      void hub.startMonitoring();
    }
  };

  return (
    <div class="min-h-screen bg-gradient-to-br from-space-900 via-space-800 to-space-900 text-metal-100 font-body">
      <div class="fixed inset-0 overflow-hidden pointer-events-none">
        <div class="absolute top-0 left-1/4 w-96 h-96 bg-neon-cyan/5 rounded-full blur-3xl animate-pulse-glow" />
        <div class="absolute bottom-0 right-1/4 w-96 h-96 bg-neon-purple/5 rounded-full blur-3xl animate-pulse-glow" style={{ 'animation-delay': '2s' } as any} />
        <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-b from-transparent via-neon-cyan/[0.02] to-transparent" />
      </div>

      <div class="relative z-10">
        <Header onToggleMonitor={handleToggleMonitor} />

        <main class="pt-24 pb-12 px-6 max-w-[1600px] mx-auto">
          <Route path="/" component={Dashboard} />
          <Route path="/paths" component={Paths} />
          <Route path="/history" component={History} />
          <Route path="/settings" component={Settings} />
        </main>

        <footer class="relative z-10 border-t border-white/5 py-6 px-6">
          <div class="max-w-[1600px] mx-auto flex items-center justify-between text-xs text-metal-600">
            <div class="flex items-center gap-4">
              <span>NetPulse v1.0.0</span>
              <span>•</span>
              <span>链路质量协同中枢</span>
            </div>
            <div class="flex items-center gap-4">
              <span>© 2024</span>
              <span>•</span>
              <span>SolidJS + TypeScript</span>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
};

export const App: Component = () => {
  return (
    <HubProvider>
      <AppContent />
    </HubProvider>
  );
};

export default App;
