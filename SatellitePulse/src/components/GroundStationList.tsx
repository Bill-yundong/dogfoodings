import type { Component } from 'solid-js'
import { For, createMemo } from 'solid-js'
import type { GroundStation } from '../core/types'
import { formatLatitude, formatLongitude } from '../utils/format'

interface GroundStationListProps {
  getStations: () => GroundStation[]
  getSelectedId: () => string | null
  onSelect: (id: string | null) => void
}

export const GroundStationList: Component<GroundStationListProps> = (props) => {
  const stations = createMemo(() => props.getStations())
  const selectedId = createMemo(() => props.getSelectedId())

  return (
    <div class="ground-station-list">
      <For each={stations()}>
        {(station) => {
          const isSelected = createMemo(() => station.id === selectedId())

          return (
            <div
              class="ground-station-item"
              onClick={() => props.onSelect(isSelected() ? null : station.id)}
              style={{
                cursor: 'pointer',
                'border-color': isSelected() ? station.color : undefined,
                background: isSelected() ? `${station.color}15` : undefined
              }}
            >
              <div
                classList={{
                  'station-indicator': true,
                  'active': isSelected()
                }}
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
