import { For, createEffect } from 'solid-js';
import type { SecurityStore } from '../state/useSecurityStore';
import type { TrafficFingerprint } from '../../domain/entities/traffic.entity';

interface Props {
  store: SecurityStore;
}

export function Fingerprints(props: Props) {
  const { fingerprints } = props.store;

  createEffect(() => {
    props.store.loadFingerprints();
  });

  const getRiskColor = (score: number) => {
    if (score >= 70) return 'border-red-500 bg-red-900/20';
    if (score >= 40) return 'border-yellow-500 bg-yellow-900/20';
    return 'border-green-500 bg-green-900/20';
  };

  const getRiskTextColor = (score: number) => {
    if (score >= 70) return 'text-red-400';
    if (score >= 40) return 'text-yellow-400';
    return 'text-green-400';
  };

  const formatDate = (timestamp: number) => new Date(timestamp).toLocaleString();

  return (
    <div class="p-6 space-y-6">
      <div class="flex items-center justify-between">
        <h1 class="text-2xl font-bold text-gray-100">流量指纹库</h1>
        <button
          onClick={() => props.store.loadFingerprints()}
          class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
        >
          刷新数据
        </button>
      </div>

      <div class="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-lg font-semibold text-gray-100">指纹统计</h2>
          <span class="text-sm text-gray-400">共 {fingerprints().length} 条指纹记录</span>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div class="p-4 bg-gray-900 rounded-lg">
            <p class="text-gray-400 text-sm">总指纹数</p>
            <p class="text-2xl font-bold text-blue-400">{fingerprints().length}</p>
          </div>
          <div class="p-4 bg-gray-900 rounded-lg">
            <p class="text-gray-400 text-sm">高风险</p>
            <p class="text-2xl font-bold text-red-400">{fingerprints().filter(f => f.avgRiskScore >= 70).length}</p>
          </div>
          <div class="p-4 bg-gray-900 rounded-lg">
            <p class="text-gray-400 text-sm">中风险</p>
            <p class="text-2xl font-bold text-yellow-400">{fingerprints().filter(f => f.avgRiskScore >= 40 && f.avgRiskScore < 70).length}</p>
          </div>
          <div class="p-4 bg-gray-900 rounded-lg">
            <p class="text-gray-400 text-sm">低风险</p>
            <p class="text-2xl font-bold text-green-400">{fingerprints().filter(f => f.avgRiskScore < 40).length}</p>
          </div>
        </div>
      </div>

      <div class="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <h2 class="text-lg font-semibold text-gray-100 mb-4">指纹详情</h2>
        <div class="space-y-4 max-h-[600px] overflow-y-auto">
          <For each={fingerprints()}>
            {(fingerprint: TrafficFingerprint) => (
              <div class={`p-4 rounded-lg border-l-4 ${getRiskColor(fingerprint.avgRiskScore)}`}>
                <div class="flex items-start justify-between mb-3">
                  <div>
                    <p class="font-mono text-sm text-gray-300">特征哈希: {fingerprint.featureHash}</p>
                    <p class="font-mono text-xs text-gray-500 mt-1">指纹 ID: {fingerprint.id}</p>
                  </div>
                  <div class="text-right">
                    <p class={`text-lg font-bold ${getRiskTextColor(fingerprint.avgRiskScore)}`}>
                      {fingerprint.avgRiskScore.toFixed(1)} 分
                    </p>
                    <p class="text-xs text-gray-500">平均风险评分</p>
                  </div>
                </div>

                <div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p class="text-gray-500">首次发现</p>
                    <p class="text-gray-300">{formatDate(fingerprint.firstSeen)}</p>
                  </div>
                  <div>
                    <p class="text-gray-500">最后出现</p>
                    <p class="text-gray-300">{formatDate(fingerprint.lastSeen)}</p>
                  </div>
                  <div>
                    <p class="text-gray-500">出现次数</p>
                    <p class="text-gray-300">{fingerprint.occurrenceCount} 次</p>
                  </div>
                  <div>
                    <p class="text-gray-500">关联 IP 数</p>
                    <p class="text-gray-300">{fingerprint.associatedIPs.length} 个</p>
                  </div>
                </div>

                <div class="mt-3">
                  <p class="text-gray-500 text-xs mb-1">关联 IP 地址:</p>
                  <div class="flex flex-wrap gap-2">
                    <For each={fingerprint.associatedIPs.slice(0, 5)}>
                      {(ip) => (
                        <span class="px-2 py-1 bg-gray-700 text-gray-300 text-xs rounded font-mono">{ip}</span>
                      )}
                    </For>
                    {fingerprint.associatedIPs.length > 5 && (
                      <span class="px-2 py-1 bg-gray-700 text-gray-400 text-xs rounded">
                        +{fingerprint.associatedIPs.length - 5} 个
                      </span>
                    )}
                  </div>
                </div>

                {fingerprint.clusterLabel && (
                  <div class="mt-3">
                    <span class="px-2 py-1 bg-purple-900/50 text-purple-300 text-xs rounded">
                      聚类标签: {fingerprint.clusterLabel}
                    </span>
                  </div>
                )}
              </div>
            )}
          </For>

          {fingerprints().length === 0 && (
            <div class="py-12 text-center text-gray-500">
              <p class="text-4xl mb-4">🔐</p>
              <p>暂无流量指纹数据</p>
              <p class="text-sm mt-2">请先生成流量数据以创建指纹</p>
            </div>
          )}
        </div>
      </div>

      <div class="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <h2 class="text-lg font-semibold text-gray-100 mb-4">关于流量指纹</h2>
        <div class="space-y-3 text-gray-400 text-sm">
          <p>
            <span class="text-gray-200 font-semibold">流量指纹</span> 是对网络流量特征进行哈希去重后
            生成的唯一标识，用于追踪和分析重复出现的网络行为模式。
          </p>
          <p>
            <span class="text-gray-200 font-semibold">生成机制:</span> 基于源 IP、目的 IP、协议类型、
            负载特征等多维属性计算特征哈希，相同特征的流量会被聚合为同一条指纹记录。
          </p>
          <p>
            <span class="text-gray-200 font-semibold">应用场景:</span> 攻击溯源、异常行为检测、
            威胁情报关联、长周期行为分析等。
          </p>
          <p>
            <span class="text-gray-200 font-semibold">存储方式:</span> 使用 IndexedDB 进行本地持久化
            存储，支持离线访问和海量数据存储。
          </p>
        </div>
      </div>
    </div>
  );
}
