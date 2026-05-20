<script lang="ts">
  import type { DispatchCommand } from '$lib/types';

  let syncStatus = {
    dispatchCenter: 'connected',
    loadController1: 'connected',
    loadController2: 'connected',
    loadController3: 'syncing'
  };

  let commands: DispatchCommand[] = [
    {
      id: 'cmd-001',
      source: 'dispatch-center',
      target: 'load-controller-1',
      controlSignal: {
        type: 'load-shed',
        powerAdjustment: -5.0,
        duration: 1800,
        priority: 1
      },
      issuedAt: new Date(Date.now() - 300000),
      status: 'executed'
    },
    {
      id: 'cmd-002',
      source: 'dispatch-center',
      target: 'load-controller-2',
      controlSignal: {
        type: 'frequency-support',
        powerAdjustment: 3.0,
        duration: 3600,
        priority: 2
      },
      issuedAt: new Date(Date.now() - 120000),
      status: 'acknowledged'
    },
    {
      id: 'cmd-003',
      source: 'dispatch-center',
      target: 'load-controller-3',
      controlSignal: {
        type: 'load-increase',
        powerAdjustment: 8.0,
        duration: 7200,
        priority: 3
      },
      issuedAt: new Date(Date.now() - 60000),
      status: 'sent'
    },
    {
      id: 'cmd-004',
      source: 'dispatch-center',
      target: 'load-controller-1',
      controlSignal: {
        type: 'load-shed',
        powerAdjustment: -2.5,
        duration: 900,
        priority: 1
      },
      issuedAt: new Date(Date.now() - 10000),
      status: 'pending'
    }
  ];

  let peakForecast = [
    { hour: 8, load: 85 },
    { hour: 9, load: 92 },
    { hour: 10, load: 95 },
    { hour: 11, load: 98 },
    { hour: 12, load: 100 },
    { hour: 13, load: 97 },
    { hour: 14, load: 94 },
    { hour: 15, load: 96 },
    { hour: 16, load: 99 },
    { hour: 17, load: 102 },
    { hour: 18, load: 105 },
    { hour: 19, load: 108 },
    { hour: 20, load: 110 },
    { hour: 21, load: 106 },
    { hour: 22, load: 98 },
    { hour: 23, load: 88 }
  ];

  function getStatusColor(status: string) {
    return status === 'connected' ? 'text-green-400' : 
           status === 'syncing' ? 'text-yellow-400' : 'text-red-400';
  }

  function getStatusDot(status: string) {
    return status === 'connected' ? 'status-online' : 
           status === 'syncing' ? 'status-warning' : 'status-danger';
  }

  function getCommandStatusColor(status: string) {
    return status === 'executed' ? 'bg-green-500/20 text-green-400 border-green-500/30' :
           status === 'acknowledged' ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' :
           status === 'sent' ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' :
           'bg-dark-600/20 text-dark-400 border-dark-600/30';
  }

  function getCommandStatusLabel(status: string) {
    return status === 'executed' ? '已执行' :
           status === 'acknowledged' ? '已确认' :
           status === 'sent' ? '已发送' : '待发送';
  }

  function getControlTypeLabel(type: string) {
    return type === 'load-shed' ? '负荷削减' :
           type === 'load-increase' ? '负荷增加' : '频率支撑';
  }

  function formatTime(date: Date) {
    return new Date(date).toLocaleTimeString('zh-CN');
  }

  function getPeakPoints() {
    const maxLoad = Math.max(...peakForecast.map(p => p.load));
    return peakForecast.map((p, i) => `${40 + (i * 640 / (peakForecast.length - 1))},${150 - (p.load / maxLoad) * 140}`).join(' ');
  }

  function getPeakPolygonPoints() {
    const points = getPeakPoints();
    return `40,150 ${points} 680,150`;
  }

  function getCircleY(load: number) {
    const maxLoad = Math.max(...peakForecast.map(p => p.load));
    return 150 - (load / maxLoad) * 140;
  }

  function getCircleX(index: number) {
    return 40 + (index * 640 / (peakForecast.length - 1));
  }

  function getSafeThresholdY() {
    const maxLoad = Math.max(...peakForecast.map(p => p.load));
    return 10 + (140 * (90 / maxLoad));
  }

  const maxLoad = Math.max(...peakForecast.map(p => p.load));
</script>

