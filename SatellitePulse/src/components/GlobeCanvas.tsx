import type { Component } from 'solid-js'
import { onMount, onCleanup, createEffect } from 'solid-js'
import { GlobeRenderer } from '../core/globeRenderer'
import type { SatellitePosition, GroundStation } from '../core/types'

interface GlobeCanvasProps {
  positions: SatellitePosition[]
  stations: GroundStation[]
  satelliteColors: Map<string, string>
  selectedStationId: string | null
  isSimulating: boolean
}

export const GlobeCanvas: Component<GlobeCanvasProps> = (props) => {
  let canvasRef: HTMLCanvasElement | undefined
  let renderer: GlobeRenderer | null = null
  let animationId: number | null = null
  let rotation = 0

  const render = () => {
    if (!renderer) return

    if (props.isSimulating) {
      rotation += 0.05
      renderer.setRotation(rotation)
    }

    renderer.render(
      props.positions,
      props.stations,
      props.satelliteColors,
      props.selectedStationId || undefined
    )

    animationId = requestAnimationFrame(render)
  }

  const handleResize = () => {
    if (!canvasRef || !renderer) return
    const container = canvasRef.parentElement
    if (!container) return

    const rect = container.getBoundingClientRect()
    renderer.resize(rect.width, rect.height)
  }

  onMount(() => {
    if (!canvasRef) return

    const container = canvasRef.parentElement
    if (!container) return

    const rect = container.getBoundingClientRect()
    renderer = new GlobeRenderer(canvasRef, {
      width: rect.width,
      height: rect.height
    })

    window.addEventListener('resize', handleResize)
    render()
  })

  onCleanup(() => {
    window.removeEventListener('resize', handleResize)
    if (animationId !== null) {
      cancelAnimationFrame(animationId)
    }
  })

  return (
    <canvas
      ref={canvasRef}
      id="globe-canvas"
    />
  )
}
