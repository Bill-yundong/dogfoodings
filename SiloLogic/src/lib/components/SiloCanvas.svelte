<script>
  import { onMount, onDestroy } from 'svelte'

  let {
    width = 500,
    height = 600,
    particles = [],
    wallPressures = { left: 0, right: 0, bottom: 0 }
  } = $props()

  let canvas
  let ctx
  let animationId

  $effect(() => {
    if (ctx) {
      draw()
    }
  })

  function draw() {
    ctx.fillStyle = '#0a0e27'
    ctx.fillRect(0, 0, width, height)

    drawSilo()
    drawPressureIndicators()
    
    particles.forEach(particle => {
      drawParticle(particle)
    })

    drawLabels()
  }

  function drawSilo() {
    ctx.strokeStyle = '#4a5568'
    ctx.lineWidth = 4
    
    ctx.beginPath()
    ctx.moveTo(50, 30)
    ctx.lineTo(50, height - 30)
    ctx.lineTo(width - 50, height - 30)
    ctx.lineTo(width - 50, 30)
    ctx.stroke()

    ctx.fillStyle = 'rgba(74, 85, 104, 0.1)'
    ctx.fillRect(50, 30, width - 100, height - 60)

    const gradient = ctx.createLinearGradient(0, 0, 0, height)
    gradient.addColorStop(0, 'rgba(74, 85, 104, 0.05)')
    gradient.addColorStop(1, 'rgba(74, 85, 104, 0.2)')
    ctx.fillStyle = gradient
    ctx.fillRect(50, 30, width - 100, height - 60)
  }

  function drawParticle(particle) {
    ctx.beginPath()
    ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2)
    ctx.fillStyle = particle.color
    
    const gradient = ctx.createRadialGradient(
      particle.x - particle.radius * 0.3,
      particle.y - particle.radius * 0.3,
      0,
      particle.x,
      particle.y,
      particle.radius
    )
    gradient.addColorStop(0, 'rgba(255, 255, 255, 0.4)')
    gradient.addColorStop(0.5, particle.color)
    gradient.addColorStop(1, shadeColor(particle.color, -30))
    ctx.fillStyle = gradient
    ctx.fill()

    ctx.strokeStyle = shadeColor(particle.color, -50)
    ctx.lineWidth = 1
    ctx.stroke()
  }

  function drawPressureIndicators() {
    const maxPressure = 50000
    
    const leftPressure = Math.min(wallPressures.left / maxPressure, 1)
    ctx.fillStyle = `rgba(255, 107, 107, ${0.3 + leftPressure * 0.5})`
    ctx.fillRect(40, 30, 10, height - 60)
    ctx.fillStyle = '#ff6b6b'
    ctx.fillRect(40, height - 30 - (height - 60) * leftPressure, 10, (height - 60) * leftPressure)

    const rightPressure = Math.min(wallPressures.right / maxPressure, 1)
    ctx.fillStyle = `rgba(255, 107, 107, ${0.3 + rightPressure * 0.5})`
    ctx.fillRect(width - 50, 30, 10, height - 60)
    ctx.fillStyle = '#ff6b6b'
    ctx.fillRect(width - 50, height - 30 - (height - 60) * rightPressure, 10, (height - 60) * rightPressure)

    const bottomPressure = Math.min(wallPressures.bottom / maxPressure, 1)
    ctx.fillStyle = `rgba(255, 107, 107, ${0.3 + bottomPressure * 0.5})`
    ctx.fillRect(50, height - 30, width - 100, 10)
    ctx.fillStyle = '#ff6b6b'
    ctx.fillRect(50, height - 30, (width - 100) * bottomPressure, 10)
  }

  function drawLabels() {
    ctx.fillStyle = '#94a3b8'
    ctx.font = '12px system-ui'
    ctx.textAlign = 'center'
    
    ctx.fillText('左侧壁压', 45, 20)
    ctx.fillText('右侧壁压', width - 45, 20)
    ctx.fillText('底部压力', width / 2, height - 5)

    ctx.fillStyle = '#e2e8f0'
    ctx.font = '10px system-ui'
    ctx.fillText(`${(wallPressures.left / 1000).toFixed(1)} kN`, 45, height - 35)
    ctx.fillText(`${(wallPressures.right / 1000).toFixed(1)} kN`, width - 45, height - 35)
    ctx.fillText(`${(wallPressures.bottom / 1000).toFixed(1)} kN`, width / 2, height - 45)
  }

  function shadeColor(color, percent) {
    const num = parseInt(color.replace('#', ''), 16)
    const amt = Math.round(2.55 * percent)
    const R = (num >> 16) + amt
    const G = (num >> 8 & 0x00FF) + amt
    const B = (num & 0x0000FF) + amt
    return '#' + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
      (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
      (B < 255 ? B < 1 ? 0 : B : 255)).toString(16).slice(1)
  }

  onMount(() => {
    ctx = canvas.getContext('2d')
    draw()
  })

  onDestroy(() => {
    if (animationId) {
      cancelAnimationFrame(animationId)
    }
  })
</script>

<canvas bind:this={canvas} {width} {height} style="border-radius: 8px; box-shadow: 0 4px 20px rgba(0,0,0,0.3);" />
