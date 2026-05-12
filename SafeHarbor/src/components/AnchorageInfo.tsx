import React from 'react';
import type { Anchorage } from '../types';

interface AnchorageInfoProps {
  anchorage: Anchorage;
  isSelected: boolean;
  onSelect: () => void;
}

const geologyLabels: Record<string, string> = {
  mud: '泥质',
  sand: '沙质',
  rock: '岩质',
  clay: '黏质',
  mixed: '混合'
};

export const AnchorageInfo: React.FC<AnchorageInfoProps> = ({ anchorage, isSelected, onSelect }) => {
  return (
    <div 
      className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
        isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white hover:border-blue-300'
      }`}
      onClick={onSelect}
    >
      <h4 className="font-semibold text-gray-800 mb-2">{anchorage.name}</h4>
      <div className="grid grid-cols-2 gap-2 text-sm">
        <div>
          <span className="text-gray-500">水深: </span>
          <span className="font-medium">{anchorage.depth} m</span>
        </div>
        <div>
          <span className="text-gray-500">半径: </span>
          <span className="font-medium">{anchorage.radius} nm</span>
        </div>
        <div>
          <span className="text-gray-500">地质: </span>
          <span className="font-medium">{geologyLabels[anchorage.geologyType]}</span>
        </div>
        <div>
          <span className="text-gray-500">容量: </span>
          <span className="font-medium">{anchorage.maxCapacity} 艘</span>
        </div>
        <div className="col-span-2">
          <span className="text-gray-500">抓力系数: </span>
          <span className="font-medium">{(anchorage.holdingCapacity * 100).toFixed(0)}%</span>
        </div>
      </div>
    </div>
  );
};
