import { X, Thermometer, Sun, Zap, TrendingDown, Activity } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSimulationStore } from '@/store/useSimulationStore';

export function PanelDetails() {
  const {
    selectedPanelId,
    setSelectedPanelId,
    panels,
    rayTracingResults,
    powerGenerations,
  } = useSimulationStore();
  
  const panel = panels.find((p) => p.id === selectedPanelId);
  const rayResult = rayTracingResults.find((r) => r.panelId === selectedPanelId);
  const generation = powerGenerations.find((g) => g.panelId === selectedPanelId);
  
  if (!selectedPanelId || !panel) return null;
  
  const statusColors = {
    normal: 'bg-emerald-500',
    degraded: 'bg-yellow-500',
    fault: 'bg-red-500',
  };
  
  const statusLabels = {
    normal: '正常',
    degraded: '性能衰减',
    fault: '故障',
  };
  
  return (
    <AnimatePresence>
      <motion.div
        initial={{ x: 400, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: 400, opacity: 0 }}
        className="absolute top-4 right-4 w-80 z-10"
      >
        <div className="bg-slate-900/95 backdrop-blur-md rounded-2xl border border-slate-700/50 shadow-2xl overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-slate-700/50">
            <div>
              <h3 className="font-bold text-white text-lg">{panel.id}</h3>
              <div className="flex items-center gap-2 mt-1">
                <div className={`w-2 h-2 rounded-full ${statusColors[panel.status]}`} />
                <span className="text-sm text-slate-400">{statusLabels[panel.status]}</span>
              </div>
            </div>
            <button
              onClick={() => setSelectedPanelId(null)}
              className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
            >
              <X size={18} />
            </button>
          </div>
          
          <div className="p-4 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-800/50 rounded-xl p-3">
                <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
                  <Zap size={12} />
                  额定功率
                </div>
                <div className="font-mono text-lg text-white">
                  {panel.ratedPower.toFixed(0)}W
                </div>
              </div>
              
              <div className="bg-slate-800/50 rounded-xl p-3">
                <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
                  <Sun size={12} />
                  转换效率
                </div>
                <div className="font-mono text-lg text-white">
                  {(panel.efficiency * 100).toFixed(1)}%
                </div>
              </div>
            </div>
            
            {rayResult && (
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-slate-300">阴影遮挡数据</h4>
                <div className="bg-slate-800/50 rounded-xl p-3">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-slate-400 text-sm">阴影覆盖率</span>
                    <span className={`font-mono text-lg ${
                      rayResult.shadowCoverage > 0.5 ? 'text-red-400' :
                      rayResult.shadowCoverage > 0.2 ? 'text-yellow-400' : 'text-emerald-400'
                    }`}>
                      {(rayResult.shadowCoverage * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-gradient-to-r from-emerald-500 via-yellow-500 to-red-500"
                      initial={{ width: 0 }}
                      animate={{ width: `${rayResult.shadowCoverage * 100}%` }}
                      transition={{ duration: 0.5 }}
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-slate-800/50 rounded-lg p-2">
                    <div className="text-slate-500 text-xs mb-1">直接辐照度</div>
                    <div className="font-mono text-sm text-yellow-400">
                      {rayResult.directIrradiance.toFixed(0)} W/m²
                    </div>
                  </div>
                  <div className="bg-slate-800/50 rounded-lg p-2">
                    <div className="text-slate-500 text-xs mb-1">散射辐照度</div>
                    <div className="font-mono text-sm text-blue-400">
                      {rayResult.diffuseIrradiance.toFixed(0)} W/m²
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {generation && (
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-slate-300">发电数据</h4>
                
                <div className="bg-slate-800/50 rounded-xl p-3">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-slate-400 text-sm">实际输出功率</span>
                    <span className="font-mono text-xl text-emerald-400">
                      {generation.outputPower.toFixed(2)} kW
                    </span>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-slate-800/50 rounded-lg p-2">
                    <div className="text-slate-500 text-xs mb-1">理论功率</div>
                    <div className="font-mono text-sm text-white">
                      {generation.theoreticalPower.toFixed(2)} kW
                    </div>
                  </div>
                  <div className="bg-slate-800/50 rounded-lg p-2">
                    <div className="text-slate-500 text-xs mb-1">总损耗率</div>
                    <div className="font-mono text-sm text-red-400">
                      {(generation.lossRate * 100).toFixed(1)}%
                    </div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 text-slate-400">
                      <TrendingDown size={14} className="text-yellow-500" />
                      阴影损耗
                    </div>
                    <span className="text-yellow-400">{(generation.shadowLoss * 100).toFixed(1)}%</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 text-slate-400">
                      <Thermometer size={14} className="text-orange-500" />
                      温度损耗
                    </div>
                    <span className="text-orange-400">{(generation.temperatureLoss * 100).toFixed(1)}%</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 text-slate-400">
                      <Activity size={14} className="text-blue-500" />
                      MPPT损耗
                    </div>
                    <span className="text-blue-400">{(generation.mpptLoss * 100).toFixed(1)}%</span>
                  </div>
                </div>
              </div>
            )}
            
            <div className="bg-slate-800/50 rounded-xl p-3">
              <div className="text-slate-400 text-xs mb-2">位置坐标</div>
              <div className="font-mono text-sm text-slate-300">
                X: {panel.position.x.toFixed(2)} | Y: {panel.position.y.toFixed(2)} | Z: {panel.position.z.toFixed(2)}
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
