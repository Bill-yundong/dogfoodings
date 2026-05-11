"use client";

import { useEffect, useState } from "react";
import { trackingStore, SyncStatus, generateMockTrackingLogs } from "@/lib/indexedDBStore";
import { formatDistanceToNow } from "date-fns";
import { zhCN } from "date-fns/locale";

export default function DataSyncStatus() {
  const [status, setStatus] = useState<SyncStatus | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    const init = async () => {
      await trackingStore.init();
      
      const unsubscribe = trackingStore.subscribeToSyncChanges((newStatus) => {
        setStatus(newStatus);
      });

      const currentStatus = await trackingStore.getSyncStatus();
      setStatus(currentStatus);
      setIsInitializing(false);

      return unsubscribe;
    };

    init();
  }, []);

  const handleAddMockData = async () => {
    const mockLogs = generateMockTrackingLogs(30);
    await trackingStore.bulkAddLogs(mockLogs);
  };

  const handleSync = async () => {
    const mockRemoteData = generateMockTrackingLogs(20).map((log, i) => ({
      ...log,
      id: `remote-log-${Date.now()}-${i}`,
      version: 1,
      syncStatus: "synced" as const,
    }));

    const result = await trackingStore.syncWithRemote(
      () => Promise.resolve(mockRemoteData),
      () => Promise.resolve()
    );

    console.log("Sync result:", result);
  };

  const handleExport = async () => {
    const data = await trackingStore.exportData();
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `tracking-logs-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleClear = async () => {
    if (window.confirm("确定要清除所有本地数据吗？")) {
      await trackingStore.clearAll();
    }
  };

  if (isInitializing) {
    return (
      <div className="flex items-center gap-2 text-white/70">
        <div className="animate-spin w-4 h-4 border-2 border-white/50 border-t-white rounded-full"></div>
        <span className="text-sm">初始化数据库...</span>
      </div>
    );
  }

  const getSyncStatusColor = () => {
    if (!status) return "text-gray-400";
    if (status.isSyncing) return "text-yellow-400";
    if (status.conflictCount > 0) return "text-red-400";
    if (status.pendingChanges > 0) return "text-orange-400";
    return "text-green-400";
  };

  return (
    <div className="flex items-center gap-4">
      <div className="flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full ${getSyncStatusColor()} ${status?.isSyncing ? "animate-pulse" : ""}`}></div>
        <div className="text-right">
          <div className="text-sm font-medium">
            {status?.isSyncing ? "同步中..." : status?.pendingChanges ? `${status.pendingChanges} 条待同步` : "已同步"}
          </div>
          <div className="text-xs opacity-70">
            {status?.lastSyncTime
              ? `上次同步: ${formatDistanceToNow(status.lastSyncTime, {
                  addSuffix: true,
                  locale: zhCN,
                })}`
              : "从未同步"}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1">
        <button
          onClick={handleAddMockData}
          className="px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded text-sm transition-colors"
          title="添加模拟数据"
        >
          +数据
        </button>
        <button
          onClick={handleSync}
          disabled={status?.isSyncing}
          className="px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded text-sm transition-colors disabled:opacity-50"
          title="同步数据"
        >
          同步
        </button>
        <button
          onClick={handleExport}
          className="px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded text-sm transition-colors"
          title="导出数据"
        >
          导出
        </button>
        <button
          onClick={handleClear}
          className="px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded text-sm transition-colors"
          title="清除数据"
        >
          清除
        </button>
      </div>

      <div className="flex gap-4 text-xs opacity-70">
        <span>总计: {status?.totalLogs || 0}</span>
        {status?.conflictCount ? <span className="text-red-400">冲突: {status.conflictCount}</span> : null}
      </div>
    </div>
  );
}
