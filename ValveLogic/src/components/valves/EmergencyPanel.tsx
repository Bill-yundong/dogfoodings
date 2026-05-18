import React, { useState } from 'react';
import { AlertTriangle, Shield, Clock, Settings } from 'lucide-react';
import { useValveStore } from '../../store/useValveStore';

export const EmergencyPanel: React.FC = () => {
  const [confirming, setConfirming] = useState(false);
  const { emergencyConfig, setEmergencyConfig, triggerEmergencyShutdown, closeAllValves } =
    useValveStore();

  const handleEmergencyShutdown = () => {
    if (!confirming) {
      setConfirming(true);
      setTimeout(() => setConfirming(false), 3000);
      return;
    }
    triggerEmergencyShutdown(emergencyConfig.closingTime);
    setConfirming(false);
  };

  return (
    <div className="bg-slate-800/90 border border-slate-700 rounded-lg p-4">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-red-500/20 rounded-lg">
          <Shield className="text-red-400" size={20} />
        </div>
        <div>
          <h3 className="text-white font-medium">紧急控制</h3>
          <p className="text-xs text-slate-400">安全防护与应急响应</p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="p-3 bg-slate-900/50 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Settings size={14} className="text-slate-400" />
              <span className="text-sm text-slate-300">自动保护</span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={emergencyConfig.enabled}
                onChange={(e) => setEmergencyConfig({ enabled: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-green-500"></div>
            </label>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-400 flex items-center gap-1">
                <AlertTriangle size={10} />
                压力阈值
              </label>
              <input
                type="number"
                value={emergencyConfig.pressureThreshold / 1000000}
                onChange={(e) =>
                  setEmergencyConfig({ pressureThreshold: parseFloat(e.target.value) * 1000000 })
                }
                className="w-full mt-1 px-2 py-1 bg-slate-800 border border-slate-600 rounded text-sm text-white"
                step="0.5"
              />
              <span className="text-xs text-slate-500">MPa</span>
            </div>
            <div>
              <label className="text-xs text-slate-400 flex items-center gap-1">
                <Clock size={10} />
                关闭时间
              </label>
              <input
                type="number"
                value={emergencyConfig.closingTime}
                onChange={(e) =>
                  setEmergencyConfig({ closingTime: parseFloat(e.target.value) })
                }
                className="w-full mt-1 px-2 py-1 bg-slate-800 border border-slate-600 rounded text-sm text-white"
                step="0.5"
              />
              <span className="text-xs text-slate-500">秒</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => closeAllValves()}
            className="py-3 px-4 bg-yellow-600 hover:bg-yellow-500 text-white rounded-lg font-medium text-sm transition-all flex items-center justify-center gap-2"
          >
            <AlertTriangle size={16} />
            全部关闭
          </button>

          <button
            onClick={handleEmergencyShutdown}
            className={`py-3 px-4 rounded-lg font-medium text-sm transition-all flex items-center justify-center gap-2 ${
              confirming
                ? 'bg-red-700 animate-pulse text-white'
                : 'bg-red-600 hover:bg-red-500 text-white'
            }`}
          >
            <Shield size={16} />
            {confirming ? '再次确认' : '紧急关断'}
          </button>
        </div>
      </div>
    </div>
  );
};
