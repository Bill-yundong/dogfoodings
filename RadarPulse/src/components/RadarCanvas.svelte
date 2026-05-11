<script>
  import { onMount, onDestroy } from 'svelte'

  export let radarData = []
  export let forecastData = []
  export let width = 800
  export let height = 600
  export let currentFrame = 0
  export let isPlaying = false

  let canvas
  let ctx
  let animationId
  let frameCount = 0

  const colorMap = [
    { dbz: 0, r: 0, g: 0, b: 0, a: 0 },
    { dbz: 5, r: 0, g: 255, b: 255, a: 0.3 },
    { dbz: 15, r: 0, g: 255, b: 0, a: 0.5 },
    { dbz: 25, r: 255, g: 255, b: 0, a: 0.6 },
    { dbz: 35, r: 255, g: 165, b: 0, a: 0.7 },
    { dbz: 45, r: 255, g: 0, b: 0, a: 0.8 },
    { dbz: 55, r: 128, g: 0, b: 128, a: 0.9 }
  ]

  function getColor(dbz) {
    for (let i = 1; i < colorMap.length; i++) {
      if (dbz <= colorMap[i].dbz) {
        const prev = colorMap[i - 1]
        const curr = colorMap[i]
        const t = (dbz - prev.dbz) / (curr.dbz - prev.dbz)
        return {
          r: Math.round(prev.r + (curr.r - prev.r) * t),
          g: Math.round(prev.g + (curr.g - prev.g) * t),
          b: Math.round(prev.b + (curr.b - prev.b) * t),
          a: prev.a + (curr.a - prev.a) * t
        }
      }
    }
    return colorMap[colorMap.length - 1]
  }

  function drawRadar(data, isForecast = false) {
    if (!ctx || !data || data.length === 0) return

    ctx.clearRect(0, 0, width, height)
    
    const gridSize = Math.sqrt(data.length)
    const cellWidth = width / gridSize
    const cellHeight = height / gridSize

    for (let i = 0; i < data.length; i++) {
      const x = (i % gridSize) * cellWidth
      const y = Math.floor(i / gridSize) * cellHeight
      const dbz = data[i]
      
      if (dbz > 0) {
        const color = getColor(dbz)
        ctx.fillStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${color.a})`
        if (isForecast) {
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)'
          ctx.lineWidth = 0.5
          ctx.fillRect(x, y, cellWidth, cellHeight)
          ctx.strokeRect(x, y, cellWidth, cellHeight)
        } else {
          ctx.fillRect(x, y, cellWidth, cellHeight)
        }
      }
    }

    drawGrid()
    drawLegend(isForecast)
  }

  function drawGrid() {
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)'
    ctx.lineWidth = 1
    
    for (let i = 0; i <= 10; i++) {
      ctx.beginPath()
      ctx.moveTo((width / 10) * i, 0)
      ctx.lineTo((width / 10) * i, height)
      ctx.stroke()
      
      ctx.beginPath()
      ctx.moveTo(0, (height / 10) * i)
      ctx.lineTo(width, (height / 10) * i)
      ctx.stroke()
    }
  }

  function drawLegend(isForecast) {
    const legendX = width - 120
    const legendY = 20
    const barHeight = 150
    
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)'
    ctx.fillRect(legendX - 10, legendY - 10, 110, barHeight + 40)
    
    for (let i = 0; i < colorMap.length; i++) {
      const color = colorMap[i]
      const nextColor = colorMap[i + 1] || colorMap[i]
      const gradient = ctx.createLinearGradient(0, legendY + barHeight - (i / colorMap.length) * barHeight, 0, legendY + barHeight - ((i + 1) / colorMap.length) * barHeight)
      gradient.addColorStop(0, `rgba(${color.r}, ${color.g}, ${color.b}, ${color.a})`)
      gradient.addColorStop(1, `rgba(${nextColor.r}, ${nextColor.g}, ${nextColor.b}, ${nextColor.a})`)
      
      ctx.fillStyle = gradient
      ctx.fillRect(legendX, legendY + barHeight - ((i + 1) / colorMap.length) * barHeight, 30, barHeight / colorMap.length)
    }
    
    ctx.fillStyle = '#fff'
    ctx.font = '12px Arial'
    ctx.fillText('dBZ', legendX + 40, legendY)
    
    for (let i = 0; i < colorMap.length; i++) {
      ctx.fillText(colorMap[i].dbz.toString(), legendX + 40, legendY + barHeight - (i / colorMap.length) * barHeight + 4)
    }
    
    if (isForecast) {
      ctx.fillStyle = '#fff'
      ctx.fillText('预报', legendX + 60, legendY + barHeight + 20)
    }
  }

  function animate() {
    if (!isPlaying) return
    
    frameCount++
    if (frameCount % 30 === 0) {
      currentFrame = (currentFrame + 1) % radarData.length
    }
    
    drawRadar(radarData[currentFrame] || radarData[0])
    animationId = requestAnimationFrame(animate)
  }

  $effect(() => {
    if (canvas) {
      ctx = canvas.getContext('2d')
      drawRadar(radarData[currentFrame] || radarData[0])
    }
  })

  $effect(() => {
    if (ctx && radarData.length > 0) {
      drawRadar(radarData[currentFrame] || radarData[0])
    }
  })

  $effect(() => {
    if (isPlaying) {
      animate()
    } else if (animationId) {
      cancelAnimationFrame(animationId)
    }
  })

  onMount(() => {
    ctx = canvas.getContext('2d')
    if (radarData.length > 0) {
      drawRadar(radarData[currentFrame])
    }
  })

  onDestroy(() => {
    if (animationId) {
      cancelAnimationFrame(animationId)
    }
  })
</script>

<canvas bind:this={canvas} {width} {height} style="border: 1px solid #333; border-radius: 8px; background: #0a0a20;" />
