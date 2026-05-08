"use client";

import { useSubwayStore } from "@/store/subwayStore";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";
import { useEffect, useState } from "react";
import { generateMockCrowdPressure } from "@/data/mockData";
import type { CrowdPressure } from "@/types";

const riskLevelConfig: Record<string, { label: string; color: string; bgColor: string }> = {
  low: { label: "低风险", color: "text-green-600", bgColor: "bg-green-100" },
  medium: { label: "中等风险", color: "text-yellow-600", bgColor: "bg-yellow-100" },
  high: { label: "高风险", color: "text-orange-600", bgColor: "bg-orange-100" },
  critical: { label: "危急", color: "text-red-600", bgColor: "bg-red-100" },
};

export default function SecurityModule() {
  const { getSelectedStation, getSelectedCrowdPressure, updateCrowdPressure } = useSubwayStore();
  const station = getSelectedStation();
  const pressure = getSelectedCrowdPressure();
  const [historicalData, setHistoricalData] = useState<Array<{ time: string; density: number }>>([]);

  useEffect(() => {
    if (!station) return;

    const interval = setInterval(() => {
      const newPressure = generateMockCrowdPressure(station.id, Date.now());
      updateCrowdPressure(newPressure);

      const time = new Date().toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" });
      setHistoricalData((prev) => {
        const newData = [...prev, { time, density: Math.round(newPressure.currentDensity * 100) }];
        if (newData.length > 20) newData.shift();
        return newData;
      });
    }, 3000);

    return () => clearInterval(interval);
  }, [station, updateCrowdPressure]);

  if (!station || !pressure) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-bold mb-4 text-gray-800">车站安防模块</h2>
        <p className="text-gray-500">请选择一个车站查看详情</p>
      </div>
    );
  }

  const riskConfig = riskLevelConfig[pressure.riskLevel];

  const platformData = pressure.platformLoad.map((load, index) => ({
    name: `站台 ${index + 1}`,
    load: Math.round(load * 100),
  }));

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-800">车站安防模块</h2>
          <p className="text-gray-500">{station.name} - {station.line}</p>
        </div>
        <div className={`px-4 py-2 rounded-full ${riskConfig.bgColor}`}>
          <span className={`font-semibold ${riskConfig.color}`}>
            {riskConfig.label}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-blue-50 p-4 rounded-lg">
          <p className="text-sm text-gray-600">客流密度</p>
          <p className="text-2xl font-bold text-blue-600">
            {Math.round(pressure.currentDensity * 100)}%
          </p>
        </div>
        <div className="bg-green-50 p-4 rounded-lg">
          <p className="text-sm text-gray-600">进站速度</p>
          <p className="text-2xl font-bold text-green-600">{pressure.entryRate} 人/分</p>
        </div>
        <div className="bg-purple-50 p-4 rounded-lg">
          <p className="text-sm text-gray-600">出站速度</p>
          <p className="text-2xl font-bold text-purple-600">{pressure.exitRate} 人/分</p>
        </div>
        <div className="bg-gray-50 p-4 rounded-lg">
          <p className="text-sm text-gray-600">最大容量</p>
          <p className="text-2xl font-bold text-gray-600">{station.maxCapacity} 人</p>
        </div>
      </div>

      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-3 text-gray-700">客流密度趋势</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={historicalData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="time" />
              <YAxis domain={[0, 100]} />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="density"
                stroke="#1a56db"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-3 text-gray-700">各站台负载</h3>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={platformData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis domain={[0, 100]} />
              <Tooltip />
              <Bar dataKey="load" fill="#7e3af2" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
