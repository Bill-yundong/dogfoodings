"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import dynamic from "next/dynamic";
import ControlPanel from "@/components/ControlPanel";
import SafetyMonitorPanel from "@/components/SafetyMonitorPanel";
import HistoryViewer from "@/components/HistoryViewer";
import { masterController } from "@/lib/master-controller";
import { safetyMonitor } from "@/lib/safety-monitor";
import { createSession, endSession, clearAllData } from "@/lib/indexedDB";
import type { RobotState, SafetyAlert, Vector3, MasterControlCommand, Obstacle, PlannedPath } from "@/types";

const RobotScene = dynamic(() => import("@/components/RobotScene"), {
  ssr: false,
});

const INITIAL_OBSTACLES: Obstacle[] = [
  {
    id: "obs-1",
    position: { x: 2, y: 0.5, z: 2 },
    size: { x: 1, y: 1, z: 1 },
    type: "static",
  },
  {
    id: "obs-2",
    position: { x: -2, y: 0.3, z: 1 },
    size: { x: 0.8, y: 0.6, z: 0.8 },
    type: "static",
  },
  {
    id: "obs-3",
    position: { x: 0, y: 0.4, z: -3 },
    size: { x: 1.2, y: 0.8, z: 1.2 },
    type: "static",
  },
  {
    id: "obs-dyn-1",
    position: { x: 3, y: 0.3, z: -1 },
    size: { x: 0.5, y: 0.6, z: 0.5 },
    type: "dynamic",
    velocity: { x: 0.5, y: 0, z: 0.3 },
  },
];

