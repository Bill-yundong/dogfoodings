'use client';

import { AlertTriangle, CheckCircle, XCircle, Info } from 'lucide-react';
import { DefectRisk } from '@/types/welding';

interface DefectAlertProps {
  risk: DefectRisk;
}

export function DefectAlert({ risk }: DefectAlertProps) {
  const getIcon = () => {
    switch (risk.level) {
      case 'critical': return <XCircle className="w-6 h-6 text-red-500" />;
      case 'high': return <AlertTriangle className="w-6 h-6 text-orange-500" />;
      case 'medium': return <AlertTriangle className="w-6 h-6 text-yellow-500" />;
      case 'low': return <Info className="w-6 h-6 text-blue-500" />;
      default: return <CheckCircle className="w-6 h-6 text-green-500" />;
    }
  };

  const getBorderColor = () => {
    switch (risk.level) {
      case 'critical': return 'border-red-500 bg-red-500/10';
      case 'high': return 'border-orange-500 bg-orange-500/10';
      case 'medium': return 'border-yellow-500 bg-yellow-500/10';
      case 'low': return 'border-blue-500 bg-blue-500/10';
      default: return 'border-green-500 bg-green-500/10';
    }
  };

  const getLevelText = () => {
    switch (risk.level) {
      case 'critical': return '危急';
      case 'high': return '高风险';
      case 'medium': return '中风险';
      case 'low': return '低风险';
      default: return '正常';
    }
  };

  return (
    <div className={`p-4 rounded-lg border-2 ${getBorderColor()}`}>
      <div className="flex items-center gap-3 mb-3">
        {getIcon()}
        <div>
          <h3 className="font-semibold text-white">缺陷风险预警</h3>
          <p className="text-sm text-gray-400">风险等级: {getLevelText()}</p>
        </div>
        <div className="ml-auto text-right">
          <span className="text-2xl font-bold text-white">{risk.probability}%</span>
        </div>
      </div>
      
      {risk.types.length > 0 && (
        <div className="mb-3">
          <h4 className="text-sm font-medium text-gray-400 mb-2">风险因素:</h4>
          <div className="flex flex-wrap gap-2">
            {risk.types.map((type, idx) => (
              <span 
                key={idx} 
                className="px-2 py-1 text-xs rounded bg-gray-700 text-gray-300"
              >
                {type}
              </span>
            ))}
          </div>
        </div>
      )}
      
      {risk.recommendations.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-gray-400 mb-2">处理建议:</h4>
          <ul className="space-y-1">
            {risk.recommendations.map((rec, idx) => (
              <li key={idx} className="text-sm text-gray-300 flex items-start gap-2">
                <span className="text-green-400 mt-0.5">•</span>
                {rec}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
