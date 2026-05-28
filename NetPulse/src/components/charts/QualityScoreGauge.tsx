import { Component, onMount, onCleanup, createEffect } from 'solid-js';
import { Chart as ChartJS, registerables } from 'chart.js';
import type { QualityLevel } from '@/types';
import { getQualityLevel, getQualityColor } from '@/utils/quality';

ChartJS.register(...registerables);

interface QualityScoreGaugeProps {
  score: number;
  trend?: 'improving' | 'stable' | 'deteriorating';
}

export const QualityScoreGauge: Component<QualityScoreGaugeProps> = (props) => {
  let canvasRef: HTMLCanvasElement | undefined;
  let chart: ChartJS | null = null;

  const qualityLevel = () => getQualityLevel(props.score);

  const getGradientColors = (level: QualityLevel): string[] => {
    switch (level) {
      case 'excellent':
        return ['#2ED573', '#1EB963'];
      case 'good':
        return ['#00F5FF', '#00D4DD'];
      case 'fair':
        return ['#FFA502', '#FF8C00'];
      case 'poor':
        return ['#FF4757', '#FF2E42'];
    }
  };

  onMount(() => {
    if (!canvasRef) return;

    const ctx = canvasRef.getContext('2d');
    if (!ctx) return;

    chart = new ChartJS(ctx, {
      type: 'doughnut',
      data: {
        labels: ['评分', '剩余'],
        datasets: [
          {
            data: [0, 100],
            backgroundColor: ['#00F5FF', 'rgba(139, 156, 191, 0.1)'],
            borderWidth: 0,
            circumference: 270,
            rotation: 225,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '70%',
        animation: {
          duration: 800,
          easing: 'easeOutQuart',
        },
        plugins: {
          legend: {
            display: false,
          },
          tooltip: {
            enabled: false,
          },
        },
      },
    });

    updateChart();
  });

  createEffect(() => {
    updateChart();
  });

  const updateChart = () => {
    if (!chart) return;

    const score = Math.max(0, Math.min(100, props.score));
    const colors = getGradientColors(qualityLevel());

    chart.data.datasets[0].data = [score, 100 - score];
    chart.data.datasets[0].backgroundColor = [
      colors[0],
      'rgba(139, 156, 191, 0.1)',
    ];

    if (chart.data.datasets[0].borderColor !== colors[1]) {
      chart.data.datasets[0].borderColor = colors[1];
    }

    chart.update('none');
  };

  onCleanup(() => {
    if (chart) {
      chart.destroy();
      chart = null;
    }
  });

  const trendIcon = () => {
    switch (props.trend) {
      case 'improving':
        return '↑';
      case 'deteriorating':
        return '↓';
      default:
        return '→';
    }
  };

  const trendColor = () => {
    switch (props.trend) {
      case 'improving':
        return 'text-alert-green';
      case 'deteriorating':
        return 'text-alert-red';
      default:
        return 'text-metal-500';
    }
  };

  return (
    <div class="glass-card p-5 flex flex-col items-center">
      <h3 class="font-display font-semibold text-metal-300 mb-2">综合质量评分</h3>
      <div class="relative w-48 h-48">
        <canvas ref={canvasRef} />
        <div class="absolute inset-0 flex flex-col items-center justify-center">
          <span
            class={`metric-value text-5xl ${getQualityColor(qualityLevel())}`}
          >
            {props.score.toFixed(0)}
          </span>
          <div class="flex items-center gap-2 mt-1">
            <span class={`text-lg ${trendColor()}`}>{trendIcon()}</span>
            <span class="text-sm text-metal-400 capitalize">
              {qualityLevel() === 'excellent'
                ? '优秀'
                : qualityLevel() === 'good'
                ? '良好'
                : qualityLevel() === 'fair'
                ? '一般'
                : '较差'}
            </span>
          </div>
        </div>
      </div>
      <div class="mt-3 flex gap-4 text-xs">
        <div class="flex items-center gap-1">
          <div class="w-2 h-2 rounded-full bg-alert-green" />
          <span class="text-metal-400">优秀 ≥85</span>
        </div>
        <div class="flex items-center gap-1">
          <div class="w-2 h-2 rounded-full bg-neon-cyan" />
          <span class="text-metal-400">良好 ≥65</span>
        </div>
        <div class="flex items-center gap-1">
          <div class="w-2 h-2 rounded-full bg-alert-orange" />
          <span class="text-metal-400">一般 ≥40</span>
        </div>
      </div>
    </div>
  );
};
