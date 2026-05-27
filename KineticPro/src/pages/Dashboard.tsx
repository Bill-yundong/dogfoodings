import { useEffect } from 'react';
import { useKineticStore } from '@/store';
import SwingTrajectory3D from '@/components/SwingTrajectory3D';
import StabilityScoreCard from '@/components/StabilityScoreCard';
import MetricsChart from '@/components/MetricsChart';
import CollectionStatusBar from '@/components/CollectionStatusBar';
import { Play, Square, Save, RotateCcw } from 'lucide-react';

export default function Dashboard() {
  const {
    currentTrajectory,
    currentMetrics,
    currentAlignment,
    collectionStatus,
    isCollecting,
    playbackFrame,
    startCollection,
    stopCollection,
    saveSnapshot,
    loadDemoData,
  } = useKineticStore();

  useEffect(() => {
    loadDemoData();
  }, [loadDemoData]);

  const hasData = currentTrajectory !== null;

  return (
    <div className="h-full overflow-auto p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-[#E8ECF4] font-['Orbitron',monospace] tracking-wide">
            运动数据仪表盘
          </h2>
          <p className="text-xs text-[#6B7280] mt-0.5">实时挥杆轨迹 · 生物力学参数 · 稳定性分析</p>
        </div>
        <div className="flex items-center gap-2">
          {!isCollecting ? (
            <button
              onClick={startCollection}
              className="flex items-center gap-2 px-4 py-2 bg-[#00F0B5]/15 text-[#00F0B5] rounded-lg border border-[#00F0B5]/30 hover:bg-[#00F0B5]/25 transition-all text-sm"
            >
              <Play size={14} /> 开始采集
            </button>
          ) : (
            <button
              onClick={stopCollection}
              className="flex items-center gap-2 px-4 py-2 bg-[#FF6B2B]/15 text-[#FF6B2B] rounded-lg border border-[#FF6B2B]/30 hover:bg-[#FF6B2B]/25 transition-all text-sm"
            >
              <Square size={14} /> 停止采集
            </button>
          )}
          <button
            onClick={saveSnapshot}
            disabled={!hasData}
            className="flex items-center gap-2 px-4 py-2 bg-[#6366F1]/15 text-[#6366F1] rounded-lg border border-[#6366F1]/30 hover:bg-[#6366F1]/25 transition-all text-sm disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <Save size={14} /> 保存快照
          </button>
          <button
            onClick={loadDemoData}
            className="flex items-center gap-2 px-3 py-2 bg-[#1A1F2E] text-[#8B95A5] rounded-lg border border-[#2A2F3E] hover:text-[#E8ECF4] transition-all text-sm"
          >
            <RotateCcw size={14} />
          </button>
        </div>
      </div>

      <CollectionStatusBar
        connected={collectionStatus.connected}
        fps={collectionStatus.fps}
        alignmentScore={collectionStatus.alignmentScore}
        engineLatency={collectionStatus.engineLatency}
      />

      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-8">
          <div className="bg-[#1A1F2E] rounded-xl border border-[#2A2F3E] p-1 h-[420px]">
            {hasData ? (
              <SwingTrajectory3D
                clubHeadPath={currentTrajectory.clubHeadPath}
                cogPath={currentTrajectory.centerOfGravityPath}
                playbackFrame={playbackFrame}
                phases={currentTrajectory.phases}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-[#4B5563] text-sm">
                点击"开始采集"或加载演示数据
              </div>
            )}
          </div>
        </div>

        <div className="col-span-4 space-y-4">
          <StabilityScoreCard
            score={currentMetrics?.stabilityScore ?? 0}
            subScores={currentMetrics?.subScores ?? {
              rhythmConsistency: 0,
              cogStability: 0,
              jointCoordination: 0,
            }}
          />

          {currentMetrics && (
            <div className="bg-[#1A1F2E] rounded-xl border border-[#2A2F3E] p-4">
              <h3 className="text-xs font-semibold text-[#8B95A5] mb-3 uppercase tracking-wider">
                语义对齐度
              </h3>
              <div className="flex items-center gap-3">
                <div className="flex-1 h-2 bg-[#0D1117] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${(currentAlignment?.alignmentScore ?? 0) * 100}%`,
                      background: `linear-gradient(90deg, #00F0B5, #6366F1)`,
                    }}
                  />
                </div>
                <span className="text-sm font-['Orbitron',monospace] text-[#00F0B5]">
                  {((currentAlignment?.alignmentScore ?? 0) * 100).toFixed(1)}%
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="bg-[#1A1F2E] rounded-xl border border-[#2A2F3E] p-4">
        {currentMetrics ? (
          <MetricsChart
            angularVelocity={currentMetrics.angularVelocity}
            linearVelocity={currentMetrics.linearVelocity}
            cogDisplacement={currentMetrics.centerOfGravityDisplacement}
          />
        ) : (
          <div className="h-[250px] flex items-center justify-center text-[#4B5563] text-sm">
            暂无力学参数数据
          </div>
        )}
      </div>
    </div>
  );
}
