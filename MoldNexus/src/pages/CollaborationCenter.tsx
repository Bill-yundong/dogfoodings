import { Component, createEffect, createSignal, For } from 'solid-js';
import { Plus, Users, MessageSquare, Clock } from 'lucide-solid';
import { format } from 'date-fns';
import { listTasks, createTask, updateTask } from '@/db/task';
import { createComment, listComments } from '@/db/comment';
import type { Task, User, Comment } from '@/types';

const CollaborationCenter: Component = () => {
  const [tasks, setTasks] = createSignal<Task[]>([]);
  const [comments, setComments] = createSignal<Comment[]>([]);
  const [showTaskModal, setShowTaskModal] = createSignal(false);
  const [newTask, setNewTask] = createSignal({
    title: '',
    description: '',
    priority: 'medium' as Task['priority'],
    assigneeId: 'user-001',
  });

  const mockUsers: User[] = [
    { id: 'user-001', name: '张工程师', role: 'process_engineer', email: 'zhang@moldnexus.com', createdAt: Date.now() },
    { id: 'user-002', name: '李工程师', role: 'quality_engineer', email: 'li@moldnexus.com', createdAt: Date.now() },
    { id: 'user-003', name: '王操作员', role: 'production_operator', email: 'wang@moldnexus.com', createdAt: Date.now() },
  ];

  createEffect(async () => {
    const taskData = await listTasks();
    if (taskData.length === 0) {
      const mockTasks: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>[] = [
        { title: '审核外壳模具模拟结果', description: '请审核最新的外壳模具充填模拟结果，确认缺陷情况', status: 'review', priority: 'high', assigneeId: 'user-002', creatorId: 'user-001' },
        { title: '优化注射速度参数', description: '根据模拟结果优化注射速度参数，减少熔接痕', status: 'in_progress', priority: 'urgent', assigneeId: 'user-001', creatorId: 'user-001' },
        { title: '同步参数到生产线MES', description: '将优化后的参数同步到生产线MES系统', status: 'todo', priority: 'medium', assigneeId: 'user-003', creatorId: 'user-001' },
        { title: '生成质量分析报告', description: '生成本月的质量分析报告，统计各类缺陷发生率', status: 'todo', priority: 'low', assigneeId: 'user-002', creatorId: 'user-001' },
        { title: '验证新模具几何设计', description: '验证新的模具几何设计，检查是否存在充填问题', status: 'done', priority: 'high', assigneeId: 'user-001', creatorId: 'user-001' },
      ];
      for (const task of mockTasks) {
        await createTask(task);
      }
      setTasks(await listTasks());
    } else {
      setTasks(taskData);
    }

    setComments(await listComments());
  });

  const getTasksByStatus = (status: Task['status']) => {
    return tasks().filter(t => t.status === status);
  };

  const getStatusTitle = (status: Task['status']) => {
    const titles: Record<Task['status'], string> = {
      todo: '待处理',
      in_progress: '进行中',
      review: '审核中',
      done: '已完成',
    };
    return titles[status];
  };

  const getStatusColor = (status: Task['status']) => {
    const colors: Record<Task['status'], string> = {
      todo: 'bg-gray-500',
      in_progress: 'bg-accent-cyan',
      review: 'bg-accent-yellow',
      done: 'bg-accent-green',
    };
    return colors[status];
  };

  const getPriorityLabel = (priority: Task['priority']) => {
    const labels: Record<Task['priority'], string> = {
      low: '低',
      medium: '中',
      high: '高',
      urgent: '紧急',
    };
    return labels[priority];
  };

  const getPriorityColor = (priority: Task['priority']) => {
    const colors: Record<Task['priority'], string> = {
      low: 'bg-gray-500/20 text-gray-400',
      medium: 'bg-accent-cyan/20 text-accent-cyan',
      high: 'bg-accent-orange/20 text-accent-orange',
      urgent: 'bg-accent-red/20 text-accent-red',
    };
    return colors[priority];
  };

  const getUserName = (id: string) => {
    return mockUsers.find(u => u.id === id)?.name || '未知用户';
  };

  const handleStatusChange = async (task: Task, newStatus: Task['status']) => {
    await updateTask(task.id, { status: newStatus });
    setTasks(await listTasks());
  };

  const handleCreateTask = async () => {
    if (!newTask().title.trim()) return;
    await createTask({
      ...newTask(),
      status: 'todo',
      creatorId: 'user-001',
    });
    setTasks(await listTasks());
    setShowTaskModal(false);
    setNewTask({ title: '', description: '', priority: 'medium', assigneeId: 'user-001' });
  };

  const handleAddComment = async (content: string) => {
    if (!content.trim()) return;
    await createComment({
      userId: 'user-001',
      content,
      taskId: 'task-001',
    });
    setComments(await listComments());
  };

  const columns: Task['status'][] = ['todo', 'in_progress', 'review', 'done'];

  return (
    <div class="space-y-6">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold text-gray-100">协作中心</h1>
          <p class="text-sm text-gray-400 mt-1">跨部门任务协作与数据共享</p>
        </div>
        <button onClick={() => setShowTaskModal(true)} class="btn btn-primary">
          <Plus class="w-4 h-4" /> 新建任务
        </button>
      </div>

      <div class="grid grid-cols-4 gap-4 mb-6">
        {columns.map(status => (
          <div class="panel">
            <div class="panel-content py-3">
              <div class="flex items-center gap-2">
                <div class={`w-3 h-3 rounded-full ${getStatusColor(status)}`} />
                <span class="font-medium text-gray-200">{getStatusTitle(status)}</span>
                <span class="ml-auto text-sm text-gray-500">{getTasksByStatus(status).length}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div class="grid grid-cols-4 gap-4 flex-1">
        <For each={columns}>
          {(status) => (
            <div class="panel">
              <div class="panel-content">
                <div class="space-y-3 min-h-32">
                  <For each={getTasksByStatus(status)}>
                    {(task) => (
                      <div class="bg-dark-100 rounded-lg p-3 cursor-move hover:border-primary-500/50 border border-transparent transition-all">
                        <div class="flex items-start justify-between mb-2">
                          <h4 class="text-sm font-medium text-gray-200 flex-1">{task.title}</h4>
                          <span class={`badge ${getPriorityColor(task.priority)}`}>
                            {getPriorityLabel(task.priority)}
                          </span>
                        </div>
                        <p class="text-xs text-gray-500 mb-3 line-clamp-2">{task.description}</p>
                        <div class="flex items-center justify-between text-xs">
                          <div class="flex items-center gap-1 text-gray-500">
                            <Users class="w-3 h-3" />
                            <span>{getUserName(task.assigneeId)}</span>
                          </div>
                          <div class="flex items-center gap-1">
                            <Clock class="w-3 h-3 text-gray-500" />
                            <span class="text-gray-500">{format(task.updatedAt, 'MM-dd')}</span>
                          </div>
                        </div>
                        <div class="mt-3 flex gap-1">
                          {columns.filter(s => s !== status).map(nextStatus => (
                            <button
                              onClick={() => handleStatusChange(task, nextStatus)}
                              class="flex-1 px-2 py-1 text-xs bg-dark-300 hover:bg-dark-200 text-gray-400 hover:text-gray-200 rounded transition-colors"
                            >
                              → {getStatusTitle(nextStatus)}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </For>
                </div>
              </div>
            </div>
          )}
        </For>
      </div>

      <div class="panel">
        <div class="panel-header">
          <span class="panel-title flex items-center gap-2">
            <MessageSquare class="w-4 h-4 text-primary-400" />
            团队动态
          </span>
        </div>
        <div class="panel-content">
          <div class="flex gap-4">
            <div class="flex-1 space-y-4 max-h-64 overflow-y-auto">
              {comments().length === 0 ? (
                <div class="text-center py-8 text-gray-500">
                  <MessageSquare class="w-12 h-12 mx-auto mb-2 opacity-30" />
                  <p class="text-sm">暂无评论</p>
                </div>
              ) : (
                <For each={comments()}>
                  {(comment) => (
                    <div class="flex gap-3">
                      <div class="w-8 h-8 bg-primary-600 rounded-full flex items-center justify-center flex-shrink-0">
                        <span class="text-xs font-medium text-white">{getUserName(comment.userId)[0]}</span>
                      </div>
                      <div class="flex-1">
                        <div class="flex items-center gap-2">
                          <span class="text-sm font-medium text-gray-200">{getUserName(comment.userId)}</span>
                          <span class="text-xs text-gray-500">{format(comment.createdAt, 'MM-dd HH:mm')}</span>
                        </div>
                        <p class="text-sm text-gray-400 mt-1">{comment.content}</p>
                      </div>
                    </div>
                  )}
                </For>
              )}
            </div>
            <div class="w-64 border-l border-dark-100 pl-4">
              <h4 class="text-sm font-medium text-gray-300 mb-3">在线成员</h4>
              <div class="space-y-2">
                <For each={mockUsers}>
                  {(user) => (
                    <div class="flex items-center gap-2 p-2 rounded-lg hover:bg-dark-100 transition-colors">
                      <div class="relative">
                        <div class="w-8 h-8 bg-primary-600 rounded-full flex items-center justify-center">
                          <span class="text-xs font-medium text-white">{user.name[0]}</span>
                        </div>
                        <div class="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-accent-green rounded-full border-2 border-dark-200" />
                      </div>
                      <div>
                        <p class="text-sm text-gray-200">{user.name}</p>
                        <p class="text-xs text-gray-500">
                          {user.role === 'process_engineer' && '工艺工程师'}
                          {user.role === 'quality_engineer' && '质量工程师'}
                          {user.role === 'production_operator' && '生产线操作员'}
                        </p>
                      </div>
                    </div>
                  )}
                </For>
              </div>
            </div>
          </div>
          <div class="mt-4 pt-4 border-t border-dark-100">
            <div class="flex gap-2">
              <input
                type="text"
                placeholder="发送消息..."
                class="input flex-1"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleAddComment(e.currentTarget.value);
                    e.currentTarget.value = '';
                  }
                }}
              />
              <button
                onClick={(e) => {
                  const input = (e.currentTarget.previousElementSibling as HTMLInputElement);
                  handleAddComment(input.value);
                  input.value = '';
                }}
                class="btn btn-primary"
              >
                发送
              </button>
            </div>
          </div>
        </div>
      </div>

      {showTaskModal() && (
        <div class="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div class="panel w-full max-w-lg mx-4">
            <div class="panel-header">
              <span class="panel-title">新建任务</span>
              <button onClick={() => setShowTaskModal(false)} class="text-gray-400 hover:text-gray-200">
                ✕
              </button>
            </div>
            <div class="panel-content space-y-4">
              <div>
                <label class="block text-sm text-gray-300 mb-1.5">任务标题</label>
                <input
                  type="text"
                  value={newTask().title}
                  onInput={(e) => setNewTask({ ...newTask(), title: e.target.value })}
                  class="input"
                  placeholder="输入任务标题..."
                />
              </div>
              <div>
                <label class="block text-sm text-gray-300 mb-1.5">任务描述</label>
                <textarea
                  value={newTask().description}
                  onInput={(e) => setNewTask({ ...newTask(), description: e.target.value })}
                  class="input min-h-24 resize-none"
                  placeholder="输入任务描述..."
                />
              </div>
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="block text-sm text-gray-300 mb-1.5">优先级</label>
                  <select
                    value={newTask().priority}
                    onChange={(e) => setNewTask({ ...newTask(), priority: e.target.value as any })}
                    class="input"
                  >
                    <option value="low">低</option>
                    <option value="medium">中</option>
                    <option value="high">高</option>
                    <option value="urgent">紧急</option>
                  </select>
                </div>
                <div>
                  <label class="block text-sm text-gray-300 mb-1.5">负责人</label>
                  <select
                    value={newTask().assigneeId}
                    onChange={(e) => setNewTask({ ...newTask(), assigneeId: e.target.value })}
                    class="input"
                  >
                    <For each={mockUsers}>
                      {(user) => <option value={user.id}>{user.name}</option>}
                    </For>
                  </select>
                </div>
              </div>
              <div class="flex justify-end gap-3 pt-4 border-t border-dark-100">
                <button onClick={() => setShowTaskModal(false)} class="btn btn-secondary">
                  取消
                </button>
                <button onClick={handleCreateTask} class="btn btn-primary">
                  创建
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CollaborationCenter;
