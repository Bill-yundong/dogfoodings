<script lang="ts">
  import { onMount } from 'svelte'
  import { Droplets, Zap, Gauge, Scissors, Grid3X3, Smile, TrendingUp, Calendar, Camera, Play } from 'lucide-svelte'
  import ScoreRing from '../components/ScoreRing.svelte'
  import FeatureCard from '../components/FeatureCard.svelte'
  import { skinScans, latestScan, scanStats, loadUserData, currentUser, navigateTo } from '../stores/appStore'
  import { featureExtractor } from '../services/featureExtractor'

  onMount(async () => {
    await loadUserData($currentUser.id)
    if ($skinScans.length === 0) {
      await generateMockData()
    }
  })

  async function generateMockData() {
    const { addMockScan } = await import('../utils/mockData')
    for (let i = 0; i < 7; i++) {
      await addMockScan(i)
    }
    await loadUserData($currentUser.id)
  }

  const featureLabels = [
    { key: 'moisture', label: '含水量', icon: Droplets },
    { key: 'oiliness', label: '油脂分泌', icon: Zap },
    { key: 'elasticity', label: '肌肤弹性', icon: Gauge },
    { key: 'roughness', label: '粗糙度', icon: Scissors },
    { key: 'poreSize', label: '毛孔大小', icon: Grid3X3 },
    { key: 'wrinkles', label: '细纹程度', icon: Smile }
  ]

  function formatDate(date: Date): string {
    return new Date(date).toLocaleDateString('zh-CN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }
</script>

<div class="p-6 space-y-6">
  <div class="flex items-center justify-between">
    <div>
      <h1 class="text-2xl font-bold text-gray-800">肤质概览</h1>
      <p class="text-gray-500 mt-1">欢迎回来，查看您的肤质状态</p>
    </div>
    <button 
      onclick={() => navigateTo('capture')}
      class="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-xl hover:shadow-lg hover:shadow-primary-500/25 transition-all duration-300"
    >
      <Camera class="w-5 h-5" />
      <span>开始检测</span>
    </button>
  </div>

  <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
    <div class="lg:col-span-1 bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
      <div class="text-center">
        {#if $latestScan}
          <ScoreRing score={$latestScan.overallScore} size={160} strokeWidth={12} />
          <p class="mt-4 text-sm text-gray-500">
            上次检测：{formatDate($latestScan.timestamp)}
          </p>
        {:else}
          <div class="h-40 flex items-center justify-center">
            <p class="text-gray-400">暂无检测数据</p>
          </div>
        {/if}
      </div>
      
      <div class="mt-6 grid grid-cols-3 gap-4 text-center">
        <div class="p-3 bg-gray-50 rounded-xl">
          <p class="text-2xl font-bold text-gray-800">{$scanStats.totalScans}</p>
          <p class="text-xs text-gray-500 mt-1">检测次数</p>
        </div>
        <div class="p-3 bg-gray-50 rounded-xl">
          <p class="text-2xl font-bold text-primary-600">{$scanStats.avgScore}</p>
          <p class="text-xs text-gray-500 mt-1">平均分数</p>
        </div>
        <div class="p-3 bg-gray-50 rounded-xl">
          <div class="flex items-center justify-center gap-1">
            <TrendingUp class="w-4 h-4 {$scanStats.trend >= 0 ? 'text-green-500' : 'text-red-500'}" />
            <span class="text-lg font-bold {$scanStats.trend >= 0 ? 'text-green-500' : 'text-red-500'}">
              {$scanStats.trend >= 0 ? '+' : ''}{$scanStats.trend}
            </span>
          </div>
          <p class="text-xs text-gray-500 mt-1">趋势变化</p>
        </div>
      </div>
    </div>

    <div class="lg:col-span-2 bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
      <h2 class="text-lg font-semibold text-gray-800 mb-4">肤质指标</h2>
      <div class="grid grid-cols-2 md:grid-cols-3 gap-4">
        {#if $latestScan}
          {#each featureLabels as feature}
            <FeatureCard 
              label={feature.label}
              value={$latestScan.features[feature.key as keyof typeof $latestScan.features] as number}
              icon={feature.icon}
            />
          {/each}
        {:else}
          {#each { length: 6 } as _, i}
            <div class="h-28 bg-gray-100 rounded-2xl animate-pulse"></div>
          {/each}
        {/if}
      </div>
    </div>
  </div>

  <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
    <div class="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-lg font-semibold text-gray-800">检测历史</h2>
        <button 
          onclick={() => navigateTo('analysis')}
          class="text-sm text-primary-600 hover:text-primary-700"
        >
          查看全部
        </button>
      </div>
      <div class="space-y-3">
        {#each ($skinScans.slice(0, 5)) as scan}
          <div class="flex items-center justify-between p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors cursor-pointer">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-lg bg-gradient-to-br from-primary-100 to-primary-200 flex items-center justify-center">
                <Calendar class="w-5 h-5 text-primary-600" />
              </div>
              <div>
                <p class="font-medium text-gray-800">{formatDate(scan.timestamp)}</p>
                <p class="text-xs text-gray-500">肤质评分 {scan.overallScore} 分</p>
              </div>
            </div>
            <div class="flex items-center gap-1">
              <span class={`text-sm font-medium ${
                scan.overallScore >= 80 ? 'text-green-500' : scan.overallScore >= 60 ? 'text-yellow-500' : 'text-red-500'
              }`}>
                {scan.overallScore >= 80 ? '优秀' : scan.overallScore >= 60 ? '良好' : '需改善'}
              </span>
            </div>
          </div>
        {/each}
      </div>
    </div>

    <div class="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
      <h2 class="text-lg font-semibold text-gray-800 mb-4">快捷操作</h2>
      <div class="grid grid-cols-2 gap-4">
        <button 
          onclick={() => navigateTo('capture')}
          class="flex flex-col items-center justify-center p-6 bg-gradient-to-br from-primary-50 to-primary-100 rounded-2xl hover:shadow-md transition-all group"
        >
          <div class="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
            <Camera class="w-7 h-7 text-white" />
          </div>
          <p class="font-medium text-gray-800">开始检测</p>
          <p class="text-xs text-gray-500 mt-1">采集肤质影像</p>
        </button>
        
        <button 
          onclick={() => navigateTo('skin-3d')}
          class="flex flex-col items-center justify-center p-6 bg-gradient-to-br from-secondary-50 to-secondary-100 rounded-2xl hover:shadow-md transition-all group"
        >
          <div class="w-14 h-14 rounded-2xl bg-gradient-to-br from-secondary-500 to-secondary-600 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
            <Play class="w-7 h-7 text-white" />
          </div>
          <p class="font-medium text-gray-800">3D 视图</p>
          <p class="text-xs text-gray-500 mt-1">查看肤质模型</p>
        </button>
        
        <button 
          onclick={() => navigateTo('analysis')}
          class="flex flex-col items-center justify-center p-6 bg-gradient-to-br from-purple-50 to-purple-100 rounded-2xl hover:shadow-md transition-all group"
        >
          <div class="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
            <TrendingUp class="w-7 h-7 text-white" />
          </div>
          <p class="font-medium text-gray-800">趋势分析</p>
          <p class="text-xs text-gray-500 mt-1">查看肤况演变</p>
        </button>
        
        <button 
          onclick={() => navigateTo('care')}
          class="flex flex-col items-center justify-center p-6 bg-gradient-to-br from-pink-50 to-pink-100 rounded-2xl hover:shadow-md transition-all group"
        >
          <div class="w-14 h-14 rounded-2xl bg-gradient-to-br from-pink-500 to-pink-600 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
            <Play class="w-7 h-7 text-white" />
          </div>
          <p class="font-medium text-gray-800">护理方案</p>
          <p class="text-xs text-gray-500 mt-1">个性化推荐</p>
        </button>
      </div>
    </div>
  </div>
</div>
