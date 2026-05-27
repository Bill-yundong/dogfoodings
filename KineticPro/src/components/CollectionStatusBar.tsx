import { Wifi, Activity, AlignCenter, Clock } from 'lucide-react'

interface CollectionStatusBarProps {
  connected: boolean
  fps: number
  alignmentScore: number
  engineLatency: number
}

function getAlignmentColor(score: number): string {
  if (score > 0.95) return '#22C55E'
  if (score > 0.85) return '#EAB308'
  return '#EF4444'
}

export default function CollectionStatusBar({
  connected,
  fps,
  alignmentScore,
  engineLatency,
}: CollectionStatusBarProps) {
  return (
    <>
      <style>{`
        @keyframes statusPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
      <div
        className="flex items-center justify-between rounded-lg px-6 py-3"
        style={{
          backgroundColor: '#1A1F2E',
          borderTop: '2px solid #00F0B5',
        }}
      >
        <div className="flex items-center gap-2">
          <Wifi size={16} style={{ color: '#E8ECF4' }} />
          <div
            className="h-2.5 w-2.5 rounded-full"
            style={{
              backgroundColor: connected ? '#22C55E' : '#EF4444',
              boxShadow: connected
                ? '0 0 8px 2px rgba(34,197,94,0.6)'
                : '0 0 8px 2px rgba(239,68,68,0.6)',
              animation: 'statusPulse 2s ease-in-out infinite',
            }}
          />
          <span style={{ color: '#E8ECF4', fontSize: '13px' }}>终端连接</span>
        </div>

        <div className="flex items-center gap-2">
          <Activity size={16} style={{ color: '#E8ECF4' }} />
          <span
            style={{
              color: '#E8ECF4',
              fontSize: '13px',
              animation: 'statusPulse 2s ease-in-out infinite',
            }}
          >
            {fps}
          </span>
          <span style={{ color: '#E8ECF4', fontSize: '11px', opacity: 0.7 }}>fps</span>
          <span style={{ color: '#E8ECF4', fontSize: '13px', marginLeft: '2px' }}>帧率</span>
        </div>

        <div className="flex items-center gap-2">
          <AlignCenter size={16} style={{ color: '#E8ECF4' }} />
          <span
            style={{
              color: getAlignmentColor(alignmentScore),
              fontSize: '13px',
              fontWeight: 600,
              animation: 'statusPulse 2s ease-in-out infinite',
            }}
          >
            {(alignmentScore * 100).toFixed(1)}%
          </span>
          <span style={{ color: '#E8ECF4', fontSize: '13px' }}>语义对齐度</span>
        </div>

        <div className="flex items-center gap-2">
          <Clock size={16} style={{ color: '#E8ECF4' }} />
          <span
            style={{
              color: '#E8ECF4',
              fontSize: '13px',
              animation: 'statusPulse 2s ease-in-out infinite',
            }}
          >
            {engineLatency}
          </span>
          <span style={{ color: '#E8ECF4', fontSize: '11px', opacity: 0.7 }}>ms</span>
          <span style={{ color: '#E8ECF4', fontSize: '13px', marginLeft: '2px' }}>引擎延迟</span>
        </div>
      </div>
    </>
  )
}
