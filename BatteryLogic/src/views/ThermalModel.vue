<script setup lang="ts">import { ref, computed, onMounted, watch } from 'vue';
import { useBatteryStore } from '@/stores/battery';
import { Play, RotateCcw, AlertTriangle, Clock, ThermometerSun, Zap, TrendingUp } from 'lucide-vue-next';
import * as echarts from 'echarts';
import { formatTime, getRiskLevelColor, getRiskLevelText } from '@/utils/arrhenius';
const batteryStore = useBatteryStore();
const chartRef = ref<HTMLDivElement | null>(null);
let chartInstance: echarts.ECharts | null = null;
const selectedCellIds = ref<string[]>([]);
const timeHorizon = ref(3600);
const criticalTemp = ref(180);
const chartData = computed(() => {
 if (selectedCellIds.value.length === 0) {
 const highRisk = batteryStore.highRiskPredictions.slice(0, 5);
 return highRisk.map(p => ({
 cellId: p.cellId,
 prediction: p
 }));
 }
 return selectedCellIds.value
 .map(id => {
 const prediction = batteryStore.predictions.find(p => p.cellId === id);
 return prediction ? { cellId: id, prediction } : null;
 })
 .filter(Boolean) as {
 cellId: string;
 prediction: typeof batteryStore.predictions[0];
 }[];
});
const cellsForSelection = computed(() => {
 return batteryStore.allCells.map(cell => ({
 ...cell,
 prediction: batteryStore.predictions.find(p => p.cellId === cell.id)
 })).sort((a, b) => {
 const priority = { low: 0, medium: 1, high: 2, extreme: 3 };
 const aLevel = a.prediction?.riskLevel || 'low';
 const bLevel = b.prediction?.riskLevel || 'low';
 return priority[bLevel] - priority[aLevel];
 });
});
function initChart() {
 if (!chartRef.value)
 return;
 chartInstance = echarts.init(chartRef.value, 'dark');
 updateChart();
}
function updateChart() {
 if (!chartInstance)
 return;
 const series: echarts.SeriesOption[] = [];
 const colors = ['#165DFF', '#00B42A', '#FF7D00', '#F53F3F', '#722ED1'];
 chartData.value.forEach((item, index) => {
 const { prediction } = item;
 if (!prediction)
 return;
 const color = colors[index % colors.length];
 series.push({
 name: item.cellId,
 type: 'line',
 smooth: true,
 showSymbol: false,
 data: prediction.temperatureCurve.map((temp, i) => [
 prediction.timePoints[i],
 temp
 ]),
 lineStyle: {
 width: 2,
 color
 },
 areaStyle: {
 color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
 { offset: 0, color: color + '40' },
 { offset: 1, color: color + '00' }
 ])
 }
 });
 });
 const option: echarts.EChartsOption = {
 backgroundColor: 'transparent',
 tooltip: {
 trigger: 'axis',
 backgroundColor: 'rgba(26, 26, 46, 0.95)',
 borderColor: '#4E5969',
 textStyle: { color: '#F2F3F5' },
 formatter: (params: any) => {
 let html = `<div style="font-family: JetBrains Mono, monospace;">`;
 params.forEach((p: any) => {
 html += `<div style="display: flex; align-items: center; gap: 8px; margin: 4px 0;">
 <span style="width: 10px; height: 10px; border-radius: 50%; background: ${p.color};"></span>
 <span>${p.seriesName}</span>
 <span style="margin-left: auto; color: ${p.color};">${p.value[1].toFixed(1)}°C</span>
 </div>`;
 });
 html += `<div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #4E5969; color: #86909C;">
 时间: ${formatTime(params[0].value[0])}
 </div>`;
 html += '</div>';
 return html;
 }
 },
 legend: {
 top: 0,
 right: 0,
 textStyle: { color: '#C9CDD4' },
 icon: 'roundRect'
 },
 grid: {
 left: 60,
 right: 20,
 top: 40,
 bottom: 50
 },
 xAxis: {
 type: 'value',
 name: '时间 (s)',
 nameTextStyle: { color: '#86909C' },
 axisLine: { lineStyle: { color: '#4E5969' } },
 axisLabel: { color: '#86909C' },
 splitLine: { lineStyle: { color: '#272E3B' } }
 },
 yAxis: {
 type: 'value',
 name: '温度 (°C)',
 nameTextStyle: { color: '#86909C' },
 axisLine: { lineStyle: { color: '#4E5969' } },
 axisLabel: { color: '#86909C' },
 splitLine: { lineStyle: { color: '#272E3B' } }
 },
 series,
 graphic: [
 {
 type: 'text',
 left: 60,
 bottom: 20,
 style: {
 text: `临界温度: ${criticalTemp.value}°C`,
 fill: '#F53F3F',
 fontSize: 12
 }
 }
 ]
 };
 chartInstance.setOption(option);
}
function toggleCellSelection(cellId: string) {
 const index = selectedCellIds.value.indexOf(cellId);
 if (index > -1) {
 selectedCellIds.value.splice(index, 1);
 }
 else {
 if (selectedCellIds.value.length < 5) {
 selectedCellIds.value.push(cellId);
 }
 }
}
function clearSelection() {
  selectedCellIds.value = [];
}

