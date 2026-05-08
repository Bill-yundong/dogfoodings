export function StatsPanel({ stats, timeStep }) {
  const statItems = [
    { 
      label: '仿真步数', 
      value: timeStep, 
      icon: '⏱', 
      color: '#2196F3' 
    },
    { 
      label: '总车辆数', 
      value: stats.totalVehicles, 
      icon: '🚗', 
      color: '#4CAF50' 
    },
    { 
      label: '当前车辆', 
      value: stats.vehiclesInNetwork || 0, 
      icon: '🚙', 
      color: '#9C27B0' 
    },
    { 
      label: '平均速度', 
      value: `${stats.averageSpeed?.toFixed(1) || 0} 格/步`, 
      icon: '⚡', 
      color: '#FF9800' 
    },
    { 
      label: '等待车辆', 
      value: stats.waitingVehicles || 0, 
      icon: '⏳', 
      color: '#F44336' 
    },
    { 
      label: '通过车辆', 
      value: stats.throughput || 0, 
      icon: '✅', 
      color: '#00BCD4' 
    }
  ];

  return (
    <div style={{
      padding: '20px',
      backgroundColor: '#fff',
      borderRadius: '8px',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
    }}>
      <h3 style={{ marginTop: 0, marginBottom: '20px', color: '#333' }}>实时统计</h3>
      
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: '15px'
      }}>
        {statItems.map((item, index) => (
          <div
            key={index}
            style={{
              padding: '15px',
              backgroundColor: '#f8f9fa',
              borderRadius: '8px',
              borderLeft: `4px solid ${item.color}`
            }}
          >
            <div style={{
              fontSize: '12px',
              color: '#666',
              marginBottom: '5px'
            }}>
              {item.icon} {item.label}
            </div>
            <div style={{
              fontSize: '24px',
              fontWeight: 'bold',
              color: '#333'
            }}>
              {item.value}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
