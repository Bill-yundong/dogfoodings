import React, { useEffect } from 'react';
import { ValveCard } from '../components/valves/ValveCard';
import { EmergencyPanel } from '../components/valves/EmergencyPanel';
import { useValveStore } from '../store/useValveStore';
import { usePipelineStore } from '../store/usePipelineStore';
import { ToggleLeft, Settings } from 'lucide-react';

const ValveControlPage: React.FC = () => {
  const {
    valves,
    loadDemoValves,
    openValve,
    closeValve,
    toggleValve,
    setTargetOpening,
    openAllValves,
  } = useValveStore();
  const { nodes, loadDemoPipeline } = usePipelineStore();

  useEffect(() => {
    loadDemoPipeline();
    loadDemoValves();
  }, [loadDemoPipeline, loadDemoValves]);

  const getNodeName = (nodeId: string) => {
    const node = nodes.find((n) => n.id === nodeId);
    return node?.name || nodeId;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">阀门控制中心</h1>
          <p className="text-slate-400 text-sm mt-1">管理管网中所有阀门的开关状态与开度</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={openAllValves}
            className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg text-sm font-medium transition-all flex items-center gap-2"
          >
            <ToggleLeft size={16} />
            全部开启
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">阀门列表</h2>
            <span className="text-sm text-slate-400">{valves.length} 个阀门</span>
          </div>

          {valves.length === 0 ? (
            <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-12 text-center">
              <Settings className="mx-auto text-slate-500 mb-4" size={48} />
              <p className="text-slate-400">暂无阀门配置</p>
              <p className="text-slate-500 text-sm mt-1">请先在管网建模中添加阀门节点</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {valves.map((valve) => (
                <ValveCard
                  key={valve.id}
                  valve={valve}
                  nodeName={getNodeName(valve.nodeId)}
                  onToggle={() => toggleValve(valve.id)}
                  onOpeningChange={(opening) => setTargetOpening(valve.id, opening)}
                  onConfigure={() => console.log('Configure valve:', valve.id)}
                />
              ))}
            </div>
          )}
        </div>

        <div className="space-y-4">
          <EmergencyPanel />

          <div className="bg-slate-800/90 border border-slate-700 rounded-lg p-4">
            <h3 className="text-white font-medium mb-3">快速操作</h3>
            <div className="space-y-2">
              <button
                onClick={openAllValves}
                className="w-full py-2 px-4 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm transition-all flex items-center justify-center gap-2"
              >
                全部开启
              </button>
              <button
                onClick={() => useValveStore.getState().closeAllValves()}
                className="w-full py-2 px-4 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm transition-all flex items-center justify-center gap-2"
              >
                全部关闭
              </button>
            </div>
          </div>

          <div className="bg-slate-800/90 border border-slate-700 rounded-lg p-4">
            <h3 className="text-white font-medium mb-3">状态统计</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 text-sm">正常运行</span>
                <span className="text-green-400 font-medium">
                  {valves.filter((v) => v.status === 'normal').length}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400 text-sm">开启中</span>
                <span className="text-blue-400 font-medium">
                  {valves.filter((v) => v.status === 'opening').length}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400 text-sm">关闭中</span>
                <span className="text-yellow-400 font-medium">
                  {valves.filter((v) => v.status === 'closing').length}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400 text-sm">已关闭</span>
                <span className="text-red-400 font-medium">
                  {valves.filter((v) => v.status === 'closed' || v.opening <= 0.01).length}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ValveControlPage;
