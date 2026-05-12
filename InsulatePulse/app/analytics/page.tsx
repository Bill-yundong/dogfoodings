'use client';

import { useEffect, useState } from 'react';
import { CurrentChart } from '@/components/CurrentChart';
import { db, ensureDatabaseInitialized } from '@/lib/database';

export default function AnalyticsPage() {
  const [currentData, setCurrentData] = useState<Array<{ time: string; value: number; harmonic: number }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      await ensureDatabaseInitialized();
      generateMockChartData();
      setLoading(false);
    };
    init();
  }, []);

  const generateMockChartData = () => {
    const data: Array<{ time: string; value: number; harmonic: number }> = [];
    for (let i = 0; i < 100; i++) {
      const t = i / 100;
      data.push({
        time: `${(t * 200).toFixed(0)}ms`,
        value: Math.sin(2 * Math.PI * 50 * t) + 0.3 * Math.sin(2 * Math.PI * 150 * t) + 0.1 * Math.sin(2 * Math.PI * 250 * t),
        harmonic: 0.3 * Math.sin(2 * Math.PI * 150 * t) + 0.1 * Math.sin(2 * Math.PI * 250 * t)
      });
    }
    setCurrentData(data);
  };

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
        <h1 className="text-2xl font-bold text-gray-800 mb-2">数据分析</h1>
        <p className="text-gray-600">泄露电流频域特征分析与可视化</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CurrentChart data={currentData} />
        
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="text-lg font-semibold mb-4">谐波分析</h3>
          <div className="space-y-4">
            <div className="p-3 bg-gray-50 rounded">
              <div className="flex justify-between mb-2">
                <span className="text-sm text-gray-600">总谐波畸变率 (THD)</span>
                <span className="font-medium">12.5%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-warning-500 h-2 rounded-full" style={{ width: '12.5%' }}></div>
              </div>
            </div>
            
            <div className="p-3 bg-gray-50 rounded">
              <div className="flex justify-between mb-2">
                <span className="text-sm text-gray-600">3次谐波占比</span>
                <span className="font-medium">8.2%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-primary-500 h-2 rounded-full" style={{ width: '8.2%' }}></div>
              </div>
            </div>
            
            <div className="p-3 bg-gray-50 rounded">
              <div className="flex justify-between mb-2">
                <span className="text-sm text-gray-600">5次谐波占比</span>
                <span className="font-medium">5.1%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-primary-500 h-2 rounded-full" style={{ width: '5.1%' }}></div>
              </div>
            </div>
            
            <div className="p-3 bg-gray-50 rounded">
              <div className="flex justify-between mb-2">
                <span className="text-sm text-gray-600">7次谐波占比</span>
                <span className="font-medium">2.8%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-primary-500 h-2 rounded-full" style={{ width: '2.8%' }}></div>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 bg-white rounded-lg shadow p-4">
          <h3 className="text-lg font-semibold mb-4">特征参数统计</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-gray-50 rounded">
              <div className="text-2xl font-bold text-primary-600">2.45mA</div>
              <div className="text-sm text-gray-600">电流有效值</div>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded">
              <div className="text-2xl font-bold text-primary-600">1.42</div>
              <div className="text-sm text-gray-600">峰值因子</div>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded">
              <div className="text-2xl font-bold text-primary-600">0.87</div>
              <div className="text-sm text-gray-600">波形因子</div>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded">
              <div className="text-2xl font-bold text-primary-600">3.21</div>
              <div className="text-sm text-gray-600">脉冲计数</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}