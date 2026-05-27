'use client';

import AppLayout from '../AppLayout';
import DataSyncManager from '@/components/data-sync/DataSyncManager';

export default function DataSyncPage() {
  return (
    <AppLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-white mb-2">数据同步</h1>
          <p className="text-gray-400">实现换热效率数据在系统运维与建筑节能系统间的语义同步</p>
        </div>

        <DataSyncManager />
      </div>
    </AppLayout>
  );
}
