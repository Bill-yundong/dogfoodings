import { ref, reactive } from 'vue'
import type { Tank } from '@/types/tank'
import type { DiffusionResult, RiskLevel } from '@/types/simulation'
import type { EmergencyTerminal, Shelter, ResourceUnit } from '@/types/terminal'
import { worldToScreen, isPointInPolygon, distance } from '@/utils/coordinates'
import { getRiskColor } from '@/utils/gaussian'

export function useMapRenderer(canvas: HTMLCanvasElement | null) {
  const viewState = reactive({
    scale: 2,
    offsetX: 0,
    offsetY: 0
  })

  const canvasSize = reactive({ width: 800, height: 600 })

  const gridVisible = ref(true)
  const labelsVisible = ref(true)

  function clear(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = '#0A1628'
    ctx.fillRect(0, 0, canvasSize.width, canvasSize.height)
  }

  function drawGrid(ctx: CanvasRenderingContext2D) {
    if (!gridVisible.value) return

    ctx.strokeStyle = 'rgba(0, 217, 255, 0.15)'
    ctx.lineWidth = 1

    const gridSize = 50 * viewState.scale

    for (let x = 0; x < canvasSize.width; x += gridSize) {
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, canvasSize.height)
      ctx.stroke()
    }

    for (let y = 0; y < canvasSize.height; y += gridSize) {
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(canvasSize.width, y)
      ctx.stroke()
    }
  }

  function drawTanks(ctx: CanvasRenderingContext2D, tanks: Tank[]) {
    for (const tank of tanks) {
      const screenPos = worldToScreen(
        tank.position,
        canvasSize.width,
        canvasSize.height,
        viewState.scale,
        viewState.offsetX,
        viewState.offsetY
      )

      const radius = Math.max(12, tank.diameter * viewState.scale * 0.5)

      const gradient = ctx.createRadialGradient(
        screenPos.x, screenPos.y, 0,
        screenPos.x, screenPos.y, radius * 1.5
      )

      let baseColor = getTankColor(tank.status)
      gradient.addColorStop(0, baseColor)
      gradient.addColorStop(0.7, baseColor.replace('1)', '0.5)'))
      gradient.addColorStop(1, 'rgba(0, 0, 0, 0)')

      ctx.fillStyle = gradient
      ctx.beginPath()
      ctx.arc(screenPos.x, screenPos.y, radius * 1.5, 0, Math.PI * 2)
      ctx.fill()

      ctx.fillStyle = baseColor
      ctx.beginPath()
      ctx.arc(screenPos.x, screenPos.y, radius, 0, Math.PI * 2)
      ctx.fill()

      ctx.strokeStyle = '#00D9FF'
      ctx.lineWidth = 2
      ctx.stroke()

      if (labelsVisible.value) {
        ctx.fillStyle = '#FFFFFF'
        ctx.font = '12px JetBrains Mono'
        ctx.textAlign = 'center'
        ctx.fillText(tank.name, screenPos.x, screenPos.y + radius + 16)
      }

      if (tank.status === 'leaking' || tank.status === 'critical') {
        drawLeakEffect(ctx, screenPos.x, screenPos.y, radius)
      }
    }
  }

  function getTankColor(status: string): string {
    const colors: Record<string, string> = {
      normal: 'rgba(46, 213, 115, 1)',
      warning: 'rgba(255, 215, 0, 1)',
      leaking: 'rgba(255, 127, 80, 1)',
      critical: 'rgba(255, 71, 87, 1)'
    }
    return colors[status] || 'rgba(46, 213, 115, 1)'
  }

  function drawLeakEffect(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number) {
    const time = Date.now() / 1000
    const pulseRadius = radius + Math.sin(time * 3) * 5 + 5

    ctx.strokeStyle = `rgba(255, 71, 87, ${0.5 + Math.sin(time * 3) * 0.3})`
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.arc(x, y, pulseRadius, 0, Math.PI * 2)
    ctx.stroke()
  }

  function drawDiffusion(ctx: CanvasRenderingContext2D, result: DiffusionResult | null) {
    if (!result) return

    const { gridSize, riskZones, origin } = result

    for (const zone of riskZones) {
      if (zone.polygon.length < 3) continue

      ctx.fillStyle = zone.color
      ctx.beginPath()

      const firstPoint = worldToScreen(
        { x: origin.x + zone.polygon[0].x, y: origin.y + zone.polygon[0].y },
        canvasSize.width,
        canvasSize.height,
        viewState.scale,
        viewState.offsetX,
        viewState.offsetY
      )
      ctx.moveTo(firstPoint.x, firstPoint.y)

      for (let i = 1; i < zone.polygon.length; i++) {
        const point = worldToScreen(
          { x: origin.x + zone.polygon[i].x, y: origin.y + zone.polygon[i].y },
          canvasSize.width,
          canvasSize.height,
          viewState.scale,
          viewState.offsetX,
          viewState.offsetY
        )
        ctx.lineTo(point.x, point.y)
      }

      ctx.closePath()
      ctx.fill()

      ctx.strokeStyle = zone.color.replace(/[\d.]+\)$/, '1)')
      ctx.lineWidth = 2
      ctx.stroke()
    }
  }

  function drawTerminals(ctx: CanvasRenderingContext2D, terminals: EmergencyTerminal[]) {
    for (const terminal of terminals) {
      const screenPos = worldToScreen(
        terminal.position,
        canvasSize.width,
        canvasSize.height,
        viewState.scale,
        viewState.offsetX,
        viewState.offsetY
      )

      const size = 14

      ctx.fillStyle = getTerminalColor(terminal.alertLevel)
      ctx.strokeStyle = '#FFFFFF'
      ctx.lineWidth = 2

      ctx.beginPath()
      for (let i = 0; i < 5; i++) {
        const angle = (i * 72 - 90) * Math.PI / 180
        const x = screenPos.x + size * Math.cos(angle)
        const y = screenPos.y + size * Math.sin(angle)
        if (i === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)

        const innerAngle = (i * 72 + 36 - 90) * Math.PI / 180
        ctx.lineTo(screenPos.x + size * 0.5 * Math.cos(innerAngle), screenPos.y + size * 0.5 * Math.sin(innerAngle))
      }
      ctx.closePath()
      ctx.fill()
      ctx.stroke()

      if (labelsVisible.value) {
        ctx.fillStyle = '#FFFFFF'
        ctx.font = '10px JetBrains Mono'
        ctx.textAlign = 'center'
        ctx.fillText(terminal.name, screenPos.x, screenPos.y + 22)
      }
    }
  }

  function getTerminalColor(alertLevel: string): string {
    const colors: Record<string, string> = {
      normal: '#2ED573',
      alert: '#FFD700',
      evacuate: '#FF7F50',
      shelter: '#FF4757'
    }
    return colors[alertLevel] || '#2ED573'
  }

  function drawShelters(ctx: CanvasRenderingContext2D, shelters: Shelter[]) {
    for (const shelter of shelters) {
      const screenPos = worldToScreen(
        shelter.position,
        canvasSize.width,
        canvasSize.height,
        viewState.scale,
        viewState.offsetX,
        viewState.offsetY
      )

      const size = 16

      ctx.fillStyle = shelter.status === 'available' ? '#3B82F6' : '#64748B'
      ctx.beginPath()
      ctx.moveTo(screenPos.x, screenPos.y - size)
      ctx.lineTo(screenPos.x - size, screenPos.y + size * 0.7)
      ctx.lineTo(screenPos.x + size, screenPos.y + size * 0.7)
      ctx.closePath()
      ctx.fill()

      ctx.strokeStyle = '#FFFFFF'
      ctx.lineWidth = 2
      ctx.stroke()

      if (labelsVisible.value) {
        ctx.fillStyle = '#FFFFFF'
        ctx.font = 'bold 10px JetBrains Mono'
        ctx.textAlign = 'center'
        ctx.fillText(shelter.name, screenPos.x, screenPos.y + 26)
      }
    }
  }

  function drawResources(ctx: CanvasRenderingContext2D, resources: ResourceUnit[]) {
    for (const resource of resources) {
      const screenPos = worldToScreen(
        resource.position,
        canvasSize.width,
        canvasSize.height,
        viewState.scale,
        viewState.offsetX,
        viewState.offsetY
      )

      const size = 10

      ctx.fillStyle = getResourceColor(resource.status)
      ctx.beginPath()
      ctx.arc(screenPos.x, screenPos.y, size, 0, Math.PI * 2)
      ctx.fill()

      ctx.strokeStyle = '#FFFFFF'
      ctx.lineWidth = 2
      ctx.stroke()
    }
  }

  function getResourceColor(status: string): string {
    const colors: Record<string, string> = {
      standby: '#2ED573',
      deployed: '#FF4757',
      returning: '#FFD700',
      maintenance: '#64748B'
    }
    return colors[status] || '#64748B'
  }

  function drawCompass(ctx: CanvasRenderingContext2D, windDirection: number) {
    const centerX = 60
    const centerY = 60
    const radius = 40

    ctx.save()
    ctx.translate(centerX, centerY)

    ctx.strokeStyle = 'rgba(0, 217, 255, 0.3)'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.arc(0, 0, radius, 0, Math.PI * 2)
    ctx.stroke()

    const windRad = (windDirection * Math.PI) / 180

    ctx.strokeStyle = '#00D9FF'
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.moveTo(0, 0)
    ctx.lineTo(Math.cos(windRad) * radius * 0.8, Math.sin(windRad) * radius * 0.8)
    ctx.stroke()

    const arrowSize = 8
    ctx.fillStyle = '#00D9FF'
    ctx.beginPath()
    ctx.moveTo(Math.cos(windRad) * radius * 0.8, Math.sin(windRad) * radius * 0.8)
    ctx.lineTo(
      Math.cos(windRad - 0.3) * (radius * 0.8 - arrowSize),
      Math.sin(windRad - 0.3) * (radius * 0.8 - arrowSize)
    )
    ctx.lineTo(
      Math.cos(windRad + 0.3) * (radius * 0.8 - arrowSize),
      Math.sin(windRad + 0.3) * (radius * 0.8 - arrowSize)
    )
    ctx.closePath()
    ctx.fill()

    ctx.fillStyle = '#FFFFFF'
    ctx.font = '10px JetBrains Mono'
    ctx.textAlign = 'center'
    ctx.fillText('N', 0, -radius - 8)
    ctx.fillText('E', radius + 8, 4)
    ctx.fillText('S', 0, radius + 14)
    ctx.fillText('W', -radius - 8, 4)

    ctx.restore()
  }

  function drawScale(ctx: CanvasRenderingContext2D) {
    const startX = canvasSize.width - 120
    const startY = canvasSize.height - 40
    const length = 100

    ctx.strokeStyle = '#FFFFFF'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(startX, startY)
    ctx.lineTo(startX + length, startY)
    ctx.stroke()

    ctx.beginPath()
    ctx.moveTo(startX, startY - 5)
    ctx.lineTo(startX, startY + 5)
    ctx.stroke()

    ctx.beginPath()
    ctx.moveTo(startX + length, startY - 5)
    ctx.lineTo(startX + length, startY + 5)
    ctx.stroke()

    const realLength = length / viewState.scale
    ctx.fillStyle = '#FFFFFF'
    ctx.font = '10px JetBrains Mono'
    ctx.textAlign = 'center'
    ctx.fillText(`${Math.round(realLength)}m`, startX + length / 2, startY + 20)
  }

  function zoomIn() {
    viewState.scale = Math.min(viewState.scale * 1.2, 10)
  }

  function zoomOut() {
    viewState.scale = Math.max(viewState.scale / 1.2, 0.5)
  }

  function pan(dx: number, dy: number) {
    viewState.offsetX += dx
    viewState.offsetY += dy
  }

  function resetView() {
    viewState.scale = 2
    viewState.offsetX = 0
    viewState.offsetY = 0
  }

  function getRiskLevelAtPosition(worldX: number, worldY: number, result: DiffusionResult | null): RiskLevel {
    if (!result) return 'safe'

    for (const zone of result.riskZones) {
      if (isPointInPolygon({ x: worldX, y: worldY }, zone.polygon)) {
        return zone.level
      }
    }

    return 'safe'
  }

  return {
    viewState,
    canvasSize,
    gridVisible,
    labelsVisible,
    clear,
    drawGrid,
    drawTanks,
    drawDiffusion,
    drawTerminals,
    drawShelters,
    drawResources,
    drawCompass,
    drawScale,
    zoomIn,
    zoomOut,
    pan,
    resetView,
    getRiskLevelAtPosition
  }
}
