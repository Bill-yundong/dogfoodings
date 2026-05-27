import { Cpu, ArrowRight, BarChart3, Zap } from 'lucide-react';
import type { EngineStatus } from '@/types';

interface EngineMonitorProps {
  status: EngineStatus;
}

const PIPELINE_STAGES = [
  { label: '采集帧', icon: BarChart3 },
  { label: '识别引擎', icon: Cpu },
  { label: '参数提取', icon: Zap },
  { label: '语义对齐', icon: ArrowRight },
];

export default function EngineMonitor({ status }: EngineMonitorProps) {
  const isActive = status.state === 'processing';
  const isError = status.state === 'error';

  return (
    <div
      className="rounded-xl p-4"
      style={{ background: '#1A1F2E' }}
    >
      <div className="flex items-center justify-center gap-2 mb-5">
        {PIPELINE_STAGES.map((stage, i) => {
          const Icon = stage.icon;
          const active = isActive;
          const errored = isError;
          return (
            <div key={stage.label} className="flex items-center gap-2">
              <div
                className={`
                  relative flex flex-col items-center justify-center
                  rounded-lg px-4 py-3 min-w-[90px] transition-shadow duration-500
                  ${active && !errored ? 'shadow-[0_0_16px_rgba(0,240,181,0.35)]' : ''}
                  ${errored ? 'shadow-[0_0_16px_rgba(255,60,60,0.35)]' : ''}
                `}
                style={{ background: '#242B3D' }}
              >
                <Icon
                  size={20}
                  style={{
                    color: errored ? '#FF3C3C' : active ? '#00F0B5' : '#6B7280',
                  }}
                  className="mb-1"
                />
                <span
                  className="text-xs font-medium"
                  style={{
                    color: errored ? '#FF3C3C' : active ? '#00F0B5' : '#6B7280',
                  }}
                >
                  {stage.label}
                </span>
                <span
                  className="mt-1 block h-1.5 w-1.5 rounded-full"
                  style={{
                    background: errored
                      ? '#FF3C3C'
                      : active
                        ? '#00F0B5'
                        : '#4B5563',
                    boxShadow:
                      active && !errored
                        ? '0 0 6px #00F0B5'
                        : errored
                          ? '0 0 6px #FF3C3C'
                          : 'none',
                  }}
                />
              </div>
              {i < PIPELINE_STAGES.length - 1 && (
                <div className="flex items-center mx-1">
                  <svg width="32" height="12" className="overflow-visible">
                    <line
                      x1="0"
                      y1="6"
                      x2="32"
                      y2="6"
                      stroke={active && !isError ? '#00F0B5' : '#4B5563'}
                      strokeWidth="2"
                      strokeDasharray="4 3"
                    >
                      {isActive && !isError && (
                        <animate
                          attributeName="stroke-dashoffset"
                          from="0"
                          to="-14"
                          dur="0.6s"
                          repeatCount="indefinite"
                        />
                      )}
                    </line>
                    <polygon
                      points="30,2 32,6 30,10"
                      fill={active && !isError ? '#00F0B5' : '#4B5563'}
                    />
                  </svg>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="space-y-3 mt-4">
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-gray-400">Queue Size</span>
            <span className="text-xs font-mono" style={{ color: '#00F0B5' }}>
              {status.queueSize} / 50
            </span>
          </div>
          <div
            className="h-2 rounded-full overflow-hidden"
            style={{ background: '#242B3D' }}
          >
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{
                width: `${Math.min((status.queueSize / 50) * 100, 100)}%`,
                background: '#00F0B5',
                boxShadow: status.queueSize > 0 ? '0 0 8px rgba(0,240,181,0.4)' : 'none',
              }}
            />
          </div>
        </div>

        <div className="flex gap-4">
          <div
            className="flex-1 rounded-lg px-3 py-2 flex items-center gap-2"
            style={{ background: '#242B3D' }}
          >
            <Zap size={14} style={{ color: '#00F0B5' }} />
            <span className="text-xs text-gray-400">Throughput</span>
            <span className="ml-auto text-sm font-mono font-semibold" style={{ color: '#00F0B5' }}>
              {status.throughput.toFixed(1)}
              <span className="text-[10px] text-gray-500 ml-0.5">fps</span>
            </span>
          </div>

          <div
            className="flex-1 rounded-lg px-3 py-2 flex items-center gap-2"
            style={{ background: '#242B3D' }}
          >
            <BarChart3 size={14} style={{ color: '#00F0B5' }} />
            <span className="text-xs text-gray-400">Latency</span>
            <span className="ml-auto text-sm font-mono font-semibold" style={{ color: '#00F0B5' }}>
              {status.avgLatency.toFixed(0)}
              <span className="text-[10px] text-gray-500 ml-0.5">ms</span>
            </span>
          </div>
        </div>

        <div className="flex items-center justify-center pt-1">
          <span
            className={`
              inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium
              ${status.state === 'processing' ? 'animate-pulse' : ''}
            `}
            style={{
              background:
                status.state === 'idle'
                  ? '#374151'
                  : status.state === 'processing'
                    ? 'rgba(0,240,181,0.15)'
                    : 'rgba(255,60,60,0.15)',
              color:
                status.state === 'idle'
                  ? '#9CA3AF'
                  : status.state === 'processing'
                    ? '#00F0B5'
                    : '#FF3C3C',
              border:
                status.state === 'processing'
                  ? '1px solid rgba(0,240,181,0.3)'
                  : status.state === 'error'
                    ? '1px solid rgba(255,60,60,0.3)'
                    : '1px solid transparent',
            }}
          >
            <span
              className="block h-2 w-2 rounded-full"
              style={{
                background:
                  status.state === 'idle'
                    ? '#9CA3AF'
                    : status.state === 'processing'
                      ? '#00F0B5'
                      : '#FF3C3C',
              }}
            />
            {status.state === 'idle'
              ? 'Idle'
              : status.state === 'processing'
                ? 'Processing'
                : 'Error'}
          </span>
        </div>
      </div>
    </div>
  );
}
