import React from 'react';
import { ForgingBatch } from '../types';

interface BatchListProps {
  batches: ForgingBatch[];
  selectedBatchId: string | null;
  onSelectBatch: (batch: ForgingBatch) => void;
}

export const BatchList: React.FC<BatchListProps> = ({ batches, selectedBatchId, onSelectBatch }) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ongoing': return '#4caf50';
      case 'completed': return '#2196f3';
      case 'failed': return '#f44336';
      default: return '#9e9e9e';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'ongoing': return '进行中';
      case 'completed': return '已完成';
      case 'failed': return '失败';
      default: return '未知';
    }
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div style={{ maxHeight: 500, overflowY: 'auto' }}>
      {batches.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 40, color: '#999' }}>
          暂无锻造批次数据
        </div>
      ) : (
        batches.map((batch) => (
          <div
            key={batch.id}
            onClick={() => onSelectBatch(batch)}
            style={{
              padding: 16,
              marginBottom: 8,
              borderRadius: 8,
              backgroundColor: selectedBatchId === batch.id ? '#e3f2fd' : '#fafafa',
              border: `1px solid ${selectedBatchId === batch.id ? '#2196f3' : '#e0e0e0'}`,
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <div style={{ fontWeight: 600, fontSize: 14 }}>
                {batch.partNumber}
              </div>
              <span style={{
                padding: '4px 12px',
                borderRadius: 12,
                backgroundColor: getStatusColor(batch.status),
                color: 'white',
                fontSize: 12
              }}>
                {getStatusText(batch.status)}
              </span>
            </div>
            <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>
              材料: {batch.material} | 初始温度: {batch.initialTemperature}°C
            </div>
            <div style={{ fontSize: 12, color: '#666', display: 'flex', justifyContent: 'space-between' }}>
              <span>开始: {formatTime(batch.startTime)}</span>
              <span>快照: {batch.snapshots.length}</span>
              {batch.qualityScore !== undefined && (
                <span>质量分: {batch.qualityScore.toFixed(0)}</span>
              )}
            </div>
          </div>
        ))
      )}
    </div>
  );
};
