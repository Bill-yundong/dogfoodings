import React from 'react';
import type { SemanticSyncMessage } from '../types';

interface SyncMessageLogProps {
  messages: SemanticSyncMessage[];
}

const typeLabels: Record<string, string> = {
  status_update: '状态更新',
  alert: '警报',
  command: '指令',
  acknowledgment: '确认'
};

const sourceLabels: Record<string, string> = {
  monitoring: '监控中心',
  ship: '船舶终端'
};

export const SyncMessageLog: React.FC<SyncMessageLogProps> = ({ messages }) => {
  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">语义同步消息日志</h3>
      
      {messages.length === 0 ? (
        <p className="text-gray-500 text-center py-4">暂无消息</p>
      ) : (
        <div className="space-y-3 max-h-80 overflow-y-auto">
          {messages.slice().reverse().map((msg) => (
            <div 
              key={msg.id}
              className={`p-3 rounded-lg border ${
                msg.source === 'monitoring' ? 'border-blue-200 bg-blue-50' : 'border-green-200 bg-green-50'
              }`}
            >
              <div className="flex justify-between items-start mb-2">
                <span className="text-xs font-medium px-2 py-1 rounded bg-white">
                  {sourceLabels[msg.source]}
                </span>
                <span className="text-xs text-gray-500">
                  {new Date(msg.timestamp).toLocaleTimeString()}
                </span>
              </div>
              <div className="text-sm font-medium text-gray-800 mb-1">
                {typeLabels[msg.type]}
              </div>
              <div className="text-xs text-gray-600">
                {typeof msg.payload === 'object' 
                  ? msg.payload.description || msg.payload.command || JSON.stringify(msg.payload).slice(0, 50)
                  : String(msg.payload).slice(0, 50)}
              </div>
              <div className="text-xs text-gray-400 mt-1 font-mono">
                Hash: {msg.semanticHash}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
