"use client";

import type { SafetyAlert, RobotState } from "@/types";

interface SafetyMonitorPanelProps {
  alerts: SafetyAlert[];
  robots: RobotState[];
  onAcknowledgeAlert: (alertId: string) => void;
}

export default function SafetyMonitorPanel({
  alerts,
  robots,
  onAcknowledgeAlert,
}: SafetyMonitorPanelProps) {
  const severityColors: Record<string, string> = {
    info: "bg-blue-500",
    warning: "bg-yellow-500",
    critical: "bg-red-600",
  };

  const severityLabels: Record<string, string> = {
    info: "信息",
    warning: "警告",
    critical: "严重",
  };

  const typeLabels: Record<string, string> = {
    collision_warning: "碰撞预警",
    joint_limit: "关节限制",
    velocity_limit: "速度限制",
    temperature_warning: "温度警告",
    path_deviation: "路径偏离",
  };

  const unacknowledgedAlerts = alerts.filter((a) => !a.acknowledged);
  const criticalCount = unacknowledgedAlerts.filter((a) => a.severity === "critical").length;
  const warningCount = unacknowledgedAlerts.filter((a) => a.severity === "warning").length;

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString("zh-CN", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  const getRobotName = (robotId: string) => {
    const robot = robots.find((r) => r.id === robotId);
    return robot?.name || robotId;
  };

  return (
    <div className="bg-gray-800 rounded-lg p-4 h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-white">安全监控终端</h2>
        <div className="flex gap-2">
          {criticalCount > 0 && (
            <span className="bg-red-600 text-white text-xs px-2 py-1 rounded-full animate-pulse">
              {criticalCount} 严重
            </span>
          )}
          {warningCount > 0 && (
            <span className="bg-yellow-600 text-white text-xs px-2 py-1 rounded-full">
              {warningCount} 警告
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        {robots.map((robot) => (
          <div
            key={robot.id}
            className={`p-3 rounded-lg ${
              robot.status === "collision"
                ? "bg-red-900/50 border border-red-500"
                : robot.status === "error"
                ? "bg-red-900/30 border border-red-700"
                : "bg-gray-700"
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-white text-sm font-medium">{robot.name}</span>
              <span
                className={`w-2 h-2 rounded-full ${
                  robot.status === "moving"
                    ? "bg-green-500"
                    : robot.status === "paused"
                    ? "bg-yellow-500"
                    : robot.status === "collision" || robot.status === "error"
                    ? "bg-red-500"
                    : "bg-blue-500"
                }`}
              />
            </div>
            <div className="text-xs text-gray-400">
              安全距离:{" "}
              <span
                className={
                  (robot.safetyDistance ?? 1) < 0.3 ? "text-red-400" : "text-green-400"
                }
              >
                {(robot.safetyDistance ?? 0).toFixed(3)}m
              </span>
            </div>
            <div className="text-xs text-gray-500">
              关节温度: {Math.max(...robot.pose.joints.map((j) => j.temperature)).toFixed(0)}°C
            </div>
          </div>
        ))}
      </div>

      <div className="border-t border-gray-700 pt-4 flex-1 overflow-hidden flex flex-col">
        <h3 className="text-sm font-semibold text-gray-400 mb-3">告警日志</h3>
        <div className="flex-1 overflow-y-auto space-y-2">
          {alerts.length === 0 ? (
            <div className="text-center text-gray-500 py-8">暂无告警</div>
          ) : (
            alerts.map((alert) => (
              <div
                key={alert.id}
                className={`p-3 rounded-lg border-l-4 transition-opacity ${
                  alert.acknowledged ? "opacity-60" : ""
                } ${
                  alert.severity === "critical"
                    ? "bg-red-900/30 border-red-500"
                    : alert.severity === "warning"
                    ? "bg-yellow-900/30 border-yellow-500"
                    : "bg-blue-900/30 border-blue-500"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className={`w-2 h-2 rounded-full ${severityColors[alert.severity]}`}
                      />
                      <span className="text-xs text-gray-400">
                        {severityLabels[alert.severity]}
                      </span>
                      <span className="text-xs text-gray-500">•</span>
                      <span className="text-xs text-gray-400">
                        {typeLabels[alert.type] || alert.type}
                      </span>
                      <span className="text-xs text-gray-500">•</span>
                      <span className="text-xs text-gray-400">
                        {getRobotName(alert.robotId)}
                      </span>
                    </div>
                    <p className="text-sm text-white">{alert.message}</p>
                    <div className="text-xs text-gray-500 mt-1">
                      {formatTime(alert.timestamp)}
                    </div>
                  </div>
                  {!alert.acknowledged && (
                    <button
                      onClick={() => onAcknowledgeAlert(alert.id)}
                      className="ml-2 text-xs text-gray-400 hover:text-white transition-colors"
                    >
                      确认
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
