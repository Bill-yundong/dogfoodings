import type { Component } from 'solid-js';
import { createSignal, For } from 'solid-js';
import type { AppStore } from '../app/store';
import { Card } from '../shared/ui/Card';
import { Button } from '../shared/ui/Button';
import { CLASSIFICATION_LABELS } from '../core/constants';

interface AnalysisProps {
  store: AppStore;
}

export const Analysis: Component<AnalysisProps> = (props) => {
  const [selectedProtocol, setSelectedProtocol] = createSignal('all');
  const protocols = ['all', 'MODBUS', 'S7COMM', 'DNP3', 'TCP', 'UDP', 'HTTP', 'HTTPS'];

  const filteredFeatures = () => {
    let features = props.store.traffic.features();
    if (selectedProtocol() !== 'all') {
      features = features.filter(f => f.protocol === selectedProtocol());
    }
    return features.slice(-50).reverse();
  };

  const getClassificationColor = (classification: string) => {
    switch (classification) {
      case 'MALICIOUS': return 'text-red-400 bg-red-900/30';
      case 'SUSPICIOUS': return 'text-yellow-400 bg-yellow-900/30';
      default: return 'text-green-400 bg-green-900/30';
    }
  };

  return (
    <div class="p-6 space-y-6">
      <h1 class="text-2xl font-bold text-white">流量分析</h1>

      <Card>
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-lg font-semibold text-white">流量数据</h2>
          <div class="flex items-center gap-3">
            <select
              value={selectedProtocol()}
              onChange={(e) => setSelectedProtocol(e.currentTarget.value)}
              class="px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white"
            >
              <For each={protocols}>
                {(p) => <option value={p}>{p === 'all' ? '全部协议' : p}</option>}
              </For>
            </select>
            <Button
              onClick={() => props.store.generateMockData(20)}
              loading={props.store.traffic.isProcessing()}
              size="sm"
            >
              生成测试数据
            </Button>
            <Button
              onClick={() => props.store.performClustering()}
              loading={props.store.clustering.isClustering()}
              variant="secondary"
              size="sm"
            >
              执行聚类分析
            </Button>
          </div>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b border-gray-700">
                <th class="text-left py-3 px-2 text-gray-400">时间</th>
                <th class="text-left py-3 px-2 text-gray-400">源 IP</th>
                <th class="text-left py-3 px-2 text-gray-400">目的 IP</th>
                <th class="text-left py-3 px-2 text-gray-400">协议</th>
                <th class="text-left py-3 px-2 text-gray-400">包数</th>
                <th class="text-left py-3 px-2 text-gray-400">方向</th>
                <th class="text-left py-3 px-2 text-gray-400">风险评分</th>
              </tr>
            </thead>
            <tbody>
              <For each={filteredFeatures()}>
                {(feature) => {
                  const normalized = props.store.traffic.normalized().find(n => n.featureId === feature.id);
                  return (
                    <tr class="border-b border-gray-700/50 hover:bg-gray-700/30">
                      <td class="py-2 px-2 text-gray-300">{new Date(feature.timestamp).toLocaleTimeString()}</td>
                      <td class="py-2 px-2 text-gray-300 font-mono">{feature.sourceIP}</td>
                      <td class="py-2 px-2 text-gray-300 font-mono">{feature.destIP}</td>
                      <td class="py-2 px-2">
                        <span class={`px-2 py-1 rounded text-xs ${feature.isIndustrial ? 'bg-yellow-900/30 text-yellow-300' : 'bg-gray-700 text-gray-300'}`}>
                          {feature.protocol}
                        </span>
                      </td>
                      <td class="py-2 px-2 text-gray-300">{feature.packetCount}</td>
                      <td class="py-2 px-2 text-gray-300">{feature.direction}</td>
                      <td class="py-2 px-2">
                        {normalized ? (
                          <span class={`px-2 py-1 rounded text-xs ${getClassificationColor(normalized.classification)}`}>
                            {normalized.riskScore.toFixed(0)} - {CLASSIFICATION_LABELS[normalized.classification]}
                          </span>
                        ) : (
                          <span class="text-gray-500">处理中...</span>
                        )}
                      </td>
                    </tr>
                  );
                }}
              </For>
              {filteredFeatures().length === 0 && (
                <tr>
                  <td colspan="7" class="py-8 text-center text-gray-500">
                    暂无流量数据，请点击"生成测试数据"按钮
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {props.store.clustering.clusters().length > 0 && (
        <Card>
          <h2 class="text-lg font-semibold text-white mb-4">聚类结果</h2>
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <For each={props.store.clustering.clusters()}>
              {(cluster) => (
                <div class={`p-4 rounded-lg border ${cluster.isAPT ? 'bg-red-900/20 border-red-700' : 'bg-gray-700/50 border-gray-600'}`}>
                  <div class="flex items-center justify-between mb-2">
                    <span class="text-white font-medium">
                      {cluster.isAPT ? '⚠️ APT 可疑' : '📊 正常集群'}
                    </span>
                    <span class="text-sm text-gray-400">
                      {cluster.points.length} 个点
                    </span>
                  </div>
                  <div class="text-sm text-gray-400">
                    <p>异常得分: {cluster.anomalyScore.toFixed(3)}</p>
                    <p>置信度: {cluster.confidence.toFixed(2)}%</p>
                  </div>
                </div>
              )}
            </For>
          </div>
        </Card>
      )}
    </div>
  );
};
