import React from 'react';
import type { EvacuationPlan as EvacuationPlanType } from '../services/typhoonOptimizer';
import type { Ship, Anchorage } from '../types';
import { formatNumber } from '../utils/format';

interface EvacuationPlanProps {
  plan: EvacuationPlanType;
  ships: Ship[];
  anchorages: Anchorage[];
}

export const EvacuationPlan: React.FC<EvacuationPlanProps> = ({ plan, ships, anchorages }) => {
  return (
    <div className="bg-white rounded-lg shadow-md p-6 border-2 border-orange-400">
      <h2 className="text-xl font-semibold text-gray-800 mb-4">
        🚨 应急疏散方案
      </h2>
      
      <div className="mb-4 p-4 bg-orange-50 rounded-lg">
        <p className="font-medium text-orange-800">
          风险评估: {plan.riskAssessment}
        </p>
        <p className="text-sm text-orange-600 mt-1">
          预计总耗时: {formatNumber(plan.totalEstimatedTime, 0)} 分钟
        </p>
      </div>
      
      <div className="space-y-2">
        {plan.shipOrders.map((order) => {
          const ship = ships.find(s => s.id === order.shipId);
          const anchorage = anchorages.find(a => a.id === order.targetAnchorage);
          return (
            <div 
              key={order.shipId} 
              className="flex justify-between items-center p-3 bg-gray-50 rounded-lg"
            >
              <span className="font-medium">
                #{order.order} {ship?.name || order.shipId}
              </span>
              <span className="text-gray-600">
                {anchorage?.name || order.targetAnchorage}
              </span>
              <span className="text-sm text-gray-500">
                预计 {formatNumber(order.estimatedTime, 0)} 分钟
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
