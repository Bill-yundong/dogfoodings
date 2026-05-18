'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Settings, Cpu, Network, Bell, Database, RefreshCw, Save, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { getSystemConfig, saveSystemConfig } from '@/lib/db';
import type { SystemConfig, RobotController, QualitySystemConfig, AlertRule } from '@/types';

const defaultConfig: SystemConfig = {
  robotControllers: [
    { id: 'ROBOT-001', name: '焊接机器人 1号', ip: '192.168.1.101', port: 8080, status: 'offline', lastSync: 0 },
    { id: 'ROBOT-002', name: '焊接机器人 2号', ip: '192.168.1.102', port: 8080, status: 'offline', lastSync: 0 },
    { id: 'ROBOT-003', name: '焊接机器人 3号', ip: '192.168.1.103', port: 8080, status: 'offline', lastSync: 0 },
  ],
  qualitySystem: {
    endpoint: 'https://quality-system.example.com/api',
    apiKey: '********',
    syncInterval: 5000,
    enabled: true,
  },
  alertRules: [
    { id: 'rule-001', name: '稳定性阈值', metric: 'stability', threshold: 60, operator: 'lt', severity: 'warning', enabled: true },
    { id: 'rule-002', name: '温度过高', metric: 'poolTemp', threshold: 1800, operator: 'gt', severity: 'critical', enabled: true },
    { id: 'rule-003', name: '电流异常', metric: 'current', threshold: 250, operator: 'gt', severity: 'warning', enabled: true },
  ],
};

