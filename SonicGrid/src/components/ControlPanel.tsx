import React from 'react';
import { NoiseSource, Building, SnapshotData } from '../types';

interface ControlPanelProps {
  sources: NoiseSource[];
  buildings: Building[];
  snapshots: SnapshotData[];
  onAddSource: () => void;
  onUpdateSource: (id: string, updates: Partial<NoiseSource>) => void;
  onRemoveSource: (id: string) => void;
  onAddBuilding: () => void;
  onRemoveBuilding: (id: string) => void;
  onSaveSnapshot: () => void;
  onLoadSnapshot: (snapshot: SnapshotData) => void;
  onDeleteSnapshot: (id: number) => void;
  onClearAll: () => void;
  isSimulating: boolean;
  onToggleSimulation: () => void;
  stats: {
    avgDecibels: number;
    maxDecibels: number;
    minDecibels: number;
  };
}

export const ControlPanel: React.FC<ControlPanelProps> = ({
  sources,
  buildings,
  snapshots,
  onAddSource,
  onUpdateSource,
  onRemoveSource,
  onAddBuilding,
  onRemoveBuilding,
  onSaveSnapshot,
  onLoadSnapshot,
  onDeleteSnapshot,
  onClearAll,
  isSimulating,
  onToggleSimulation,
  stats
}) => {
  return (
    <div style={{
      width: '320px',
      backgroundColor: '#1a1a2e',
      color: '#fff',
      padding: '20px',
      borderRadius: '12px',
      boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
      maxHeight: '90vh',
      overflowY: 'auto'
    }}>
      <h2 style={{ margin: '0 0 20px 0', fontSize: '22px', color: '#00d4ff' }}>
        🎵 SonicGrid
      </h2>

      <div style={{
        backgroundColor: 'rgba(0, 212, 255, 0.1)',
        padding: '15px',
        borderRadius: '8px',
        marginBottom: '20px'
      }}>
        <h3 style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#00d4ff' }}>
          实时统计
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          <div>
            <div style={{ fontSize: '11px', color: '#888' }}>平均噪声</div>
            <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#4ade80' }}>
              {stats.avgDecibels.toFixed(1)} dB
            </div>
          </div>
          <div>
            <div style={{ fontSize: '11px', color: '#888' }}>最大噪声</div>
            <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#f87171' }}>
              {stats.maxDecibels.toFixed(1)} dB
            </div>
          </div>
          <div>
            <div style={{ fontSize: '11px', color: '#888' }}>最小噪声</div>
            <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#60a5fa' }}>
              {stats.minDecibels.toFixed(1)} dB
            </div>
          </div>
          <div>
            <div style={{ fontSize: '11px', color: '#888' }}>源数量</div>
            <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#fbbf24' }}>
              {sources.filter(s => s.active).length}
            </div>
          </div>
        </div>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <button
          onClick={onToggleSimulation}
          style={{
            width: '100%',
            padding: '12px',
            backgroundColor: isSimulating ? '#ef4444' : '#22c55e',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: 'bold',
            cursor: 'pointer',
            transition: 'background-color 0.2s'
          }}
        >
          {isSimulating ? '⏹ 停止模拟' : '▶ 开始模拟'}
        </button>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <h3 style={{ margin: 0, fontSize: '16px', color: '#fbbf24' }}>
            🔊 噪声源
          </h3>
          <button
            onClick={onAddSource}
            style={{
              padding: '6px 12px',
              backgroundColor: '#fbbf24',
              color: '#1a1a2e',
              border: 'none',
              borderRadius: '4px',
              fontSize: '12px',
              fontWeight: 'bold',
              cursor: 'pointer'
            }}
          >
            + 添加
          </button>
        </div>

        <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
          {sources.map(source => (
            <div
              key={source.id}
              style={{
                backgroundColor: 'rgba(251, 191, 36, 0.1)',
                padding: '10px',
                borderRadius: '6px',
                marginBottom: '8px'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '13px', fontWeight: 'bold' }}>
                  {source.type === 'traffic' ? '🚗' : source.type === 'industrial' ? '🏭' : source.type === 'construction' ? '🏗' : '🎉'}
                  {' '}{source.type === 'traffic' ? '交通' : source.type === 'industrial' ? '工业' : source.type === 'construction' ? '施工' : '社交'}
                </span>
                <button
                  onClick={() => onRemoveSource(source.id)}
                  style={{
                    padding: '4px 8px',
                    backgroundColor: '#ef4444',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '4px',
                    fontSize: '10px',
                    cursor: 'pointer'
                  }}
                >
                  删除
                </button>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                <input
                  type="checkbox"
                  checked={source.active}
                  onChange={(e) => onUpdateSource(source.id, { active: e.target.checked })}
                  style={{ cursor: 'pointer' }}
                />
                <span style={{ fontSize: '11px' }}>启用</span>
              </div>

              <div style={{ marginBottom: '6px' }}>
                <label style={{ fontSize: '11px', color: '#888', display: 'block', marginBottom: '4px' }}>
                  声级: {source.baseDecibels.toFixed(1)} dB
                </label>
                <input
                  type="range"
                  min="40"
                  max="120"
                  step="0.1"
                  value={source.baseDecibels}
                  onChange={(e) => onUpdateSource(source.id, { baseDecibels: Number(Number(e.target.value).toFixed(1)) })}
                  style={{ width: '100%' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '11px', color: '#888', display: 'block', marginBottom: '4px' }}>
                  频率: {source.frequency >= 1000 
                    ? `${(source.frequency / 1000).toFixed(1)} kHz` 
                    : `${Math.round(source.frequency)} Hz`}
                </label>
                <input
                  type="range"
                  min="20"
                  max="2000"
                  value={source.frequency}
                  onChange={(e) => onUpdateSource(source.id, { 
                    frequency: Number(e.target.value) >= 1000 
                      ? Number(e.target.value) 
                      : Math.round(Number(e.target.value)) 
                  })}
                  style={{ width: '100%' }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <h3 style={{ margin: 0, fontSize: '16px', color: '#a78bfa' }}>
            🏢 建筑物
          </h3>
          <button
            onClick={onAddBuilding}
            style={{
              padding: '6px 12px',
              backgroundColor: '#a78bfa',
              color: '#1a1a2e',
              border: 'none',
              borderRadius: '4px',
              fontSize: '12px',
              fontWeight: 'bold',
              cursor: 'pointer'
            }}
          >
            + 添加
          </button>
        </div>

        <div style={{ maxHeight: '150px', overflowY: 'auto' }}>
          {buildings.map(building => (
            <div
              key={building.id}
              style={{
                backgroundColor: 'rgba(167, 139, 250, 0.1)',
                padding: '8px',
                borderRadius: '6px',
                marginBottom: '6px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <span style={{ fontSize: '12px' }}>
                {building.material === 'concrete' ? '🧱' : building.material === 'glass' ? '🪟' : '🏠'}
                {' '}{Math.round(building.width)}x{Math.round(building.height)}
              </span>
              <button
                onClick={() => onRemoveBuilding(building.id)}
                style={{
                  padding: '4px 8px',
                  backgroundColor: '#ef4444',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  fontSize: '10px',
                  cursor: 'pointer'
                }}
              >
                删除
              </button>
            </div>
          ))}
        </div>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <h3 style={{ margin: 0, fontSize: '16px', color: '#34d399' }}>
            📸 快照记录
          </h3>
          <button
            onClick={onSaveSnapshot}
            style={{
              padding: '6px 12px',
              backgroundColor: '#34d399',
              color: '#1a1a2e',
              border: 'none',
              borderRadius: '4px',
              fontSize: '12px',
              fontWeight: 'bold',
              cursor: 'pointer'
            }}
          >
            保存
          </button>
        </div>

        <div style={{ maxHeight: '150px', overflowY: 'auto' }}>
          {snapshots.map(snapshot => (
            <div
              key={snapshot.id}
              style={{
                backgroundColor: 'rgba(52, 211, 153, 0.1)',
                padding: '8px',
                borderRadius: '6px',
                marginBottom: '6px'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '11px' }}>
                    {new Date(snapshot.timestamp).toLocaleString('zh-CN')}
                  </div>
                  <div style={{ fontSize: '10px', color: '#888' }}>
                    平均: {snapshot.metadata.avgDecibels.toFixed(1)} dB
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '4px' }}>
                  <button
                    onClick={() => onLoadSnapshot(snapshot)}
                    style={{
                      padding: '4px 8px',
                      backgroundColor: '#3b82f6',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '4px',
                      fontSize: '10px',
                      cursor: 'pointer'
                    }}
                  >
                    加载
                  </button>
                  <button
                    onClick={() => snapshot.id && onDeleteSnapshot(snapshot.id)}
                    style={{
                      padding: '4px 8px',
                      backgroundColor: '#ef4444',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '4px',
                      fontSize: '10px',
                      cursor: 'pointer'
                    }}
                  >
                    删除
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <button
        onClick={onClearAll}
        style={{
          width: '100%',
          padding: '10px',
          backgroundColor: 'transparent',
          color: '#ef4444',
          border: '1px solid #ef4444',
          borderRadius: '8px',
          fontSize: '12px',
          cursor: 'pointer',
          transition: 'all 0.2s'
        }}
        onMouseOver={(e) => {
          e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.2)';
        }}
        onMouseOut={(e) => {
          e.currentTarget.style.backgroundColor = 'transparent';
        }}
      >
        🗑 清空所有
      </button>
    </div>
  );
};
