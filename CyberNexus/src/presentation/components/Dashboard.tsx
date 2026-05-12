import { For } from 'solid-js';
import type { SecurityStore } from '../state/useSecurityStore';

interface Props {
  store: SecurityStore;
}

export function Dashboard(props: Props) {
  const { statistics, alerts } = props.store;

  return (
    <div class="p-6 space-y-6">
      <div class="flex items-center justify-between">
        <h1 class="text-2xl font-bold text-gray-100">CyberNexus - 工业控制系统安全防御平台</h1>
        <div class="text-sm text-gray-400">
          最后更新: {new Date().toLocaleTimeString()}
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div class="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-gray-400 text-sm">流量特征总数</p>
              <p class="text-3xl font-bold text-blue-400">{statistics().totalFeatures}</p>
            </div>
            <div class="w-12 h-12 bg-blue-900 rounded-full flex items-center justify-center">
              <span class="text-2xl">📊</span>
            </div>
          </div>
          <p class="text-xs text-gray-500 mt-2">已采集的原始网络流量特征</p>
        </div>

        <div class="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-gray-400 text-sm">流量指纹数</p>
              <p class="text-3xl font-bold text-purple-400">{statistics().totalFingerprints}</p>
            </div>
            <div class="w-12 h-12 bg-purple-900 rounded-full flex items-center justify-center">
              <span class="text-2xl">🔐</span>
            </div>
          </div>
          <p class="text-xs text-gray-500 mt-2">去重后的唯一流量行为指纹</p>
        </div>

        <div class="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-gray-400 text-sm">高风险指纹</p>
              <p class="text-3xl font-bold text-red-400">{statistics().highRiskCount}</p>
            </div>
            <div class="w-12 h-12 bg-red-900 rounded-full flex items-center justify-center">
              <span class="text-2xl">⚠️</span>
            </div>
          </div>
          <p class="text-xs text-gray-500 mt-2">风险评分 ≥ 40</p>
        </div>

        <div class="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-gray-400 text-sm">APT 可疑集群</p>
              <p class="text-3xl font-bold text-orange-400">{statistics().aptClusterCount}</p>
            </div>
            <div class="w-12 h-12 bg-orange-900 rounded-full flex items-center justify-center">
              <span class="text-2xl">🎯</span>
            </div>
          </div>
          <p class="text-xs text-gray-500 mt-2">时序聚类检测到的异常行为模式</p>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div class="lg:col-span-2 bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h2 class="text-lg font-semibold text-gray-100 mb-4">实时告警</h2>
          <div class="space-y-3 max-h-80 overflow-y-auto">
            <For each={alerts()}>
              {(alert) => (
                <div
                  class={`p-3 rounded-lg border-l-4 ${
                    alert.type === 'danger'
                      ? 'bg-red-900/30 border-red-500'
                      : alert.type === 'warning'
                      ? 'bg-yellow-900/30 border-yellow-500'
                      : 'bg-blue-900/30 border-blue-500'
                  }`}
                >
                  <div class="flex items-center justify-between">
                    <span class="text-gray-100">{alert.message}</span>
                    <span class="text-xs text-gray-500">
                      {new Date(alert.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                </div>
              )}
            </For>
            {alerts().length === 0 && (
              <p class="text-gray-500 text-center py-8">暂无告警信息，系统运行正常</p>
            )}
          </div>
        </div>

        <div class="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h2 class="text-lg font-semibold text-gray-100 mb-4">系统状态</h2>
          <div class="space-y-4">
            <div class="flex items-center justify-between">
              <span class="text-gray-400">IndexedDB 存储</span>
              <span class="flex items-center text-green-400">
                <span class="w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse" />
                在线
              </span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-gray-400">聚类引擎</span>
              <span class="flex items-center text-green-400">
                <span class="w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse" />
                运行中
              </span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-gray-400">防御中枢同步</span>
              <span class="flex items-center text-green-400">
                <span class="w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse" />
                已连接
              </span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-gray-400">处理状态</span>
              <span class="flex items-center">
                <span
                  class={`w-2 h-2 rounded-full mr-2 ${
                    props.store.isProcessing() ? 'bg-yellow-400 animate-pulse' : 'bg-green-400'
                  }`}
                />
                {props.store.isProcessing() ? '处理中' : '空闲'}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div class="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <h2 class="text-lg font-semibold text-gray-100 mb-4">平台功能简介</h2>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div class="p-4 bg-gray-900 rounded-lg">
            <div class="text-2xl mb-2">🔍</div>
            <h3 class="font-semibold text-gray-100 mb-1">流量特征标准化</h3>
            <p class="text-sm text-gray-400">将异构网络流量转化为标准化特征向量，实现防御中枢与运维审计终端间的数据映射</p>
          </div>
          <div class="p-4 bg-gray-900 rounded-lg">
            <div class="text-2xl mb-2">📈</div>
            <h3 class="font-semibold text-gray-100 mb-1">时序聚类检测</h3>
            <p class="text-sm text-gray-400">基于 DBSCAN 与 DTW 算法的异步时序聚类分析，识别潜在的 APT 渗透攻击行为</p>
          </div>
          <div class="p-4 bg-gray-900 rounded-lg">
            <div class="text-2xl mb-2">💾</div>
            <h3 class="font-semibold text-gray-100 mb-1">长周期指纹存储</h3>
            <p class="text-sm text-gray-400">利用 IndexedDB 持久化存储流量指纹，支持全生命周期的协同分析与溯源调查</p>
          </div>
        </div>
      </div>
    </div>
  );
}
