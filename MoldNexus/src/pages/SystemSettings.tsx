import { Component, createSignal } from 'solid-js';
import { User, Bell, Database, Palette, Save, RotateCcw, Trash2 } from 'lucide-solid';
import { clearAllData } from '@/db';

const themes = [
  { name: '深蓝（默认）', color: '#1e40af', cssVar: '#3b82f6' },
  { name: '青绿', color: '#0891b2', cssVar: '#06b6d4' },
  { name: '紫色', color: '#7c3aed', cssVar: '#8b5cf6' },
  { name: '橙色', color: '#ea580c', cssVar: '#f97316' },
];

const SystemSettings: Component = () => {
  const [activeTab, setActiveTab] = createSignal<'profile' | 'notifications' | 'database' | 'appearance'>('profile');
  const [autoSave, setAutoSave] = createSignal(true);
  const [snapshotInterval, setSnapshotInterval] = createSignal(100);
  const [emailNotifications, setEmailNotifications] = createSignal(true);
  const [pushNotifications, setPushNotifications] = createSignal(false);
  const [showGrid, setShowGrid] = createSignal(true);
  const [animationQuality, setAnimationQuality] = createSignal<'low' | 'medium' | 'high'>('high');
  const [activeTheme, setActiveTheme] = createSignal(0);

  const tabs = [
    { id: 'profile' as const, label: '个人设置', icon: User },
    { id: 'notifications' as const, label: '通知设置', icon: Bell },
    { id: 'database' as const, label: '数据管理', icon: Database },
    { id: 'appearance' as const, label: '界面设置', icon: Palette },
  ];

  const handleClearData = async () => {
    if (confirm('确定要清空所有数据吗？此操作不可恢复！')) {
      try {
        await clearAllData();
        alert('数据已清空');
      } catch (error) {
        console.error('Failed to clear data:', error);
        alert('清空数据失败，请查看控制台');
      }
    }
  };

  const handleExportData = () => {
    alert('数据导出功能开发中...');
  };

  return (
    <div class="space-y-6">
      <div>
        <h1 class="text-2xl font-bold text-gray-100">系统设置</h1>
        <p class="text-sm text-gray-400 mt-1">管理您的个人偏好和系统配置</p>
      </div>

      <div class="flex gap-6">
        <div class="w-48 flex-shrink-0">
          <div class="panel">
            <div class="p-2">
              {tabs.map((tab) => (
                <button
                  onClick={() => setActiveTab(tab.id)}
                  class={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
                    activeTab() === tab.id
                      ? 'bg-primary-600 text-white'
                      : 'text-gray-400 hover:bg-dark-100 hover:text-gray-200'
                  }`}
                >
                  <tab.icon class="w-4 h-4" />
                  <span class="text-sm">{tab.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div class="flex-1">
          <div class="panel">
            {activeTab() === 'profile' && (
              <div class="panel-content space-y-6">
                <h3 class="text-lg font-semibold text-gray-100">个人信息</h3>
                <div class="grid grid-cols-2 gap-4">
                  <div>
                    <label class="block text-sm text-gray-300 mb-1.5">用户名</label>
                    <input type="text" value="张工程师" class="input" />
                  </div>
                  <div>
                    <label class="block text-sm text-gray-300 mb-1.5">邮箱</label>
                    <input type="email" value="zhang@moldnexus.com" class="input" />
                  </div>
                  <div>
                    <label class="block text-sm text-gray-300 mb-1.5">角色</label>
                    <input type="text" value="工艺工程师" class="input" disabled />
                  </div>
                  <div>
                    <label class="block text-sm text-gray-300 mb-1.5">部门</label>
                    <input type="text" value="工艺研发部" class="input" />
                  </div>
                </div>

                <div class="pt-4 border-t border-dark-100">
                  <h3 class="text-lg font-semibold text-gray-100 mb-4">模拟设置</h3>
                  <div class="space-y-4">
                    <div class="flex items-center justify-between">
                      <div>
                        <p class="text-sm text-gray-200">自动保存快照</p>
                        <p class="text-xs text-gray-500">模拟过程中自动保存参数快照</p>
                      </div>
                      <button
                        onClick={() => setAutoSave(!autoSave())}
                        class={`w-12 h-6 rounded-full transition-colors ${
                          autoSave() ? 'bg-primary-500' : 'bg-dark-100'
                        }`}
                      >
                        <div class={`w-5 h-5 bg-white rounded-full transition-transform ${
                          autoSave() ? 'translate-x-6' : 'translate-x-0.5'
                        }`} />
                      </button>
                    </div>
                    <div>
                      <div class="flex items-center justify-between mb-1.5">
                        <div>
                          <p class="text-sm text-gray-200">快照保存间隔</p>
                          <p class="text-xs text-gray-500">每 N 步保存一次快照</p>
                        </div>
                        <span class="font-mono text-accent-cyan">{snapshotInterval()} 步</span>
                      </div>
                      <input
                        type="range"
                        min="10"
                        max="500"
                        step="10"
                        value={snapshotInterval()}
                        onInput={(e) => setSnapshotInterval(Number(e.target.value))}
                        class="slider"
                      />
                    </div>
                  </div>
                </div>

                <div class="flex justify-end gap-3 pt-4 border-t border-dark-100">
                  <button class="btn btn-secondary">
                    <RotateCcw class="w-4 h-4" /> 重置
                  </button>
                  <button class="btn btn-primary">
                    <Save class="w-4 h-4" /> 保存更改
                  </button>
                </div>
              </div>
            )}

            {activeTab() === 'notifications' && (
              <div class="panel-content space-y-6">
                <h3 class="text-lg font-semibold text-gray-100">通知偏好</h3>
                <div class="space-y-4">
                  <div class="flex items-center justify-between p-4 bg-dark-100 rounded-lg">
                    <div>
                      <p class="text-sm text-gray-200">邮件通知</p>
                      <p class="text-xs text-gray-500">接收任务分配、评论提及等邮件通知</p>
                    </div>
                    <button
                      onClick={() => setEmailNotifications(!emailNotifications())}
                      class={`w-12 h-6 rounded-full transition-colors ${
                        emailNotifications() ? 'bg-primary-500' : 'bg-dark-300'
                      }`}
                    >
                      <div class={`w-5 h-5 bg-white rounded-full transition-transform ${
                        emailNotifications() ? 'translate-x-6' : 'translate-x-0.5'
                      }`} />
                    </button>
                  </div>
                  <div class="flex items-center justify-between p-4 bg-dark-100 rounded-lg">
                    <div>
                      <p class="text-sm text-gray-200">推送通知</p>
                      <p class="text-xs text-gray-500">接收浏览器推送通知</p>
                    </div>
                    <button
                      onClick={() => setPushNotifications(!pushNotifications())}
                      class={`w-12 h-6 rounded-full transition-colors ${
                        pushNotifications() ? 'bg-primary-500' : 'bg-dark-300'
                      }`}
                    >
                      <div class={`w-5 h-5 bg-white rounded-full transition-transform ${
                        pushNotifications() ? 'translate-x-6' : 'translate-x-0.5'
                      }`} />
                    </button>
                  </div>
                </div>

                <div class="pt-4 border-t border-dark-100">
                  <h3 class="text-lg font-semibold text-gray-100 mb-4">通知事件</h3>
                  <div class="space-y-3">
                    {['模拟完成', '缺陷预警', '任务更新', '评论提及', '参数变更'].map((event) => (
                      <div class="flex items-center justify-between">
                        <span class="text-sm text-gray-300">{event}</span>
                        <button class="w-10 h-5 rounded-full bg-primary-500">
                          <div class="w-4 h-4 bg-white rounded-full translate-x-5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab() === 'database' && (
              <div class="panel-content space-y-6">
                <h3 class="text-lg font-semibold text-gray-100">数据管理</h3>
                <div class="grid grid-cols-3 gap-4">
                  <div class="p-4 bg-dark-100 rounded-lg text-center">
                    <Database class="w-8 h-8 text-primary-400 mx-auto mb-2" />
                    <p class="text-2xl font-bold text-gray-100">1,234</p>
                    <p class="text-xs text-gray-500">模拟任务</p>
                  </div>
                  <div class="p-4 bg-dark-100 rounded-lg text-center">
                    <Database class="w-8 h-8 text-accent-cyan mx-auto mb-2" />
                    <p class="text-2xl font-bold text-gray-100">12,456</p>
                    <p class="text-xs text-gray-500">参数快照</p>
                  </div>
                  <div class="p-4 bg-dark-100 rounded-lg text-center">
                    <Database class="w-8 h-8 text-accent-orange mx-auto mb-2" />
                    <p class="text-2xl font-bold text-gray-100">24.5 MB</p>
                    <p class="text-xs text-gray-500">存储空间</p>
                  </div>
                </div>

                <div class="space-y-4">
                  <button onClick={handleExportData} class="w-full p-4 bg-dark-100 rounded-lg flex items-center justify-between hover:bg-dark-100/80 transition-colors">
                    <div class="flex items-center gap-3">
                      <div class="w-10 h-10 bg-accent-green/20 rounded-lg flex items-center justify-center">
                        <Save class="w-5 h-5 text-accent-green" />
                      </div>
                      <div class="text-left">
                        <p class="text-sm text-gray-200">导出所有数据</p>
                        <p class="text-xs text-gray-500">将所有数据导出为 JSON 格式</p>
                      </div>
                    </div>
                    <span class="text-gray-400">→</span>
                  </button>

                  <button onClick={handleClearData} class="w-full p-4 bg-accent-red/10 border border-accent-red/30 rounded-lg flex items-center justify-between hover:bg-accent-red/20 transition-colors">
                    <div class="flex items-center gap-3">
                      <div class="w-10 h-10 bg-accent-red/20 rounded-lg flex items-center justify-center">
                        <Trash2 class="w-5 h-5 text-accent-red" />
                      </div>
                      <div class="text-left">
                        <p class="text-sm text-accent-red">清空所有数据</p>
                        <p class="text-xs text-gray-500">删除所有模拟数据和快照（不可恢复）</p>
                      </div>
                    </div>
                    <span class="text-accent-red">⚠️</span>
                  </button>
                </div>
              </div>
            )}

            {activeTab() === 'appearance' && (
              <div class="panel-content space-y-6">
                <h3 class="text-lg font-semibold text-gray-100">界面设置</h3>
                <div class="space-y-4">
                  <div class="flex items-center justify-between">
                    <div>
                      <p class="text-sm text-gray-200">显示网格</p>
                      <p class="text-xs text-gray-500">在模拟画布上显示网格线</p>
                    </div>
                    <button
                      onClick={() => setShowGrid(!showGrid())}
                      class={`w-12 h-6 rounded-full transition-colors ${
                        showGrid() ? 'bg-primary-500' : 'bg-dark-100'
                      }`}
                    >
                      <div class={`w-5 h-5 bg-white rounded-full transition-transform ${
                        showGrid() ? 'translate-x-6' : 'translate-x-0.5'
                      }`} />
                    </button>
                  </div>
                  <div>
                    <p class="text-sm text-gray-200 mb-2">动画质量</p>
                    <div class="flex gap-2">
                      {(['low', 'medium', 'high'] as const).map((quality) => (
                        <button
                          onClick={() => setAnimationQuality(quality)}
                          class={`flex-1 py-2 rounded-lg text-sm transition-all ${
                            animationQuality() === quality
                              ? 'bg-primary-600 text-white'
                              : 'bg-dark-100 text-gray-400 hover:text-gray-200'
                          }`}
                        >
                          {quality === 'low' ? '低（性能优先）' : quality === 'medium' ? '中（平衡）' : '高（效果优先）'}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div class="pt-4 border-t border-dark-100">
                  <h3 class="text-lg font-semibold text-gray-100 mb-4">主题颜色</h3>
                  <div class="flex gap-3">
                    {themes.map((theme, index) => (
                      <button 
                        onClick={() => {
                          setActiveTheme(index);
                          document.documentElement.style.setProperty('--color-primary', theme.cssVar);
                          alert(`已切换到"${theme.name}"主题`);
                        }}
                        class="flex flex-col items-center gap-1.5 group"
                      >
                        <div
                          class={`w-12 h-12 rounded-xl border-2 transition-all group-hover:scale-110 ${activeTheme() === index ? 'border-white ring-2 ring-primary-500' : 'border-transparent hover:border-gray-400'}`}
                          style={{ 'background-color': theme.color }}
                        />
                        <span class={`text-xs ${activeTheme() === index ? 'text-primary-400' : 'text-gray-500 group-hover:text-gray-300'}`}>{theme.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SystemSettings;
