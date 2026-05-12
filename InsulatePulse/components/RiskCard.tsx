'use client';

import { FlashoverPrediction } from '@/types';

interface RiskCardProps {
  insulatorName: string;
  prediction: FlashoverPrediction;
  onClick?: () => void;
}

export function RiskCard({ insulatorName, prediction, onClick }: RiskCardProps) {
  const riskColors = {
    low: 'bg-success-100 border-success-300 text-success-800',
    medium: 'bg-warning-100 border-warning-300 text-warning-800',
    high: 'bg-orange-100 border-orange-300 text-orange-800',
    critical: 'bg-danger-100 border-danger-300 text-danger-800'
  };

  const riskLabels = {
    low: '低风险',
    medium: '中风险',
    high: '高风险',
    critical: '严重风险'
  };

  return (
    <div
      onClick={onClick}
      className={`p-4 rounded-lg border-2 ${riskColors[prediction.riskLevel]} cursor-pointer hover:shadow-md transition-shadow`}
    >
      <div className="flex justify-between items-start mb-2">
        <h3 className="font-semibold text-lg">{insulatorName}</h3>
        <span className="px-2 py-1 rounded-full text-sm font-medium bg-white bg-opacity-50">
          {riskLabels[prediction.riskLevel]}
        </span>
      </div>
      
      <div className="space-y-2">
        <div className="flex justify-between">
          <span className="text-sm opacity-75">闪络概率</span>
          <span className="font-medium">{(prediction.probability * 100).toFixed(1)}%</span>
        </div>
        
        <div className="w-full bg-white bg-opacity-30 rounded-full h-2">
          <div
            className="h-2 rounded-full transition-all"
            style={{
              width: `${prediction.probability * 100}%`,
              backgroundColor: prediction.riskLevel === 'critical' ? '#dc2626' :
                               prediction.riskLevel === 'high' ? '#ea580c' :
                               prediction.riskLevel === 'medium' ? '#d97706' : '#16a34a'
            }}
          />
        </div>
        
        <div className="flex justify-between">
          <span className="text-sm opacity-75">置信度</span>
          <span className="font-medium">{(prediction.confidence * 100).toFixed(1)}%</span>
        </div>
        
        {prediction.predictedTime !== Infinity && (
          <div className="text-sm mt-2 p-2 bg-white bg-opacity-30 rounded">
            <span className="font-medium">预计时间：</span>
            {prediction.predictedTime < 60 * 60 * 1000 
              ? `${Math.floor(prediction.predictedTime / (60 * 1000))} 分钟内`
              : `${Math.floor(prediction.predictedTime / (60 * 60 * 1000))} 小时内`
            }
          </div>
        )}
        
        <div className="mt-2">
          <span className="text-sm opacity-75">主要影响因素：</span>
          <div className="flex flex-wrap gap-1 mt-1">
            {prediction.contributingFactors.map((factor, i) => (
              <span key={i} className="px-2 py-0.5 text-xs rounded bg-white bg-opacity-50">
                {factor}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}