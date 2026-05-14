import { createMemo } from 'solid-js';
import type { CraneState, CraneEnvelope } from '../types/crane';

interface CraneVisualizerProps {
  cranes: CraneState[];
  envelopes: Map<string, CraneEnvelope>;
}

export function CraneVisualizer(props: CraneVisualizerProps) {
  const craneColors = [
    { primary: '#3b82f6', secondary: '#93c5fd' },
    { primary: '#10b981', secondary: '#6ee7b7' },
    { primary: '#f59e0b', secondary: '#fcd34d' }
  ];

  const transform = createMemo(() => {
    const scale = 3;
    const offsetX = 180;
    const offsetY = 200;
    return { scale, offsetX, offsetY };
  });

  const toSvg = (x: number, y: number) => {
    const t = transform();
    return {
      x: x * t.scale + t.offsetX,
      y: -y * t.scale + t.offsetY
    };
  };

  return (
    <div class="crane-visualizer flex justify-center">
      <svg width="100%" height="450" viewBox="0 0 450 450" class="drop-shadow-xl">
        <defs>
          <linearGradient id="bgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#f8fafc" />
            <stop offset="50%" stop-color="#f1f5f9" />
            <stop offset="100%" stop-color="#e2e8f0" />
          </linearGradient>
          <pattern id="grid" width="30" height="30" patternUnits="userSpaceOnUse">
            <path d="M 30 0 L 0 0 0 30" fill="none" stroke="#cbd5e1" stroke-width="0.5" opacity="0.6"/>
          </pattern>
          <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="2" stdDeviation="3" flood-opacity="0.15"/>
          </filter>
        </defs>
        
        <rect width="450" height="450" fill="url(#bgGradient)" rx="16"/>
        <rect width="450" height="450" fill="url(#grid)" rx="16"/>
        
        {props.cranes.map((crane, index) => {
          const colors = craneColors[index % craneColors.length];
          const base = toSvg(crane.position.x, crane.position.y);
          const radAngle = (crane.jibAngle * Math.PI) / 180;
          const tipX = crane.position.x + Math.cos(radAngle) * crane.jibLength;
          const tipY = crane.position.y + Math.sin(radAngle) * crane.jibLength;
          const tip = toSvg(tipX, tipY);
          
          const envelope = props.envelopes.get(crane.id);
          
          return (
            <g filter="url(#shadow)">
              {envelope && (
                <polyline
                  points={envelope.points.map(p => {
                    const pt = toSvg(p.position.x, p.position.y);
                    return `${pt.x},${pt.y}`;
                  }).join(' ')}
                  fill="none"
                  stroke={colors.secondary}
                  stroke-width="3"
                  stroke-dasharray="8,4"
                  opacity="0.7"
                  stroke-linecap="round"
                />
              )}
              
              <circle
                cx={base.x}
                cy={base.y}
                r={crane.jibLength * transform().scale}
                fill={colors.primary}
                fill-opacity="0.05"
                stroke={colors.primary}
                stroke-width="2"
                stroke-dasharray="6,4"
                opacity="0.6"
              />
              
              <line
                x1={base.x}
                y1={base.y}
                x2={tip.x}
                y2={tip.y}
                stroke={colors.primary}
                stroke-width="6"
                stroke-linecap="round"
              />
              
              <circle
                cx={base.x}
                cy={base.y}
                r="14"
                fill={colors.primary}
                stroke="white"
                stroke-width="4"
              />
              
              {(() => {
                const hookX = crane.position.x + Math.cos(radAngle) * crane.trolleyPosition;
                const hookY = crane.position.y + Math.sin(radAngle) * crane.trolleyPosition;
                const hook = toSvg(hookX, hookY);
                return (
                  <g>
                    <circle
                      cx={hook.x}
                      cy={hook.y}
                      r="12"
                      fill={colors.secondary}
                      stroke={colors.primary}
                      stroke-width="4"
                    />
                    <line
                      x1={hook.x}
                      y1={hook.y}
                      x2={hook.x}
                      y2={hook.y + crane.hookHeight * transform().scale * 0.25}
                      stroke={colors.primary}
                      stroke-width="4"
                      stroke-linecap="round"
                    />
                  </g>
                );
              })()}
              
              <rect
                x={base.x - 50}
                y={base.y - 40}
                width="100"
                height="24"
                rx="12"
                fill="white"
                stroke={colors.primary}
                stroke-width="2"
              />
              <text
                x={base.x}
                y={base.y - 24}
                text-anchor="middle"
                fill={colors.primary}
                font-size="14"
                font-weight="bold"
              >
                {crane.name}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
