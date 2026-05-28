'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Sidebar from '@/components/Sidebar';
import Modal from '@/components/Modal';
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
  CheckCircle,
  Search,
  Loader2,
} from 'lucide-react';
import Image from 'next/image';
import type { Device } from '@/types';

export default function DevicesPage() {
  const { loadMockData, devices, selectedPet, updateDevice } = usePetLinkStore();
  const [showAddModal, setShowAddModal] = useState(false);
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showReconnectModal, setShowReconnectModal] = useState(false);
  const [activeDevice, setActiveDevice] = useState<Device | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncComplete, setSyncComplete] = useState(false);
  const [newDeviceName, setNewDeviceName] = useState('');
  const [newDeviceMac, setNewDeviceMac] = useState('');
  const [addComplete, setAddComplete] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [settingsFreq, setSettingsFreq] = useState('30');
  const [settingsAlert, setSettingsAlert] = useState(true);
  const [reconnecting, setReconnecting] = useState(false);
  const [reconnectComplete, setReconnectComplete] = useState(false);

  useEffect(() => {
    loadMockData();
  }, [loadMockData]);

  if (!selectedPet) return null;

  const getBatteryColor = (level: number) => {
    if (level > 50) return 'text-green-600';
    if (level > 20) return 'text-yellow-600';
    return 'text-red-600';
  };

  const handleSync = (device: Device) => {
    setActiveDevice(device);
    setSyncing(true);
    setSyncComplete(false);
    setShowSyncModal(true);
    setTimeout(() => {
      setSyncing(false);
      setSyncComplete(true);
      updateDevice({ ...device, lastSync: Date.now() });
    }, 2000);
  };

  const handleSettings = (device: Device) => {
    setActiveDevice(device);
    setSettingsFreq('30');
    setSettingsAlert(true);
    setShowSettingsModal(true);
  };

  const handleReconnect = (device: Device) => {
    setActiveDevice(device);
    setReconnecting(true);
    setReconnectComplete(false);
    setShowReconnectModal(true);
    setTimeout(() => {
      setReconnecting(false);
      setReconnectComplete(true);
      updateDevice({ ...device, connected: true, lastSync: Date.now() });
    }, 2500);
  };

  const handleAddDevice = () => {
    setScanning(true);
    setAddComplete(false);
    setNewDeviceName('');
    setNewDeviceMac('');
    setTimeout(() => {
      setScanning(false);
      setNewDeviceName('PetLink Collar Pro');
      setNewDeviceMac('FF:EE:DD:CC:BB:AA');
    }, 2000);
  };

  const confirmAddDevice = () => {
    const newDevice: Device = {
      id: `device-${Date.now()}`,
      petId: selectedPet.id,
      name: newDeviceName,
      type: 'collar',
      macAddress: newDeviceMac,
      batteryLevel: 100,
      connected: true,
      lastSync: Date.now(),
    };
    updateDevice(newDevice);
    setAddComplete(true);
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
            <button
              onClick={() => {
                setShowAddModal(true);
                setScanning(false);
                setAddComplete(false);
                setNewDeviceName('');
                setNewDeviceMac('');
              }}
              className="btn-primary flex items-center gap-2"
            >
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
                      <button
                        onClick={() => handleSync(device)}
                        className="btn-secondary flex items-center gap-2"
                      >
                        <RefreshCw className="w-4 h-4" />
                        立即同步
                      </button>
                      <button
                        onClick={() => handleSettings(device)}
                        className="btn-secondary flex items-center gap-2"
                      >
                        <Settings className="w-4 h-4" />
                        设备设置
                      </button>
                      {!device.connected && (
                        <button
                          onClick={() => handleReconnect(device)}
                          className="btn-primary flex items-center gap-2"
                        >
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
                <button
                  onClick={() => {
                    setShowAddModal(true);
                    setScanning(false);
                    setAddComplete(false);
                  }}
                  className="btn-primary inline-flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  添加设备
                </button>
              </motion.div>
            )}
          </div>
        </div>
      </main>

      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="添加设备"
        maxWidth="max-w-md"
      >
        {addComplete ? (
          <div className="text-center py-6">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h3 className="font-poppins font-semibold text-lg text-slate-800 mb-2">
              设备添加成功
            </h3>
            <p className="text-slate-500 mb-6">
              {newDeviceName} 已成功绑定到 {selectedPet?.name}
            </p>
            <button
              onClick={() => setShowAddModal(false)}
              className="btn-primary"
            >
              完成
            </button>
          </div>
        ) : (
          <div>
            {scanning ? (
              <div className="text-center py-8">
                <Loader2 className="w-12 h-12 text-primary-600 mx-auto mb-4 animate-spin" />
                <p className="text-slate-600 font-medium">正在扫描附近设备...</p>
                <p className="text-sm text-slate-400 mt-2">请确保设备已开机并处于配对模式</p>
              </div>
            ) : !newDeviceName ? (
              <div>
                <p className="text-slate-600 mb-6">请选择要添加的设备类型：</p>
                <button
                  onClick={handleAddDevice}
                  className="w-full p-4 card card-hover flex items-center gap-4 mb-3"
                >
                  <div className="w-12 h-12 bg-primary-50 rounded-xl flex items-center justify-center">
                    <Watch className="w-6 h-6 text-primary-600" />
                  </div>
                  <div className="text-left">
                    <p className="font-medium text-slate-800">智能项圈</p>
                    <p className="text-sm text-slate-500">步态监测、心率、体温</p>
                  </div>
                </button>
              </div>
            ) : (
              <div>
                <p className="text-slate-600 mb-4">发现设备：</p>
                <div className="p-4 bg-slate-50 rounded-xl mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary-50 rounded-lg flex items-center justify-center">
                      <Watch className="w-5 h-5 text-primary-600" />
                    </div>
                    <div>
                      <p className="font-medium text-slate-800">{newDeviceName}</p>
                      <p className="text-sm text-slate-500">MAC: {newDeviceMac}</p>
                    </div>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowAddModal(false)}
                    className="btn-secondary flex-1"
                  >
                    取消
                  </button>
                  <button
                    onClick={confirmAddDevice}
                    className="btn-primary flex-1 flex items-center justify-center gap-2"
                  >
                    <Bluetooth className="w-4 h-4" />
                    绑定设备
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      <Modal
        isOpen={showSyncModal}
        onClose={() => setShowSyncModal(false)}
        title="数据同步"
        maxWidth="max-w-md"
      >
        {syncComplete ? (
          <div className="text-center py-6">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h3 className="font-poppins font-semibold text-lg text-slate-800 mb-2">
              同步完成
            </h3>
            <p className="text-slate-500 mb-2">
              {activeDevice?.name} 数据已同步
            </p>
            <p className="text-sm text-slate-400 mb-6">
              同步时间: {new Date().toLocaleTimeString('zh-CN')}
            </p>
            <button
              onClick={() => setShowSyncModal(false)}
              className="btn-primary"
            >
              完成
            </button>
          </div>
        ) : (
          <div className="text-center py-8">
            <Loader2 className="w-12 h-12 text-primary-600 mx-auto mb-4 animate-spin" />
            <p className="text-slate-600 font-medium">正在同步数据...</p>
            <p className="text-sm text-slate-400 mt-2">
              {activeDevice?.name} - 请勿关闭页面
            </p>
          </div>
        )}
      </Modal>

      <Modal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        title={`设备设置 - ${activeDevice?.name || ''}`}
        maxWidth="max-w-md"
      >
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">数据采集频率</label>
            <select
              value={settingsFreq}
              onChange={(e) => setSettingsFreq(e.target.value)}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-200 focus:border-primary-400 bg-white"
            >
              <option value="10">每 10 秒</option>
              <option value="30">每 30 秒</option>
              <option value="60">每 1 分钟</option>
              <option value="300">每 5 分钟</option>
            </select>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-700">异常告警推送</p>
              <p className="text-xs text-slate-500">检测到异常时自动推送通知</p>
            </div>
            <button
              onClick={() => setSettingsAlert(!settingsAlert)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                settingsAlert ? 'bg-primary-600' : 'bg-slate-300'
              }`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                settingsAlert ? 'translate-x-6' : 'translate-x-1'
              }`} />
            </button>
          </div>
          <div className="pt-4 border-t border-slate-100">
            <p className="text-sm text-slate-500 mb-2">设备信息</p>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">设备型号</span>
                <span className="text-slate-800">{activeDevice?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">固件版本</span>
                <span className="text-slate-800">v2.1.0</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">MAC 地址</span>
                <span className="text-slate-800 font-mono">{activeDevice?.macAddress}</span>
              </div>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setShowSettingsModal(false)}
              className="btn-secondary flex-1"
            >
              取消
            </button>
            <button
              onClick={() => setShowSettingsModal(false)}
              className="btn-primary flex-1"
            >
              保存设置
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={showReconnectModal}
        onClose={() => setShowReconnectModal(false)}
        title="重新连接设备"
        maxWidth="max-w-md"
      >
        {reconnectComplete ? (
          <div className="text-center py-6">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h3 className="font-poppins font-semibold text-lg text-slate-800 mb-2">
              连接成功
            </h3>
            <p className="text-slate-500 mb-6">
              {activeDevice?.name} 已重新连接
            </p>
            <button
              onClick={() => setShowReconnectModal(false)}
              className="btn-primary"
            >
              完成
            </button>
          </div>
        ) : (
          <div className="text-center py-8">
            <Loader2 className="w-12 h-12 text-primary-600 mx-auto mb-4 animate-spin" />
            <p className="text-slate-600 font-medium">正在连接 {activeDevice?.name}...</p>
            <p className="text-sm text-slate-400 mt-2">请确保设备在蓝牙范围内</p>
          </div>
        )}
      </Modal>
    </div>
  );
}
