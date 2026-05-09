import { useState, useEffect } from 'react';
import { useVisibilitySync } from '../context/VisibilitySyncContext';
import { VisibilityCanvas } from './VisibilityCanvas';
import { asyncGeometricProjection, batchCalculatePerceptionScores } from '../lib/geometricProjection';
import { getCacheStats } from '../lib/roadNetworkCache';
import { mockBuildings, mockRoadSegments, mockViewpoints } from '../data/mockData';

interface CacheStats {
  tileCount: number;
  visibilityCount: number;
  perceptionCount: number;
}

export function TrafficAssessmentModule() {
  const {
    state,
    setVisibilityResult,
    setPerceptionScores,
    setRoadSegments,
    setBuildings,
    setViewpoints,
    syncModules,
    getAllVisibilityResults,
    getAllPerceptionScores,
    getAllRoadSegments
  } = useVisibilitySync();

  const [cacheStats, setCacheStats] = useState<CacheStats | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    setBuildings(mockBuildings);
    setRoadSegments(mockRoadSegments);
    setViewpoints(mockViewpoints);
    loadCacheStats();
  }, [setBuildings, setRoadSegments, setViewpoints]);

  const loadCacheStats = async () => {
    const stats = await getCacheStats();
    setCacheStats(stats);
  };

  const runTrafficAssessment = async () => {
    setIsRefreshing(true);

    const results = [];
    for (const vp of state.viewpoints) {
      const result = await asyncGeometricProjection(vp, state.buildings, 3);
      setVisibilityResult(result);
      results.push(result);
    }

    const scores = batchCalculatePerceptionScores(getAllRoadSegments(), results);
    setPerceptionScores(scores);

    await syncModules('traffic-assessment');
    await loadCacheStats();

    setIsRefreshing(false);
  };

  const allScores = getAllPerceptionScores();
  const avgScore =
    allScores.length > 0 ? allScores.reduce((sum, s) => sum + s.overallScore, 0) / allScores.length : 0;

  const getRoadTypeSummary = () => {
    const byType: Record<string, { count: number; avgScore: number; totalLength: number }> = {};

    for (const segment of getAllRoadSegments()) {
      const type = segment.type;
      if (!byType[type]) {
        byType[type] = { count: 0, avgScore: 0, totalLength: 0 };
      }
      byType[type].count++;

      let length = 0;
      for (let i = 0; i < segment.points.length - 1; i++) {
        const dx = segment.points[i + 1].x - segment.points[i].x;
        const dy = segment.points[i + 1].y - segment.points[i].y;
        length += Math.sqrt(dx * dx + dy * dy);
      }
      byType[type].totalLength += length;

      const score = allScores.find((s) => s.segmentId === segment.id);
      if (score) {
        byType[type].avgScore += score.overallScore;
      }
    }

    return Object.entries(byType).map(([type, data]) => ({
      type,
      count: data.count,
      avgScore: data.count > 0 ? data.avgScore / data.count : 0,
      totalLength: data.totalLength
    }));
  };

  const roadTypeSummary = getRoadTypeSummary();

  const getTrafficLevel = (score: number) => {
    if (score >= 0.7) return { label: '畅通', color: '#27AE60' };
    if (score >= 0.5) return { label: '缓行', color: '#F39C12' };
    if (score >= 0.3) return { label: '拥堵', color: '#E67E22' };
    return { label: '严重拥堵', color: '#E74C3C' };
  };

  const roadTypeLabels: Record<string, string> = {
    primary: '主干道',
    secondary: '次干道',
    tertiary: '支路',
    pedestrian: '步行道'
  };

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h2 style={{ margin: '0 0 5px 0', color: '#2C3E50' }}>🚦 交通评估模块</h2>
          <p style={{ margin: 0, color: '#7F8C8D', fontSize: '14px' }}>
            基于视域感知的交通流预测与路网评估
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={loadCacheStats}
            style={{ ...buttonStyle, backgroundColor: '#9B59B6' }}
          >
            📊 刷新缓存状态
          </button>
          <button
            onClick={runTrafficAssessment}
            disabled={isRefreshing}
            style={{ ...buttonStyle, backgroundColor: isRefreshing ? '#95A5A6' : '#E67E22' }}
          >
            {isRefreshing ? '⏳ 评估中...' : '🚗 运行交通评估'}
          </button>
        </div>
      </div>

      {state.syncState.isSynchronizing && (
        <div
          style={{
            marginBottom: '20px',
            padding: '10px',
            backgroundColor: '#FDF2E9',
            borderRadius: '8px',
            color: '#E67E22',
            fontSize: '14px'
          }}
        >
          🔄 正在同步数据到城市设计模块...
        </div>
      )}

      <div style={{ display: 'flex', gap: '20px' }}>
        <div
          style={{
            flex: 1,
            backgroundColor: '#FFFFFF',
            borderRadius: '12px',
            padding: '15px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
          }}
        >
          <h3 style={{ margin: '0 0 15px 0', color: '#2C3E50', fontSize: '16px' }}>
            交通可达性热力图
          </h3>
          <VisibilityCanvas
            buildings={state.buildings}
            segments={getAllRoadSegments()}
            viewpoints={state.viewpoints}
            visibilityResults={getAllVisibilityResults()}
            perceptionScores={getAllPerceptionScores()}
            selectedViewpointId={state.selectedViewpointId}
          />
          <div style={{ marginTop: '15px', display: 'flex', gap: '20px', fontSize: '12px', color: '#7F8C8D' }}>
            <span>🟢 高可达性</span>
            <span>🟡 中可达性</span>
            <span>🟠 低可达性</span>
            <span>🔴 极低可达性</span>
          </div>
        </div>

        <div style={{ width: '320px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '12px',
              padding: '15px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
            }}
          >
            <h3 style={{ margin: '0 0 15px 0', color: '#2C3E50', fontSize: '16px' }}>
              🚦 交通指数
            </h3>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                padding: '20px',
                backgroundColor: '#FDF2E9',
                borderRadius: '12px'
              }}
            >
              <div
                style={{
                  fontSize: '48px',
                  fontWeight: 'bold',
                  color: avgScore >= 0.6 ? '#27AE60' : '#E74C3C'
                }}
              >
                {(avgScore * 100).toFixed(0)}
              </div>
              <div style={{ fontSize: '14px', color: '#7F8C8D', marginTop: '5px' }}>
                综合通达指数
              </div>
              <div
                style={{
                  marginTop: '10px',
                  padding: '6px 16px',
                  borderRadius: '20px',
                  backgroundColor: getTrafficLevel(avgScore).color,
                  color: '#FFFFFF',
                  fontSize: '13px',
                  fontWeight: 500
                }}
              >
                {getTrafficLevel(avgScore).label}
              </div>
            </div>
          </div>

          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '12px',
              padding: '15px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
            }}
          >
            <h3 style={{ margin: '0 0 15px 0', color: '#2C3E50', fontSize: '16px' }}>
              🛣️ 道路类型评估
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {roadTypeSummary.map((item) => (
                <div
                  key={item.type}
                  style={{
                    padding: '12px',
                    backgroundColor: '#F8F9FA',
                    borderRadius: '8px'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ fontWeight: 'bold', color: '#2C3E50', fontSize: '13px' }}>
                      {roadTypeLabels[item.type] || item.type}
                    </span>
                    <span
                      style={{
                        color: item.avgScore >= 0.6 ? '#27AE60' : '#E74C3C',
                        fontWeight: 'bold',
                        fontSize: '13px'
                      }}
                    >
                      {(item.avgScore * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: '15px', fontSize: '11px', color: '#7F8C8D' }}>
                    <span>{item.count} 条路段</span>
                    <span>约 {item.totalLength.toFixed(0)}m</span>
                  </div>
                  <div
                    style={{
                      marginTop: '8px',
                      height: '6px',
                      backgroundColor: '#E0E0E0',
                      borderRadius: '3px',
                      overflow: 'hidden'
                    }}
                  >
                    <div
                      style={{
                        height: '100%',
                        width: `${item.avgScore * 100}%`,
                        backgroundColor: getTrafficLevel(item.avgScore).color,
                        transition: 'width 0.3s'
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {cacheStats && (
            <div
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '12px',
                padding: '15px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
              }}
            >
              <h3 style={{ margin: '0 0 15px 0', color: '#2C3E50', fontSize: '16px' }}>
                💾 IndexedDB 缓存状态
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <CacheStatItem
                  label="路网切片"
                  value={cacheStats.tileCount}
                  icon="🗺️"
                />
                <CacheStatItem
                  label="视域分析结果"
                  value={cacheStats.visibilityCount}
                  icon="👁️"
                />
                <CacheStatItem
                  label="感知评分"
                  value={cacheStats.perceptionCount}
                  icon="📊"
                />
              </div>
              {state.syncState.lastSyncTime > 0 && (
                <div
                  style={{
                    marginTop: '12px',
                    padding: '10px',
                    backgroundColor: '#E8F8F5',
                    borderRadius: '6px',
                    fontSize: '12px',
                    color: '#27AE60'
                  }}
                >
                  最后同步时间: {new Date(state.syncState.lastSyncTime).toLocaleString('zh-CN')}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function CacheStatItem({ label, value, icon }: { label: string; value: number; icon: string }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '10px',
        backgroundColor: '#F8F9FA',
        borderRadius: '6px'
      }}
    >
      <span style={{ fontSize: '13px', color: '#2C3E50' }}>
        {icon} {label}
      </span>
      <span style={{ fontWeight: 'bold', color: '#3498DB' }}>{value}</span>
    </div>
  );
}

const buttonStyle: React.CSSProperties = {
  padding: '10px 18px',
  border: 'none',
  borderRadius: '6px',
  cursor: 'pointer',
  fontSize: '14px',
  fontWeight: 500,
  color: '#FFFFFF',
  backgroundColor: '#27AE60',
  transition: 'all 0.2s'
};
