import { Component, createEffect, createSignal, For, Show } from 'solid-js';
import type { CarbonFootprintLog } from '../types';
import {
  logCarbonFootprint,
  getCarbonReductionSummary,
  generateCarbonReport,
  getEnvironmentalImpact,
} from '../services/carbonLogger';
import { generateMockCarbonLogs } from '../services/mockData';
import { carbonLogsStore } from '../services/indexedDB';

const actionTypeLabels: Record<CarbonFootprintLog['actionType'], string> = {
  collection: '收集',
  transport: '运输',
  processing: '处理',
  recycling: '回收',
  disposal: '处置',
};

const wasteTypeLabels: Record<string, string> = {
  organic: '厨余垃圾',
  recyclable: '可回收物',
  hazardous: '有害垃圾',
  residual: '其他垃圾',
};

export const CarbonPanel: Component = () => {
  const [summary, setSummary] = createSignal<Awaited<
    ReturnType<typeof getCarbonReductionSummary>
  > | null>(null);
  const [impact, setImpact] = createSignal<Awaited<
    ReturnType<typeof getEnvironmentalImpact>
  > | null>(null);
  const [recentLogs, setRecentLogs] = createSignal<CarbonFootprintLog[]>([]);
  const [report, setReport] = createSignal<Awaited<
    ReturnType<typeof generateCarbonReport>
  > | null>(null);
  const [loading, setLoading] = createSignal(true);
  const [days, setDays] = createSignal(30);

  const loadData = async () => {
    setLoading(true);
    try {
      const [currentSummary, currentImpact, logs, currentReport] = await Promise.all([
        getCarbonReductionSummary(days()),
        getEnvironmentalImpact(days()),
        carbonLogsStore.getAll(),
        generateCarbonReport(days()),
      ]);
      setSummary(currentSummary);
      setImpact(currentImpact);
      setRecentLogs(logs.slice(0, 10));
      setReport(currentReport);
    } finally {
      setLoading(false);
    }
  };

  createEffect(() => {
    loadData();
  }, [days]);

  const handleInitData = async () => {
    setLoading(true);
    try {
      const logs = generateMockCarbonLogs(100);
      for (const log of logs) {
        await carbonLogsStore.add(log);
      }
      await loadData();
    } finally {
      setLoading(false);
    }
  };

  const handleAddLog = async () => {
    const actionTypes: CarbonFootprintLog['actionType'][] = ['collection', 'transport', 'processing', 'recycling', 'disposal'];
    const wasteTypes = ['organic', 'recyclable', 'hazardous', 'residual'];
    
    const actionType = actionTypes[Math.floor(Math.random() * actionTypes.length)];
    const wasteType = wasteTypes[Math.floor(Math.random() * wasteTypes.length)];
    const weight = Math.floor(Math.random() * 500) + 50;
    const distance = actionType === 'transport' ? Math.floor(Math.random() * 20) + 5 : undefined;

    await logCarbonFootprint(actionType, wasteType, weight, distance);
    await loadData();
  };

  const formatNumber = (num: number) => {
    return Math.round(num * 100) / 100;
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div class="card">
      <div class="flex justify-between items-center mb-6">
        <h2 class="text-xl font-bold text-gray-800">减废降碳足迹</h2>
        <div class="flex gap-2">
          <select
            value={days()}
            onChange={(e) => setDays(Number(e.currentTarget.value))}
            class="p-2 border border-gray-300 rounded-lg text-sm"
            disabled={loading()}
          >
            <option value={7}>最近7天</option>
            <option value={14}>最近14天</option>
            <option value={30}>最近30天</option>
            <option value={90}>最近90天</option>
          </select>
          <button
            onClick={handleAddLog}
            class="btn bg-gray-100 text-gray-700 hover:bg-gray-200"
            disabled={loading()}
          >
            添加日志
          </button>
          <button
            onClick={handleInitData}
            class="btn bg-gray-100 text-gray-700 hover:bg-gray-200"
            disabled={loading()}
          >
            初始化数据
          </button>
        </div>
      </div>

      <Show when={!loading() && summary() && impact() && report()}>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div class="bg-green-50 p-4 rounded-lg">
            <p class="text-sm text-green-600">总减排量 (kg CO₂)</p>
            <p class="text-2xl font-bold text-green-700">
              {formatNumber(summary()!.netReduction)}
            </p>
          </div>
          <div class="bg-blue-50 p-4 rounded-lg">
            <p class="text-sm text-blue-600">总减排 (kg CO₂)</p>
            <p class="text-2xl font-bold text-blue-700">
              {formatNumber(summary()!.totalCO2Saved)}
            </p>
          </div>
          <div class="bg-orange-50 p-4 rounded-lg">
            <p class="text-sm text-orange-600">总排放 (kg CO₂)</p>
            <p class="text-2xl font-bold text-orange-700">
              {formatNumber(summary()!.totalCO2Emitted)}
            </p>
          </div>
          <div class="bg-purple-50 p-4 rounded-lg">
            <p class="text-sm text-purple-600">处理总重量 (kg)</p>
            <p class="text-2xl font-bold text-purple-700">
              {formatNumber(summary()!.totalWeight)}
            </p>
          </div>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
          <div class="bg-gray-50 p-4 rounded-lg">
            <h3 class="font-semibold text-gray-700 mb-3">环境影响对比</h3>
            <div class="space-y-3">
              <div class="flex justify-between items-center">
                <span class="text-sm text-gray-600">🌳 相当于种植树木</span>
                <span class="font-medium text-green-600">{impact()!.treesEquivalent} 棵</span>
              </div>
              <div class="flex justify-between items-center">
                <span class="text-sm text-gray-600">🚗 相当于减少汽车出行</span>
                <span class="font-medium text-blue-600">{impact()!.carsOffRoadDays} 天</span>
              </div>
              <div class="flex justify-between items-center">
                <span class="text-sm text-gray-600">🏠 相当于家庭供电</span>
                <span class="font-medium text-purple-600">{impact()!.homesPoweredDays} 天</span>
              </div>
              <p class="text-sm text-gray-500 mt-2 italic">{impact()!.description}</p>
            </div>
          </div>

          <div class="bg-gray-50 p-4 rounded-lg">
            <h3 class="font-semibold text-gray-700 mb-3">优化建议</h3>
            <ul class="space-y-2">
              <For each={report()!.recommendations}>
                {(rec) => (
                  <li class="flex items-start gap-2">
                    <span class="text-primary-600 mt-1">•</span>
                    <span class="text-sm text-gray-600">{rec}</span>
                  </li>
                )}
              </For>
            </ul>
          </div>
        </div>

        <div class="mb-6">
          <h3 class="font-semibold text-gray-700 mb-3">操作类型统计</h3>
          <div class="grid grid-cols-2 md:grid-cols-5 gap-3">
            <For each={Object.entries(summary()!.byActionType)}>
              {([type, data]) => (
                <div class="bg-white p-3 rounded-lg border">
                  <p class="text-xs text-gray-500">{actionTypeLabels[type as CarbonFootprintLog['actionType']]}</p>
                  <p class="text-sm font-medium text-gray-800">
                    {formatNumber(data.netReduction)} kg
                  </p>
                  <p class="text-xs text-gray-400">
                    {formatNumber(data.weight)} kg 处理
                  </p>
                </div>
              )}
            </For>
          </div>
        </div>

        <div>
          <h3 class="font-semibold text-gray-700 mb-3">最近日志</h3>
          <Show when={recentLogs().length > 0}>
            <div class="overflow-x-auto">
              <table class="w-full text-sm">
                <thead>
                  <tr class="border-b">
                    <th class="text-left py-2 px-3">操作</th>
                    <th class="text-left py-2 px-3">类型</th>
                    <th class="text-left py-2 px-3">重量 (kg)</th>
                    <th class="text-left py-2 px-3">排放 (kg)</th>
                    <th class="text-left py-2 px-3">减排 (kg)</th>
                    <th class="text-left py-2 px-3">净变化</th>
                    <th class="text-left py-2 px-3">时间</th>
                  </tr>
                </thead>
                <tbody>
                  <For each={recentLogs()}>
                    {(log) => (
                      <tr class="border-b hover:bg-gray-50">
                        <td class="py-2 px-3">
                          {actionTypeLabels[log.actionType]}
                        </td>
                        <td class="py-2 px-3">
                          {wasteTypeLabels[log.wasteType] || log.wasteType}
                        </td>
                        <td class="py-2 px-3">{formatNumber(log.weight)}</td>
                        <td class="py-2 px-3 text-orange-600">
                          {formatNumber(log.co2Emitted)}
                        </td>
                        <td class="py-2 px-3 text-green-600">
                          {formatNumber(log.co2Saved)}
                        </td>
                        <td class={`py-2 px-3 ${log.netReduction >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {log.netReduction >= 0 ? '+' : ''}{formatNumber(log.netReduction)}
                        </td>
                        <td class="py-2 px-3 text-gray-500">{formatDate(log.timestamp)}</td>
                      </tr>
                    )}
                  </For>
                </tbody>
              </table>
            </div>
          </Show>
          <Show when={recentLogs().length === 0}>
            <div class="text-center py-8 text-gray-500">暂无日志记录</div>
          </Show>
        </div>
      </Show>

      <Show when={loading()}>
        <div class="text-center py-8 text-gray-500">加载中...</div>
      </Show>
    </div>
  );
};
