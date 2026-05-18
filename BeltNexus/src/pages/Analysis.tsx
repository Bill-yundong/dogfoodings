import { Component, onMount, onCleanup, createSignal } from 'solid-js';
import * as echarts from 'echarts';

export const Analysis: Component = () => {
  let wearChartRef: HTMLDivElement | undefined;
  let predictionChartRef: HTMLDivElement | undefined;
  let wearChart: echarts.ECharts | undefined;
  let predictionChart: echarts.ECharts | undefined;

  const [selectedPosition] = createSignal(50);

  const wearHistory = () => {
    const data = [];
    for (let i = 30; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const baseWear = 2 + (30 - i) * 0.05;
      data.push({
        date: date.toISOString().split('T')[0],
        wear: baseWear + Math.sin(i * 0.5) * 0.3 + Math.random() * 0.2,
      });
    }
    return data;
  };

  const positionWear = () => {
    const data = [];
    for (let i = 0; i <= 100; i += 2) {
      const baseWear = 3 + Math.sin(i * 0.1) * 1.5 + Math.cos(i * 0.05) * 0.5;
      data.push([i, baseWear + Math.random() * 0.3]);
    }
    return data;
  };

  const predictions = () => {
    const data = [];
    const currentWear = 3.5;
    const wearRate = 0.02;
    
    for (let i = 0; i <= 365; i += 7) {
      const predictedWear = currentWear + wearRate * i;
      const upper = predictedWear + 0.5 * (1 + i / 365);
      const lower = Math.max(0, predictedWear - 0.5 * (1 + i / 365));
      data.push({
        day: i,
        predicted: predictedWear,
        upper,
        lower,
      });
    }
    return data;
  };

  function initCharts() {
    if (wearChartRef) {
      wearChart = echarts.init(wearChartRef, 'dark');
      const posData = positionWear();
      
      wearChart.setOption({
        backgroundColor: 'transparent',
        title: {
          text: '皮带全线磨损分布',
          textStyle: {
            color: '#9ca3af',
            fontSize: 12,
          },
        },
        grid: {
          top: 40,
          right: 20,
          bottom: 50,
          left: 50,
        },
        tooltip: {
          trigger: 'axis',
          backgroundColor: 'rgba(13, 17, 23, 0.9)',
          borderColor: '#374151',
          textStyle: { color: '#e5e7eb' },
          formatter: (params: any) => {
            const p = params[0];
            return `位置: ${p.value[0]}m<br/>磨损深度: ${p.value[1].toFixed(2)}mm`;
          },
        },
        xAxis: {
          type: 'value',
          name: '位置 (m)',
          nameTextStyle: { color: '#6b7280' },
          axisLabel: { color: '#9ca3af' },
          axisLine: { lineStyle: { color: '#374151' } },
          splitLine: { lineStyle: { color: '#1f2937' } },
        },
        yAxis: {
          type: 'value',
          name: '磨损深度 (mm)',
          nameTextStyle: { color: '#6b7280' },
          axisLabel: { color: '#9ca3af' },
          axisLine: { lineStyle: { color: '#374151' } },
          splitLine: { lineStyle: { color: '#1f2937' } },
        },
        visualMap: {
          show: false,
          min: 0,
          max: 8,
          inRange: {
            color: ['#00f5d4', '#ff6b35', '#ef4444'],
          },
        },
        series: [
          {
            type: 'line',
            data: posData,
            smooth: true,
            symbol: 'none',
            lineStyle: {
              width: 3,
            },
            areaStyle: {
              color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                { offset: 0, color: 'rgba(255, 107, 53, 0.3)' },
                { offset: 1, color: 'rgba(255, 107, 53, 0)' },
              ]),
            },
            markLine: {
              silent: true,
              lineStyle: { color: '#ef4444', type: 'dashed' },
              data: [{ yAxis: 6, label: { formatter: '报废阈值', color: '#ef4444' } }],
            },
          },
        ],
      });
    }

    if (predictionChartRef) {
      predictionChart = echarts.init(predictionChartRef, 'dark');
      const predData = predictions();
      
      predictionChart.setOption({
        backgroundColor: 'transparent',
        title: {
          text: '剩余寿命预测',
          textStyle: {
            color: '#9ca3af',
            fontSize: 12,
          },
        },
        grid: {
          top: 40,
          right: 20,
          bottom: 50,
          left: 50,
        },
        tooltip: {
          trigger: 'axis',
          backgroundColor: 'rgba(13, 17, 23, 0.9)',
          borderColor: '#374151',
          textStyle: { color: '#e5e7eb' },
        },
        xAxis: {
          type: 'value',
          name: '预测天数',
          nameTextStyle: { color: '#6b7280' },
          axisLabel: { color: '#9ca3af' },
          axisLine: { lineStyle: { color: '#374151' } },
          splitLine: { lineStyle: { color: '#1f2937' } },
        },
        yAxis: {
          type: 'value',
          name: '磨损深度 (mm)',
          nameTextStyle: { color: '#6b7280' },
          axisLabel: { color: '#9ca3af' },
          axisLine: { lineStyle: { color: '#374151' } },
          splitLine: { lineStyle: { color: '#1f2937' } },
        },
        series: [
          {
            name: '预测值',
            type: 'line',
            data: predData.map((d) => [d.day, d.predicted]),
            smooth: true,
            lineStyle: { color: '#00f5d4', width: 2 },
            itemStyle: { color: '#00f5d4' },
          },
          {
            name: '置信区间',
            type: 'line',
            data: predData.map((d) => [d.day, d.upper]),
            smooth: true,
            lineStyle: { opacity: 0 },
            stack: 'confidence',
          },
          {
            name: '置信区间下限',
            type: 'line',
            data: predData.map((d) => [d.day, d.lower - d.upper]),
            smooth: true,
            lineStyle: { opacity: 0 },
            stack: 'confidence',
            areaStyle: {
              color: 'rgba(0, 245, 212, 0.1)',
            },
          },
        ],
      });
    }
  }

  function handleResize() {
    wearChart?.resize();
    predictionChart?.resize();
  }

  onMount(() => {
    initCharts();
    window.addEventListener('resize', handleResize);
  });

  onCleanup(() => {
    window.removeEventListener('resize', handleResize);
    wearChart?.dispose();
    predictionChart?.dispose();
  });

  return (
    <div class="p-6 h-full overflow-auto">
      <div class="mb-6">
        <h1 class="text-2xl font-bold text-white mb-1">磨损分析</h1>
        <p class="text-sm text-gray-400">长周期磨损档案分析与剩余寿命预测</p>
      </div>

      <div class="grid grid-cols-4 gap-4 mb-6">
        <div class="bg-industrial-800/30 rounded-xl border border-industrial-700/50 p-4">
          <div class="text-sm text-gray-400 mb-1">平均磨损深度</div>
          <div class="text-2xl font-bold font-mono text-warning-400">3.42 mm</div>
          <div class="text-xs text-gray-500 mt-1">阈值: 6.0 mm</div>
        </div>
        <div class="bg-industrial-800/30 rounded-xl border border-industrial-700/50 p-4">
          <div class="text-sm text-gray-400 mb-1">磨损速率</div>
          <div class="text-2xl font-bold font-mono text-tech-400">0.021</div>
          <div class="text-xs text-gray-500 mt-1">mm/1000小时</div>
        </div>
        <div class="bg-industrial-800/30 rounded-xl border border-industrial-700/50 p-4">
          <div class="text-sm text-gray-400 mb-1">预计剩余寿命</div>
          <div class="text-2xl font-bold font-mono text-green-400">285</div>
          <div class="text-xs text-gray-500 mt-1">天</div>
        </div>
        <div class="bg-industrial-800/30 rounded-xl border border-industrial-700/50 p-4">
          <div class="text-sm text-gray-400 mb-1">累计运行时间</div>
          <div class="text-2xl font-bold font-mono text-industrial-400">12,458</div>
          <div class="text-xs text-gray-500 mt-1">小时</div>
        </div>
      </div>

      <div class="grid grid-cols-2 gap-4 mb-6">
        <div class="bg-industrial-800/30 rounded-xl border border-industrial-700/50 p-4 h-[350px]">
          <div ref={wearChartRef} class="w-full h-full" />
        </div>
        <div class="bg-industrial-800/30 rounded-xl border border-industrial-700/50 p-4 h-[350px]">
          <div ref={predictionChartRef} class="w-full h-full" />
        </div>
      </div>

      <div class="grid grid-cols-3 gap-4">
        <div class="col-span-2 bg-industrial-800/30 rounded-xl border border-industrial-700/50 p-4">
          <div class="text-sm text-gray-400 mb-4">历史磨损记录</div>
          <div class="overflow-auto max-h-[300px]">
            <table class="w-full text-sm">
              <thead>
                <tr class="text-gray-400 text-left">
                  <th class="pb-3 pr-4">日期</th>
                  <th class="pb-3 pr-4">位置</th>
                  <th class="pb-3 pr-4">磨损深度</th>
                  <th class="pb-3 pr-4">磨损速率</th>
                  <th class="pb-3 pr-4">平均张力</th>
                  <th class="pb-3">运行时长</th>
                </tr>
              </thead>
              <tbody>
                {wearHistory().slice().reverse().map((record) => (
                  <tr class="border-t border-industrial-700/30">
                    <td class="py-3 pr-4 text-gray-400">{record.date}</td>
                    <td class="py-3 pr-4 font-mono text-gray-400">{selectedPosition()}m</td>
                    <td class="py-3 pr-4 font-mono text-warning-400">{record.wear.toFixed(2)}mm</td>
                    <td class="py-3 pr-4 font-mono text-tech-400">0.021</td>
                    <td class="py-3 pr-4 font-mono text-gray-400">56.2kN</td>
                    <td class="py-3 text-gray-500">16h</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div class="bg-industrial-800/30 rounded-xl border border-industrial-700/50 p-4">
          <div class="text-sm text-gray-400 mb-4">维护建议</div>
          <div class="space-y-3">
            <div class="p-3 rounded-lg bg-green-500/10 border border-green-500/30">
              <div class="text-sm font-medium text-green-400 mb-1">正常运行</div>
              <div class="text-xs text-gray-400">当前磨损状态良好，建议继续正常巡检</div>
            </div>
            <div class="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
              <div class="text-sm font-medium text-yellow-400 mb-1">重点关注</div>
              <div class="text-xs text-gray-400">45m-55m 区域磨损较快，建议增加检测频率</div>
            </div>
            <div class="p-3 rounded-lg bg-industrial-500/10 border border-industrial-500/30">
              <div class="text-sm font-medium text-industrial-400 mb-1">下次维护</div>
              <div class="text-xs text-gray-400">预计 2024-06-15 进行全面检查</div>
            </div>
            <div class="p-3 rounded-lg bg-industrial-500/10 border border-industrial-500/30">
              <div class="text-sm font-medium text-industrial-400 mb-1">更换预测</div>
              <div class="text-xs text-gray-400">预计 2025-03-10 达到报废阈值</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
