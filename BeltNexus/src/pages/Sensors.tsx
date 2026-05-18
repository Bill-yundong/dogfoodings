import { Component, createEffect, onMount, onCleanup } from 'solid-js';
import * as echarts from 'echarts';
import { sensorState } from '@/stores/sensorStore';
import { formatTime } from '@/utils/format';
import { mean } from '@/utils/math';

export const Sensors: Component = () => {
  let tensionChartRef: HTMLDivElement | undefined;
  let tempChartRef: HTMLDivElement | undefined;
  let vibrationChartRef: HTMLDivElement | undefined;
  let tensionChart: echarts.ECharts | undefined;
  let tempChart: echarts.ECharts | undefined;
  let vibrationChart: echarts.ECharts | undefined;

  function initCharts() {
    const commonOption: echarts.EChartsOption = {
      backgroundColor: 'transparent',
      grid: {
        top: 30,
        right: 20,
        bottom: 30,
        left: 50,
      },
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(13, 17, 23, 0.9)',
        borderColor: '#374151',
        textStyle: {
          color: '#e5e7eb',
        },
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
        type: 'value',
        axisLabel: {
          color: '#9ca3af',
          fontSize: 10,
        },
        axisLine: {
          lineStyle: {
            color: '#374151',
          },
        },
        splitLine: {
          lineStyle: {
            color: '#1f2937',
          },
        },
      },
    };

    if (tensionChartRef) {
      tensionChart = echarts.init(tensionChartRef, 'dark');
      tensionChart.setOption({
        ...commonOption,
        title: {
          text: '张力趋势',
          textStyle: {
            color: '#9ca3af',
            fontSize: 12,
          },
        },
        series: [
          {
            type: 'line',
            data: [],
            smooth: true,
            symbol: 'none',
            lineStyle: {
              color: '#00f5d4',
              width: 2,
            },
            areaStyle: {
              color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                { offset: 0, color: 'rgba(0, 245, 212, 0.3)' },
                { offset: 1, color: 'rgba(0, 245, 212, 0)' },
              ]),
            },
          },
        ],
      });
    }

    if (tempChartRef) {
      tempChart = echarts.init(tempChartRef, 'dark');
      tempChart.setOption({
        ...commonOption,
        title: {
          text: '温度趋势',
          textStyle: {
            color: '#9ca3af',
            fontSize: 12,
          },
        },
        series: [
          {
            type: 'line',
            data: [],
            smooth: true,
            symbol: 'none',
            lineStyle: {
              color: '#ff6b35',
              width: 2,
            },
            areaStyle: {
              color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                { offset: 0, color: 'rgba(255, 107, 53, 0.3)' },
                { offset: 1, color: 'rgba(255, 107, 53, 0)' },
              ]),
            },
          },
        ],
      });
    }

    if (vibrationChartRef) {
      vibrationChart = echarts.init(vibrationChartRef, 'dark');
      vibrationChart.setOption({
        ...commonOption,
        title: {
          text: '振动趋势',
          textStyle: {
            color: '#9ca3af',
            fontSize: 12,
          },
        },
        series: [
          {
            type: 'line',
            data: [],
            smooth: true,
            symbol: 'none',
            lineStyle: {
              color: '#a855f7',
              width: 2,
            },
            areaStyle: {
              color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                { offset: 0, color: 'rgba(168, 85, 247, 0.3)' },
                { offset: 1, color: 'rgba(168, 85, 247, 0)' },
              ]),
            },
          },
        ],
      });
    }
  }

  function updateCharts() {
    const allData = Array.from(sensorState.recentData.values()).flat();
    if (allData.length === 0) return;

    const timeMap = new Map<number, { tension: number[]; temp: number[]; vibration: number[] }>();
    
    for (const data of allData) {
      const ts = Math.floor(data.timestamp / 1000) * 1000;
      if (!timeMap.has(ts)) {
        timeMap.set(ts, { tension: [], temp: [], vibration: [] });
      }
      const entry = timeMap.get(ts)!;
      entry.tension.push(data.tension);
      entry.temp.push(data.temperature);
      entry.vibration.push(data.vibration);
    }

    const sortedTimes = Array.from(timeMap.keys()).sort().slice(-50);
    const xData = sortedTimes.map((t) => formatTime(t));
    const tensionData = sortedTimes.map((t) => mean(timeMap.get(t)!.tension));
    const tempData = sortedTimes.map((t) => mean(timeMap.get(t)!.temp));
    const vibrationData = sortedTimes.map((t) => mean(timeMap.get(t)!.vibration));

    if (tensionChart) {
      tensionChart.setOption({
        xAxis: { data: xData },
        series: [{ data: tensionData }],
      });
    }
    if (tempChart) {
      tempChart.setOption({
        xAxis: { data: xData },
        series: [{ data: tempData }],
      });
    }
    if (vibrationChart) {
      vibrationChart.setOption({
        xAxis: { data: xData },
        series: [{ data: vibrationData }],
      });
    }
  }

  function handleResize() {
    tensionChart?.resize();
    tempChart?.resize();
    vibrationChart?.resize();
  }

  createEffect(() => {
    updateCharts();
  });

  onMount(() => {
    initCharts();
    window.addEventListener('resize', handleResize);
  });

  onCleanup(() => {
    window.removeEventListener('resize', handleResize);
    tensionChart?.dispose();
    tempChart?.dispose();
    vibrationChart?.dispose();
  });

  return (
    <div class="p-6 h-full overflow-auto">
      <div class="mb-6">
        <h1 class="text-2xl font-bold text-white mb-1">传感器监控</h1>
        <p class="text-sm text-gray-400">分布式光纤传感器实时数据采集与分析</p>
      </div>

      <div class="grid grid-cols-4 gap-4 mb-6">
        {sensorState.sensors.slice(0, 8).map((sensor) => {
          const data = sensorState.latestData.get(sensor.id);
          return (
            <div
              class={`p-4 rounded-xl border transition-all ${
                sensor.isActive
                  ? 'bg-industrial-800/30 border-industrial-700/50 hover:border-industrial-600/50'
                  : 'bg-gray-800/30 border-gray-700/50 opacity-50'
              }`}
            >
              <div class="flex items-center justify-between mb-2">
                <span class="text-sm font-medium text-gray-300">{sensor.name}</span>
                <div
                  class={`w-2 h-2 rounded-full ${
                    data && data.tension > 70
                      ? 'bg-red-500 animate-pulse'
                      : sensor.isActive
                      ? 'bg-green-500'
                      : 'bg-gray-500'
                  }`}
                />
              </div>
              {data && (
                <div class="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <div class="text-gray-500">张力</div>
                    <div class="font-mono text-tech-400">{data.tension.toFixed(1)} kN</div>
                  </div>
                  <div>
                    <div class="text-gray-500">温度</div>
                    <div class="font-mono text-warning-400">{data.temperature.toFixed(1)} °C</div>
                  </div>
                  <div>
                    <div class="text-gray-500">振动</div>
                    <div class="font-mono text-purple-400">{data.vibration.toFixed(2)}</div>
                  </div>
                  <div>
                    <div class="text-gray-500">位置</div>
                    <div class="font-mono text-gray-400">{sensor.position.toFixed(0)}m</div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div class="grid grid-cols-3 gap-4">
        <div class="bg-industrial-800/30 rounded-xl border border-industrial-700/50 p-4 h-[300px]">
          <div ref={tensionChartRef} class="w-full h-full" />
        </div>
        <div class="bg-industrial-800/30 rounded-xl border border-industrial-700/50 p-4 h-[300px]">
          <div ref={tempChartRef} class="w-full h-full" />
        </div>
        <div class="bg-industrial-800/30 rounded-xl border border-industrial-700/50 p-4 h-[300px]">
          <div ref={vibrationChartRef} class="w-full h-full" />
        </div>
      </div>

      <div class="mt-6 bg-industrial-800/30 rounded-xl border border-industrial-700/50 p-4">
        <div class="text-sm text-gray-400 mb-4">传感器列表</div>
        <div class="overflow-auto max-h-[400px]">
          <table class="w-full text-sm">
            <thead>
              <tr class="text-gray-400 text-left">
                <th class="pb-3 pr-4">传感器ID</th>
                <th class="pb-3 pr-4">名称</th>
                <th class="pb-3 pr-4">通道</th>
                <th class="pb-3 pr-4">位置</th>
                <th class="pb-3 pr-4">采样率</th>
                <th class="pb-3 pr-4">状态</th>
                <th class="pb-3">最后校准</th>
              </tr>
            </thead>
            <tbody>
              {sensorState.sensors.map((sensor) => (
                <tr class="border-t border-industrial-700/30">
                  <td class="py-3 pr-4 font-mono text-xs text-gray-500">{sensor.id}</td>
                  <td class="py-3 pr-4 text-gray-300">{sensor.name}</td>
                  <td class="py-3 pr-4 font-mono text-gray-400">CH{sensor.channel}</td>
                  <td class="py-3 pr-4 font-mono text-gray-400">{sensor.position.toFixed(1)}m</td>
                  <td class="py-3 pr-4 font-mono text-gray-400">{sensor.samplingRate}Hz</td>
                  <td class="py-3 pr-4">
                    <span
                      class={`px-2 py-1 rounded text-xs ${
                        sensor.isActive
                          ? 'bg-green-500/20 text-green-400'
                          : 'bg-gray-500/20 text-gray-400'
                      }`}
                    >
                      {sensor.isActive ? '在线' : '离线'}
                    </span>
                  </td>
                  <td class="py-3 text-gray-500 text-xs">
                    {new Date(sensor.lastCalibration).toLocaleDateString('zh-CN')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
