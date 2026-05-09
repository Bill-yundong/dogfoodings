import { Component, createEffect, createSignal, For } from 'solid-js';
import type { StandardizedWasteData, WasteSource, WasteData } from '../types';
import {
  importWasteData,
  syncDataBetweenSystems,
  getTransferStatistics,
  getPendingTransfers,
} from '../services/dataFlow';
import { generateMockWasteData } from '../services/mockData';

const sourceLabels: Record<WasteSource, string> = {
  sanitation: '环卫处',
  recycling: '回收系统',
};

const wasteTypeLabels: Record<WasteData['wasteType'], string> = {
  organic: '厨余垃圾',
  recyclable: '可回收物',
  hazardous: '有害垃圾',
  residual: '其他垃圾',
};

export const DataFlowPanel: Component = () => {
  const [stats, setStats] = createSignal<{
    total: number;
    byStatus: Record<StandardizedWasteData['transferStatus'], number>;
    bySource: Record<WasteSource, number>;
  } | null>(null);
  const [pendingTransfers, setPendingTransfers] = createSignal<StandardizedWasteData[]>([]);
  const [syncing, setSyncing] = createSignal(false);
  const [syncResult, setSyncResult] = createSignal<{ synced: number; failed: number } | null>(null);
  const [loading, setLoading] = createSignal(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const [currentStats, pending] = await Promise.all([
        getTransferStatistics(),
        getPendingTransfers(),
      ]);
      setStats(currentStats);
      setPendingTransfers(pending);
    } finally {
      setLoading(false);
    }
  };

  createEffect(() => {
    loadData();
  });

  const handleSync = async () => {
    setSyncing(true);
    setSyncResult(null);
    try {
      const result = await syncDataBetweenSystems();
      setSyncResult(result);
      await loadData();
    } finally {
      setSyncing(false);
    }
  };

  const handleGenerateMock = async () => {
    const mockData = generateMockWasteData(10);
    for (const data of mockData) {
      try {
        await importWasteData({
          source: data.source,
          location: data.location,
          wasteType: data.wasteType,
          weight: data.weight,
          volume: data.volume,
          qualityScore: data.qualityScore,
          metadata: data.metadata,
        });
      } catch {
        // 忽略单个导入错误
      }
    }
    await loadData();
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div class="card">
      <div class="flex justify-between items-center mb-6">
        <h2 class="text-xl font-bold text-gray-800">数据流转监控</h2>
        <div class="flex gap-2">
          <button
            onClick={handleGenerateMock}
            class="btn bg-gray-100 text-gray-700 hover:bg-gray-200"
            disabled={syncing()}
          >
            生成模拟数据
          </button>
          <button
            onClick={handleSync}
            class="btn btn-primary"
            disabled={syncing() || (pendingTransfers().length === 0)}
          >
            {syncing() ? '同步中...' : '同步待处理数据'}
          </button>
        </div>
      </div>

      {syncResult() && (
        <div class={`mb-4 p-4 rounded-lg ${syncResult()!.failed > 0 ? 'bg-red-50' : 'bg-green-50'}`}>
          <p class="text-sm">
            同步完成：成功 {syncResult()!.synced} 条，失败 {syncResult()!.failed} 条
          </p>
        </div>
      )}

      {stats() && (
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div class="bg-gray-50 p-4 rounded-lg">
            <p class="text-sm text-gray-500">总计</p>
            <p class="text-2xl font-bold text-gray-800">{stats()!.total}</p>
          </div>
          <div class="bg-yellow-50 p-4 rounded-lg">
            <p class="text-sm text-yellow-600">待同步</p>
            <p class="text-2xl font-bold text-yellow-700">{stats()!.byStatus.pending}</p>
          </div>
          <div class="bg-green-50 p-4 rounded-lg">
            <p class="text-sm text-green-600">已验证</p>
            <p class="text-2xl font-bold text-green-700">{stats()!.byStatus.verified}</p>
          </div>
          <div class="bg-blue-50 p-4 rounded-lg">
            <p class="text-sm text-blue-600">系统分布</p>
            <p class="text-sm font-medium text-blue-700">
              环卫 {stats()!.bySource.sanitation} / 回收 {stats()!.bySource.recycling}
            </p>
          </div>
        </div>
      )}

      <div>
        <h3 class="font-semibold text-gray-700 mb-3">待同步数据列表</h3>
        {loading() ? (
          <div class="text-center py-8 text-gray-500">加载中...</div>
        ) : pendingTransfers().length === 0 ? (
          <div class="text-center py-8 text-gray-500">暂无待同步数据</div>
        ) : (
          <div class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead>
                <tr class="border-b">
                  <th class="text-left py-2 px-3">位置</th>
                  <th class="text-left py-2 px-3">来源</th>
                  <th class="text-left py-2 px-3">类型</th>
                  <th class="text-left py-2 px-3">重量 (kg)</th>
                  <th class="text-left py-2 px-3">质量分数</th>
                  <th class="text-left py-2 px-3">时间</th>
                </tr>
              </thead>
              <tbody>
                <For each={pendingTransfers().slice(0, 10)}>
                  {(item) => (
                    <tr class="border-b hover:bg-gray-50">
                      <td class="py-2 px-3">{item.location}</td>
                      <td class="py-2 px-3">
                        <span class="text-xs px-2 py-1 rounded-full bg-gray-100">
                          {sourceLabels[item.source]}
                        </span>
                      </td>
                      <td class="py-2 px-3">{wasteTypeLabels[item.wasteType]}</td>
                      <td class="py-2 px-3">{item.weight.toLocaleString()}</td>
                      <td class="py-2 px-3">{item.qualityScore}%</td>
                      <td class="py-2 px-3 text-gray-500">{formatDate(item.timestamp)}</td>
                    </tr>
                  )}
                </For>
              </tbody>
            </table>
            {pendingTransfers().length > 10 && (
              <p class="text-sm text-gray-500 mt-2 text-center">
                还有 {pendingTransfers().length - 10} 条数据未显示
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
