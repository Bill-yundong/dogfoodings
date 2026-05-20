import { Component, onCleanup, onMount, createSignal } from 'solid-js';
import { Play, Pause, RotateCcw, Save, Download, Settings, Eye, EyeOff, Thermometer, Gauge, Zap, AlertTriangle, Clock, Database } from 'lucide-solid';
import FluidCanvas from '@/components/FluidCanvas';
import { useSimulationStore } from '@/stores/simulationStore';
import { useAppStore } from '@/stores/appStore';
import { LBMFluidEngine, LBMStepResult } from '@/engine/lbmEngine';
import { DefectPredictionEngine, getDefectTypeName, getDefectTypeColor } from '@/engine/defectEngine';
import { createSnapshot } from '@/db/snapshot';
import { createParameterSet } from '@/db/parameterSet';
import { bulkCreateDefects } from '@/db/defect';
import type { ParameterSet } from '@/types';

const SimulationWorkbench: Component = () => {
  const { state: simState, setState: setSimState, reset } = useSimulationStore();
  const { state: appState } = useAppStore();

  const [engine, setEngine] = createSignal<LBMFluidEngine | null>(null);
  const [defectEngine, setDefectEngine] = createSignal<DefectPredictionEngine | null>(null);
  const [showVectors, setShowVectors] = createSignal(false);
  const [visualMode, setVisualMode] = createSignal<'density' | 'pressure' | 'temperature'>('density');
  const [currentSnapshotId, setCurrentSnapshotId] = createSignal<string | null>(null);
  const [snapshotInterval, setSnapshotInterval] = createSignal(100);
  const [params, setParams] = createSignal<ParameterSet>({
    id: '',
    simulationId: '',
    meltTemperature: 220,
    moldTemperature: 80,
    injectionSpeed: 1.0,
    packingPressure: 80,
    packingTime: 5,
    coolingTime: 15,
    viscosity: 100,
    surfaceTension: 0.03,
    createdAt: Date.now(),
  });

  let animationFrameId: number | null = null;
  let lastTime = 0;
  let frameCount = 0;
  let lastFpsUpdate = 0;
  let lastSnapshotStep = 0;
  let lastResult: LBMStepResult | null = null;

  onMount(() => {
    initEngines();
  });

  onCleanup(() => {
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
    }
  });

  const initEngines = () => {
    if (!simState.geometry) return;

    const lbmEngine = new LBMFluidEngine(simState.config, simState.geometry);
    const defectPredEngine = new DefectPredictionEngine(
      simState.config.gridWidth,
      simState.config.gridHeight,
      lbmEngine.getMask()
    );

    setEngine(lbmEngine);
    setDefectEngine(defectPredEngine);
  };

  const startSimulation = () => {
    if (!engine()) return;

    setSimState('isRunning', true);
    setSimState('isPaused', false);
    lastTime = performance.now();
    frameCount = 0;
    runSimulation();
  };

  const pauseSimulation = () => {
    setSimState('isPaused', true);
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
    }
  };

  const resumeSimulation = () => {
    setSimState('isPaused', false);
    lastTime = performance.now();
    runSimulation();
  };

  const resetSimulation = () => {
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
    }
    reset();
    if (engine()) {
      engine()!.reset();
    }
    setCurrentSnapshotId(null);
    lastSnapshotStep = 0;
    lastResult = null;
  };

  const runSimulation = () => {
    if (!engine() || simState.isPaused) return;

    const now = performance.now();
    const deltaTime = now - lastTime;

    if (deltaTime >= 16) {
      const result = engine()!.step();
      lastResult = result;
      updateSimulationState(result);

      frameCount++;
      if (now - lastFpsUpdate >= 1000) {
        setSimState('fps', Math.round((frameCount * 1000) / (now - lastFpsUpdate)));
        frameCount = 0;
        lastFpsUpdate = now;
      }

      if (result.step - lastSnapshotStep >= snapshotInterval()) {
        saveSnapshot(result);
        lastSnapshotStep = result.step;
      }

      lastTime = now;

      if (result.fillPercentage < 99.9 && result.step < simState.config.maxSteps) {
        animationFrameId = requestAnimationFrame(runSimulation);
      } else {
        setSimState('isRunning', false);
        saveSnapshot(result);
      }
    } else {
      animationFrameId = requestAnimationFrame(runSimulation);
    }
  };

  const updateSimulationState = (result: LBMStepResult) => {
    setSimState('currentStep', result.step);
    setSimState('fillPercentage', result.fillPercentage);
    setSimState('flowField', {
      density: result.density,
      velocityX: result.velocityX,
      velocityY: result.velocityY,
      pressure: result.pressure,
      temperature: result.temperature,
    });

    const maxPressure = Math.max(...result.pressure);
    setSimState('maxPressure', maxPressure);

    const temps: number[] = [];
    for (let i = 0; i < result.temperature.length; i++) {
      if (result.density[i] > 0.1) {
        temps.push(result.temperature[i]);
      }
    }
    const avgTemp = temps.length > 0 ? temps.reduce((a, b) => a + b, 0) / temps.length : simState.avgTemperature;
    setSimState('avgTemperature', avgTemp);

    if (defectEngine() && result.step % 50 === 0) {
      const snapshotId = currentSnapshotId() || `temp-${result.step}`;
      const defects = defectEngine()!.detectDefects(
        {
          density: result.density,
          velocityX: result.velocityX,
          velocityY: result.velocityY,
          pressure: result.pressure,
          temperature: result.temperature,
        },
        result.fillPercentage,
        result.step,
        snapshotId
      );
      setSimState('defects', defects);
    }
  };

  const saveSnapshot = async (result: LBMStepResult) => {
    try {
      let paramSetId = '';
      if (appState.currentSimulation) {
        const paramSet = await createParameterSet({
          ...params(),
          simulationId: appState.currentSimulation.id,
        });
        paramSetId = paramSet.id;
      }

      const snapshot = await createSnapshot({
        simulationId: appState.currentSimulation?.id || 'demo',
        parameterSetId: paramSetId || 'demo',
        version: Math.floor(result.step / snapshotInterval()) + 1,
        step: result.step,
        fillTime: result.step * simState.config.timeStep,
        fillPercentage: result.fillPercentage,
        maxPressure: Math.max(...result.pressure),
        avgTemperature: simState.avgTemperature,
        flowFrontData: result.flowFront,
        pressureWaveData: [],
      });

      setCurrentSnapshotId(snapshot.id);

      if (defectEngine()) {
        const defects = defectEngine()!.detectDefects(
          {
            density: result.density,
            velocityX: result.velocityX,
            velocityY: result.velocityY,
            pressure: result.pressure,
            temperature: result.temperature,
          },
          result.fillPercentage,
          result.step,
          snapshot.id
        );
        await bulkCreateDefects(defects);
        setSimState('defects', defects);
      }
    } catch (error) {
      console.error('Failed to save snapshot:', error);
    }
  };

  const updateParameter = (key: keyof ParameterSet, value: number) => {
    const newParams = { ...params(), [key]: value };
    setParams(newParams);

    if (engine()) {
      engine()!.setParameters({
        meltTemperature: newParams.meltTemperature,
        moldTemperature: newParams.moldTemperature,
        injectionSpeed: newParams.injectionSpeed,
      });
    }
  };

  const defectStats = () => {
    const stats: Record<string, { count: number; maxSeverity: number }> = {};
    for (const defect of simState.defects) {
      if (!stats[defect.type]) {
        stats[defect.type] = { count: 0, maxSeverity: 0 };
      }
      stats[defect.type].count++;
      stats[defect.type].maxSeverity = Math.max(stats[defect.type].maxSeverity, defect.severity);
    }
    return stats;
  };

  return (
    <div class="h-[calc(100vh-56px-48px)] flex flex-col gap-4">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold text-gray-100">充填动力学模拟工作台</h1>
          <p class="text-sm text-gray-400 mt-1">实时模拟熔料充填过程，预测成型缺陷</p>
        </div>
        <div class="flex items-center gap-3">
          <button
            onClick={() => {
              if (!simState.isRunning) {
                startSimulation();
              } else if (simState.isPaused) {
                resumeSimulation();
              } else {
                pauseSimulation();
              }
            }}
            class={`btn ${simState.isRunning && !simState.isPaused ? 'btn-secondary' : 'btn-primary'}`}
          >
            {simState.isRunning && !simState.isPaused ? (
              <><Pause class="w-4 h-4" /> 暂停</>
            ) : (
              <><Play class="w-4 h-4" /> {simState.isPaused ? '继续' : '开始模拟'}</>
            )}
          </button>
          <button onClick={resetSimulation} class="btn btn-secondary">
            <RotateCcw class="w-4 h-4" /> 重置
          </button>
          <button 
            onClick={() => lastResult && saveSnapshot(lastResult)}
            class="btn btn-secondary"
          >
            <Save class="w-4 h-4" /> 保存快照
          </button>
          <button 
            onClick={() => alert('导出数据功能开发中...')}
            class="btn btn-secondary"
          >
            <Download class="w-4 h-4" /> 导出数据
          </button>
        </div>
      </div>

      <div class="flex-1 flex gap-4 min-h-0">
        <div class="flex-1 flex flex-col gap-4 min-w-0">
          <div class="panel flex-1 min-h-0">
            <div class="panel-header">
              <span class="panel-title">充填过程可视化</span>
              <div class="flex items-center gap-2">
                <div class="flex bg-dark-100 rounded p-0.5">
                  <button
                    onClick={() => setVisualMode('density')}
                    class={`px-3 py-1 text-xs rounded transition-colors ${visualMode() === 'density' ? 'bg-primary-600 text-white' : 'text-gray-400 hover:text-gray-200'}`}
                  >
                    密度
                  </button>
                  <button
                    onClick={() => setVisualMode('pressure')}
                    class={`px-3 py-1 text-xs rounded transition-colors ${visualMode() === 'pressure' ? 'bg-primary-600 text-white' : 'text-gray-400 hover:text-gray-200'}`}
                  >
                    压力
                  </button>
                  <button
                    onClick={() => setVisualMode('temperature')}
                    class={`px-3 py-1 text-xs rounded transition-colors ${visualMode() === 'temperature' ? 'bg-primary-600 text-white' : 'text-gray-400 hover:text-gray-200'}`}
                  >
                    温度
                  </button>
                </div>
                <button
                  onClick={() => setShowVectors(!showVectors())}
                  class={`p-1.5 rounded transition-colors ${showVectors() ? 'bg-primary-600 text-white' : 'text-gray-400 hover:text-gray-200'}`}
                >
                  {showVectors() ? <Eye class="w-4 h-4" /> : <EyeOff class="w-4 h-4" />}
                </button>
                <button class="p-1.5 text-gray-400 hover:text-gray-200 rounded transition-colors">
                  <Settings class="w-4 h-4" />
                </button>
              </div>
            </div>
            <div class="h-[calc(100%-48px)] p-4">
              {simState.geometry && (
                <FluidCanvas
                  width={simState.config.gridWidth}
                  height={simState.config.gridHeight}
                  geometry={simState.geometry}
                  flowField={simState.flowField}
                  defects={simState.defects}
                  pressureWaves={simState.pressureWaves}
                  showVectors={showVectors()}
                  showPressure={visualMode() === 'pressure'}
                  showTemperature={visualMode() === 'temperature'}
                  cellSize={6}
                />
              )}
            </div>
          </div>

          <div class="panel">
            <div class="panel-content py-3">
              <div class="grid grid-cols-6 gap-4">
                <div class="flex items-center gap-3">
                  <div class="w-10 h-10 rounded-lg bg-accent-cyan/20 flex items-center justify-center">
                    <Zap class="w-5 h-5 text-accent-cyan" />
                  </div>
                  <div>
                    <p class="text-xs text-gray-500">步数</p>
                    <p class="text-lg font-mono font-bold text-gray-100">{simState.currentStep}</p>
                  </div>
                </div>
                <div class="flex items-center gap-3">
                  <div class="w-10 h-10 rounded-lg bg-accent-green/20 flex items-center justify-center">
                    <Gauge class="w-5 h-5 text-accent-green" />
                  </div>
                  <div>
                    <p class="text-xs text-gray-500">充填率</p>
                    <p class="text-lg font-mono font-bold text-gray-100">{simState.fillPercentage.toFixed(1)}%</p>
                  </div>
                </div>
                <div class="flex items-center gap-3">
                  <div class="w-10 h-10 rounded-lg bg-accent-orange/20 flex items-center justify-center">
                    <Gauge class="w-5 h-5 text-accent-orange" />
                  </div>
                  <div>
                    <p class="text-xs text-gray-500">最大压力</p>
                    <p class="text-lg font-mono font-bold text-gray-100">{simState.maxPressure.toFixed(3)}</p>
                  </div>
                </div>
                <div class="flex items-center gap-3">
                  <div class="w-10 h-10 rounded-lg bg-accent-red/20 flex items-center justify-center">
                    <Thermometer class="w-5 h-5 text-accent-red" />
                  </div>
                  <div>
                    <p class="text-xs text-gray-500">平均温度</p>
                    <p class="text-lg font-mono font-bold text-gray-100">{simState.avgTemperature.toFixed(1)}°C</p>
                  </div>
                </div>
                <div class="flex items-center gap-3">
                  <div class="w-10 h-10 rounded-lg bg-primary-500/20 flex items-center justify-center">
                    <Clock class="w-5 h-5 text-primary-400" />
                  </div>
                  <div>
                    <p class="text-xs text-gray-500">FPS</p>
                    <p class="text-lg font-mono font-bold text-gray-100">{simState.fps}</p>
                  </div>
                </div>
                <div class="flex items-center gap-3">
                  <div class="w-10 h-10 rounded-lg bg-accent-yellow/20 flex items-center justify-center">
                    <AlertTriangle class="w-5 h-5 text-accent-yellow" />
                  </div>
                  <div>
                    <p class="text-xs text-gray-500">缺陷数</p>
                    <p class="text-lg font-mono font-bold text-gray-100">{simState.defects.length}</p>
                  </div>
                </div>
              </div>

              <div class="mt-4">
                <div class="flex justify-between text-xs text-gray-500 mb-1">
                  <span>充填进度</span>
                  <span>{simState.fillPercentage.toFixed(1)}% - 估计剩余时间: {Math.max(0, Math.round((100 - simState.fillPercentage) / 10 * simState.config.timeStep * 100))}s</span>
                </div>
                <div class="h-2 bg-dark-100 rounded-full overflow-hidden">
                  <div
                    class="h-full bg-gradient-to-r from-accent-cyan to-primary-500 transition-all duration-300"
                    style={{ width: `${simState.fillPercentage}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="w-80 flex flex-col gap-4 flex-shrink-0">
          <div class="panel">
            <div class="panel-header">
              <span class="panel-title">工艺参数</span>
            </div>
            <div class="panel-content space-y-4">
              <div>
                <label class="flex justify-between text-sm text-gray-300 mb-1.5">
                  <span class="flex items-center gap-1.5"><Thermometer class="w-3.5 h-3.5 text-accent-red" /> 熔体温度</span>
                  <span class="font-mono">{params().meltTemperature}°C</span>
                </label>
                <input
                  type="range"
                  min="180"
                  max="300"
                  value={params().meltTemperature}
                  onInput={(e) => updateParameter('meltTemperature', Number(e.target.value))}
                  class="slider"
                />
              </div>
              <div>
                <label class="flex justify-between text-sm text-gray-300 mb-1.5">
                  <span class="flex items-center gap-1.5"><Thermometer class="w-3.5 h-3.5 text-accent-cyan" /> 模具温度</span>
                  <span class="font-mono">{params().moldTemperature}°C</span>
                </label>
                <input
                  type="range"
                  min="40"
                  max="120"
                  value={params().moldTemperature}
                  onInput={(e) => updateParameter('moldTemperature', Number(e.target.value))}
                  class="slider"
                />
              </div>
              <div>
                <label class="flex justify-between text-sm text-gray-300 mb-1.5">
                  <span class="flex items-center gap-1.5"><Zap class="w-3.5 h-3.5 text-accent-yellow" /> 注射速度</span>
                  <span class="font-mono">{params().injectionSpeed.toFixed(1)} m/s</span>
                </label>
                <input
                  type="range"
                  min="0.1"
                  max="3"
                  step="0.1"
                  value={params().injectionSpeed}
                  onInput={(e) => updateParameter('injectionSpeed', Number(e.target.value))}
                  class="slider"
                />
              </div>
              <div>
                <label class="flex justify-between text-sm text-gray-300 mb-1.5">
                  <span class="flex items-center gap-1.5"><Gauge class="w-3.5 h-3.5 text-accent-orange" /> 保压压力</span>
                  <span class="font-mono">{params().packingPressure} MPa</span>
                </label>
                <input
                  type="range"
                  min="20"
                  max="150"
                  value={params().packingPressure}
                  onInput={(e) => updateParameter('packingPressure', Number(e.target.value))}
                  class="slider"
                />
              </div>
              <div>
                <label class="flex justify-between text-sm text-gray-300 mb-1.5">
                  <span class="flex items-center gap-1.5"><Clock class="w-3.5 h-3.5 text-primary-400" /> 保压时间</span>
                  <span class="font-mono">{params().packingTime} s</span>
                </label>
                <input
                  type="range"
                  min="1"
                  max="20"
                  value={params().packingTime}
                  onInput={(e) => updateParameter('packingTime', Number(e.target.value))}
                  class="slider"
                />
              </div>
              <div>
                <label class="flex justify-between text-sm text-gray-300 mb-1.5">
                  <span class="flex items-center gap-1.5"><Clock class="w-3.5 h-3.5 text-accent-green" /> 冷却时间</span>
                  <span class="font-mono">{params().coolingTime} s</span>
                </label>
                <input
                  type="range"
                  min="5"
                  max="60"
                  value={params().coolingTime}
                  onInput={(e) => updateParameter('coolingTime', Number(e.target.value))}
                  class="slider"
                />
              </div>
              <div>
                <label class="flex justify-between text-sm text-gray-300 mb-1.5">
                  <span class="flex items-center gap-1.5"><Database class="w-3.5 h-3.5 text-gray-400" /> 快照间隔</span>
                  <span class="font-mono">{snapshotInterval()} 步</span>
                </label>
                <input
                  type="range"
                  min="10"
                  max="500"
                  step="10"
                  value={snapshotInterval()}
                  onInput={(e) => setSnapshotInterval(Number(e.target.value))}
                  class="slider"
                />
              </div>
            </div>
          </div>

          <div class="panel flex-1 min-h-0 overflow-hidden">
            <div class="panel-header">
              <span class="panel-title">缺陷检测</span>
              <span class="badge badge-danger">{simState.defects.length} 个</span>
            </div>
            <div class="panel-content overflow-y-auto h-[calc(100%-48px)]">
              {simState.defects.length === 0 ? (
                <div class="text-center py-8 text-gray-500">
                  <AlertTriangle class="w-12 h-12 mx-auto mb-2 opacity-30" />
                  <p class="text-sm">暂无检测到缺陷</p>
                </div>
              ) : (
                <div class="space-y-3">
                  {Object.entries(defectStats()).map(([type, stats]) => (
                    <div class="bg-dark-100 rounded-lg p-3">
                      <div class="flex items-center justify-between mb-2">
                        <div class="flex items-center gap-2">
                          <div class="w-3 h-3 rounded-full" style={{ 'background-color': getDefectTypeColor(type as any) }} />
                          <span class="text-sm font-medium text-gray-200">{getDefectTypeName(type as any)}</span>
                        </div>
                        <span class="badge badge-danger">{stats.count}</span>
                      </div>
                      <div class="text-xs text-gray-400">
                        最高严重度: {(stats.maxSeverity * 100).toFixed(0)}%
                      </div>
                      <div class="mt-2 h-1.5 bg-dark-300 rounded-full overflow-hidden">
                        <div
                          class="h-full rounded-full"
                          style={{
                            width: `${stats.maxSeverity * 100}%`,
                            'background-color': getDefectTypeColor(type as any),
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {simState.defects.length > 0 && (
                <div class="mt-4">
                  <h4 class="text-xs font-medium text-gray-400 mb-2">缺陷列表</h4>
                  <div class="space-y-2 max-h-48 overflow-y-auto">
                    {simState.defects.slice(0, 10).map((defect) => (
                      <div class="flex items-center justify-between p-2 bg-dark-100 rounded text-xs">
                        <div class="flex items-center gap-2">
                          <div class="w-2 h-2 rounded-full" style={{ 'background-color': getDefectTypeColor(defect.type) }} />
                          <span class="text-gray-300">{getDefectTypeName(defect.type)}</span>
                        </div>
                        <div class="flex items-center gap-2">
                          <span class="text-gray-500">({defect.position.x}, {defect.position.y})</span>
                          <span class="font-mono text-accent-yellow">{(defect.severity * 100).toFixed(0)}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SimulationWorkbench;
