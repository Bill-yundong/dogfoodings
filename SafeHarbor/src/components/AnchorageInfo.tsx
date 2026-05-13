import React from 'react';
import type { Anchorage } from '../types';
import { GEOLOGY_LABELS } from '../constants';
import { formatNumber } from '../utils/format';

interface AnchorageInfoProps {
  anchorage: Anchorage;
  isSelected: boolean;
  onSelect: () => void;
}

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
        <AnchorageInfoItem label="水深" value={`${anchorage.depth} m`} />
        <AnchorageInfoItem label="半径" value={`${anchorage.radius} nm`} />
        <AnchorageInfoItem label="地质" value={GEOLOGY_LABELS[anchorage.geologyType] || anchorage.geologyType} />
        <AnchorageInfoItem label="容量" value={`${anchorage.maxCapacity} 艘`} />
        <AnchorageInfoItem 
          label="抓力系数" 
          value={`${formatNumber(anchorage.holdingCapacity * 100, 0)}%`} 
          colSpan2 
        />
      </div>
    </div>
  );
};

interface AnchorageInfoItemProps {
  label: string;
  value: string;
  colSpan2?: boolean;
}

const AnchorageInfoItem: React.FC<AnchorageInfoItemProps> = ({ label, value, colSpan2 = false }) => (
  <div className={colSpan2 ? 'col-span-2' : ''}>
    <span className="text-gray-500">{label}: </span>
    <span className="font-medium">{value}</span>
  </div>
);
