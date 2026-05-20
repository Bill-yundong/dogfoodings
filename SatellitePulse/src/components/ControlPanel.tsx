import type { Component } from 'solid-js'

interface ControlPanelProps {
  timeSpeed: number
  isSimulating: boolean
  onSpeedChange: (speed: number) => void
  onStart: () => void
  onStop: () => void
  onPredictVisibility: () => void
  isLoading: boolean
}

export const ControlPanel: Component<ControlPanelProps> = (props) => {
  return (
    <div class="control-panel">
      <div class="control-group">
        <label>时间加速: {props.timeSpeed}x</label>
        <input
          type="range"
          min="1"
          max="100"
          value={props.timeSpeed}
          onInput={(e) => props.onSpeedChange(Number(e.target.value))}
        />
      </div>

      <div style={{ display: 'flex', gap: '8px', 'margin-top': '8px' }}>
        {!props.isSimulating ? (
          <button
            class="btn btn-primary"
            onClick={props.onStart}
            style={{ flex: 1 }}
          >
            ▶ 开始仿真
          </button>
        ) : (
          <button
            class="btn btn-secondary"
            onClick={props.onStop}
            style={{ flex: 1 }}
          >
            ⏸ 暂停仿真
          </button>
        )}
      </div>

      <button
        class="btn btn-secondary"
        onClick={props.onPredictVisibility}
        disabled={props.isLoading}
      >
        {props.isLoading ? '计算中...' : '🔭 预测通视时间窗'}
      </button>
    </div>
  )
}
