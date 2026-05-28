<script lang="ts">
  import { onMount } from 'svelte'
  import { skinScans, loadUserData, currentUser, trendReport } from '../stores/appStore'
  import { featureExtractor } from '../services/featureExtractor'
  import { TrendingUp, Calendar, BarChart3, Lightbulb } from 'lucide-svelte'

  onMount(async () => {
    await loadUserData($currentUser.id)
    if ($skinScans.length > 0) {
      $trendReport = await featureExtractor.analyzeTrends($skinScans)
    }
  })

  function formatDate(date: Date): string {
    return new Date(date).toLocaleDateString('zh-CN', {
      month: 'short',
      day: 'numeric'
    })
  }

  const featureLabels: Record<string, string> = {
    moisture: '含水量',
    oiliness: '油脂分泌',
    elasticity: '肌肤弹性',
    roughness: '粗糙度',
    poreSize: '毛孔大小',
    wrinkles: '细纹程度'
  }

  $: sortedScans = [...$skinScans].sort((a, b) => 
    new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  )
</script>

<div class="p-6 space-y-6">
  <div>
    <h1 class="text-2xl font-bold text-gray-800">肤况分析</h1>
    <p class="text-gray-500 mt-1">深入分析您的肤质演变趋势</p>
  </div>

  <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
    <div class="lg:col-span-2 bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
      <h3 class="font-semibold text-gray-800 mb-4 flex items-center gap-2">
        <TrendingUp class="w-5 h-5 text-primary-500" />
        肤质评分趋势
      </h3>
      
      {#if sortedScans.length > 0}
        <div class="h-64 flex items-end justify-around gap-2">
          {#each sortedScans as scan}
            <div class="flex flex-col items-center gap-2 flex-1">
              <div class="w-full flex justify-center">
                <div 
                  class="w-full max-w-8 bg-gradient-to-t from-primary-500 to-primary-400 rounded-t-lg transition-all duration-500 hover:from-primary-600 hover:to-primary-500"
                  style="height: {scan.overallScore * 2}px"
                ></div>
              </div>
              <span class="text-xs font-medium text-gray-600">{scan.overallScore}</span>
              <span class="text-xs text-gray-400">{formatDate(scan.timestamp)}</span>
            </div>
          {/each}
        </div>
      {:else}
        <div class="h-64 flex items-center justify-center">
          <p class="text-gray-400">暂无检测数据</p>
        </div>
      {/if}
    </div>

    <div class="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
      <h3 class="font-semibold text-gray-800 mb-4 flex items-center gap-2">
        <BarChart3 class="w-5 h-5 text-primary-500" />
        趋势变化
      </h3>
      
      {#if $trendReport}
        <div class="space-y-4">
          <div class="text-center p-4 bg-gradient-to-br from-primary-50 to-secondary-50 rounded-xl">
            <div class={`text-4xl font-bold ${
              $trendReport.overallChange >= 0 ? 'text-green-500' : 'text-red-500'
            }`}>
              {$trendReport.overallChange >= 0 ? '+' : ''}{$trendReport.overallChange.toFixed(1)}%
            </div>
            <p class="text-sm text-gray-600 mt-1">整体变化</p>
          </div>
          
          <div class="space-y-3">
            {#each Object.entries($trendReport.featureTrends) as [key, data]}
              <div class="flex items-center justify-between">
                <span class="text-sm text-gray-600">{featureLabels[key] || key}</span>
                <span class={`text-sm font-medium ${
                  (data as { change: number }).change >= 0 ? 'text-green-500' : 'text-red-500'
                }`}>
                  {(data as { change: number }).change >= 0 ? '+' : ''}{(data as { change: number }).change.toFixed(1)}%
                </span>
              </div>
            {/each}
          </div>
        </div>
      {:else}
        <div class="h-48 flex items-center justify-center">
          <p class="text-gray-400">分析中...</p>
        </div>
      {/if}
    </div>
  </div>

  <div class="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
    <h3 class="font-semibold text-gray-800 mb-4 flex items-center gap-2">
      <Lightbulb class="w-5 h-5 text-yellow-500" />
      AI 洞察
    </h3>
    
    {#if $trendReport}
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {#each $trendReport.insights as insight, i}
          <div class="p-4 bg-gradient-to-br from-yellow-50 to-orange-50 rounded-xl border border-yellow-100">
            <div class="flex items-start gap-3">
              <div class="w-8 h-8 rounded-lg bg-yellow-100 flex items-center justify-center flex-shrink-0">
                <span class="text-yellow-600 font-medium">{i + 1}</span>
              </div>
              <p class="text-sm text-gray-700">{insight}</p>
            </div>
          </div>
        {/each}
      </div>
    {:else}
      <div class="h-24 flex items-center justify-center">
        <p class="text-gray-400">生成洞察中...</p>
      </div>
    {/if}
  </div>

  <div class="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
    <h3 class="font-semibold text-gray-800 mb-4 flex items-center gap-2">
      <Calendar class="w-5 h-5 text-primary-500" />
      检测历史
    </h3>
    
    <div class="overflow-x-auto">
      <table class="w-full">
        <thead>
          <tr class="border-b border-gray-100">
            <th class="text-left py-3 px-4 text-sm font-medium text-gray-500">日期</th>
            <th class="text-left py-3 px-4 text-sm font-medium text-gray-500">综合评分</th>
            <th class="text-left py-3 px-4 text-sm font-medium text-gray-500">含水量</th>
            <th class="text-left py-3 px-4 text-sm font-medium text-gray-500">油脂</th>
            <th class="text-left py-3 px-4 text-sm font-medium text-gray-500">弹性</th>
            <th class="text-left py-3 px-4 text-sm font-medium text-gray-500">状态</th>
          </tr>
        </thead>
        <tbody>
          {#each sortedScans.slice().reverse() as scan}
            <tr class="border-b border-gray-50 hover:bg-gray-50 transition-colors">
              <td class="py-3 px-4 text-sm text-gray-700">{formatDate(scan.timestamp)}</td>
              <td class="py-3 px-4">
                <span class="font-semibold text-gray-800">{scan.overallScore}</span>
              </td>
              <td class="py-3 px-4 text-sm text-gray-600">{Math.round(scan.features.moisture)}%</td>
              <td class="py-3 px-4 text-sm text-gray-600">{Math.round(scan.features.oiliness)}%</td>
              <td class="py-3 px-4 text-sm text-gray-600">{Math.round(scan.features.elasticity)}%</td>
              <td class="py-3 px-4">
                <span class={`px-2 py-1 rounded-full text-xs font-medium ${
                  scan.overallScore >= 80 
                    ? 'bg-green-100 text-green-700' 
                    : scan.overallScore >= 60 
                      ? 'bg-yellow-100 text-yellow-700' 
                      : 'bg-red-100 text-red-700'
                }`}>
                  {scan.overallScore >= 80 ? '优秀' : scan.overallScore >= 60 ? '良好' : '需改善'}
                </span>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  </div>
</div>
