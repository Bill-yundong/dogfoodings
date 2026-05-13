import React from 'react';
import { PLCStatus, ConveyorNode } from '../types/core';

interface PLCStatusPanelProps {
  plcStatusList: PLCStatus[];
  nodes: ConveyorNode[];
}

export const PLCStatusPanel: React.FC<PLCStatusPanelProps> = ({ plcStatusList, nodes }) => {
  const nodeMap = new Map(nodes.map(n => [n.id, n]));

  return (
    <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
      <h3 className="text-lg font-semibold text-gray-300 mb-4 flex items-center gap-2">
        <span className="text-2xl">🔧</span> PLC 状态监控
      </h3>
      <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
        {plcStatusList.slice(0, 8).map((status) => {
          const node = nodeMap.get(status.nodeId);
          return (
            <div
              key={status.nodeId}
              className="flex items-center justify-between bg-gray-700/50 rounded-lg px-3 py-2 hover:bg-gray-700 transition-colors"
            >
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-300 font-medium">
                  {node?.name || status.nodeId}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                  status.isRunning 
                    ? 'bg-green-500/20 text-green-400' 
                    : 'bg-red-500/20 text-red-400'
                }`}>
                  {status.isRunning ? '运行中' : '停止'}
                </span>
                <span className="text-xs text-gray-500">
                  {status.currentSpeed.toFixed(1)}x
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PLCStatusPanel;
