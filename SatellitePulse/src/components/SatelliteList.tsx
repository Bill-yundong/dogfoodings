import type { Component } from 'solid-js'
import { For, createMemo } from 'solid-js'
import type { Satellite, SatellitePosition } from '../core/types'
import { formatAltitude, formatVelocity } from '../utils/format'

interface SatelliteListProps {
  getSatellites: () => Satellite[]
  getPositions: () => SatellitePosition[]
  getSelectedId: () => string | null
  onSelect: (id: string | null) => void
  onToggle: (id: string) => void
}

export const SatelliteList: Component<SatelliteListProps> = (props) => {
  const satellites = createMemo(() => props.getSatellites())
  const positions = createMemo(() => props.getPositions())
  const selectedId = createMemo(() => props.getSelectedId())

  const getPosition = (satId: string) => {
    return positions().find(p => p.satelliteId === satId)
  }

  const handleClick = (satId: string) => {
    console.log('[SatelliteList] 点击卫星:', satId, '当前选中:', selectedId())
    if (satId === selectedId()) {
      console.log('[SatelliteList] 取消选择卫星')
      props.onSelect(null)
    } else {
      console.log('[SatelliteList] 选择卫星:', satId)
      props.onSelect(satId)
    }
  }

  return (
    <div class="satellite-list">
      <For each={satellites()}>
        {(sat) => {
          const pos = getPosition(sat.id)
          const isSelected = createMemo(() => sat.id === selectedId())

          return (
            <div
              classList={{
                'satellite-item': true,
                'active': isSelected(),
                'opacity-50': !sat.active
              }}
              onClick={() => handleClick(sat.id)}
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
        }}
      </For>
    </div>
  )
}
