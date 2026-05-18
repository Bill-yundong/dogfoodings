import React, { useEffect } from 'react';
import { usePipelineStore } from '../store/usePipelineStore';
import { Network, Plus, Trash2, Edit2, MapPin } from 'lucide-react';

const NetworkBuilderPage: React.FC = () => {
  const { nodes, segments, regions, loadDemoPipeline, selectedNodeId, selectNode } =
    usePipelineStore();

  useEffect(() => {
    loadDemoPipeline();
  }, [loadDemoPipeline]);

  const selectedNode = nodes.find((n) => n.id === selectedNodeId);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">管网建模</h1>
          <p className="text-slate-400 text-sm mt-1">配置管线节点、管段参数与行政区域划分</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition-all flex items-center gap-2">
            <Plus size={16} />
            添加节点
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <MapPin size={18} className="text-blue-400" />
              区域划分
            </h2>
            <div className="grid grid-cols-3 gap-3">
              {regions.map((region) => (
                <div
                  key={region.id}
                  className="p-3 rounded-lg border"
                  style={{
                    backgroundColor: region.color + '15',
                    borderColor: region.color + '40',
                  }}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: region.color }} />
                    <span className="text-white font-medium text-sm">{region.name}</span>
                  </div>
                  <p className="text-xs text-slate-400">
                    {nodes.filter((n) => n.region === region.id).length} 个节点
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <Network size={18} className="text-cyan-400" />
                节点列表
              </h2>
              <span className="text-sm text-slate-400">{nodes.length} 个节点</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-slate-400 text-xs border-b border-slate-700">
                    <th className="pb-3 font-medium">名称</th>
                    <th className="pb-3 font-medium">类型</th>
                    <th className="pb-3 font-medium">区域</th>
                    <th className="pb-3 font-medium">压力 (MPa)</th>
                    <th className="pb-3 font-medium">标高 (m)</th>
                    <th className="pb-3 font-medium">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {nodes.map((node) => (
                    <tr
                      key={node.id}
                      className={`border-b border-slate-700/50 hover:bg-slate-700/30 cursor-pointer transition-colors ${
                        selectedNodeId === node.id ? 'bg-blue-900/20' : ''
                      }`}
                      onClick={() => selectNode(node.id)}
                    >
                      <td className="py-3 text-white text-sm">{node.name}</td>
                      <td className="py-3">
                        <span className="px-2 py-0.5 bg-slate-700 rounded text-xs text-slate-300 capitalize">
                          {node.type}
                        </span>
                      </td>
                      <td className="py-3 text-sm text-slate-300">
                        {regions.find((r) => r.id === node.region)?.name || '-'}
                      </td>
                      <td className="py-3 text-sm font-mono text-slate-300">
                        {(node.pressure / 1000000).toFixed(2)}
                      </td>
                      <td className="py-3 text-sm text-slate-300">{node.elevation}</td>
                      <td className="py-3">
                        <div className="flex items-center gap-1">
                          <button className="p-1.5 rounded hover:bg-slate-600 text-slate-400 hover:text-white transition-colors">
                            <Edit2 size={14} />
                          </button>
                          <button className="p-1.5 rounded hover:bg-red-900/50 text-slate-400 hover:text-red-400 transition-colors">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">管段列表</h2>
              <span className="text-sm text-slate-400">{segments.length} 条管段</span>
            </div>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {segments.map((segment) => {
                const fromNode = nodes.find((n) => n.id === segment.fromNodeId);
                const toNode = nodes.find((n) => n.id === segment.toNodeId);
                return (
                  <div
                    key={segment.id}
                    className="flex items-center justify-between p-3 bg-slate-900/50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center">
                        <Network size={14} className="text-blue-400" />
                      </div>
                      <div>
                        <p className="text-white text-sm">
                          {fromNode?.name} → {toNode?.name}
                        </p>
                        <p className="text-xs text-slate-400">
                          {segment.material} · Ø{segment.diameter}m · {segment.length}m
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-400">
                        波速 {segment.waveSpeed} m/s
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
            <h3 className="text-white font-medium mb-4">节点属性</h3>
            {selectedNode ? (
              <div className="space-y-4">
                <div>
                  <label className="text-xs text-slate-400">节点名称</label>
                  <p className="text-white font-medium">{selectedNode.name}</p>
                </div>
                <div>
                  <label className="text-xs text-slate-400">节点类型</label>
                  <p className="text-white capitalize">{selectedNode.type}</p>
                </div>
                <div>
                  <label className="text-xs text-slate-400">所属区域</label>
                  <p className="text-white">
                    {regions.find((r) => r.id === selectedNode.region)?.name || '-'}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-slate-400">X 坐标</label>
                    <p className="text-white font-mono">{selectedNode.x}</p>
                  </div>
                  <div>
                    <label className="text-xs text-slate-400">Y 坐标</label>
                    <p className="text-white font-mono">{selectedNode.y}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-slate-400">标高</label>
                    <p className="text-white">{selectedNode.elevation} m</p>
                  </div>
                  <div>
                    <label className="text-xs text-slate-400">初始压力</label>
                    <p className="text-white">{(selectedNode.pressure / 1000000).toFixed(2)} MPa</p>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-slate-500 text-sm text-center py-8">选择一个节点查看详情</p>
            )}
          </div>

          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
            <h3 className="text-white font-medium mb-3">图例说明</h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-green-500" />
                <span className="text-slate-300">储油站 (Reservoir)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-gray-500" />
                <span className="text-slate-300">连接节点 (Junction)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-amber-500" />
                <span className="text-slate-300">阀门 (Valve)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-blue-500" />
                <span className="text-slate-300">泵站 (Pump)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-purple-500" />
                <span className="text-slate-300">传感器 (Sensor)</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NetworkBuilderPage;
