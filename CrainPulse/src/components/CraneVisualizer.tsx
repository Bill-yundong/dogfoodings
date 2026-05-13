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
    <div class="crane-visualizer">
      <svg width="400" height="400" viewBox="0 0 400 400">
        <defs>
          <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#e5e7eb" stroke-width="0.5"/>
          </pattern>
        </defs>
        <rect width="400" height="400" fill="url(#grid)"/>
        
        {props.cranes.map((crane, index) => {
          const colors = craneColors[index % craneColors.length];
          const base = toSvg(crane.position.x, crane.position.y);
          const radAngle = (crane.jibAngle * Math.PI) / 180;
          const tipX = crane.position.x + Math.cos(radAngle) * crane.jibLength;
          const tipY = crane.position.y + Math.sin(radAngle) * crane.jibLength;
          const tip = toSvg(tipX, tipY);
          
          const envelope = props.envelopes.get(crane.id);
          
          return (
            <g>
              {envelope && (
                <polyline
                  points={envelope.points.map(p => {
                    const pt = toSvg(p.position.x, p.position.y);
                    return `${pt.x},${pt.y}`;
                  }).join(' ')}
                  fill="none"
                  stroke={colors.secondary}
                  stroke-width="2"
                  stroke-dasharray="5,5"
                  opacity="0.6"
                />
              )}
              
              <circle
                cx={base.x}
                cy={base.y}
                r={crane.jibLength * transform().scale}
                fill="none"
                stroke={colors.primary}
                stroke-width="1"
                stroke-dasharray="3,3"
                opacity="0.3"
              />
              
              <line
                x1={base.x}
                y1={base.y}
                x2={tip.x}
                y2={tip.y}
                stroke={colors.primary}
                stroke-width="4"
                stroke-linecap="round"
              />
              
              <circle
                cx={base.x}
                cy={base.y}
                r="8"
                fill={colors.primary}
                stroke="white"
                stroke-width="2"
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
                      r="6"
                      fill={colors.secondary}
                      stroke={colors.primary}
                      stroke-width="2"
                    />
                    <line
                      x1={hook.x}
                      y1={hook.y}
                      x2={hook.x}
                      y2={hook.y + crane.hookHeight * transform().scale * 0.3}
                      stroke={colors.primary}
                      stroke-width="2"
                    />
                  </g>
                );
              })()}
              
              <text
                x={base.x}
                y={base.y - 15}
                text-anchor="middle"
                fill={colors.primary}
                font-size="12"
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
