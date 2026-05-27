import { onMount } from 'solid-js';
import { createSignal } from 'solid-js';

interface NutritionRingProps {
  value: number;
  maxValue: number;
  label: string;
  color: string;
  size?: number;
}

export default function NutritionRing(props: NutritionRingProps) {
  const size = () => props.size || 120;
  const strokeWidth = 8;
  const radius = () => (size() - strokeWidth) / 2;
  const circumference = () => 2 * Math.PI * radius();
  const percentage = () => Math.min((props.value / props.maxValue) * 100, 100);
  const dashOffset = () => circumference() * (1 - percentage() / 100);

  const [animatedOffset, setAnimatedOffset] = createSignal(circumference());

  onMount(() => {
    requestAnimationFrame(() => {
      setAnimatedOffset(dashOffset());
    });
  });

  return (
    <div class="flex flex-col items-center gap-2">
      <svg width={size()} height={size()} viewBox={`0 0 ${size()} ${size()}`}>
        <circle
          cx={size() / 2}
          cy={size() / 2}
          r={radius()}
          fill="none"
          stroke="#21262D"
          stroke-width={strokeWidth}
        />
        <circle
          cx={size() / 2}
          cy={size() / 2}
          r={radius()}
          fill="none"
          stroke={props.color}
          stroke-width={strokeWidth}
          stroke-linecap="round"
          stroke-dasharray={`${circumference()}`}
          stroke-dashoffset={`${animatedOffset()}`}
          transform={`rotate(-90 ${size() / 2} ${size() / 2})`}
          style="transition: stroke-dashoffset 0.8s ease-out"
          filter={`drop-shadow(0 0 6px ${props.color}66)`}
        />
        <text
          x={size() / 2}
          y={size() / 2 - 4}
          text-anchor="middle"
          dominant-baseline="middle"
          class="font-display font-bold"
          fill={props.color}
          style={`font-size: ${size() * 0.22}px; text-shadow: 0 0 10px ${props.color}80`}
        >
          {Math.round(percentage())}%
        </text>
        <text
          x={size() / 2}
          y={size() / 2 + size() * 0.15}
          text-anchor="middle"
          dominant-baseline="middle"
          fill="#8B949E"
          style={`font-size: ${size() * 0.1}px`}
        >
          {props.value}/{props.maxValue}
        </text>
      </svg>
      <span class="font-body text-sm text-metabo-muted">{props.label}</span>
    </div>
  );
}
