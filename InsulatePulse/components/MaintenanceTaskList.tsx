'use client';

import { MaintenanceTask } from '@/types';

interface MaintenanceTaskListProps {
  tasks: MaintenanceTask[];
}

export function MaintenanceTaskList({ tasks }: MaintenanceTaskListProps) {
  const priorityColors = {
    low: 'bg-success-100 text-success-800',
    medium: 'bg-warning-100 text-warning-800',
    high: 'bg-danger-100 text-danger-800'
  };

  const priorityLabels = {
    low: '低',
    medium: '中',
    high: '高'
  };

  const typeLabels = {
    inspection: '巡检',
    cleaning: '清洗',
    replacement: '更换'
  };

  const statusColors = {
    pending: 'bg-yellow-500',
    in_progress: 'bg-blue-500',
    completed: 'bg-success-500'
  };

  const statusLabels = {
    pending: '待处理',
    in_progress: '进行中',
    completed: '已完成'
  };

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-4 border-b">
        <h3 className="text-lg font-semibold">检修任务</h3>
      </div>
      
      <div className="divide-y max-h-80 overflow-y-auto">
        {tasks.length === 0 ? (
          <div className="p-8 text-center text-gray-500">暂无待处理任务</div>
        ) : (
          tasks.map((task) => (
            <div key={task.id} className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="font-medium">{task.description}</div>
                <div className="flex items-center space-x-2">
                  <span className={`px-2 py-0.5 rounded text-xs ${priorityColors[task.priority]}`}>
                    {priorityLabels[task.priority]}优先级
                  </span>
                  <span className={`w-2 h-2 rounded-full ${statusColors[task.status]}`} title={statusLabels[task.status]} />
                </div>
              </div>
              <div className="flex items-center justify-between text-sm text-gray-500">
                <span>设备ID: {task.insulatorId}</span>
                <span>任务类型: {typeLabels[task.type]}</span>
                <span>计划时间: {new Date(task.scheduledTime).toLocaleString()}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}