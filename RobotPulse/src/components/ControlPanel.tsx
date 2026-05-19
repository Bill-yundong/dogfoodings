"use client";

import { useState } from "react";
import type { RobotState, Vector3, MasterControlCommand } from "@/types";

interface ControlPanelProps {
  robots: RobotState[];
  selectedRobotId: string | null;
  onSelectRobot: (robotId: string) => void;
  onSendCommand: (command: MasterControlCommand) => void;
  targetPosition: Vector3 | null;
  onClearTarget: () => void;
}

export default function ControlPanel({
  robots,
  selectedRobotId,
  onSelectRobot,
  onSendCommand,
  targetPosition,
  onClearTarget,
}: ControlPanelProps) {
  const [targetX, setTargetX] = useState("");
  const [targetY, setTargetY] = useState("");
  const [targetZ, setTargetZ] = useState("");

  const selectedRobot = robots.find((r) => r.id === selectedRobotId);

  const statusColors: Record<string, string> = {
    idle: "bg-blue-500",
    moving: "bg-green-500",
    paused: "bg-yellow-500",
    error: "bg-red-500",
    collision: "bg-red-600",
  };

  const statusLabels: Record<string, string> = {
    idle: "待机",
    moving: "运行中",
    paused: "暂停",
    error: "错误",
    collision: "碰撞",
  };

  const handleMoveToClick = () => {
    if (!selectedRobotId) return;

    let x = 0,
      y = 0,
      z = 0;

    if (targetPosition) {
      x = targetPosition.x;
      z = targetPosition.z;
    } else {
      x = parseFloat(targetX) || 0;
      y = parseFloat(targetY) || 0;
      z = parseFloat(targetZ) || 0;
    }

    const targetPose = {
      position: { x, y, z },
      orientation: { x: 0, y: 0, z: 0 },
      joints: selectedRobot?.pose.joints || [],
    };

    onSendCommand({
      robotId: selectedRobotId,
      commandType: "move_to",
      targetPose,
    });
  };

  return (
    <div className="bg-gray-800 rounded-lg p-4 h-full overflow-y-auto">
      <h2 className="text-xl font-bold text-white mb-4">主控系统</h2>

      <div className="mb-6">
        <h3 className="text-sm font-semibold text-gray-400 mb-2">机器人列表</h3>
        <div className="space-y-2">
          {robots.map((robot) => (
            <button
              key={robot.id}
              onClick={() => onSelectRobot(robot.id)}
              className={`w-full p-3 rounded-lg text-left transition-all ${
                selectedRobotId === robot.id
                  ? "bg-blue-600 ring-2 ring-blue-400"
                  : "bg-gray-700 hover:bg-gray-600"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-white font-medium">{robot.name}</span>
                <span
                  className={`w-3 h-3 rounded-full ${statusColors[robot.status]}`}
                  title={statusLabels[robot.status]}
                />
              </div>
              <div className="text-xs text-gray-400 mt-1">
                位置: ({robot.pose.position.x.toFixed(2)}, {robot.pose.position.y.toFixed(2)}, {robot.pose.position.z.toFixed(2)})
              </div>
              {robot.safetyDistance !== undefined && (
                <div className={`text-xs mt-1 ${robot.safetyDistance < 0.3 ? "text-red-400" : "text-green-400"}`}>
                  安全距离: {robot.safetyDistance.toFixed(3)}m
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      {selectedRobot && (
        <div className="space-y-4">
          <div className="border-t border-gray-700 pt-4">
            <h3 className="text-sm font-semibold text-gray-400 mb-3">关节状态</h3>
            <div className="grid grid-cols-2 gap-2">
              {selectedRobot.pose.joints.map((joint) => (
                <div key={joint.jointId} className="bg-gray-700 rounded p-2 text-xs">
                  <div className="text-gray-400">关节 {joint.jointId}</div>
                  <div className="text-white font-mono">{joint.angle.toFixed(1)}°</div>
                  <div className="text-gray-500">{joint.temperature.toFixed(0)}°C</div>
                </div>
              ))}
            </div>
          </div>

          <div className="border-t border-gray-700 pt-4">
            <h3 className="text-sm font-semibold text-gray-400 mb-3">运动控制</h3>

            {targetPosition && (
              <div className="bg-gray-700 rounded p-3 mb-3">
                <div className="text-xs text-gray-400 mb-2">已选择目标点（点击场景）</div>
                <div className="text-white font-mono text-sm mb-2">
                  X: {targetPosition.x.toFixed(2)}, Z: {targetPosition.z.toFixed(2)}
                </div>
                <button
                  onClick={onClearTarget}
                  className="text-xs text-red-400 hover:text-red-300"
                >
                  清除目标点
                </button>
              </div>
            )}

            {!targetPosition && (
              <div className="space-y-2 mb-3">
                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="text-xs text-gray-400">X</label>
                    <input
                      type="number"
                      value={targetX}
                      onChange={(e) => setTargetX(e.target.value)}
                      className="w-full bg-gray-700 text-white rounded px-2 py-1 text-sm"
                      placeholder="0.0"
                      step="0.1"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="text-xs text-gray-400">Y</label>
                    <input
                      type="number"
                      value={targetY}
                      onChange={(e) => setTargetY(e.target.value)}
                      className="w-full bg-gray-700 text-white rounded px-2 py-1 text-sm"
                      placeholder="0.0"
                      step="0.1"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="text-xs text-gray-400">Z</label>
                    <input
                      type="number"
                      value={targetZ}
                      onChange={(e) => setTargetZ(e.target.value)}
                      className="w-full bg-gray-700 text-white rounded px-2 py-1 text-sm"
                      placeholder="0.0"
                      step="0.1"
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={handleMoveToClick}
                disabled={selectedRobot.status === "collision"}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white py-2 px-4 rounded text-sm font-medium transition-colors"
              >
                移动到目标
              </button>
              <button
                onClick={() =>
                  onSendCommand({ robotId: selectedRobotId!, commandType: "home" })
                }
                className="bg-gray-600 hover:bg-gray-500 text-white py-2 px-4 rounded text-sm font-medium transition-colors"
              >
                回原点
              </button>
              <button
                onClick={() =>
                  onSendCommand({ robotId: selectedRobotId!, commandType: "pause" })
                }
                disabled={selectedRobot.status !== "moving"}
                className="bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white py-2 px-4 rounded text-sm font-medium transition-colors"
              >
                暂停
              </button>
              <button
                onClick={() =>
                  onSendCommand({ robotId: selectedRobotId!, commandType: "resume" })
                }
                disabled={selectedRobot.status !== "paused"}
                className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white py-2 px-4 rounded text-sm font-medium transition-colors"
              >
                继续
              </button>
              <button
                onClick={() =>
                  onSendCommand({ robotId: selectedRobotId!, commandType: "stop" })
                }
                className="col-span-2 bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded text-sm font-medium transition-colors"
              >
                紧急停止
              </button>
            </div>
          </div>

          {selectedRobot.batteryLevel !== undefined && (
            <div className="border-t border-gray-700 pt-4">
              <h3 className="text-sm font-semibold text-gray-400 mb-2">电池状态</h3>
              <div className="w-full bg-gray-700 rounded-full h-3">
                <div
                  className={`h-3 rounded-full transition-all ${
                    selectedRobot.batteryLevel > 30 ? "bg-green-500" : "bg-red-500"
                  }`}
                  style={{ width: `${selectedRobot.batteryLevel}%` }}
                />
              </div>
              <div className="text-right text-xs text-gray-400 mt-1">
                {selectedRobot.batteryLevel.toFixed(0)}%
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
