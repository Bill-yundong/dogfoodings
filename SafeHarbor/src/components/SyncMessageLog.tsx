import React from 'react';
import type { SemanticSyncMessage } from '../types';
import { formatTime } from '../utils/format';
import { MESSAGE_TYPE_LABELS, MESSAGE_SOURCE_LABELS } from '../constants';

interface SyncMessageLogProps {
  messages: SemanticSyncMessage[];
}

export const SyncMessageLog: React.FC<SyncMessageLogProps> = ({ messages }) => {
  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">语义同步消息日志</h3>
      
      {messages.length === 0 ? (
        <p className="text-gray-500 text-center py-4">暂无消息</p>
      ) : (
        <div className="space-y-3 max-h-80 overflow-y-auto">
          {messages.slice().reverse().map((msg) => (
            <MessageItem key={msg.id} message={msg} />
          ))}
        </div>
      )}
    </div>
  );
};

const MessageItem: React.FC<{ message: SemanticSyncMessage }> = ({ message }) => {
  const isMonitoring = message.source === 'monitoring';
  
  return (
    <div className={`p-3 rounded-lg border ${
      isMonitoring ? 'border-blue-200 bg-blue-50' : 'border-green-200 bg-green-50'}`}>
      <div className="flex justify-between items-start mb-2">
        <span className="text-xs font-medium px-2 py-1 rounded bg-white">
          {MESSAGE_SOURCE_LABELS[message.source]}
        </span>
        <span className="text-xs text-gray-500">
          {formatTime(message.timestamp)}
        </span>
      </div>
      <div className="text-sm font-medium text-gray-800 mb-1">
        {MESSAGE_TYPE_LABELS[message.type]}
      </div>
      <div className="text-xs text-gray-600 truncate">
        {typeof message.payload === 'object' 
          ? (message.payload as any).description 
            || (message.payload as any).command 
            || JSON.stringify(message.payload).slice(0, 50)
          : String(message.payload).slice(0, 50)}
      </div>
      <div className="text-xs text-gray-400 mt-1 font-mono">
        Hash: {message.semanticHash}
      </div>
    </div>
  );
};
