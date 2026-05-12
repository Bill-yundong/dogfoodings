'use client';

import { useEffect, useState } from 'react';
import { MaintenanceTask } from '@/types';
import { MaintenanceTaskList } from '@/components/MaintenanceTaskList';
import { db, ensureDatabaseInitialized } from '@/lib/database';

export default function MaintenancePage() {
  const [tasks, setTasks] = useState<MaintenanceTask[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      await ensureDatabaseInitialized();
      const data = await db.getPendingMaintenanceTasks();
      setTasks(data);
      setLoading(false);
    };
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="text-xl">加载中...</div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">检修任务</h1>
        <p className="text-gray-600">管理和跟踪所有检修任务</p>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <MaintenanceTaskList tasks={tasks} />
      </div>
    </div>
  );
}