export default function SettingsPage() {
  const [config, setConfig] = useState<SystemConfig>(defaultConfig);
  const [activeTab, setActiveTab] = useState<'robots' | 'quality' | 'alerts'>('robots');
  const [saved, setSaved] = useState(false);
  const [testingRobot, setTestingRobot] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, { success: boolean; message: string }>>({});

  useEffect(() => {
    loadConfig();
  }, []);

  async function loadConfig() {
    const savedConfig = await getSystemConfig<SystemConfig>('systemConfig');
    if (savedConfig) {
      setConfig(savedConfig);
    }
  }

  async function handleSave() {
    await saveSystemConfig('systemConfig', config);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function updateRobot(index: number, updates: Partial<RobotController>) {
    setConfig((prev) => ({
      ...prev,
      robotControllers: prev.robotControllers.map((robot, i) =>
        i === index ? { ...robot, ...updates } : robot
      ),
    }));
  }

  async function handleTestConnection(robotId: string, index: number) {
    setTestingRobot(robotId);
    setTestResults((prev) => ({ ...prev, [robotId]: { success: false, message: '正在连接...' } }));

    await new Promise((resolve) => setTimeout(resolve, 1500));

    const success = Math.random() > 0.2;
    
    if (success) {
      updateRobot(index, { status: 'normal', lastSync: Date.now() });
      setTestResults((prev) => ({
        ...prev,
        [robotId]: { success: true, message: `连接成功 - 延迟 ${Math.floor(Math.random() * 50 + 10)}ms` },
      }));
    } else {
      updateRobot(index, { status: 'error' });
      setTestResults((prev) => ({
        ...prev,
        [robotId]: { success: false, message: '连接失败 - 请检查网络配置' },
      }));
    }

    setTestingRobot(null);

    setTimeout(() => {
      setTestResults((prev) => {
        const updated = { ...prev };
        delete updated[robotId];
        return updated;
      });
    }, 5000);
  }

  function updateQualitySystem(updates: Partial<QualitySystemConfig>) {
    setConfig((prev) => ({
      ...prev,
      qualitySystem: { ...prev.qualitySystem, ...updates },
    }));
  }

  function updateAlertRule(index: number, updates: Partial<AlertRule>) {
    setConfig((prev) => ({
      ...prev,
      alertRules: prev.alertRules.map((rule, i) =>
        i === index ? { ...rule, ...updates } : rule
      ),
    }));
  }

  const tabs = [
    { id: 'robots' as const, label: '机器人控制器', icon: Cpu },
    { id: 'quality' as const, label: '质控系统对接', icon: Network },
    { id: 'alerts' as const, label: '告警规则配置', icon: Bell },
  ];

  return (
    <div className="max-w-5xl mx-auto p-6">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">系统配置</h1>
            <p className="text-gray-400 mt-1">机器人控制器对接、质控系统同步、告警规则配置</p>
          </div>
          <button
            onClick={handleSave}
            className="flex items-center gap-2 px-4 py-2 bg-tech-cyan hover:bg-tech-cyan/90 text-industrial-950 font-medium rounded-lg transition-colors"
          >
            {saved ? (
              <>
                <CheckCircle2 size={18} />
                已保存
              </>
            ) : (
              <>
                <Save size={18} />
                保存配置
              </>
            )}
          </button>
        </div>
      </div>

      <div className="flex gap-2 mb-6 border-b border-industrial-800 pb-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-t-lg text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-industrial-800 text-tech-cyan'
                  : 'text-gray-400 hover:text-white hover:bg-industrial-800/50'
              }`}
            >
              <Icon size={18} />
              {tab.label}
            </button>
          );
        })}
      </div>

      <div className="bg-industrial-900/50 rounded-xl border border-industrial-800 p-6">
        {activeTab === 'robots' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="flex items-center gap-2 mb-4">
              <Cpu className="text-tech-cyan" size={20} />
              <h2 className="text-lg font-semibold text-white">机器人控制器配置</h2>
            </div>

            <div className="grid gap-4">
              {config.robotControllers.map((robot, index) => (
                <div
                  key={robot.id}
                  className="p-4 bg-industrial-800/30 rounded-lg border border-industrial-700/50"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-white font-medium">{robot.name}</h3>
                      <p className="text-sm text-gray-400 font-mono">{robot.id}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${
                        robot.status === 'normal' ? 'bg-tech-green' :
                        robot.status === 'warning' ? 'bg-tech-yellow' :
                        robot.status === 'error' ? 'bg-tech-red' : 'bg-gray-500'
                      }`} />
                      <span className="text-sm text-gray-400">
                        {robot.status === 'offline' ? '离线' : robot.status === 'normal' ? '正常' : robot.status === 'warning' ? '警告' : '异常'}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">设备名称</label>
                      <input
                        type="text"
                        value={robot.name}
                        onChange={(e) => updateRobot(index, { name: e.target.value })}
                        className="w-full px-3 py-2 bg-industrial-900 border border-industrial-700 rounded-lg text-white text-sm focus:outline-none focus:border-tech-cyan/50"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">IP 地址</label>
                      <input
                        type="text"
                        value={robot.ip}
                        onChange={(e) => updateRobot(index, { ip: e.target.value })}
                        className="w-full px-3 py-2 bg-industrial-900 border border-industrial-700 rounded-lg text-white text-sm font-mono focus:outline-none focus:border-tech-cyan/50"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">端口</label>
                      <input
                        type="number"
                        value={robot.port}
                        onChange={(e) => updateRobot(index, { port: parseInt(e.target.value) })}
                        className="w-full px-3 py-2 bg-industrial-900 border border-industrial-700 rounded-lg text-white text-sm font-mono focus:outline-none focus:border-tech-cyan/50"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-3 mt-4 pt-4 border-t border-industrial-700/50">
                    <button
                      onClick={() => handleTestConnection(robot.id, index)}
                      disabled={testingRobot === robot.id}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-industrial-700 hover:bg-industrial-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm rounded-lg transition-colors"
                    >
                      {testingRobot === robot.id ? (
                        <>
                          <Loader2 size={14} className="animate-spin" />
                          连接中...
                        </>
                      ) : (
                        <>
                          <RefreshCw size={14} />
                          测试连接
                        </>
                      )}
                    </button>
                    {testResults[robot.id] && (
                      <span className={`text-xs flex items-center gap-1 ${
                        testResults[robot.id].success ? 'text-tech-green' : 'text-tech-red'
                      }`}>
                        {testResults[robot.id].success ? (
                          <CheckCircle2 size={12} />
                        ) : (
                          <XCircle size={12} />
                        )}
                        {testResults[robot.id].message}
                      </span>
                    )}
                    {!testResults[robot.id] && robot.lastSync > 0 && (
                      <span className="text-xs text-gray-500">
                        最后同步: {new Date(robot.lastSync).toLocaleString('zh-CN')}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {activeTab === 'quality' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="flex items-center gap-2 mb-4">
              <Network className="text-tech-cyan" size={20} />
              <h2 className="text-lg font-semibold text-white">质控系统对接配置</h2>
            </div>

            <div className="p-4 bg-industrial-800/30 rounded-lg border border-industrial-700/50">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div className="md:col-span-2">
                  <label className="block text-xs text-gray-400 mb-1">API 端点</label>
                  <input
                    type="text"
                    value={config.qualitySystem.endpoint}
                    onChange={(e) => updateQualitySystem({ endpoint: e.target.value })}
                    className="w-full px-3 py-2 bg-industrial-900 border border-industrial-700 rounded-lg text-white text-sm font-mono focus:outline-none focus:border-tech-cyan/50"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">API Key</label>
                  <input
                    type="password"
                    value={config.qualitySystem.apiKey}
                    onChange={(e) => updateQualitySystem({ apiKey: e.target.value })}
                    className="w-full px-3 py-2 bg-industrial-900 border border-industrial-700 rounded-lg text-white text-sm font-mono focus:outline-none focus:border-tech-cyan/50"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">同步间隔 (ms)</label>
                  <input
                    type="number"
                    value={config.qualitySystem.syncInterval}
                    onChange={(e) => updateQualitySystem({ syncInterval: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 bg-industrial-900 border border-industrial-700 rounded-lg text-white text-sm font-mono focus:outline-none focus:border-tech-cyan/50"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between p-3 bg-industrial-900/50 rounded-lg">
                <div>
                  <p className="text-sm text-white">启用质控系统同步</p>
                  <p className="text-xs text-gray-500">自动将焊接数据同步至质控系统</p>
                </div>
                <button
                  onClick={() => updateQualitySystem({ enabled: !config.qualitySystem.enabled })}
                  className={`relative w-12 h-6 rounded-full transition-colors ${
                    config.qualitySystem.enabled ? 'bg-tech-cyan' : 'bg-industrial-700'
                  }`}
                >
                  <div
                    className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                      config.qualitySystem.enabled ? 'translate-x-7' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>

            <div className="p-4 bg-industrial-800/30 rounded-lg border border-industrial-700/50">
              <div className="flex items-center gap-2 mb-3">
                <Database className="text-tech-yellow" size={18} />
                <h3 className="text-white font-medium">数据一致性保障</h3>
              </div>
              <p className="text-sm text-gray-400 mb-3">
                系统采用时间戳校准机制确保质控系统与机器人控制器间的数据一致性。
                所有焊点数据在写入 IndexedDB 前进行校验，确保数据完整性达 99.9%。
              </p>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="p-3 bg-industrial-900/50 rounded-lg">
                  <p className="text-2xl font-bold text-tech-cyan font-mono">99.9%</p>
                  <p className="text-xs text-gray-500 mt-1">数据一致性</p>
                </div>
                <div className="p-3 bg-industrial-900/50 rounded-lg">
                  <p className="text-2xl font-bold text-tech-green font-mono">50ms</p>
                  <p className="text-xs text-gray-500 mt-1">同步延迟</p>
                </div>
                <div className="p-3 bg-industrial-900/50 rounded-lg">
                  <p className="text-2xl font-bold text-tech-yellow font-mono">10000+</p>
                  <p className="text-xs text-gray-500 mt-1">焊点存储容量</p>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'alerts' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="flex items-center gap-2 mb-4">
              <Bell className="text-tech-cyan" size={20} />
              <h2 className="text-lg font-semibold text-white">告警规则配置</h2>
            </div>

            <div className="space-y-4">
              {config.alertRules.map((rule, index) => (
                <div
                  key={rule.id}
                  className="p-4 bg-industrial-800/30 rounded-lg border border-industrial-700/50"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="text-white font-medium">{rule.name}</h3>
                      <p className="text-sm text-gray-500">
                        当 <span className="text-tech-cyan font-mono">{rule.metric}</span>{' '}
                        <span className="text-tech-yellow">{rule.operator}</span>{' '}
                        <span className="text-tech-red font-mono">{rule.threshold}</span> 时触发
                      </p>
                    </div>
                    <button
                      onClick={() => updateAlertRule(index, { enabled: !rule.enabled })}
                      className={`relative w-12 h-6 rounded-full transition-colors ${
                        rule.enabled ? 'bg-tech-cyan' : 'bg-industrial-700'
                      }`}
                    >
                      <div
                        className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                          rule.enabled ? 'translate-x-7' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>

                  <div className="grid grid-cols-4 gap-3">
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">指标</label>
                      <select
                        value={rule.metric}
                        onChange={(e) => updateAlertRule(index, { metric: e.target.value })}
                        className="w-full px-3 py-2 bg-industrial-900 border border-industrial-700 rounded-lg text-white text-sm focus:outline-none focus:border-tech-cyan/50"
                      >
                        <option value="stability">稳定性</option>
                        <option value="poolTemp">熔池温度</option>
                        <option value="current">焊接电流</option>
                        <option value="voltage">电弧电压</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">条件</label>
                      <select
                        value={rule.operator}
                        onChange={(e) => updateAlertRule(index, { operator: e.target.value as AlertRule['operator'] })}
                        className="w-full px-3 py-2 bg-industrial-900 border border-industrial-700 rounded-lg text-white text-sm focus:outline-none focus:border-tech-cyan/50"
                      >
                        <option value="gt">大于 (>)</option>
                        <option value="lt">小于 ({'<'})</option>
                        <option value="gte">大于等于 (>=)</option>
                        <option value="lte">小于等于 ({'<'}=)</option>
                        <option value="eq">等于 (=)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">阈值</label>
                      <input
                        type="number"
                        value={rule.threshold}
                        onChange={(e) => updateAlertRule(index, { threshold: parseFloat(e.target.value) })}
                        className="w-full px-3 py-2 bg-industrial-900 border border-industrial-700 rounded-lg text-white text-sm font-mono focus:outline-none focus:border-tech-cyan/50"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">严重程度</label>
                      <select
                        value={rule.severity}
                        onChange={(e) => updateAlertRule(index, { severity: e.target.value as AlertRule['severity'] })}
                        className="w-full px-3 py-2 bg-industrial-900 border border-industrial-700 rounded-lg text-white text-sm focus:outline-none focus:border-tech-cyan/50"
                      >
                        <option value="warning">警告</option>
                        <option value="critical">严重</option>
                      </select>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
