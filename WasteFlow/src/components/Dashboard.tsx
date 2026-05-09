import { Component, createSignal } from 'solid-js';
import { DataFlowPanel } from './DataFlowPanel';
import { RoadPredictionPanel } from './RoadPredictionPanel';
import { CarbonPanel } from './CarbonPanel';

type TabKey = 'data' | 'road' | 'carbon';

const tabs: { key: TabKey; label: string }[] = [
  { key: 'data', label: '数据流转' },
  { key: 'road', label: '路网预测' },
  { key: 'carbon', label: '碳足迹' },
];

export const Dashboard: Component = () => {
  const [activeTab, setActiveTab] = createSignal<TabKey>('data');

  return (
    <div class="min-h-screen bg-gray-50">
      <header class="bg-white shadow-sm border-b">
        <div class="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-700 rounded-lg flex items-center justify-center">
                <span class="text-white font-bold text-lg">W</span>
              </div>
              <div>
                <h1 class="text-xl font-bold text-gray-800">WasteFlow</h1>
                <p class="text-sm text-gray-500">环卫清运物流优化系统</p>
              </div>
            </div>
            <div class="flex items-center gap-4">
              <div class="text-right hidden sm:block">
                <p class="text-sm text-gray-500">实时监控</p>
                <p class="text-xs text-primary-600">系统运行中</p>
              </div>
              <div class="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            </div>
          </div>
        </div>
      </header>

      <main class="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
        <div class="mb-6">
          <div class="bg-white rounded-lg shadow-sm p-1 inline-flex">
            {tabs.map((tab) => (
              <button
                onClick={() => setActiveTab(tab.key)}
                class={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab() === tab.key
                    ? 'bg-primary-600 text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {activeTab() === 'data' && <DataFlowPanel />}
        {activeTab() === 'road' && <RoadPredictionPanel />}
        {activeTab() === 'carbon' && <CarbonPanel />}

        <div class="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div class="card">
            <h3 class="font-semibold text-gray-700 mb-2">系统特点</h3>
            <ul class="space-y-2 text-sm text-gray-600">
              <li class="flex items-center gap-2">
                <span class="w-2 h-2 bg-green-500 rounded-full"></span>
                数据标准化流转
              </li>
              <li class="flex items-center gap-2">
                <span class="w-2 h-2 bg-blue-500 rounded-full"></span>
                SHA-256 数据验证
              </li>
              <li class="flex items-center gap-2">
                <span class="w-2 h-2 bg-purple-500 rounded-full"></span>
                异步峰值预测
              </li>
            </ul>
          </div>
          <div class="card">
            <h3 class="font-semibold text-gray-700 mb-2">技术栈</h3>
            <ul class="space-y-2 text-sm text-gray-600">
              <li class="flex items-center gap-2">
                <span class="w-2 h-2 bg-yellow-500 rounded-full"></span>
                SolidJS 1.9
              </li>
              <li class="flex items-center gap-2">
                <span class="w-2 h-2 bg-cyan-500 rounded-full"></span>
                IndexedDB (idb)
              </li>
              <li class="flex items-center gap-2">
                <span class="w-2 h-2 bg-indigo-500 rounded-full"></span>
                Tailwind CSS 3.4
              </li>
            </ul>
          </div>
          <div class="card">
            <h3 class="font-semibold text-gray-700 mb-2">使用说明</h3>
            <p class="text-sm text-gray-600">
              点击各面板的"初始化数据"或"生成模拟数据"按钮开始探索系统功能。数据将持久化存储在浏览器 IndexedDB 中。
            </p>
          </div>
        </div>
      </main>

      <footer class="mt-8 py-6 border-t bg-white">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-sm text-gray-500">
          <p>WasteFlow - 基于 SolidJS 的环卫清运物流优化系统</p>
          <p class="mt-1">实现数据标准化流转、路网负载预测、碳足迹追踪</p>
        </div>
      </footer>
    </div>
  );
};
