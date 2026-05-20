import type { Component } from 'solid-js'
import type { Satellite, SatellitePosition } from '../core/types'
import { formatAltitude, formatVelocity } from '../utils/format'

interface SatelliteListProps {
  satellites: Satellite[]
  positions: SatellitePosition[]
  selectedId: string | null
  onSelect: (id: string) => void
  onToggle: (id: string) => void
}

export const SatelliteList: Component<SatelliteListProps> = (props) => {
  const getPosition = (satId: string) => {
    return props.positions.find(p => p.satelliteId === satId)
  }

  return (
    <div class="satellite-list">
      {props.satellites.map((sat) => {
        const pos = getPosition(sat.id)
        const isSelected = sat.id === props.selectedId

        return (
          <div
            class={`satellite-item ${isSelected ? 'active' : ''} ${!sat.active ? 'opacity-50' : ''}`}
            onClick={() => props.onSelect(sat.id)}
          >
            <div
              class="satellite-dot"
              style={{ 'background-color': sat.color }}
            />
            <div class="satellite-info">
              <div class="satellite-name">{sat.name}</div>
              <div class="satellite-meta">
                {pos ? (
                  <span>
                    {formatAltitude(pos.state.altitude)} · {formatVelocity(pos.state.velocity)}
                  </span>
                ) : (
                  <span>等待轨道数据...</span>
                )}
              </div>
            </div>
            <input
              type="checkbox"
              checked={sat.active}
              onChange={(e) => {
                e.stopPropagation()
                props.onToggle(sat.id)
              }}
              style={{ cursor: 'pointer' }}
            />
          </div>
        )
      })}
    </div>
  )
}
