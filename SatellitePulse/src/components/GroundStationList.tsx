import type { Component } from 'solid-js'
import { For } from 'solid-js'
import type { GroundStation } from '../core/types'
import { formatLatitude, formatLongitude } from '../utils/format'

interface GroundStationListProps {
  stations: GroundStation[]
  selectedId: string | null
  onSelect: (id: string | null) => void
}

export const GroundStationList: Component<GroundStationListProps> = (props) => {
  return (
    <div class="ground-station-list">
      <For each={props.stations}>
        {(station) => {
          const isSelected = station.id === props.selectedId

          return (
            <div
              class="ground-station-item"
              onClick={() => props.onSelect(isSelected ? null : station.id)}
              style={{
                cursor: 'pointer',
                'border-color': isSelected ? station.color : undefined,
                background: isSelected ? `${station.color}15` : undefined
              }}
            >
              <div
                class={`station-indicator ${isSelected ? 'active' : ''}`}
                style={{ 'background-color': station.color }}
              />
              <div style={{ flex: 1 }}>
                <div style={{ 'font-weight': 500, 'font-size': '12px' }}>{station.name}</div>
                <div style={{ 'font-size': '10px', color: 'var(--text-secondary)', 'margin-top': '2px' }}>
                  {formatLatitude(station.latitude)} · {formatLongitude(station.longitude)}
                </div>
              </div>
            </div>
          )
        }}
      </For>
    </div>
  )
}
