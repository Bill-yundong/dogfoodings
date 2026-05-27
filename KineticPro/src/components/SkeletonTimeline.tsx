'use client';

import { KeypointFrame, SwingPhase, SKELETON_CONNECTIONS, PHASE_COLORS } from '@/types';

interface SkeletonTimelineProps {
  keypointFrames: KeypointFrame[];
  phases: SwingPhase[];
  currentFrame: number;
  onFrameChange: (frame: number) => void;
}

const TOTAL_FRAMES = 120;
const TIMELINE_HEIGHT = 24;
const SVG_WIDTH = 200;
const SVG_HEIGHT = 300;
const PADDING = 20;

function getKeypointColor(confidence: number): string {
  if (confidence > 0.9) return '#22C55E';
  if (confidence > 0.7) return '#EAB308';
  return '#EF4444';
}

function getCurrentPhase(phases: SwingPhase[], frame: number): SwingPhase | undefined {
  return phases.find(p => frame >= p.startFrame && frame <= p.endFrame);
}

function projectKeypoint(pos: [number, number, number]): [number, number] {
  const x = PADDING + (pos[0] / 1) * (SVG_WIDTH - PADDING * 2);
  const y = PADDING + (pos[1] / 1) * (SVG_HEIGHT - PADDING * 2);
  return [x, y];
}

export default function SkeletonTimeline({
  keypointFrames,
  phases,
  currentFrame,
  onFrameChange,
}: SkeletonTimelineProps) {
  const frameData = keypointFrames.find(f => f.frameIndex === currentFrame);
  const currentPhase = getCurrentPhase(phases, currentFrame);

  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, x / rect.width));
    onFrameChange(Math.round(ratio * (TOTAL_FRAMES - 1)));
  };

  const handleDrag = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.buttons !== 1) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, x / rect.width));
    onFrameChange(Math.round(ratio * (TOTAL_FRAMES - 1)));
  };

  const playheadPercent = (currentFrame / (TOTAL_FRAMES - 1)) * 100;

  return (
    <div className="flex flex-col gap-3 w-full" style={{ background: '#1A1F2E', color: '#F0F4FF' }}>
      <div className="flex items-center justify-between px-2 pt-2">
        <span className="text-sm font-medium" style={{ color: '#F0F4FF' }}>
          Frame {currentFrame}
        </span>
        {currentPhase && (
          <span
            className="text-xs font-semibold px-2 py-0.5 rounded"
            style={{
              background: PHASE_COLORS[currentPhase.name] + '33',
              color: PHASE_COLORS[currentPhase.name],
              border: `1px solid ${PHASE_COLORS[currentPhase.name]}66`,
            }}
          >
            {currentPhase.name.replace('_', ' ')}
          </span>
        )}
      </div>

      <div className="flex justify-center">
        <svg
          width={SVG_WIDTH}
          height={SVG_HEIGHT}
          viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
          style={{ background: '#12162388', borderRadius: 8 }}
        >
          {frameData && frameData.keypoints.length > 0 && (
            <>
              {SKELETON_CONNECTIONS.map(([i, j], idx) => {
                const kpA = frameData.keypoints[i];
                const kpB = frameData.keypoints[j];
                if (!kpA || !kpB) return null;
                const [x1, y1] = projectKeypoint(kpA.position);
                const [x2, y2] = projectKeypoint(kpB.position);
                return (
                  <line
                    key={idx}
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    stroke="#F0F4FF55"
                    strokeWidth={2}
                    strokeLinecap="round"
                  />
                );
              })}
              {frameData.keypoints.map((kp, idx) => {
                const [cx, cy] = projectKeypoint(kp.position);
                return (
                  <circle
                    key={idx}
                    cx={cx}
                    cy={cy}
                    r={4}
                    fill={getKeypointColor(kp.confidence)}
                    stroke="#1A1F2E"
                    strokeWidth={1}
                  />
                );
              })}
            </>
          )}
        </svg>
      </div>

      <div className="px-2 pb-2">
        <div
          className="relative w-full cursor-pointer select-none"
          style={{ height: TIMELINE_HEIGHT }}
          onClick={handleTimelineClick}
          onMouseMove={handleDrag}
        >
          <div
            className="absolute inset-0 rounded overflow-hidden flex"
            style={{ background: '#121623' }}
          >
            {phases.map((phase, idx) => {
              const left = (phase.startFrame / TOTAL_FRAMES) * 100;
              const width = ((phase.endFrame - phase.startFrame) / TOTAL_FRAMES) * 100;
              return (
                <div
                  key={idx}
                  className="absolute top-0 bottom-0"
                  style={{
                    left: `${left}%`,
                    width: `${width}%`,
                    background: PHASE_COLORS[phase.name] + '66',
                  }}
                />
              );
            })}
          </div>

          <div
            className="absolute top-0 bottom-0 w-0.5"
            style={{
              left: `${playheadPercent}%`,
              background: '#F0F4FF',
              boxShadow: '0 0 6px #F0F4FF88',
              transform: 'translateX(-50%)',
            }}
          >
            <div
              className="absolute -top-1 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full"
              style={{
                background: currentPhase ? PHASE_COLORS[currentPhase.name] : '#F0F4FF',
                boxShadow: currentPhase
                  ? `0 0 8px ${PHASE_COLORS[currentPhase.name]}`
                  : '0 0 6px #F0F4FF88',
              }}
            />
          </div>

          <div className="flex justify-between mt-1">
            <span className="text-[10px]" style={{ color: '#F0F4FF66' }}>0</span>
            <span className="text-[10px]" style={{ color: '#F0F4FF66' }}>119</span>
          </div>
        </div>
      </div>
    </div>
  );
}
