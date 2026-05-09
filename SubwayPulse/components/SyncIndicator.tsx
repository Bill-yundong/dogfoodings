"use client";

import { useSubwayStore } from "@/store/subwayStore";
import { useEffect, useState } from "react";
import { dataSyncService } from "@/services/dataSyncService";

export default function SyncIndicator() {
  const { isSyncing, lastSyncTime } = useSubwayStore();
  const [isAutoSyncEnabled, setIsAutoSyncEnabled] = useState(false);

  const formatLastSync = () => {
    if (!lastSyncTime) return "从未同步";
    const now = Date.now();
    const diff = Math.floor((now - lastSyncTime) / 1000);
    
    if (diff < 1) return "刚刚同步";
    if (diff < 60) return `${diff}秒前同步`;
    if (diff < 3600) return `${Math.floor(diff / 60)}分钟前同步`;
    return new Date(lastSyncTime).toLocaleTimeString("zh-CN");
  };

  const toggleAutoSync = () => {
    if (isAutoSyncEnabled) {
      dataSyncService.stopMockDataSync();
    } else {
      dataSyncService.startMockDataSync(2000);
    }
    setIsAutoSyncEnabled(!isAutoSyncEnabled);
  };

  return (
    <div className="flex items-center space-x-4">
      <div className="flex items-center space-x-2">
        <div
          className={`w-3 h-3 rounded-full ${
            isSyncing ? "bg-green-500 animate-pulse" : "bg-gray-400"
          }`}
        />
        <span className="text-sm text-gray-600">
          {isSyncing ? "同步中..." : "已连接"}
        </span>
      </div>
      <span className="text-sm text-gray-500">{formatLastSync()}</span>
      <button
        onClick={toggleAutoSync}
        className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
          isAutoSyncEnabled
            ? "bg-blue-600 text-white hover:bg-blue-700"
            : "bg-gray-200 text-gray-700 hover:bg-gray-300"
        }`}
      >
        {isAutoSyncEnabled ? "停止模拟" : "开始模拟"}
      </button>
    </div>
  );
}
