import { useState, useEffect } from 'react';
import { useVisibilitySync } from '../context/VisibilitySyncContext';
import { asyncGeometricProjection, batchCalculatePerceptionScores } from '../lib/geometricProjection';
import { VisibilityCanvas } from './VisibilityCanvas';
import { mockBuildings, mockRoadSegments, mockViewpoints } from '../data/mockData';
import type { Viewpoint } from '../types';

export function UrbanDesignModule() {
  const {
    state,
    setVisibilityResult,
    setPerceptionScores,
    setRoadSegments,
    setBuildings,
    setViewpoints,
    selectViewpoint,
    syncModules,
    getAllVisibilityResults,
    getAllPerceptionScores,
    getAllRoadSegments
  } = useVisibilitySync();

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);

  useEffect(() => {
    setBuildings(mockBuildings);
    setRoadSegments(mockRoadSegments);
    setViewpoints(mockViewpoints);
  }, [setBuildings, setRoadSegments, setViewpoints]);

  const runVisibilityAnalysis = async () => {
    setIsAnalyzing(true);
    setAnalysisProgress(0);

    const results = [];
    const totalViewpoints = state.viewpoints.length;

    for (let i = 0; i < state.viewpoints.length; i++) {
      const vp = state.viewpoints[i];
      const result = await asyncGeometricProjection(vp, state.buildings, 3);
      setVisibilityResult(result);
      results.push(result);
      setAnalysisProgress(((i + 1) / totalViewpoints) * 80);
    }

    const scores = batchCalculatePerceptionScores(getAllRoadSegments(), results);
    setPerceptionScores(scores);
    setAnalysisProgress(100);

    await syncModules('urban-design');

    setTimeout(() => {
      setIsAnalyzing(false);
    }, 500);
  };

  const handleViewpointClick = (viewpointId: string) => {
    selectViewpoint(viewpointId);
  };

  const addRandomViewpoint = () => {
    const newVp: Viewpoint = {
      id: `vp-${Date.now()}`,
      position: {
        x: 100 + Math.random() * 400,
        y: 100 + Math.random() * 400
      },
      height: 1.7,
      fieldOfView: 90,
      maxDistance: 120,
      direction: Math.random() * 360
    };

    const existing = state.viewpoints.find(
      (v) => v.position.x === newVp.position.x && v.position.y === newVp.position.y
    );

    if (!existing) {
      const newViewpoints = [...state.viewpoints, newVp];
      setViewpoints(newViewpoints);
    }
  };

  const selectedViewpoint = state.viewpoints.find((v) => v.id === state.selectedViewpointId);
  const selectedResult = state.selectedViewpointId
    ? state.visibilityResults.get(state.selectedViewpointId)
    : undefined;

  const allScores = getAllPerceptionScores();
  const avgScore =
    allScores.length > 0 ? allScores.reduce((sum, s) => sum + s.overallScore, 0) / allScores.length : 0;

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h2 style={{ margin: '0 0 5px 0', color: '#2C3E50' }}>🏛️ 城市设计模块</h2>
          <p style={{ margin: 0, color: '#7F8C8D', fontSize: '14px' }}>
            视域分析与街道空间感知评估
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={addRandomViewpoint}
            disabled={isAnalyzing}
            style={buttonStyle}
          >
            ➕ 添加视点
          </button>
          <button
            onClick={runVisibilityAnalysis}
            disabled={isAnalyzing || state.viewpoints.length === 0}
            style={{ ...buttonStyle, backgroundColor: isAnalyzing ? '#95A5A6' : '#3498DB' }}
          >
            {isAnalyzing ? '⏳ 分析中...' : '🔍 运行视域分析'}
          </button>
        </div>
      </div>

      {isAnalyzing && (
        <div
          style={{
            marginBottom: '20px',
            padding: '15px',
            backgroundColor: '#E8F6FC',
            borderRadius: '8px'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ color: '#2C3E50', fontSize: '14px' }}>分析进度</span>
            <span style={{ color: '#3498DB', fontWeight: 'bold' }}>{analysisProgress.toFixed(0)}%</span>
          </div>
          <div
            style={{
              height: '8px',
              backgroundColor: '#BDC3C7',
              borderRadius: '4px',
              overflow: 'hidden'
            }}
          >
            <div
              style={{
                height: '100%',
                width: `${analysisProgress}%`,
                backgroundColor: '#3498DB',
                transition: 'width 0.3s'
              }}
            />
          </div>
        </div>
      )}

      {state.syncState.isSynchronizing && (
        <div
          style={{
            marginBottom: '20px',
            padding: '10px',
            backgroundColor: '#E8F8F5',
            borderRadius: '8px',
            color: '#27AE60',
            fontSize: '14px'
          }}
        >
          🔄 正在同步数据到交通评估模块...
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
            视域分析画布
          </h3>
          <VisibilityCanvas
            buildings={state.buildings}
            segments={getAllRoadSegments()}
            viewpoints={state.viewpoints}
            visibilityResults={getAllVisibilityResults()}
            perceptionScores={getAllPerceptionScores()}
            selectedViewpointId={state.selectedViewpointId}
            onViewpointClick={handleViewpointClick}
          />
          <div style={{ marginTop: '15px', display: 'flex', gap: '20px', fontSize: '12px', color: '#7F8C8D' }}>
            <span>🟢 可见区域</span>
            <span>🔵 视点位置</span>
            <span>⬛ 建筑物</span>
            <span>⚫ 道路</span>
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
              📊 总体评估
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <StatCard label="视点数量" value={state.viewpoints.length} />
              <StatCard label="道路段数" value={getAllRoadSegments().length} />
              <StatCard label="建筑数量" value={state.buildings.length} />
              <StatCard
                label="平均可达性"
                value={`${(avgScore * 100).toFixed(1)}%`}
                highlight
              />
            </div>
          </div>

          {selectedViewpoint && (
            <div
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '12px',
                padding: '15px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
              }}
            >
              <h3 style={{ margin: '0 0 15px 0', color: '#2C3E50', fontSize: '16px' }}>
                🎯 选中视点详情
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px' }}>
                <InfoRow label="视点 ID" value={selectedViewpoint.id} />
                <InfoRow
                  label="位置"
                  value={`(${selectedViewpoint.position.x.toFixed(0)}, ${selectedViewpoint.position.y.toFixed(0)})`}
                />
                <InfoRow label="视野角度" value={`${selectedViewpoint.fieldOfView}°`} />
                <InfoRow label="视距" value={`${selectedViewpoint.maxDistance}m`} />
                <InfoRow label="朝向" value={`${selectedViewpoint.direction}°`} />
                {selectedResult && (
                  <>
                    <InfoRow
                      label="可见率"
                      value={`${(selectedResult.visibilityRatio * 100).toFixed(1)}%`}
                    />
                    <InfoRow
                      label="分析单元"
                      value={`${selectedResult.totalVisible}/${selectedResult.totalAnalyzed}`}
                    />
                  </>
                )}
              </div>
            </div>
          )}

          {allScores.length > 0 && (
            <div
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '12px',
                padding: '15px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                maxHeight: '300px',
                overflowY: 'auto'
              }}
            >
              <h3 style={{ margin: '0 0 15px 0', color: '#2C3E50', fontSize: '16px' }}>
                🛣️ 街道可达性评分
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {allScores.map((score) => {
                  const segment = state.roadSegments.get(score.segmentId);
                  return (
                    <div
                      key={score.segmentId}
                      style={{
                        padding: '10px',
                        backgroundColor: '#F8F9FA',
                        borderRadius: '8px',
                        fontSize: '12px'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                        <span style={{ fontWeight: 'bold', color: '#2C3E50' }}>
                          {segment?.name || score.segmentId}
                        </span>
                        <span
                          style={{
                            color: score.overallScore >= 0.6 ? '#27AE60' : '#E74C3C',
                            fontWeight: 'bold'
                          }}
                        >
                          {(score.overallScore * 100).toFixed(0)}%
                        </span>
                      </div>
                      <div style={{ display: 'flex', gap: '10px', color: '#7F8C8D' }}>
                        <span>步行: {(score.pedestrianAccessibility * 100).toFixed(0)}%</span>
                        <span>连通: {(score.visualConnectivity * 100).toFixed(0)}%</span>
                        <span>安全: {(score.safetyPerception * 100).toFixed(0)}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, highlight }: { label: string; value: string | number; highlight?: boolean }) {
  return (
    <div
      style={{
        padding: '12px',
        backgroundColor: highlight ? '#E8F6FC' : '#F8F9FA',
        borderRadius: '8px',
        textAlign: 'center'
      }}
    >
      <div style={{ fontSize: '20px', fontWeight: 'bold', color: highlight ? '#3498DB' : '#2C3E50' }}>
        {value}
      </div>
      <div style={{ fontSize: '11px', color: '#7F8C8D', marginTop: '4px' }}>{label}</div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
      <span style={{ color: '#7F8C8D' }}>{label}</span>
      <span style={{ color: '#2C3E50', fontWeight: 500 }}>{value}</span>
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
