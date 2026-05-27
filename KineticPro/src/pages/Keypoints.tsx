import { useEffect, useState } from 'react';
import { useKineticStore } from '@/store';
import SkeletonTimeline from '@/components/SkeletonTimeline';
import EngineMonitor from '@/components/EngineMonitor';
import AlignmentPanel from '@/components/AlignmentPanel';
import { Play, Square, RotateCcw } from 'lucide-react';

export default function Keypoints() {
  const {
    currentFrames,
    currentTrajectory,
    currentAlignment,
    engineStatus,
    isCollecting,
    playbackFrame,
    startCollection,
    stopCollection,
    loadDemoData,
    setPlaybackFrame,
  } = useKineticStore();

  const [localFrame, setLocalFrame] = useState(0);

  useEffect(() => {
    loadDemoData();
  }, [loadDemoData]);

  useEffect(() => {
    setLocalFrame(playbackFrame);
  }, [playbackFrame]);

  const phases = currentTrajectory?.phases ?? [
    { name: 'address' as const, startFrame: 0, endFrame: 20 },
    { name: 'backswing' as const, startFrame: 20, endFrame: 50 },
    { name: 'downswing' as const, startFrame: 50, endFrame: 75 },
    { name: 'impact' as const, startFrame: 75, endFrame: 85 },
    { name: 'follow_through' as const, startFrame: 85, endFrame: 120 },
  ];

  return (
    <div className="h-full overflow-auto p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-[#E8ECF4] font-['Orbitron',monospace] tracking-wide">
            关键点序列分析
          </h2>
          <p className="text-xs text-[#6B7280] mt-0.5">人体骨架时序 · 识别引擎监控 · 语义对齐校验</p>
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
              <Square size={14} /> 停止
            </button>
          )}
          <button
            onClick={loadDemoData}
            className="flex items-center gap-2 px-3 py-2 bg-[#1A1F2E] text-[#8B95A5] rounded-lg border border-[#2A2F3E] hover:text-[#E8ECF4] transition-all text-sm"
          >
            <RotateCcw size={14} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-8">
          <div className="bg-[#1A1F2E] rounded-xl border border-[#2A2F3E] p-5">
            <h3 className="text-sm font-semibold text-[#8B95A5] mb-4 uppercase tracking-wider">
              骨架时序图
            </h3>
            <SkeletonTimeline
              keypointFrames={currentFrames}
              phases={phases}
              currentFrame={localFrame}
              onFrameChange={(f) => {
                setLocalFrame(f);
                setPlaybackFrame(f);
              }}
            />
          </div>
        </div>

        <div className="col-span-4">
          <EngineMonitor status={engineStatus} />
        </div>
      </div>

      <div className="bg-[#1A1F2E] rounded-xl border border-[#2A2F3E] p-5">
        <h3 className="text-sm font-semibold text-[#8B95A5] mb-4 uppercase tracking-wider">
          语义对齐分析
        </h3>
        {currentAlignment ? (
          <AlignmentPanel alignment={currentAlignment} />
        ) : (
          <div className="h-[200px] flex items-center justify-center text-[#4B5563] text-sm">
            暂无语义对齐数据
          </div>
        )}
      </div>
    </div>
  );
}
