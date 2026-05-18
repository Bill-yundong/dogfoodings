'use client';

import { useEffect, useRef } from 'react';
import * as echarts from 'echarts';
import type { FractalFeatures } from '@/types';

interface FractalRadarChartProps {
  features: FractalFeatures;
  height?: number;
}

export function FractalRadarChart({ features, height = 350 }: FractalRadarChartProps) {
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
    if (!chartInstance.current) return;

    const indicators = [
      { name: '盒维数', max: 2 },
      { name: '信息维数', max: 2 },
      { name: '关联维数', max: 2 },
      { name: '间隙度', max: 3 },
      { name: 'Hurst指数', max: 1 },
      { name: '多重分形', max: 2 },
    ];

    const values = [
      features.boxDimension,
      features.informationDimension,
      features.correlationDimension,
      features.lacunarity,
      features.hurstExponent,
      features.multifractalSpectrum[3] || 1,
    ];

    const option: echarts.EChartsOption = {
      backgroundColor: 'transparent',
      title: {
        text: '分形特征参数',
        left: 'center',
        top: 10,
        textStyle: {
          color: '#D9DDE3',
          fontSize: 14,
          fontWeight: 'bold',
        },
      },
      tooltip: {
        backgroundColor: 'rgba(15, 17, 23, 0.95)',
        borderColor: 'rgba(15, 82, 186, 0.5)',
        borderWidth: 1,
        textStyle: {
          color: '#D9DDE3',
        },
      },
      radar: {
        indicator: indicators,
        center: ['50%', '55%'],
        radius: '65%',
        startAngle: 90,
        splitNumber: 4,
        shape: 'polygon',
        axisName: {
          color: '#617086',
          fontSize: 11,
        },
        splitArea: {
          areaStyle: {
            color: ['rgba(15, 82, 186, 0.05)', 'rgba(15, 82, 186, 0.1)'],
          },
        },
        axisLine: {
          lineStyle: {
            color: 'rgba(53, 62, 75, 0.5)',
          },
        },
        splitLine: {
          lineStyle: {
            color: 'rgba(53, 62, 75, 0.5)',
          },
        },
      },
      series: [
        {
          type: 'radar',
          data: [
            {
              value: values,
              name: '分形特征',
              symbol: 'circle',
              symbolSize: 6,
              lineStyle: {
                color: '#00D4AA',
                width: 2,
              },
              areaStyle: {
                color: new echarts.graphic.RadialGradient(0.5, 0.5, 1, [
                  { offset: 0, color: 'rgba(0, 212, 170, 0.4)' },
                  { offset: 1, color: 'rgba(0, 212, 170, 0.1)' },
                ]),
              },
              itemStyle: {
                color: '#00D4AA',
                borderColor: '#0F52BA',
                borderWidth: 2,
              },
            },
          ],
        },
      ],
    };

    chartInstance.current.setOption(option, true);
  }, [features]);

  return (
    <div
      ref={chartRef}
      style={{ height }}
      className="w-full"
    />
  );
}
