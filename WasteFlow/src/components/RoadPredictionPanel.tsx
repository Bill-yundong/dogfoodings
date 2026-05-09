import { Component, createEffect, createSignal, For, Show } from 'solid-js';
import type { PeakPrediction, RoadNetworkLoad } from '../types';
import { runPrediction, getRoadLoadSummary, recordRoadLoad } from '../services/roadPrediction';
import { MOCK_ROADS, generateMockRoadLoads } from '../services/mockData';
import { roadLoadsStore } from '../services/indexedDB';

const congestionColors: Record<RoadNetworkLoad['congestionLevel'], string> = {
  low: 'bg-green-500',
  medium: 'bg-yellow-500',
  high: 'bg-orange-500',
  critical: 'bg-red-500',
};

const congestionLabels: Record<RoadNetworkLoad['congestionLevel'], string> = {
  low: '畅通',
  medium: '轻度拥堵',
  high: '中度拥堵',
  critical: '严重拥堵',
};

export const RoadPredictionPanel: Component = () => {
  const [selectedRoad, setSelectedRoad] = createSignal(MOCK_ROADS[0].id);
  const [summary, setSummary] = createSignal<{
    currentLoad: RoadNetworkLoad | null;
    latestPrediction: PeakPrediction | null;
    historicalSummary: {
      avgLoad: number;
      peakLoad: number;
      avgFlowRate: number;
    };
  } | null>(null);
  const [loading, setLoading] = createSignal(true);
  const [predicting, setPredicting] = createSignal(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await getRoadLoadSummary(selectedRoad());
      setSummary(data);
    } finally {
      setLoading(false);
    }
  };

  createEffect(() => {
    loadData();
  }, [selectedRoad]);

  const handleInitData = async () => {
    setLoading(true);
    try {
      const loads = generateMockRoadLoads(selectedRoad(), 100);
      for (const load of loads) {
        await roadLoadsStore.add(load);
      }
      await loadData();
    } finally {
      setLoading(false);
    }
  };

  const handleRunPrediction = async () => {
    setPredicting(true);
    try {
      await runPrediction(selectedRoad());
      await loadData();
    } finally {
      setPredicting(false);
    }
  };

  const handleAddRealtimeData = async () => {
    const currentHour = new Date().getHours();
    const isPeak = (currentHour >= 7 && currentHour <= 9) || (currentHour >= 17 && currentHour <= 19);
    const baseLoad = isPeak ? 0.6 + Math.random() * 0.3 : 0.2 + Math.random() * 0.4;

    await recordRoadLoad(selectedRoad(), baseLoad);
    await loadData();
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getLoadPercentage = (load: number) => Math.round(load * 100);

  return (
    <div class="card">
      <div class="flex justify-between items-center mb-6">
        <h2 class="text-xl font-bold text-gray-800">路网负载预测</h2>
        <div class="flex gap-2">
          <button
            onClick={handleInitData}
            class="btn bg-gray-100 text-gray-700 hover:bg-gray-200"
            disabled={loading()}
          >
            初始化数据
          </button>
          <button
            onClick={handleAddRealtimeData}
            class="btn bg-gray-100 text-gray-700 hover:bg-gray-200"
            disabled={loading()}
          >
            添加实时数据
          </button>
          <button
            onClick={handleRunPrediction}
            class="btn btn-secondary"
            disabled={predicting()}
          >
            {predicting() ? '预测中...' : '运行预测'}
          </button>
        </div>
      </div>

      <div class="mb-4">
        <label class="block text-sm font-medium text-gray-700 mb-2">选择路段</label>
        <select
          value={selectedRoad()}
          onChange={(e) => setSelectedRoad(e.currentTarget.value)}
          class="w-full p-2 border border-gray-300 rounded-lg"
        >
          <For each={MOCK_ROADS}>
            {(road) => (
              <option value={road.id}>{road.name} - {road.description}</option>
            )}
          </For>
        </select>
      </div>

      <Show when={!loading() && summary()}>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div class="bg-gray-50 p-4 rounded-lg">
            <h3 class="font-semibold text-gray-700 mb-3">当前路况</h3>
            <Show when={summary()!.currentLoad}>
              <div class="space-y-3">
                <div>
                  <div class="flex justify-between text-sm mb-1">
                    <span>负载程度</span>
                    <span>{getLoadPercentage(summary()!.currentLoad!.currentLoad)}%</span>
                  </div>
                  <div class="h-3 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      class={`h-full ${congestionColors[summary()!.currentLoad!.congestionLevel]}`}
                      style={{ width: `${getLoadPercentage(summary()!.currentLoad!.currentLoad)}%` }}
                    />
                  </div>
                </div>
                <div class="flex justify-between text-sm">
                  <span>拥堵状态</span>
                  <span
                    class={`px-2 py-1 rounded text-white text-xs ${congestionColors[summary()!.currentLoad!.congestionLevel]}`}
                  >
                    {congestionLabels[summary()!.currentLoad!.congestionLevel]}
                  </span>
                </div>
                <div class="flex justify-between text-sm">
                  <span>流量速率</span>
                  <span>{Math.round(summary()!.currentLoad!.flowRate * 100)}%</span>
                </div>
                <div class="flex justify-between text-sm text-gray-500">
                  <span>更新时间</span>
                  <span>{formatTime(summary()!.currentLoad!.timestamp)}</span>
                </div>
              </div>
            </Show>
            <Show when={!summary()!.currentLoad}>
              <p class="text-gray-500 text-sm">暂无实时数据</p>
            </Show>
          </div>

          <div class="bg-blue-50 p-4 rounded-lg">
            <h3 class="font-semibold text-blue-700 mb-3">预测结果</h3>
            <Show when={summary()!.latestPrediction}>
              <div class="space-y-3">
                <div>
                  <div class="flex justify-between text-sm mb-1">
                    <span>预测峰值负载</span>
                    <span>{getLoadPercentage(summary()!.latestPrediction!.predictedLoad)}%</span>
                  </div>
                  <div class="h-3 bg-blue-200 rounded-full overflow-hidden">
                    <div
                      class="h-full bg-blue-500"
                      style={{ width: `${getLoadPercentage(summary()!.latestPrediction!.predictedLoad)}%` }}
                    />
                  </div>
                </div>
                <div class="flex justify-between text-sm">
                  <span>预测置信度</span>
                  <span>{Math.round(summary()!.latestPrediction!.confidence * 100)}%</span>
                </div>
                <div class="flex justify-between text-sm">
                  <span>预计峰值时间</span>
                  <span>{formatTime(summary()!.latestPrediction!.predictedPeakTime)}</span>
                </div>
              </div>
            </Show>
            <Show when={!summary()!.latestPrediction}>
              <p class="text-gray-500 text-sm">请点击"运行预测"获取预测结果</p>
            </Show>
          </div>
        </div>

        <div class="bg-gray-50 p-4 rounded-lg mb-4">
          <h3 class="font-semibold text-gray-700 mb-3">历史统计</h3>
          <div class="grid grid-cols-3 gap-4">
            <div class="text-center">
              <p class="text-2xl font-bold text-gray-800">
                {Math.round(summary()!.historicalSummary.avgLoad * 100)}%
              </p>
              <p class="text-sm text-gray-500">平均负载</p>
            </div>
            <div class="text-center">
              <p class="text-2xl font-bold text-orange-600">
                {Math.round(summary()!.historicalSummary.peakLoad * 100)}%
              </p>
              <p class="text-sm text-gray-500">历史峰值</p>
            </div>
            <div class="text-center">
              <p class="text-2xl font-bold text-green-600">
                {Math.round(summary()!.historicalSummary.avgFlowRate * 100)}%
              </p>
              <p class="text-sm text-gray-500">平均流量</p>
            </div>
          </div>
        </div>

        <Show when={summary()!.latestPrediction}>
          <div
            class={`p-4 rounded-lg ${
              summary()!.latestPrediction!.predictedLoad > 0.7
                ? 'bg-orange-50 border border-orange-200'
                : 'bg-green-50 border border-green-200'
            }`}
          >
            <h3 class={`font-semibold mb-2 ${
              summary()!.latestPrediction!.predictedLoad > 0.7 ? 'text-orange-700' : 'text-green-700'
            }`}>
              调度建议
            </h3>
            <p class={`text-sm ${
              summary()!.latestPrediction!.predictedLoad > 0.7 ? 'text-orange-600' : 'text-green-600'
            }`}>
              {summary()!.latestPrediction!.recommendedAction}
            </p>
          </div>
        </Show>
      </Show>

      <Show when={loading()}>
        <div class="text-center py-8 text-gray-500">加载中...</div>
      </Show>
    </div>
  );
};
