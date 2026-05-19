"use client";

import { useState, useEffect } from "react";
import { getRecentSessions, getSnapshotsBySession } from "@/lib/indexedDB";
import type { PoseSnapshot } from "@/types";

interface HistoryViewerProps {
  onClose: () => void;
}

export default function HistoryViewer({ onClose }: HistoryViewerProps) {
  const [sessions, setSessions] = useState<
    {
      id: string;
      name: string;
      startTime: number;
      endTime?: number;
      robotIds: string[];
    }[]
  >([]);
  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  const [snapshots, setSnapshots] = useState<PoseSnapshot[]>([]);
  const [currentSnapshotIndex, setCurrentSnapshotIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    void loadSessions();
  }, []);

  useEffect(() => {
    if (selectedSession) {
      void loadSnapshots(selectedSession);
    }
  }, [selectedSession]);

  useEffect(() => {
    if (!isPlaying || snapshots.length === 0) return;

    const interval = setInterval(() => {
      setCurrentSnapshotIndex((prev) => {
        if (prev >= snapshots.length - 1) {
          setIsPlaying(false);
          return 0;
        }
        return prev + 1;
      });
    }, 200);

    return () => clearInterval(interval);
  }, [isPlaying, snapshots.length]);

  const loadSessions = async () => {
    const data = await getRecentSessions(20);
    setSessions(data);
  };

  const loadSnapshots = async (sessionId: string) => {
    const data = await getSnapshotsBySession(sessionId);
    setSnapshots(data);
    setCurrentSnapshotIndex(0);
  };

  const formatDateTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleString("zh-CN", {
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  const currentSnapshot = snapshots[currentSnapshotIndex];

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <h2 className="text-xl font-bold text-white">历史数据回放</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          <div className="w-64 border-r border-gray-700 overflow-y-auto">
            <div className="p-3 border-b border-gray-700">
              <h3 className="text-sm font-semibold text-gray-400">会话列表</h3>
            </div>
            <div className="p-2 space-y-1">
              {sessions.length === 0 ? (
                <div className="text-center text-gray-500 py-8 text-sm">暂无历史会话</div>
              ) : (
                sessions.map((session) => (
                  <button
                    key={session.id}
                    onClick={() => setSelectedSession(session.id)}
                    className={`w-full p-2 rounded text-left text-sm transition-colors ${
                      selectedSession === session.id
                        ? "bg-blue-600 text-white"
                        : "bg-gray-800 hover:bg-gray-700 text-gray-300"
                    }`}
                  >
                    <div className="font-medium truncate">{session.name}</div>
                    <div className="text-xs opacity-70">
                      {formatDateTime(session.startTime)}
                    </div>
                    <div className="text-xs opacity-70">
                      {session.robotIds.length} 台机器人
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          <div className="flex-1 flex flex-col overflow-hidden">
            {selectedSession && snapshots.length > 0 && currentSnapshot ? (
              <>
                <div className="p-4 border-b border-gray-700">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-white font-medium">
                        回放进度: {currentSnapshotIndex + 1} / {snapshots.length}
                      </div>
                      <div className="text-sm text-gray-400">
                        时间: {formatDateTime(currentSnapshot.timestamp)}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setCurrentSnapshotIndex(0)}
                        className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white rounded text-sm"
                      >
                        开始
                      </button>
                      <button
                        onClick={() => setIsPlaying(!isPlaying)}
                        className={`px-4 py-1 rounded text-sm font-medium ${
                          isPlaying
                            ? "bg-yellow-600 hover:bg-yellow-700 text-white"
                            : "bg-green-600 hover:bg-green-700 text-white"
                        }`}
                      >
                        {isPlaying ? "暂停" : "播放"}
                      </button>
                      <button
                        onClick={() => setCurrentSnapshotIndex(snapshots.length - 1)}
                        className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white rounded text-sm"
                      >
                        结束
                      </button>
                    </div>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={snapshots.length - 1}
                    value={currentSnapshotIndex}
                    onChange={(e) => setCurrentSnapshotIndex(parseInt(e.target.value))}
                    className="w-full mt-3"
                  />
                </div>

                <div className="flex-1 overflow-y-auto p-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gray-800 rounded-lg p-4">
                      <h4 className="text-sm font-semibold text-gray-400 mb-3">
                        机器人: {currentSnapshot.robotId}
                      </h4>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-400">位置 X:</span>
                          <span className="text-white font-mono">
                            {currentSnapshot.pose.position.x.toFixed(3)}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-400">位置 Y:</span>
                          <span className="text-white font-mono">
                            {currentSnapshot.pose.position.y.toFixed(3)}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-400">位置 Z:</span>
                          <span className="text-white font-mono">
                            {currentSnapshot.pose.position.z.toFixed(3)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-gray-800 rounded-lg p-4">
                      <h4 className="text-sm font-semibold text-gray-400 mb-3">关节状态</h4>
                      <div className="grid grid-cols-3 gap-2">
                        {currentSnapshot.pose.joints.map((joint) => (
                          <div key={joint.jointId} className="bg-gray-700 rounded p-2 text-center">
                            <div className="text-xs text-gray-400">J{joint.jointId}</div>
                            <div className="text-white text-sm font-mono">
                              {joint.angle.toFixed(1)}°
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="bg-gray-800 rounded-lg p-4">
                      <h4 className="text-sm font-semibold text-gray-400 mb-3">
                        障碍物 ({currentSnapshot.obstacles.length})
                      </h4>
                      <div className="space-y-1 max-h-32 overflow-y-auto">
                        {currentSnapshot.obstacles.map((obs, idx) => (
                          <div key={idx} className="text-xs text-gray-300">
                            {obs.type === "dynamic" ? "动态" : "静态"} @ ({obs.position.x.toFixed(1)}, {obs.position.z.toFixed(1)})
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="bg-gray-800 rounded-lg p-4">
                      <h4 className="text-sm font-semibold text-gray-400 mb-3">
                        告警 ({currentSnapshot.alerts.length})
                      </h4>
                      <div className="space-y-1 max-h-32 overflow-y-auto">
                        {currentSnapshot.alerts.length === 0 ? (
                          <div className="text-xs text-gray-500">无告警</div>
                        ) : (
                          currentSnapshot.alerts.map((alert, idx) => (
                            <div
                              key={idx}
                              className={`text-xs px-2 py-1 rounded ${
                                alert.severity === "critical"
                                  ? "bg-red-900/50 text-red-300"
                                  : "bg-yellow-900/50 text-yellow-300"
                              }`}
                            >
                              {alert.message}
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-gray-500">
                {selectedSession ? "正在加载数据..." : "请选择一个会话查看"}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
