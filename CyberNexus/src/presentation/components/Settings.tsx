import { createSignal } from 'solid-js';
import type { SecurityStore } from '../state/useSecurityStore';

interface Props {
  store: SecurityStore;
}

export function Settings(props: Props) {
  const [confirmClear, setConfirmClear] = createSignal(false);
  const [mockDataCount, setMockDataCount] = createSignal(50);

  return (
    <div class="p-6 space-y-6">
      <h1 class="text-2xl font-bold text-gray-100">系统设置</h1>

      <div class="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <h2 class="text-lg font-semibold text-gray-100 mb-4">数据管理</h2>
        <div class="space-y-4">
          <div class="flex items-center justify-between p-4 bg-gray-900 rounded-lg">
            <div>
              <p class="text-gray-200 font-medium">生成测试流量数据</p>
              <p class="text-sm text-gray-500">生成模拟的网络流量数据用于测试</p>
            </div>
            <div class="flex items-center gap-3">
              <input
                type="number"
                value={mockDataCount()}
                onInput={(e) => setMockDataCount(Math.max(1, Math.min(500, parseInt(e.currentTarget.value) || 50)))}
                min="1"
                max="500"
                class="w-20 px-3 py-2 bg-gray-700 border border-gray-600 rounded text-gray-100 text-center"
              />
              <button
                onClick={() => props.store.generateMockData(mockDataCount())}
                disabled={props.store.isProcessing()}
                class="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg transition-colors"
              >
                生成数据
              </button>
            </div>
          </div>

          <div class="flex items-center justify-between p-4 bg-gray-900 rounded-lg">
            <div>
              <p class="text-gray-200 font-medium">刷新统计数据</p>
              <p class="text-sm text-gray-500">重新计算并更新数据统计信息</p>
            </div>
            <button
              onClick={() => props.store.updateStatistics()}
              class="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
            >
              刷新统计
            </button>
          </div>

          <div class={`p-4 rounded-lg ${confirmClear() ? 'bg-red-900/30 border border-red-600' : 'bg-gray-900'}`}>
            <div class="flex items-center justify-between">
              <div>
                <p class="text-gray-200 font-medium">清除所有数据</p>
                <p class="text-sm text-gray-500">删除所有流量特征、指纹和聚类结果</p>
              </div>
              {!confirmClear() ? (
                <button
                  onClick={() => setConfirmClear(true)}
                  class="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                >
                  清除数据
                </button>
              ) : (
                <div class="flex items-center gap-3">
                  <span class="text-red-400 text-sm">确定要清除吗?</span>
                  <button
                    onClick={() => setConfirmClear(false)}
                    class="px-3 py-1 bg-gray-600 hover:bg-gray-500 text-white rounded-lg transition-colors text-sm"
                  >
                    取消
                  </button>
                  <button
                    onClick={async () => {
                      await props.store.clearAllData();
                      setConfirmClear(false);
                    }}
                    class="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors text-sm"
                  >
                    确认清除
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div class="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <h2 class="text-lg font-semibold text-gray-100 mb-4">平台信息</h2>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="p-4 bg-gray-900 rounded-lg">
            <p class="text-gray-400 text-sm">平台名称</p>
            <p class="text-gray-200 font-medium">CyberNexus 工业控制系统安全防御平台</p>
          </div>
          <div class="p-4 bg-gray-900 rounded-lg">
            <p class="text-gray-400 text-sm">技术架构</p>
            <p class="text-gray-200 font-medium">SolidJS + TypeScript + IndexedDB</p>
          </div>
          <div class="p-4 bg-gray-900 rounded-lg">
            <p class="text-gray-400 text-sm">核心功能</p>
            <p class="text-gray-200 font-medium">流量标准化 · 时序聚类 · APT 检测</p>
          </div>
          <div class="p-4 bg-gray-900 rounded-lg">
            <p class="text-gray-400 text-sm">支持协议</p>
            <p class="text-gray-200 font-medium">MODBUS · S7COMM · DNP3 · TCP/UDP</p>
          </div>
        </div>
      </div>

      <div class="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <h2 class="text-lg font-semibold text-gray-100 mb-4">技术说明</h2>
        <div class="space-y-4">
          <div class="p-4 bg-gray-900 rounded-lg">
            <h3 class="text-blue-400 font-medium mb-2">🔍 流量特征标准化</h3>
            <p class="text-sm text-gray-400 leading-relaxed">
              将异构网络流量转化为 20 维标准化特征向量，包括 IP 地址、端口、协议类型、
              包长度、包数量、流量方向、时间间隔、工业协议标识、熵值等特征，
              实现防御中枢与运维审计终端间的数据映射与标准化交互。
            </p>
          </div>

          <div class="p-4 bg-gray-900 rounded-lg">
            <h3 class="text-purple-400 font-medium mb-2">📈 异步时序聚类引擎</h3>
            <p class="text-sm text-gray-400 leading-relaxed">
              基于 DBSCAN 密度聚类算法，结合 DTW 动态时间规整距离计算，
              对时序流量特征进行异步聚类分析。通过滑动窗口机制处理长序列数据，
              识别异常行为模式，检测潜在的 APT 渗透攻击。
            </p>
          </div>

          <div class="p-4 bg-gray-900 rounded-lg">
            <h3 class="text-green-400 font-medium mb-2">💾 IndexedDB 持久化存储</h3>
            <p class="text-sm text-gray-400 leading-relaxed">
              利用浏览器 IndexedDB API 进行流量指纹的持久化存储，支持海量数据存储、
              索引查询、离线访问。实现全生命周期的协同分析能力，支持历史数据回溯、
              攻击溯源调查、长期行为模式分析。
            </p>
          </div>
        </div>
      </div>

      <div class="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <h2 class="text-lg font-semibold text-gray-100 mb-4">使用说明</h2>
        <ol class="space-y-3 text-sm text-gray-400 list-decimal list-inside">
          <li>进入 "流量分析" 页面，点击 "生成测试数据" 按钮生成模拟流量数据</li>
          <li>系统会自动将原始流量转化为标准化特征向量并计算风险评分</li>
          <li>相同特征的流量会被聚合为流量指纹，存储于本地 IndexedDB 数据库</li>
          <li>点击 "执行聚类分析" 按钮启动时序聚类分析，检测异常行为模式</li>
          <li>聚类结果中标记为 "APT 可疑" 的为系统识别的潜在高级持续性威胁</li>
          <li>在 "流量指纹库" 页面可以查看所有去重后的流量指纹记录</li>
          <li>仪表盘实时展示系统状态、告警信息和统计数据</li>
        </ol>
      </div>
    </div>
  );
}
