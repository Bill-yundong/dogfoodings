import { Component, createEffect, onCleanup } from 'solid-js';
import { Chart, registerables } from 'chart.js';
import { energyStore } from '../store/energyStore';

Chart.register(...registerables);

export const EnergyChart: Component = () => {
  let canvasRef: HTMLCanvasElement | undefined;
  let chartInstance: Chart | null = null;

  const { historyData, energyBalance } = energyStore;

  createEffect(() => {
    if (!canvasRef) return;

    const data = historyData();
    
    if (chartInstance) {
      chartInstance.data.labels = data.map(d => d.time);
      chartInstance.data.datasets[0].data = data.map(d => d.cooling);
      chartInstance.data.datasets[1].data = data.map(d => d.heating);
      chartInstance.data.datasets[2].data = data.map(d => d.electricity);
      chartInstance.update('none');
    } else {
      chartInstance = new Chart(canvasRef, {
        type: 'line',
        data: {
          labels: data.map(d => d.time),
          datasets: [
            {
              label: '制冷 (kW)',
              data: data.map(d => d.cooling),
              borderColor: 'rgb(59, 130, 246)',
              backgroundColor: 'rgba(59, 130, 246, 0.1)',
              tension: 0.4,
              fill: true,
            },
            {
              label: '供热 (kW)',
              data: data.map(d => d.heating),
              borderColor: 'rgb(239, 68, 68)',
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              tension: 0.4,
              fill: true,
            },
            {
              label: '电力 (kW)',
              data: data.map(d => d.electricity),
              borderColor: 'rgb(234, 179, 8)',
              backgroundColor: 'rgba(234, 179, 8, 0.1)',
              tension: 0.4,
              fill: true,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          interaction: {
            mode: 'index',
            intersect: false,
          },
          plugins: {
            legend: {
              position: 'top',
            },
          },
          scales: {
            y: {
              beginAtZero: true,
              title: {
                display: true,
                text: '功率 (kW)',
              },
            },
            x: {
              title: {
                display: true,
                text: '时间',
              },
            },
          },
        },
      });
    }
  });

  onCleanup(() => {
    if (chartInstance) {
      chartInstance.destroy();
    }
  });

  return (
    <div class="bg-white rounded-lg shadow-md p-6">
      <h3 class="text-lg font-semibold text-gray-800 mb-4">能源供给趋势</h3>
      <div style="height: 300px;">
        <canvas ref={canvasRef} />
      </div>
    </div>
  );
};