<div class="space-y-6">
  <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
    <div class="card">
      <h3 class="text-lg font-bold text-white mb-4">数据同步状态</h3>
      <div class="space-y-3">
        {#each Object.entries(syncStatus) as [node, status]}
          <div class="flex items-center justify-between p-3 bg-dark-800/50 rounded-lg">
            <div class="flex items-center gap-3">
              <span class={`status-dot ${getStatusDot(status)}`}></span>
              <span class="text-white">
                {node === 'dispatchCenter' ? '调度中枢' : 
                 node.replace('loadController', '负荷控制器 #').replace('load-controller-', '#')}
              </span>
            </div>
            <span class={`text-sm ${getStatusColor(status)}`}>
              {status === 'connected' ? '已连接' : status === 'syncing' ? '同步中' : '断开'}
            </span>
          </div>
        {/each}
      </div>
    </div>

    <div class="lg:col-span-2 card">
      <h3 class="text-lg font-bold text-white mb-4">今日削峰填谷策略</h3>
      <div class="space-y-4">
        <div class="flex items-center gap-4">
          <div class="flex-1">
            <div class="flex justify-between text-sm mb-1">
              <span class="text-dark-400">预计峰荷</span>
              <span class="text-white font-mono">110 MW</span>
            </div>
            <div class="h-2 bg-dark-700 rounded-full overflow-hidden">
              <div class="h-full bg-red-500" style="width: 100%"></div>
            </div>
          </div>
          <div class="text-right">
            <p class="text-xs text-dark-400">削峰目标</p>
            <p class="text-lg font-bold text-green-400">-15 MW</p>
          </div>
        </div>
        
        <div class="h-48 relative">
          <svg viewBox="0 0 700 160" class="w-full h-full">
            <defs>
              <linearGradient id="peakGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stop-color="#f97316" stop-opacity="0.3"/>
                <stop offset="100%" stop-color="#f97316" stop-opacity="0"/>
              </linearGradient>
            </defs>
            
            {#each [0, 25, 50, 75, 100] as tick}
              <line 
                x1="40" 
                y1={10 + (140 * tick / 100)} 
                x2="680" 
                y2={10 + (140 * tick / 100)} 
                stroke="rgba(6, 182, 212, 0.05)" 
                stroke-width="1"
              />
            {/each}
            
            <line 
              x1="40" 
              y1={getSafeThresholdY()} 
              x2="680" 
              y2={getSafeThresholdY()} 
              stroke="#22c55e" 
              stroke-width="1" 
              stroke-dasharray="5,5"
            />
            
            <polygon 
              points={getPeakPolygonPoints()} 
              fill="url(#peakGradient)"
            />
            <polyline 
              points={getPeakPoints()} 
              fill="none" 
              stroke="#f97316" 
              stroke-width="2"
            />
            
            {#each peakForecast as p, i}
              <circle 
                cx={getCircleX(i)} 
                cy={getCircleY(p.load)} 
                r="3" 
                fill={p.load > 95 ? "#ef4444" : "#f97316"}
              />
            {/each}
            
            {#each peakForecast as p, i}
              {#if i % 2 === 0}
                <text 
                  x={getCircleX(i)} 
                  y="155" 
                  text-anchor="middle" 
                  fill="#64748b" 
                  font-size="10"
                >
                  {p.hour}:00
                </text>
              {/if}
            {/each}
          </svg>
        </div>
        
        <div class="flex items-center gap-4 text-xs">
          <div class="flex items-center gap-2">
            <span class="w-3 h-3 rounded-full bg-orange-500"></span>
            <span class="text-dark-400">预测负荷</span>
          </div>
          <div class="flex items-center gap-2">
            <span class="w-3 h-0.5 bg-green-500"></span>
            <span class="text-dark-400">安全阈值 (90 MW)</span>
          </div>
        </div>
      </div>
    </div>
  </div>

  <div class="card">
    <div class="flex items-center justify-between mb-4">
      <h3 class="text-lg font-bold text-white">调度指令队列</h3>
      <button class="btn-primary">发布新指令</button>
    </div>
    
    <div class="overflow-x-auto">
      <table class="w-full">
        <thead>
          <tr class="text-left text-dark-400 text-sm border-b border-dark-700">
            <th class="pb-3">指令ID</th>
            <th class="pb-3">类型</th>
            <th class="pb-3">目标</th>
            <th class="pb-3">功率调整</th>
            <th class="pb-3">持续时间</th>
            <th class="pb-3">优先级</th>
            <th class="pb-3">发布时间</th>
            <th class="pb-3">状态</th>
          </tr>
        </thead>
        <tbody class="text-sm">
          {#each commands as cmd}
            <tr class="border-b border-dark-800 hover:bg-dark-800/30">
              <td class="py-3 font-mono text-accent-400">{cmd.id}</td>
              <td class="py-3">{getControlTypeLabel(cmd.controlSignal.type)}</td>
              <td class="py-3">{cmd.target.replace('load-controller-', '控制器 #')}</td>
              <td class={`py-3 font-mono ${cmd.controlSignal.powerAdjustment < 0 ? 'text-green-400' : 'text-yellow-400'}`}>
                {cmd.controlSignal.powerAdjustment > 0 ? '+' : ''}{cmd.controlSignal.powerAdjustment} MW
              </td>
              <td class="py-3">{cmd.controlSignal.duration} s</td>
              <td class="py-3">
                <span class={`px-2 py-0.5 rounded text-xs ${
                  cmd.controlSignal.priority === 1 ? 'bg-red-500/20 text-red-400' :
                  cmd.controlSignal.priority === 2 ? 'bg-yellow-500/20 text-yellow-400' :
                  'bg-blue-500/20 text-blue-400'
                }`}>
                  P{cmd.controlSignal.priority}
                </span>
              </td>
              <td class="py-3 text-dark-400">{formatTime(cmd.issuedAt)}</td>
              <td class="py-3">
                <span class={`px-2 py-1 rounded-full text-xs border ${getCommandStatusColor(cmd.status)}`}>
                  {getCommandStatusLabel(cmd.status)}
                </span>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  </div>

  <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
    <div class="card">
      <h3 class="text-lg font-bold text-white mb-4">可调节负荷潜力</h3>
      <div class="space-y-4">
        <div>
          <div class="flex justify-between text-sm mb-1">
            <span class="text-dark-400">居民负荷</span>
            <span class="text-white font-mono">25 MW</span>
          </div>
          <div class="h-2 bg-dark-700 rounded-full overflow-hidden">
            <div class="h-full bg-accent-500" style="width: 62%"></div>
          </div>
        </div>
        <div>
          <div class="flex justify-between text-sm mb-1">
            <span class="text-dark-400">商业负荷</span>
            <span class="text-white font-mono">18 MW</span>
          </div>
          <div class="h-2 bg-dark-700 rounded-full overflow-hidden">
            <div class="h-full bg-blue-500" style="width: 45%"></div>
          </div>
        </div>
        <div>
          <div class="flex justify-between text-sm mb-1">
            <span class="text-dark-400">工业负荷</span>
            <span class="text-white font-mono">40 MW</span>
          </div>
          <div class="h-2 bg-dark-700 rounded-full overflow-hidden">
            <div class="h-full bg-green-500" style="width: 80%"></div>
          </div>
        </div>
        <div class="pt-4 border-t border-dark-700">
          <div class="flex justify-between">
            <span class="text-dark-400">总计可调潜力</span>
            <span class="text-xl font-bold text-accent-400">83 MW</span>
          </div>
        </div>
      </div>
    </div>

    <div class="card">
      <h3 class="text-lg font-bold text-white mb-4">调控效果预估</h3>
      <div class="space-y-4">
        <div class="text-center p-4 bg-dark-800/50 rounded-lg">
          <p class="text-xs text-dark-400">预计峰荷降低</p>
          <p class="text-3xl font-bold text-green-400">12.5%</p>
        </div>
        <div class="text-center p-4 bg-dark-800/50 rounded-lg">
          <p class="text-xs text-dark-400">用户参与数量</p>
          <p class="text-3xl font-bold text-accent-400">8,452</p>
        </div>
        <div class="text-center p-4 bg-dark-800/50 rounded-lg">
          <p class="text-xs text-dark-400">预计经济效益</p>
          <p class="text-3xl font-bold text-yellow-400">¥12.8万</p>
        </div>
      </div>
    </div>

    <div class="card">
      <h3 class="text-lg font-bold text-white mb-4">快速操作</h3>
      <div class="space-y-3">
        <button class="btn-primary w-full">执行削峰策略</button>
        <button class="btn-secondary w-full">生成调控报告</button>
        <button class="btn-secondary w-full">查看历史记录</button>
        <button class="btn-accent w-full">同步所有控制器</button>
      </div>
    </div>
  </div>
</div>
