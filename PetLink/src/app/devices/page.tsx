'use client';

import { useEffect } from 'react';
import { motion } from 'framer-motion';
import Sidebar from '@/components/Sidebar';
import { usePetLinkStore } from '@/lib/store';
import {
  Watch,
  Battery,
  Wifi,
  WifiOff,
  RefreshCw,
  Settings,
  Bluetooth,
  Clock,
  Plus,
} from 'lucide-react';
import Image from 'next/image';

export default function DevicesPage() {
  const { loadMockData, devices, selectedPet } = usePetLinkStore();

  useEffect(() => {
    loadMockData();
  }, [loadMockData]);

  if (!selectedPet) return null;

  const getBatteryColor = (level: number) => {
    if (level > 50) return 'text-green-600';
    if (level > 20) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      <main className="flex-1 p-8 overflow-auto">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-between mb-8"
          >
            <div>
              <h1 className="font-poppins text-3xl font-bold text-slate-800">
                设备管理
              </h1>
              <p className="text-slate-500 mt-1">
                管理连接的智能穿戴设备
              </p>
            </div>
            <button className="btn-primary flex items-center gap-2">
              <Plus className="w-4 h-4" />
              添加设备
            </button>
          </motion.div>

          <div className="space-y-6">
            {devices.map((device, index) => (
              <motion.div
                key={device.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + index * 0.1 }}
                className="card p-6"
              >
                <div className="flex items-start gap-6">
                  <div className="w-24 h-24 bg-gradient-to-br from-primary-100 to-primary-50 rounded-2xl flex items-center justify-center">
                    <Watch className="w-12 h-12 text-primary-600" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-poppins font-semibold text-xl text-slate-800">
                          {device.name}
                        </h3>
                        <p className="text-sm text-slate-500 mt-1">
                          {device.type === 'collar' ? '智能项圈' : device.type}
                        </p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-sm font-medium flex items-center gap-2 ${
                        device.connected
                          ? 'bg-green-100 text-green-700'
                          : 'bg-slate-100 text-slate-600'
                      }`}>
                        {device.connected ? (
                          <Wifi className="w-4 h-4" />
                        ) : (
                          <WifiOff className="w-4 h-4" />
                        )}
                        {device.connected ? '已连接' : '已断开'}
                      </span>
                    </div>

                    <div className="grid grid-cols-4 gap-4 mt-6">
                      <div className="p-4 bg-slate-50 rounded-xl">
                        <div className="flex items-center gap-2 text-slate-500 text-sm mb-1">
                          <Battery className={`w-4 h-4 ${getBatteryColor(device.batteryLevel)}`} />
                          电量
                        </div>
                        <p className="text-2xl font-poppins font-bold text-slate-800">
                          {device.batteryLevel}%
                        </p>
                      </div>
                      <div className="p-4 bg-slate-50 rounded-xl">
                        <div className="flex items-center gap-2 text-slate-500 text-sm mb-1">
                          <Bluetooth className="w-4 h-4 text-blue-500" />
                          信号
                        </div>
                        <p className="text-2xl font-poppins font-bold text-slate-800">
                          强
                        </p>
                      </div>
                      <div className="p-4 bg-slate-50 rounded-xl">
                        <div className="flex items-center gap-2 text-slate-500 text-sm mb-1">
                          <Clock className="w-4 h-4" />
                          最后同步
                        </div>
                        <p className="text-lg font-poppins font-bold text-slate-800">
                          {new Date(device.lastSync).toLocaleTimeString('zh-CN', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                      <div className="p-4 bg-slate-50 rounded-xl">
                        <div className="flex items-center gap-2 text-slate-500 text-sm mb-1">
                          <Watch className="w-4 h-4" />
                          MAC地址
                        </div>
                        <p className="text-sm font-mono text-slate-800">
                          {device.macAddress}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 mt-6">
                      <button className="btn-secondary flex items-center gap-2">
                        <RefreshCw className="w-4 h-4" />
                        立即同步
                      </button>
                      <button className="btn-secondary flex items-center gap-2">
                        <Settings className="w-4 h-4" />
                        设备设置
                      </button>
                      {!device.connected && (
                        <button className="btn-primary flex items-center gap-2">
                          <Bluetooth className="w-4 h-4" />
                          重新连接
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}

            {devices.length === 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="card p-12 text-center"
              >
                <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Watch className="w-10 h-10 text-slate-400" />
                </div>
                <h3 className="font-poppins font-semibold text-lg text-slate-800 mb-2">
                  暂无连接设备
                </h3>
                <p className="text-slate-500 mb-6">
                  绑定智能项圈以开始监控宠物健康
                </p>
                <button className="btn-primary inline-flex items-center gap-2">
                  <Plus className="w-4 h-4" />
                  添加设备
                </button>
              </motion.div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
