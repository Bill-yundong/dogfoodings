import { Star, Calendar, Tag } from 'lucide-react';
import type { SwingSnapshot } from '@/types';

interface SnapshotCardProps {
  snapshot: SwingSnapshot;
  isSelected: boolean;
  onSelect: (id: string) => void;
}

const TAG_COLORS: Record<string, string> = {
  address: '#6366F1',
  backswing: '#00F0B5',
  downswing: '#FF6B2B',
  impact: '#FF2D55',
  follow_through: '#FFD60A',
};

function getRatingColor(rating: number): string {
  if (rating > 80) return '#22C55E';
  if (rating > 60) return '#EAB308';
  return '#EF4444';
}

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}

export default function SnapshotCard({ snapshot, isSelected, onSelect }: SnapshotCardProps) {
  const ratingColor = getRatingColor(snapshot.rating);
  const stability = snapshot.metrics.stabilityScore;
  const path = snapshot.trajectory.clubHeadPath;

  const svgPoints = path.length > 1
    ? path
        .map((p, i) => {
          const t = i / (path.length - 1);
          const x = 8 + t * 64;
          const y = 56 - (p[1] / (Math.max(...path.map(v => v[1])) || 1)) * 48;
          return `${x},${y}`;
        })
        .join(' ')
    : '40,40 60,20';

  return (
    <div
      onClick={() => onSelect(snapshot.id)}
      className={`
        flex items-center gap-4 p-3 rounded-xl cursor-pointer transition-all duration-200
        border bg-[#1A1F2E] border-[#2A2F3E]
        hover:border-[#00F0B5] hover:shadow-[0_0_12px_rgba(0,240,181,0.25)]
        ${isSelected ? 'border-[#00F0B5] shadow-[0_0_12px_rgba(0,240,181,0.3)]' : ''}
      `}
    >
      <div className="shrink-0 w-20 h-16 rounded-lg overflow-hidden bg-[#0D1117] flex items-center justify-center">
        <svg viewBox="0 0 80 64" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id={`grad-${snapshot.id}`} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#6366F1" />
              <stop offset="50%" stopColor="#00F0B5" />
              <stop offset="100%" stopColor="#FF2D55" />
            </linearGradient>
          </defs>
          <polyline
            points={svgPoints}
            fill="none"
            stroke={`url(#grad-${snapshot.id})`}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {path.length > 0 && (() => {
            const lastIdx = path.length - 1;
            const t = 1;
            const cx = 8 + t * 64;
            const cy = 56 - (path[lastIdx][1] / (Math.max(...path.map(v => v[1])) || 1)) * 48;
            return (
              <circle cx={cx} cy={cy} r="3" fill="#FF2D55">
                <animate attributeName="opacity" values="1;0.4;1" dur="1.5s" repeatCount="indefinite" />
              </circle>
            );
          })()}
        </svg>
      </div>

      <div className="flex-1 min-w-0 space-y-1.5">
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <Calendar size={12} />
          <span>{formatDate(snapshot.createdAt)}</span>
        </div>

        <div className="flex items-center gap-2">
          <div
            className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold"
            style={{ backgroundColor: ratingColor + '20', color: ratingColor }}
          >
            <Star size={11} fill={ratingColor} stroke={ratingColor} />
            {snapshot.rating}
          </div>

          {snapshot.tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-medium"
              style={{
                backgroundColor: (TAG_COLORS[tag] || '#8B5CF6') + '20',
                color: TAG_COLORS[tag] || '#8B5CF6',
              }}
            >
              <Tag size={9} />
              {tag}
            </span>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[10px] text-gray-500 shrink-0">Stability</span>
          <div className="flex-1 h-1.5 rounded-full bg-[#0D1117] overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{
                width: `${stability}%`,
                background:
                  stability > 80
                    ? '#22C55E'
                    : stability > 60
                      ? '#EAB308'
                      : '#EF4444',
              }}
            />
          </div>
          <span className="text-[10px] text-gray-400 w-6 text-right">{stability}</span>
        </div>
      </div>
    </div>
  );
}
