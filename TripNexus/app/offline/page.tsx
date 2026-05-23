'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useMutation } from '@tanstack/react-query';
import {
  Database, Wifi, WifiOff, Cloud, CloudOff,
  Download, Upload, Trash2, RotateCcw, Clock,
  AlertTriangle, CheckCircle2, XCircle, Plus,
  HardDrive, Zap, History, Shield, Settings
} from 'lucide-react';
import { PageContainer } from '@/components/layout/page-container';
import { useOfflineStore, useUIStore, useTripStore } from '@/lib/store';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';

const syncStatusConfig: Record<string, { icon: typeof Cloud; color: string; label: string }> = {
  idle: { icon: Cloud, color: 'text-green-500', label: '已同步' },
  syncing: { icon: Cloud, color: 'text-blue-500 animate-pulse', label: '同步中' },
  synced: { icon: Cloud, color: 'text-green-500', label: '已同步' },
  conflict: { icon: AlertTriangle, color: 'text-orange-500', label: '冲突' },
  error: { icon: CloudOff, color: 'text-red-500', label: '同步失败' },
  pending: { icon: Clock, color: 'text-amber-500', label: '待同步' },
  offline: { icon: CloudOff, color: 'text-yellow-500', label: '离线' },
};

export default function OfflinePage() {
  const {
    isOnline,
    networkLatency,
    syncStatus,
    lastSyncTime,
    pendingOperations,
    snapshots,
    operationLogs,
    createSnapshot,
    restoreSnapshot,
    deleteSnapshot,
    loadSnapshots,
    loadOperationLogs,
    syncNow,
    forceOnline,
    forceOffline,
    exportData,
    importData,
  } = useOfflineStore();
  const { currentTrip } = useTripStore();
  const { showToast } = useUIStore();
  const [activeTab, setActiveTab] = useState<'snapshots' | 'operations' | 'settings'>('snapshots');

  useEffect(() => {
    loadSnapshots(currentTrip?.id);
    loadOperationLogs(50);
  }, [currentTrip?.id]);

  const syncMutation = useMutation({
    mutationFn: () => syncNow(),
    onSuccess: () => showToast('success', '同步完成'),
    onError: (error) => showToast('error', error instanceof Error ? error.message : '同步失败'),
  });

  const snapshotMutation = useMutation({
    mutationFn: () => {
      if (!currentTrip) throw new Error('请先选择一个行程');
      return createSnapshot(currentTrip.id, `快照 ${format(new Date(), 'yyyy-MM-dd HH:mm')}`);
    },
    onSuccess: (snapshot) => {
      showToast('success', `快照创建成功：${snapshot.name}`);
      loadSnapshots(currentTrip?.id);
    },
    onError: (error) => showToast('error', error instanceof Error ? error.message : '创建失败'),
  });

  const exportMutation = useMutation({
    mutationFn: () => exportData(),
    onSuccess: (data) => {
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `tripnexus-backup-${format(new Date(), 'yyyyMMddHHmm')}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showToast('success', '数据导出成功');
    },
    onError: (error) => showToast('error', error instanceof Error ? error.message : '导出失败'),
  });

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const data = event.target?.result as string;
        await importData(data);
        showToast('success', '数据导入成功');
        loadSnapshots();
        loadOperationLogs();
      } catch (error) {
        showToast('error', error instanceof Error ? error.message : '导入失败');
      }
    };
    reader.readAsText(file);
  };

  const syncConfig = syncStatusConfig[syncStatus === 'idle' && !isOnline ? 'offline' : syncStatus];
  const SyncIcon = syncConfig.icon;

  return (
    <PageContainer>
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold text-dark-800">
              离线管理中心
            </h1>
            <p className="text-dark-500 mt-1">
              快照管理、数据同步、离线操作日志
            </p>
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={() => syncMutation.mutate()}
              disabled={syncMutation.isPending || !isOnline}
              className="btn-primary flex items-center gap-2"
            >
              {syncMutation.isPending ? (
                <>
                  <RotateCcw className="w-5 h-5 animate-spin" />
                  同步中...
                </>
              ) : (
                <>
                  <Cloud className="w-5 h-5" />
                  立即同步
                </>
              )}
            </button>
            <button
              onClick={() => snapshotMutation.mutate()}
              disabled={snapshotMutation.isPending || !currentTrip}
              className="btn-secondary flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              创建快照
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="card"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isOnline ? 'bg-green-100' : 'bg-red-100'}`}>
                {isOnline ? <Wifi className="w-5 h-5 text-green-600" /> : <WifiOff className="w-5 h-5 text-red-600" />}
              </div>
              <span className="text-sm text-dark-500">网络状态</span>
            </div>
            <p className={`text-2xl font-bold ${isOnline ? 'text-green-600' : 'text-red-600'}`}>
              {isOnline ? '在线' : '离线'}
            </p>
            {isOnline && networkLatency > 0 && (
              <p className="text-xs text-dark-400 mt-1">延迟: {networkLatency}ms</p>
            )}
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="card"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-blue-100">
                <SyncIcon className={`w-5 h-5 ${syncConfig.color}`} />
              </div>
              <span className="text-sm text-dark-500">同步状态</span>
            </div>
            <p className={`text-2xl font-bold ${syncConfig.color.replace('animate-pulse', '')}`}>
              {syncConfig.label}
            </p>
            {lastSyncTime && (
              <p className="text-xs text-dark-400 mt-1">
                {format(lastSyncTime, 'MM/dd HH:mm', { locale: zhCN })}
              </p>
            )}
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="card"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-amber-100">
                <Clock className="w-5 h-5 text-amber-600" />
              </div>
              <span className="text-sm text-dark-500">待同步</span>
            </div>
            <p className={`text-2xl font-bold ${pendingOperations > 0 ? 'text-amber-600' : 'text-dark-400'}`}>
              {pendingOperations} 项
            </p>
            {pendingOperations > 0 && (
              <p className="text-xs text-amber-500 mt-1">等待同步中</p>
            )}
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="card"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-purple-100">
                <HardDrive className="w-5 h-5 text-purple-600" />
              </div>
              <span className="text-sm text-dark-500">快照数量</span>
            </div>
            <p className="text-2xl font-bold text-purple-600">{snapshots.length}</p>
            <p className="text-xs text-dark-400 mt-1">本地存储</p>
          </motion.div>
        </div>

        <div className="grid lg:grid-cols-4 gap-6">
          <div className="lg:col-span-1 space-y-6">
            <div className="card">
              <h3 className="text-lg font-bold text-dark-800 mb-4 flex items-center gap-2">
                <Settings className="w-5 h-5 text-primary-500" />
                网络控制
              </h3>
              
              <div className="space-y-3">
                <button
                  onClick={forceOnline}
                  disabled={isOnline}
                  className={`w-full px-4 py-3 rounded-xl text-left transition-all flex items-center gap-3 ${
                    isOnline
                      ? 'bg-green-50 text-green-600 cursor-default'
                      : 'bg-dark-50 text-dark-600 hover:bg-green-50 hover:text-green-600'
                  }`}
                >
                  <Wifi className="w-5 h-5" />
                  <div>
                    <p className="font-medium">强制在线</p>
                    <p className="text-xs opacity-70">模拟在线状态</p>
                  </div>
                  {isOnline && <CheckCircle2 className="w-5 h-5 ml-auto" />}
                </button>
                
                <button
                  onClick={forceOffline}
                  disabled={!isOnline}
                  className={`w-full px-4 py-3 rounded-xl text-left transition-all flex items-center gap-3 ${
                    !isOnline
                      ? 'bg-red-50 text-red-600 cursor-default'
                      : 'bg-dark-50 text-dark-600 hover:bg-red-50 hover:text-red-600'
                  }`}
                >
                  <WifiOff className="w-5 h-5" />
                  <div>
                    <p className="font-medium">强制离线</p>
                    <p className="text-xs opacity-70">测试离线功能</p>
                  </div>
                  {!isOnline && <CheckCircle2 className="w-5 h-5 ml-auto" />}
                </button>
              </div>
            </div>

            <div className="card">
              <h3 className="text-lg font-bold text-dark-800 mb-4 flex items-center gap-2">
                <Download className="w-5 h-5 text-purple-500" />
                数据管理
              </h3>
              
              <div className="space-y-3">
                <button
                  onClick={() => exportMutation.mutate()}
                  disabled={exportMutation.isPending}
                  className="w-full px-4 py-3 rounded-xl bg-dark-50 text-dark-600 hover:bg-primary-50 hover:text-primary-600 transition-all flex items-center gap-3"
                >
                  <Download className="w-5 h-5" />
                  <div className="text-left">
                    <p className="font-medium">导出数据</p>
                    <p className="text-xs opacity-70">JSON 格式备份</p>
                  </div>
                </button>
                
                <label className="w-full px-4 py-3 rounded-xl bg-dark-50 text-dark-600 hover:bg-green-50 hover:text-green-600 transition-all flex items-center gap-3 cursor-pointer">
                  <Upload className="w-5 h-5" />
                  <div className="text-left">
                    <p className="font-medium">导入数据</p>
                    <p className="text-xs opacity-70">从备份恢复</p>
                  </div>
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleImport}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            <div className="card bg-gradient-to-br from-primary-50 to-cyan-50">
              <div className="flex items-center gap-3 mb-3">
                <Shield className="w-6 h-6 text-primary-600" />
                <h3 className="font-bold text-primary-800">数据安全</h3>
              </div>
              <p className="text-sm text-primary-700 mb-4">
                所有数据首先存储在本地 IndexedDB 中，确保即使在离线状态下也能安全保存。
                恢复网络后自动同步。
              </p>
              <div className="space-y-2 text-xs text-primary-600">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>CRDT 冲突解决</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>操作日志完整记录</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>增量同步机制</span>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-3">
            <div className="flex gap-2 mb-6">
              {[
                { id: 'snapshots', label: '行程快照', icon: Database },
                { id: 'operations', label: '操作日志', icon: History },
              ].map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex items-center gap-2 px-6 py-3 rounded-xl transition-all ${
                      activeTab === tab.id
                        ? 'bg-gradient-primary text-white shadow-md'
                        : 'bg-white text-dark-600 hover:bg-dark-50'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {activeTab === 'snapshots' && (
              <div className="card">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-bold text-dark-800">
                    行程快照 ({snapshots.length})
                  </h3>
                </div>

                {snapshots.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-dark-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Database className="w-8 h-8 text-dark-400" />
                    </div>
                    <p className="text-dark-500 mb-2">暂无快照</p>
                    <p className="text-sm text-dark-400 mb-6">
                      点击"创建快照"保存当前行程状态
                    </p>
                    <button
                      onClick={() => snapshotMutation.mutate()}
                      disabled={!currentTrip || snapshotMutation.isPending}
                      className="btn-primary inline-flex items-center gap-2"
                    >
                      <Plus className="w-5 h-5" />
                      创建第一个快照
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4 max-h-[600px] overflow-y-auto scrollbar-thin">
                    {snapshots.map((snapshot, index) => (
                      <motion.div
                        key={snapshot.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.03 }}
                        className="p-4 rounded-xl border-2 border-dark-100 hover:border-primary-200 hover:bg-primary-50/30 transition-all"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-4">
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg flex-shrink-0">
                              <Database className="w-6 h-6 text-white" />
                            </div>
                            <div>
                              <h4 className="font-semibold text-dark-800">{snapshot.name}</h4>
                              <p className="text-sm text-dark-500 mt-1">
                                {snapshot.locationCount} 个地点 · {snapshot.tripName}
                              </p>
                              <p className="text-xs text-dark-400 mt-1">
                                创建于 {format(snapshot.createdAt, 'yyyy年MM月dd日 HH:mm', { locale: zhCN })}
                              </p>
                              {snapshot.description && (
                                <p className="text-sm text-dark-600 mt-2 bg-dark-50 p-2 rounded-lg">
                                  {snapshot.description}
                                </p>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex gap-2">
                            <button
                              onClick={() => {
                                if (confirm('确定要恢复到此快照吗？当前数据将被覆盖。')) {
                                  restoreSnapshot(snapshot.id);
                                  showToast('success', '快照已恢复');
                                }
                              }}
                              className="px-4 py-2 text-sm bg-primary-50 text-primary-600 rounded-xl hover:bg-primary-100 transition-colors flex items-center gap-2"
                            >
                              <RotateCcw className="w-4 h-4" />
                              恢复
                            </button>
                            <button
                              onClick={() => {
                                if (confirm('确定要删除这个快照吗？')) {
                                  deleteSnapshot(snapshot.id);
                                  showToast('info', '快照已删除');
                                }
                              }}
                              className="px-4 py-2 text-sm bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-colors flex items-center gap-2"
                            >
                              <Trash2 className="w-4 h-4" />
                              删除
                            </button>
                          </div>
                        </div>
                        
                        {snapshot.metadata && (
                          <div className="flex gap-6 mt-4 pt-4 border-t border-dark-100 text-xs text-dark-500">
                            {snapshot.metadata.totalDistance && (
                              <span>距离: {(snapshot.metadata.totalDistance / 1000).toFixed(1)}km</span>
                            )}
                            {snapshot.metadata.totalTime && (
                              <span>时间: {Math.round(snapshot.metadata.totalTime / 60)}h</span>
                            )}
                            {snapshot.metadata.algorithm && (
                              <span>算法: {snapshot.metadata.algorithm}</span>
                            )}
                          </div>
                        )}
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'operations' && (
              <div className="card">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-bold text-dark-800">
                    操作日志 ({operationLogs.length})
                  </h3>
                  <button
                    onClick={() => loadOperationLogs(100)}
                    className="px-4 py-2 text-sm bg-dark-50 text-dark-600 rounded-xl hover:bg-dark-100 transition-colors flex items-center gap-2"
                  >
                    <RotateCcw className="w-4 h-4" />
                    刷新
                  </button>
                </div>

                {operationLogs.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-dark-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <History className="w-8 h-8 text-dark-400" />
                    </div>
                    <p className="text-dark-500">暂无操作记录</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[600px] overflow-y-auto scrollbar-thin">
                    {operationLogs.map((log, index) => {
                      const typeColors = {
                        create: 'bg-green-100 text-green-700',
                        update: 'bg-blue-100 text-blue-700',
                        delete: 'bg-red-100 text-red-700',
                      };
                      const statusColors = {
                        pending: 'bg-amber-100 text-amber-700',
                        synced: 'bg-green-100 text-green-700',
                        failed: 'bg-red-100 text-red-700',
                      };
                      const typeLabels = {
                        create: '创建',
                        update: '更新',
                        delete: '删除',
                      };
                      const entityLabels = {
                        trip: '行程',
                        location: '地点',
                        snapshot: '快照',
                      };
                      
                      return (
                        <motion.div
                          key={log.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.02 }}
                          className="flex items-center gap-4 p-3 rounded-xl hover:bg-dark-50 transition-colors"
                        >
                          <span className={`px-2 py-1 rounded-lg text-xs font-medium ${typeColors[log.type as keyof typeof typeColors]}`}>
                            {typeLabels[log.type as keyof typeof typeLabels]}
                          </span>
                          <span className="px-2 py-1 rounded-lg text-xs font-medium bg-dark-100 text-dark-700">
                            {entityLabels[log.entityType as keyof typeof entityLabels]}
                          </span>
                          <span className="flex-1 text-sm text-dark-700 font-mono truncate">
                            {log.entityId.slice(0, 16)}...
                          </span>
                          <span className={`px-2 py-1 rounded-lg text-xs font-medium ${statusColors[log.status as keyof typeof statusColors]}`}>
                            {log.status === 'pending' ? '待同步' : log.status === 'synced' ? '已同步' : '失败'}
                          </span>
                          <span className="text-xs text-dark-400 whitespace-nowrap">
                            {format(log.timestamp, 'HH:mm:ss', { locale: zhCN })}
                          </span>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </PageContainer>
  );
}
