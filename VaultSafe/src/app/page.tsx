'use client';

import { useEffect, useState } from 'react';
import { Shield, Zap, Database, RefreshCw } from 'lucide-react';
import { NodeStatusCard } from '@/components/NodeStatusCard';
import { AccessEventLog } from '@/components/AccessEventLog';
import { SystemStats } from '@/components/SystemStats';
import { AccessControlPanel } from '@/components/AccessControlPanel';
import { SecurityNode, AccessEvent, MockUser } from '@/types/security';
import { generateMockNodes, generateMockUsers } from '@/lib/mockData';
import { securityHub } from '@/lib/securityHub';

export default function Home() {
  const [nodes, setNodes] = useState<SecurityNode[]>([]);
  const [events, setEvents] = useState<AccessEvent[]>([]);
  const [users, setUsers] = useState<MockUser[]>([]);
  const [selectedNode, setSelectedNode] = useState<SecurityNode | null>(null);
  const [stats, setStats] = useState({
    totalNodes: 0,
    onlineNodes: 0,
    offlineNodes: 0,
    warningNodes: 0,
    authorizedUsers: 0,
    accessEventsToday: 0,
    avgLatency: 0,
  });
  const [isInitialized, setIsInitialized] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isCreatingSnapshot, setIsCreatingSnapshot] = useState(false);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'info' } | null>(null);

  useEffect(() => {
    const initSystem = async () => {
      await securityHub.initialize();
      
      const mockNodes = generateMockNodes();
      const mockUsers = generateMockUsers();
      
      securityHub.registerNodes(mockNodes);
      
      mockUsers.forEach((user) => {
        const hash = {
          id: `hash-${user.id}`,
          userId: user.id,
          hashType: 'fingerprint' as const,
          hashValue: user.fingerprint,
          timestamp: Date.now(),
          confidence: 0.95,
          nodeId: 'node-001',
        };
        securityHub.registerAuthorizedUser(hash, user.level);
      });

      setNodes(mockNodes);
      setUsers(mockUsers);
      updateStats();
      setIsInitialized(true);
    };

    initSystem();

    return () => {
      securityHub.destroy();
    };
  }, []);

  useEffect(() => {
    if (!isInitialized) return;

    const interval = setInterval(() => {
      setNodes([...securityHub.getAllNodes()]);
      updateStats();
    }, 2000);

    return () => clearInterval(interval);
  }, [isInitialized]);

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  const updateStats = async () => {
    try {
      const newStats = await securityHub.getSystemStats();
      setStats(newStats);
    } catch (error) {
      console.error('Failed to update stats:', error);
    }
  };

  const handleAccessRequest = async (
    biometricData: string,
    hashType: 'fingerprint' | 'facial' | 'iris' | 'palm',
    userId: string,
    nodeId: string
  ) => {
    try {
      const event = await securityHub.processAccessRequest(biometricData, hashType, userId, nodeId);
      setEvents([...securityHub.getRecentAccessEvents(50)]);
      await updateStats();
      setNotification({
        message: event.result === 'granted' ? '访问授权成功' : '访问已拒绝',
        type: 'success',
      });
      return event;
    } catch (error) {
      console.error('Access request failed:', error);
      setNotification({ message: '访问请求失败', type: 'info' });
      throw error;
    }
  };

  const handleRefresh = async () => {
    if (isRefreshing) return;
    
    setIsRefreshing(true);
    try {
      setNodes([...securityHub.getAllNodes()]);
      setEvents([...securityHub.getRecentAccessEvents(50)]);
      await updateStats();
      setNotification({ message: '数据刷新成功', type: 'success' });
    } catch (error) {
      console.error('Refresh failed:', error);
      setNotification({ message: '数据刷新失败', type: 'info' });
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleCreateSnapshot = async () => {
    if (isCreatingSnapshot) return;
    
    setIsCreatingSnapshot(true);
    try {
      await securityHub.createManualSnapshot();
      await updateStats();
      setNotification({ message: '快照创建成功，数据已持久化', type: 'success' });
    } catch (error) {
      console.error('Create snapshot failed:', error);
      setNotification({ message: '快照创建失败', type: 'info' });
    } finally {
      setIsCreatingSnapshot(false);
    }
  };

  if (!isInitialized) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <Shield size={64} className="mx-auto mb-4 text-vault-500 animate-pulse" />
          <h2 className="text-xl font-semibold text-slate-200 mb-2">系统初始化中...</h2>
          <p className="text-slate-400">正在启动安防中枢系统</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="bg-slate-900/80 backdrop-blur-sm border-b border-slate-800 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-vault-500 to-vault-600 rounded-lg shadow-lg shadow-vault-500/20">
                <Shield size={28} className="text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold">VaultSafe</h1>
                <p className="text-sm text-slate-400">银行金库多级安防中枢系统</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleCreateSnapshot}
                disabled={isCreatingSnapshot}
                className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed border border-slate-700 rounded-lg text-sm transition-colors"
              >
                <Database size={16} className={isCreatingSnapshot ? 'animate-spin' : ''} />
                {isCreatingSnapshot ? '创建中...' : '创建快照'}
              </button>
              <button
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="flex items-center gap-2 px-4 py-2 bg-vault-600 hover:bg-vault-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-sm transition-colors"
              >
                <RefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} />
                {isRefreshing ? '刷新中...' : '刷新数据'}
              </button>
            </div>
          </div>
        </div>
      </header>

      {notification && (
        <div className="fixed top-24 right-8 z-50 animate-fade-in">
          <div className={`px-6 py-3 rounded-lg shadow-lg flex items-center gap-2 ${
            notification.type === 'success' 
              ? 'bg-emerald-500/90 text-white' 
              : 'bg-vault-500/90 text-white'
          }`}>
            {notification.type === 'success' ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
            <span className="font-medium text-sm">{notification.message}</span>
          </div>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <SystemStats stats={stats} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-100">安全节点状态</h2>
                <p className="text-sm text-slate-400">实时监控所有安防节点</p>
              </div>
              <div className="flex items-center gap-2">
                <Zap size={16} className="text-emerald-500" />
                <span className="text-sm text-emerald-500">实时同步中</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {nodes.map((node) => (
                <NodeStatusCard
                  key={node.id}
                  node={node}
                  isSelected={selectedNode?.id === node.id}
                  onSelect={setSelectedNode}
                />
              ))}
            </div>

            <div className="mt-8">
              <AccessEventLog events={events} />
            </div>
          </div>

          <div className="space-y-6">
            <AccessControlPanel
              nodes={nodes}
              users={users}
              onAccessRequest={handleAccessRequest}
            />

            {selectedNode && (
              <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6">
                <h3 className="font-semibold text-slate-100 mb-4">节点详情</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-400">节点名称</span>
                    <span className="text-slate-200">{selectedNode.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">节点类型</span>
                    <span className="text-slate-200 capitalize">{selectedNode.type}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">位置</span>
                    <span className="text-slate-200">{selectedNode.location}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">安全等级</span>
                    <span className="text-vault-400 font-mono">L{selectedNode.level}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">坐标</span>
                    <span className="text-slate-200 font-mono">
                      ({selectedNode.coordinates.x}, {selectedNode.coordinates.y})
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      <footer className="border-t border-slate-800 mt-12 py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-sm text-slate-500">
          <p>VaultSafe Security System v1.0 - 金融级高可靠数据协同中枢</p>
        </div>
      </footer>
    </div>
  );
}
