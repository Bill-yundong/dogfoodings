import { Component, createEffect } from 'solid-js';
import { appState, actions } from '../../store';

export const DataStatsPanel: Component = () => {
  const stats = () => appState.cycleStats;
  const isDbReady = () => appState.isDbReady;

  createEffect(() => {
    if (isDbReady()) {
      actions.refreshCycleStats();
    }
  });

  return (
    <div style={{ background: '#fff', 'border-radius': '8px', padding: '16px', 'box-shadow': '0 2px 4px rgba(0,0,0,0.1)' }}>
      <div style={{ display: 'flex', 'justify-content': 'space-between', 'align-items': 'center', 'margin-bottom': '16px' }}>
        <h3 style={{ margin: 0, 'font-size': '18px', 'font-weight': 600, color: '#333' }}>循环数据统计</h3>
        <button
          onClick={() => actions.refreshCycleStats()}
          disabled={!isDbReady()}
          style={{
            padding: '6px 12px',
            border: 'none',
            'border-radius': '4px',
            background: isDbReady() ? '#2196F3' : '#ccc',
            color: '#fff',
            cursor: isDbReady() ? 'pointer' : 'not-allowed'
          }}
        >
          刷新
        </button>
      </div>

      {!isDbReady() ? (
        <div style={{ 'text-align': 'center', color: '#999', padding: '20px' }}>数据库初始化中...</div>
      ) : (
        <div style={{ display: 'grid', 'grid-template-columns': 'repeat(2, 1fr)', gap: '12px' }}>
          <div style={{ padding: '12px', 'border-radius': '6px', background: '#E3F2FD', 'text-align': 'center' }}>
            <div style={{ 'font-size': '24px', 'font-weight': 700, color: '#2196F3' }}>{stats().totalCycles}</div>
            <div style={{ 'font-size': '12px', color: '#666', 'margin-top': '4px' }}>总循环次数</div>
          </div>

          <div style={{ padding: '12px', 'border-radius': '6px', background: '#E8F5E9', 'text-align': 'center' }}>
            <div style={{ 'font-size': '24px', 'font-weight': 700, color: '#4CAF50' }}>{stats().successfulCycles}</div>
            <div style={{ 'font-size': '12px', color: '#666', 'margin-top': '4px' }}>成功次数</div>
          </div>

          <div style={{ padding: '12px', 'border-radius': '6px', background: '#FFEBEE', 'text-align': 'center' }}>
            <div style={{ 'font-size': '24px', 'font-weight': 700, color: '#f44336' }}>{stats().failedCycles}</div>
            <div style={{ 'font-size': '12px', color: '#666', 'margin-top': '4px' }}>失败次数</div>
          </div>

          <div style={{ padding: '12px', 'border-radius': '6px', background: '#FFF3E0', 'text-align': 'center' }}>
            <div style={{ 'font-size': '24px', 'font-weight': 700, color: '#FF9800' }}>{stats().avgDuration.toFixed(0)}</div>
            <div style={{ 'font-size': '12px', color: '#666', 'margin-top': '4px' }}>平均时长 (ms)</div>
          </div>

          <div style={{ padding: '12px', 'border-radius': '6px', background: '#F3E5F5', 'text-align': 'center' }}>
            <div style={{ 'font-size': '24px', 'font-weight': 700, color: '#9C27B0' }}>{stats().avgMotorCurrent.toFixed(1)}</div>
            <div style={{ 'font-size': '12px', color: '#666', 'margin-top': '4px' }}>平均电流 (mA)</div>
          </div>

          <div style={{ padding: '12px', 'border-radius': '6px', background: '#FCE4EC', 'text-align': 'center' }}>
            <div style={{ 'font-size': '24px', 'font-weight': 700, color: '#E91E63' }}>{(stats().obstacleRate * 100).toFixed(1)}%</div>
            <div style={{ 'font-size': '12px', color: '#666', 'margin-top': '4px' }}>障碍物率</div>
          </div>
        </div>
      )}
    </div>
  );
};
