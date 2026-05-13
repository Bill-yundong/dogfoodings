import type { Component } from 'solid-js';
import { For } from 'solid-js';
import type { AppStore } from '../app/store';
import { Card } from '../shared/ui/Card';

interface FingerprintsProps {
  store: AppStore;
}

export const Fingerprints: Component<FingerprintsProps> = (props) => {
  const getRiskColor = (score: number) => {
    if (score >= 60) return 'text-red-400 bg-red-900/30';
    if (score >= 30) return 'text-yellow-400 bg-yellow-900/30';
    return 'text-green-400 bg-green-900/30';
  };

  return (
    <div class="p-6 space-y-6">
      <h1 class="text-2xl font-bold text-white">流量指纹库</h1>

      <Card>
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-lg font-semibold text-white">指纹列表</h2>
          <div class="text-sm text-gray-400">
            共 {props.store.fingerprint.fingerprints().length} 条指纹
          </div>
        </div>

        <div class="space-y-3">
          <For each={props.store.fingerprint.fingerprints()}>
            {(fp) => (
              <div class="p-4 bg-gray-900/50 rounded-lg border border-gray-700">
                <div class="flex items-start justify-between mb-2">
                  <div class="flex items-center gap-3">
                    <span class="text-gray-400 font-mono text-sm truncate max-w-xs">
                      {fp.featureHash}
                    </span>
                    <span class={`px-2 py-1 rounded text-xs ${getRiskColor(fp.avgRiskScore)}`}>
                      风险 {fp.avgRiskScore.toFixed(0)}
                    </span>
                  </div>
                  <span class="text-xs text-gray-500">
                    {fp.occurrenceCount} 次出现
                  </span>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <p class="text-gray-500">首次发现</p>
                    <p class="text-gray-300">{new Date(fp.firstSeen).toLocaleString()}</p>
                  </div>
                  <div>
                    <p class="text-gray-500">最后发现</p>
                    <p class="text-gray-300">{new Date(fp.lastSeen).toLocaleString()}</p>
                  </div>
                  <div>
                    <p class="text-gray-500">关联 IP ({fp.associatedIPs.length})</p>
                    <p class="text-gray-300 font-mono text-xs truncate">
                      {fp.associatedIPs.slice(0, 3).join(', ')}
                      {fp.associatedIPs.length > 3 && ` +${fp.associatedIPs.length - 3}`}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </For>

          {props.store.fingerprint.fingerprints().length === 0 && (
            <div class="py-12 text-center text-gray-500">
              <span class="text-4xl mb-4 block">🔐</span>
              <p>暂无指纹数据，请先生成流量数据</p>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};
