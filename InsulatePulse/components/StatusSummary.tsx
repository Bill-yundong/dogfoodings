'use client';

interface StatusSummaryProps {
  total: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
}

export function StatusSummary({ total, critical, high, medium, low }: StatusSummaryProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
      <div className="bg-gray-50 rounded-lg p-4 text-center">
        <div className="text-3xl font-bold text-gray-800">{total}</div>
        <div className="text-sm text-gray-600">设备总数</div>
      </div>
      <div className="bg-danger-50 rounded-lg p-4 text-center">
        <div className="text-3xl font-bold text-danger-700">{critical}</div>
        <div className="text-sm text-danger-600">严重风险</div>
      </div>
      <div className="bg-orange-50 rounded-lg p-4 text-center">
        <div className="text-3xl font-bold text-orange-700">{high}</div>
        <div className="text-sm text-orange-600">高风险</div>
      </div>
      <div className="bg-warning-50 rounded-lg p-4 text-center">
        <div className="text-3xl font-bold text-warning-700">{medium}</div>
        <div className="text-sm text-warning-600">中风险</div>
      </div>
      <div className="bg-success-50 rounded-lg p-4 text-center">
        <div className="text-3xl font-bold text-success-700">{low}</div>
        <div className="text-sm text-success-600">正常运行</div>
      </div>
    </div>
  );
}