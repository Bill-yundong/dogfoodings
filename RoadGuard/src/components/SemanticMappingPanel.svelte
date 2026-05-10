<script lang="ts">
  import { semanticMappingService } from '../services/semanticMapping';
  import { dataStore } from '../services/dataStore';
  import type { MaintenanceRecord, FinancialRecord } from '../types';

  let selectedMaintenance = $state<MaintenanceRecord | null>(null);
  let convertedFinancial = $state<FinancialRecord | null>(null);
  let conversionDirection = $state<'maintenanceToFinancial' | 'financialToMaintenance'>('maintenanceToFinancial');
  let isConverting = $state(false);
  let rules = $state(semanticMappingService.getRules());

  const maintenanceRecords = $derived(dataStore.getMaintenanceRecords());

  async function convertRecord() {
    if (!selectedMaintenance) return;

    isConverting = true;
    try {
      convertedFinancial = await semanticMappingService.maintenanceToFinancial(selectedMaintenance);
    } finally {
      isConverting = false;
    }
  }

  function formatCurrency(amount: number): string {
    return `¥${amount.toLocaleString()}`;
  }

  const fieldMappings = semanticMappingService.getFieldMappings();
</script>

<div class="mapping-panel">
  <div class="grid grid-2">
    <div class="card">
      <h3 class="card-title">养护系统</h3>

      <div class="record-selector">
        <label>选择养护记录</label>
        <select
          bind:value={selectedMaintenance}
        >
          <option value={null}>-- 请选择 --</option>
          {#each maintenanceRecords as record}
            <option value={record}>{record.id} - {record.description}</option>
          {/each}
        </select>
      </div>

      {#if selectedMaintenance}
        <div class="record-detail">
          <h4>记录详情</h4>
          <div class="detail-list">
            <div class="detail-row">
              <span class="detail-label">记录编号</span>
              <span class="detail-value">{selectedMaintenance.id}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">操作类型</span>
              <span class="detail-value">{selectedMaintenance.actionType}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">费用</span>
              <span class="detail-value">{formatCurrency(selectedMaintenance.cost)}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">执行日期</span>
              <span class="detail-value">{selectedMaintenance.executionDate}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">描述</span>
              <span class="detail-value">{selectedMaintenance.description}</span>
            </div>
          </div>
        </div>

        <button class="btn btn-primary" onclick={convertRecord} disabled={isConverting}>
          {isConverting ? '转换中...' : '转换为财务记录'}
        </button>
      {/if}
    </div>

    <div class="card">
      <h3 class="card-title">财务审计模块</h3>
      {#if convertedFinancial}
        <div class="conversion-result">
          <div class="success-badge">✓ 转换成功</div>
          <div class="detail-list">
            <div class="detail-row">
              <span class="detail-label">财务记录编号</span>
              <span class="detail-value">{convertedFinancial.id}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">关联养护记录</span>
              <span class="detail-value">{convertedFinancial.referenceId}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">费用类别</span>
              <span class="detail-value">{convertedFinancial.category}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">金额</span>
              <span class="detail-value">{formatCurrency(convertedFinancial.amount)}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">货币</span>
              <span class="detail-value">{convertedFinancial.currency}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">预算编码</span>
              <span class="detail-value code">{convertedFinancial.budgetCode}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">审批状态</span>
              <span class={`status-badge ${convertedFinancial.approvalStatus === 'approved' ? 'status-normal' : 'status-warning'}`}>
                {convertedFinancial.approvalStatus}
              </span>
            </div>
            <div class="detail-row">
              <span class="detail-label">交易日期</span>
              <span class="detail-value">{convertedFinancial.transactionDate}</span>
            </div>
            {#if convertedFinancial.remarks}
              <div class="detail-row">
                <span class="detail-label">备注</span>
                <span class="detail-value">{convertedFinancial.remarks}</span>
              </div>
            {/if}
          </div>
        </div>
      {:else}
        <div class="empty-state">
          <span class="empty-icon">🔄</span>
          <p>选择养护记录并点击转换按钮</p>
        </div>
      {/if}
    </div>
  </div>

  <div class="card">
    <h3 class="card-title">语义映射规则</h3>
    <div class="rules-list">
      <table>
        <thead>
          <tr>
            <th>规则ID</th>
            <th>养护字段</th>
            <th>转换方式</th>
            <th>财务字段</th>
            <th>双向映射</th>
          </tr>
        </thead>
        <tbody>
          {#each rules as rule}
            <tr>
              <td class="code">{rule.id}</td>
              <td>{rule.maintenanceField}</td>
              <td>
                <span class="transformation-badge">{rule.transformation}</span>
              </td>
              <td>{rule.financialField}</td>
              <td>
                <span class={`toggle ${rule.bidirectional ? 'active' : ''}`}>
                  {rule.bidirectional ? '✓' : '✗'}
                </span>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>

    <div class="mapping-info">
      <h4>可用字段</h4>
      <div class="fields-comparison">
        <div class="fields-section">
          <h5>养护系统字段</h5>
          <ul>
            {#each fieldMappings.maintenance as field}
              <li>{field}</li>
            {/each}
          </ul>
        </div>
        <div class="fields-section">
          <h5>财务审计字段</h5>
          <ul>
            {#each fieldMappings.financial as field}
              <li>{field}</li>
            {/each}
          </ul>
        </div>
      </div>
    </div>
  </div>
</div>

<style>
  .mapping-panel {
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  .card-title {
    font-size: 16px;
    font-weight: 600;
    margin-bottom: 16px;
    color: var(--text-primary);
  }

  .record-selector {
    margin-bottom: 20px;
  }

  .record-selector label {
    display: block;
    margin-bottom: 8px;
    font-size: 14px;
    color: var(--text-secondary);
  }

  select {
    width: 100%;
    padding: 10px 12px;
    border: 1px solid var(--border-color);
    border-radius: 8px;
    font-size: 14px;
    background: white;
  }

  select:focus {
    outline: none;
    border-color: var(--primary-color);
  }

  .record-detail h4 {
    font-size: 14px;
    font-weight: 600;
    margin-bottom: 12px;
    color: var(--text-primary);
  }

  .detail-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .detail-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 0;
    border-bottom: 1px solid var(--border-color);
  }

  .detail-label {
    font-size: 13px;
    color: var(--text-secondary);
  }

  .detail-value {
    font-size: 14px;
    font-weight: 500;
    color: var(--text-primary);
  }

  .code {
    font-family: monospace;
    font-size: 12px;
  }

  .btn {
    width: 100%;
    margin-top: 16px;
  }

  .btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .conversion-result {
    animation: fadeIn 0.3s ease;
  }

  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }

  .success-badge {
    display: inline-block;
    padding: 6px 16px;
    background: #dcfce7;
    color: #166534;
    border-radius: 20px;
    font-size: 14px;
    font-weight: 500;
    margin-bottom: 20px;
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

  .rules-list {
    overflow-x: auto;
    margin-bottom: 24px;
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

  .transformation-badge {
    display: inline-block;
    padding: 2px 10px;
    background: #e0e7ff;
    color: #4338ca;
    border-radius: 4px;
    font-size: 12px;
    font-weight: 500;
  }

  .toggle {
    display: inline-block;
    padding: 2px 8px;
    border-radius: 4px;
    font-weight: 600;
    font-size: 14px;
  }

  .toggle.active {
    background: #dcfce7;
    color: #166534;
  }

  .toggle:not(.active) {
    background: #fee2e2;
    color: #991b1b;
  }

  .mapping-info h4 {
    font-size: 14px;
    font-weight: 600;
    margin-bottom: 16px;
    color: var(--text-primary);
  }

  .fields-comparison {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 20px;
  }

  .fields-section h5 {
    font-size: 13px;
    font-weight: 600;
    margin-bottom: 8px;
    color: var(--text-secondary);
  }

  .fields-section ul {
    list-style: none;
    padding: 0;
    margin: 0;
  }

  .fields-section li {
    padding: 6px 10px;
    background: #f8fafc;
    margin-bottom: 4px;
    border-radius: 4px;
    font-size: 12px;
    font-family: monospace;
  }
</style>