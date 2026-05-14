import React from 'react';
import { Package, ErrorEvent } from '../../types';

interface RightPanelProps {
  selectedPackage: Package | null;
  errors: ErrorEvent[];
}

export const RightPanel: React.FC<RightPanelProps> = ({ selectedPackage, errors }) => {
  const unresolvedErrors = errors.filter(e => !e.resolved);

  return (
    <aside className="w-96 bg-gray-800 border-l border-gray-700 p-5 min-h-screen overflow-y-auto">
      <h2 className="text-lg font-semibold text-gray-300 mb-4 flex items-center gap-2">
        <span>📋</span> 包裹详情
      </h2>
      
      {selectedPackage ? (
        <div className="bg-gray-700/50 rounded-xl p-4 space-y-4">
          <InfoRow label="条码" value={selectedPackage.barcode} mono />
          <InfoRow label="目的地" value={selectedPackage.destination} />
          <InfoRow label="状态" value={
            <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
              selectedPackage.status === 'sorted' ? 'bg-green-500/20 text-green-400' :
              selectedPackage.status === 'sorting' ? 'bg-blue-500/20 text-blue-400' :
              'bg-gray-500/20 text-gray-400'
            }`}>
              {selectedPackage.status === 'sorted' ? '已分拣' :
               selectedPackage.status === 'sorting' ? '分拣中' : '待处理'}
            </span>
          } />
          <InfoRow label="当前位置" value={selectedPackage.currentPosition} />
          <InfoRow label="重量" value={`${selectedPackage.weight.toFixed(2)} kg`} />
          <InfoRow label="体积" value={`${selectedPackage.volume.toFixed(3)} m³`} />
          <InfoRow label="优先级" value={'⭐'.repeat(selectedPackage.priority + 1)} />
          
          {selectedPackage.assignedPath.length > 0 && (
            <div>
              <div className="text-gray-500 text-xs mb-2">分拣路径</div>
              <div className="flex flex-wrap items-center gap-1">
                {selectedPackage.assignedPath.map((node, index) => (
                  <React.Fragment key={node}>
                    <span className={`px-2 py-1 rounded text-xs ${
                      node === selectedPackage.currentPosition 
                        ? 'bg-blue-500 text-white font-bold' 
                        : 'bg-gray-600 text-gray-300'
                    }`}>
                      {node}
                    </span>
                    {index < selectedPackage.assignedPath.length - 1 && (
                      <span className="text-gray-600">→</span>
                    )}
                  </React.Fragment>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center text-gray-500 py-12 bg-gray-700/30 rounded-xl">
          <span className="text-4xl block mb-3">👆</span>
          <p className="text-sm">点击拓扑图中的包裹查看详情</p>
        </div>
      )}

      <h2 className="text-lg font-semibold text-gray-300 mt-8 mb-4 flex items-center gap-2">
        <span>🚨</span> 异常日志
        {unresolvedErrors.length > 0 && (
          <span className="ml-auto text-sm bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full">
            {unresolvedErrors.length} 待处理
          </span>
        )}
      </h2>
      
      <div className="space-y-2 max-h-80 overflow-y-auto">
        {errors.length === 0 ? (
          <div className="text-center text-gray-500 py-8 bg-gray-700/30 rounded-xl">
            <span className="text-4xl block mb-2">✅</span>
            系统运行正常
          </div>
        ) : (
          errors.slice(-10).reverse().map(error => (
            <div
              key={error.id}
              className={`rounded-xl px-3 py-3 text-sm ${
                error.severity === 'critical' ? 'bg-red-500/10 border border-red-500/30' :
                error.severity === 'high' ? 'bg-orange-500/10 border border-orange-500/30' :
                error.severity === 'medium' ? 'bg-yellow-500/10 border border-yellow-500/30' :
                'bg-blue-500/10 border border-blue-500/30'
              } ${error.resolved ? 'opacity-50' : ''}`}
            >
              <div className="flex items-start justify-between gap-2">
                <span className={`font-semibold ${
                  error.severity === 'critical' ? 'text-red-400' :
                  error.severity === 'high' ? 'text-orange-400' :
                  error.severity === 'medium' ? 'text-yellow-400' :
                  'text-blue-400'
                }`}>
                  [{error.type}]
                </span>
                <span className="text-xs text-gray-500 whitespace-nowrap">
                  {new Date(error.timestamp).toLocaleTimeString()}
                </span>
              </div>
              <p className="mt-1.5 text-gray-300 text-xs">{error.message}</p>
              {error.resolved && error.resolution && (
                <p className="mt-1 text-green-400 text-xs italic">✓ {error.resolution}</p>
              )}
            </div>
          ))
        )}
      </div>
    </aside>
  );
};

const InfoRow: React.FC<{ label: string; value: React.ReactNode; mono?: boolean }> = ({ 
  label, 
  value, 
  mono 
}) => (
  <div className="flex justify-between items-center py-2 border-b border-gray-600/50 last:border-0">
    <span className="text-gray-500 text-xs">{label}</span>
    <span className={`text-sm ${mono ? 'font-mono' : ''} text-gray-200`}>{value}</span>
  </div>
);

export default RightPanel;
