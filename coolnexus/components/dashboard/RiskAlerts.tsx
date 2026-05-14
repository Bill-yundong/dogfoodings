'use client';

import { AirflowRisk } from '@/lib/types/datacenter';

interface RiskAlertsProps {
  risks: AirflowRisk[];
}

export default function RiskAlerts({ risks }: RiskAlertsProps) {
  const getSeverityColor = (severity: AirflowRisk['severity']) => {
    switch (severity) {
      case 'critical': return 'bg-red-500/20 border-red-500/50 text-red-400';
      case 'high': return 'bg-orange-500/20 border-orange-500/50 text-orange-400';
      case 'medium': return 'bg-amber-500/20 border-amber-500/50 text-amber-400';
      default: return 'bg-blue-500/20 border-blue-500/50 text-blue-400';
    }
  };

  const getTypeIcon = (type: AirflowRisk['type']) => {
    switch (type) {
      case 'short_circuit': return '⚡';
      case 'hot_spot': return '🔥';
      case 'recirculation': return '🔄';
      default: return '⚠️';
    }
  };

  const getTypeName = (type: AirflowRisk['type']) => {
    switch (type) {
      case 'short_circuit': return '气流短路';
      case 'hot_spot': return '局部热点';
      case 'recirculation': return '热空气回流';
      default: return '未知风险';
    }
  };

  return (
    <div className="p-6 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10 h-full">
      <h3 className="text-lg font-semibold text-white/80 mb-4 flex items-center gap-2">
        <span className="text-xl">⚠️</span>
        气流风险告警
        {risks.length > 0 && (
          <span className="ml-auto text-sm px-2 py-0.5 rounded-full bg-red-500/20 text-red-400">
            {risks.length}
          </span>
        )}
      </h3>

      {risks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-white/40">
          <span className="text-4xl mb-2">✅</span>
          <span className="text-sm">暂未检测到风险</span>
        </div>
      ) : (
        <div className="space-y-3 max-h-64 overflow-y-auto pr-2">
          {risks.map((risk) => (
            <div
              key={risk.id}
              className={`p-3 rounded-lg border ${getSeverityColor(risk.severity)}`}
            >
              <div className="flex items-start gap-3">
                <span className="text-xl">{getTypeIcon(risk.type)}</span>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{getTypeName(risk.type)}</span>
                    <span className="text-xs opacity-70">{risk.temperature.toFixed(1)}°C</span>
                  </div>
                  <p className="text-xs opacity-70 mt-1">{risk.description}</p>
                  {risk.affectedRacks.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {risk.affectedRacks.slice(0, 3).map(rackId => (
                        <span key={rackId} className="text-[10px] px-1.5 py-0.5 rounded bg-black/30">
                          {rackId.replace('rack-', '')}
                        </span>
                      ))}
                      {risk.affectedRacks.length > 3 && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-black/30">
                          +{risk.affectedRacks.length - 3}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
