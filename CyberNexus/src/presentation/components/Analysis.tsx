import { For, createEffect, createSignal } from 'solid-js';
import type { SecurityStore } from '../state/useSecurityStore';

interface Props {
  store: SecurityStore;
}

export function Analysis(props: Props) {
  const { trafficFeatures, normalizedTraffic, clusters } = props.store;
  const [selectedProtocol, setSelectedProtocol] = createSignal<string>('all');
  const [showHighRisk, setShowHighRisk] = createSignal(false);

  const protocols = ['all', 'TCP', 'UDP', 'MODBUS', 'S7COMM', 'DNP3', 'HTTP', 'HTTPS'];

  const filteredFeatures = () => {
    let features = trafficFeatures();
    if (selectedProtocol() !== 'all') {
      features = features.filter(f => f.protocol === selectedProtocol());
    }
    return features.slice(-50);
  };

  const filteredNormalized = () => {
    let normalized = normalizedTraffic();
    if (showHighRisk()) {
      normalized = normalized.filter(n => n.riskScore >= 40);
    }
    return normalized.slice(-50);
  };

  const getClassificationColor = (classification: string) => {
    switch (classification) {
      case 'MALICIOUS': return 'text-red-400 bg-red-900/30';
      case 'SUSPICIOUS': return 'text-yellow-400 bg-yellow-900/30';
      default: return 'text-green-400 bg-green-900/30';
    }
  };

  const getClassificationLabel = (classification: string) => {
    switch (classification) {
      case 'MALICIOUS': return '恶意';
      case 'SUSPICIOUS': return '可疑';
      default: return '正常';
    }
  };

  createEffect(() => {
    props.store.loadFingerprints();
  });

  return (
    <div class="p-6 space-y-6">
      <div class="flex items-center justify-between">
        <h1 class="text-2xl font-bold text-gray-100">流量行为分析</h1>
        <div class="flex gap-3">
          <button
            onClick={() => props.store.performClustering()}
            disabled={props.store.isProcessing()}
            class="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-lg transition-colors"
          >
            执行聚类分析
          </button>
          <button
            onClick={() => props.store.generateMockData(50)}
            disabled={props.store.isProcessing()}
            class="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg transition-colors"
          >
            生成测试数据
          </button>
        </div>
      </div>

      <div class="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <h2 class="text-lg font-semibold text-gray-100 mb-4">流量特征筛选</h2>
        <div class="flex flex-wrap gap-4 items-center">
          <div>
            <label class="block text-sm text-gray-400 mb-1">协议类型</label>
            <select
              value={selectedProtocol()}
              onInput={(e) => setSelectedProtocol(e.currentTarget.value)}
              class="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 focus:outline-none focus:border-blue-500"
            >
              <For each={protocols}>
                {(proto) => (
                  <option value={proto}>{proto === 'all' ? '全部协议' : proto}</option>
                )}
              </For>
            </select>
          </div>
          <div class="flex items-end">
            <label class="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showHighRisk()}
                onInput={(e) => setShowHighRisk(e.currentTarget.checked)}
                class="w-4 h-4 rounded bg-gray-700 border-gray-600 text-blue-500 focus:ring-blue-500"
              />
              <span class="text-gray-300">仅显示高风险</span>
            </label>
          </div>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div class="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h2 class="text-lg font-semibold text-gray-100 mb-4">原始流量特征 (最近 50 条)</h2>
          <div class="overflow-x-auto max-h-96">
            <table class="w-full text-sm">
              <thead class="sticky top-0 bg-gray-800">
                <tr class="text-left text-gray-400">
                  <th class="py-2 px-3">时间</th>
                  <th class="py-2 px-3">源 IP</th>
                  <th class="py-2 px-3">目的 IP</th>
                  <th class="py-2 px-3">协议</th>
                  <th class="py-2 px-3">包数</th>
                </tr>
              </thead>
              <tbody>
                <For each={filteredFeatures()}>
                  {(feature) => (
                    <tr class="border-t border-gray-700 hover:bg-gray-700/50">
                      <td class="py-2 px-3 text-gray-300">{new Date(feature.timestamp).toLocaleTimeString()}</td>
                      <td class="py-2 px-3 text-gray-300 font-mono">{feature.sourceIP}</td>
                      <td class="py-2 px-3 text-gray-300 font-mono">{feature.destIP}</td>
                      <td class="py-2 px-3">
                        <span class={`px-2 py-1 rounded text-xs ${
                          ['MODBUS', 'S7COMM', 'DNP3'].includes(feature.protocol)
                            ? 'bg-orange-900/30 text-orange-400'
                            : 'bg-blue-900/30 text-blue-400'
                        }`}>
                          {feature.protocol}
                        </span>
                      </td>
                      <td class="py-2 px-3 text-gray-300">{feature.packetCount}</td>
                    </tr>
                  )}
                </For>
                {filteredFeatures().length === 0 && (
                  <tr><td colspan="5" class="py-8 text-center text-gray-500">暂无流量数据</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div class="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h2 class="text-lg font-semibold text-gray-100 mb-4">标准化流量分析 (最近 50 条)</h2>
          <div class="overflow-x-auto max-h-96">
            <table class="w-full text-sm">
              <thead class="sticky top-0 bg-gray-800">
                <tr class="text-left text-gray-400">
                  <th class="py-2 px-3">特征 ID</th>
                  <th class="py-2 px-3">风险评分</th>
                  <th class="py-2 px-3">分类</th>
                  <th class="py-2 px-3">向量维度</th>
                </tr>
              </thead>
              <tbody>
                <For each={filteredNormalized()}>
                  {(normalized) => (
                    <tr class="border-t border-gray-700 hover:bg-gray-700/50">
                      <td class="py-2 px-3 text-gray-300 font-mono text-xs">{normalized.featureId.slice(0, 16)}...</td>
                      <td class="py-2 px-3">
                        <div class="flex items-center gap-2">
                          <div class="w-20 h-2 bg-gray-700 rounded-full overflow-hidden">
                            <div
                              class={`h-full ${normalized.riskScore >= 70 ? 'bg-red-500' : normalized.riskScore >= 40 ? 'bg-yellow-500' : 'bg-green-500'}`}
                              style={{ width: `${normalized.riskScore}%` }}
                            />
                          </div>
                          <span class="text-gray-300">{normalized.riskScore}</span>
                        </div>
                      </td>
                      <td class="py-2 px-3">
                        <span class={`px-2 py-1 rounded text-xs ${getClassificationColor(normalized.classification)}`}>
                          {getClassificationLabel(normalized.classification)}
                        </span>
                      </td>
                      <td class="py-2 px-3 text-gray-300">{normalized.normalizedVector.length}D</td>
                    </tr>
                  )}
                </For>
                {filteredNormalized().length === 0 && (
                  <tr><td colspan="4" class="py-8 text-center text-gray-500">暂无标准化数据</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div class="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <h2 class="text-lg font-semibold text-gray-100 mb-4">时序聚类结果 - APT 检测</h2>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <For each={clusters()}>
            {(cluster) => (
              <div
                class={`p-4 rounded-lg border ${
                  cluster.isAPT
                    ? 'bg-red-900/20 border-red-600'
                    : cluster.anomalyScore > 0.5
                    ? 'bg-yellow-900/20 border-yellow-600'
                    : 'bg-gray-700/50 border-gray-600'
                }`}
              >
                <div class="flex items-center justify-between mb-3">
                  <span class="text-sm font-mono text-gray-400">{cluster.clusterId.slice(0, 16)}</span>
                  {cluster.isAPT && (
                    <span class="px-2 py-1 bg-red-600 text-white text-xs rounded-full animate-pulse">APT 可疑</span>
                  )}
                </div>
                <div class="space-y-2 text-sm">
                  <div class="flex justify-between">
                    <span class="text-gray-400">数据点数:</span>
                    <span class="text-gray-200">{cluster.points.length}</span>
                  </div>
                  <div class="flex justify-between">
                    <span class="text-gray-400">异常分数:</span>
                    <span class="text-gray-200">{cluster.anomalyScore.toFixed(3)}</span>
                  </div>
                  <div class="flex justify-between">
                    <span class="text-gray-400">置信度:</span>
                    <span class="text-gray-200">{cluster.confidence.toFixed(1)}%</span>
                  </div>
                </div>
              </div>
            )}
          </For>
          {clusters().length === 0 && (
            <div class="col-span-full py-8 text-center text-gray-500">暂无聚类结果，请先执行聚类分析</div>
          )}
        </div>
      </div>
    </div>
  );
}
