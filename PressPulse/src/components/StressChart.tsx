import { Component, createEffect, createSignal } from 'solid-js'
import { Chart, registerables } from 'chart.js'
import { RainflowCycle } from '../types'

Chart.register(...registerables)

interface StressChartProps {
  cycles: RainflowCycle[]
  title?: string
}

export const StressChart: Component<StressChartProps> = (props) => {
  const [canvasRef, setCanvasRef] = createSignal<HTMLCanvasElement | null>(null)
  let chartInstance: Chart | null = null

  createEffect(() => {
    const canvas = canvasRef()
    if (!canvas) return

    if (chartInstance) {
      chartInstance.destroy()
    }

    const sortedCycles = [...props.cycles].sort((a, b) => a.range - b.range)
    const stressRanges = sortedCycles.map(c => c.range.toFixed(1))
    const cycleCounts = sortedCycles.map(c => c.count)

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    chartInstance = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: stressRanges,
        datasets: [{
          label: '循环次数',
          data: cycleCounts,
          backgroundColor: (context) => {
            const value = context.parsed.x
            if (value > 400) return 'rgba(239, 68, 68, 0.8)'
            if (value > 300) return 'rgba(245, 158, 11, 0.8)'
            return 'rgba(16, 185, 129, 0.8)'
          },
          borderColor: 'rgba(255, 255, 255, 0.5)',
          borderWidth: 1,
        }],
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            display: false,
          },
          title: {
            display: !!props.title,
            text: props.title || '',
            font: {
              size: 16,
            },
          },
        },
        scales: {
          x: {
            title: {
              display: true,
              text: '应力范围 (MPa)',
            },
          },
          y: {
            title: {
              display: true,
              text: '循环次数',
            },
            beginAtZero: true,
          },
        },
      },
    })
  })

  return (
    <div style={{
      'background': 'white',
      'border-radius': '12px',
      'box-shadow': '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
      'padding': '20px',
    }}>
      <canvas ref={setCanvasRef} />
    </div>
  )
}
