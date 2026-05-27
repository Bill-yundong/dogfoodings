import { useEffect, useState, useCallback } from 'react';
import { useKineticStore } from '@/store';
import { saveSnapshot, getAllSnapshots, deleteSnapshot as deleteSnapshotDB } from '@/storage/indexeddb';
import SnapshotCard from '@/components/SnapshotCard';
import TrajectoryOverlay3D from '@/components/TrajectoryOverlay3D';
import { generateSwingSnapshot } from '@/engine/mockData';
import type { SwingSnapshot, SwingTrajectory } from '@/types';
import { Trash2, Plus, Layers, TrendingUp } from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Line,
  ComposedChart,
} from 'recharts';

export default function History() {
  const { snapshots, loadSnapshots, deleteSnapshot: deleteFromStore } = useKineticStore();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [filterRating, setFilterRating] = useState<'all' | 'high' | 'mid' | 'low'>('all');

  useEffect(() => {
    getAllSnapshots().then(snaps => {
      loadSnapshots(snaps);
    });
  }, [loadSnapshots]);

  const filteredSnapshots = snapshots.filter(s => {
    if (filterRating === 'high') return s.rating >= 80;
    if (filterRating === 'mid') return s.rating >= 60 && s.rating < 80;
    if (filterRating === 'low') return s.rating < 60;
    return true;
  });

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : prev.length < 4 ? [...prev, id] : prev
    );
  }, []);

  const handleDelete = useCallback(async (id: string) => {
    await deleteSnapshotDB(id);
    deleteFromStore(id);
    setSelectedIds(prev => prev.filter(i => i !== id));
  }, [deleteFromStore]);

  const handleSaveCurrent = useCallback(async () => {
    const snap = generateSwingSnapshot();
    await saveSnapshot(snap);
    const all = await getAllSnapshots();
    loadSnapshots(all);
  }, [loadSnapshots]);

  const selectedTrajectories: SwingTrajectory[] = snapshots
    .filter(s => selectedIds.includes(s.id))
    .map(s => s.trajectory);

  const trendData = snapshots
    .slice(0, 20)
    .reverse()
    .map((s, i) => ({
      index: i + 1,
      score: s.metrics.stabilityScore,
      rhythm: s.metrics.subScores.rhythmConsistency,
      cog: s.metrics.subScores.cogStability,
      joint: s.metrics.subScores.jointCoordination,
    }));

  return (
    <div className="h-full overflow-auto p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-[#E8ECF4] font-['Orbitron',monospace] tracking-wide">
            历史对比与快照
          </h2>
          <p className="text-xs text-[#6B7280] mt-0.5">挥杆历史管理 · 多轨迹叠加对比 · 参数趋势分析</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleSaveCurrent}
            className="flex items-center gap-2 px-4 py-2 bg-[#00F0B5]/15 text-[#00F0B5] rounded-lg border border-[#00F0B5]/30 hover:bg-[#00F0B5]/25 transition-all text-sm"
          >
            <Plus size={14} /> 生成快照
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {(['all', 'high', 'mid', 'low'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilterRating(f)}
            className={`px-3 py-1.5 rounded-lg text-xs transition-all ${
              filterRating === f
                ? 'bg-[#00F0B5]/15 text-[#00F0B5] border border-[#00F0B5]/30'
                : 'bg-[#1A1F2E] text-[#6B7280] border border-[#2A2F3E] hover:text-[#E8ECF4]'
            }`}
          >
            {f === 'all' ? '全部' : f === 'high' ? '优秀 (80+)' : f === 'mid' ? '良好 (60-80)' : '待提升 (<60)'}
          </button>
        ))}
        <span className="text-xs text-[#4B5563] ml-2">
          已选 {selectedIds.length}/4 条轨迹用于对比
        </span>
      </div>

      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-5">
          <div className="bg-[#1A1F2E] rounded-xl border border-[#2A2F3E] p-4 max-h-[600px] overflow-auto">
            <div className="flex items-center gap-2 mb-3">
              <Layers size={14} className="text-[#6366F1]" />
              <h3 className="text-sm font-semibold text-[#8B95A5] uppercase tracking-wider">
                快照列表
              </h3>
            </div>
            <div className="space-y-3">
              {filteredSnapshots.length === 0 ? (
                <div className="py-8 text-center text-[#4B5563] text-sm">
                  暂无快照数据，点击"生成快照"添加
                </div>
              ) : (
                filteredSnapshots.map(snap => (
                  <div key={snap.id} className="relative group">
                    <SnapshotCard
                      snapshot={snap}
                      isSelected={selectedIds.includes(snap.id)}
                      onSelect={toggleSelect}
                    />
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(snap.id);
                      }}
                      className="absolute top-2 right-2 p-1 rounded bg-[#FF2D55]/10 text-[#FF2D55] opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="col-span-7 space-y-4">
          <div className="bg-[#1A1F2E] rounded-xl border border-[#2A2F3E] p-4 h-[320px]">
            <div className="flex items-center gap-2 mb-3">
              <Layers size={14} className="text-[#00F0B5]" />
              <h3 className="text-sm font-semibold text-[#8B95A5] uppercase tracking-wider">
                轨迹叠加对比
              </h3>
            </div>
            <div className="h-[270px]">
              {selectedTrajectories.length >= 1 ? (
                <TrajectoryOverlay3D
                  trajectories={selectedTrajectories}
                  colors={['#6366F1', '#00F0B5', '#FF6B2B', '#FFD60A']}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-[#4B5563] text-sm border border-dashed border-[#2A2F3E] rounded-lg">
                  选择 1-4 条快照进行对比
                </div>
              )}
            </div>
          </div>

          <div className="bg-[#1A1F2E] rounded-xl border border-[#2A2F3E] p-4">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp size={14} className="text-[#FFD60A]" />
              <h3 className="text-sm font-semibold text-[#8B95A5] uppercase tracking-wider">
                参数趋势
              </h3>
            </div>
            {trendData.length > 1 ? (
              <ResponsiveContainer width="100%" height={200}>
                <ComposedChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2A2F3E" />
                  <XAxis dataKey="index" stroke="#4B5563" tick={{ fontSize: 10 }} />
                  <YAxis stroke="#4B5563" tick={{ fontSize: 10 }} domain={[0, 100]} />
                  <Tooltip
                    contentStyle={{
                      background: '#0D1117',
                      border: '1px solid #2A2F3E',
                      borderRadius: '8px',
                      fontSize: '11px',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="score"
                    stroke="#00F0B5"
                    fill="#00F0B5"
                    fillOpacity={0.1}
                    strokeWidth={2}
                  />
                  <Line
                    type="monotone"
                    dataKey="rhythm"
                    stroke="#6366F1"
                    strokeWidth={1}
                    dot={false}
                    strokeDasharray="4 2"
                  />
                  <Line
                    type="monotone"
                    dataKey="cog"
                    stroke="#FFD60A"
                    strokeWidth={1}
                    dot={false}
                    strokeDasharray="4 2"
                  />
                  <Line
                    type="monotone"
                    dataKey="joint"
                    stroke="#FF6B2B"
                    strokeWidth={1}
                    dot={false}
                    strokeDasharray="4 2"
                  />
                </ComposedChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-[#4B5563] text-sm">
                至少需要 2 条快照数据展示趋势
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
