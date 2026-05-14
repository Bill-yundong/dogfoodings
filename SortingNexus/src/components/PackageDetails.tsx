import React from 'react';
import { Package } from '../types/core';

interface PackageDetailsProps {
  pkg: Package | null;
}

export const PackageDetails: React.FC<PackageDetailsProps> = ({ pkg }) => {
  if (!pkg) {
    return (
      <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
        <h3 className="text-lg font-semibold text-gray-300 mb-4 flex items-center gap-2">
          <span className="text-2xl">📋</span> 包裹详情
        </h3>
        <div className="text-center text-gray-500 py-8">
          <span className="text-4xl block mb-2">👆</span>
          点击拓扑图中的包裹查看详情
        </div>
      </div>
    );
  }

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'sorted':
        return { bg: 'bg-green-500/20', text: 'text-green-400', label: '已分拣' };
      case 'sorting':
        return { bg: 'bg-blue-500/20', text: 'text-blue-400', label: '分拣中' };
      case 'error':
        return { bg: 'bg-red-500/20', text: 'text-red-400', label: '异常' };
      default:
        return { bg: 'bg-gray-500/20', text: 'text-gray-400', label: '待处理' };
    }
  };

  const statusStyle = getStatusStyle(pkg.status);

  return (
    <div className="bg-gray-800 rounded-xl p-4 border border-blue-500/50">
      <h3 className="text-lg font-semibold text-blue-400 mb-4 flex items-center gap-2">
        <span className="text-2xl">📋</span> 包裹详情
      </h3>
      
      <div className="space-y-3">
        <div className="flex justify-between items-center py-2 border-b border-gray-700">
          <span className="text-gray-400 text-sm">条码</span>
          <span className="font-mono text-sm text-gray-200">{pkg.barcode}</span>
        </div>
        
        <div className="flex justify-between items-center py-2 border-b border-gray-700">
          <span className="text-gray-400 text-sm">目的地</span>
          <span className="font-semibold text-gray-200">{pkg.destination}</span>
        </div>
        
        <div className="flex justify-between items-center py-2 border-b border-gray-700">
          <span className="text-gray-400 text-sm">状态</span>
          <span className={`px-2 py-0.5 rounded text-xs font-semibold ${statusStyle.bg} ${statusStyle.text}`}>
            {statusStyle.label}
          </span>
        </div>
        
        <div className="flex justify-between items-center py-2 border-b border-gray-700">
          <span className="text-gray-400 text-sm">当前位置</span>
          <span className="text-sm text-gray-200">{pkg.currentPosition}</span>
        </div>
        
        <div className="flex justify-between items-center py-2 border-b border-gray-700">
          <span className="text-gray-400 text-sm">重量</span>
          <span className="text-sm text-gray-200">{pkg.weight.toFixed(2)} kg</span>
        </div>
        
        <div className="flex justify-between items-center py-2 border-b border-gray-700">
          <span className="text-gray-400 text-sm">体积</span>
          <span className="text-sm text-gray-200">{pkg.volume.toFixed(3)} m³</span>
        </div>
        
        <div className="flex justify-between items-center py-2 border-b border-gray-700">
          <span className="text-gray-400 text-sm">优先级</span>
          <span className="text-sm text-gray-200">
            {'⭐'.repeat(pkg.priority + 1)}
          </span>
        </div>
        
        <div className="flex justify-between items-center py-2">
          <span className="text-gray-400 text-sm">路径节点</span>
          <span className="text-sm text-gray-200">{pkg.assignedPath.length} 个</span>
        </div>
        
        {pkg.assignedPath.length > 0 && (
          <div className="mt-2 p-3 bg-gray-900 rounded-lg">
            <div className="text-xs text-gray-500 mb-2">分拣路径</div>
            <div className="flex flex-wrap items-center gap-1">
              {pkg.assignedPath.map((node, index) => (
                <React.Fragment key={node}>
                  <span className={`px-2 py-1 rounded text-xs ${
                    node === pkg.currentPosition 
                      ? 'bg-blue-500 text-white font-bold' 
                      : 'bg-gray-700 text-gray-300'
                  }`}>
                    {node}
                  </span>
                  {index < pkg.assignedPath.length - 1 && (
                    <span className="text-gray-600">→</span>
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PackageDetails;
