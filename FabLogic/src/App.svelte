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

<div class="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
  <header class="border-b border-slate-800 bg-slate-900/80 backdrop-blur-xl sticky top-0 z-50">
    <div class="max-w-7xl mx-auto px-6 py-4">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-4">
          <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg">
            F
          </div>
          <div>
            <h1 class="text-xl font-bold text-white">FabLogic AMHS</h1>
            <p class="text-xs text-slate-400">半导体晶圆厂自动物料搬运系统</p>
          </div>
        </div>

        <div class="flex items-center gap-6">
          <nav class="flex items-center gap-1 bg-slate-800/50 rounded-lg p-1">
            <button
              onclick={() => activeView = 'dispatch'}
              class="px-4 py-2 rounded-md text-sm font-medium transition-colors {activeView === 'dispatch' ? 'bg-cyan-500 text-white' : 'text-slate-400 hover:text-white'}"
            >
              调度中心
            </button>
            <button
              onclick={() => activeView = 'cleanroom'}
              class="px-4 py-2 rounded-md text-sm font-medium transition-colors {activeView === 'cleanroom' ? 'bg-cyan-500 text-white' : 'text-slate-400 hover:text-white'}"
            >
              洁净室终端
            </button>
          </nav>

          <div class="flex items-center gap-3">
            <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span class="text-sm text-slate-400">
              {#if $isSimulating}
                <span class="text-cyan-400">● 运行中</span>
              {:else}
                <span class="text-slate-500">○ 待机</span>
              {/if}
            </span>
          </div>
        </div>
      </div>
    </div>
  </header>

  <main class="max-w-7xl mx-auto px-6 py-6">
    {#if !$isInitialized}
      <div class="flex items-center justify-center h-96">
        <div class="text-center">
          <div class="w-16 h-16 border-4 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin mx-auto mb-4"></div>
          <p class="text-slate-400">正在初始化 AMHS 系统...</p>
        </div>
      </div>
    {:else if activeView === 'dispatch'}
      <div class="space-y-6">
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatsCard
            title="OHT 运行中"
            value={$stats.activeOHTs + '/' + $stats.totalOHTs}
            icon="🚗"
            color="primary"
          />
          <StatsCard
            title="待处理任务"
            value={$stats.pendingTasks}
            icon="📋"
            color="warning"
          />
          <StatsCard
            title="已完成任务"
            value={$stats.completedTasks}
            icon="✅"
            color="success"
          />
          <StatsCard
            title="平均配送时间"
            value={$stats.avgDeliveryTime + 's'}
            icon="⏱️"
            color="purple"
          />
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div class="lg:col-span-2 space-y-6">
            <NetworkMap />
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <TaskList />
              <AlertPanel />
            </div>
          </div>

          <div class="space-y-6">
            <ControlPanel />
            <SyncStatus />
            <OHTList />
          </div>
        </div>
      </div>
    {:else}
      <div class="space-y-6">
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatsCard
            title="在线设备"
            value="3/4"
            icon="⚙️"
            color="primary"
          />
          <StatsCard
            title="等待晶圆"
            value={Array.from($wafers.values()).filter(w => w.status === WaferStatus.WAITING).length}
            icon="💎"
            color="warning"
          />
          <StatsCard
            title="区域 OHT"
            value={$stats.activeOHTs}
            icon="🚗"
            color="success"
          />
          <StatsCard
            title="洁净度"
            value="Class 1"
            icon="🌬️"
            color="purple"
          />
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div class="lg:col-span-2">
            <NetworkMap />
          </div>
          <div class="space-y-6">
            <CleanRoomTerminal />
            <ControlPanel />
          </div>
        </div>
      </div>
    {/if}
  </main>

  <footer class="border-t border-slate-800 mt-12 py-6">
    <div class="max-w-7xl mx-auto px-6 text-center text-sm text-slate-500">
      <p>FabLogic AMHS v1.0.0 | 基于 Svelte 5 构建的半导体晶圆厂物流调度系统</p>
    </div>
  </footer>
</div>
