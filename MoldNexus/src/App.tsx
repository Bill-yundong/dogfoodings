import { Route, Router } from '@solidjs/router';
import { onMount, JSX } from 'solid-js';
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

export default function App() {
  const { setDbReady } = useAppStore();

  onMount(async () => {
    try {
      await initDatabase();
      setDbReady(true);
      console.log('[MoldNexus] Database initialized successfully');
    } catch (error) {
      console.error('[MoldNexus] Failed to initialize database:', error);
    }
  });

  const AppRoot = (props: { children?: JSX.Element }): JSX.Element => {
    return <AppLayout>{props.children}</AppLayout>;
  };

  return (
    <Router root={AppRoot}>
      <Route path="/" component={Dashboard} />
      <Route path="/simulation" component={SimulationWorkbench} />
      <Route path="/parameters" component={ParameterManager} />
      <Route path="/mapping" component={SemanticMapping} />
      <Route path="/collaboration" component={CollaborationCenter} />
      <Route path="/analytics" component={AnalyticsReport} />
      <Route path="/settings" component={SystemSettings} />
    </Router>
  );
}
