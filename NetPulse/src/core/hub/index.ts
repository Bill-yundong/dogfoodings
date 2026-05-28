import type { ProbeResult, PathQuality, SwitchEvent, Alert } from '@/types';
import type { ClientConfig, AcceleratorNode } from '@shared/protocol';
import { DEFAULT_CONFIG, MOCK_NODES } from '@shared/protocol';
import { NetworkMonitor, createNetworkMonitor } from '../monitor';
import { JitterPredictor, createJitterPredictor } from '../predictor';
import { storageService } from '../storage';
import { semanticSyncService, ConnectionStatus } from '../sync';
import { generateId } from '@/utils/math';
import { shouldTriggerAlert } from '@/utils/quality';

export interface HubState {
  isMonitoring: boolean;
  activePath: string | null;
  connectionStatus: ConnectionStatus;
  nodes: AcceleratorNode[];
  config: ClientConfig;
  latestResults: Map<string, ProbeResult>;
  pathQualities: Map<string, PathQuality>;
  recentSwitches: SwitchEvent[];
  alerts: Alert[];
  lastSwitchTime: number;
  monitoringStartTime: number;
}

export type HubEventType =
  | 'monitoring-started'
  | 'monitoring-stopped'
  | 'probe-result'
  | 'path-switched'
  | 'alert'
  | 'config-changed'
  | 'nodes-updated'
  | 'connection-status-changed';

export interface HubEvent {
  type: HubEventType;
  data?: unknown;
  timestamp: number;
}

export type HubListener = (event: HubEvent) => void;

export class LinkQualityHub {
  private state: HubState;
  private monitor: NetworkMonitor | null = null;
  private predictor: JitterPredictor;
  private listeners: Set<HubListener> = new Set();
  private monitorUnsubscribe: (() => void) | null = null;
  private syncUnsubscribe: (() => void) | null = null;
  private nodeUnsubscribe: (() => void) | null = null;
  private syncBatchTimer: number | null = null;
  private pendingSyncResults: ProbeResult[] = [];

  constructor() {
    this.state = {
      isMonitoring: false,
      activePath: null,
      connectionStatus: 'disconnected',
      nodes: MOCK_NODES,
      config: { ...DEFAULT_CONFIG },
      latestResults: new Map(),
      pathQualities: new Map(),
      recentSwitches: [],
      alerts: [],
      lastSwitchTime: 0,
      monitoringStartTime: 0,
    };

    this.predictor = createJitterPredictor(this.state.config);

    void storageService.init(this.state.config.dataRetentionDays);
  }

  async init(): Promise<void> {
    this.setupSyncListeners();
    await this.loadPersistedConfig();
    void this.loadRecentSwitches();
  }

  private setupSyncListeners(): void {
    this.syncUnsubscribe = semanticSyncService.addStatusListener((status) => {
      this.state.connectionStatus = status;
      this.emitEvent('connection-status-changed', status);
    });

    this.nodeUnsubscribe = semanticSyncService.addNodeListener((nodes) => {
      this.state.nodes = nodes;
      this.emitEvent('nodes-updated', nodes);
    });
  }

  private async loadPersistedConfig(): Promise<void> {
    try {
      const saved = localStorage.getItem('netpulse-config');
      if (saved) {
        const config = JSON.parse(saved) as ClientConfig;
        this.state.config = { ...this.state.config, ...config };
        this.predictor.updateClientConfig(this.state.config);
        storageService.setRetentionDays(this.state.config.dataRetentionDays);
      }
    } catch (e) {
      console.error('Load config error:', e);
    }
  }

  private async loadRecentSwitches(): Promise<void> {
    try {
      const switches = await storageService.getSwitchEvents(undefined, undefined, 50);
      this.state.recentSwitches = switches;
    } catch (e) {
      console.error('Load switches error:', e);
    }
  }

