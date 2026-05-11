'use client';

import { BuildingSafetyStatus } from '../types/seismic';

interface BuildingStatusProps {
  buildings: BuildingSafetyStatus[];
}

export default function BuildingStatus({ buildings }: BuildingStatusProps) {
  const getStatusColor = (safetyScore: number) => {
    if (safetyScore >= 80) return 'text-green-500 bg-green-500/10 border-green-500/30';
    if (safetyScore >= 60) return 'text-yellow-500 bg-yellow-500/10 border-yellow-500/30';
    if (safetyScore >= 40) return 'text-orange-500 bg-orange-500/10 border-orange-500/30';
    return 'text-red-500 bg-red-500/10 border-red-500/30';
  };

  const getStressBarColor = (stressLevel: number) => {
    if (stressLevel < 30) return 'bg-green-500';
    if (stressLevel < 60) return 'bg-yellow-500';
    if (stressLevel < 80) return 'bg-orange-500';
    return 'bg-red-500';
  };

  return (
    <div className="bg-gray-900 rounded-xl p-6 border border-gray-700">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-white font-semibold">建筑结构安全状态</h3>
        <span className="text-xs text-gray-500">实时监测</span>
      </div>

      <div className="space-y-4">
        {buildings.map((building) => (
          <div
            key={building.buildingId}
            className={`p-4 rounded-lg border transition-all duration-300 ${getStatusColor(building.safetyScore)}`}
            style={{
              animation: building.safetyScore < 40 ? 'pulse 1s ease-in-out infinite' : 'none'
            }}
          >
            <div className="flex items-center justify-between mb-3">
              <div>
                <h4 className="font-medium text-white">{building.buildingName}</h4>
                <span className="text-xs opacity-70">ID: {building.buildingId}</span>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold">{building.safetyScore}</div>
                <div className="text-xs opacity-70">安全评分</div>
              </div>
            </div>

            <div className="space-y-2">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-gray-400">应力水平</span>
                  <span>{building.stressLevel.toFixed(1)}%</span>
                </div>
                <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${getStressBarColor(building.stressLevel)} transition-all duration-300`}
                    style={{ width: `${building.stressLevel}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-gray-400">当前烈度</span>
                  <span>MMI {building.currentIntensity.toFixed(1)}</span>
                </div>
                <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 transition-all duration-300"
                    style={{ width: `${(building.currentIntensity / 12) * 100}%` }}
                  />
                </div>
              </div>
            </div>

            {building.alerts.length > 0 && (
              <div className="mt-3 pt-3 border-t border-current border-opacity-20">
                <div className="text-xs font-medium mb-2">告警信息</div>
                <div className="space-y-1">
                  {building.alerts.slice(0, 2).map((alert) => (
                    <div
                      key={alert.id}
                      className="text-xs p-2 rounded bg-black bg-opacity-30"
                    >
                      {alert.message}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
