<script lang="ts">
  import { isMonitoring, currentTrainId } from '../lib/stores';
  import { indexeddb } from '../lib/indexeddb';
  import { generateHistoricalTrackParameters } from '../lib/mockDataGenerator';
  import { trackParameters } from '../lib/stores';

  let monitoringState = $state(false);
  let trainIdValue = $state('TRAIN-001');
  let loadingState = $state(false);

  $effect(() => {
    const unsub1 = isMonitoring.subscribe((m) => {
      monitoringState = m;
    });
    const unsub2 = currentTrainId.subscribe((t) => {
      trainIdValue = t;
    });
    return () => {
      unsub1();
      unsub2();
    };
  });

  function toggleMonitoring(): void {
    isMonitoring.set(!monitoringState);
  }

  async function loadHistoricalData(): Promise<void> {
    loadingState = true;
    try {
      const historicalData = generateHistoricalTrackParameters(100, 0);
      await trackParameters.addBatch(historicalData);
    } finally {
      loadingState = false;
    }
  }

  async function cleanupDatabase(): Promise<void> {
    loadingState = true;
    try {
      const deleted = await indexeddb.cleanupOldData(1);
      console.log(`Cleaned up ${deleted} old records`);
    } finally {
      loadingState = false;
    }
  }

  function updateTrainId(): void {
    currentTrainId.set(trainIdValue);
  }
</script>

<div class="card">
  <div class="card-header">
    <span class="card-icon">🎛️</span>
    <h3 class="card-title">控制面板</h3>
  </div>

  <div class="form-group">
    <label class="form-label">
      列车编号
      <input
        type="text"
        class="input-field"
        bind:value={trainIdValue}
        onchange={updateTrainId}
        style="margin-top: 6px;"
      />
    </label>
  </div>

  <button
    class="btn btn-block {monitoringState ? 'btn-danger' : 'btn-success'}"
    onclick={toggleMonitoring}
  >
    {monitoringState ? '⏹ 停止监测' : '▶ 开始监测'}
  </button>

  <div class="btn-group" style="margin-top: 16px;">
    <button
      class="btn btn-primary"
      onclick={loadHistoricalData}
      disabled={loadingState}
    >
      加载历史数据
    </button>

    <button
      class="btn btn-warning"
      onclick={cleanupDatabase}
      disabled={loadingState}
    >
      清理数据库
    </button>
  </div>

  <div class="info-panel" style="margin-top: 16px;">
    <p style="margin-bottom: 8px; font-weight: 600;">提示:</p>
    <ul>
      <li>点击"开始监测"启动实时数据采集</li>
      <li>"加载历史数据"可添加100条历史轨道参数</li>
      <li>"清理数据库"会删除1小时前的旧数据</li>
    </ul>
  </div>
</div>
