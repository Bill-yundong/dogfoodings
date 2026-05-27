'use client';

import AppLayout from '../AppLayout';
import BoreholeManager from '@/components/boreholes/BoreholeManager';

export default function BoreholesPage() {
  return (
    <AppLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-white mb-2">换热孔管理</h1>
          <p className="text-gray-400">管理换热孔数据，查询历史地温快照（IndexedDB 本地缓存）</p>
        </div>

        <BoreholeManager />
      </div>
    </AppLayout>
  );
}
