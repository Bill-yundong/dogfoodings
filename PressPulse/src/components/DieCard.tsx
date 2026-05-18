import { Component, createMemo } from 'solid-js'
import { DieHealthRecord } from '../types'
import { HealthGauge } from './HealthGauge'

interface DieCardProps {
  record: DieHealthRecord
  onClick?: () => void
}

export const DieCard: Component<DieCardProps> = (props) => {
  const statusColor = createMemo(() => {
    if (props.record.currentHealth >= 70) return '#10b981'
    if (props.record.currentHealth >= 40) return '#f59e0b'
    return '#ef4444'
  })

  const statusText = createMemo(() => {
    if (props.record.currentHealth >= 70) return '健康'
    if (props.record.currentHealth >= 40) return '注意'
    return '危险'
  })

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('zh-CN')
  }

  return (
    <div
      onClick={props.onClick}
      style={{
        'background': 'white',
        'border-radius': '12px',
        'box-shadow': '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
        'padding': '20px',
        'cursor': props.onClick ? 'pointer' : 'default',
        'transition': 'transform 0.2s, box-shadow 0.2s',
        ':hover': {
          'transform': 'translateY(-4px)',
          'box-shadow': '0 12px 24px -8px rgba(0, 0, 0, 0.15)',
        },
      }}
    >
      <div style={{ display: 'flex', 'justify-content': 'space-between', 'align-items': 'start' }}>
        <div>
          <h3 style={{ margin: '0 0 8px 0', 'font-size': '18px', 'font-weight': 600 }}>
            {props.record.name}
          </h3>
          <p style={{ margin: 0, color: '#6b7280', 'font-size': '14px' }}>
            型号: {props.record.model}
          </p>
        </div>
        <span
          style={{
            'background': statusColor(),
            color: 'white',
            padding: '4px 12px',
            'border-radius': '20px',
            'font-size': '12px',
            'font-weight': 500,
          }}
        >
          {statusText()}
        </span>
      </div>

      <div style={{ display: 'flex', 'justify-content': 'center', margin: '16px 0' }}>
        <HealthGauge value={props.record.currentHealth} size={120} />
      </div>

      <div style={{ display: 'grid', 'grid-template-columns': '1fr 1fr', gap: '12px', 'margin-top': '16px' }}>
        <div>
          <p style={{ margin: 0, color: '#6b7280', 'font-size': '12px' }}>剩余寿命</p>
          <p style={{ margin: '4px 0 0 0', 'font-weight': 600, 'font-size': '16px' }}>
            {props.record.predictedRemainingLife} 天
          </p>
        </div>
        <div>
          <p style={{ margin: 0, color: '#6b7280', 'font-size': '12px' }}>失效概率</p>
          <p style={{ margin: '4px 0 0 0', 'font-weight': 600, 'font-size': '16px' }}>
            {(props.record.failureProbability * 100).toFixed(1)}%
          </p>
        </div>
        <div>
          <p style={{ margin: 0, color: '#6b7280', 'font-size': '12px' }}>累计周期</p>
          <p style={{ margin: '4px 0 0 0', 'font-weight': 600, 'font-size': '16px' }}>
            {props.record.stressAccumulation.totalCycles.toFixed(0)}
          </p>
        </div>
        <div>
          <p style={{ margin: 0, color: '#6b7280', 'font-size': '12px' }}>累计损伤</p>
          <p style={{ margin: '4px 0 0 0', 'font-weight': 600, 'font-size': '16px' }}>
            {(props.record.stressAccumulation.damageAccumulated * 100).toFixed(1)}%
          </p>
        </div>
      </div>

      <div style={{
        'margin-top': '16px',
        'padding-top': '16px',
        'border-top': '1px solid #e5e7eb',
        'font-size': '12px',
        color: '#9ca3af',
      }}>
        <p style={{ margin: '4px 0' }}>安装日期: {formatDate(props.record.installDate)}</p>
        <p style={{ margin: '4px 0' }}>上次维护: {formatDate(props.record.lastMaintenanceDate)}</p>
      </div>
    </div>
  )
}
