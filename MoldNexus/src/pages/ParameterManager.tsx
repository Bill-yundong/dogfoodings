import { Component, createEffect, createSignal, For } from 'solid-js';
import { Search, Filter, Download, Trash2, Eye, GitCompare, Database, Clock, Gauge, Thermometer } from 'lucide-solid';
import { format } from 'date-fns';
import { listSnapshots } from '@/db/snapshot';
import type { Snapshot } from '@/types';

const ParameterManager: Component = () => {
  const [snapshots, setSnapshots] = createSignal<Snapshot[]>([]);
  const [searchQuery, setSearchQuery] = createSignal('');
  const [selectedSnapshots, setSelectedSnapshots] = createSignal<Set<string>>(new Set<string>());
  const [showCompare, setShowCompare] = createSignal(false);

  createEffect(async () => {
    const data = await listSnapshots('demo', { limit: 50 });
    setSnapshots(data.length > 0 ? data : generateMockSnapshots());
  });

  const generateMockSnapshots = (): Snapshot[] => {
    const mock: Snapshot[] = [];
    for (let i = 1; i <= 20; i++) {
      mock.push({
        id: `snap-${i}`,
        simulationId: 'sim-001',
        parameterSetId: `param-${i}`,
        version: i,
        step: i * 100,
        fillTime: i * 0.5,
        fillPercentage: Math.min(100, i * 5),
        maxPressure: 50 + Math.random() * 50,
        avgTemperature: 180 + Math.random() * 40,
        flowFrontData: [],
        pressureWaveData: [],
        createdAt: Date.now() - i * 3600000,
      });
    }
    return mock;
  };

  const filteredSnapshots = () => {
    return snapshots().filter(s =>
      s.version.toString().includes(searchQuery()) ||
      s.fillPercentage.toFixed(1).includes(searchQuery())
    );
  };

  const toggleSelect = (id: string) => {
    const newSet = new Set(selectedSnapshots());
    if (newSet.has(id)) {
      newSet.delete(id);
    } else if (newSet.size < 2) {
      newSet.add(id);
    }
    setSelectedSnapshots(newSet);
    setShowCompare(newSet.size === 2);
  };

  const getSelectedSnapshotsData = () => {
    return snapshots().filter(s => selectedSnapshots().has(s.id));
  };

  return (
    <div class="space-y-6">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold text-gray-100">参数快照管理</h1>
          <p class="text-sm text-gray-400 mt-1">浏览、对比和管理历史参数版本</p>
        </div>
        <div class="flex items-center gap-3">
          <div class="relative">
            <Search class="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              placeholder="搜索快照..."
              value={searchQuery()}
              onInput={(e) => setSearchQuery(e.target.value)}
              class="w-64 pl-10 pr-4 py-2 bg-dark-100 border border-dark-100 rounded-lg text-sm text-gray-200 focus:outline-none focus:border-primary-500"
            />
          </div>
          <button 
            onClick={() => alert('筛选功能开发中...')}
            class="btn btn-secondary"
          >
            <Filter class="w-4 h-4" /> 筛选
          </button>
          <button 
            onClick={() => alert('导出功能开发中...')}
            class="btn btn-secondary"
          >
            <Download class="w-4 h-4" /> 导出
          </button>
        </div>
      </div>

      {showCompare() && (
        <div class="panel border-primary-500/50">
          <div class="panel-header">
            <span class="panel-title flex items-center gap-2">
              <GitCompare class="w-4 h-4 text-primary-400" />
              参数版本对比
            </span>
            <button
              onClick={() => {
                setSelectedSnapshots(new Set<string>());
                setShowCompare(false);
              }}
              class="text-gray-400 hover:text-gray-200"
            >
              关闭
            </button>
          </div>
          <div class="panel-content">
            <div class="grid grid-cols-2 gap-6">
              <For each={getSelectedSnapshotsData()}>
                {(snapshot) => (
                  <div class="bg-dark-100 rounded-lg p-4">
                    <div class="flex items-center justify-between mb-4">
                      <h4 class="font-semibold text-gray-200">版本 v{snapshot.version}</h4>
                      <span class="text-xs text-gray-500">{format(snapshot.createdAt, 'MM-dd HH:mm')}</span>
                    </div>
                    <div class="grid grid-cols-2 gap-3 text-sm">
                      <div class="flex items-center gap-2">
                        <Clock class="w-4 h-4 text-accent-cyan" />
                        <span class="text-gray-400">充填时间:</span>
                        <span class="font-mono text-gray-200">{snapshot.fillTime.toFixed(2)}s</span>
                      </div>
                      <div class="flex items-center gap-2">
                        <Gauge class="w-4 h-4 text-accent-green" />
                        <span class="text-gray-400">充填率:</span>
                        <span class="font-mono text-gray-200">{snapshot.fillPercentage.toFixed(1)}%</span>
                      </div>
                      <div class="flex items-center gap-2">
                        <Gauge class="w-4 h-4 text-accent-orange" />
                        <span class="text-gray-400">最大压力:</span>
                        <span class="font-mono text-gray-200">{snapshot.maxPressure.toFixed(2)}</span>
                      </div>
                      <div class="flex items-center gap-2">
                        <Thermometer class="w-4 h-4 text-accent-red" />
                        <span class="text-gray-400">平均温度:</span>
                        <span class="font-mono text-gray-200">{snapshot.avgTemperature.toFixed(1)}°C</span>
                      </div>
                    </div>
                  </div>
                )}
              </For>
            </div>
            <div class="mt-4 p-4 bg-dark-100 rounded-lg">
              <h5 class="text-sm font-medium text-gray-300 mb-3">参数差异分析</h5>
              <div class="space-y-2">
                <div class="flex items-center justify-between p-2 bg-dark-300 rounded">
                  <span class="text-sm text-gray-400">充填时间差异</span>
                  <span class="font-mono text-accent-orange">
                    +{Math.abs(getSelectedSnapshotsData()[0]?.fillTime - getSelectedSnapshotsData()[1]?.fillTime).toFixed(2)}s
                  </span>
                </div>
                <div class="flex items-center justify-between p-2 bg-dark-300 rounded">
                  <span class="text-sm text-gray-400">最大压力差异</span>
                  <span class="font-mono text-accent-cyan">
                    +{Math.abs(getSelectedSnapshotsData()[0]?.maxPressure - getSelectedSnapshotsData()[1]?.maxPressure).toFixed(2)}
                  </span>
                </div>
                <div class="flex items-center justify-between p-2 bg-dark-300 rounded">
                  <span class="text-sm text-gray-400">平均温度差异</span>
                  <span class="font-mono text-accent-red">
                    +{Math.abs(getSelectedSnapshotsData()[0]?.avgTemperature - getSelectedSnapshotsData()[1]?.avgTemperature).toFixed(1)}°C
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div class="panel">
        <div class="panel-header">
          <span class="panel-title flex items-center gap-2">
            <Database class="w-4 h-4 text-primary-400" />
            快照列表
            <span class="text-xs text-gray-500">({filteredSnapshots().length} 条记录)</span>
          </span>
          {selectedSnapshots().size > 0 && (
            <span class="text-xs text-primary-400">
              已选择 {selectedSnapshots().size} 个版本进行对比
            </span>
          )}
        </div>
        <div class="overflow-x-auto">
          <table class="data-grid">
            <thead>
              <tr>
                <th class="w-12">选择</th>
                <th>版本</th>
                <th>步数</th>
                <th>充填时间</th>
                <th>充填率</th>
                <th>最大压力</th>
                <th>平均温度</th>
                <th>创建时间</th>
                <th class="w-24">操作</th>
              </tr>
            </thead>
            <tbody>
              <For each={filteredSnapshots()}>
                {(snapshot) => (
                  <tr class={selectedSnapshots().has(snapshot.id) ? 'bg-primary-600/10' : ''}>
                    <td>
                      <input
                        type="checkbox"
                        checked={selectedSnapshots().has(snapshot.id)}
                        onChange={() => toggleSelect(snapshot.id)}
                        class="w-4 h-4 accent-primary-500"
                      />
                    </td>
                    <td>
                      <span class="inline-flex items-center gap-1.5">
                        <span class="w-2 h-2 rounded-full bg-accent-cyan" />
                        <span class="font-mono font-medium">v{snapshot.version}</span>
                      </span>
                    </td>
                    <td class="font-mono">{snapshot.step}</td>
                    <td class="font-mono">{snapshot.fillTime.toFixed(2)}s</td>
                    <td>
                      <div class="flex items-center gap-2">
                        <div class="w-20 h-1.5 bg-dark-100 rounded-full overflow-hidden">
                          <div
                            class="h-full bg-accent-green"
                            style={{ width: `${snapshot.fillPercentage}%` }}
                          />
                        </div>
                        <span class="font-mono text-xs">{snapshot.fillPercentage.toFixed(1)}%</span>
                      </div>
                    </td>
                    <td class="font-mono">{snapshot.maxPressure.toFixed(2)}</td>
                    <td class="font-mono">{snapshot.avgTemperature.toFixed(1)}°C</td>
                    <td class="text-gray-500 text-xs">
                      {format(snapshot.createdAt, 'yyyy-MM-dd HH:mm:ss')}
                    </td>
                    <td>
                      <div class="flex items-center gap-1">
                        <button class="p-1.5 text-gray-400 hover:text-accent-cyan rounded transition-colors">
                          <Eye class="w-4 h-4" />
                        </button>
                        <button class="p-1.5 text-gray-400 hover:text-accent-red rounded transition-colors">
                          <Trash2 class="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )}
              </For>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ParameterManager;
