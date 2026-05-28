import { Component, onMount, onCleanup, createEffect } from 'solid-js';
import { Chart as ChartJS, registerables } from 'chart.js';
import type { ProbeResult } from '@/types';

ChartJS.register(...registerables);

interface PacketLossGaugeProps {
  data: ProbeResult[];
  threshold: number;
}

export const PacketLossGauge: Component<PacketLossGaugeProps> = (props) => {
  let canvasRef: HTMLCanvasElement | undefined;
  let chart: ChartJS | null = null;

  const avgLoss = () => {
    if (props.data.length === 0) return 0;
    const recent = props.data.slice(-30);
    return (recent.reduce((sum, d) => sum + d.packetLoss, 0) / recent.length) * 100;
  };

  const getColor = (value: number) => {
    if (value < props.threshold * 0.5) return '#2ED573';
    if (value < props.threshold) return '#00F5FF';
    if (value < props.threshold * 1.5) return '#FFA502';
    return '#FF4757';
  };

  onMount(() => {
    if (!canvasRef) return;

    const ctx = canvasRef.getContext('2d');
    if (!ctx) return;

    chart = new ChartJS(ctx, {
      type: 'doughnut',
      data: {
        labels: ['丢包率', '可用'],
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
        cutout: '75%',
        animation: {
          duration: 500,
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

    const loss = Math.min(avgLoss(), 100);
    chart.data.datasets[0].data = [loss, Math.max(0, 100 - loss)];
    chart.data.datasets[0].backgroundColor = [
      getColor(loss),
      'rgba(139, 156, 191, 0.1)',
    ];
    chart.update('none');
  };

  onCleanup(() => {
    if (chart) {
      chart.destroy();
      chart = null;
    }
  });

  return (
    <div class="glass-card p-5 flex flex-col items-center">
      <h3 class="font-display font-semibold text-metal-300 mb-2">丢包率</h3>
      <div class="relative w-40 h-40">
        <canvas ref={canvasRef} />
        <div class="absolute inset-0 flex flex-col items-center justify-center">
          <span
            class="metric-value text-4xl"
            style={{ color: getColor(avgLoss()) }}
          >
            {avgLoss().toFixed(2)}
          </span>
          <span class="text-sm text-metal-400">%</span>
        </div>
      </div>
      <div class="mt-3 text-xs text-metal-500">
        阈值: {props.threshold}% | 采样: {Math.min(props.data.length, 30)} 个
      </div>
    </div>
  );
};
