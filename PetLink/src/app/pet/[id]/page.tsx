'use client';

import { useEffect } from 'react';
import { motion } from 'framer-motion';
import Sidebar from '@/components/Sidebar';
import VitalsChart from '@/components/VitalsChart';
import VitalCard from '@/components/VitalCard';
import { Heart, Thermometer, Wind, Activity, Clock, Info } from 'lucide-react';
import { usePetLinkStore } from '@/lib/store';
import Image from 'next/image';

export default function PetDetailPage({ params }: { params: { id: string } }) {
  const { loadMockData, selectedPet, vitalSigns, isLoading } = usePetLinkStore();

  useEffect(() => {
    loadMockData();
  }, [loadMockData]);

  if (isLoading || !selectedPet) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full" />
      </div>
    );
  }

  const latestVitals = vitalSigns[vitalSigns.length - 1];

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      <main className="flex-1 p-8 overflow-auto">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <div className="flex items-center gap-6">
              <div className="relative">
                <Image
                  src={selectedPet.avatar}
                  alt={selectedPet.name}
                  width={120}
                  height={120}
                  className="w-28 h-28 rounded-2xl object-cover border-4 border-white shadow-lg"
                />
                <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-green-500 rounded-full border-4 border-white flex items-center justify-center">
                  <span className="w-3 h-3 bg-white rounded-full animate-pulse" />
                </div>
              </div>
              <div>
                <h1 className="font-poppins text-3xl font-bold text-slate-800">
                  {selectedPet.name}
                </h1>
                <p className="text-slate-500 mt-1">
                  {selectedPet.breed} · {selectedPet.age}岁 · {selectedPet.weight}kg
                </p>
                <div className="flex items-center gap-2 mt-3">
                  <span className="px-3 py-1 bg-primary-50 text-primary-700 text-sm rounded-full">
                    实时监控中
                  </span>
                  <span className="flex items-center gap-1 text-sm text-slate-500">
                    <Clock className="w-4 h-4" />
                    最后更新: {new Date(latestVitals?.timestamp || Date.now()).toLocaleTimeString('zh-CN')}
                  </span>
                </div>
              </div>
            </div>
          </motion.div>

          <div className="grid grid-cols-4 gap-6 mb-8">
            <VitalCard
              icon={Heart}
              label="心率"
              value={Math.round(latestVitals?.heartRate || 0)}
              unit="bpm"
              trend="stable"
              color="text-primary-600"
              bgColor="bg-primary-50"
            />
            <VitalCard
              icon={Thermometer}
              label="体温"
              value={(latestVitals?.temperature || 0).toFixed(1)}
              unit="°C"
              trend="stable"
              color="text-accent-600"
              bgColor="bg-accent-50"
            />
            <VitalCard
              icon={Wind}
              label="呼吸频率"
              value={Math.round(latestVitals?.respiratoryRate || 0)}
              unit="次/分"
              trend="stable"
              color="text-indigo-600"
              bgColor="bg-indigo-50"
            />
            <VitalCard
              icon={Activity}
              label="活动量"
              value={Math.round(latestVitals?.activityLevel || 0)}
              unit="%"
              trend="up"
              color="text-purple-600"
              bgColor="bg-purple-50"
            />
          </div>

          <div className="grid grid-cols-2 gap-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="card p-6"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-poppins font-semibold text-slate-800">心率变化</h2>
                <span className="text-sm text-slate-500">24小时</span>
              </div>
              <VitalsChart data={vitalSigns} type="heartRate" />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="card p-6"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-poppins font-semibold text-slate-800">体温变化</h2>
                <span className="text-sm text-slate-500">24小时</span>
              </div>
              <VitalsChart data={vitalSigns} type="temperature" />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="card p-6 col-span-2"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-poppins font-semibold text-slate-800">活动水平</h2>
                <span className="text-sm text-slate-500">24小时</span>
              </div>
              <VitalsChart data={vitalSigns} type="activityLevel" />
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="card p-6 mt-6"
          >
            <div className="flex items-center gap-2 mb-4">
              <Info className="w-5 h-5 text-primary-600" />
              <h2 className="font-poppins font-semibold text-slate-800">正常范围参考</h2>
            </div>
            <div className="grid grid-cols-3 gap-6">
              <div className="p-4 bg-slate-50 rounded-xl">
                <p className="text-sm text-slate-500">心率 (狗狗)</p>
                <p className="text-lg font-semibold text-slate-800 mt-1">70 - 120 bpm</p>
              </div>
              <div className="p-4 bg-slate-50 rounded-xl">
                <p className="text-sm text-slate-500">体温</p>
                <p className="text-lg font-semibold text-slate-800 mt-1">38.0 - 39.2 °C</p>
              </div>
              <div className="p-4 bg-slate-50 rounded-xl">
                <p className="text-sm text-slate-500">呼吸频率</p>
                <p className="text-lg font-semibold text-slate-800 mt-1">10 - 30 次/分</p>
              </div>
            </div>
          </motion.div>
        </div>
      </main>
    </div>
  );
}
