"use client";

import { useSubwayStore } from "@/store/subwayStore";
import { useEffect } from "react";
import { mockStations } from "@/data/mockData";

const riskLevelColors: Record<string, string> = {
  low: "bg-green-500",
  medium: "bg-yellow-500",
  high: "bg-orange-500",
  critical: "bg-red-500",
};

const riskLevelLabels: Record<string, string> = {
  low: "低风险",
  medium: "中等风险",
  high: "高风险",
  critical: "危急",
};

export default function StationList() {
  const { stations, selectedStationId, selectStation, setStations, crowdPressures } = useSubwayStore();

  useEffect(() => {
    setStations(mockStations);
    if (mockStations.length > 0) {
      selectStation(mockStations[0].id);
    }
  }, [setStations, selectStation]);

  return (
    <div className="bg-white rounded-lg shadow-md p-4">
      <h2 className="text-xl font-bold mb-4 text-gray-800">车站列表</h2>
      <div className="space-y-2">
        {stations.map((station) => {
          const pressure = crowdPressures.get(station.id);
          return (
            <div
              key={station.id}
              onClick={() => selectStation(station.id)}
              className={`p-3 rounded-lg cursor-pointer transition-all duration-200 ${
                selectedStationId === station.id
                  ? "bg-blue-100 border-2 border-blue-500"
                  : "bg-gray-50 border-2 border-transparent hover:bg-gray-100"
              }`}
            >
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-semibold text-gray-800">{station.name}</h3>
                  <p className="text-sm text-gray-500">{station.line}</p>
                </div>
                {pressure && (
                  <div className="flex items-center space-x-2">
                    <div
                      className={`w-3 h-3 rounded-full ${riskLevelColors[pressure.riskLevel]}`}
                    />
                    <span className="text-sm text-gray-600">
                      {riskLevelLabels[pressure.riskLevel]}
                    </span>
                  </div>
                )}
              </div>
              {pressure && (
                <div className="mt-2">
                  <div className="flex justify-between text-sm text-gray-600 mb-1">
                    <span>客流密度</span>
                    <span>{Math.round(pressure.currentDensity * 100)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all duration-300 ${
                        pressure.riskLevel === "low"
                          ? "bg-green-500"
                          : pressure.riskLevel === "medium"
                          ? "bg-yellow-500"
                          : pressure.riskLevel === "high"
                          ? "bg-orange-500"
                          : "bg-red-500"
                      }`}
                      style={{ width: `${Math.min(pressure.currentDensity * 100, 100)}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
