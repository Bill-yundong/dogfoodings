'use client';

import AppLayout from '../AppLayout';
import ThermalBalanceCalculator from '@/components/thermal-balance/ThermalBalanceCalculator';

export default function ThermalBalancePage() {
  return (
    <AppLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-white mb-2">热平衡分析</h1>
          <p className="text-gray-400">分析土壤热平衡状态，评估系统运行稳定性</p>
        </div>

        <ThermalBalanceCalculator />
      </div>
    </AppLayout>
  );
}
