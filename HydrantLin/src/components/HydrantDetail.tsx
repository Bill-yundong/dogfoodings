import { Component, createMemo } from 'solid-js';
import { AppStore } from '../store';
import { formatTimestamp } from '../utils';

interface HydrantDetailProps {
  store: AppStore;
}

export const HydrantDetail: Component<HydrantDetailProps> = (props) => {
  const { state, actions } = props.store;

  const selectedHydrant = createMemo(() => {
    if (!state.selectedHydrantId) return null;
    return state.hydrants.find((h) => h.id === state.selectedHydrantId) || null;
  });

  const pressureDistribution = createMemo(() => {
    if (!state.selectedHydrantId) return null;
    return state.pressureDistributions.get(state.selectedHydrantId) || null;
  });

  return (
    <div class="hydrant-detail">
      <h3>消火栓详情</h3>

      {!selectedHydrant() ? (
        <p class="empty-message">请在地图上选择一个消火栓</p>
      ) : (
        <>
          <div class="detail-section">
            <h4>基本信息</h4>
            <div class="detail-row">
              <span>名称:</span>
              <span>{selectedHydrant()?.name}</span>
            </div>
            <div class="detail-row">
              <span>编号:</span>
              <span>{selectedHydrant()?.code}</span>
            </div>
            <div class="detail-row">
              <span>状态:</span>
              <span class={`status-${selectedHydrant()?.status}`}>
                {selectedHydrant()?.status}
              </span>
            </div>
            <div class="detail-row">
              <span>区域:</span>
              <span>{selectedHydrant()?.region}</span>
            </div>
            <div class="detail-row">
              <span>地址:</span>
              <span>{selectedHydrant()?.address}</span>
            </div>
            <div class="detail-row">
              <span>管径:</span>
              <span>{selectedHydrant()?.diameter} mm</span>
            </div>
            <div class="detail-row">
              <span>安装日期:</span>
              <span>{selectedHydrant()?.installationDate}</span>
            </div>
          </div>

          {pressureDistribution() && (
            <div class="detail-section">
              <h4>压力信息</h4>
              <div class="detail-row">
                <span>当前压力:</span>
                <span class="highlight">
                  {pressureDistribution()?.currentPressure.toFixed(3)} MPa
                </span>
              </div>
              {pressureDistribution()?.simulatedPressure !== undefined && (
                <div class="detail-row">
                  <span>模拟压力:</span>
                  <span>
                    {pressureDistribution()?.simulatedPressure.toFixed(3)} MPa
                  </span>
                </div>
              )}
              <div class="detail-row">
                <span>趋势:</span>
                <span class={`trend-${pressureDistribution()?.trend}`}>
                  {pressureDistribution()?.trend === 'rising'
                    ? '上升'
                    : pressureDistribution()?.trend === 'falling'
                    ? '下降'
                    : '稳定'}
                </span>
              </div>
              <div class="detail-row">
                <span>异常得分:</span>
                <span
                  class={
                    (pressureDistribution()?.anomalyScore || 0) > 1
                      ? 'warning'
                      : ''
                  }
                >
                  {(pressureDistribution()?.anomalyScore || 0).toFixed(2)}
                </span>
              </div>
              <div class="detail-row">
                <span>更新时间:</span>
                <span>
                  {pressureDistribution()?.lastUpdate
                    ? formatTimestamp(pressureDistribution()!.lastUpdate)
                    : '暂无'}
                </span>
              </div>
            </div>
          )}

          <button
            onClick={() => actions.loadPressureDistribution(state.selectedHydrantId!)}
            disabled={state.isLoading}
          >
            刷新压力数据
          </button>
        </>
      )}
    </div>
  );
};
