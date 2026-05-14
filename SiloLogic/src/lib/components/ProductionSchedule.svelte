<script>
  let {
    onScheduleAdd,
    schedules = []
  } = $props()

  let newSchedule = $state({
    materialType: 'ore',
    quantity: 50,
    priority: 'normal',
    estimatedTime: ''
  })

  const materialTypes = [
    { id: 'ore', name: '矿石' },
    { id: 'gravel', name: '碎石' },
    { id: 'sand', name: '沙子' },
    { id: 'cement', name: '水泥' },
    { id: 'coal', name: '煤炭' }
  ]

  const priorities = [
    { id: 'low', name: '低' },
    { id: 'normal', name: '普通' },
    { id: 'high', name: '高' },
    { id: 'urgent', name: '紧急' }
  ]

  const getPriorityColor = (priority) => {
    const colors = {
      low: '#64748b',
      normal: '#3b82f6',
      high: '#f59e0b',
      urgent: '#ef4444'
    }
    return colors[priority] || '#64748b'
  }

  const getStatusColor = (status) => {
    const colors = {
      pending: '#64748b',
      processing: '#3b82f6',
      completed: '#10b981',
      cancelled: '#ef4444'
    }
    return colors[status] || '#64748b'
  }

  const handleSubmit = () => {
    onScheduleAdd?.({
      ...newSchedule,
      id: `SCH-${Date.now()}`,
      status: 'pending',
      createdAt: Date.now()
    })
    newSchedule = {
      materialType: 'ore',
      quantity: 50,
      priority: 'normal',
      estimatedTime: ''
    }
  }
</script>

<div class="production-schedule">
  <h3>生产调度系统</h3>

  <div class="schedule-form">
    <h4>新建调度任务</h4>
    
    <div class="form-grid">
      <div class="form-group">
        <label>物料类型</label>
        <select bind:value={newSchedule.materialType}>
          {#each materialTypes as m}
            <option value={m.id}>{m.name}</option>
          {/each}
        </select>
      </div>
      
      <div class="form-group">
        <label>数量 (吨)</label>
        <input type="number" bind:value={newSchedule.quantity} min="1" max="1000" />
      </div>
      
      <div class="form-group">
        <label>优先级</label>
        <select bind:value={newSchedule.priority}>
          {#each priorities as p}
            <option value={p.id}>{p.name}</option>
          {/each}
        </select>
      </div>
      
      <div class="form-group">
        <label>预计时间</label>
        <input type="datetime-local" bind:value={newSchedule.estimatedTime} />
      </div>
    </div>
    
    <button class="btn btn-submit" on:click={handleSubmit}>
      添加调度任务
    </button>
  </div>

  <div class="schedule-list">
    <h4>调度任务列表</h4>
    
    {#if schedules.length === 0}
      <div class="empty-state">暂无调度任务</div>
    {:else}
      <div class="schedule-items">
        {#each schedules.slice().reverse() as schedule}
          <div class="schedule-item">
            <div class="schedule-header">
              <span class="schedule-id">{schedule.id}</span>
              <span class="schedule-status" style="background: {getStatusColor(schedule.status)}">
                {schedule.status === 'pending' ? '待处理' : 
                 schedule.status === 'processing' ? '处理中' : 
                 schedule.status === 'completed' ? '已完成' : '已取消'}
              </span>
            </div>
            
            <div class="schedule-details">
              <div class="detail-item">
                <span class="detail-icon">📦</span>
                <span>{materialTypes.find(m => m.id === schedule.materialType)?.name || schedule.materialType}</span>
              </div>
              <div class="detail-item">
                <span class="detail-icon">⚖️</span>
                <span>{schedule.quantity} 吨</span>
              </div>
              <div class="detail-item">
                <span class="detail-icon">⏰</span>
                <span style="color: {getPriorityColor(schedule.priority)}">
                  {priorities.find(p => p.id === schedule.priority)?.name || schedule.priority}
                </span>
              </div>
            </div>
            
            <div class="schedule-time">
              创建于: {new Date(schedule.createdAt).toLocaleString()}
            </div>
          </div>
        {/each}
      </div>
    {/if}
  </div>

  <style>
    .production-schedule {
      background: linear-gradient(135deg, #1a1f3a 0%, #0f1428 100%);
      border-radius: 12px;
      padding: 20px;
      border: 1px solid #2d3748;
      max-height: 600px;
      overflow-y: auto;
    }

    .production-schedule::-webkit-scrollbar {
      width: 6px;
    }

    .production-schedule::-webkit-scrollbar-track {
      background: #1e293b;
      border-radius: 3px;
    }

    .production-schedule::-webkit-scrollbar-thumb {
      background: #4a5568;
      border-radius: 3px;
    }

    h3 {
      margin: 0 0 20px 0;
      color: #e2e8f0;
      font-size: 18px;
      font-weight: 600;
    }

    h4 {
      margin: 0 0 12px 0;
      color: #94a3b8;
      font-size: 14px;
      font-weight: 500;
    }

    .schedule-form {
      margin-bottom: 24px;
      padding-bottom: 20px;
      border-bottom: 1px solid #334155;
    }

    .form-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      margin-bottom: 16px;
    }

    .form-group label {
      display: block;
      margin-bottom: 6px;
      color: #94a3b8;
      font-size: 12px;
    }

    select, input {
      width: 100%;
      padding: 8px 12px;
      background: #1e293b;
      border: 1px solid #334155;
      border-radius: 6px;
      color: #e2e8f0;
      font-size: 13px;
    }

    select:focus, input:focus {
      outline: none;
      border-color: #6366f1;
    }

    .btn-submit {
      width: 100%;
      padding: 10px 16px;
      background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
      border: none;
      border-radius: 6px;
      color: white;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .btn-submit:hover {
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(99, 102, 241, 0.4);
    }

    .schedule-items {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .empty-state {
      text-align: center;
      padding: 30px;
      color: #64748b;
      font-size: 14px;
    }

    .schedule-item {
      background: rgba(30, 41, 59, 0.5);
      padding: 16px;
      border-radius: 8px;
      border: 1px solid #334155;
    }

    .schedule-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
    }

    .schedule-id {
      color: #e2e8f0;
      font-size: 14px;
      font-weight: 600;
    }

    .schedule-status {
      padding: 4px 10px;
      border-radius: 4px;
      color: white;
      font-size: 11px;
      font-weight: 500;
    }

    .schedule-details {
      display: flex;
      gap: 20px;
      margin-bottom: 10px;
    }

    .detail-item {
      display: flex;
      align-items: center;
      gap: 6px;
      color: #94a3b8;
      font-size: 13px;
    }

    .detail-icon {
      font-size: 14px;
    }

    .schedule-time {
      color: #64748b;
      font-size: 11px;
    }
  </style>
</div>
