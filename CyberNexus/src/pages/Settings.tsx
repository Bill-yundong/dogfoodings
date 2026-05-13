import type { Component } from 'solid-js';
import { createSignal } from 'solid-js';
import type { AppStore } from '../app/store';
import { Card } from '../shared/ui/Card';
import { Button } from '../shared/ui/Button';

interface SettingsProps {
  store: AppStore;
}

export const Settings: Component<SettingsProps> = (props) => {
  const [confirmClear, setConfirmClear] = createSignal(false);
  const [mockDataCount, setMockDataCount] = createSignal(50);

  return (
    <div class="p-6 space-y-6">
      <h1 class="text-2xl font-bold text-white">系统设置</h1>

      <Card>
        <h2 class="text-lg font-semibold text-white mb-4">数据管理</h2>
        <div class="space-y-4">
          <div class="flex items-center justify-between p-4 bg-gray-900/50 rounded-lg">
            <div>
              <p class="text-gray-300 font-medium">生成测试流量数据</p>
              <p class="text-sm text-gray-500">生成模拟的网络流量数据用于测试</p>
            </div>
            <div class="flex items-center gap-3">
              <input
                type="number"
                value={mockDataCount()}
                onInput={(e) => setMockDataCount(Math.max(1, Math.min(500, parseInt(e.currentTarget.value) || 50)))}
                min="1"
                max="500"
                class="w-20 px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-center"
              />
              <Button
                onClick={() => props.store.generateMockData(mockDataCount())}
                disabled={props.store.traffic.isProcessing()}
              >
                生成数据
              </Button>
            </div>
          </div>

          <div class="flex items-center justify-between p-4 bg-gray-900/50 rounded-lg">
            <div>
              <p class="text-gray-300 font-medium">刷新统计数据</p>
              <p class="text-sm text-gray-500">重新计算并更新数据统计信息</p>
            </div>
            <Button onClick={() => props.store.updateStatistics()} variant="secondary">
              刷新统计
            </Button>
          </div>

          <div class={`p-4 rounded-lg ${confirmClear() ? 'bg-red-900/30 border border-red-600' : 'bg-gray-900/50'}`}>
            <div class="flex items-center justify-between">
              <div>
                <p class="text-gray-300 font-medium">清除所有数据</p>
                <p class="text-sm text-gray-500">删除所有流量特征、指纹和聚类结果</p>
              </div>
              {!confirmClear() ? (
                <Button onClick={() => setConfirmClear(true)} variant="danger">
                  清除数据
                </Button>
              ) : (
                <div class="flex items-center gap-3">
                  <span class="text-red-400 text-sm">确定要清除吗?</span>
                  <Button onClick={() => setConfirmClear(false)} variant="secondary" size="sm">
                    取消
                  </Button>
                  <Button
                    onClick={async () => {
                      await props.store.clearAllData();
                      setConfirmClear(false);
                    }}
                    variant="danger"
                    size="sm"
                  >
                    确认清除
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </Card>

      <Card>
        <h2 class="text-lg font-semibold text-white mb-4">平台信息</h2>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="p-4 bg-gray-900/50 rounded-lg">
            <p class="text-gray-500 text-sm">平台名称</p>
            <p class="text-gray-300 font-medium">CyberNexus 工业控制系统安全防御平台</p>
          </div>
          <div class="p-4 bg-gray-900/50 rounded-lg">
            <p class="text-gray-500 text-sm">技术架构</p>
            <p class="text-gray-300 font-medium">SolidJS + TypeScript + IndexedDB</p>
          </div>
          <div class="p-4 bg-gray-900/50 rounded-lg">
            <p class="text-gray-500 text-sm">核心功能</p>
            <p class="text-gray-300 font-medium">流量标准化 · 时序聚类 · APT 检测</p>
          </div>
          <div class="p-4 bg-gray-900/50 rounded-lg">
            <p class="text-gray-500 text-sm">支持协议</p>
            <p class="text-gray-300 font-medium">MODBUS · S7COMM · DNP3 · TCP/UDP</p>
          </div>
        </div>
      </Card>

      <Card>
        <h2 class="text-lg font-semibold text-white mb-4">使用说明</h2>
        <ol class="space-y-3 text-sm text-gray-400 list-decimal list-inside">
          <li>进入"流量分析"页面，点击"生成测试数据"按钮生成模拟流量数据</li>
          <li>系统会自动将原始流量转化为标准化特征向量并计算风险评分</li>
          <li>相同特征的流量会被聚合为流量指纹，存储于本地 IndexedDB 数据库</li>
          <li>点击"执行聚类分析"按钮启动时序聚类分析，检测异常行为模式</li>
          <li>聚类结果中标记为"APT 可疑"的为系统识别的潜在高级持续性威胁</li>
          <li>在"流量指纹库"页面可以查看所有去重后的流量指纹记录</li>
          <li>仪表盘实时展示系统状态、告警信息和统计数据</li>
        </ol>
      </Card>
    </div>
  );
};
