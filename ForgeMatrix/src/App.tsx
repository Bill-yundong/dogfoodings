import React, { useState, useEffect, useCallback } from 'react';
import { TemperatureHeatmap } from './components/TemperatureHeatmap';
import { CoolingRateChart } from './components/CoolingRateChart';
import { StressDistribution3D } from './components/StressDistribution3D';
import { BatchList } from './components/BatchList';
import { QualityInspection } from './components/QualityInspection';
import { db } from './database/indexedDB';
import { dataLinkService } from './services/DataLinkService';
import { AsyncHeatConductionModel } from './models/HeatConductionModel';
import { ForgingBatch, TemperaturePoint, QualityData, ProcessParams } from './types';

const DEFAULT_PARAMS: ProcessParams = {
  materialConductivity: 50,
  density: 7850,
  specificHeat: 450,
  ambientTemperature: 25,
  convectionCoefficient: 100,
  timeStep: 1,
  gridSize: 10
};

export const App: React.FC = () => {
  const [batches, setBatches] = useState<ForgingBatch[]>([]);
  const [selectedBatch, setSelectedBatch] = useState<ForgingBatch | null>(null);
  const [qualityData, setQualityData] = useState<QualityData | undefined>();
  const [heatModel, setHeatModel] = useState<AsyncHeatConductionModel | null>(null);
  const [temperatureField, setTemperatureField] = useState<TemperaturePoint[][]>([]);
  const [chartData, setChartData] = useState<Array<{ time: number; coolingRate: number; temperature: number }>>([]);
  const [isSimulating, setIsSimulating] = useState(false);
  const [activeTab, setActiveTab] = useState<'temperature' | 'stress' | 'quality'>('temperature');
  const [offlineSummary, setOfflineSummary] = useState({ totalBatches: 0, totalSnapshots: 0, offlineBatches: 0 });
  const [simulationTime, setSimulationTime] = useState(0);

  useEffect(() => {
    const init = async () => {
      await db.init();
      const model = new AsyncHeatConductionModel(DEFAULT_PARAMS);
      setHeatModel(model);
      loadBatches();
      loadOfflineSummary();
    };
    init();
  }, []);

  useEffect(() => {
    dataLinkService.initModel(DEFAULT_PARAMS);
  }, []);

  const loadBatches = async () => {
    const allBatches = await db.getAllBatches();
    setBatches(allBatches.sort((a, b) => b.startTime - a.startTime));
  };

  const loadOfflineSummary = async () => {
    const summary = await db.getOfflineDataSummary();
    setOfflineSummary(summary);
  };

  const handleSelectBatch = async (batch: ForgingBatch) => {
    setSelectedBatch(batch);
    const quality = await db.getQualityData(batch.id);
    setQualityData(quality);

    const snapshots = await db.getSnapshotsByBatch(batch.id);
    const chartDataMapped = snapshots.map((s, i) => ({
      time: i * DEFAULT_PARAMS.timeStep,
      coolingRate: s.coolingRate,
      temperature: s.averageTemperature
    }));
    setChartData(chartDataMapped);

    if (batch.predictedStress) {
      setActiveTab('stress');
    }
  };

  const createNewBatch = async () => {
    const partNumber = `PART-${Date.now().toString().slice(-6)}`;
    const batchId = await db.createBatch({
      partNumber,
      startTime: Date.now(),
      material: '42CrMo',
      initialTemperature: 1150,
      targetCoolingRate: 25,
      status: 'ongoing',
      snapshots: []
    });

    await loadBatches();
    const newBatch = await db.getBatch(batchId);
    if (newBatch) {
      setSelectedBatch(newBatch);
      setChartData([]);
      setSimulationTime(0);
      
      if (heatModel) {
        heatModel.setInitialTemperature(1150);
        const field = heatModel.getTemperatureSlice();
        setTemperatureField(field);
      }
    }
  };

  const runSimulationStep = useCallback(async () => {
    if (!heatModel || !selectedBatch || selectedBatch.status !== 'ongoing') return;

    setIsSimulating(true);
    const newField = await heatModel.simulateStepAsync();
    setTemperatureField(newField);

    const allTemps = heatModel.getAllTemperatures().map(p => p.temperature);
    const avgTemp = allTemps.reduce((a, b) => a + b, 0) / allTemps.length;

    const prevTemp = chartData.length > 0 
      ? chartData[chartData.length - 1].temperature 
      : selectedBatch.initialTemperature;
    
    const coolingRate = heatModel.calculateCoolingRate(prevTemp, avgTemp);

    setSimulationTime(prev => prev + DEFAULT_PARAMS.timeStep);
    setChartData(prev => [...prev, {
      time: simulationTime + DEFAULT_PARAMS.timeStep,
      coolingRate,
      temperature: avgTemp
    }]);

    await dataLinkService.processCoolingSnapshot(selectedBatch, allTemps, prevTemp);
    await loadBatches();
    setIsSimulating(false);
  }, [heatModel, selectedBatch, chartData, simulationTime]);

  const predictStress = async () => {
    if (!selectedBatch) return;
    await dataLinkService.predictStressForBatch(selectedBatch.id);
    await loadBatches();
    const updated = await db.getBatch(selectedBatch.id);
    if (updated) {
      setSelectedBatch(updated);
      setActiveTab('stress');
    }
  };

  const handleQualitySubmit = async (quality: QualityData) => {
    await dataLinkService.sendQualityFeedback(quality.batchId, quality);
    setQualityData(quality);
    await dataLinkService.closeOfflineLoop(quality.batchId);
    await loadBatches();
    await loadOfflineSummary();
    
    const updated = await db.getBatch(quality.batchId);
    if (updated) {
      setSelectedBatch(updated);
    }
  };

  const clearAllData = async () => {
    if (window.confirm('确定要清除所有数据吗？此操作不可恢复。')) {
      await db.clearAllData();
      setBatches([]);
      setSelectedBatch(null);
      setQualityData(undefined);
      setChartData([]);
      setTemperatureField([]);
      await loadOfflineSummary();
    }
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f0f2f5' }}>
      <header style={{
        backgroundColor: '#1a237e',
        color: 'white',
        padding: '16px 24px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 24, fontWeight: 600 }}>
              ForgeMatrix
            </h1>
            <p style={{ margin: '4px 0 0 0', fontSize: 13, opacity: 0.8 }}>
              精密锻造温度场追踪与应力预测系统
            </p>
          </div>
          <div style={{ display: 'flex', gap: 16, fontSize: 13 }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 20, fontWeight: 600 }}>{offlineSummary.totalBatches}</div>
              <div style={{ opacity: 0.8 }}>总批次</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 20, fontWeight: 600 }}>{offlineSummary.totalSnapshots}</div>
              <div style={{ opacity: 0.8 }}>温度快照</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 20, fontWeight: 600 }}>{offlineSummary.offlineBatches}</div>
              <div style={{ opacity: 0.8 }}>已闭环</div>
            </div>
          </div>
        </div>
      </header>

      <div style={{ padding: 24, maxWidth: 1600, margin: '0 auto' }}>
        <div style={{ display: 'flex', gap: 16, marginBottom: 20 }}>
          <button
            onClick={createNewBatch}
            style={{
              padding: '10px 24px',
              backgroundColor: '#4caf50',
              color: 'white',
              border: 'none',
              borderRadius: 6,
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8
            }}
          >
            <span>+</span> 新建锻造批次
          </button>
          
          {selectedBatch && selectedBatch.status === 'ongoing' && (
            <>
              <button
                onClick={runSimulationStep}
                disabled={isSimulating}
                style={{
                  padding: '10px 24px',
                  backgroundColor: isSimulating ? '#9e9e9e' : '#2196f3',
                  color: 'white',
                  border: 'none',
                  borderRadius: 6,
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: isSimulating ? 'not-allowed' : 'pointer'
                }}
              >
                {isSimulating ? '模拟中...' : '运行冷却模拟'}
              </button>
              <button
                onClick={predictStress}
                style={{
                  padding: '10px 24px',
                  backgroundColor: '#ff9800',
                  color: 'white',
                  border: 'none',
                  borderRadius: 6,
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                预测应力分布
              </button>
            </>
          )}

          <button
            onClick={clearAllData}
            style={{
              padding: '10px 24px',
              backgroundColor: '#f44336',
              color: 'white',
              border: 'none',
              borderRadius: 6,
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
              marginLeft: 'auto'
            }}
          >
            清除所有数据
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 20 }}>
          <div>
            <div style={{
              backgroundColor: 'white',
              borderRadius: 8,
              padding: 16,
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
            }}>
              <h3 style={{ margin: '0 0 16px 0', fontSize: 16, color: '#333' }}>
                锻造批次列表
              </h3>
              <BatchList
                batches={batches}
                selectedBatchId={selectedBatch?.id || null}
                onSelectBatch={handleSelectBatch}
              />
            </div>
          </div>

          <div>
            {selectedBatch ? (
              <>
                <div style={{
                  backgroundColor: 'white',
                  borderRadius: 8,
                  padding: 20,
                  marginBottom: 20,
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <h2 style={{ margin: '0 0 8px 0', fontSize: 20, color: '#333' }}>
                        {selectedBatch.partNumber}
                      </h2>
                      <div style={{ fontSize: 14, color: '#666', display: 'flex', gap: 24 }}>
                        <span>材料: {selectedBatch.material}</span>
                        <span>初始温度: {selectedBatch.initialTemperature}°C</span>
                        <span>目标冷却速率: {selectedBatch.targetCoolingRate}°C/s</span>
                        <span>模拟时长: {simulationTime}s</span>
                      </div>
                    </div>
                    <span style={{
                      padding: '6px 16px',
                      borderRadius: 16,
                      backgroundColor: selectedBatch.status === 'ongoing' ? '#4caf50' : '#2196f3',
                      color: 'white',
                      fontSize: 13,
                      fontWeight: 600
                    }}>
                      {selectedBatch.status === 'ongoing' ? '冷却进行中' : '已完成'}
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                  {[
                    { key: 'temperature', label: '温度场' },
                    { key: 'stress', label: '应力分布' },
                    { key: 'quality', label: '质量检验' }
                  ].map(tab => (
                    <button
                      key={tab.key}
                      onClick={() => setActiveTab(tab.key as typeof activeTab)}
                      style={{
                        padding: '10px 20px',
                        backgroundColor: activeTab === tab.key ? '#1a237e' : '#e0e0e0',
                        color: activeTab === tab.key ? 'white' : '#666',
                        border: 'none',
                        borderRadius: 6,
                        fontSize: 14,
                        fontWeight: 600,
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                <div style={{
                  backgroundColor: 'white',
                  borderRadius: 8,
                  padding: 20,
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                }}>
                  {activeTab === 'temperature' && (
                    <div>
                      <h3 style={{ margin: '0 0 20px 0', fontSize: 16, color: '#333' }}>
                        温度场演化
                      </h3>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
                        <div>
                          <h4 style={{ margin: '0 0 16px 0', fontSize: 14, color: '#666' }}>
                            横截面温度分布
                          </h4>
                          {temperatureField.length > 0 ? (
                            <TemperatureHeatmap data={temperatureField} />
                          ) : (
                            <div style={{
                              width: 400,
                              height: 400,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              backgroundColor: '#f5f5f5',
                              borderRadius: 8,
                              color: '#999'
                            }}>
                              点击"运行冷却模拟"开始
                            </div>
                          )}
                        </div>
                        <div>
                          <h4 style={{ margin: '0 0 16px 0', fontSize: 14, color: '#666' }}>
                            冷却速率变化
                          </h4>
                          <CoolingRateChart
                            data={chartData}
                            targetRate={selectedBatch.targetCoolingRate}
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {activeTab === 'stress' && (
                    <div>
                      <h3 style={{ margin: '0 0 20px 0', fontSize: 16, color: '#333' }}>
                        应力分布预测
                      </h3>
                      {selectedBatch.predictedStress ? (
                        <StressDistribution3D
                          stressData={selectedBatch.predictedStress}
                          gridSize={DEFAULT_PARAMS.gridSize}
                        />
                      ) : (
                        <div style={{
                          height: 350,
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          backgroundColor: '#f5f5f5',
                          borderRadius: 8,
                          color: '#999'
                        }}>
                          <p style={{ marginBottom: 16 }}>暂无应力预测数据</p>
                          <button
                            onClick={predictStress}
                            style={{
                              padding: '10px 24px',
                              backgroundColor: '#ff9800',
                              color: 'white',
                              border: 'none',
                              borderRadius: 6,
                              fontSize: 14,
                              fontWeight: 600,
                              cursor: 'pointer'
                            }}
                          >
                            预测应力分布
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {activeTab === 'quality' && (
                    <div>
                      <h3 style={{ margin: '0 0 20px 0', fontSize: 16, color: '#333' }}>
                        质量检验与数据闭环
                      </h3>
                      <div style={{ maxWidth: 400 }}>
                        <QualityInspection
                          batchId={selectedBatch.id}
                          existingQuality={qualityData}
                          onSubmit={handleQualitySubmit}
                        />
                      </div>
                      {qualityData && (
                        <div style={{
                          marginTop: 20,
                          padding: 20,
                          backgroundColor: '#e8f5e9',
                          borderRadius: 8,
                          border: '1px solid #c8e6c9'
                        }}>
                          <h4 style={{ margin: '0 0 12px 0', color: '#2e7d32' }}>
                            ✅ 离线数据闭环完成
                          </h4>
                          <div style={{ fontSize: 13, color: '#388e3c', display: 'flex', gap: 24 }}>
                            <span>硬度: {qualityData.hardness} HRC</span>
                            <span>冷却速率偏差: {qualityData.coolingRateDeviation}%</span>
                            <span>质量评分: {selectedBatch.qualityScore?.toFixed(0) || 'N/A'}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div style={{
                backgroundColor: 'white',
                borderRadius: 8,
                padding: 60,
                textAlign: 'center',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
              }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>🔥</div>
                <h2 style={{ margin: '0 0 8px 0', fontSize: 20, color: '#333' }}>
                  欢迎使用 ForgeMatrix
                </h2>
                <p style={{ margin: 0, color: '#666' }}>
                  点击"新建锻造批次"开始精密锻造工艺的温度场追踪与应力预测
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
