import { createContext, useContext, createSignal, onCleanup } from 'solid-js';
import type { HubEvent, HubListener } from '@/core/hub';
import { linkQualityHub } from '@/core/hub';
import type { ProbeResult, PathQuality, Alert } from '@/types';
import type { AcceleratorNode, ClientConfig, SwitchEvent } from '@shared/protocol';
import type { ConnectionStatus } from '@/core/sync';

interface HubContextValue {
  isMonitoring: () => boolean;
  activePath: () => string | null;
  connectionStatus: () => ConnectionStatus;
  nodes: () => AcceleratorNode[];
  config: () => ClientConfig;
  alerts: () => Alert[];
  recentSwitches: () => SwitchEvent[];
  monitoringStartTime: () => number;
  startMonitoring: () => void;
  stopMonitoring: () => void;
  switchPath: (pathId: string, reason?: SwitchEvent['reason']) => void;
  dismissAlert: (alertId: string) => void;
  updateConfig: (config: Partial<ClientConfig>) => void;
  getPathQuality: (pathId: string) => PathQuality | undefined;
  getActivePathQuality: () => PathQuality | undefined;
  getActiveNode: () => AcceleratorNode | undefined;
  getMonitoringDuration: () => number;
  latestResult: (pathId?: string) => ProbeResult | undefined;
  pathHistory: (pathId: string, limit?: number) => ProbeResult[];
  onEvent: (type: HubEvent['type'], handler: (data?: unknown) => void) => () => void;
}

const HubContext = createContext<HubContextValue | null>(null);

export function HubProvider(props: { children: import('solid-js').JSX.Element }) {
  const initialState = linkQualityHub.getState();

  const [isMonitoring, setIsMonitoring] = createSignal(initialState.isMonitoring);
  const [activePath, setActivePath] = createSignal<string | null>(initialState.activePath);
  const [connectionStatus, setConnectionStatus] = createSignal<ConnectionStatus>(initialState.connectionStatus);
  const [nodes, setNodes] = createSignal<AcceleratorNode[]>([...initialState.nodes]);
  const [config, setConfig] = createSignal<ClientConfig>({ ...initialState.config });
  const [alerts, setAlerts] = createSignal<Alert[]>([...initialState.alerts]);
  const [recentSwitches, setRecentSwitches] = createSignal<SwitchEvent[]>([...initialState.recentSwitches]);
  const [monitoringStartTime, setMonitoringStartTime] = createSignal(initialState.monitoringStartTime);
  const [latestResults, setLatestResults] = createSignal<Map<string, ProbeResult>>(new Map());
  const [pathHistories, setPathHistories] = createSignal<Map<string, ProbeResult[]>>(new Map());
  const [pathQualities, setPathQualities] = createSignal<Map<string, PathQuality>>(new Map());

  const handleHubEvent: HubListener = (event) => {
    const hubState = linkQualityHub.getState();

    switch (event.type) {
      case 'monitoring-started':
        setIsMonitoring(true);
        setActivePath(hubState.activePath);
        setMonitoringStartTime(hubState.monitoringStartTime);
        break;
      case 'monitoring-stopped':
        setIsMonitoring(false);
        setActivePath(null);
        break;
      case 'connection-status-changed':
        setConnectionStatus(hubState.connectionStatus);
        break;
      case 'nodes-updated':
        setNodes([...hubState.nodes]);
        break;
      case 'config-changed':
        setConfig({ ...hubState.config });
        break;
      case 'alert':
        setAlerts([...hubState.alerts]);
        break;
      case 'path-switched':
        setActivePath(hubState.activePath);
        setRecentSwitches([...hubState.recentSwitches]);
        setAlerts([...hubState.alerts]);
        break;
      case 'probe-result': {
        if (event.data) {
          const result = event.data as ProbeResult;
          const newLatest = new Map(latestResults());
          newLatest.set(result.pathId, result);
          setLatestResults(newLatest);

          const newHistories = new Map(pathHistories());
          const history = [...(newHistories.get(result.pathId) || []), result];
          if (history.length > 120) history.shift();
          newHistories.set(result.pathId, history);
          setPathHistories(newHistories);

          const newQualities = new Map(pathQualities());
          const quality = linkQualityHub.getPathQuality(result.pathId);
          if (quality) newQualities.set(result.pathId, quality);
          setPathQualities(newQualities);
        }

        setAlerts([...hubState.alerts]);
        break;
      }
    }
  };

  const unsubscribe = linkQualityHub.addListener(handleHubEvent);
  onCleanup(unsubscribe);

  const value: HubContextValue = {
    isMonitoring,
    activePath,
    connectionStatus,
    nodes,
    config,
    alerts,
    recentSwitches,
    monitoringStartTime,
    startMonitoring: () => linkQualityHub.startMonitoring(),
    stopMonitoring: () => linkQualityHub.stopMonitoring(),
    switchPath: (pathId, reason) => linkQualityHub.switchPath(pathId, reason),
    dismissAlert: (alertId: string) => {
      linkQualityHub.dismissAlert(alertId);
      setAlerts([...linkQualityHub.getState().alerts]);
    },
    updateConfig: (partial) => {
      linkQualityHub.updateConfig(partial);
      setConfig({ ...linkQualityHub.getState().config });
    },
    getPathQuality: (pathId) => pathQualities().get(pathId),
    getActivePathQuality: () => {
      const ap = activePath();
      return ap ? pathQualities().get(ap) : undefined;
    },
    getActiveNode: () => {
      const ap = activePath();
      return ap ? nodes().find(n => n.id === ap) : undefined;
    },
    getMonitoringDuration: () => {
      return isMonitoring() ? Date.now() - monitoringStartTime() : 0;
    },
    latestResult: (pathId) => {
      const targetPath = pathId || activePath();
      return targetPath ? latestResults().get(targetPath) : undefined;
    },
    pathHistory: (pathId, limit) => {
      const history = pathHistories().get(pathId) || [];
      return limit ? history.slice(-limit) : history;
    },
    onEvent: (type, handler) => {
      const listener: HubListener = (event) => {
        if (event.type === type) {
          handler(event.data);
        }
      };
      return linkQualityHub.addListener(listener);
    },
  };

  return <HubContext.Provider value={value}>{props.children}</HubContext.Provider>;
}

export function useHub() {
  const context = useContext(HubContext);
  if (!context) {
    throw new Error('useHub must be used within a HubProvider');
  }
  return context;
}
