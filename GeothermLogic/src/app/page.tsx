'use client';

import AppLayout from './AppLayout';
import StatsCards from '@/components/dashboard/StatsCards';
import HealthStatus from '@/components/dashboard/HealthStatus';
import ThermalBalanceChart from '@/components/dashboard/ThermalBalanceChart';

export default function DashboardPage() {
  return (
    <AppLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-white mb-2">系统监控面板</h1>
          <p className="text-gray-400">实时监测地源热泵系统运行状态</p>
        </div>

        <StatsCards />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <ThermalBalanceChart />
          </div>
          <HealthStatus />
        </div>
      </div>
    </AppLayout>
  );
}