  startMonitoring(): void {
    if (this.state.isMonitoring) return;

    const onlineNodes = this.state.nodes.filter(n => n.status === 'online');
    const pathIds = onlineNodes.map(n => n.id);

    if (pathIds.length === 0) {
      this.addAlert('warning', '没有可用节点', '当前没有在线的加速节点');
      return;
    }

    this.monitor = createNetworkMonitor(this.state.config, pathIds);
    this.monitorUnsubscribe = this.monitor.addListener((result) => this.handleProbeResult(result));
    this.monitor.start();

    this.state.isMonitoring = true;
    this.state.monitoringStartTime = Date.now();
    this.state.activePath = pathIds[0];

    this.emitEvent('monitoring-started');

    void semanticSyncService.connect();
    this.startSyncBatching();
  }

  stopMonitoring(): void {
    if (!this.state.isMonitoring) return;

    if (this.monitor) {
      this.monitor.stop();
      this.monitor.dispose();
      this.monitor = null;
    }

    if (this.monitorUnsubscribe) {
      this.monitorUnsubscribe();
      this.monitorUnsubscribe = null;
    }

    this.stopSyncBatching();

    this.state.isMonitoring = false;
    this.emitEvent('monitoring-stopped');

    semanticSyncService.disconnect();
  }

  private handleProbeResult(result: ProbeResult): void {
    this.state.latestResults.set(result.pathId, result);
    this.predictor.addResult(result);

    const allResults = this.monitor?.getAllRecentResults(60) || new Map();
    const currentResults = allResults.get(result.pathId) || [];

    const quality = this.predictor.calculatePathQualityWithPrediction(result.pathId, currentResults);
    this.state.pathQualities.set(result.pathId, quality);

    this.checkAlerts(result);
    void storageService.addProbeResult(result);

    this.pendingSyncResults.push(result);
    if (this.pendingSyncResults.length >= 50) {
      this.flushSyncBatch();
    }

    if (this.state.config.autoSwitch && result.pathId === this.state.activePath) {
      this.checkSwitchDecision(result.pathId, currentResults, allResults);
    }

    this.emitEvent('probe-result', result);
  }

  private checkAlerts(result: ProbeResult): void {
    const alertCheck = shouldTriggerAlert(result, this.state.config);

    if (alertCheck.shouldAlert && alertCheck.metric) {
      const recentAlert = this.state.alerts.find(
        a => a.pathId === result.pathId && a.severity === alertCheck.severity && !a.dismissed
      );

      if (!recentAlert || Date.now() - recentAlert.timestamp > 30000) {
        const metricNames: Record<string, string> = {
          latency: '时延',
          jitter: '抖动',
          packetLoss: '丢包率',
        };

        this.addAlert(
          alertCheck.severity,
          `${metricNames[alertCheck.metric]}异常`,
          `路径 ${result.pathId} 的${metricNames[alertCheck.metric]}超过阈值`,
          result.pathId
        );
      }
    }
  }

  private checkSwitchDecision(
    currentPathId: string,
    currentResults: ProbeResult[],
    allResults: Map<string, ProbeResult[]>
  ): void {
    const decision = this.predictor.shouldSwitch(currentPathId, currentResults, allResults);

    if (decision.shouldSwitch && decision.targetPath && decision.reason) {
      void this.switchPath(decision.targetPath, decision.reason as SwitchEvent['reason']);
    }
  }

  async switchPath(targetPathId: string, reason: SwitchEvent['reason'] = 'manual'): Promise<void> {
    if (!this.state.isMonitoring) return;
    if (targetPathId === this.state.activePath) return;

    const targetNode = this.state.nodes.find(n => n.id === targetPathId);
    if (!targetNode || targetNode.status !== 'online') {
      this.addAlert('warning', '切换失败', '目标节点不可用');
      return;
    }

    const startTime = Date.now();
    const fromPath = this.state.activePath || '';

    try {
      if (reason !== 'manual') {
        semanticSyncService.requestPathSwitch(targetPathId, reason);
      }

      this.state.activePath = targetPathId;
      this.predictor.recordSwitch();
      this.state.lastSwitchTime = Date.now();

      const switchEvent: SwitchEvent = {
        id: generateId(),
        timestamp: startTime,
        fromPath,
        toPath: targetPathId,
        reason,
        switchTime: Date.now() - startTime,
        success: true,
      };

      this.state.recentSwitches.unshift(switchEvent);
      if (this.state.recentSwitches.length > 100) {
        this.state.recentSwitches.pop();
      }

      void storageService.addSwitchEvent(switchEvent);

      this.addAlert(
        'info',
        '路径已切换',
        `从 ${this.getNodeName(fromPath)} 切换到 ${targetNode.name}`,
        targetPathId
      );

      this.emitEvent('path-switched', switchEvent);
    } catch (e) {
      console.error('Switch path error:', e);
      this.addAlert('critical', '切换失败', '路径切换过程中发生错误');
    }
  }

