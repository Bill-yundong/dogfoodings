import { Play, Pause, RotateCcw, Settings, Sun, Zap, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSimulationStore } from '@/store/useSimulationStore';
import { formatDateTime, formatTime } from '@/utils/solar';

export function SimulationControls() {
  const {
    simulationState,
    solarPosition,
    lastTraceDuration,
    isWorkerReady,
    config,
    toggleSimulation,
    togglePause,
    resetSimulation,
    setSimulationState,
    setConfig,
  } = useSimulationStore();
  
  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        className="absolute bottom-6 left-1/2 transform -translate-x-1/2 z-10"
      >
        <div className="bg-slate-900/90 backdrop-blur-md rounded-2xl border border-slate-700/50 p-4 shadow-2xl">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <button
                onClick={toggleSimulation}
                disabled={!isWorkerReady}
                className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300 ${
                  simulationState.isRunning
                    ? 'bg-orange-500 hover:bg-orange-600 text-white'
                    : 'bg-emerald-500 hover:bg-emerald-600 text-white'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {simulationState.isRunning ? <Pause size={20} /> : <Play size={20} />}
              </button>
              
              {simulationState.isRunning && (
                <button
                  onClick={togglePause}
                  className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300 ${
                    simulationState.isPaused
                      ? 'bg-emerald-500 hover:bg-emerald-600 text-white'
                      : 'bg-slate-700 hover:bg-slate-600 text-white'
                  }`}
                >
                  {simulationState.isPaused ? <Play size={20} /> : <Pause size={20} />}
                </button>
              )}
              
              <button
                onClick={resetSimulation}
                className="w-12 h-12 rounded-xl bg-slate-700 hover:bg-slate-600 text-white flex items-center justify-center transition-all duration-300"
              >
                <RotateCcw size={20} />
              </button>
            </div>
            
            <div className="h-12 w-px bg-slate-700" />
            
            <div className="flex items-center gap-4">
              <div className="text-center">
                <div className="text-xs text-slate-400 mb-1">时间</div>
                <div className="font-mono text-sm text-cyan-400">
                  {formatDateTime(simulationState.currentTime)}
                </div>
              </div>
              
              {solarPosition && (
                <>
                  <div className="text-center">
                    <div className="text-xs text-slate-400 mb-1 flex items-center gap-1">
                      <Sun size={12} /> 高度角
                    </div>
                    <div className="font-mono text-sm text-yellow-400">
                      {solarPosition.altitude.toFixed(1)}°
                    </div>
                  </div>
                  
                  <div className="text-center">
                    <div className="text-xs text-slate-400 mb-1">方位角</div>
                    <div className="font-mono text-sm text-yellow-400">
                      {solarPosition.azimuth.toFixed(1)}°
                    </div>
                  </div>
                </>
              )}
              
              <div className="text-center">
                <div className="text-xs text-slate-400 mb-1 flex items-center gap-1">
                  <Zap size={12} /> 计算耗时
                </div>
                <div className="font-mono text-sm text-emerald-400">
                  {lastTraceDuration.toFixed(0)}ms
                </div>
              </div>
            </div>
            
            <div className="h-12 w-px bg-slate-700" />
            
            <div className="flex items-center gap-3">
              <div>
                <div className="text-xs text-slate-400 mb-1">速度</div>
                <select
                  value={simulationState.speed}
                  onChange={(e) => setSimulationState({ speed: Number(e.target.value) })}
                  className="bg-slate-800 border border-slate-600 rounded-lg px-2 py-1 text-sm text-white focus:outline-none focus:border-cyan-500"
                >
                  <option value={0.5}>0.5x</option>
                  <option value={1}>1x</option>
                  <option value={5}>5x</option>
                  <option value={10}>10x</option>
                  <option value={30}>30x</option>
                  <option value={60}>60x</option>
                </select>
              </div>
              
              <div>
                <div className="text-xs text-slate-400 mb-1">质量</div>
                <select
                  value={simulationState.quality}
                  onChange={(e) => setSimulationState({ quality: e.target.value as any })}
                  className="bg-slate-800 border border-slate-600 rounded-lg px-2 py-1 text-sm text-white focus:outline-none focus:border-cyan-500"
                >
                  <option value="low">低</option>
                  <option value="medium">中</option>
                  <option value="high">高</option>
                  <option value="ultra">超高</option>
                </select>
              </div>
              
              <div>
                <div className="text-xs text-slate-400 mb-1">环境温度</div>
                <input
                  type="number"
                  value={config.ambientTemperature}
                  onChange={(e) => setConfig({ ambientTemperature: Number(e.target.value) })}
                  className="w-16 bg-slate-800 border border-slate-600 rounded-lg px-2 py-1 text-sm text-white focus:outline-none focus:border-cyan-500"
                  min={-20}
                  max={50}
                  step={1}
                />
                <span className="text-slate-400 ml-1">°C</span>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSimulationState({ autoRotate: !simulationState.autoRotate })}
                className={`px-3 py-2 rounded-lg text-sm transition-all ${
                  simulationState.autoRotate
                    ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/50'
                    : 'bg-slate-800 text-slate-400 border border-slate-600 hover:border-slate-500'
                }`}
              >
                自动旋转
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
