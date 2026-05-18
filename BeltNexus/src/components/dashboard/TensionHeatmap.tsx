import { Component, createEffect, onMount, onCleanup } from 'solid-js';
import * as echarts from 'echarts';
import type { TensionAnalysisResult } from '@/types';

interface TensionHeatmapProps {
  analysis: TensionAnalysisResult | null;
}

export const TensionHeatmap: Component<TensionHeatmapProps> = (props) => {
  let chartRef: HTMLDivElement | undefined;
  let chart: echarts.ECharts | undefined;

  function initChart() {
    if (!chartRef) return;
    
    chart = echarts.init(chartRef, 'dark');
    
    const option: echarts.EChartsOption = {
      backgroundColor: 'transparent',
      grid: {
        top: 40,
        right: 20,
        bottom: 40,
        left: 50,
      },
      xAxis: {
        type: 'category',
        data: [],
        axisLabel: {
          color: '#9ca3af',
          fontSize: 10,
        },
        axisLine: {
          lineStyle: {
            color: '#374151',
          },
        },
      },
      yAxis: {
        type: 'category',
        data: ['张力'],
        axisLabel: {
          color: '#9ca3af',
          fontSize: 10,
        },
        axisLine: {
          lineStyle: {
            color: '#374151',
          },
        },
      },
      visualMap: {
        min: 30,
        max: 100,
        orient: 'horizontal',
        left: 'center',
        bottom: 0,
        textStyle: {
          color: '#9ca3af',
        },
        inRange: {
          color: ['#00f5d4', '#ff6b35', '#ef4444'],
        },
      },
      series: [
        {
          type: 'heatmap',
          data: [],
          label: {
            show: false,
          },
          itemStyle: {
            borderWidth: 0,
            borderRadius: 2,
          },
        },
      ],
    };
    
    chart.setOption(option);
  }

  function updateChart() {
    if (!chart || !props.analysis) return;
    
    const profile = props.analysis.profile;
    const xData = profile.map((_, i) => `${(i / profile.length) * 100}`.slice(0, 4));
    const heatData = profile.map((value, i) => [i, 0, value]);
    
    chart.setOption({
      xAxis: {
        data: xData,
      },
      series: [
        {
          data: heatData,
        },
      ],
    });
  }

  function handleResize() {
    chart?.resize();
  }

  createEffect(() => {
    updateChart();
  });

  onMount(() => {
    initChart();
    window.addEventListener('resize', handleResize);
  });

  onCleanup(() => {
    window.removeEventListener('resize', handleResize);
    chart?.dispose();
  });

  return (
    <div class="h-full w-full">
      <div class="text-sm text-gray-400 mb-2">张力分布热力图</div>
      <div ref={chartRef} class="h-[calc(100%-24px)] w-full" />
    </div>
  );
};
