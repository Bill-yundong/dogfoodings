import type { Component } from 'solid-js'
import { For } from 'solid-js'
import type { VisibilityWindow } from '../core/types'
import { formatTime, formatDuration, formatElevation, getVisibilityStatus } from '../utils/format'

interface VisibilityPanelProps {
  windows: VisibilityWindow[]
  currentTime: number
  onPredictVisibility?: () => void
  isLoading?: boolean
}

export const VisibilityPanel: Component<VisibilityPanelProps> = (props) => {
  const upcomingWindows = () => {
    const now = props.currentTime
    return props.windows
      .filter(w => w.endTime > now)
      .slice(0, 10)
      .sort((a, b) => a.startTime - b.startTime)
  }

  return (
    <div class="visibility-panel">
      <div class="visibility-header">
        <h3>📡 通视时间窗</h3>
        <span style={{ 'font-size': '11px', color: 'var(--text-secondary)' }}>
          共 {props.windows.length} 个
        </span>
      </div>
      <div class="visibility-content">
        {upcomingWindows().length === 0 ? (
          <div style={{ 'text-align': 'center', padding: '20px', color: 'var(--text-secondary)' }}>
            暂无通视时间窗数据
            <div style={{ 'font-size': '11px', 'margin-top': '8px', 'margin-bottom': '12px' }}>
              点击下方按钮开始计算
            </div>
            {props.onPredictVisibility && (
              <button
                class="btn btn-primary"
                onClick={props.onPredictVisibility}
                disabled={props.isLoading}
                style={{ width: '100%' }}
              >
                {props.isLoading ? '计算中...' : '🔭 预测通视时间窗'}
              </button>
            )}
          </div>
        ) : (
          <For each={upcomingWindows()}>
            {(window) => {
              const status = getVisibilityStatus(window, props.currentTime)
              const isActive = status === 'active'
              const duration = window.endTime - window.startTime

              return (
                <div
                  class={`visibility-item ${isActive ? 'warning' : ''}`}
                >
                  <div class="visibility-satellite">
                    {window.satelliteName} → {window.stationName}
                  </div>
                  <div class="visibility-time">
                    {formatTime(window.startTime)} - {formatTime(window.endTime)}
                  </div>
                  <div style={{ display: 'flex', 'justify-content': 'space-between', 'margin-top': '4px', 'font-size': '10px', color: 'var(--text-secondary)' }}>
                    <span>时长: {formatDuration(duration)}</span>
                    <span>最大仰角: {formatElevation(window.maxElevation)}</span>
                  </div>
                  {isActive && (
                    <div style={{ 'margin-top': '4px', 'font-size': '10px', color: 'var(--accent-warning)' }}>
                      ● 正在通信中
                    </div>
                  )}
                </div>
              )
            }}
          </For>
        )}
      </div>
    </div>
  )
}
