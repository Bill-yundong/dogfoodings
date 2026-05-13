import type { Component } from 'solid-js';
import type { AppStore } from '../app/store';
import { Card } from '../shared/ui/Card';
import { Button } from '../shared/ui/Button';

interface DashboardProps {
  store: AppStore;
}

export const Dashboard: Component<DashboardProps> = (props) => {
  return (
    <div class="p-6 space-y-6">
      <h1 class="text-2xl font-bold text-white">安全仪表盘</h1>
      
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <div class="flex items-center justify-between">
            <div>
              <p class="text-gray-400 text-sm">总流量特征</p>
              <p class="text-2xl font-bold text-white mt-1">{props.store.statistics().totalFeatures}</p>
            </div>
            <div class="w-12 h-12 bg-blue-900/50 rounded-full flex items-center justify-center">
              <span class="text-2xl">📊</span>
            </div>
          </div>
        </Card>

        <Card>
          <div class="flex items-center justify-between">
            <div>
              <p class="text-gray-400 text-sm">指纹库数量</p>
              <p class="text-2xl font-bold text-white mt-1">{props.store.statistics().totalFingerprints}</p>
            </div>
            <div class="w-12 h-12 bg-green-900/50 rounded-full flex items-center justify-center">
              <span class="text-2xl">🔐</span>
            </div>
          </div>
        </Card>

        <Card>
          <div class="flex items-center justify-between">
            <div>
              <p class="text-gray-400 text-sm">高风险指纹</p>
              <p class="text-2xl font-bold text-white mt-1">{props.store.statistics().highRiskCount}</p>
            </div>
            <div class="w-12 h-12 bg-red-900/50 rounded-full flex items-center justify-center">
              <span class="text-2xl">⚠️</span>
            </div>
          </div>
        </Card>

        <Card>
          <div class="flex items-center justify-between">
            <div>
              <p class="text-gray-400 text-sm">APT 可疑集群</p>
              <p class="text-2xl font-bold text-white mt-1">{props.store.statistics().aptClusterCount}</p>
            </div>
            <div class="w-12 h-12 bg-purple-900/50 rounded-full flex items-center justify-center">
              <span class="text-2xl">🎯</span>
            </div>
          </div>
        </Card>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <h2 class="text-lg font-semibold text-white mb-4">快速操作</h2>
          <div class="space-y-3">
            <Button
              onClick={() => props.store.generateMockData(50)}
              loading={props.store.traffic.isProcessing()}
              variant="primary"
              class="w-full"
            >
              生成测试流量数据
            </Button>
            <Button
              onClick={() => props.store.performClustering()}
              loading={props.store.clustering.isClustering()}
              variant="secondary"
              class="w-full"
            >
              执行聚类分析
            </Button>
            <Button
              onClick={() => props.store.updateStatistics()}
              variant="success"
              class="w-full"
            >
              刷新统计数据
            </Button>
          </div>
        </Card>

        <Card>
          <h2 class="text-lg font-semibold text-white mb-4">最近告警</h2>
          <div class="space-y-2 max-h-64 overflow-y-auto">
            {props.store.alerts.alerts().slice(0, 10).map((alert) => (
              <div
                class={`p-3 rounded text-sm ${
                  alert.type === 'danger'
                    ? 'bg-red-900/30 text-red-300 border border-red-800'
                    : alert.type === 'warning'
                    ? 'bg-yellow-900/30 text-yellow-300 border border-yellow-800'
                    : 'bg-blue-900/30 text-blue-300 border border-blue-800'
                }`}
              >
                <div class="flex items-center justify-between">
                  <span>{alert.message}</span>
                  <button
                    onClick={() => props.store.alerts.removeAlert(alert.id)}
                    class="hover:opacity-70 ml-2"
                  >
                    ✕
                  </button>
                </div>
                <div class="text-xs opacity-60 mt-1">
                  {new Date(alert.timestamp).toLocaleString()}
                </div>
              </div>
            ))}
            {props.store.alerts.alerts().length === 0 && (
              <p class="text-gray-500 text-center py-4">暂无告警</p>
            )}
          </div>
        </Card>
      </div>

      <Card>
        <h2 class="text-lg font-semibold text-white mb-4">系统说明</h2>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-400">
          <div class="p-4 bg-gray-900/50 rounded-lg">
            <h3 class="text-blue-400 font-medium mb-2">🔍 流量特征标准化</h3>
            <p>将异构网络流量转化为 20 维标准化特征向量，实现防御中枢与运维审计终端间的数据映射与标准化交互。</p>
          </div>
          <div class="p-4 bg-gray-900/50 rounded-lg">
            <h3 class="text-purple-400 font-medium mb-2">📈 异步时序聚类引擎</h3>
            <p>基于 DBSCAN 密度聚类算法，结合滑动窗口机制处理长序列数据，识别异常行为模式，检测潜在的 APT 渗透攻击。</p>
          </div>
          <div class="p-4 bg-gray-900/50 rounded-lg">
            <h3 class="text-green-400 font-medium mb-2">💾 IndexedDB 持久化存储</h3>
            <p>利用浏览器 IndexedDB API 进行流量指纹的持久化存储，支持海量数据存储、索引查询、离线访问。</p>
          </div>
        </div>
      </Card>
    </div>
  );
};
