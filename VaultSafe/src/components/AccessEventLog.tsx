'use client';

import { AccessEvent } from '@/types/security';
import { CheckCircle, XCircle, Clock, User, Fingerprint } from 'lucide-react';

interface AccessEventLogProps {
  events: AccessEvent[];
}

const resultConfig = {
  granted: { icon: CheckCircle, color: 'text-emerald-500', bg: 'bg-emerald-500/10', label: '授权通过' },
  denied: { icon: XCircle, color: 'text-red-500', bg: 'bg-red-500/10', label: '访问拒绝' },
  pending: { icon: Clock, color: 'text-amber-500', bg: 'bg-amber-500/10', label: '处理中' },
};

const typeLabels: Record<string, string> = {
  fingerprint: '指纹',
  facial: '人脸识别',
  iris: '虹膜',
  palm: '掌纹',
};

export function AccessEventLog({ events }: AccessEventLogProps) {
  return (
    <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl overflow-hidden">
      <div className="p-4 border-b border-slate-700/50">
        <h2 className="text-lg font-semibold text-slate-100">访问事件日志</h2>
        <p className="text-sm text-slate-400">最近 {events.length} 条记录</p>
      </div>

      <div className="max-h-96 overflow-y-auto">
        {events.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            <Clock size={48} className="mx-auto mb-3 opacity-50" />
            <p>暂无访问记录</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-700/50">
            {events.map((event) => {
              const config = resultConfig[event.result];
              const biometricType = event.biometricHash?.hashType || 'unknown';

              return (
                <div key={event.id} className="p-4 hover:bg-slate-700/20 transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${config.bg}`}>
                        <config.icon size={18} className={config.color} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-slate-100">{config.label}</span>
                          <span className={`px-2 py-0.5 rounded text-xs ${config.bg} ${config.color}`}>
                            {typeLabels[biometricType] || biometricType}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 mt-1 text-sm text-slate-400">
                          <span className="flex items-center gap-1">
                            <User size={12} />
                            {event.userId}
                          </span>
                          <span className="flex items-center gap-1">
                            <Fingerprint size={12} />
                            {event.nodeId}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-mono text-xs text-vault-400">
                        对齐延迟: {event.alignmentLatency.toFixed(2)}ms
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        {new Date(event.timestamp).toLocaleTimeString('zh-CN')}
                      </p>
                    </div>
                  </div>
                  {event.reason && (
                    <p className="mt-2 text-sm text-red-400 bg-red-500/10 rounded px-2 py-1">
                      {event.reason}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
