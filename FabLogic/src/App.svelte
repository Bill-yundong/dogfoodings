<script>
  import { onMount } from 'svelte'
  import {
    ohts,
    wafers,
    tasks,
    roadNetwork,
    isInitialized,
    isSimulating,
    stats,
    init
  } from './store/AMHSStore.js'
  import StatsCard from './components/StatsCard.svelte'
  import NetworkMap from './components/NetworkMap.svelte'
  import OHTList from './components/OHTList.svelte'
  import TaskList from './components/TaskList.svelte'
  import AlertPanel from './components/AlertPanel.svelte'
  import ControlPanel from './components/ControlPanel.svelte'
  import CleanRoomTerminal from './components/CleanRoomTerminal.svelte'
  import SyncStatus from './components/SyncStatus.svelte'
  import { WaferStatus } from './types/amhs.js'

  let activeView = $state('dispatch')

  onMount(async () => {
    await init({ ohtCount: 8, waferCount: 20 })
  })
</script>

<div class="min-h-screen bg-slate-950 text-slate-100">
  <!-- 顶部导航栏 -->
  <header class="bg-slate-900/90 backdrop-blur-xl border-b border-slate-800 sticky top-0 z-50">
    <div class="max-w-[1600px] mx-auto px-6 py-3">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-4">
          <div class="relative">
            <div class="w-11 h-11 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
              <span class="text-white font-bold text-lg">🏭</span>
            </div>
            <div class="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-slate-900"></div>
          </div>
          <div>
            <h1 class="text-lg font-bold text-white tracking-tight">FabLogic AMHS</h1>
            <p class="text-xs text-slate-400">半导体晶圆厂自动物料搬运系统</p>
          </div>
        </div>

        <div class="flex items-center gap-6">
          <nav class="flex items-center gap-1 bg-slate-800/80 rounded-xl p-1 border border-slate-700/50">
            <button
              onclick={() => activeView = 'dispatch'}
              class="px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 {activeView === 'dispatch' ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-lg shadow-cyan-500/25' : 'text-slate-400 hover:text-white hover:bg-slate-700/50'}"
            >
              <span class="mr-1.5">🎯</span>调度中心
            </button>
            <button
              onclick={() => activeView = 'cleanroom'}
              class="px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 {activeView === 'cleanroom' ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-lg shadow-cyan-500/25' : 'text-slate-400 hover:text-white hover:bg-slate-700/50'}"
            >
              <span class="mr-1.5">🏭</span>洁净室终端
            </button>
          </nav>

          <div class="flex items-center gap-3 px-4 py-2 bg-slate-800/50 rounded-xl border border-slate-700/50">
            <span class="relative flex h-2.5 w-2.5">
              <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span class="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <span class="text-sm font-medium">
              {#if $isSimulating}
                <span class="text-emerald-400">● 运行中</span>
              {:else}
                <span class="text-slate-500">○ 待机</span>
              {/if}
            </span>
          </div>
        </div>
      </div>
    </div>
  </header>

  <!-- 主内容区 -->
  <main class="max-w-[1600px] mx-auto px-6 py-6">
    {#if !$isInitialized}
      <div class="flex items-center justify-center h-[calc(100vh-200px)]">
        <div class="text-center">
          <div class="w-20 h-20 border-4 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin mx-auto mb-6"></div>
          <p class="text-slate-400 text-lg">正在初始化 AMHS 系统...</p>
          <p class="text-slate-500 text-sm mt-2">加载路网数据与智能体配置</p>
        </div>
      </div>
    {:else if activeView === 'dispatch'}
      <div class="space-y-6">
        <div class="grid grid-cols-4 gap-5">
          <div class="col-span-1">
            <StatsCard
              title="OHT 运行中"
              value={$stats.activeOHTs + '/' + $stats.totalOHTs}
              icon="🚗"
              color="primary"
              trend={$stats.activeOHTs > 0 ? 15 : 0}
            />
          </div>
          <div class="col-span-1">
            <StatsCard
              title="待处理任务"
              value={$stats.pendingTasks}
              icon="📋"
              color="warning"
              trend={$stats.pendingTasks > 3 ? 8 : -5}
            />
          </div>
          <div class="col-span-1">
            <StatsCard
              title="已完成任务"
              value={$stats.completedTasks}
              icon="✅"
              color="success"
              trend={12}
            />
          </div>
          <div class="col-span-1">
            <StatsCard
              title="平均配送时间"
              value={$stats.avgDeliveryTime + 's'}
              icon="⏱️"
              color="purple"
              trend={-8}
            />
          </div>
        </div>

        <div class="grid grid-cols-12 gap-6">
          <div class="col-span-8 space-y-6">
            <div class="bg-slate-900/80 rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
              <div class="px-6 py-4 border-b border-slate-800 bg-slate-800/30">
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-3">
                    <div class="w-8 h-8 rounded-lg bg-cyan-500/20 flex items-center justify-center">
                      <span class="text-cyan-400">◇</span>
                    </div>
                    <div>
                      <h3 class="text-base font-semibold text-white">洁净室路网实时监控</h3>
                      <p class="text-xs text-slate-500">OHT 位置与路径可视化</p>
                    </div>
                  </div>
                  <div class="flex items-center gap-2">
                    <span class="px-2.5 py-1 rounded-md bg-emerald-500/10 text-emerald-400 text-xs font-medium">
                      实时
                    </span>
                    <span class="px-2.5 py-1 rounded-md bg-slate-800 text-slate-400 text-xs font-medium">
                      28 节点 · 32 路径
                    </span>
                  </div>
                </div>
              </div>
              <NetworkMap />
            </div>

            <div class="grid grid-cols-2 gap-6">
              <div class="bg-slate-900/80 rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
                <div class="px-6 py-4 border-b border-slate-800 bg-slate-800/30">
                  <div class="flex items-center gap-3">
                    <div class="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center">
                      <span class="text-amber-400">📋</span>
                    </div>
                    <div>
                      <h3 class="text-base font-semibold text-white">任务队列</h3>
                      <p class="text-xs text-slate-500">晶圆搬运任务执行状态</p>
                    </div>
                  </div>
                </div>
                <TaskList />
              </div>

              <div class="bg-slate-900/80 rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
                <div class="px-6 py-4 border-b border-slate-800 bg-slate-800/30">
                  <div class="flex items-center justify-between">
                    <div class="flex items-center gap-3">
                      <div class="w-8 h-8 rounded-lg bg-red-500/20 flex items-center justify-center">
                        <span class="text-red-400">🔔</span>
                      </div>
                      <div>
                        <h3 class="text-base font-semibold text-white">系统告警</h3>
                        <p class="text-xs text-slate-500">实时事件通知</p>
                      </div>
                    </div>
                  </div>
                </div>
                <AlertPanel />
              </div>
            </div>
          </div>

          <div class="col-span-4 space-y-6">
            <div class="bg-slate-900/80 rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
              <div class="px-6 py-4 border-b border-slate-800 bg-slate-800/30">
                <div class="flex items-center gap-3">
                  <div class="w-8 h-8 rounded-lg bg-cyan-500/20 flex items-center justify-center">
                    <span class="text-cyan-400">🎛️</span>
                  </div>
                  <div>
                    <h3 class="text-base font-semibold text-white">系统控制</h3>
                    <p class="text-xs text-slate-500">模拟参数与操作控制</p>
                  </div>
                </div>
              </div>
              <div class="p-6">
                <ControlPanel />
              </div>
            </div>

            <div class="bg-slate-900/80 rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
              <div class="px-6 py-4 border-b border-slate-800 bg-slate-800/30">
                <div class="flex items-center gap-3">
                  <div class="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                    <span class="text-emerald-400">🔄</span>
                  </div>
                  <div>
                    <h3 class="text-base font-semibold text-white">数据同步状态</h3>
                    <p class="text-xs text-slate-500">多终端语义同步</p>
                  </div>
                </div>
              </div>
              <div class="p-6">
                <SyncStatus />
              </div>
            </div>

            <div class="bg-slate-900/80 rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
              <div class="px-6 py-4 border-b border-slate-800 bg-slate-800/30">
                <div class="flex items-center gap-3">
                  <div class="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center">
                    <span class="text-purple-400">🤖</span>
                  </div>
                  <div>
                    <h3 class="text-base font-semibold text-white">OHT 机器人列表</h3>
                    <p class="text-xs text-slate-500">智能体状态监控</p>
                  </div>
                </div>
              </div>
              <OHTList />
            </div>
          </div>
        </div>
      </div>
    {:else}
      <div class="space-y-6">
        <div class="grid grid-cols-4 gap-5">
          <div class="col-span-1">
            <StatsCard
              title="在线设备"
              value="3/4"
              icon="⚙️"
              color="primary"
            />
          </div>
          <div class="col-span-1">
            <StatsCard
              title="等待晶圆"
              value={Array.from($wafers.values()).filter(w => w.status === WaferStatus.WAITING).length}
              icon="💎"
              color="warning"
            />
          </div>
          <div class="col-span-1">
            <StatsCard
              title="区域 OHT"
              value={$stats.activeOHTs}
              icon="🚗"
              color="success"
            />
          </div>
          <div class="col-span-1">
            <StatsCard
              title="洁净度"
              value="Class 1"
              icon="🌬️"
              color="purple"
            />
          </div>
        </div>

        <div class="grid grid-cols-12 gap-6">
          <div class="col-span-8">
            <div class="bg-slate-900/80 rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
              <div class="px-6 py-4 border-b border-slate-800 bg-slate-800/30">
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-3">
                    <div class="w-8 h-8 rounded-lg bg-cyan-500/20 flex items-center justify-center">
                      <span class="text-cyan-400">◇</span>
                    </div>
                    <div>
                      <h3 class="text-base font-semibold text-white">洁净室区域监控</h3>
                      <p class="text-xs text-slate-500">本区域设备与物流状态</p>
                    </div>
                  </div>
                  <span class="px-2.5 py-1 rounded-md bg-emerald-500/10 text-emerald-400 text-xs font-medium">
                    正常运行
                  </span>
                </div>
              </div>
              <NetworkMap />
            </div>
          </div>

          <div class="col-span-4 space-y-6">
            <div class="bg-slate-900/80 rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
              <div class="px-6 py-4 border-b border-slate-800 bg-slate-800/30">
                <div class="flex items-center gap-3">
                  <div class="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
                    <span class="text-blue-400">🏭</span>
                  </div>
                  <div>
                    <h3 class="text-base font-semibold text-white">洁净室终端</h3>
                    <p class="text-xs text-slate-500">本区域操作面板</p>
                  </div>
                </div>
              </div>
              <div class="p-6">
                <CleanRoomTerminal />
              </div>
            </div>

            <div class="bg-slate-900/80 rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
              <div class="px-6 py-4 border-b border-slate-800 bg-slate-800/30">
                <div class="flex items-center gap-3">
                  <div class="w-8 h-8 rounded-lg bg-cyan-500/20 flex items-center justify-center">
                    <span class="text-cyan-400">🎛️</span>
                  </div>
                  <div>
                    <h3 class="text-base font-semibold text-white">快捷控制</h3>
                    <p class="text-xs text-slate-500">常用操作</p>
                  </div>
                </div>
              </div>
              <div class="p-6">
                <ControlPanel />
              </div>
            </div>
          </div>
        </div>
      </div>
    {/if}
  </main>

  <footer class="border-t border-slate-800 mt-12 py-6 bg-slate-900/50">
    <div class="max-w-[1600px] mx-auto px-6">
      <div class="flex items-center justify-between">
        <p class="text-sm text-slate-500">
          FabLogic AMHS v1.0.0 · 基于 Svelte 5 构建的半导体晶圆厂物流调度系统
        </p>
        <div class="flex items-center gap-4 text-sm text-slate-500">
          <span>系统状态: <span class="text-emerald-400">正常</span></span>
          <span>|</span>
          <span>在线用户: 3</span>
        </div>
      </div>
    </div>
  </footer>
</div>
