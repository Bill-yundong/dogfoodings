"use client";

import { useMemo } from "react";
import {
  Aircraft,
  FlightPlan,
  FlightRoute,
  FlightState,
  ConflictDetectionResult,
  BlackBoxSnapshot,
} from "@/lib/types";

interface ControlPanelProps {
  aircraftList: Aircraft[];
  flightPlans: FlightPlan[];
  routes: FlightRoute[];
  flightStates: FlightState[];
  conflicts: ConflictDetectionResult[];
  selectedFlightPlanId?: string;
  onFlightSelect: (flightPlanId: string) => void;
  latestSnapshots: Map<string, BlackBoxSnapshot>;
  isSimulationRunning: boolean;
  onToggleSimulation: () => void;
  onGenerateConflict: () => void;
  semanticAlignmentInfo: {
    source: string;
    target: string;
    confidence: number;
    alignedFields: string[];
  } | null;
}

export default function ControlPanel({
  aircraftList,
  flightPlans,
  routes,
  flightStates,
  conflicts,
  selectedFlightPlanId,
  onFlightSelect,
  latestSnapshots,
  isSimulationRunning,
  onToggleSimulation,
  onGenerateConflict,
  semanticAlignmentInfo,
}: ControlPanelProps) {
  const selectedFlight = useMemo(() => {
    if (!selectedFlightPlanId) return null;

    const plan = flightPlans.find((p) => p.id === selectedFlightPlanId);
    const state = flightStates.find((s) => s.flightPlanId === selectedFlightPlanId);
    const aircraft = plan
      ? aircraftList.find((a) => a.id === plan.aircraftId)
      : null;
    const route = plan
      ? routes.find((r) => r.id === plan.routeId)
      : null;
    const snapshot = selectedFlightPlanId
      ? latestSnapshots.get(selectedFlightPlanId)
      : null;

    return { plan, state, aircraft, route, snapshot };
  }, [
    selectedFlightPlanId,
    flightPlans,
    flightStates,
    aircraftList,
    routes,
    latestSnapshots,
  ]);

  const activeFlights = useMemo(
    () =>
      flightPlans.filter(
        (plan) =>
          plan.status === "active" &&
          flightStates.some((s) => s.flightPlanId === plan.id)
      ),
    [flightPlans, flightStates]
  );

  const conflictCounts = useMemo(() => {
    const counts = { critical: 0, high: 0, medium: 0, low: 0 };
    for (const conflict of conflicts) {
      counts[conflict.riskLevel]++;
    }
    return counts;
  }, [conflicts]);

  return (
    <div className="w-96 h-full bg-white dark:bg-gray-800 shadow-lg flex flex-col">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
          SkywayNexus
        </h1>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          低空物流航路管理系统
        </p>
      </div>

      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
          系统控制
        </h2>
        <div className="flex gap-2">
          <button
            onClick={onToggleSimulation}
            className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              isSimulationRunning
                ? "bg-red-500 hover:bg-red-600 text-white"
                : "bg-green-500 hover:bg-green-600 text-white"
            }`}
          >
            {isSimulationRunning ? "停止模拟" : "开始模拟"}
          </button>
          <button
            onClick={onGenerateConflict}
            className="px-3 py-2 rounded-md text-sm font-medium bg-yellow-500 hover:bg-yellow-600 text-white transition-colors"
          >
            模拟冲突
          </button>
        </div>
      </div>

      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
          告警状态
        </h2>
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-red-50 dark:bg-red-900/30 rounded-lg p-3">
            <div className="text-2xl font-bold text-red-600 dark:text-red-400">
              {conflictCounts.critical}
            </div>
            <div className="text-xs text-red-700 dark:text-red-300">
              严重冲突
            </div>
          </div>
          <div className="bg-orange-50 dark:bg-orange-900/30 rounded-lg p-3">
            <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
              {conflictCounts.high}
            </div>
            <div className="text-xs text-orange-700 dark:text-orange-300">
              高风险
            </div>
          </div>
          <div className="bg-yellow-50 dark:bg-yellow-900/30 rounded-lg p-3">
            <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
              {conflictCounts.medium}
            </div>
            <div className="text-xs text-yellow-700 dark:text-yellow-300">
              中风险
            </div>
          </div>
          <div className="bg-green-50 dark:bg-green-900/30 rounded-lg p-3">
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {conflictCounts.low}
            </div>
            <div className="text-xs text-green-700 dark:text-green-300">
              低风险
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
          活跃航班 ({activeFlights.length})
        </h2>
        <div className="space-y-2">
          {activeFlights.map((plan) => {
            const aircraft = aircraftList.find(
              (a) => a.id === plan.aircraftId
            );
            const state = flightStates.find(
              (s) => s.flightPlanId === plan.id
            );
            const isSelected = plan.id === selectedFlightPlanId;

            return (
              <div
                key={plan.id}
                onClick={() => onFlightSelect(plan.id)}
                className={`p-3 rounded-lg cursor-pointer transition-colors ${
                  isSelected
                    ? "bg-blue-100 dark:bg-blue-900/50 border border-blue-300 dark:border-blue-700"
                    : "bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700"
                }`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white">
                      {plan.flightNumber}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {aircraft?.model || "未知机型"}
                    </div>
                  </div>
                  <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                    飞行中
                  </span>
                </div>
                {state && (
                  <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">
                        高度
                      </span>
                      <div className="font-medium text-gray-900 dark:text-white">
                        {Math.round(state.altitude)}m
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">
                        速度
                      </span>
                      <div className="font-medium text-gray-900 dark:text-white">
                        {Math.round(state.speed)}km/h
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">
                        航向
                      </span>
                      <div className="font-medium text-gray-900 dark:text-white">
                        {Math.round(state.heading)}°
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {selectedFlight && (
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 max-h-80 overflow-y-auto">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
            航班详情
          </h2>

          {selectedFlight.plan && (
            <div className="space-y-2 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-gray-500 dark:text-gray-400">
                    航班号
                  </span>
                  <div className="font-medium text-gray-900 dark:text-white">
                    {selectedFlight.plan.flightNumber}
                  </div>
                </div>
                <div>
                  <span className="text-gray-500 dark:text-gray-400">
                    飞行员
                  </span>
                  <div className="font-medium text-gray-900 dark:text-white">
                    {selectedFlight.plan.pilotName}
                  </div>
                </div>
              </div>

              {selectedFlight.aircraft && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">
                      机型
                    </span>
                    <div className="font-medium text-gray-900 dark:text-white">
                      {selectedFlight.aircraft.model}
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">
                      注册号
                    </span>
                    <div className="font-medium text-gray-900 dark:text-white">
                      {selectedFlight.aircraft.registration}
                    </div>
                  </div>
                </div>
              )}

              {selectedFlight.state && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">
                      垂直速度
                    </span>
                    <div className="font-medium text-gray-900 dark:text-white">
                      {selectedFlight.state.verticalSpeed > 0 ? "+" : ""}
                      {Math.round(selectedFlight.state.verticalSpeed)}m/min
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">
                      燃油
                    </span>
                    <div className="font-medium text-gray-900 dark:text-white">
                      {Math.round(selectedFlight.state.fuelLevel)}%
                    </div>
                  </div>
                </div>
              )}

              {selectedFlight.route && (
                <div>
                  <span className="text-gray-500 dark:text-gray-400">
                    航线
                  </span>
                  <div className="font-medium text-gray-900 dark:text-white">
                    {selectedFlight.route.name} ({selectedFlight.route.waypoints.length}个航点)
                  </div>
                </div>
              )}
            </div>
          )}

          {semanticAlignmentInfo && (
            <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
              <h3 className="text-xs font-semibold text-blue-700 dark:text-blue-300 mb-2">
                语义对齐信息
              </h3>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-blue-600 dark:text-blue-400">
                    源系统
                  </span>
                  <span className="font-medium text-blue-800 dark:text-blue-200">
                    {semanticAlignmentInfo.source}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-blue-600 dark:text-blue-400">
                    目标系统
                  </span>
                  <span className="font-medium text-blue-800 dark:text-blue-200">
                    {semanticAlignmentInfo.target}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-blue-600 dark:text-blue-400">
                    置信度
                  </span>
                  <span className="font-medium text-blue-800 dark:text-blue-200">
                    {(semanticAlignmentInfo.confidence * 100).toFixed(1)}%
                  </span>
                </div>
                <div>
                  <span className="text-blue-600 dark:text-blue-400">
                    对齐字段:
                  </span>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {semanticAlignmentInfo.alignedFields.map((field) => (
                      <span
                        key={field}
                        className="px-1.5 py-0.5 bg-blue-200 dark:bg-blue-800 rounded text-blue-800 dark:text-blue-200"
                      >
                        {field}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {selectedFlight.snapshot && (
            <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <h3 className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
                黑匣子快照
              </h3>
              <div className="text-xs text-gray-600 dark:text-gray-400">
                <div>快照时间: {new Date(selectedFlight.snapshot.snapshotTime).toLocaleString()}</div>
                <div className="mt-1">
                  系统状态:
                  <div className="flex flex-wrap gap-1 mt-1">
                    {Object.entries(
                      selectedFlight.snapshot.flightState.systemsStatus
                    ).map(([key, value]) => (
                      <span
                        key={key}
                        className={`px-1.5 py-0.5 rounded ${
                          value === "正常"
                            ? "bg-green-200 text-green-800 dark:bg-green-800 dark:text-green-200"
                            : "bg-red-200 text-red-800 dark:bg-red-800 dark:text-red-200"
                        }`}
                      >
                        {key}: {value}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