export default function Home() {
  const [robots, setRobots] = useState<RobotState[]>([]);
  const [obstacles, setObstacles] = useState<Obstacle[]>(INITIAL_OBSTACLES);
  const [alerts, setAlerts] = useState<SafetyAlert[]>([]);
  const [selectedRobotId, setSelectedRobotId] = useState<string | null>(null);
  const [targetPosition, setTargetPosition] = useState<Vector3 | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [plannedPaths, setPlannedPaths] = useState<Map<string, PlannedPath>>(new Map());
  const initializedRef = useRef(false);

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    const robot1 = masterController.registerRobot("robot-1", "协作机器人 A", {
      position: { x: -3, y: 0, z: -2 },
      orientation: { x: 0, y: 0, z: 0 },
      joints: [
        { jointId: 0, angle: 0, velocity: 0, torque: 0, temperature: 25 },
        { jointId: 1, angle: -30, velocity: 0, torque: 0, temperature: 26 },
        { jointId: 2, angle: 60, velocity: 0, torque: 0, temperature: 24 },
        { jointId: 3, angle: 0, velocity: 0, torque: 0, temperature: 25 },
        { jointId: 4, angle: -30, velocity: 0, torque: 0, temperature: 26 },
        { jointId: 5, angle: 0, velocity: 0, torque: 0, temperature: 25 },
      ],
    });

    const robot2 = masterController.registerRobot("robot-2", "协作机器人 B", {
      position: { x: 3, y: 0, z: -2 },
      orientation: { x: 0, y: 180, z: 0 },
      joints: [
        { jointId: 0, angle: 180, velocity: 0, torque: 0, temperature: 25 },
        { jointId: 1, angle: -20, velocity: 0, torque: 0, temperature: 27 },
        { jointId: 2, angle: 50, velocity: 0, torque: 0, temperature: 25 },
        { jointId: 3, angle: 0, velocity: 0, torque: 0, temperature: 26 },
        { jointId: 4, angle: -30, velocity: 0, torque: 0, temperature: 25 },
        { jointId: 5, angle: 0, velocity: 0, torque: 0, temperature: 24 },
      ],
    });

    masterController.updateObstacles(INITIAL_OBSTACLES);

    setRobots([robot1, robot2]);
    setObstacles(INITIAL_OBSTACLES);
    setSelectedRobotId("robot-1");

    const removeListener1 = masterController.addStateListener("robot-1", (state) => {
      setRobots((prev) => prev.map((r) => (r.id === "robot-1" ? state : r)));
      safetyMonitor.processRobotState(state);
    });

    const removeListener2 = masterController.addStateListener("robot-2", (state) => {
      setRobots((prev) => prev.map((r) => (r.id === "robot-2" ? state : r)));
      safetyMonitor.processRobotState(state);
    });

    const removeAlertListener = safetyMonitor.addAlertListener((alert) => {
      setAlerts((prev) => [alert, ...prev].slice(0, 50));
    });

    return () => {
      removeListener1();
      removeListener2();
      removeAlertListener();
      masterController.stopSimulation();
    };
  }, []);

  useEffect(() => {
    if (!isSimulating) return;

    const interval = setInterval(() => {
      setObstacles([...masterController.getObstacles()]);
      updatePlannedPaths();
    }, 100);

    return () => clearInterval(interval);
  }, [isSimulating]);

  const updatePlannedPaths = useCallback(() => {
    const paths = new Map<string, PlannedPath>();
    for (const robot of robots) {
      const path = masterController.getPlannedPath(robot.id);
      if (path) {
        paths.set(robot.id, path);
      }
    }
    setPlannedPaths(paths);
  }, [robots]);

  const startSession = useCallback(async () => {
    const session = await createSession("仿真会话", robots.map((r) => r.id));
    setCurrentSessionId(session.id);
    masterController.setSessionId(session.id);
    masterController.startSimulation();
    setIsSimulating(true);

    for (const robot of robots) {
      safetyMonitor.processRobotState(robot);
    }
  }, [robots]);

  const stopSession = useCallback(() => {
    masterController.stopSimulation();
    setIsSimulating(false);
    if (currentSessionId) {
      void endSession(currentSessionId);
    }
    setCurrentSessionId(null);
    masterController.setSessionId("");
  }, [currentSessionId]);

  const handleSendCommand = useCallback(
    async (command: MasterControlCommand) => {
      await masterController.sendCommand(command);
      updatePlannedPaths();
    },
    [updatePlannedPaths]
  );

  const handleRobotClick = useCallback(
    (robotId: string) => {
      setSelectedRobotId(robotId);
    },
    []
  );

  const handleTargetSelect = useCallback(
    (position: Vector3) => {
      setTargetPosition(position);
    },
    []
  );

  const handleClearTarget = useCallback(() => {
    setTargetPosition(null);
  }, []);

  const handleAcknowledgeAlert = useCallback(async (alertId: string) => {
    await safetyMonitor.acknowledgeAlert(alertId);
    setAlerts((prev) => prev.map((a) => (a.id === alertId ? { ...a, acknowledged: true } : a)));
  }, []);

  const handleClearData = useCallback(async () => {
    if (confirm("确定要清除所有历史数据吗？")) {
      await clearAllData();
      alert("数据已清除");
    }
  }, []);

  const handleAddRandomObstacle = useCallback(() => {
    const newObstacle: Obstacle = {
      id: `obs-${Date.now()}`,
      position: {
        x: (Math.random() - 0.5) * 8,
        y: 0.3 + Math.random() * 0.5,
        z: (Math.random() - 0.5) * 8,
      },
      size: {
        x: 0.5 + Math.random() * 0.8,
        y: 0.4 + Math.random() * 0.6,
        z: 0.5 + Math.random() * 0.8,
      },
      type: Math.random() > 0.7 ? "dynamic" : "static",
      velocity:
        Math.random() > 0.7
          ? {
              x: (Math.random() - 0.5) * 0.8,
              y: 0,
              z: (Math.random() - 0.5) * 0.8,
            }
          : undefined,
    };
    masterController.addObstacle(newObstacle);
    setObstacles([...masterController.getObstacles()]);
  }, []);

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col">
      <header className="bg-slate-800 border-b border-slate-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">RobotPulse</h1>
                <p className="text-xs text-gray-400">多协作机器人运动避障仿真系统</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleAddRandomObstacle}
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm transition-colors"
            >
              添加障碍物
            </button>
            <button
              onClick={() => setShowHistory(true)}
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm transition-colors"
            >
              历史回放
            </button>
            <button
              onClick={handleClearData}
              className="px-4 py-2 bg-red-900/50 hover:bg-red-900 text-red-300 rounded-lg text-sm transition-colors"
            >
              清除数据
            </button>
            {!isSimulating ? (
              <button
                onClick={startSession}
                className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
                </svg>
                开始仿真
              </button>
            ) : (
              <button
                onClick={stopSession}
                className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z" clipRule="evenodd" />
                </svg>
                停止仿真
              </button>
            )}
          </div>
        </div>

        {currentSessionId && (
          <div className="mt-3 flex items-center gap-4 text-sm">
            <span className="text-gray-400">当前会话:</span>
            <span className="text-white font-mono">{currentSessionId}</span>
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-green-400">运行中</span>
            </span>
          </div>
        )}
      </header>

      <main className="flex-1 flex overflow-hidden">
        <aside className="w-80 flex-shrink-0 border-r border-slate-700 overflow-hidden">
          <ControlPanel
            robots={robots}
            selectedRobotId={selectedRobotId}
            onSelectRobot={handleRobotClick}
            onSendCommand={handleSendCommand}
            targetPosition={targetPosition}
            onClearTarget={handleClearTarget}
          />
        </aside>

        <section className="flex-1 flex flex-col overflow-hidden">
          <div className="p-4 bg-slate-800/50 border-b border-slate-700">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-white">3D 仿真场景</h2>
                <p className="text-sm text-gray-400">
                  拖动旋转视角 • 滚轮缩放 • 点击地面设置目标点 • 点击机器人选中
                </p>
              </div>
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-gray-500" />
                  <span className="text-gray-400">静态障碍物</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-orange-500" />
                  <span className="text-gray-400">动态障碍物</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-blue-500" />
                  <span className="text-gray-400">规划路径</span>
                </div>
              </div>
            </div>
          </div>
          <div className="flex-1 p-4 overflow-hidden">
            <RobotScene
              robots={robots}
              obstacles={obstacles}
              paths={plannedPaths}
              onRobotClick={handleRobotClick}
              onTargetSelect={handleTargetSelect}
              selectedRobotId={selectedRobotId ?? undefined}
            />
          </div>
        </section>

        <aside className="w-80 flex-shrink-0 border-l border-slate-700 overflow-hidden">
          <SafetyMonitorPanel
            alerts={alerts}
            robots={robots}
            onAcknowledgeAlert={handleAcknowledgeAlert}
          />
        </aside>
      </main>

      {showHistory && <HistoryViewer onClose={() => setShowHistory(false)} />}
    </div>
  );
}
