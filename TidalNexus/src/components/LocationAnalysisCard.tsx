import React from 'react';
import { LocationAnalysis } from '../types/tidal';

interface LocationAnalysisCardProps {
  analysis: LocationAnalysis;
}

export const LocationAnalysisCard: React.FC<LocationAnalysisCardProps> = ({ analysis }) => {
  return (
    <div className="bg-white rounded-lg shadow-md p-4 hover:shadow-lg transition-shadow">
      <h3 className="text-lg font-semibold text-gray-800 mb-3">
        位点能源产出分析
      </h3>
      
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-blue-50 rounded-lg p-3">
            <div className="text-xs text-blue-600 font-medium">平均功率密度</div>
            <div className="text-2xl font-bold text-blue-800">
              {analysis.avgPowerDensity.toFixed(2)}
            </div>
            <div className="text-xs text-blue-500">W/m²</div>
          </div>
          
          <div className="bg-green-50 rounded-lg p-3">
            <div className="text-xs text-green-600 font-medium">最大功率密度</div>
            <div className="text-2xl font-bold text-green-800">
              {analysis.maxPowerDensity.toFixed(2)}
            </div>
            <div className="text-xs text-green-500">W/m²</div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-purple-50 rounded-lg p-3">
            <div className="text-xs text-purple-600 font-medium">容量因子</div>
            <div className="text-2xl font-bold text-purple-800">
              {(analysis.capacityFactor * 100).toFixed(1)}
            </div>
            <div className="text-xs text-purple-500">%</div>
          </div>
          
          <div className="bg-orange-50 rounded-lg p-3">
            <div className="text-xs text-orange-600 font-medium">年发电量</div>
            <div className="text-2xl font-bold text-orange-800">
              {(analysis.annualEnergyProduction / 1000000).toFixed(2)}
            </div>
            <div className="text-xs text-orange-500">MWh</div>
          </div>
        </div>

        <div className="mt-3 pt-3 border-t border-gray-200">
          <div className="text-xs text-gray-500">
            位点: {analysis.location.latitude.toFixed(4)}°N, {analysis.location.longitude.toFixed(4)}°E
          </div>
        </div>
      </div>
    </div>
  );
};