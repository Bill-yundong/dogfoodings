import React, { useMemo } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';
import dayjs from 'dayjs';
import type { WeatherData } from '@/types';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface WeatherChartProps {
  data: WeatherData[];
  metric: 'windSpeed' | 'waveHeight' | 'visibility' | 'temperature' | 'pressure';
  title?: string;
  height?: number;
}

const metricConfig = {
  windSpeed: {
    label: '风速 (m/s)',
    color: '#3369B8',
    backgroundColor: 'rgba(51, 105, 184, 0.2)',
    yMin: 0,
    yMax: 30,
  },
  waveHeight: {
    label: '浪高 (m)',
    color: '#F46036',
    backgroundColor: 'rgba(244, 96, 54, 0.2)',
    yMin: 0,
    yMax: 8,
  },
  visibility: {
    label: '能见度 (km)',
    color: '#1B998B',
    backgroundColor: 'rgba(27, 153, 139, 0.2)',
    yMin: 0,
    yMax: 20,
  },
  temperature: {
    label: '气温 (℃)',
    color: '#E25832',
    backgroundColor: 'rgba(226, 88, 50, 0.2)',
    yMin: -10,
    yMax: 40,
  },
  pressure: {
    label: '气压 (hPa)',
    color: '#9AA5B1',
    backgroundColor: 'rgba(154, 165, 177, 0.2)',
    yMin: 980,
    yMax: 1040,
  },
};

export const WeatherChart: React.FC<WeatherChartProps> = ({ data, metric, title, height = 200 }) => {
  const config = metricConfig[metric];

  const chartData = useMemo(() => {
    const sorted = [...data].sort((a, b) => a.timestamp - b.timestamp);
    return {
      labels: sorted.map(d => dayjs(d.timestamp).format('HH:mm')),
      datasets: [
        {
          label: config.label,
          data: sorted.map(d => d[metric]),
          borderColor: config.color,
          backgroundColor: config.backgroundColor,
          fill: true,
          tension: 0.3,
          pointRadius: 0,
          pointHoverRadius: 4,
          pointHoverBackgroundColor: config.color,
          borderWidth: 2,
        },
      ],
    };
  }, [data, metric, config]);

  const options = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: 500,
    },
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        mode: 'index' as const,
        intersect: false,
        backgroundColor: '#1F2933',
        titleColor: '#E4E7EB',
        bodyColor: '#CBD2D9',
        borderColor: '#323F4B',
        borderWidth: 1,
        padding: 10,
        titleFont: {
          family: "'JetBrains Mono', monospace",
          size: 11,
        },
        bodyFont: {
          family: "'JetBrains Mono', monospace",
          size: 12,
        },
      },
    },
    scales: {
      x: {
        grid: {
          color: 'rgba(50, 63, 75, 0.5)',
          drawBorder: false,
        },
        ticks: {
          color: '#7B8794',
          font: {
            family: "'JetBrains Mono', monospace",
            size: 10,
          },
          maxRotation: 0,
          maxTicksLimit: 8,
        },
      },
      y: {
        min: config.yMin,
        max: config.yMax,
        grid: {
          color: 'rgba(50, 63, 75, 0.5)',
          drawBorder: false,
        },
        ticks: {
          color: '#7B8794',
          font: {
            family: "'JetBrains Mono', monospace",
            size: 10,
          },
        },
      },
    },
    interaction: {
      mode: 'nearest' as const,
      axis: 'x' as const,
      intersect: false,
    },
  }), [config]);

  return (
    <div className="w-full">
      {title && <div className="data-label mb-2">{title}</div>}
      <div style={{ height }}>
        <Line data={chartData} options={options} />
      </div>
    </div>
  );
};

interface WaveBarChartProps {
  data: WeatherData[];
  height?: number;
}

export const WaveBarChart: React.FC<WaveBarChartProps> = ({ data, height = 200 }) => {
  const chartData = useMemo(() => {
    const sorted = [...data].sort((a, b) => a.timestamp - b.timestamp);
    return {
      labels: sorted.map(d => dayjs(d.timestamp).format('HH:mm')),
      datasets: [
        {
          label: '浪高 (m)',
          data: sorted.map(d => d.waveHeight),
          backgroundColor: sorted.map(d =>
            d.waveHeight > 4 ? 'rgba(239, 68, 68, 0.7)' :
            d.waveHeight > 2.5 ? 'rgba(244, 96, 54, 0.7)' :
            'rgba(27, 153, 139, 0.7)'
          ),
          borderRadius: 2,
          borderSkipped: false,
        },
      ],
    };
  }, [data]);

  const options = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: 500,
    },
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: '#1F2933',
        titleColor: '#E4E7EB',
        bodyColor: '#CBD2D9',
        borderColor: '#323F4B',
        borderWidth: 1,
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: {
          color: '#7B8794',
          font: { family: "'JetBrains Mono', monospace", size: 9 },
          maxTicksLimit: 10,
        },
      },
      y: {
        min: 0,
        max: 8,
        grid: { color: 'rgba(50, 63, 75, 0.3)' },
        ticks: {
          color: '#7B8794',
          font: { family: "'JetBrains Mono', monospace", size: 10 },
        },
      },
    },
  }), []);

  return (
    <div style={{ height }}>
      <Bar data={chartData} options={options} />
    </div>
  );
};
