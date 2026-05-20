import type { Component } from 'solid-js'
import type { Satellite, SatellitePosition } from '../core/types'
import { formatLatitude, formatLongitude, formatAltitude, formatVelocity } from '../utils/format'

interface SatelliteInfoProps {
  satellite: Satellite | undefined
  position: SatellitePosition | undefined
}

export const SatelliteInfo: Component<SatelliteInfoProps> = (props) => {
  if (!props.satellite) {
    return (
      <div style={{ 'font-size': '12px', color: 'var(--text-secondary)', 'text-align': 'center', padding: '20px' }}>
        选择一颗卫星查看详细信息
      </div>
    )
  }

  return (
    <div style={{ 'font-size': '12px' }}>
      <div style={{ 'margin-bottom': '12px' }}>
        <div style={{ 'font-weight': 600, 'margin-bottom': '4px' }}>{props.satellite.name}</div>
        <div style={{ color: 'var(--text-secondary)', 'font-size': '11px' }}>
          ID: {props.satellite.id}
        </div>
      </div>

      {props.position ? (
        <div class="stat-grid">
          <div class="stat-item">
            <div class="stat-value">{formatLatitude(props.position.state.latitude)}</div>
            <div class="stat-label">纬度</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">{formatLongitude(props.position.state.longitude)}</div>
            <div class="stat-label">经度</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">{formatAltitude(props.position.state.altitude)}</div>
            <div class="stat-label">轨道高度</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">{formatVelocity(props.position.state.velocity)}</div>
            <div class="stat-label">飞行速度</div>
          </div>
        </div>
      ) : (
        <div style={{ color: 'var(--text-secondary)', 'text-align': 'center', padding: '12px' }}>
          等待轨道数据...
        </div>
      )}
    </div>
  )
}
