<script lang="ts">
  import { onMount } from 'svelte'
  import { skinScans, latestScan, loadUserData, currentUser } from '../stores/appStore'
  import { careRecommender } from '../services/careRecommender'
  import type { CarePlan } from '../types'
  import { Heart, Sparkles, Clock, CheckCircle2, Droplets, Sun, Zap, Wind, Download } from 'lucide-svelte'

  let carePlan: CarePlan | null = null
  let isGeneratingReport = false

  onMount(async () => {
    await loadUserData($currentUser.id)
    if ($latestScan) {
      carePlan = careRecommender.generateCarePlan($latestScan.features, $currentUser.id)
    }
  })

  function generateReport() {
    if (!carePlan || !$latestScan || isGeneratingReport) return
    
    isGeneratingReport = true
    
    setTimeout(() => {
      const report = careRecommender.generateDetailedReport(carePlan!, $latestScan!.features)
      
      const blob = new Blob([report], { type: 'text/plain;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `DermaLogic护理方案报告_${new Date().toLocaleDateString('zh-CN')}.txt`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      
      isGeneratingReport = false
    }, 500)
  }

  const typeLabels: Record<string, { label: string; icon: unknown }> = {
    cleanser: { label: '洁面', icon: Droplets },
    toner: { label: '爽肤水', icon: Wind },
    serum: { label: '精华', icon: Sparkles },
    moisturizer: { label: '保湿', icon: Heart },
    sunscreen: { label: '防晒', icon: Sun }
  }
</script>

<div class="p-6 space-y-6">
  <div>
    <h1 class="text-2xl font-bold text-gray-800">护理方案</h1>
    <p class="text-gray-500 mt-1">基于您的肤质量身定制的护理建议</p>
  </div>

  {#if carePlan}
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div class="lg:col-span-2 space-y-6">
        <div class="bg-gradient-to-br from-primary-500 to-secondary-500 rounded-2xl p-6 text-white">
          <div class="flex items-center gap-3 mb-4">
            <div class="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
              <Sparkles class="w-6 h-6" />
            </div>
            <div>
              <h3 class="text-lg font-semibold">个性化护理方案</h3>
              <p class="text-white/80 text-sm">有效期 30 天</p>
            </div>
          </div>
          <p class="text-white/90">
            根据您最近的肤质检测结果，我们为您定制了以下护理方案。请坚持使用，定期检测以追踪效果。
          </p>
        </div>

        <div class="space-y-4">
          {#each carePlan.recommendations as rec}
            <div class="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
              <div class="flex items-start gap-4">
                <div class="w-14 h-14 rounded-xl bg-gradient-to-br from-primary-100 to-primary-200 flex items-center justify-center flex-shrink-0">
                  <svelte:component 
                    this={typeLabels[rec.type]?.icon || Zap} 
                    class="w-7 h-7 text-primary-600" 
                  />
                </div>
                
                <div class="flex-1">
                  <div class="flex items-start justify-between">
                    <div>
                      <span class="text-xs font-medium text-primary-600 bg-primary-50 px-2 py-0.5 rounded">
                        {typeLabels[rec.type]?.label || rec.type}
                      </span>
                      <h4 class="font-semibold text-gray-800 mt-1">{rec.product}</h4>
                    </div>
                    <div class="flex items-center gap-1">
                      <CheckCircle2 class="w-4 h-4 text-green-500" />
                      <span class="text-sm font-medium text-green-600">{rec.matchScore}% 匹配</span>
                    </div>
                  </div>
                  
                  <div class="flex items-center gap-1 mt-2 text-sm text-gray-500">
                    <Clock class="w-4 h-4" />
                    <span>{rec.frequency}</span>
                  </div>
                  
                  <div class="flex flex-wrap gap-1.5 mt-3">
                    {#each rec.ingredients as ingredient}
                      <span class="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                        {ingredient}
                      </span>
                    {/each}
                  </div>
                </div>
              </div>
            </div>
          {/each}
        </div>
      </div>

      <div class="space-y-6">
        <div class="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h3 class="font-semibold text-gray-800 mb-4">今日护理进度</h3>
          <div class="space-y-3">
            {#each ['早上', '晚上'] as time, i}
              <div class="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                <span class="text-sm text-gray-600">{time}护理</span>
                <div class="flex items-center gap-2">
                  <div class="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      class="h-full bg-gradient-to-r from-primary-400 to-primary-500 rounded-full"
                      style="width: {i === 0 ? '60%' : '0%'}"
                    ></div>
                  </div>
                  <span class="text-xs text-gray-500">{i === 0 ? '3/5' : '0/5'}</span>
                </div>
              </div>
            {/each}
          </div>
        </div>

        <div class="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h3 class="font-semibold text-gray-800 mb-4">成分科普</h3>
          <div class="space-y-3">
            <div class="p-3 bg-blue-50 rounded-xl">
              <h4 class="text-sm font-medium text-blue-700">透明质酸</h4>
              <p class="text-xs text-blue-600 mt-1">深层补水，提升肌肤含水量</p>
            </div>
            <div class="p-3 bg-green-50 rounded-xl">
              <h4 class="text-sm font-medium text-green-700">烟酰胺</h4>
              <p class="text-xs text-green-600 mt-1">调节油脂，改善毛孔粗大</p>
            </div>
            <div class="p-3 bg-purple-50 rounded-xl">
              <h4 class="text-sm font-medium text-purple-700">视黄醇</h4>
              <p class="text-xs text-purple-600 mt-1">促进角质代谢，减少细纹</p>
            </div>
          </div>
        </div>

        <button 
          onclick={generateReport}
          disabled={isGeneratingReport}
          class="w-full py-3 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-xl hover:shadow-lg hover:shadow-primary-500/25 transition-all duration-300 font-medium disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {#if isGeneratingReport}
            <span class="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
            <span>生成中...</span>
          {:else}
            <Download class="w-5 h-5" />
            <span>生成详细方案报告</span>
          {/if}
        </button>
      </div>
    </div>
  {:else}
    <div class="bg-white rounded-2xl p-12 shadow-sm border border-gray-100 text-center">
      <div class="w-16 h-16 mx-auto rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
        <Heart class="w-8 h-8 text-gray-400" />
      </div>
      <h3 class="font-semibold text-gray-800">暂无护理方案</h3>
      <p class="text-gray-500 mt-1">请先完成肤质检测以获取个性化护理建议</p>
    </div>
  {/if}
</div>
