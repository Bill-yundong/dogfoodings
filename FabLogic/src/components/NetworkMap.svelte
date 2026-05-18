<script>
  import { onMount, onDestroy } from 'svelte'
  import { roadNetwork, ohts } from '../store/AMHSStore.js'
  import { NodeType, OHTStatus } from '../types/amhs.js'

  let canvas
  let ctx
  let animationId
  let network = null
  let ohtMap = new Map()

  const unsubscribeNetwork = roadNetwork.subscribe(value => {
    network = value
  })

  const unsubscribeOHTs = ohts.subscribe(value => {
    ohtMap = value
  })

  const nodeColors = {
    [NodeType.LOAD_PORT]: '#00d4ff',
    [NodeType.STORAGE]: '#7c3aed',
    [NodeType.INTERSECTION]: '#475569',
    [NodeType.PARKING]: '#f59e0b',
    [NodeType.BRANCH]: '#10b981'
  }

  const ohtColors = {
    [OHTStatus.IDLE]: '#10b981',
    [OHTStatus.MOVING]: '#00d4ff',
    [OHTStatus.LOADING]: '#f59e0b',
    [OHTStatus.UNLOADING]: '#f59e0b',
    [OHTStatus.PARKED]: '#64748b',
    [OHTStatus.ERROR]: '#ef4444',
    [OHTStatus.MAINTENANCE]: '#a855f7'
  }

  const draw = () => {
    if (!ctx || !canvas || !network) return

    const width = canvas.width
    const height = canvas.height
    const padding = 60

    ctx.fillStyle = '#0a0e17'
    ctx.fillRect(0, 0, width, height)

    ctx.strokeStyle = 'rgba(0, 212, 255, 0.05)'
    ctx.lineWidth = 1
    for (let x = 0; x < width; x += 40) {
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, height)
      ctx.stroke()
    }
    for (let y = 0; y < height; y += 40) {
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(width, y)
      ctx.stroke()
    }

    const nodes = Array.from(network.nodes.values())
    if (nodes.length === 0) return

    const minX = Math.min(...nodes.map(n => n.x))
    const maxX = Math.max(...nodes.map(n => n.x))
    const minY = Math.min(...nodes.map(n => n.y))
    const maxY = Math.max(...nodes.map(n => n.y))

    const scaleX = (width - padding * 2) / Math.max(maxX - minX, 1)
    const scaleY = (height - padding * 2) / Math.max(maxY - minY, 1)
    const scale = Math.min(scaleX, scaleY)

    const transform = (x, y) => ({
      x: (x - minX) * scale + padding,
      y: (y - minY) * scale + padding
    })

    ctx.strokeStyle = 'rgba(148, 163, 184, 0.3)'
    ctx.lineWidth = 2
    network.edges.forEach(edge => {
      const from = network.getNode(edge.from)
      const to = network.getNode(edge.to)
      if (from && to) {
        const p1 = transform(from.x, from.y)
        const p2 = transform(to.x, to.y)
        ctx.beginPath()
        ctx.moveTo(p1.x, p1.y)
        ctx.lineTo(p2.x, p2.y)
        ctx.stroke()
      }
    })

    nodes.forEach(node => {
      const p = transform(node.x, node.y)
      const color = nodeColors[node.type] || '#475569'
      const size = node.type === NodeType.INTERSECTION ? 6 : 10

      ctx.fillStyle = color + '40'
      ctx.beginPath()
      ctx.arc(p.x, p.y, size + 4, 0, Math.PI * 2)
      ctx.fill()

      ctx.fillStyle = color
      ctx.beginPath()
      ctx.arc(p.x, p.y, size, 0, Math.PI * 2)
      ctx.fill()

      if (node.type !== NodeType.INTERSECTION) {
        ctx.fillStyle = '#94a3b8'
        ctx.font = '10px sans-serif'
        ctx.textAlign = 'center'
        ctx.fillText(node.name, p.x, p.y + size + 14)
      }
    })

    ohtMap.forEach(oht => {
      const p = transform(oht.position.x, oht.position.y)
      const color = ohtColors[oht.status] || '#64748b'

      if (oht.status === OHTStatus.MOVING && oht.currentPath.length > 0) {
        ctx.strokeStyle = color + '40'
        ctx.lineWidth = 3
        ctx.setLineDash([5, 5])
        ctx.beginPath()
        ctx.moveTo(p.x, p.y)
        for (let i = oht.pathIndex; i < Math.min(oht.pathIndex + 5, oht.currentPath.length); i++) {
          const pathNode = network.getNode(oht.currentPath[i])
          if (pathNode) {
            const pp = transform(pathNode.x, pathNode.y)
            ctx.lineTo(pp.x, pp.y)
          }
        }
        ctx.stroke()
        ctx.setLineDash([])
      }

      ctx.fillStyle = color + '30'
      ctx.beginPath()
      ctx.arc(p.x, p.y, 16, 0, Math.PI * 2)
      ctx.fill()

      ctx.fillStyle = color
      ctx.beginPath()
      ctx.arc(p.x, p.y, 10, 0, Math.PI * 2)
      ctx.fill()

      ctx.fillStyle = '#fff'
      ctx.font = 'bold 9px sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(oht.id.split('-')[1], p.x, p.y)
    })

    animationId = requestAnimationFrame(draw)
  }

  onMount(() => {
    ctx = canvas.getContext('2d')
    draw()
  })

  onDestroy(() => {
    if (animationId) {
      cancelAnimationFrame(animationId)
    }
    unsubscribeNetwork()
    unsubscribeOHTs()
  })
</script>

<div class="network-map-container bg-slate-900/50 rounded-xl border border-slate-700/50 overflow-hidden">
  <div class="p-4 border-b border-slate-700/50">
    <h3 class="text-lg font-semibold text-white flex items-center gap-2">
      <span class="text-cyan-400">◇</span>
      洁净室路网监控
    </h3>
  </div>
  <canvas bind:this={canvas} width={800} height={500} class="w-full" />
  <div class="p-3 border-t border-slate-700/50 flex flex-wrap gap-4 text-xs">
    <div class="flex items-center gap-2">
      <span class="w-3 h-3 rounded-full bg-cyan-400"></span>
      <span class="text-slate-400">Load Port</span>
    </div>
    <div class="flex items-center gap-2">
      <span class="w-3 h-3 rounded-full bg-purple-500"></span>
      <span class="text-slate-400">Storage</span>
    </div>
    <div class="flex items-center gap-2">
      <span class="w-3 h-3 rounded-full bg-amber-500"></span>
      <span class="text-slate-400">Parking</span>
    </div>
    <div class="flex items-center gap-2">
      <span class="w-3 h-3 rounded-full bg-slate-500"></span>
      <span class="text-slate-400">Intersection</span>
    </div>
  </div>
</div>
