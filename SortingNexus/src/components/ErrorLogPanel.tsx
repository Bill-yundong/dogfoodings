import React from 'react';

interface ErrorEvent {
  id: string;
  type: string;
  timestamp: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  packageId?: string;
  nodeId?: string;
  commandId?: string;
  resolved: boolean;
  resolvedAt?: number;
  resolution?: string;
}

interface ErrorLogPanelProps {
  errors: ErrorEvent[];
  maxDisplay?: number;
}

export const ErrorLogPanel: React.FC<ErrorLogPanelProps> = ({ errors, maxDisplay = 8 }) => {
  const getSeverityStyle = (severity: string) => {
    switch (severity) {
      case 'critical':
        return { bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500/50' };
      case 'high':
        return { bg: 'bg-orange-500/20', text: 'text-orange-400', border: 'border-orange-500/50' };
      case 'medium':
        return { bg: 'bg-yellow-500/20', text: 'text-yellow-400', border: 'border-yellow-500/50' };
      default:
        return { bg: 'bg-blue-500/20', text: 'text-blue-400', border: 'border-blue-500/50' };
    }
  };

  const displayErrors = errors.slice(-maxDisplay).reverse();

  return (
    <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
      <h3 className="text-lg font-semibold text-gray-300 mb-4 flex items-center gap-2">
        <span className="text-2xl">🚨</span> 异常日志
        {errors.length > 0 && (
          <span className="ml-auto text-sm bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full">
            {errors.filter(e => !e.resolved).length} 待处理
          </span>
        )}
      </h3>
      
      <div className="space-y-2 max-h-56 overflow-y-auto pr-2">
        {displayErrors.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            <span className="text-4xl block mb-2">✅</span>
            系统运行正常，暂无异常
          </div>
        ) : (
          displayErrors.map((error) => {
            const style = getSeverityStyle(error.severity);
            return (
              <div
                key={error.id}
                className={`${style.bg} ${style.text} border ${style.border} rounded-lg px-3 py-2 text-sm transition-all ${
                  error.resolved ? 'opacity-50' : ''
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="font-semibold">[{error.type}]</span>
                  <span className="text-xs opacity-75 whitespace-nowrap">
                    {new Date(error.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                <p className="mt-1 text-gray-300 text-xs">{error.message}</p>
                {error.resolved && error.resolution && (
                  <p className="mt-1 text-green-400 text-xs italic">✓ {error.resolution}</p>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default ErrorLogPanel;
