import { For } from 'solid-js';
import type { CurvePoint } from '../types';

interface BloodSugarChartProps {
  curve: CurvePoint[];
  peakTime: number;
  peakValue: number;
  riskLevel: 'low' | 'medium' | 'high';
}

const WIDTH = 600;
const HEIGHT = 320;
const PADDING = { top: 30, right: 30, bottom: 40, left: 50 };
const MIN_GLUCOSE = 3.5;
const MAX_GLUCOSE = 15;
const MIN_TIME = 0;
const MAX_TIME = 180;
const SAFE_LOW = 3.9;
const SAFE_HIGH = 7.8;

function mapX(time: number) {
  return PADDING.left + ((time - MIN_TIME) / (MAX_TIME - MIN_TIME)) * (WIDTH - PADDING.left - PADDING.right);
}

function mapY(glucose: number) {
  return PADDING.top + ((MAX_GLUCOSE - glucose) / (MAX_GLUCOSE - MIN_GLUCOSE)) * (HEIGHT - PADDING.top - PADDING.bottom);
}

function glucoseColor(glucose: number) {
  if (glucose <= SAFE_HIGH) return '#00FF88';
  if (glucose <= 10) return '#F5A623';
  return '#EF4444';
}

export default function BloodSugarChart(props: BloodSugarChartProps) {
  const chartW = WIDTH - PADDING.left - PADDING.right;
  const chartH = HEIGHT - PADDING.top - PADDING.bottom;

  const pathD = () => {
    if (props.curve.length === 0) return '';
    return props.curve
      .map((p, i) => `${i === 0 ? 'M' : 'L'} ${mapX(p.time).toFixed(1)} ${mapY(p.glucose).toFixed(1)}`)
      .join(' ');
  };

  const gradientStops = () => {
    if (props.curve.length === 0) return [];
    const step = Math.max(1, Math.floor(props.curve.length / 6));
    return props.curve
      .filter((_, i) => i % step === 0 || i === props.curve.length - 1)
      .map((p) => ({
        offset: ((p.time - MIN_TIME) / (MAX_TIME - MIN_TIME)) * 100,
        color: glucoseColor(p.glucose),
      }));
  };

  const timeLabels = [0, 30, 60, 90, 120, 150, 180];
  const glucoseLabels = [4, 6, 8, 10, 12, 14];

  const peakX = () => mapX(props.peakTime);
  const peakY = () => mapY(props.peakValue);

  const riskBadge = () => {
    switch (props.riskLevel) {
      case 'low': return 'badge-low';
      case 'medium': return 'badge-medium';
      case 'high': return 'badge-high';
    }
  };

  return (
    <div class="glass-card p-4">
      <div class="flex items-center justify-between mb-3">
        <h3 class="section-title">Blood Sugar Prediction</h3>
        <span class={riskBadge()}>{props.riskLevel.toUpperCase()}</span>
      </div>
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} class="w-full" style="max-height: 320px">
        <defs>
          <linearGradient id="curveGradient" x1="0" y1="0" x2="1" y2="0">
            <For each={gradientStops()}>
              {(stop) => <stop offset={`${stop.offset}%`} stop-color={stop.color} />}
            </For>
          </linearGradient>
          <linearGradient id="safeZoneGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#00FF88" stop-opacity="0.08" />
            <stop offset="100%" stop-color="#00FF88" stop-opacity="0.03" />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <rect
          x={PADDING.left}
          y={mapY(SAFE_HIGH)}
          width={chartW}
          height={mapY(SAFE_LOW) - mapY(SAFE_HIGH)}
          fill="url(#safeZoneGradient)"
        />
        <line
          x1={PADDING.left}
          y1={mapY(SAFE_HIGH)}
          x2={WIDTH - PADDING.right}
          y2={mapY(SAFE_HIGH)}
          stroke="#00FF88"
          stroke-width="0.5"
          stroke-dasharray="4 4"
          opacity="0.4"
        />
        <line
          x1={PADDING.left}
          y1={mapY(SAFE_LOW)}
          x2={WIDTH - PADDING.right}
          y2={mapY(SAFE_LOW)}
          stroke="#00FF88"
          stroke-width="0.5"
          stroke-dasharray="4 4"
          opacity="0.4"
        />

        <For each={glucoseLabels}>
          {(g) => (
            <g>
              <line
                x1={PADDING.left}
                y1={mapY(g)}
                x2={WIDTH - PADDING.right}
                y2={mapY(g)}
                stroke="#21262D"
                stroke-width="0.5"
              />
              <text
                x={PADDING.left - 8}
                y={mapY(g)}
                text-anchor="end"
                dominant-baseline="middle"
                fill="#8B949E"
                class="font-body"
                style="font-size: 10px"
              >
                {g}
              </text>
            </g>
          )}
        </For>

        <For each={timeLabels}>
          {(t) => (
            <g>
              <line
                x1={mapX(t)}
                y1={PADDING.top}
                x2={mapX(t)}
                y2={HEIGHT - PADDING.bottom}
                stroke="#21262D"
                stroke-width="0.5"
              />
              <text
                x={mapX(t)}
                y={HEIGHT - PADDING.bottom + 16}
                text-anchor="middle"
                fill="#8B949E"
                class="font-body"
                style="font-size: 10px"
              >
                {t}min
              </text>
            </g>
          )}
        </For>

        <path
          d={pathD()}
          fill="none"
          stroke="url(#curveGradient)"
          stroke-width="2.5"
          stroke-linecap="round"
          stroke-linejoin="round"
          filter="url(#glow)"
        />

        {props.curve.length > 0 && (
          <g>
            <circle
              cx={peakX()}
              cy={peakY()}
              r="6"
              fill={glucoseColor(props.peakValue)}
              opacity="0.3"
              class="animate-pulse-glow"
            />
            <circle
              cx={peakX()}
              cy={peakY()}
              r="4"
              fill={glucoseColor(props.peakValue)}
            />
            <rect
              x={peakX() - 28}
              y={peakY() - 24}
              width="56"
              height="18"
              rx="4"
              fill="#161B22"
              stroke={glucoseColor(props.peakValue)}
              stroke-width="0.5"
            />
            <text
              x={peakX()}
              y={peakY() - 13}
              text-anchor="middle"
              fill={glucoseColor(props.peakValue)}
              class="font-display font-bold"
              style="font-size: 10px"
            >
              {props.peakValue.toFixed(1)}
            </text>
          </g>
        )}

        <text
          x={WIDTH / 2}
          y={HEIGHT - 4}
          text-anchor="middle"
          fill="#8B949E"
          class="font-body"
          style="font-size: 10px"
        >
          Time (min)
        </text>
        <text
          x={8}
          y={HEIGHT / 2}
          text-anchor="middle"
          dominant-baseline="middle"
          fill="#8B949E"
          class="font-body"
          style="font-size: 10px"
          transform={`rotate(-90, 8, ${HEIGHT / 2})`}
        >
          Glucose (mmol/L)
        </text>
      </svg>
    </div>
  );
}
