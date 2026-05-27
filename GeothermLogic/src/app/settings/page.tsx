'use client';

import AppLayout from '../AppLayout';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { Settings as SettingsIcon, Users, Sliders, Key, Shield, Bell, Copy, RefreshCw, Check, Eye, EyeOff } from 'lucide-react';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('general');
  const [apiKeys, setApiKeys] = useState({
    energy: {
      key: 'sk-live-7f9a2c3e8b1d5f0a4e2c6a8b0c2d4e6f',
      visible: false,
    },
    operations: {
      key: 'sk-live-3c8e1d5f0a4e2c6a8b0c2d4e6f7f9a2b',
      visible: false,
    },
  });
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleCopyKey = async (keyType: 'energy' | 'operations') => {
    try {
      await navigator.clipboard.writeText(apiKeys[keyType].key);
      setCopiedKey(keyType);
      setTimeout(() => setCopiedKey(null), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const handleRegenerateKey = (keyType: 'energy' | 'operations') => {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let newKey = 'sk-live-';
    for (let i = 0; i < 32; i++) {
      newKey += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setApiKeys((prev) => ({
      ...prev,
      [keyType]: {
        ...prev[keyType],
        key: newKey,
      },
    }));
  };

  const toggleKeyVisibility = (keyType: 'energy' | 'operations') => {
    setApiKeys((prev) => ({
      ...prev,
      [keyType]: {
        ...prev[keyType],
        visible: !prev[keyType].visible,
      },
    }));
  };

  const tabs = [
    { id: 'general', label: '通用设置', icon: SettingsIcon },
    { id: 'users', label: '用户管理', icon: Users },
    { id: 'parameters', label: '参数配置', icon: Sliders },
    { id: 'api', label: 'API 密钥', icon: Key },
  ];

  const users = [
    { id: 1, name: '张三', email: 'zhang@example.com', role: '系统管理员', status: 'active' },
    { id: 2, name: '李四', email: 'li@example.com', role: '暖通工程师', status: 'active' },
    { id: 3, name: '王五', email: 'wang@example.com', role: '能源专家', status: 'inactive' },
  ];

  const parameters = [
    { name: '土壤导热系数', value: '2.5', unit: 'W/m·K', description: '默认土壤热传导系数' },
    { name: '流体比热容', value: '4186', unit: 'J/kg·K', description: '循环流体比热容' },
    { name: '热扩散率', value: '0.85', unit: 'm²/s', description: '土壤热扩散率' },
    { name: '地热梯度', value: '0.035', unit: '°C/m', description: '地热温度梯度' },
  ];

  return (
    <AppLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-white mb-2">系统设置</h1>
          <p className="text-gray-400">配置系统参数、管理用户和 API 密钥</p>
        </div>

        <div className="flex gap-2 mb-6">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-800/50 text-gray-400 hover:bg-gray-700/50'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'general' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gray-800/50 rounded-xl border border-gray-700/50 p-6"
          >
            <h3 className="text-lg font-semibold text-white mb-6">通用设置</h3>
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">系统名称</label>
                <input
                  type="text"
                  defaultValue="GeothermLogic 地热能源管理系统"
                  className="w-full px-4 py-3 bg-gray-900/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">数据刷新间隔 (秒)</label>
                <input
                  type="number"
                  defaultValue="30"
                  className="w-full px-4 py-3 bg-gray-900/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-primary-500"
                />
              </div>
              <div className="flex items-center justify-between py-4 border-t border-gray-700">
                <div>
                  <p className="text-sm font-medium text-white">启用本地缓存</p>
                  <p className="text-xs text-gray-400">使用 IndexedDB 缓存历史数据</p>
                </div>
                <button className="w-12 h-6 bg-primary-600 rounded-full relative">
                  <div className="w-5 h-5 bg-white rounded-full absolute right-0.5 top-0.5" />
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'users' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gray-800/50 rounded-xl border border-gray-700/50 p-6"
          >
            <h3 className="text-lg font-semibold text-white mb-6">用户管理</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-sm text-gray-400 border-b border-gray-700">
                    <th className="pb-3">用户</th>
                    <th className="pb-3">邮箱</th>
                    <th className="pb-3">角色</th>
                    <th className="pb-3">状态</th>
                    <th className="pb-3">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700/50">
                  {users.map((user) => (
                    <tr key={user.id} className="text-sm">
                      <td className="py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary-600 flex items-center justify-center text-white text-sm">
                            {user.name.charAt(0)}
                          </div>
                          <span className="text-white">{user.name}</span>
                        </div>
                      </td>
                      <td className="py-3 text-gray-400">{user.email}</td>
                      <td className="py-3">
                        <span className="px-2 py-1 bg-primary-600/20 text-primary-500 rounded-full text-xs">
                          {user.role}
                        </span>
                      </td>
                      <td className="py-3">
                        <span className={`inline-flex items-center gap-1 text-xs ${
                          user.status === 'active' ? 'text-green-500' : 'text-gray-500'
                        }`}>
                          <span className={`w-2 h-2 rounded-full ${user.status === 'active' ? 'bg-green-500' : 'bg-gray-500'}`} />
                          {user.status === 'active' ? '活跃' : '停用'}
                        </span>
                      </td>
                      <td className="py-3">
                        <button className="text-gray-400 hover:text-white text-sm">编辑</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}

        {activeTab === 'parameters' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gray-800/50 rounded-xl border border-gray-700/50 p-6"
          >
            <h3 className="text-lg font-semibold text-white mb-6">参数配置</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {parameters.map((param) => (
                <div key={param.name} className="bg-gray-900/50 rounded-lg p-4">
                  <label className="block text-sm font-medium text-gray-300 mb-2">{param.name}</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      step="0.01"
                      defaultValue={param.value}
                      className="flex-1 px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-primary-500"
                    />
                    <span className="text-sm text-gray-400 w-20">{param.unit}</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">{param.description}</p>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {activeTab === 'api' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gray-800/50 rounded-xl border border-gray-700/50 p-6"
          >
            <h3 className="text-lg font-semibold text-white mb-6">API 密钥管理</h3>
            <div className="space-y-4">
              <div className="bg-gray-900/50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-white">建筑节能系统 API</span>
                  <span className="text-xs px-2 py-1 bg-green-500/20 text-green-500 rounded-full">已启用</span>
                </div>
                <div className="flex items-center gap-2 mb-3">
                  <p className="text-sm text-gray-400 font-mono flex-1">
                    {apiKeys.energy.visible ? apiKeys.energy.key : '•••••••••••••••••••••••••••••••'}
                  </p>
                  <button
                    onClick={() => toggleKeyVisibility('energy')}
                    className="p-1 text-gray-400 hover:text-white rounded hover:bg-gray-700"
                    title={apiKeys.energy.visible ? '隐藏密钥' : '显示密钥'}
                  >
                    {apiKeys.energy.visible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleCopyKey('energy')}
                    className="px-3 py-1 text-xs bg-gray-700 text-gray-300 rounded hover:bg-gray-600 flex items-center gap-1 transition-colors"
                  >
                    {copiedKey === 'energy' ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                    {copiedKey === 'energy' ? '已复制' : '复制'}
                  </button>
                  <button
                    onClick={() => handleRegenerateKey('energy')}
                    className="px-3 py-1 text-xs bg-gray-700 text-gray-300 rounded hover:bg-gray-600 flex items-center gap-1 transition-colors"
                  >
                    <RefreshCw className="w-3 h-3" />
                    重新生成
                  </button>
                </div>
              </div>
              <div className="bg-gray-900/50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-white">运维系统 API</span>
                  <span className="text-xs px-2 py-1 bg-green-500/20 text-green-500 rounded-full">已启用</span>
                </div>
                <div className="flex items-center gap-2 mb-3">
                  <p className="text-sm text-gray-400 font-mono flex-1">
                    {apiKeys.operations.visible ? apiKeys.operations.key : '•••••••••••••••••••••••••••••••'}
                  </p>
                  <button
                    onClick={() => toggleKeyVisibility('operations')}
                    className="p-1 text-gray-400 hover:text-white rounded hover:bg-gray-700"
                    title={apiKeys.operations.visible ? '隐藏密钥' : '显示密钥'}
                  >
                    {apiKeys.operations.visible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleCopyKey('operations')}
                    className="px-3 py-1 text-xs bg-gray-700 text-gray-300 rounded hover:bg-gray-600 flex items-center gap-1 transition-colors"
                  >
                    {copiedKey === 'operations' ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                    {copiedKey === 'operations' ? '已复制' : '复制'}
                  </button>
                  <button
                    onClick={() => handleRegenerateKey('operations')}
                    className="px-3 py-1 text-xs bg-gray-700 text-gray-300 rounded hover:bg-gray-600 flex items-center gap-1 transition-colors"
                  >
                    <RefreshCw className="w-3 h-3" />
                    重新生成
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </AppLayout>
  );
}
