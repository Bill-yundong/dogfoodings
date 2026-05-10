<script lang="ts">
  import { dataStore } from '../services/dataStore';
  import type { CrackPoint, MaintenanceRecord } from '../types';
  import { SEVERITY_COLORS, SEVERITY_LABELS } from '../types';

  let selectedCrack = $state<CrackPoint | null>(null);

  const cracks = $derived(dataStore.getCracks());
  const maintenanceRecords = $derived(dataStore.getMaintenanceRecords());
  const stats = $derived(dataStore.getStatistics());

  const criticalCracks = $derived(cracks.filter(c => c.severity === 'critical'));
  const recentMaintenance = $derived(
    [...maintenanceRecords]
      .sort((a, b) => new Date(b.executionDate).getTime() - new Date(a.executionDate).getTime())
      .slice(0, 5)
  );

  function formatCurrency(amount: number): string {
    return `¥${amount.toLocaleString()}`;
  }

  function getSeverityBadgeClass(severity: CrackPoint['severity']): string {
    const classes: Record<CrackPoint['severity'], string> = {
      low: 'status-normal',
      medium: 'status-warning',
      high: 'status-warning',
      critical: 'status-danger'
    };
    return `status-badge ${classes[severity]}`;
  }
</script>

<div class="dashboard">
  <div class="grid grid-3">
    <div class="card stat-card">
      <div class="stat-icon" style="background: #dbeafe;">🔍</div>
      <div>
        <div class="stat-number">{stats.totalCracks}</div>
        <div class="stat-title">裂缝总数</div>
      </div>
    </div>
    <div class="card stat-card">
      <div class="stat-icon" style="background: #fee2e2;">⚠️</div>
      <div>
        <div class="stat-number critical">{stats.criticalCracks}</div>
        <div class="stat-title">危急裂缝</div>
      </div>
    </div>
    <div class="card stat-card">
      <div class="stat-icon" style="background: #dcfce7;">💰</div>
      <div>
        <div class="stat-number">{formatCurrency(stats.maintenanceCost)}</div>
        <div class="stat-title">累计养护成本</div>
      </div>
    </div>
  </div>

  <div class="grid grid-2">
    <div class="card">
      <h3 class="card-title">裂缝分布</h3>
      <div class="crack-list">
        {#each cracks as crack (crack.id)}
          <div
            class={`crack-item ${selectedCrack?.id === crack.id ? 'selected' : ''}`}
            onclick={() => (selectedCrack = crack)}
          >
            <div class="crack-header">
              <span class="crack-id">{crack.id}</span>
              <span class={getSeverityBadgeClass(crack.severity)}>
                {SEVERITY_LABELS[crack.severity]}
              </span>
            </div>
            <div class="crack-details">
              <span>路段: {crack.roadSection}</span>
              <span>长: {crack.length.toFixed(1)}cm</span>
              <span>宽: {crack.width.toFixed(1)}mm</span>
            </div>
          </div>
        {/each}
      </div>
    </div>

    <div class="card">
      <h3 class="card-title">裂缝详情</h3>
      {#if selectedCrack}
        <div class="detail-panel">
          <div class="detail-header">
            <span class="detail-id">{selectedCrack.id}</span>
            <span class={getSeverityBadgeClass(selectedCrack.severity)}>
              {SEVERITY_LABELS[selectedCrack.severity]}
            </span>
          </div>
          <div class="detail-grid">
            <div class="detail-item">
              <span class="detail-label">路段编号</span>
              <span class="detail-value">{selectedCrack.roadSection}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">检测日期</span>
              <span class="detail-value">{selectedCrack.detectionDate}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">裂缝长度</span>
              <span class="detail-value">{selectedCrack.length.toFixed(1)} cm</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">裂缝宽度</span>
              <span class="detail-value">{selectedCrack.width.toFixed(1)} mm</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">裂缝深度</span>
              <span class="detail-value">{selectedCrack.depth.toFixed(1)} mm</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">坐标位置</span>
              <span class="detail-value">({selectedCrack.coordinate.x.toFixed(1)}, {selectedCrack.coordinate.y.toFixed(1)})</span>
            </div>
          </div>

          <div class="visualization">
            <h4>裂缝可视化</h4>
            <svg viewBox="0 0 200 100" class="crack-visual">
              <defs>
                <linearGradient id={`grad-${selectedCrack.id}`} x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stop-color={SEVERITY_COLORS[selectedCrack.severity]} stop-opacity="0.8"/>
                  <stop offset="100%" stop-color={SEVERITY_COLORS[selectedCrack.severity]} stop-opacity="0.3"/>
                </linearGradient>
              </defs>
              <rect x="10" y="10" width="180" height="80" fill="#f1f5f9" rx="4"/>
              <line
                x1="30"
                y1="50"
                x2="170"
                y2="55"
                stroke={SEVERITY_COLORS[selectedCrack.severity]}
                stroke-width={Math.min(selectedCrack.width / 5, 10)}
                stroke-linecap="round"
              />
              <circle cx="30" cy="50" r="4" fill={SEVERITY_COLORS[selectedCrack.severity]}/>
              <circle cx="170" cy="55" r="4" fill={SEVERITY_COLORS[selectedCrack.severity]}/>
            </svg>
          </div>

          <div class="related-maintenance">
            <h4>相关养护记录</h4>
            {#each dataStore.getMaintenanceByCrackId(selectedCrack.id) as record (record.id)}
              <div class="maintenance-item">
                <span class="maintenance-type">{record.actionType}</span>
                <span class="maintenance-date">{record.executionDate}</span>
                <span class="maintenance-cost">{formatCurrency(record.cost)}</span>
              </div>
            {:else}
              <p class="no-data">暂无养护记录</p>
            {/each}
          </div>
        </div>
      {:else}
        <div class="empty-state">
          <span class="empty-icon">👆</span>
          <p>选择左侧裂缝查看详情</p>
        </div>
      {/if}
    </div>
  </div>

  <div class="card">
    <h3 class="card-title">近期养护记录</h3>
    <div class="maintenance-table">
      <table>
        <thead>
          <tr>
            <th>记录编号</th>
            <th>裂缝ID</th>
            <th>操作类型</th>
            <th>描述</th>
            <th>执行日期</th>
            <th>费用</th>
          </tr>
        </thead>
        <tbody>
          {#each recentMaintenance as record (record.id)}
            <tr>
              <td>{record.id}</td>
              <td>{record.crackId}</td>
              <td><span class="action-badge">{record.actionType}</span></td>
              <td>{record.description}</td>
              <td>{record.executionDate}</td>
              <td class="cost">{formatCurrency(record.cost)}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  </div>
</div>

<style>
  .dashboard {
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  .stat-card {
    display: flex;
    align-items: center;
    gap: 16px;
  }

  .stat-icon {
    width: 56px;
    height: 56px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 28px;
  }

  .stat-number {
    font-size: 28px;
    font-weight: 700;
    color: var(--text-primary);
    line-height: 1.2;
  }

  .stat-number.critical {
    color: var(--danger-color);
  }

  .stat-title {
    font-size: 14px;
    color: var(--text-secondary);
  }

  .card-title {
    font-size: 16px;
    font-weight: 600;
    margin-bottom: 16px;
    color: var(--text-primary);
  }

  .crack-list {
    max-height: 400px;
    overflow-y: auto;
  }

  .crack-item {
    padding: 12px;
    border: 1px solid var(--border-color);
    border-radius: 8px;
    margin-bottom: 8px;
    cursor: pointer;
    transition: all 0.2s;
  }

  .crack-item:hover {
    border-color: var(--primary-color);
    background: #f8fafc;
  }

  .crack-item.selected {
    border-color: var(--primary-color);
    background: #eff6ff;
  }

  .crack-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
  }

  .crack-id {
    font-weight: 600;
    color: var(--text-primary);
  }

  .crack-details {
    display: flex;
    gap: 16px;
    font-size: 12px;
    color: var(--text-secondary);
  }

  .detail-panel {
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  .detail-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-bottom: 12px;
    border-bottom: 1px solid var(--border-color);
  }

  .detail-id {
    font-size: 18px;
    font-weight: 700;
    color: var(--text-primary);
  }

  .detail-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 16px;
  }

  .detail-item {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .detail-label {
    font-size: 12px;
    color: var(--text-secondary);
  }

  .detail-value {
    font-size: 14px;
    font-weight: 500;
    color: var(--text-primary);
  }

  .visualization {
    background: #f8fafc;
    padding: 16px;
    border-radius: 8px;
  }

  .visualization h4 {
    font-size: 14px;
    font-weight: 600;
    margin-bottom: 12px;
    color: var(--text-primary);
  }

  .crack-visual {
    width: 100%;
    height: 100px;
  }

  .related-maintenance h4 {
    font-size: 14px;
    font-weight: 600;
    margin-bottom: 12px;
    color: var(--text-primary);
  }

  .maintenance-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 12px;
    background: #f8fafc;
    border-radius: 6px;
    margin-bottom: 8px;
  }

  .maintenance-type {
    font-weight: 500;
    font-size: 13px;
  }

  .maintenance-date {
    font-size: 12px;
    color: var(--text-secondary);
  }

  .maintenance-cost {
    font-weight: 600;
    color: var(--primary-color);
  }

  .no-data {
    text-align: center;
    color: var(--text-secondary);
    font-size: 14px;
    padding: 20px;
  }

  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 300px;
    color: var(--text-secondary);
  }

  .empty-icon {
    font-size: 48px;
    margin-bottom: 12px;
  }

  .maintenance-table {
    overflow-x: auto;
  }

  table {
    width: 100%;
    border-collapse: collapse;
  }

  th {
    text-align: left;
    padding: 12px;
    background: #f8fafc;
    font-weight: 600;
    font-size: 13px;
    color: var(--text-secondary);
    border-bottom: 1px solid var(--border-color);
  }

  td {
    padding: 12px;
    border-bottom: 1px solid var(--border-color);
    font-size: 13px;
  }

  td.cost {
    font-weight: 600;
    color: var(--primary-color);
  }

  .action-badge {
    display: inline-block;
    padding: 2px 8px;
    background: #e0f2fe;
    color: #0369a1;
    border-radius: 4px;
    font-size: 12px;
    font-weight: 500;
  }
</style>