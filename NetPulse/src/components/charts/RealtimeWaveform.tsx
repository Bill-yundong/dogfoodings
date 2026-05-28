import { Component, onMount, onCleanup, createEffect } from 'solid-js';
import { Chart as ChartJS, registerables } from 'chart.js';
import type { ProbeResult } from '@/types';

ChartJS.register(...registerables);

interface RealtimeWaveformProps {
  data: ProbeResult[];
  maxPoints?: number;
  height?: number;
}

export const RealtimeWaveform: Component<RealtimeWaveformProps> = (props) => {
  let canvasRef: HTMLCanvasElement | undefined;
  let chart: ChartJS | null = null;
  let animationFrame: number;

  const maxPoints = () => props.maxPoints || 60;
  const height = () => props.height || 200;

  onMount(() => {
    if (!canvasRef) return;

    const ctx = canvasRef.getContext('2d');
    if (!ctx) return;

    const gradient = ctx.createLinearGradient(0, 0, 0, height());
    gradient.addColorStop(0, 'rgba(0, 245, 255, 0.3)');
    gradient.addColorStop(1, 'rgba(0, 245, 255, 0)');

    const jitterGradient = ctx.createLinearGradient(0, 0, 0, height());
    jitterGradient.addColorStop(0, 'rgba(123, 97, 255, 0.3)');
    jitterGradient.addColorStop(1, 'rgba(123, 97, 255, 0)');

    chart = new ChartJS(ctx, {
      type: 'line',
      data: {
        labels: [],
        datasets: [
          {
            label: '时延 (ms)',
            data: [],
            borderColor: '#00F5FF',
            backgroundColor: gradient,
            fill: true,
            tension: 0.4,
            pointRadius: 0,
            pointHoverRadius: 4,
            pointHoverBackgroundColor: '#00F5FF',
            pointHoverBorderColor: '#fff',
            pointHoverBorderWidth: 2,
            borderWidth: 2,
          },
          {
            label: '抖动 (ms)',
            data: [],
            borderColor: '#7B61FF',
            backgroundColor: jitterGradient,
            fill: true,
            tension: 0.4,
            pointRadius: 0,
            pointHoverRadius: 4,
            pointHoverBackgroundColor: '#7B61FF',
            pointHoverBorderColor: '#fff',
            pointHoverBorderWidth: 2,
            borderWidth: 2,
            yAxisID: 'y1',
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        interaction: {
          intersect: false,
          mode: 'index',
        },
        plugins: {
          legend: {
            display: true,
            position: 'top',
            labels: {
              color: '#B4C2D9',
              font: {
                family: "'JetBrains Mono', monospace",
                size: 11,
              },
              usePointStyle: true,
              pointStyle: 'circle',
              padding: 20,
            },
          },
          tooltip: {
            backgroundColor: 'rgba(11, 18, 32, 0.95)',
            titleColor: '#00F5FF',
            bodyColor: '#E8ECF4',
            borderColor: 'rgba(0, 245, 255, 0.3)',
            borderWidth: 1,
            padding: 12,
            displayColors: true,
            callbacks: {
              title: (items) => {
                const idx = items[0]?.dataIndex ?? 0;
                const result = props.data[idx];
                return result ? new Date(result.timestamp).toLocaleTimeString() : '';
              },
            },
          },
        },
        scales: {
          x: {
            display: true,
            grid: {
              color: 'rgba(0, 245, 255, 0.05)',
            },
            ticks: {
              color: '#5A6B8C',
              font: {
                family: "'JetBrains Mono', monospace",
                size: 10,
              },
              maxTicksLimit: 8,
              callback: (_value, index) => {
                const result = props.data[index];
                return result ? new Date(result.timestamp).toLocaleTimeString().slice(-8, -3) : '';
              },
            },
          },
          y: {
            type: 'linear',
            display: true,
            position: 'left',
            grid: {
              color: 'rgba(0, 245, 255, 0.05)',
            },
            ticks: {
              color: '#5A6B8C',
              font: {
                family: "'JetBrains Mono', monospace",
                size: 10,
              },
              callback: (value) => `${value}ms`,
            },
            title: {
              display: true,
              text: '时延 (ms)',
              color: '#00F5FF',
              font: {
                family: "'JetBrains Mono', monospace",
                size: 11,
                weight: 600 as const,
              },
            },
          },
          y1: {
            type: 'linear',
            display: true,
            position: 'right',
            grid: {
              drawOnChartArea: false,
            },
            ticks: {
              color: '#7B61FF',
              font: {
                family: "'JetBrains Mono', monospace",
                size: 10,
              },
              callback: (value) => `${value}ms`,
            },
            title: {
              display: true,
              text: '抖动 (ms)',
              color: '#7B61FF',
              font: {
                family: "'JetBrains Mono', monospace",
                size: 11,
                weight: 600 as const,
              },
            },
          },
        },
      },
    });

    updateChart();
  });

  createEffect(() => {
    if (props.data.length > 0) {
      updateChart();
    }
  });

  const updateChart = () => {
    if (!chart) return;

    const data = props.data.slice(-maxPoints());
    const labels = data.map((_, i) => i.toString());

    chart.data.labels = labels;
    chart.data.datasets[0].data = data.map((d) => d.latency);
    chart.data.datasets[1].data = data.map((d) => d.jitter);

    cancelAnimationFrame(animationFrame);
    animationFrame = requestAnimationFrame(() => {
      chart?.update('none');
    });
  };

  onCleanup(() => {
    cancelAnimationFrame(animationFrame);
    if (chart) {
      chart.destroy();
      chart = null;
    }
  });

  return (
    <div class="glass-card p-4">
      <div class="flex items-center justify-between mb-4">
        <h3 class="font-display font-semibold text-neon-cyan">实时波形图</h3>
        <span class="text-xs text-metal-500">最近 {maxPoints()} 个数据点</span>
      </div>
      <div style={`height: ${height()}px`}>
        <canvas ref={canvasRef} />
      </div>
    </div>
  );
};
