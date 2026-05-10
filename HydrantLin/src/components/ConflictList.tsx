import { Component } from 'solid-js';
import { AppStore } from '../store';
import { formatTimestamp } from '../utils';
import { ConflictRecord } from '../types';

interface ConflictListProps {
  store: AppStore;
}

export const ConflictList: Component<ConflictListProps> = (props) => {
  const { state, actions } = props.store;

  const unresolvedConflicts = () =>
    state.conflicts.filter((c) => !c.resolved);

  const resolveConflictHandler = (
    conflict: ConflictRecord,
    resolution: 'fire_dept' | 'water_company' | 'average'
  ) => {
    const plainConflict: ConflictRecord = JSON.parse(JSON.stringify(conflict));
    actions.resolveConflict(plainConflict, resolution);
  };

  return (
    <div class="conflict-list">
      <h3>冲突记录 ({unresolvedConflicts().length})</h3>

      {unresolvedConflicts().length === 0 ? (
        <p class="empty-message">暂无未解决的冲突</p>
      ) : (
        <div class="conflict-items">
          {unresolvedConflicts().map((conflict) => (
            <div class="conflict-item" key={`${conflict.hydrantId}-${conflict.detectedTime}`}>
              <div class="conflict-header">
                <span class="hydrant-id">{conflict.hydrantId.slice(0, 20)}...</span>
                <span class="detected-time">
                  {formatTimestamp(conflict.detectedTime)}
                </span>
              </div>

              <div class="conflict-readings">
                <div class="reading fire-dept">
                  <div class="reading-label">消防支队</div>
                  <div class="reading-value">
                    {conflict.fireDeptReading.pressure.toFixed(3)} MPa
                  </div>
                  <div class="reading-meta">
                    置信度: {(conflict.fireDeptReading.confidence * 100).toFixed(0)}%
                  </div>
                </div>

                <div class="reading water-company">
                  <div class="reading-label">自来水公司</div>
                  <div class="reading-value">
                    {conflict.waterCompanyReading.pressure.toFixed(3)} MPa
                  </div>
                  <div class="reading-meta">
                    置信度: {(conflict.waterCompanyReading.confidence * 100).toFixed(0)}%
                  </div>
                </div>
              </div>

              <div class="conflict-actions">
                <button
                  onClick={() => resolveConflictHandler(conflict, 'fire_dept')}
                  title="采用消防支队数据"
                >
                  消防支队
                </button>
                <button
                  onClick={() => resolveConflictHandler(conflict, 'water_company')}
                  title="采用自来水公司数据"
                >
                  自来水公司
                </button>
                <button
                  onClick={() => resolveConflictHandler(conflict, 'average')}
                  class="primary"
                  title="取平均值"
                >
                  平均值
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
