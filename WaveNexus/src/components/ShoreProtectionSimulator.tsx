import React, { useState, useEffect } from "react";
import { waveEngine, WaveParams } from "../engine/WaveTheoryEngine";
import { waveCacheDB } from "../database/WaveCacheDB";

interface ProtectionResult {
  protectionIndex: number;
  waveTransmission: number;
  energyDissipation: number;
  overtoppingRate: number;
}

interface StructureConfig {
  type: "seawall" | "breakwater" | "revetment";
  height: number;
  width: number;
  position: number;
}

export const ShoreProtectionSimulator: React.FC = () => {
  const [waveParams, setWaveParams] = useState<WaveParams | null>(null);
  const [structureConfig, setStructureConfig] = useState<StructureConfig>({
    type: "breakwater",
    height: 8,
    width: 20,
    position: 50,
  });
  const [stormIntensity, setStormIntensity] = useState(0);
  const [result, setResult] = useState<ProtectionResult | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [history, setHistory] = useState<any[]>([]);

  useEffect(() => {
    const init = async () => {
      const params = await waveEngine.calculateWaveParameters(3, 8, 20);
      setWaveParams(params);
    };
    init();
    loadHistory();
  }, []);

  useEffect(() => {
    if (waveParams) {
      runSimulation();
    }
  }, [waveParams, structureConfig, stormIntensity]);

  const loadHistory = async () => {
    const logs = await waveCacheDB.getShoreProtectionLogs();
    setHistory(logs.slice(-10).reverse());
  };

  const runSimulation = async () => {
    if (!waveParams) return;

    setIsSimulating(true);

    try {
      const simulationResult = await waveEngine.runExtremeConditionSimulation(
        waveParams,
        stormIntensity
      );

      const protection = await waveEngine.calculateShoreProtectionEffectiveness(
        simulationResult.waveParams,
        structureConfig.height,
        structureConfig.width,
        structureConfig.type
      );

      setResult(protection);

      await waveCacheDB.addShoreProtectionLog({
        timestamp: Date.now(),
        structureType: structureConfig.type,
        structureHeight: structureConfig.height,
        structureWidth: structureConfig.width,
        protectionIndex: protection.protectionIndex,
        waveConditions: {
          waveHeight: simulationResult.waveParams.waveHeight,
          wavePeriod: simulationResult.waveParams.wavePeriod,
        },
        stormIntensity,
      });

      await loadHistory();
    } catch (error) {
      console.error("Simulation error:", error);
    } finally {
      setIsSimulating(false);
    }
  };

  const getStructureName = (type: string) => {
    const names: Record<string, string> = {
      seawall: "海堤",
      breakwater: "防波堤",
      revetment: "护岸",
    };
    return names[type] || type;
  };

  const getRiskLevel = (index: number) => {
    if (index >= 0.8) return { label: "优秀", color: "#22c55e" };
    if (index >= 0.6) return { label: "良好", color: "#3b82f6" };
    if (index >= 0.4) return { label: "中等", color: "#f59e0b" };
    return { label: "危险", color: "#ef4444" };
  };

  return (
    <div style={{ padding: "20px", background: "#1e293b", borderRadius: "12px" }}>
      <h3 style={{ color: "#f8fafc", marginBottom: "20px", fontSize: "18px" }}>
        护岸工程防御模拟
      </h3>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
        <div>
          <h4 style={{ color: "#94a3b8", marginBottom: "15px", fontSize: "14px" }}>
            波浪条件
          </h4>
          
          <div style={{ marginBottom: "15px" }}>
            <label style={{ display: "block", color: "#cbd5e1", marginBottom: "5px", fontSize: "12px" }}>
              波高: {waveParams?.waveHeight.toFixed(2) || 0} m
            </label>
            <input
              type="range"
              min="0.5"
              max="8"
              step="0.1"
              value={waveParams?.waveHeight || 3}
              onChange={async (e) => {
                const height = parseFloat(e.target.value);
                if (waveParams) {
                  const params = await waveEngine.calculateWaveParameters(
                    height,
                    waveParams.wavePeriod,
                    waveParams.waterDepth
                  );
                  setWaveParams(params);
                }
              }}
              style={{ width: "100%" }}
            />
          </div>

          <div style={{ marginBottom: "15px" }}>
            <label style={{ display: "block", color: "#cbd5e1", marginBottom: "5px", fontSize: "12px" }}>
              周期: {waveParams?.wavePeriod.toFixed(2) || 0} s
            </label>
            <input
              type="range"
              min="3"
              max="20"
              step="0.5"
              value={waveParams?.wavePeriod || 8}
              onChange={async (e) => {
                const period = parseFloat(e.target.value);
                if (waveParams) {
                  const params = await waveEngine.calculateWaveParameters(
                    waveParams.waveHeight,
                    period,
                    waveParams.waterDepth
                  );
                  setWaveParams(params);
                }
              }}
              style={{ width: "100%" }}
            />
          </div>

          <div style={{ marginBottom: "15px" }}>
            <label style={{ display: "block", color: "#cbd5e1", marginBottom: "5px", fontSize: "12px" }}>
              风暴强度: {stormIntensity.toFixed(1)}
            </label>
            <input
              type="range"
              min="0"
              max="2"
              step="0.1"
              value={stormIntensity}
              onChange={(e) => setStormIntensity(parseFloat(e.target.value))}
              style={{ width: "100%" }}
            />
          </div>

          <h4 style={{ color: "#94a3b8", margin: "20px 0 15px", fontSize: "14px" }}>
            护岸结构
          </h4>

          <div style={{ marginBottom: "15px" }}>
            <label style={{ display: "block", color: "#cbd5e1", marginBottom: "5px", fontSize: "12px" }}>
              结构类型
            </label>
            <select
              value={structureConfig.type}
              onChange={(e) =>
                setStructureConfig({
                  ...structureConfig,
                  type: e.target.value as any,
                })
              }
              style={{
                width: "100%",
                padding: "8px",
                borderRadius: "6px",
                background: "#334155",
                color: "#f8fafc",
                border: "none",
              }}
            >
              <option value="seawall">海堤</option>
              <option value="breakwater">防波堤</option>
              <option value="revetment">护岸</option>
            </select>
          </div>

          <div style={{ marginBottom: "15px" }}>
            <label style={{ display: "block", color: "#cbd5e1", marginBottom: "5px", fontSize: "12px" }}>
              结构高度: {structureConfig.height} m
            </label>
            <input
              type="range"
              min="2"
              max="20"
              step="0.5"
              value={structureConfig.height}
              onChange={(e) =>
                setStructureConfig({
                  ...structureConfig,
                  height: parseFloat(e.target.value),
                })
              }
              style={{ width: "100%" }}
            />
          </div>

          <div style={{ marginBottom: "15px" }}>
            <label style={{ display: "block", color: "#cbd5e1", marginBottom: "5px", fontSize: "12px" }}>
              结构宽度: {structureConfig.width} m
            </label>
            <input
              type="range"
              min="5"
              max="100"
              step="1"
              value={structureConfig.width}
              onChange={(e) =>
                setStructureConfig({
                  ...structureConfig,
                  width: parseFloat(e.target.value),
                })
              }
              style={{ width: "100%" }}
            />
          </div>
        </div>

        <div>
          <h4 style={{ color: "#94a3b8", marginBottom: "15px", fontSize: "14px" }}>
            模拟结果
          </h4>

          {isSimulating ? (
            <div style={{ color: "#94a3b8", textAlign: "center", padding: "40px" }}>
              正在模拟极端工况...
            </div>
          ) : result ? (
            <div>
              <div
                style={{
                  background: `linear-gradient(135deg, ${getRiskLevel(result.protectionIndex).color}20, ${getRiskLevel(result.protectionIndex).color}40)`,
                  borderRadius: "12px",
                  padding: "20px",
                  marginBottom: "20px",
                  textAlign: "center",
                  border: `2px solid ${getRiskLevel(result.protectionIndex).color}`,
                }}
              >
                <div style={{ color: "#94a3b8", fontSize: "12px", marginBottom: "5px" }}>
                  防御指数
                </div>
                <div
                  style={{
                    fontSize: "48px",
                    fontWeight: "bold",
                    color: getRiskLevel(result.protectionIndex).color,
                  }}
                >
                  {(result.protectionIndex * 100).toFixed(1)}%
                </div>
                <div
                  style={{
                    color: getRiskLevel(result.protectionIndex).color,
                    fontSize: "14px",
                    marginTop: "5px",
                  }}
                >
                  {getRiskLevel(result.protectionIndex).label}
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                <div
                  style={{
                    background: "#334155",
                    borderRadius: "8px",
                    padding: "15px",
                    textAlign: "center",
                  }}
                >
                  <div style={{ color: "#94a3b8", fontSize: "11px", marginBottom: "5px" }}>
                    波浪透射率
                  </div>
                  <div style={{ color: "#f8fafc", fontSize: "20px", fontWeight: "bold" }}>
                    {(result.waveTransmission * 100).toFixed(1)}%
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
                    能量消散率
                  </div>
                  <div style={{ color: "#f8fafc", fontSize: "20px", fontWeight: "bold" }}>
                    {(result.energyDissipation * 100).toFixed(1)}%
                  </div>
                </div>

                <div
                  style={{
                    background: "#334155",
                    borderRadius: "8px",
                    padding: "15px",
                    textAlign: "center",
                    gridColumn: "span 2",
                  }}
                >
                  <div style={{ color: "#94a3b8", fontSize: "11px", marginBottom: "5px" }}>
                    越浪率
                  </div>
                  <div style={{ color: "#f8fafc", fontSize: "20px", fontWeight: "bold" }}>
                    {result.overtoppingRate.toFixed(2)} W/m²
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          <h4 style={{ color: "#94a3b8", margin: "20px 0 15px", fontSize: "14px" }}>
            历史记录
          </h4>

          <div style={{ maxHeight: "200px", overflowY: "auto" }}>
            {history.map((item, index) => (
              <div
                key={index}
                style={{
                  background: "#334155",
                  borderRadius: "6px",
                  padding: "10px",
                  marginBottom: "8px",
                  fontSize: "12px",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ color: "#94a3b8" }}>
                    {getStructureName(item.structureType)}
                  </span>
                  <span
                    style={{
                      color: getRiskLevel(item.protectionIndex).color,
                      fontWeight: "bold",
                    }}
                  >
                    {(item.protectionIndex * 100).toFixed(1)}%
                  </span>
                </div>
                <div style={{ color: "#64748b", marginTop: "4px" }}>
                  H={item.waveConditions.waveHeight.toFixed(1)}m | T=
                  {item.waveConditions.wavePeriod.toFixed(1)}s
                  {item.stormIntensity > 0 && ` | 风暴${item.stormIntensity.toFixed(1)}x`}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
