'use client';

import { useEffect, useState } from 'react';
import { Insulator } from '@/types';
import { InsulatorList } from '@/components/InsulatorList';
import { db, ensureDatabaseInitialized } from '@/lib/database';

export default function InsulatorsPage() {
  const [insulators, setInsulators] = useState<Insulator[]>([]);
  const [selectedInsulator, setSelectedInsulator] = useState<Insulator | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      await ensureDatabaseInitialized();
      const data = await db.getAllInsulators();
      setInsulators(data);
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
        <h1 className="text-2xl font-bold text-gray-800 mb-2">设备管理</h1>
        <p className="text-gray-600">管理和监控所有绝缘子设备</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <InsulatorList
            insulators={insulators}
            onSelect={setSelectedInsulator}
          />
        </div>

        <div>
          {selectedInsulator ? (
            <div className="bg-white rounded-lg shadow p-4">
              <h3 className="text-lg font-semibold mb-4">设备详情</h3>
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-gray-500">设备名称</label>
                  <div className="font-medium">{selectedInsulator.name}</div>
                </div>
                <div>
                  <label className="text-sm text-gray-500">安装位置</label>
                  <div className="font-medium">{selectedInsulator.location}</div>
                </div>
                <div>
                  <label className="text-sm text-gray-500">电压等级</label>
                  <div className="font-medium">{selectedInsulator.voltageLevel}kV</div>
                </div>
                <div>
                  <label className="text-sm text-gray-500">设备类型</label>
                  <div className="font-medium">{selectedInsulator.type}</div>
                </div>
                <div>
                  <label className="text-sm text-gray-500">安装日期</label>
                  <div className="font-medium">
                    {new Date(selectedInsulator.installationDate).toLocaleDateString()}
                  </div>
                </div>
                <div>
                  <label className="text-sm text-gray-500">上次检修</label>
                  <div className="font-medium">
                    {new Date(selectedInsulator.lastMaintenanceDate).toLocaleDateString()}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow p-4 text-center text-gray-500">
              选择一个设备查看详情
            </div>
          )}
        </div>
      </div>
    </div>
  );
}