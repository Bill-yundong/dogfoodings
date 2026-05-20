import type { Component } from 'solid-js'
import { Show, createMemo } from 'solid-js'
import type { Satellite, SatellitePosition } from '../core/types'
import { formatLatitude, formatLongitude, formatAltitude, formatVelocity } from '../utils/format'

interface SatelliteInfoProps {
  getSatellite: () => Satellite | undefined
  getPosition: () => SatellitePosition | undefined
}

export const SatelliteInfo: Component<SatelliteInfoProps> = (props) => {
  const satellite = createMemo(() => {
    const sat = props.getSatellite()
    console.log('[SatelliteInfo] 响应式更新 - satellite:', sat?.name)
    return sat
  })

  const position = createMemo(() => {
    const pos = props.getPosition()
    console.log('[SatelliteInfo] 响应式更新 - position altitude:', pos?.state.altitude)
    return pos
  })

  return (
    <Show
      when={satellite()}
      fallback={
        <div style={{ 'font-size': '12px', color: 'var(--text-secondary)', 'text-align': 'center', padding: '20px' }}>
          选择一颗卫星查看详细信息
        </div>
      }
    >
      <div style={{ 'font-size': '12px' }}>
        <div style={{ 'margin-bottom': '12px' }}>
          <div style={{ 'font-weight': 600, 'margin-bottom': '4px' }}>{satellite()?.name}</div>
          <div style={{ color: 'var(--text-secondary)', 'font-size': '11px' }}>
            ID: {satellite()?.id}
          </div>
        </div>

        <Show
          when={position()}
          fallback={
            <div style={{ color: 'var(--text-secondary)', 'text-align': 'center', padding: '12px' }}>
              等待轨道数据...
            </div>
          }
        >
          <div class="stat-grid">
            <div class="stat-item">
              <div class="stat-value">{formatLatitude(position()!.state.latitude)}</div>
              <div class="stat-label">纬度</div>
            </div>
            <div class="stat-item">
              <div class="stat-value">{formatLongitude(position()!.state.longitude)}</div>
              <div class="stat-label">经度</div>
            </div>
            <div class="stat-item">
              <div class="stat-value">{formatAltitude(position()!.state.altitude)}</div>
              <div class="stat-label">轨道高度</div>
            </div>
            <div class="stat-item">
              <div class="stat-value">{formatVelocity(position()!.state.velocity)}</div>
              <div class="stat-label">飞行速度</div>
            </div>
          </div>
        </Show>
      </div>
    </Show>
  )
}
