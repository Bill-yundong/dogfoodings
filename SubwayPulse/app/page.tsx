"use client";

import { useState } from "react";
import StationList from "@/components/StationList";
import SecurityModule from "@/components/SecurityModule";
import DispatchModule from "@/components/DispatchModule";
import SyncIndicator from "@/components/SyncIndicator";

type TabType = "security" | "dispatch";

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabType>("security");

  return (
    <main className="min-h-screen bg-gray-100">
      <header className="bg-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Subway Pulse - 轨道交通客流涌浪优化系统
              </h1>
              <p className="text-sm text-gray-500">
                基于排队论的实时客流预测与运力调度平台
              </p>
            </div>
            <SyncIndicator />
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-1">
            <StationList />
          </div>

          <div className="lg:col-span-3">
            <div className="bg-white rounded-lg shadow-md mb-4">
              <div className="flex border-b border-gray-200">
                <button
                  onClick={() => setActiveTab("security")}
                  className={`flex-1 px-6 py-4 text-sm font-medium transition-colors ${
                    activeTab === "security"
                      ? "text-blue-600 border-b-2 border-blue-600"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  车站安防模块
                </button>
                <button
                  onClick={() => setActiveTab("dispatch")}
                  className={`flex-1 px-6 py-4 text-sm font-medium transition-colors ${
                    activeTab === "dispatch"
                      ? "text-blue-600 border-b-2 border-blue-600"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  行车调度模块
                </button>
              </div>
            </div>

            {activeTab === "security" ? <SecurityModule /> : <DispatchModule />}
          </div>
        </div>

        <div className="mt-6 bg-white rounded-lg shadow-md p-4">
          <h3 className="text-lg font-semibold text-gray-800 mb-3">系统说明</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-semibold text-blue-800 mb-2">🚇 车站安防模块</h4>
              <ul className="space-y-1 list-disc list-inside">
                <li>实时监测各车站客流密度</li>
                <li>分级风险评估（低/中/高/危急）</li>
                <li>各站台负载实时监控</li>
                <li>进站/出站人流统计</li>
              </ul>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <h4 className="font-semibold text-green-800 mb-2">🚄 行车调度模块</h4>
              <ul className="space-y-1 list-disc list-inside">
                <li>基于M/M/n排队论的运力预测</li>
                <li>运力缺口实时预警</li>
                <li>列车时刻表实时更新</li>
                <li>运力利用率趋势分析</li>
              </ul>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg">
              <h4 className="font-semibold text-purple-800 mb-2">🔗 数据同步机制</h4>
              <ul className="space-y-1 list-disc list-inside">
                <li>Zustand状态管理全局同步</li>
                <li>IndexedDB持久化历史数据</li>
                <li>事件驱动的数据同步</li>
                <li>支持离线数据查看</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
