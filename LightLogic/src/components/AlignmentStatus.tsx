'use client';

import { AlignmentData } from '@/lib/types';

interface AlignmentStatusProps {
  alignments: AlignmentData[];
  report: {
    total: number;
    aligned: number;
    conflicts: number;
    pending: number;
  };
}

export function AlignmentStatus({ alignments, report }: AlignmentStatusProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'aligned':
        return 'bg-green-600';
      case 'conflict':
        return 'bg-red-600';
      case 'pending':
        return 'bg-yellow-600';
      default:
        return 'bg-gray-600';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'aligned':
        return '已对齐';
      case 'conflict':
        return '冲突';
      case 'pending':
        return '待处理';
      default:
        return status;
    }
  };

  return (
    <div className="bg-gray-800 rounded-lg p-4">
      <h2 className="text-xl font-bold text-white mb-4">数据对齐状态</h2>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-gray-700 rounded-lg p-3">
          <div className="text-2xl font-bold text-white">{report.total}</div>
          <div className="text-sm text-gray-300">总数</div>
        </div>
        <div className="bg-green-900 rounded-lg p-3">
          <div className="text-2xl font-bold text-green-400">
            {report.aligned}
          </div>
          <div className="text-sm text-green-300">已对齐</div>
        </div>
        <div className="bg-red-900 rounded-lg p-3">
          <div className="text-2xl font-bold text-red-400">
            {report.conflicts}
          </div>
          <div className="text-sm text-red-300">冲突</div>
        </div>
        <div className="bg-yellow-900 rounded-lg p-3">
          <div className="text-2xl font-bold text-yellow-400">
            {report.pending}
          </div>
          <div className="text-sm text-yellow-300">待处理</div>
        </div>
      </div>

      <h3 className="text-lg font-semibold text-white mb-3">对齐详情</h3>
      <div className="space-y-2 max-h-64 overflow-y-auto">
        {alignments.length === 0 ? (
          <div className="text-gray-400 text-center py-4">
            暂无对齐数据
          </div>
        ) : (
          alignments.map((alignment) => (
            <div
              key={alignment.id}
              className="bg-gray-700 rounded-lg p-3 flex items-center justify-between"
            >
              <div>
                <div className="text-white font-medium">
                  {alignment.buildingId}
                </div>
                <div className="text-sm text-gray-400">
                  EPA: {alignment.epaReflectivity.toFixed(2)} →
                  规划: {alignment.planningReflectivity.toFixed(2)} →
                  对齐: {alignment.alignedReflectivity.toFixed(2)}
                </div>
              </div>
              <div
                className={`${getStatusColor(alignment.status)} px-3 py-1 rounded-full text-xs text-white`}
              >
                {getStatusText(alignment.status)}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