function runPrediction() {
  batteryStore.runThermalPrediction();
}

function clearResults() {
  batteryStore.predictions = [];
  batteryStore.propagationMap = new Map();
}
watch(chartData, () => {
 updateChart();
}, { deep: true });
watch(() => batteryStore.predictions, () => {
 updateChart();
}, { deep: true });
onMounted(() => {
 initChart();
 window.addEventListener('resize', () => chartInstance?.resize());
});
</script>

<template>
  <div class="h-full flex flex-col gap-4">
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-3">
        <button
          @click="runPrediction"
          :disabled="batteryStore.isCalculating"
          class="btn-primary flex items-center gap-2"
        >
          <Play class="w-4 h-4" :class="{ 'animate-spin': batteryStore.isCalculating }" />
          {{ batteryStore.isCalculating ? '计算中...' : '运行热失控预测' }}
        </button>
        <button
          @click="clearResults"
          class="btn-ghost flex items-center gap-2"
        >
          <RotateCcw class="w-4 h-4" />
          清除结果
        </button>
      </div>
      <div v-if="batteryStore.isCalculating" class="flex items-center gap-2 text-sm text-warning">
        <div class="w-2 h-2 rounded-full bg-warning animate-pulse"></div>
        计算进度: {{ batteryStore.calculationProgress }}%
      </div>
    </div>

    <div class="grid grid-cols-4 gap-4">
      <div class="data-card">
        <div class="flex items-center gap-2 text-dark-200 mb-2">
          <ThermometerSun class="w-4 h-4" />
          <span class="text-sm">总电芯数</span>
        </div>
        <div class="text-2xl font-bold font-mono text-white">
          {{ batteryStore.allCells.length }}
        </div>
      </div>

      <div class="data-card">
        <div class="flex items-center gap-2 text-dark-200 mb-2">
          <AlertTriangle class="w-4 h-4" />
          <span class="text-sm">高风险电芯</span>
        </div>
        <div class="text-2xl font-bold font-mono text-warning">
          {{ batteryStore.highRiskPredictions.length }}
        </div>
      </div>

      <div class="data-card">
        <div class="flex items-center gap-2 text-dark-200 mb-2">
          <Clock class="w-4 h-4" />
          <span class="text-sm">最短预警时间</span>
        </div>
        <div class="text-2xl font-bold font-mono text-danger">
          {{ batteryStore.highRiskPredictions.length > 0 
            ? formatTime(Math.min(...batteryStore.highRiskPredictions.map(p => p.timeToRunaway)))
            : '--' }}
        </div>
      </div>

      <div class="data-card">
        <div class="flex items-center gap-2 text-dark-200 mb-2">
          <Zap class="w-4 h-4" />
          <span class="text-sm">热蔓延路径</span>
        </div>
        <div class="text-2xl font-bold font-mono text-primary">
          {{ batteryStore.propagationMap.size }}
        </div>
      </div>
    </div>

    <div class="flex-1 grid grid-cols-4 gap-4 min-h-0">
      <div class="glass-card p-4 flex flex-col">
        <div class="flex items-center justify-between mb-3">
          <h3 class="text-white font-semibold">电芯选择</h3>
          <button
            @click="clearSelection"
            class="text-xs text-primary hover:underline"
          >
            清除选择
          </button>
        </div>
        <p class="text-xs text-dark-400 mb-2">最多选择5个电芯对比 (已选 {{ selectedCellIds.length }}/5)</p>
        <div class="flex-1 overflow-y-auto space-y-1">
          <div
            v-for="cell in cellsForSelection"
            :key="cell.id"
            @click="toggleCellSelection(cell.id)"
            class="flex items-center gap-2 p-2 rounded cursor-pointer transition-colors"
            :class="selectedCellIds.includes(cell.id) 
              ? 'bg-primary/20 border border-primary/50' 
              : 'hover:bg-dark-500/50'"
          >
            <div
              class="w-2 h-2 rounded-full"
              :style="{ backgroundColor: cell.prediction ? getRiskLevelColor(cell.prediction.riskLevel) : '#4E5969' }"
            ></div>
            <span class="text-sm font-mono text-dark-100 truncate flex-1">{{ cell.id }}</span>
            <span class="text-xs text-dark-400">{{ cell.temperature.toFixed(1) }}°C</span>
          </div>
        </div>
      </div>

      <div class="col-span-3 glass-card p-4 flex flex-col">
        <div class="flex items-center justify-between mb-3">
          <h3 class="text-white font-semibold">温升预测曲线</h3>
          <div class="flex items-center gap-4">
            <div class="flex items-center gap-2">
              <label class="text-xs text-dark-400">预测时长:</label>
              <select
                v-model="timeHorizon"
                class="bg-dark-600 border border-dark-500 rounded px-2 py-1 text-sm text-dark-100"
              >
                <option :value="600">10分钟</option>
                <option :value="1800">30分钟</option>
                <option :value="3600">1小时</option>
                <option :value="7200">2小时</option>
              </select>
            </div>
            <div class="flex items-center gap-2">
              <label class="text-xs text-dark-400">临界温度:</label>
              <input
                v-model.number="criticalTemp"
                type="number"
                min="80"
                max="300"
                class="w-20 bg-dark-600 border border-dark-500 rounded px-2 py-1 text-sm text-dark-100 text-right"
              />
              <span class="text-xs text-dark-400">°C</span>
            </div>
          </div>
        </div>
        <div ref="chartRef" class="flex-1 min-h-0"></div>
      </div>
    </div>

    <div class="glass-card p-4">
      <h3 class="text-white font-semibold mb-4">阿伦尼乌斯模型参数</h3>
      <div class="grid grid-cols-4 gap-4">
        <div>
          <label class="text-xs text-dark-400 block mb-1">活化能 (J/mol)</label>
          <input
            v-model.number="batteryStore.arrheniusParams.activationEnergy"
            type="number"
            class="w-full bg-dark-600 border border-dark-500 rounded px-3 py-2 text-dark-100 font-mono"
          />
        </div>
        <div>
          <label class="text-xs text-dark-400 block mb-1">指前因子 (1/s)</label>
          <input
            v-model.number="batteryStore.arrheniusParams.preExponentialFactor"
            type="number"
            class="w-full bg-dark-600 border border-dark-500 rounded px-3 py-2 text-dark-100 font-mono"
          />
        </div>
        <div>
          <label class="text-xs text-dark-400 block mb-1">比热容 (J/(kg·K))</label>
          <input
            v-model.number="batteryStore.arrheniusParams.heatCapacity"
            type="number"
            class="w-full bg-dark-600 border border-dark-500 rounded px-3 py-2 text-dark-100 font-mono"
          />
        </div>
        <div>
          <label class="text-xs text-dark-400 block mb-1">热传导系数 (W/(m·K))</label>
          <input
            v-model.number="batteryStore.arrheniusParams.thermalConductivity"
            type="number"
            step="0.1"
            class="w-full bg-dark-600 border border-dark-500 rounded px-3 py-2 text-dark-100 font-mono"
          />
        </div>
      </div>
    </div>

    <div v-if="batteryStore.highRiskPredictions.length > 0" class="glass-card p-4">
      <h3 class="text-white font-semibold mb-3 flex items-center gap-2">
        <TrendingUp class="w-5 h-5 text-warning" />
        高风险电芯预警
      </h3>
      <div class="grid grid-cols-4 gap-3">
        <div
          v-for="pred in batteryStore.highRiskPredictions.slice(0, 8)"
          :key="pred.cellId"
          class="p-3 rounded-lg bg-dark-600/50 border border-dark-400/30"
        >
          <div class="flex items-center justify-between mb-2">
            <span class="font-mono text-sm text-dark-100">{{ pred.cellId }}</span>
            <span
              class="text-xs px-2 py-0.5 rounded"
              :style="{
                backgroundColor: getRiskLevelColor(pred.riskLevel) + '20',
                color: getRiskLevelColor(pred.riskLevel)
              }"
            >
              {{ getRiskLevelText(pred.riskLevel) }}
            </span>
          </div>
          <div class="text-xs text-dark-300">
            预计热失控: <span class="text-white font-mono">{{ formatTime(pred.timeToRunaway) }}</span>
          </div>
          <div
            v-if="batteryStore.propagationMap.has(pred.cellId)"
            class="text-xs text-dark-400 mt-1"
          >
            影响电芯: {{ batteryStore.propagationMap.get(pred.cellId)?.length }} 个
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
