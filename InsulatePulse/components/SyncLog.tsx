'use client';

import { SemanticSyncMessage } from '@/types';
import { formatMessageForDisplay } from '@/lib/semanticSync';

interface SyncLogProps {
  messages: SemanticSyncMessage[];
}

export function SyncLog({ messages }: SyncLogProps) {
  const statusColors = {
    pending: 'bg-yellow-500',
    confirmed: 'bg-success-500',
    rejected: 'bg-danger-500'
  };

  const statusLabels = {
    pending: '待处理',
    confirmed: '已确认',
    rejected: '已拒绝'
  };

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <h3 className="text-lg font-semibold mb-4">语义同步日志</h3>
      <div className="space-y-2 max-h-64 overflow-y-auto">
        {messages.length === 0 ? (
          <div className="text-gray-500 text-center py-4">暂无同步消息</div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
              <span className="text-sm">{formatMessageForDisplay(message)}</span>
              <span className={`px-2 py-0.5 text-xs rounded text-white ${statusColors[message.status]}`}>
                {statusLabels[message.status]}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}