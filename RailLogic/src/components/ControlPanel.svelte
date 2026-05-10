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

<div class="p-4 bg-gray-900 rounded-lg shadow-lg">
  <h3 class="text-xl font-bold text-white mb-4 flex items-center gap-2">
    <span class="text-2xl">🎛️</span>
    控制面板
  </h3>

  <div class="space-y-4">
    <div class="bg-gray-800 p-3 rounded-lg">
      <label class="text-gray-400 text-sm block mb-2">
        列车编号
        <input
          type="text"
          bind:value={trainIdValue}
          class="flex-1 bg-gray-700 text-white px-3 py-2 rounded border border-gray-600 focus:border-cyan-500 focus:outline-none mt-2 w-full"
          onchange={updateTrainId}
        />
      </label>
    </div>

    <button
      class="w-full py-3 px-4 rounded-lg font-semibold text-white transition-all duration-200 {monitoringState
        ? 'bg-red-600 hover:bg-red-700'
        : 'bg-green-600 hover:bg-green-700'}"
      onclick={toggleMonitoring}
    >
      {monitoringState ? '⏹ 停止监测' : '▶ 开始监测'}
    </button>

    <div class="grid grid-cols-2 gap-2">
      <button
        class="py-2 px-3 rounded-lg font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors disabled:opacity-50"
        onclick={loadHistoricalData}
        disabled={loadingState}
      >
        加载历史数据
      </button>

      <button
        class="py-2 px-3 rounded-lg font-medium text-white bg-orange-600 hover:bg-orange-700 transition-colors disabled:opacity-50"
        onclick={cleanupDatabase}
        disabled={loadingState}
      >
        清理数据库
      </button>
    </div>

    <div class="bg-gray-800 p-3 rounded-lg text-xs text-gray-400">
      <p class="mb-1">提示:</p>
      <ul class="list-disc list-inside space-y-1">
        <li>点击"开始监测"启动实时数据采集</li>
        <li>"加载历史数据"可添加100条历史轨道参数</li>
        <li>"清理数据库"会删除1小时前的旧数据</li>
      </ul>
    </div>
  </div>
</div>
