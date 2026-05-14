import React, { useState, useEffect } from "react";

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
  const [isInitialized, setIsInitialized] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);
  const [stats, setStats] = useState<Stats>({
    totalObservations: 0,
    maritimeRecords: 0,
    energyRecords: 0,
    simulationRecords: 0,
    avgWaveHeight: 0,
    avgWavePeriod: 0,
  });

  useEffect(() => {
    const init = async () => {
      try {
        const { waveCacheDB } = await import('./database/WaveCacheDB');
        const { dataFlowService } = await import('./services/DataFlowService');
        
        await waveCacheDB.init();
        await dataFlowService.initialize();
        
        const newStats = await waveCacheDB.getStatistics();
        setStats(newStats);
        setIsInitialized(true);
      } catch (error) {
        console.error('Initialization error:', error);
        setInitError(error instanceof Error ? error.message : String(error));
        setIsInitialized(true);
      }
    };
    
    init();
  }, []);

  if (!isInitialized) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "linear-gradient(180deg, #0f172a 0%, #1e293b 100%)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          color: "#f8fafc",
        }}
      >
        <div style={{ fontSize: "64px", marginBottom: "20px" }}>🌊</div>
        <h1 style={{ fontSize: "28px", marginBottom: "10px" }}>WaveNexus</h1>
        <p style={{ color: "#94a3b8" }}>正在初始化系统...</p>
      </div>
    );
  }

  if (initError) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "linear-gradient(180deg, #0f172a 0%, #1e293b 100%)",
          padding: "40px",
          color: "#f8fafc",
        }}
      >
        <h2 style={{ color: "#ef4444", marginBottom: "20px" }}>⚠️ 初始化错误</h2>
        <pre style={{ background: "#334155", padding: "20px", borderRadius: "8px", overflow: "auto" }}>
          {initError}
        </pre>
        <button
          onClick={() => window.location.reload()}
          style={{
            marginTop: "20px",
            padding: "12px 24px",
            background: "#0ea5e9",
            border: "none",
            borderRadius: "8px",
            color: "white",
            cursor: "pointer",
            fontSize: "14px",
            fontWeight: "bold",
          }}
        >
          刷新页面重试
        </button>
      </div>
    );
  }

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
        <div
          style={{
            background: "#1e293b",
            borderRadius: "12px",
            padding: "20px",
            textAlign: "center",
          }}
        >
          <h3 style={{ color: "#f8fafc" }}>🌊 波浪模拟</h3>
          <p style={{ color: "#94a3b8", marginTop: "10px" }}>基于微幅波理论的波浪动力学模拟</p>
          <SimpleWaveCanvas />
        </div>
      )}

      {activeTab === "protection" && (
        <div
          style={{
            background: "#1e293b",
            borderRadius: "12px",
            padding: "20px",
            textAlign: "center",
          }}
        >
          <h3 style={{ color: "#f8fafc" }}>🛡️ 护岸模拟</h3>
          <p style={{ color: "#94a3b8", marginTop: "10px" }}>护岸工程防御效果评估</p>
        </div>
      )}

      {activeTab === "data" && (
        <div
          style={{
            background: "#1e293b",
            borderRadius: "12px",
            padding: "20px",
          }}
        >
          <h3 style={{ color: "#f8fafc", marginBottom: "20px" }}>📊 数据流转</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "15px" }}>
            <div style={{ background: "#334155", padding: "20px", borderRadius: "8px", textAlign: "center" }}>
              <div style={{ fontSize: "28px", color: "#0ea5e9", fontWeight: "bold" }}>{stats.totalObservations}</div>
              <div style={{ color: "#94a3b8", fontSize: "13px" }}>总观测数</div>
            </div>
            <div style={{ background: "#334155", padding: "20px", borderRadius: "8px", textAlign: "center" }}>
              <div style={{ fontSize: "28px", color: "#22c55e", fontWeight: "bold" }}>{stats.maritimeRecords}</div>
              <div style={{ color: "#94a3b8", fontSize: "13px" }}>海事数据</div>
            </div>
            <div style={{ background: "#334155", padding: "20px", borderRadius: "8px", textAlign: "center" }}>
              <div style={{ fontSize: "28px", color: "#f59e0b", fontWeight: "bold" }}>{stats.energyRecords}</div>
              <div style={{ color: "#94a3b8", fontSize: "13px" }}>能源数据</div>
            </div>
            <div style={{ background: "#334155", padding: "20px", borderRadius: "8px", textAlign: "center" }}>
              <div style={{ fontSize: "28px", color: "#ef4444", fontWeight: "bold" }}>{stats.simulationRecords}</div>
              <div style={{ color: "#94a3b8", fontSize: "13px" }}>模拟数据</div>
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

function SimpleWaveCanvas() {
  return (
    <div style={{ marginTop: "20px" }}>
      <canvas
        width={600}
        height={300}
        style={{
          borderRadius: "8px",
          boxShadow: "0 4px 20px rgba(0, 0, 0, 0.3)",
          background: "#0f172a",
        }}
        ref={(canvas) => {
          if (canvas) {
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.fillStyle = '#1e293b';
              ctx.fillRect(0, 0, 600, 300);
              ctx.fillStyle = '#0ea5e9';
              ctx.font = '20px Arial';
              ctx.fillText('Wave Canvas', 250, 150);
            }
          }
        }}
      />
    </div>
  );
}

export default App;