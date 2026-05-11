"use client";

import { useState } from "react";
import MigrationMap from "@/components/MigrationMap";
import HabitatQualityPanel from "@/components/HabitatQualityPanel";
import SemanticMappingPanel from "@/components/SemanticMappingPanel";
import DataSyncStatus from "@/components/DataSyncStatus";

export default function Home() {
  const [activeTab, setActiveTab] = useState<"map" | "habitat" | "mapping">("map");

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-gradient-to-r from-primary to-secondary text-white py-4 px-6 shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-bold">EcoNexus</h1>
              <p className="text-sm opacity-80">候鸟迁徙路径分析系统</p>
            </div>
          </div>
          <DataSyncStatus />
        </div>
      </header>

      <nav className="bg-white shadow-sm">
        <div className="flex gap-1 px-4">
          {[
            { id: "map", label: "迁徙路径地图", icon: "🗺️" },
            { id: "habitat", label: "栖息地质量评价", icon: "🌿" },
            { id: "mapping", label: "语义映射终端", icon: "🔗" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-6 py-3 font-medium transition-all border-b-2 ${
                activeTab === tab.id
                  ? "text-primary border-primary bg-blue-50"
                  : "text-gray-600 border-transparent hover:text-primary hover:bg-gray-50"
              }`}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>
      </nav>

      <main className="flex-1 p-6">
        {activeTab === "map" && <MigrationMap />}
        {activeTab === "habitat" && <HabitatQualityPanel />}
        {activeTab === "mapping" && <SemanticMappingPanel />}
      </main>

      <footer className="bg-gray-800 text-white py-4 px-6">
        <div className="flex justify-between items-center text-sm opacity-70">
          <span>EcoNexus v1.0 - 全球候鸟协同研究平台</span>
          <span>边缘计算节点 · 实时数据同步</span>
        </div>
      </footer>
    </div>
  );
}
