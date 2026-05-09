"use client";

import { useSubwayStore } from "@/store/subwayStore";
import { queuingEngine } from "@/lib/queuingEngine";
import { useEffect, useState } from "react";
import { generateMockTrainSchedules, generateMockCapacityPrediction } from "@/data/mockData";
import type { TrainSchedule, CapacityPrediction } from "@/types";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

export default function DispatchModule() {
  const {
    getSelectedStation,
    getSelectedCrowdPressure,
    getSelectedTrainSchedules,
    getSelectedCapacityPrediction,
    updateTrainSchedules,
    updateCapacityPrediction,
  } = useSubwayStore();

  const station = getSelectedStation();
  const pressure = getSelectedCrowdPressure();
  const schedules = getSelectedTrainSchedules();
  const prediction = getSelectedCapacityPrediction();

  const [predictionHistory, setPredictionHistory] = useState<Array<{ time: string; utilization: number; capacityGap: number }>>([]);

  useEffect(() => {
    if (!station) return;

    const interval = setInterval(async () => {
      const newSchedules = generateMockTrainSchedules(station.id, Date.now());
      updateTrainSchedules(station.id, newSchedules);

      if (pressure) {
        const newPrediction = await queuingEngine.predict(station.id, pressure, newSchedules);
        updateCapacityPrediction(newPrediction);

        const time = new Date().toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" });
        setPredictionHistory((prev) => {
          const newData = [
            ...prev,
            {
              time,
              utilization: Math.round(newPrediction.utilization * 100),
              capacityGap: Math.round(newPrediction.capacityGap),
            },
          ];
          if (newData.length > 15) newData.shift();
          return newData;
        });
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [station, pressure, updateTrainSchedules, updateCapacityPrediction]);

  if (!station) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-bold mb-4 text-gray-800">行车调度模块</h2>
        <p className="text-gray-500">请选择一个车站查看详情</p>
      </div>
    );
  }

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString("zh-CN", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-bold mb-6 text-gray-800">行车调度模块</h2>

      {prediction && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-3 text-gray-700">运力预测</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="bg-blue-50 p-3 rounded-lg">
              <p className="text-xs text-gray-600">预测到达率</p>
              <p className="text-lg font-bold text-blue-600">
                {Math.round(prediction.predictedArrivalRate)} 人/分
              </p>
            </div>
            <div className="bg-green-50 p-3 rounded-lg">
              <p className="text-xs text-gray-600">预测服务率</p>
              <p className="text-lg font-bold text-green-600">
                {Math.round(prediction.predictedServiceRate)} 人/分
              </p>
            </div>
            <div className="bg-yellow-50 p-3 rounded-lg">
              <p className="text-xs text-gray-600">平均等待时间</p>
              <p className="text-lg font-bold text-yellow-600">
                {Math.round(prediction.averageWaitTime)} 分钟
              </p>
            </div>
            <div className="bg-purple-50 p-3 rounded-lg">
              <p className="text-xs text-gray-600">队列长度</p>
              <p className="text-lg font-bold text-purple-600">
                {Math.round(prediction.queueLength)} 人
              </p>
            </div>
            <div className="bg-orange-50 p-3 rounded-lg">
              <p className="text-xs text-gray-600">运力利用率</p>
              <p className="text-lg font-bold text-orange-600">
                {Math.round(prediction.utilization * 100)}%
              </p>
            </div>
            <div className="bg-red-50 p-3 rounded-lg">
              <p className="text-xs text-gray-600">运力缺口</p>
              <p className="text-lg font-bold text-red-600">
                {Math.round(prediction.capacityGap)} 人
              </p>
            </div>
          </div>
          <div className="mt-2 text-sm text-gray-500">
            预测置信度: {(prediction.confidence * 100).toFixed(1)}%
          </div>
        </div>
      )}

      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-3 text-gray-700">运力趋势</h3>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={predictionHistory}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="time" />
              <YAxis yAxisId="left" domain={[0, 100]} />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="utilization"
                stroke="#1a56db"
                name="利用率(%)"
                dot={false}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="capacityGap"
                stroke="#e02424"
                name="缺口(人)"
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-3 text-gray-700">列车时刻表</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                  车次
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                  线路
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                  预计到达
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                  预计发车
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                  载客率
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                  状态
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {schedules.slice(0, 5).map((schedule) => (
                <tr key={schedule.id}>
                  <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">
                    {schedule.id.slice(-8)}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">
                    {schedule.line}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">
                    {formatTime(schedule.arrivalTime)}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">
                    {formatTime(schedule.departureTime)}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                        <div
                          className={`h-2 rounded-full ${
                            schedule.currentLoad < 0.5
                              ? "bg-green-500"
                              : schedule.currentLoad < 0.8
                              ? "bg-yellow-500"
                              : "bg-red-500"
                          }`}
                          style={{ width: `${schedule.currentLoad * 100}%` }}
                        />
                      </div>
                      <span className="text-sm text-gray-600">
                        {Math.round(schedule.currentLoad * 100)}%
                      </span>
                    </div>
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    <span
                      className={`px-2 py-1 text-xs font-semibold rounded-full ${
                        schedule.status === "on-time"
                          ? "bg-green-100 text-green-800"
                          : schedule.status === "delayed"
                          ? "bg-yellow-100 text-yellow-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {schedule.status === "on-time"
                        ? "正点"
                        : schedule.status === "delayed"
                        ? "晚点"
                        : "取消"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
