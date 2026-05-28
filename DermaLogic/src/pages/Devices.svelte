<script lang="ts">
  import { onMount } from 'svelte'
  import { devices, loadUserData, currentUser, showNotification } from '../stores/appStore'
  import { dataSyncService, type SyncStatus } from '../services/dataSync'
  import { Cpu, Wifi, WifiOff, Battery, RefreshCw, Bluetooth, Settings, Trash2 } from 'lucide-svelte'

  let syncStatus: SyncStatus = 'idle'
  let syncProgress = 0

  onMount(async () => {
    await loadUserData($currentUser.id)
    if ($devices.length === 0) {
      const { generateMockDevices } = await import('../utils/mockData')
      await generateMockDevices()
      await loadUserData($currentUser.id)
    }
    
    dataSyncService.on('statusChange', (status) => {
      syncStatus = status as SyncStatus
    })
    
    dataSyncService.on('syncProgress', (progress) => {
      syncProgress = progress as number
    })
  })

  async function connectDevice(deviceId: string) {
    const success = await dataSyncService.connect(deviceId)
    if (success) {
      showNotification('设备连接成功', 'success')
      await loadUserData($currentUser.id)
    } else {
      showNotification('设备连接失败', 'error')
    }
  }

  async function disconnectDevice(deviceId: string) {
    await dataSyncService.disconnect(deviceId)
    showNotification('设备已断开', 'info')
    await loadUserData($currentUser.id)
  }

  async function syncDevice() {
    await dataSyncService.syncData()
    showNotification('数据同步完成', 'success')
  }

  function formatDate(date: Date): string {
    return new Date(date).toLocaleDateString('zh-CN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  function getBatteryColor(level: number): string {
    if (level >= 60) return 'text-green-500'
    if (level >= 30) return 'text-yellow-500'
    return 'text-red-500'
  }
</script>

<div class="p-6 space-y-6">
  <div class="flex items-center justify-between">
    <div>
      <h1 class="text-2xl font-bold text-gray-800">设备管理</h1>
      <p class="text-gray-500 mt-1">管理您的智能硬件设备</p>
    </div>
    <button 
      class="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
    >
      <Bluetooth class="w-5 h-5 text-primary-500" />
      <span class="text-gray-700">添加设备</span>
    </button>
  </div>

  {#if syncStatus === 'syncing'}
    <div class="bg-blue-50 border border-blue-200 rounded-2xl p-4">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-3">
          <RefreshCw class="w-5 h-5 text-blue-500 animate-spin" />
          <span class="text-blue-700 font-medium">正在同步数据...</span>
        </div>
        <span class="text-blue-600 font-medium">{syncProgress}%</span>
      </div>
      <div class="w-full h-2 bg-blue-200 rounded-full mt-3 overflow-hidden">
        <div 
          class="h-full bg-blue-500 transition-all duration-300"
          style="width: {syncProgress}%"
        ></div>
      </div>
    </div>
  {/if}

  <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
    {#each $devices as device}
      <div class="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <div class="flex items-start justify-between mb-4">
          <div class="flex items-center gap-4">
            <div class="w-14 h-14 rounded-xl bg-gradient-to-br from-primary-100 to-primary-200 flex items-center justify-center">
              <Cpu class="w-7 h-7 text-primary-600" />
            </div>
            <div>
              <h3 class="font-semibold text-gray-800">{device.name}</h3>
              <p class="text-sm text-gray-500 capitalize">{device.type}</p>
            </div>
          </div>
          <button class="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <Settings class="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <div class="space-y-3 mb-5">
          <div class="flex items-center justify-between text-sm">
            <span class="text-gray-500">连接状态</span>
            <div class="flex items-center gap-1.5">
              {#if device.status === 'connected'}
                <Wifi class="w-4 h-4 text-green-500" />
                <span class="text-green-600 font-medium">已连接</span>
              {:else}
                <WifiOff class="w-4 h-4 text-gray-400" />
                <span class="text-gray-500">未连接</span>
              {/if}
            </div>
          </div>
          
          <div class="flex items-center justify-between text-sm">
            <span class="text-gray-500">电量</span>
            <div class="flex items-center gap-1.5">
              <Battery class="w-4 h-4 {getBatteryColor(device.battery)}" />
              <span class="font-medium text-gray-700">{device.battery}%</span>
            </div>
          </div>
          
          <div class="flex items-center justify-between text-sm">
            <span class="text-gray-500">上次同步</span>
            <span class="text-gray-700">{formatDate(device.lastSync)}</span>
          </div>
        </div>

        <div class="flex gap-3">
          {#if device.status === 'connected'}
            <button 
              onclick={syncDevice}
              disabled={syncStatus === 'syncing'}
              class="flex-1 flex items-center justify-center gap-2 py-2.5 bg-primary-500 text-white rounded-xl hover:bg-primary-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw class="w-4 h-4 {syncStatus === 'syncing' ? 'animate-spin' : ''}" />
              <span>同步数据</span>
            </button>
            <button 
              onclick={() => disconnectDevice(device.id)}
              class="px-4 py-2.5 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
            >
              <WifiOff class="w-4 h-4 text-gray-500" />
            </button>
          {:else}
            <button 
              onclick={() => connectDevice(device.id)}
              disabled={syncStatus === 'connecting'}
              class="flex-1 flex items-center justify-center gap-2 py-2.5 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-xl hover:shadow-lg hover:shadow-primary-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {#if syncStatus === 'connecting'}
                <RefreshCw class="w-4 h-4 animate-spin" />
                <span>连接中...</span>
              {:else}
                <Bluetooth class="w-4 h-4" />
                <span>连接设备</span>
              {/if}
            </button>
            <button class="px-4 py-2.5 border border-red-200 rounded-xl hover:bg-red-50 transition-colors">
              <Trash2 class="w-4 h-4 text-red-500" />
            </button>
          {/if}
        </div>
      </div>
    {/each}

    <div class="bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl p-6 flex flex-col items-center justify-center min-h-48 hover:border-primary-400 hover:bg-primary-50 transition-all cursor-pointer">
      <div class="w-12 h-12 rounded-xl bg-white flex items-center justify-center mb-3 shadow-sm">
        <Bluetooth class="w-6 h-6 text-primary-500" />
      </div>
      <p class="font-medium text-gray-700">添加新设备</p>
      <p class="text-sm text-gray-500 mt-1">点击搜索附近的智能设备</p>
    </div>
  </div>

  <div class="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
    <h3 class="font-semibold text-gray-800 mb-4">设备数据同步</h3>
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div class="p-4 bg-gray-50 rounded-xl text-center">
        <p class="text-2xl font-bold text-gray-800">247</p>
        <p class="text-sm text-gray-500 mt-1">已同步数据点</p>
      </div>
      <div class="p-4 bg-green-50 rounded-xl text-center">
        <p class="text-2xl font-bold text-green-600">98.5%</p>
        <p class="text-sm text-gray-500 mt-1">数据完整度</p>
      </div>
      <div class="p-4 bg-blue-50 rounded-xl text-center">
        <p class="text-2xl font-bold text-blue-600">实时</p>
        <p class="text-sm text-gray-500 mt-1">同步频率</p>
      </div>
    </div>
  </div>
</div>
