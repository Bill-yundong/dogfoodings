import { useState, useEffect } from 'react';
import { database } from '../services/database';

export function LogViewer() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadLogs();
  }, []);

  async function loadLogs() {
    setLoading(true);
    try {
      const results = await database.getSimulationResults(20);
      const signalLogs = await database.getSignalLogsByTimeRange(
        Date.now() - 24 * 60 * 60 * 1000,
        Date.now()
      );
      setLogs([...signalLogs, ...results]);
    } catch (e) {
      console.error('加载日志失败:', e);
    }
    setLoading(false);
  }

  function formatTime(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleString('zh-CN');
  }

  function getLogTypeLabel(log) {
    if (log.intersectionId) return '信号日志';
    if (log.planId) return '仿真结果';
    return '系统日志';
  }

  function getLogTypeColor(log) {
    if (log.intersectionId) return '#2196F3';
    if (log.planId) return '#9C27B0';
    return '#666';
  }

  return (
    <div style={{
      padding: '20px',
      backgroundColor: '#fff',
      borderRadius: '8px',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
      maxHeight: '400px',
      overflow: 'auto'
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '15px'
      }}>
        <h3 style={{ margin: 0, color: '#333' }}>信号配时日志</h3>
        <button
          onClick={loadLogs}
          disabled={loading}
          style={{
            padding: '6px 12px',
            border: 'none',
            borderRadius: '4px',
            backgroundColor: '#2196F3',
            color: '#fff',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontSize: '12px'
          }}
        >
          {loading ? '加载中...' : '刷新'}
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '20px', color: '#666' }}>
          加载日志中...
        </div>
      ) : logs.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
          暂无日志记录
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {logs.slice(0, 20).map((log, index) => (
            <div
              key={index}
              style={{
                padding: '12px',
                backgroundColor: '#f8f9fa',
                borderRadius: '6px',
                borderLeft: `3px solid ${getLogTypeColor(log)}`
              }}
            >
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '5px'
              }}>
                <span style={{
                  fontSize: '12px',
                  padding: '2px 6px',
                  backgroundColor: getLogTypeColor(log),
                  color: '#fff',
                  borderRadius: '4px'
                }}>
                  {getLogTypeLabel(log)}
                </span>
                <span style={{ fontSize: '11px', color: '#999' }}>
                  {formatTime(log.timestamp)}
                </span>
              </div>
              
              {log.intersectionId && (
                <div style={{ fontSize: '13px', color: '#333' }}>
                  <strong>交叉口:</strong> {log.intersectionId}
                  {log.isAligned !== undefined && (
                    <span style={{
                      marginLeft: '10px',
                      color: log.isAligned ? '#4CAF50' : '#F44336'
                    }}>
                      {log.isAligned ? '✓ 已对齐' : '✗ 未对齐'}
                    </span>
                  )}
                </div>
              )}
              
              {log.deviation && (
                <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                  偏差: 相位差 {log.deviation.offsetDiff?.toFixed(1)}s, 
                  周期差 {log.deviation.cycleDiff?.toFixed(1)}s
                </div>
              )}
              
              {log.planId && (
                <div style={{ fontSize: '13px', color: '#333' }}>
                  <strong>方案:</strong> {log.planId}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
