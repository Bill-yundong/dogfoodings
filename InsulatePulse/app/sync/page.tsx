'use client';

import { useEffect, useState } from 'react';
import { SemanticSyncMessage } from '@/types';
import { SyncLog } from '@/components/SyncLog';
import { db, ensureDatabaseInitialized } from '@/lib/database';
import { semanticSynchronizer } from '@/lib/semanticSync';

export default function SyncPage() {
  const [messages, setMessages] = useState<SemanticSyncMessage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      await ensureDatabaseInitialized();
      await refreshMessages();
      
      const pollingInterval = setInterval(async () => {
        await semanticSynchronizer.processPendingMessages();
        await refreshMessages();
      }, 5000);

      return () => clearInterval(pollingInterval);
    };
    loadData();
  }, []);

  const refreshMessages = async () => {
    const pendingMessages = await db.getPendingSyncMessages();
    setMessages(pendingMessages);
    setLoading(false);
  };

  const handleProcessMessages = async () => {
    await semanticSynchronizer.processPendingMessages();
    await refreshMessages();
  };

  if (loading) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="text-xl">加载中...</div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">系统同步</h1>
        <p className="text-gray-600">状态检修与调度控制系统间的语义同步</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">待同步消息</h3>
            <button
              onClick={handleProcessMessages}
              className="px-4 py-2 bg-primary-500 text-white rounded hover:bg-primary-600 transition-colors"
            >
              处理消息
            </button>
          </div>
          <SyncLog messages={messages} />
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="text-lg font-semibold mb-4">同步系统状态</h3>
          <div className="space-y-4">
            <div className="p-4 bg-gray-50 rounded">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium">检修系统</span>
                <span className="flex items-center text-success-600">
                  <span className="w-2 h-2 rounded-full bg-success-500 mr-2"></span>
                  已连接
                </span>
              </div>
              <div className="text-sm text-gray-500">最后同步: {new Date().toLocaleString()}</div>
            </div>
            
            <div className="p-4 bg-gray-50 rounded">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium">调度系统</span>
                <span className="flex items-center text-success-600">
                  <span className="w-2 h-2 rounded-full bg-success-500 mr-2"></span>
                  已连接
                </span>
              </div>
              <div className="text-sm text-gray-500">最后同步: {new Date().toLocaleString()}</div>
            </div>

            <div className="p-4 bg-primary-50 rounded border border-primary-200">
              <h4 className="font-medium text-primary-800 mb-2">同步统计</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">待处理消息:</span>
                  <span className="font-medium ml-2">{messages.filter(m => m.status === 'pending').length}</span>
                </div>
                <div>
                  <span className="text-gray-600">已确认消息:</span>
                  <span className="font-medium ml-2">{messages.filter(m => m.status === 'confirmed').length}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}