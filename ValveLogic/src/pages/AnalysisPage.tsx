import React, { useEffect, useState } from 'react';
import { BarChart3, Download, Upload, Trash2, FileText } from 'lucide-react';
import { getAllSimulations, deleteSimulation, exportSimulationData, importSimulationData } from '../db/snapshot-repository';
import type { SimulationRecord } from '../db/indexed-db';

const AnalysisPage: React.FC = () => {
  const [simulations, setSimulations] = useState<SimulationRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSimulations();
  }, []);

  const loadSimulations = async () => {
    try {
      const data = await getAllSimulations();
      setSimulations(data);
    } catch (error) {
      console.error('Failed to load simulations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('确定要删除此仿真记录吗？')) {
      await deleteSimulation(id);
      loadSimulations();
    }
  };

  const handleExport = async (id: string) => {
    try {
      const data = await exportSimulationData(id);
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `simulation-${id}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const data = event.target?.result as string;
        await importSimulationData(data);
        loadSimulations();
      } catch (error) {
        console.error('Import failed:', error);
        alert('导入失败：无效的仿真数据文件');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('zh-CN');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">数据分析</h1>
          <p className="text-slate-400 text-sm mt-1">查看和管理历史仿真记录与压力快照</p>
        </div>
        <div className="flex items-center gap-3">
          <label className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm font-medium transition-all flex items-center gap-2 cursor-pointer">
            <Upload size={16} />
            导入
            <input type="file" accept=".json" onChange={handleImport} className="hidden" />
          </label>
        </div>
      </div>

      <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-slate-900/50 rounded-lg p-4">
            <p className="text-slate-400 text-sm mb-1">仿真总数</p>
            <p className="text-2xl font-bold text-white">{simulations.length}</p>
          </div>
          <div className="bg-slate-900/50 rounded-lg p-4">
            <p className="text-slate-400 text-sm mb-1">总快照数</p>
            <p className="text-2xl font-bold text-white">
              {simulations.reduce((sum, s) => sum + s.snapshotCount, 0)}
            </p>
          </div>
          <div className="bg-slate-900/50 rounded-lg p-4">
            <p className="text-slate-400 text-sm mb-1">总时长</p>
            <p className="text-2xl font-bold text-white">
              {simulations.reduce((sum, s) => sum + s.duration, 0).toFixed(1)}s
            </p>
          </div>
          <div className="bg-slate-900/50 rounded-lg p-4">
            <p className="text-slate-400 text-sm mb-1">存储占用</p>
            <p className="text-2xl font-bold text-cyan-400">-</p>
          </div>
        </div>

        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <FileText size={18} className="text-blue-400" />
          仿真记录
        </h2>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-slate-400">加载中...</p>
          </div>
        ) : simulations.length === 0 ? (
          <div className="text-center py-12">
            <BarChart3 className="mx-auto text-slate-500 mb-4" size={48} />
            <p className="text-slate-400">暂无仿真记录</p>
            <p className="text-slate-500 text-sm mt-1">开始仿真后，记录将自动保存到 IndexedDB</p>
          </div>
        ) : (
          <div className="space-y-3">
            {simulations.map((sim) => (
              <div
                key={sim.id}
                className="flex items-center justify-between p-4 bg-slate-900/50 rounded-lg hover:bg-slate-900 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center">
                    <BarChart3 className="text-blue-400" size={20} />
                  </div>
                  <div>
                    <h3 className="text-white font-medium">{sim.name}</h3>
                    <p className="text-sm text-slate-400">
                      {formatDate(sim.createdAt)} · {sim.nodes.length} 节点 · {sim.segments.length} 管段
                    </p>
                    <div className="flex items-center gap-4 mt-1">
                      <span className="text-xs text-slate-500">
                        时长: {sim.duration.toFixed(1)}s
                      </span>
                      <span className="text-xs text-slate-500">
                        快照: {sim.snapshotCount}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleExport(sim.id)}
                    className="p-2 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
                    title="导出"
                  >
                    <Download size={16} />
                  </button>
                  <button
                    onClick={() => handleDelete(sim.id)}
                    className="p-2 rounded-lg hover:bg-red-900/50 text-slate-400 hover:text-red-400 transition-colors"
                    title="删除"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AnalysisPage;
