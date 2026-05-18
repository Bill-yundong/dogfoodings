import { Component } from 'solid-js';
import { getHealthColor } from '@/utils/format';

interface HealthScoreProps {
  score: number;
}

export const HealthScore: Component<HealthScoreProps> = (props) => {
  const circumference = 2 * Math.PI * 45;
  const offset = circumference - (props.score / 100) * circumference;

  return (
    <div class="flex flex-col items-center">
      <div class="text-sm text-gray-400 mb-2">健康评分</div>
      <div class="relative">
        <svg width="120" height="120" class="transform -rotate-90">
          <circle
            cx="60"
            cy="60"
            r="45"
            fill="none"
            stroke="#1f2937"
            stroke-width="8"
          />
          <circle
            cx="60"
            cy="60"
            r="45"
            fill="none"
            stroke="currentColor"
            stroke-width="8"
            stroke-linecap="round"
            stroke-dasharray={`${circumference}`}
            stroke-dashoffset={offset}
            class={`transition-all duration-500 ${getHealthColor(props.score)}`}
            style={{ 'filter': 'drop-shadow(0 0 8px currentColor)' }}
          />
        </svg>
        <div class="absolute inset-0 flex flex-col items-center justify-center">
          <span class={`text-3xl font-bold font-mono ${getHealthColor(props.score)}`}>
            {Math.round(props.score)}
          </span>
          <span class="text-xs text-gray-500">/ 100</span>
        </div>
      </div>
      <div class="mt-2 text-xs text-gray-500">
        {props.score >= 80 ? '运行良好' :
         props.score >= 60 ? '需要关注' :
         props.score >= 40 ? '建议维护' : '立即检修'}
      </div>
    </div>
  );
};
