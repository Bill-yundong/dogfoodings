import { TimeSlot } from '../types';

export function ControlPanel({
  isRunning,
  onToggleRunning,
  onReset,
  timeSlot,
  onTimeSlotChange,
  simulationSpeed,
  onSpeedChange,
  vehicleSpawnRate,
  onSpawnRateChange,
  onSyncDevices,
  onAlignDevices,
  alignmentStatus
}) {
  const timeSlotLabels = {
    [TimeSlot.MORNING_PEAK]: '早高峰 (7:00-9:00)',
    [TimeSlot.MIDDAY]: '平峰 (9:00-17:00)',
    [TimeSlot.EVENING_PEAK]: '晚高峰 (17:00-19:00)',
    [TimeSlot.NIGHT]: '夜间 (19:00-7:00)'
  };

  return (
    <div style={{
      padding: '20px',
      backgroundColor: '#fff',
      borderRadius: '8px',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
      minWidth: '300px'
    }}>
      <h3 style={{ marginTop: 0, marginBottom: '20px', color: '#333' }}>控制面板</h3>
      
      <div style={{ marginBottom: '20px' }}>
        <h4 style={{ margin: '0 0 10px 0', color: '#666', fontSize: '14px' }}>仿真控制</h4>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={onToggleRunning}
            style={{
              padding: '10px 20px',
              border: 'none',
              borderRadius: '4px',
              backgroundColor: isRunning ? '#f44336' : '#4CAF50',
              color: '#fff',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 'bold'
            }}
          >
            {isRunning ? '⏸ 暂停' : '▶ 开始'}
          </button>
          <button
            onClick={onReset}
            style={{
              padding: '10px 20px',
              border: 'none',
              borderRadius: '4px',
              backgroundColor: '#2196F3',
              color: '#fff',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 'bold'
            }}
          >
            ↺ 重置
          </button>
        </div>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h4 style={{ margin: '0 0 10px 0', color: '#666', fontSize: '14px' }}>时段设置</h4>
        <select
          value={timeSlot}
          onChange={(e) => onTimeSlotChange(e.target.value)}
          style={{
            width: '100%',
            padding: '8px',
            border: '1px solid #ddd',
            borderRadius: '4px',
            fontSize: '14px'
          }}
        >
          {Object.entries(timeSlotLabels).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h4 style={{ margin: '0 0 10px 0', color: '#666', fontSize: '14px' }}>
          仿真速度: {simulationSpeed}x
        </h4>
        <input
          type="range"
          min="1"
          max="10"
          value={simulationSpeed}
          onChange={(e) => onSpeedChange(Number(e.target.value))}
          style={{ width: '100%' }}
        />
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h4 style={{ margin: '0 0 10px 0', color: '#666', fontSize: '14px' }}>
          车辆生成率: {vehicleSpawnRate}%
        </h4>
        <input
          type="range"
          min="5"
          max="50"
          value={vehicleSpawnRate}
          onChange={(e) => onSpawnRateChange(Number(e.target.value))}
          style={{ width: '100%' }}
        />
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h4 style={{ margin: '0 0 10px 0', color: '#666', fontSize: '14px' }}>绿波协同</h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <button
            onClick={onSyncDevices}
            style={{
              padding: '10px 20px',
              border: 'none',
              borderRadius: '4px',
              backgroundColor: '#9C27B0',
              color: '#fff',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 'bold'
            }}
          >
            ⟳ 同步设备
          </button>
          <button
            onClick={onAlignDevices}
            style={{
              padding: '10px 20px',
              border: 'none',
              borderRadius: '4px',
              backgroundColor: '#FF9800',
              color: '#fff',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 'bold'
            }}
          >
            ⇄ 对齐检测
          </button>
        </div>
      </div>

      {alignmentStatus && (
        <div style={{
          padding: '10px',
          backgroundColor: alignmentStatus.allAligned ? '#E8F5E9' : '#FFF3E0',
          borderRadius: '4px',
          border: `1px solid ${alignmentStatus.allAligned ? '#4CAF50' : '#FF9800'}`
        }}>
          <div style={{
            fontWeight: 'bold',
            color: alignmentStatus.allAligned ? '#2E7D32' : '#E65100',
            marginBottom: '5px'
          }}>
            {alignmentStatus.allAligned ? '✓ 所有设备已对齐' : '⚠ 部分设备未对齐'}
          </div>
          <div style={{ fontSize: '12px', color: '#666' }}>
            已检查 {alignmentStatus.totalDevices} 个设备
          </div>
        </div>
      )}
    </div>
  );
}
