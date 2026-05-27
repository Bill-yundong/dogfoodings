'use client';

import AppLayout from '../AppLayout';
import ThermalDriftPredictor from '@/components/thermal-drift/ThermalDriftPredictor';

export default function ThermalDriftPage() {
  return (
    <AppLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-white mb-2">热漂移预测</h1>
          <p className="text-gray-400">基于异步热漂移演化模型预测土壤热透支风险</p>
        </div>

        <ThermalDriftPredictor />
      </div>
    </AppLayout>
  );
}
