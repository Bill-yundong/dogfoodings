import { createContext, useContext, createSignal, createEffect, onCleanup } from 'solid-js';
import { createStore } from 'solid-js/store';
import type { HubState, HubEvent, HubListener } from '@/core/hub';
import { linkQualityHub } from '@/core/hub';
import type { ProbeResult, PathQuality } from '@/types';
import type { AcceleratorNode, SwitchEvent } from '@shared/protocol';

interface HubContextValue {
  state: HubState;
  startMonitoring: () => void;
  stopMonitoring: () => void;
  switchPath: (pathId: string, reason?: SwitchEvent['reason']) => void;
  dismissAlert: (alertId: string) => void;
  updateConfig: (config: Partial<HubState['config']>) => void;
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
  const [state, setState] = createStore<HubState>(linkQualityHub.getState());
  const [latestResults, setLatestResults] = createSignal<Map<string, ProbeResult>>(new Map());
  const [pathHistories, setPathHistories] = createSignal<Map<string, ProbeResult[]>>(new Map());

  const handleHubEvent: HubListener = (event) => {
    setState(linkQualityHub.getState());

    if (event.type === 'probe-result' && event.data) {
      const result = event.data as ProbeResult;
      const newLatest = new Map(latestResults());
      newLatest.set(result.pathId, result);
      setLatestResults(newLatest);

      const newHistories = new Map(pathHistories());
      const history = newHistories.get(result.pathId) || [];
      history.push(result);
      if (history.length > 120) history.shift();
      newHistories.set(result.pathId, history);
      setPathHistories(newHistories);
    }
  };

  createEffect(() => {
    const unsubscribe = linkQualityHub.addListener(handleHubEvent);
    onCleanup(unsubscribe);
  });

  const value: HubContextValue = {
    state,
    startMonitoring: () => linkQualityHub.startMonitoring(),
    stopMonitoring: () => linkQualityHub.stopMonitoring(),
    switchPath: (pathId, reason) => linkQualityHub.switchPath(pathId, reason),
    dismissAlert: (alertId) => linkQualityHub.dismissAlert(alertId),
    updateConfig: (config) => linkQualityHub.updateConfig(config),
    getPathQuality: (pathId) => linkQualityHub.getPathQuality(pathId),
    getActivePathQuality: () => linkQualityHub.getActivePathQuality(),
    getActiveNode: () => linkQualityHub.getActiveNode(),
    getMonitoringDuration: () => linkQualityHub.getMonitoringDuration(),
    latestResult: (pathId) => {
      const targetPath = pathId || state.activePath;
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
