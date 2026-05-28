<script lang="ts">
  import { onMount, onDestroy } from 'svelte'
  import { skinScans, selectedScan, loadUserData, currentUser } from '../stores/appStore'
  import { skinRenderer } from '../services/skinRenderer'
  import { Calendar, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, RotateCcw } from 'lucide-svelte'

  let container: HTMLElement
  let currentIndex = 0

  onMount(async () => {
    await loadUserData($currentUser.id)
    if ($skinScans.length > 0) {
      $selectedScan = $skinScans[0]
    }
  })

  function initRenderer() {
    if (container) {
      skinRenderer.init(container)
      if ($selectedScan) {
        skinRenderer.setHighlight($selectedScan.features)
      }
    }
  }

  function selectScan(index: number) {
    currentIndex = index
    $selectedScan = $skinScans[index]
    if ($selectedScan) {
      skinRenderer.setHighlight($selectedScan.features)
    }
  }

  function prevScan() {
    if (currentIndex > 0) {
      selectScan(currentIndex - 1)
    }
  }

  function nextScan() {
    if (currentIndex < $skinScans.length - 1) {
      selectScan(currentIndex + 1)
    }
  }

  function resetView() {
    skinRenderer.dispose()
    initRenderer()
  }

  onDestroy(() => {
    skinRenderer.dispose()
  })

  function formatDate(date: Date): string {
    return new Date(date).toLocaleDateString('zh-CN', {
      month: 'short',
      day: 'numeric'
    })
  }
</script>

<div class="h-full flex flex-col">
  <div class="p-6 border-b border-gray-200/50 bg-white/50 backdrop-blur-sm">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold text-gray-800">3D 肤质视图</h1>
        <p class="text-gray-500 mt-1">交互式查看肤质纹理细节</p>
      </div>
      <div class="flex items-center gap-2">
        <button 
          onclick={() => skinRenderer.zoomIn()}
          class="p-2.5 bg-white rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors"
          title="放大"
        >
          <ZoomIn class="w-5 h-5 text-gray-600" />
        </button>
        <button 
          onclick={() => skinRenderer.zoomOut()}
          class="p-2.5 bg-white rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors"
          title="缩小"
        >
          <ZoomOut class="w-5 h-5 text-gray-600" />
        </button>
        <button 
          onclick={resetView}
          class="p-2.5 bg-white rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors"
          title="重置视图"
        >
          <RotateCcw class="w-5 h-5 text-gray-600" />
        </button>
      </div>
    </div>
  </div>

  <div class="flex-1 flex">
    <div class="flex-1 relative">
      <div 
        bind:this={container}
        class="w-full h-full"
      ></div>
      
      {#if $skinScans.length > 0}
        <div class="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-white/90 backdrop-blur-sm rounded-2xl px-4 py-3 shadow-lg">
          <button 
            onclick={prevScan}
            disabled={currentIndex === 0}
            class="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft class="w-5 h-5 text-gray-600" />
          </button>
          
          <div class="flex items-center gap-2">
            <Calendar class="w-4 h-4 text-primary-500" />
            <span class="text-sm font-medium text-gray-700">
              {formatDate($skinScans[currentIndex]?.timestamp)}
            </span>
            <span class="text-xs text-gray-400">
              ({currentIndex + 1}/{$skinScans.length})
            </span>
          </div>
          
          <button 
            onclick={nextScan}
            disabled={currentIndex === $skinScans.length - 1}
            class="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronRight class="w-5 h-5 text-gray-600" />
          </button>
        </div>
      {/if}

      <div class="absolute top-6 left-6 bg-white/90 backdrop-blur-sm rounded-xl p-4 shadow-lg">
        <p class="text-xs text-gray-500 mb-2">操作提示</p>
        <ul class="text-xs text-gray-600 space-y-1">
          <li>• 拖拽旋转视图</li>
          <li>• 滚轮缩放</li>
          <li>• 点击底部切换时间点</li>
        </ul>
      </div>
    </div>

    <div class="w-80 bg-white/80 backdrop-blur-sm border-l border-gray-200/50 p-6 overflow-y-auto">
      <h3 class="text-lg font-semibold text-gray-800 mb-4">检测详情</h3>
      
      {#if $selectedScan}
        <div class="space-y-6">
          <div class="text-center">
            <div class="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-primary-500 to-secondary-500">
              <span class="text-2xl font-bold text-white">{$selectedScan.overallScore}</span>
            </div>
            <p class="mt-2 text-sm text-gray-600">综合评分</p>
          </div>

          <div class="space-y-3">
            <h4 class="text-sm font-medium text-gray-700">肤质指标</h4>
            {#each Object.entries($selectedScan.features).filter(([key]) => key !== 'activeIngredients') as [key, value]}
              <div class="flex items-center justify-between">
                <span class="text-sm text-gray-600">
                  {key === 'moisture' ? '含水量' : 
                   key === 'oiliness' ? '油脂' : 
                   key === 'elasticity' ? '弹性' : 
                   key === 'roughness' ? '粗糙度' : 
                   key === 'poreSize' ? '毛孔' : '细纹'}
                </span>
                <div class="flex items-center gap-2">
                  <div class="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      class="h-full bg-gradient-to-r from-primary-400 to-primary-500 rounded-full"
                      style="width: {value}%"
                    ></div>
                  </div>
                  <span class="text-sm font-medium text-gray-800 w-10 text-right">{Math.round(value as number)}%</span>
                </div>
              </div>
            {/each}
          </div>

          <div class="space-y-3">
            <h4 class="text-sm font-medium text-gray-700">活性成分分布</h4>
            {#each Object.entries($selectedScan.features.activeIngredients) as [key, data]}
              <div class="p-3 bg-gray-50 rounded-xl">
                <div class="flex items-center justify-between mb-2">
                  <span class="text-sm text-gray-700">
                    {key === 'hyaluronic_acid' ? '透明质酸' :
                     key === 'niacinamide' ? '烟酰胺' :
                     key === 'vitamin_c' ? '维生素C' :
                     key === 'retinol' ? '视黄醇' : '肽类'}
                  </span>
                  <span class="text-xs text-primary-600 font-medium">
                    {Math.round((data as { concentration: number }).concentration)}%
                  </span>
                </div>
                <div class="grid grid-cols-10 gap-0.5">
                  {#each (data as { distribution: number[][] }).distribution.flat() as v}
                    <div 
                      class="aspect-square rounded-sm"
                      style="background-color: rgba(14, 165, 233, {v})"
                    ></div>
                  {/each}
                </div>
              </div>
            {/each}
          </div>
        </div>
      {:else}
        <div class="text-center py-12">
          <p class="text-gray-400">暂无检测数据</p>
        </div>
      {/if}
    </div>
  </div>
</div>

{#await new Promise(resolve => setTimeout(resolve, 100)) then}
  {initRenderer()}
{/await}
