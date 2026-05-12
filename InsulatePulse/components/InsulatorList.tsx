'use client';

import { Insulator } from '@/types';
import { useState } from 'react';

interface InsulatorListProps {
  insulators: Insulator[];
  onSelect?: (insulator: Insulator) => void;
}

export function InsulatorList({ insulators, onSelect }: InsulatorListProps) {
  const [filter, setFilter] = useState<string>('all');

  const statusColors = {
    normal: 'bg-success-100 text-success-800 border-success-300',
    warning: 'bg-warning-100 text-warning-800 border-warning-300',
    critical: 'bg-danger-100 text-danger-800 border-danger-300',
    maintenance: 'bg-blue-100 text-blue-800 border-blue-300'
  };

  const statusLabels = {
    normal: '正常',
    warning: '预警',
    critical: '严重',
    maintenance: '检修中'
  };

  const filteredInsulators = filter === 'all'
    ? insulators
    : insulators.filter(i => i.status === filter);

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-4 border-b flex items-center justify-between">
        <h3 className="text-lg font-semibold">绝缘子列表</h3>
        <div className="flex space-x-2">
          {['all', 'critical', 'warning', 'normal', 'maintenance'].map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-3 py-1 rounded text-sm transition-colors ${
                filter === status
                  ? 'bg-primary-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {status === 'all' ? '全部' : statusLabels[status as keyof typeof statusLabels]}
            </button>
          ))}
        </div>
      </div>
      
      <div className="divide-y max-h-96 overflow-y-auto">
        {filteredInsulators.map((insulator) => (
          <div
            key={insulator.id}
            onClick={() => onSelect?.(insulator)}
            className="p-4 hover:bg-gray-50 cursor-pointer transition-colors"
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">{insulator.name}</div>
                <div className="text-sm text-gray-500">{insulator.location} · {insulator.type}</div>
              </div>
              <div className="flex items-center space-x-3">
                <div className="text-sm text-gray-500">
                  {insulator.voltageLevel}kV
                </div>
                <span className={`px-2 py-1 rounded text-xs font-medium border ${statusColors[insulator.status]}`}>
                  {statusLabels[insulator.status]}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}