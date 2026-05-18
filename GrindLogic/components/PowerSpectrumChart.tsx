'use client';

import { useEffect, useRef } from 'react';
import * as echarts from 'echarts';
import type { PowerSpectrumPoint } from '@/types';

interface PowerSpectrumChartProps {
  data: PowerSpectrumPoint[];
  height?: number;
  showControls?: boolean;
}

export function PowerSpectrumChart({ data, height = 400, showControls = true }: PowerSpectrumChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);

  useEffect(() => {
    if (!chartRef.current) return;

    chartInstance.current = echarts.init(chartRef.current, 'dark');

    const handleResize = () => {
      chartInstance.current?.resize();
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chartInstance.current?.dispose();
    };
  }, []);

  useEffect(() => {
    if (!chartInstance.current || data.length === 0) return;

    const frequencies = data.map((p) => p.frequency.toFixed(1));
    const amplitudes = data.map((p) => p.amplitude);

    const option: echarts.EChartsOption = {
      backgroundColor: 'transparent',
      animation: true,
      animationDuration: 500,
      grid: {
        top: 60,
        right: 40,
        bottom: 60,
        left: 60,
      },
      title: {
        text: '功率谱密度分析',
        subtext: '实时磨削振动信号频域分析',
        left: 20,
        top: 10,
        textStyle: {
          color: '#D9DDE3',
          fontSize: 16,
          fontWeight: 'bold',
        },
        subtextStyle: {
          color: '#617086',
          fontSize: 12,
        },
      },
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(15, 17, 23, 0.95)',
        borderColor: 'rgba(15, 82, 186, 0.5)',
        borderWidth: 1,
        textStyle: {
          color: '#D9DDE3',
        },
        formatter: (params: any) => {
          const param = params[0];
          return `
            <div style="padding: 4px 0;">
              <div style="font-size: 12px; color: #617086; margin-bottom: 4px;">频率: ${param.name} Hz</div>
              <div style="font-size: 14px; font-weight: bold; color: #00D4AA;">
                幅值: ${param.value.toFixed(2)} dB
              </div>
            </div>
          `;
        },
      },
      xAxis: {
        type: 'category',
        data: frequencies,
        name: '频率 (Hz)',
        nameLocation: 'middle',
        nameGap: 30,
        nameTextStyle: {
          color: '#617086',
          fontSize: 12,
        },
        axisLine: {
          lineStyle: {
            color: '#353E4B',
          },
        },
        axisLabel: {
          color: '#617086',
          fontSize: 10,
          rotate: 45,
          interval: Math.floor(data.length / 10),
        },
        splitLine: {
          show: true,
          lineStyle: {
            color: 'rgba(53, 62, 75, 0.3)',
            type: 'dashed',
          },
        },
      },
      yAxis: {
        type: 'value',
        name: '幅值 (dB)',
        nameLocation: 'middle',
        nameGap: 40,
        nameTextStyle: {
          color: '#617086',
          fontSize: 12,
        },
        axisLine: {
          lineStyle: {
            color: '#353E4B',
          },
        },
        axisLabel: {
          color: '#617086',
          fontSize: 10,
        },
        splitLine: {
          show: true,
          lineStyle: {
            color: 'rgba(53, 62, 75, 0.3)',
            type: 'dashed',
          },
        },
      },
      series: [
        {
          name: '幅值',
          type: 'line',
          data: amplitudes,
          smooth: true,
          symbol: 'none',
          lineStyle: {
            width: 2,
            color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
              { offset: 0, color: '#0F52BA' },
              { offset: 0.5, color: '#00D4AA' },
              { offset: 1, color: '#0F52BA' },
            ]),
            shadowColor: 'rgba(0, 212, 170, 0.5)',
            shadowBlur: 10,
          },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: 'rgba(0, 212, 170, 0.3)' },
              { offset: 1, color: 'rgba(0, 212, 170, 0)' },
            ]),
          },
          markLine: {
            silent: true,
            symbol: 'none',
            lineStyle: {
              color: '#FF6B35',
              type: 'dashed',
              width: 1,
            },
            data: [
              {
                yAxis: 15,
                label: {
                  formatter: '告警阈值',
                  color: '#FF6B35',
                  fontSize: 10,
                },
              },
            ],
          },
        },
      ],
      dataZoom: showControls
        ? [
            {
              type: 'inside',
              start: 0,
              end: 100,
            },
            {
              type: 'slider',
              start: 0,
              end: 100,
              height: 20,
              bottom: 10,
              borderColor: 'transparent',
              backgroundColor: 'rgba(53, 62, 75, 0.5)',
              fillerColor: 'rgba(15, 82, 186, 0.3)',
              handleStyle: {
                color: '#0F52BA',
              },
              textStyle: {
                color: '#617086',
                fontSize: 10,
              },
            },
          ]
        : [],
    };

    chartInstance.current.setOption(option, true);
  }, [data, showControls]);

  return (
    <div
      ref={chartRef}
      style={{ height }}
      className="w-full rounded-xl overflow-hidden"
    />
  );
}
