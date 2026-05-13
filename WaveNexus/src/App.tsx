import React, { useState, useEffect } from "react";
import { WaveCanvas } from "./components/WaveCanvas";
import { ShoreProtectionSimulator } from "./components/ShoreProtectionSimulator";
import { dataFlowService } from "./services/DataFlowService";
import { waveCacheDB } from "./database/WaveCacheDB";

interface Stats {
  totalObservations: number;
  maritimeRecords: number;
  energyRecords: number;
  simulationRecords: number;
  avgWaveHeight: number;
  avgWavePeriod: number;
}

function App() {
  const [activeTab, setActiveTab] = useState<"simulation" | "protection" | "data">(
    "simulation"
  );
  const [waveHeight, setWaveHeight] = useState(3);
  const [wavePeriod, setWavePeriod] = useState(8);
  const [waterDepth, setWaterDepth] = useState(20);
  const [showEnergyFlow, setShowEnergyFlow] = useState(true);
  const [showBreakingZones, setShowBreakingZones] = useState(true);
  const [stats, setStats] = useState<Stats>({
    totalObservations: 0,
    maritimeRecords: 0,
    energyRecords: 0,
    simulationRecords: 0,
    avgWaveHeight: 0,
    avgWavePeriod: 0,
  });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const init = async () => {
      await waveCacheDB.init();
      await dataFlowService.initialize();
      await loadStats();
    };
    init();
  }, []);

  const loadStats = async () => {
    const newStats = await waveCacheDB.getStatistics();
    setStats(newStats);
  };

  const generateTestData = async () => {
    setIsLoading(true);
    try {
      const maritimeData = await dataFlowService.generateSyntheticMaritimeData(
        50,
        "STATION-01"
      );
      await dataFlowService.ingestMaritimeData(maritimeData);

      const energyData = await dataFlowService.generateSyntheticEnergyData(
        50,
        "FARM-01"
      );
      await dataFlowService.ingestEnergySystemData(energyData);

      await loadStats();
    } catch (error) {
      console.error("Error generating test data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const clearData = async () => {
    setIsLoading(true);
    try {
      await waveCacheDB.clearOldData(Date.now());
      await loadStats();
    } catch (error) {
      console.error("Error clearing data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(180deg, #0f172a 0%, #1e293b 100%)",
        padding: "20px",
      }}
    >
      <header style={{ marginBottom: "20px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "15px" }}>
          <div
            style={{
              width: "50px",
              height: "50px",
              borderRadius: "12px",
              background: "linear-gradient(135deg, #0ea5e9 0%, #06b6d4 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "24px",
            }}
          >
            🌊
          </div>
          <div>
            <h1
              style={{
                color: "#f8fafc",
                margin: 0,
                fontSize: "24px",
                fontWeight: "bold",
              }}
            >
              WaveNexus
            </h1>
            <p style={{ color: "#94a3b8", margin: "5px 0 0", fontSize: "14px" }}>
              近岸浪涌能流分布建模系统
            </p>
          </div>
        </div>
      </header>

      <div
        style={{
          display: "flex",
          gap: "10px",
          marginBottom: "20px",
          background: "#1e293b",
          padding: "8px",
          borderRadius: "12px",
        }}
      >
        {[
          { id: "simulation", label: "波浪模拟", icon: "🌊" },
          { id: "protection", label: "护岸模拟", icon: "🛡️" },
          { id: "data", label: "数据流转", icon: "📊" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            style={{
              flex: 1,
              padding: "12px 20px",
              border: "none",
              borderRadius: "8px",
              background:
                activeTab === tab.id
                  ? "linear-gradient(135deg, #0ea5e9 0%, #06b6d4 100%)"
                  : "transparent",
              color: activeTab === tab.id ? "#ffffff" : "#94a3b8",
              fontWeight: activeTab === tab.id ? "bold" : "normal",
              cursor: "pointer",
              fontSize: "14px",
              transition: "all 0.2s",
            }}
          >
            <span style={{ marginRight: "8px" }}>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "simulation" && (
        <div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 300px",
              gap: "20px",
            }}
          >
            <div>
              <WaveCanvas
                waveHeight={waveHeight}
                wavePeriod={wavePeriod}
                waterDepth={waterDepth}
                showEnergyFlow={showEnergyFlow}
                showBreakingZones={showBreakingZones}
                width={780}
                height={450}
              />
            </div>

            <div
              style={{
                background: "#1e293b",
                borderRadius: "12px",
                padding: "20px",
              }}
            >
              <h3
                style={{
                  color: "#f8fafc",
                  margin: "0 0 20px",
                  fontSize: "16px",
                }}
              >
                波浪参数
              </h3>

              <div style={{ marginBottom: "20px" }}>
                <label
                  style={{
                    display: "block",
                    color: "#cbd5e1",
                    marginBottom: "8px",
                    fontSize: "13px",
                  }}
                >
                  波高: {waveHeight.toFixed(1)} m
                </label>
                <input
                  type="range"
                  min="0.5"
                  max="8"
                  step="0.1"
                  value={waveHeight}
                  onChange={(e) => setWaveHeight(parseFloat(e.target.value))}
                  style={{ width: "100%" }}
                />
              </div>

              <div style={{ marginBottom: "20px" }}>
                <label
                  style={{
                    display: "block",
                    color: "#cbd5e1",
                    marginBottom: "8px",
                    fontSize: "13px",
                  }}
                >
                  周期: {wavePeriod.toFixed(1)} s
                </label>
                <input
                  type="range"
                  min="3"
                  max="20"
                  step="0.5"
                  value={wavePeriod}
                  onChange={(e) => setWavePeriod(parseFloat(e.target.value))}
                  style={{ width: "100%" }}
                />
              </div>

              <div style={{ marginBottom: "20px" }}>
                <label
                  style={{
                    display: "block",
                    color: "#cbd5e1",
                    marginBottom: "8px",
                    fontSize: "13px",
                  }}
                >
                  水深: {waterDepth.toFixed(1)} m
                </label>
                <input
                  type="range"
                  min="5"
                  max="50"
                  step="1"
                  value={waterDepth}
                  onChange={(e) => setWaterDepth(parseFloat(e.target.value))}
                  style={{ width: "100%" }}
                />
              </div>

              <div
                style={{
                  borderTop: "1px solid #334155",
                  paddingTop: "20px",
                }}
              >
                <h4
                  style={{
                    color: "#94a3b8",
                    margin: "0 0 15px",
                    fontSize: "13px",
                  }}
                >
                  可视化选项
                </h4>

                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    color: "#cbd5e1",
                    marginBottom: "10px",
                    cursor: "pointer",
                    fontSize: "13px",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={showEnergyFlow}
                    onChange={(e) => setShowEnergyFlow(e.target.checked)}
                    style={{ width: "16px", height: "16px" }}
                  />
                  显示能量流场
                </label>

                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    color: "#cbd5e1",
                    cursor: "pointer",
                    fontSize: "13px",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={showBreakingZones}
                    onChange={(e) => setShowBreakingZones(e.target.checked)}
                    style={{ width: "16px", height: "16px" }}
                  />
                  显示破碎区
                </label>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "protection" && <ShoreProtectionSimulator />}

      {activeTab === "data" && (
        <div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: "15px",
              marginBottom: "20px",
            }}
          >
            {[
              { label: "总观测数", value: stats.totalObservations, color: "#0ea5e9" },
              { label: "海事数据", value: stats.maritimeRecords, color: "#22c55e" },
              { label: "能源数据", value: stats.energyRecords, color: "#f59e0b" },
              { label: "模拟数据", value: stats.simulationRecords, color: "#ef4444" },
            ].map((stat, index) => (
              <div
                key={index}
                style={{
                  background: "#1e293b",
                  borderRadius: "12px",
                  padding: "20px",
                  textAlign: "center",
                }}
              >
                <div
                  style={{
                    fontSize: "32px",
                    fontWeight: "bold",
                    color: stat.color,
                    marginBottom: "5px",
                  }}
                >
                  {stat.value}
                </div>
                <div style={{ color: "#94a3b8", fontSize: "13px" }}>
                  {stat.label}
                </div>
              </div>
            ))}
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "20px",
              marginBottom: "20px",
            }}
          >
            <div
              style={{
                background: "#1e293b",
                borderRadius: "12px",
                padding: "20px",
              }}
            >
              <h3
                style={{
                  color: "#f8fafc",
                  margin: "0 0 20px",
                  fontSize: "16px",
                }}
              >
                数据管理
              </h3>

              <div style={{ display: "flex", gap: "10px", marginBottom: "20px" }}>
                <button
                  onClick={generateTestData}
                  disabled={isLoading}
                  style={{
                    flex: 1,
                    padding: "12px 20px",
                    border: "none",
                    borderRadius: "8px",
                    background: "linear-gradient(135deg, #0ea5e9 0%, #06b6d4 100%)",
                    color: "#ffffff",
                    fontWeight: "bold",
                    cursor: isLoading ? "not-allowed" : "pointer",
                    fontSize: "14px",
                    opacity: isLoading ? 0.7 : 1,
                  }}
                >
                  {isLoading ? "处理中..." : "生成测试数据"}
                </button>

                <button
                  onClick={clearData}
                  disabled={isLoading}
                  style={{
                    flex: 1,
                    padding: "12px 20px",
                    border: "1px solid #ef4444",
                    borderRadius: "8px",
                    background: "transparent",
                    color: "#ef4444",
                    fontWeight: "bold",
                    cursor: isLoading ? "not-allowed" : "pointer",
                    fontSize: "14px",
                  }}
                >
                  清空数据
                </button>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "10px",
                }}
              >
                <div
                  style={{
                    background: "#334155",
                    borderRadius: "8px",
                    padding: "15px",
                    textAlign: "center",
                  }}
                >
                  <div style={{ color: "#94a3b8", fontSize: "11px", marginBottom: "5px" }}>
                    平均波高
                  </div>
                  <div style={{ color: "#f8fafc", fontSize: "18px", fontWeight: "bold" }}>
                    {stats.avgWaveHeight.toFixed(2)} m
                  </div>
                </div>

                <div
                  style={{
                    background: "#334155",
                    borderRadius: "8px",
                    padding: "15px",
                    textAlign: "center",
                  }}
                >
                  <div style={{ color: "#94a3b8", fontSize: "11px", marginBottom: "5px" }}>
                    平均周期
                  </div>
                  <div style={{ color: "#f8fafc", fontSize: "18px", fontWeight: "bold" }}>
                    {stats.avgWavePeriod.toFixed(2)} s
                  </div>
                </div>
              </div>
            </div>

            <div
              style={{
                background: "#1e293b",
                borderRadius: "12px",
                padding: "20px",
              }}
            >
              <h3
                style={{
                  color: "#f8fafc",
                  margin: "0 0 20px",
                  fontSize: "16px",
                }}
              >
                系统说明
              </h3>

              <div style={{ color: "#94a3b8", fontSize: "13px", lineHeight: "1.8" }}>
                <p style={{ margin: "0 0 15px" }}>
                  <strong style={{ color: "#cbd5e1" }}>海事部门</strong> 负责收集沿岸波浪观测数据，包括波高、周期、方向等海洋气象信息。
                </p>
                <p style={{ margin: "0 0 15px" }}>
                  <strong style={{ color: "#cbd5e1" }}>沿海能源系统</strong> 提供波浪能发电场的实时运行数据，包括能量捕获、效率评估等。
                </p>
                <p style={{ margin: "0" }}>
                  <strong style={{ color: "#cbd5e1" }}>数据对齐</strong> 通过时间窗口匹配和置信度评估，实现跨系统数据的一致性验证。
                </p>
              </div>
            </div>
          </div>

          <div
            style={{
              background: "#1e293b",
              borderRadius: "12px",
              padding: "20px",
            }}
          >
            <h3
              style={{
                color: "#f8fafc",
                margin: "0 0 20px",
                fontSize: "16px",
              }}
            >
              技术架构
            </h3>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: "15px",
              }}
            >
              {[
                {
                  title: "微幅波理论引擎",
                  desc: "基于Airy波理论，采用牛顿迭代法求解色散关系，计算波浪参数与能量流分布",
                  icon: "⚙️",
                },
                {
                  title: "IndexedDB 持久化",
                  desc: "本地存储长周期观测日志，支持按时间、位置、来源多维度查询，确保数据可靠性",
                  icon: "💾",
                },
                {
                  title: "Canvas 实时渲染",
                  desc: "60fps动态波浪动画，能量流场热力图可视化，破碎区脉冲效果实时反馈",
                  icon: "🎨",
                },
              ].map((item, index) => (
                <div
                  key={index}
                  style={{
                    background: "#334155",
                    borderRadius: "8px",
                    padding: "20px",
                  }}
                >
                  <div style={{ fontSize: "28px", marginBottom: "10px" }}>
                    {item.icon}
                  </div>
                  <div
                    style={{
                      color: "#f8fafc",
                      fontWeight: "bold",
                      marginBottom: "8px",
                      fontSize: "14px",
                    }}
                  >
                    {item.title}
                  </div>
                  <div style={{ color: "#94a3b8", fontSize: "12px", lineHeight: "1.6" }}>
                    {item.desc}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <footer
        style={{
          marginTop: "30px",
          textAlign: "center",
          color: "#64748b",
          fontSize: "12px",
        }}
      >
        WaveNexus © 2024 - 近岸浪涌能流分布建模系统
      </footer>
    </div>
  );
}

export default App;