  private addAlert(
    severity: Alert['severity'],
    title: string,
    message: string,
    pathId?: string
  ): void {
    const alert: Alert = {
      id: generateId(),
      timestamp: Date.now(),
      severity,
      title,
      message,
      pathId,
      dismissed: false,
    };

    this.state.alerts.unshift(alert);
    if (this.state.alerts.length > 100) {
      this.state.alerts.pop();
    }

    this.emitEvent('alert', alert);
  }

  dismissAlert(alertId: string): void {
    const alert = this.state.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.dismissed = true;
    }
  }

  updateConfig(config: Partial<ClientConfig>): void {
    this.state.config = { ...this.state.config, ...config };
    this.predictor.updateClientConfig(this.state.config);
    storageService.setRetentionDays(this.state.config.dataRetentionDays);

    localStorage.setItem('netpulse-config', JSON.stringify(this.state.config));

    if (this.monitor && config.probeInterval) {
      this.monitor.updateConfig({ probeInterval: config.probeInterval });
    }

    this.emitEvent('config-changed', this.state.config);
  }

  private startSyncBatching(): void {
    this.stopSyncBatching();
    this.syncBatchTimer = window.setInterval(() => this.flushSyncBatch(), 5000);
  }

  private stopSyncBatching(): void {
    if (this.syncBatchTimer) {
      clearInterval(this.syncBatchTimer);
      this.syncBatchTimer = null;
    }
    this.flushSyncBatch();
  }

  private flushSyncBatch(): void {
    if (this.pendingSyncResults.length > 0) {
      semanticSyncService.sendProbeResults(this.pendingSyncResults);
      this.pendingSyncResults = [];
    }

    if (this.state.isMonitoring) {
      semanticSyncService.sendStatusSync({
        activePath: this.state.activePath,
        isMonitoring: this.state.isMonitoring,
        config: this.state.config,
        lastSyncTime: Date.now(),
      });
    }
  }

  private getNodeName(nodeId: string): string {
    return this.state.nodes.find(n => n.id === nodeId)?.name || nodeId;
  }

  getState(): Readonly<HubState> {
    return this.state;
  }

  getPathQuality(pathId: string): PathQuality | undefined {
    return this.state.pathQualities.get(pathId);
  }

  getActivePathQuality(): PathQuality | undefined {
    return this.state.activePath ? this.state.pathQualities.get(this.state.activePath) : undefined;
  }

  getActiveNode(): AcceleratorNode | undefined {
    return this.state.nodes.find(n => n.id === this.state.activePath);
  }

  getMonitoringDuration(): number {
    return this.state.isMonitoring ? Date.now() - this.state.monitoringStartTime : 0;
  }

  addListener(listener: HubListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emitEvent(type: HubEventType, data?: unknown): void {
    const event: HubEvent = {
      type,
      data,
      timestamp: Date.now(),
    };

    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch (e) {
        console.error('Hub listener error:', e);
      }
    }
  }

  async dispose(): Promise<void> {
    this.stopMonitoring();
    this.stopSyncBatching();

    if (this.syncUnsubscribe) this.syncUnsubscribe();
    if (this.nodeUnsubscribe) this.nodeUnsubscribe();

    semanticSyncService.dispose();
    await storageService.close();

    this.listeners.clear();
    this.pendingSyncResults = [];
  }
}

export const linkQualityHub = new LinkQualityHub();
