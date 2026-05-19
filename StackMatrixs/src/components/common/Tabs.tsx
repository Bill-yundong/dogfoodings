import React from 'react';
import { classNames } from '@/utils/formatters';

interface TabsProps {
  tabs: Array<{ id: string; label: string; count?: number }>;
  activeTab: string;
  onChange: (id: string) => void;
  className?: string;
}

export const Tabs: React.FC<TabsProps> = ({ tabs, activeTab, onChange, className = '' }) => {
  return (
    <div className={classNames('flex gap-1 p-1 bg-wms-bg rounded-lg', className)}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={classNames(
            'flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all duration-200',
            activeTab === tab.id
              ? 'bg-wms-primary text-white shadow-sm'
              : 'text-wms-subtext hover:text-wms-text hover:bg-wms-panel/50'
          )}
        >
          {tab.label}
          {tab.count !== undefined && (
            <span
              className={classNames(
                'px-1.5 py-0.5 rounded text-xs',
                activeTab === tab.id
                  ? 'bg-white/20 text-white'
                  : 'bg-wms-panel text-wms-subtext'
              )}
            >
              {tab.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
};
