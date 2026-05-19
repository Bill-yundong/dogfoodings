import { Component, createEffect, createSignal } from 'solid-js';
import { Beaker, Database, ArrowRightLeft, Users, BarChart3, AlertTriangle, CheckCircle, Clock, TrendingUp, Activity } from 'lucide-solid';
import { countSimulations } from '@/db/simulation';
import { countDefectsByType } from '@/db/defect';
import { listTasks, countTasksByStatus } from '@/db/task';
import { format } from 'date-fns';

const Dashboard: Component = () => {
  const [stats, setStats] = createSignal({
    totalSimulations: 0,
    totalSnapshots: 0,
    activeTasks: 0,
    defectRate: 0,
  });
  const [recentSimulations, setRecentSimulations] = createSignal<any[]>([]);
  const [recentTasks, setRecentTasks] = createSignal<any[]>([]);

  createEffect(async () => {
    const simCount = await countSimulations();
    const defectCounts = await countDefectsByType();
    const totalDefects = Object.values(defectCounts).reduce((a, b) => a + b, 0);
    const tasks = await listTasks();
    const taskCounts = await countTasksByStatus();

    setStats({
      totalSimulations: simCount,
      totalSnapshots: simCount * 5,
      activeTasks: taskCounts.in_progress + taskCounts.todo,
      defectRate: simCount > 0 ? Math.min(100, totalDefects / simCount / 10) : 0,
    });

    setRecentSimulations([
      { id: 1, name: '外壳模具-方案A', status: 'completed', fillTime: 2.34, defects: 3, date: Date.now() - 3600000 },
      { id: 2, name: '外壳模具-方案B', status: 'running', fillTime: 1.89, defects: 1, date: Date.now() - 7200000 },
      { id: 3, name: '齿轮模具-优化版', status: 'completed', fillTime: 1.56, defects: 0, date: Date.now() - 86400000 },
    ]);

    setRecentTasks(tasks.slice(0, 5).length > 0 ? tasks.slice(0, 5) : [
      { id: 1, title: '审核外壳模具模拟结果', status: 'review', priority: 'high', assignee: '李工' },
      { id: 2, title: '优化注射速度参数', status: 'in_progress', priority: 'urgent', assignee: '张工' },
      { id: 3, title: '同步参数到生产线MES', status: 'todo', priority: 'medium', assignee: '王工' },
    ]);
  });

  const quickActions = [
    { icon: Beaker, label: '新建模拟', path: '/simulation', color: 'from-primary-500 to-accent-cyan' },
    { icon: Database, label: '参数管理', path: '/parameters', color: 'from-accent-green to-primary-500' },
    { icon: ArrowRightLeft, label: '语义映射', path: '/mapping', color: 'from-accent-orange to-accent-yellow' },
    { icon: Users, label: '协作中心', path: '/collaboration', color: 'from-accent-cyan to-accent-green' },
    { icon: BarChart3, label: '分析报告', path: '/analytics', color: 'from-accent-purple to-accent-pink' },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-accent-green';
      case 'running': return 'text-accent-cyan';
      case 'paused': return 'text-accent-yellow';
      case 'error': return 'text-accent-red';
      default: return 'text-gray-400';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'todo': return 'badge bg-gray-500/20 text-gray-400';
      case 'in_progress': return 'badge bg-accent-cyan/20 text-accent-cyan';
      case 'review': return 'badge bg-accent-yellow/20 text-accent-yellow';
      case 'done': return 'badge bg-accent-green/20 text-accent-green';
      default: return 'badge';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed': return '已完成';
      case 'running': return '运行中';
      case 'paused': return '已暂停';
      case 'error': return '错误';
      default: return status;
    }
  };

  return (
    <div class="space-y-6">
      <div>
        <h1 class="text-2xl font-bold text-gray-100">仪表盘</h1>
        <p class="text-sm text-gray-400 mt-1">欢迎回来，{format(new Date(), 'yyyy年MM月dd日')}</p>
      </div>

      <div class="grid grid-cols-5 gap-4">
        {quickActions.map((action) => (
          <a
            href={action.path}
            class="panel p-4 hover:border-primary-500/50 transition-all cursor-pointer group"
          >
            <div class={`w-12 h-12 rounded-xl bg-gradient-to-br ${action.color} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
              <action.icon class="w-6 h-6 text-white" />
            </div>
            <p class="text-sm font-medium text-gray-200">{action.label}</p>
          </a>
        ))}
      </div>

      <div class="grid grid-cols-4 gap-4">
        <div class="panel p-4">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm text-gray-400">总模拟任务</p>
              <p class="text-3xl font-bold text-gray-100 mt-1">{stats().totalSimulations}</p>
            </div>
            <div class="w-12 h-12 rounded-xl bg-primary-500/20 flex items-center justify-center">
              <Beaker class="w-6 h-6 text-primary-400" />
            </div>
          </div>
          <div class="flex items-center gap-1 mt-3 text-xs text-accent-green">
            <TrendingUp class="w-3 h-3" />
            <span>较上周 +12%</span>
          </div>
        </div>

        <div class="panel p-4">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm text-gray-400">参数快照</p>
              <p class="text-3xl font-bold text-gray-100 mt-1">{stats().totalSnapshots}</p>
            </div>
            <div class="w-12 h-12 rounded-xl bg-accent-cyan/20 flex items-center justify-center">
              <Database class="w-6 h-6 text-accent-cyan" />
            </div>
          </div>
          <div class="flex items-center gap-1 mt-3 text-xs text-accent-green">
            <TrendingUp class="w-3 h-3" />
            <span>较上周 +8%</span>
          </div>
        </div>

        <div class="panel p-4">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm text-gray-400">进行中任务</p>
              <p class="text-3xl font-bold text-gray-100 mt-1">{stats().activeTasks}</p>
            </div>
            <div class="w-12 h-12 rounded-xl bg-accent-orange/20 flex items-center justify-center">
              <Clock class="w-6 h-6 text-accent-orange" />
            </div>
          </div>
          <div class="flex items-center gap-1 mt-3 text-xs text-accent-yellow">
            <Activity class="w-3 h-3" />
            <span>3 个高优先级</span>
          </div>
        </div>

        <div class="panel p-4">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm text-gray-400">缺陷发生率</p>
              <p class="text-3xl font-bold text-gray-100 mt-1">{stats().defectRate.toFixed(1)}%</p>
            </div>
            <div class="w-12 h-12 rounded-xl bg-accent-red/20 flex items-center justify-center">
              <AlertTriangle class="w-6 h-6 text-accent-red" />
            </div>
          </div>
          <div class="flex items-center gap-1 mt-3 text-xs text-accent-green">
            <TrendingUp class="w-3 h-3 rotate-180" />
            <span>较上周 -5%</span>
          </div>
        </div>
      </div>

      <div class="grid grid-cols-2 gap-4">
        <div class="panel">
          <div class="panel-header">
            <span class="panel-title">最近模拟任务</span>
            <a href="/simulation" class="text-xs text-primary-400 hover:text-primary-300">查看全部</a>
          </div>
          <div class="panel-content">
            <table class="data-grid">
              <thead>
                <tr>
                  <th>任务名称</th>
                  <th>状态</th>
                  <th>充填时间</th>
                  <th>缺陷数</th>
                  <th>更新时间</th>
                </tr>
              </thead>
              <tbody>
                {recentSimulations().map((sim) => (
                  <tr class="cursor-pointer hover:bg-dark-100/50" onClick={() => window.location.href = '/simulation'}>
                    <td class="font-medium">{sim.name}</td>
                    <td>
                      <span class={`flex items-center gap-1.5 ${getStatusColor(sim.status)}`}>
                        {sim.status === 'running' && <span class="w-2 h-2 rounded-full bg-accent-cyan animate-pulse" />}
                        {sim.status === 'completed' && <CheckCircle class="w-3 h-3" />}
                        {getStatusText(sim.status)}
                      </span>
                    </td>
                    <td class="font-mono">{sim.fillTime}s</td>
                    <td>
                      <span class={sim.defects > 0 ? 'text-accent-red' : 'text-accent-green'}>
                        {sim.defects}
                      </span>
                    </td>
                    <td class="text-gray-500 text-xs">{format(sim.date, 'MM-dd HH:mm')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div class="panel">
          <div class="panel-header">
            <span class="panel-title">最近任务</span>
            <a href="/collaboration" class="text-xs text-primary-400 hover:text-primary-300">查看全部</a>
          </div>
          <div class="panel-content">
            <table class="data-grid">
              <thead>
                <tr>
                  <th>任务名称</th>
                  <th>状态</th>
                  <th>优先级</th>
                  <th>负责人</th>
                </tr>
              </thead>
              <tbody>
                {recentTasks().map((task) => (
                  <tr class="cursor-pointer hover:bg-dark-100/50" onClick={() => window.location.href = '/collaboration'}>
                    <td class="font-medium">{task.title}</td>
                    <td>
                      <span class={getStatusBadge(task.status)}>
                        {task.status === 'todo' ? '待处理' : task.status === 'in_progress' ? '进行中' : task.status === 'review' ? '审核中' : '已完成'}
                      </span>
                    </td>
                    <td>
                      <span class={task.priority === 'urgent' ? 'text-accent-red' : task.priority === 'high' ? 'text-accent-orange' : 'text-gray-400'}>
                        {task.priority === 'urgent' ? '紧急' : task.priority === 'high' ? '高' : task.priority === 'medium' ? '中' : '低'}
                      </span>
                    </td>
                    <td class="text-gray-400">{task.assignee}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
