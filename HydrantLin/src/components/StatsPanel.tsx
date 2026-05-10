import { Component } from 'solid-js';
import { AppStore } from '../store';
import { formatTimestamp } from '../utils';

interface StatsPanelProps {
  store: AppStore;
}

export const StatsPanel: Component<StatsPanelProps> = (props) => {
  const { state } = props.store;

  return (
    <div class="stats-panel">
      <h3>系统统计</h3>

      <div class="stat-group">
        <h4>数据库</h4>
        <div class="stat-item">
          <span>消火栓数量:</span>
          <span class="highlight">{state.dbStats.hydrantCount.toLocaleString()}</span>
        </div>
        <div class="stat-item">
          <span>水压读数:</span>
          <span>{state.dbStats.readingCount.toLocaleString()}</span>
        </div>
        <div class="stat-item">
          <span>冲突记录:</span>
          <span class={state.dbStats.conflictCount > 0 ? 'warning' : ''}>
            {state.dbStats.conflictCount}
          </span>
        </div>
      </div>

      <div class="stat-group">
        <h4>同步状态</h4>
        <div class="stat-item">
          <span>网络状态:</span>
          <span class={state.onlineStatus ? 'online' : 'offline'}>
            {state.onlineStatus ? '在线' : '离线'}
          </span>
        </div>
        <div class="stat-item">
          <span>总消息数:</span>
          <span>{state.syncStats.totalMessages}</span>
        </div>
        <div class="stat-item">
          <span>已同步:</span>
          <span class="success">{state.syncStats.synced}</span>
        </div>
        <div class="stat-item">
          <span>冲突数:</span>
          <span class={state.syncStats.conflicts > 0 ? 'warning' : ''}>
            {state.syncStats.conflicts}
          </span>
        </div>
        <div class="stat-item">
          <span>上次同步:</span>
          <span>
            {state.syncStats.lastSyncTime
              ? formatTimestamp(state.syncStats.lastSyncTime)
              : '暂无'}
          </span>
        </div>
      </div>
    </div>
  );
};
