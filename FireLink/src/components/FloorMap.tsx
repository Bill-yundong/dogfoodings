import { For, createMemo, createSignal, onMount, onCleanup } from 'solid-js'
import type { FloorMap as FloorMapType, SmokeField, EvacuationPath } from '@/types'
import { getFloorMap } from '@/data/buildingData'
import { getConcentrationColor, getRiskLevelColor } from '@/services/smokeSimulation'
import { getPathColor } from '@/services/pathOptimizer'

interface FloorMapProps {
  floor: number
  smokeField?: SmokeField
  selectedPath?: EvacuationPath | null
  onNodeClick?: (nodeId: string) => void
  showSmoke?: boolean
  showPaths?: boolean
  showNodes?: boolean
  interactive?: boolean
}

export default function FloorMapComponent(props: FloorMapProps) {
  const [scale, setScale] = createSignal(1)
  const [offset, setOffset] = createSignal({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = createSignal(false)
  const [dragStart, setDragStart] = createSignal({ x: 0, y: 0 })
  const [hoveredNode, setHoveredNode] = createSignal<string | null>(null)

  const floorMap = createMemo(() => getFloorMap(props.floor))

  const smokeGrid = createMemo(() => {
    if (!props.showSmoke || !props.smokeField) return []
    return props.smokeField.points
  })

  const pathSegments = createMemo(() => {
    if (!props.showPaths || !props.selectedPath) return []
    return props.selectedPath.nodes
  })

  const handleWheel = (e: WheelEvent) => {
    e.preventDefault()
    const delta = e.deltaY > 0 ? 0.9 : 1.1
    setScale(s => Math.max(0.5, Math.min(3, s * delta)))
  }

  const handleMouseDown = (e: MouseEvent) => {
    if (!props.interactive) return
    setIsDragging(true)
    setDragStart({ x: e.clientX - offset().x, y: e.clientY - offset().y })
  }

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging()) return
    setOffset({
      x: e.clientX - dragStart().x,
      y: e.clientY - dragStart().y
    })
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  onMount(() => {
    window.addEventListener('mouseup', handleMouseUp)
    window.addEventListener('mousemove', handleMouseMove)
  })

  onCleanup(() => {
    window.removeEventListener('mouseup', handleMouseUp)
    window.removeEventListener('mousemove', handleMouseMove)
  })

  const getNodeColor = (node: FloorMapType['nodes'][0]) => {
    const colors: Record<string, string> = {
      exit: '#22c55e',
      stair: '#3b82f6',
      elevator: '#8b5cf6',
      room: '#f59e0b',
      corridor: '#6b7280',
      junction: '#1f2937'
    }
    return colors[node.type] || '#6b7280'
  }

  const getNodeIcon = (type: string) => {
    const icons: Record<string, string> = {
      exit: '🚪',
      stair: '🪜',
      elevator: '🛗',
      room: '🏠',
      corridor: '➡️',
      junction: '🔀'
    }
    return icons[type] || '•'
  }

  const floorData = floorMap()
  if (!floorData) return <div class="flex items-center justify-center h-full text-gray-400">楼层数据加载中...</div>

  const { bounds, nodes, edges, rooms, walls } = floorData
  const width = bounds.max.x - bounds.min.x
  const height = bounds.max.y - bounds.min.y

  return (
    <div
      class="relative w-full h-full overflow-hidden bg-slate-900 rounded-lg"
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      style={{ cursor: props.interactive ? (isDragging() ? 'grabbing' : 'grab') : 'default' }}
    >
      <svg
        class="w-full h-full"
        viewBox={`${bounds.min.x} ${bounds.min.y} ${width} ${height}`}
        style={{
          transform: `translate(${offset().x}px, ${offset().y}px) scale(${scale()})`,
          'transform-origin': 'center center'
        }}
      >
        <defs>
          <filter id="glow">
            <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
          <linearGradient id="pathGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stop-color="#22c55e"/>
            <stop offset="100%" stop-color="#16a34a"/>
          </linearGradient>
        </defs>

        <For each={walls}>
          {(wall) => (
            <line
              x1={wall.start.x}
              y1={wall.start.y}
              x2={wall.end.x}
              y2={wall.end.y}
              stroke="#475569"
              stroke-width={wall.thickness}
              stroke-linecap="round"
            />
          )}
        </For>

        <For each={rooms}>
          {(room) => (
            <g>
              <polygon
                points={room.polygon.map(p => `${p.x},${p.y}`).join(' ')}
                fill="#1e293b"
                stroke="#334155"
                stroke-width="2"
              />
              <text
                x={(room.polygon[0].x + room.polygon[2].x) / 2}
                y={(room.polygon[0].y + room.polygon[2].y) / 2}
                fill="#94a3b8"
                font-size="10"
                text-anchor="middle"
                dominant-baseline="middle"
              >
                {room.name}
              </text>
            </g>
          )}
        </For>

        <For each={edges}>
          {(edge) => {
            const fromNode = nodes.find(n => n.id === edge.from)
            const toNode = nodes.find(n => n.id === edge.to)
            if (!fromNode || !toNode) return null

            return (
              <line
                x1={fromNode.position.x}
                y1={fromNode.position.y}
                x2={toNode.position.x}
                y2={toNode.position.y}
                stroke={edge.isAccessible ? '#475569' : '#ef4444'}
                stroke-width="3"
                stroke-dasharray={edge.isAccessible ? 'none' : '5,5'}
                opacity="0.5"
              />
            )
          }}
        </For>

        <For each={smokeGrid()}>
          {(point) => (
            <rect
              x={point.x - 5}
              y={point.y - 5}
              width="10"
              height="10"
              fill={getConcentrationColor(point.concentration)}
            />
          )}
        </For>

        <For each={pathSegments().slice(1)}>
          {(node, index) => {
            const prev = pathSegments()[index()]
            const pathColor = getPathColor(props.selectedPath?.riskScore || 0)

            return (
              <g>
                <line
                  x1={prev.position.x}
                  y1={prev.position.y}
                  x2={node.position.x}
                  y2={node.position.y}
                  stroke={pathColor}
                  stroke-width="4"
                  stroke-linecap="round"
                  filter="url(#glow)"
                  opacity="0.8"
                />
                <line
                  x1={prev.position.x}
                  y1={prev.position.y}
                  x2={node.position.x}
                  y2={node.position.y}
                  stroke="#ffffff"
                  stroke-width="2"
                  stroke-dasharray="8,8"
                  stroke-linecap="round"
                  opacity="0.6"
                >
                  <animate
                    attributeName="stroke-dashoffset"
                    from="16"
                    to="0"
                    dur="1s"
                    repeatCount="indefinite"
                  />
                </line>
              </g>
            )
          }}
        </For>

        <For each={nodes}>
          {(node) => {
            if (props.showNodes === false) return null
            const isHovered = hoveredNode() === node.id
            const isOnPath = pathSegments().some(p => p.nodeId === node.id)

            return (
              <g
                class="cursor-pointer transition-all"
                onClick={() => props.onNodeClick?.(node.id)}
                onMouseEnter={() => setHoveredNode(node.id)}
                onMouseLeave={() => setHoveredNode(null)}
              >
                <circle
                  cx={node.position.x}
                  cy={node.position.y}
                  r={isHovered || isOnPath ? 10 : 7}
                  fill={isOnPath ? getRiskLevelColor(node.type === 'exit' ? 0 : (pathSegments().find(p => p.nodeId === node.id)?.riskLevel || 0)) : getNodeColor(node)}
                  stroke={isHovered ? '#ffffff' : 'none'}
                  stroke-width="2"
                  filter={isOnPath ? 'url(#glow)' : 'none'}
                  class="transition-all duration-200"
                />
                <text
                  x={node.position.x}
                  y={node.position.y}
                  font-size="10"
                  text-anchor="middle"
                  dominant-baseline="middle"
                  pointer-events="none"
                >
                  {getNodeIcon(node.type)}
                </text>
                {isHovered && node.name && (
                  <g>
                    <rect
                      x={node.position.x - 40}
                      y={node.position.y - 30}
                      width="80"
                      height="20"
                      fill="#1e293b"
                      stroke="#475569"
                    />
                    <text
                      x={node.position.x}
                      y={node.position.y - 17}
                      fill="#e2e8f0"
                      font-size="10"
                      text-anchor="middle"
                    >
                      {node.name}
                    </text>
                  </g>
                )}
              </g>
            )
          }}
        </For>

        {pathSegments().length > 0 && (
          <>
            <circle
              cx={pathSegments()[0].position.x}
              cy={pathSegments()[0].position.y}
              r="12"
              fill="#3b82f6"
              stroke="#ffffff"
              stroke-width="2"
              filter="url(#glow)"
            />
            <text
              x={pathSegments()[0].position.x}
              y={pathSegments()[0].position.y}
              font-size="12"
              text-anchor="middle"
              dominant-baseline="middle"
              fill="#ffffff"
            >
              📍
            </text>
            <circle
              cx={pathSegments()[pathSegments().length - 1].position.x}
              cy={pathSegments()[pathSegments().length - 1].position.y}
              r="12"
              fill="#22c55e"
              stroke="#ffffff"
              stroke-width="2"
              filter="url(#glow)"
            />
            <text
              x={pathSegments()[pathSegments().length - 1].position.x}
              y={pathSegments()[pathSegments().length - 1].position.y}
              font-size="12"
              text-anchor="middle"
              dominant-baseline="middle"
              fill="#ffffff"
            >
              🏁
            </text>
          </>
        )}
      </svg>

      <div class="absolute bottom-4 left-4 flex gap-2">
        <button
          onClick={() => setScale(s => Math.min(3, s * 1.2))}
          class="w-8 h-8 bg-slate-700 hover:bg-slate-600 rounded text-white flex items-center justify-center transition-colors"
        >
          +
        </button>
        <button
          onClick={() => setScale(s => Math.max(0.5, s * 0.8))}
          class="w-8 h-8 bg-slate-700 hover:bg-slate-600 rounded text-white flex items-center justify-center transition-colors"
        >
          −
        </button>
        <button
          onClick={() => {
            setScale(1)
            setOffset({ x: 0, y: 0 })
          }}
          class="w-8 h-8 bg-slate-700 hover:bg-slate-600 rounded text-white flex items-center justify-center transition-colors text-xs"
        >
          ⟲
        </button>
      </div>

      <div class="absolute bottom-4 right-4 bg-slate-800/90 backdrop-blur px-3 py-2 rounded text-xs text-slate-300">
        缩放: {Math.round(scale() * 100)}%
      </div>
    </div>
  )
}
