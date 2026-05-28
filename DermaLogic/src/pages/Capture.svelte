<script lang="ts">
  import { Upload, Camera, Cpu, CheckCircle, AlertCircle, Loader2 } from 'lucide-svelte'
  import { featureExtractor } from '../services/featureExtractor'
  import { addSkinScan, currentUser, showNotification, navigateTo } from '../stores/appStore'
  import type { SkinFeatures, SkinScan } from '../types'

  let isDragging = false
  let isProcessing = false
  let progress = 0
  let extractedFeatures: SkinFeatures | null = null
  let previewImage: string | null = null

  let fileInput: HTMLInputElement | null = null

  function handleDragOver(e: DragEvent) {
    e.preventDefault()
    isDragging = true
  }

  function handleDragLeave() {
    isDragging = false
  }

  async function handleDrop(e: DragEvent) {
    e.preventDefault()
    isDragging = false
    
    const files = e.dataTransfer?.files
    if (files && files.length > 0) {
      await processFile(files[0])
    }
  }

  async function handleFileSelect(e: Event) {
    const target = e.target as HTMLInputElement
    const files = target.files
    if (files && files.length > 0) {
      await processFile(files[0])
    }
  }

  async function processFile(file: File) {
    if (!file.type.startsWith('image/')) {
      showNotification('请上传图片文件', 'error')
      return
    }

    isProcessing = true
    progress = 0
    extractedFeatures = null

    try {
      const reader = new FileReader()
      reader.onload = async (e) => {
        const img = new Image()
        img.onload = async () => {
          previewImage = e.target?.result as string
          
          const canvas = document.createElement('canvas')
          canvas.width = 512
          canvas.height = 512
          const ctx = canvas.getContext('2d')!
          ctx.drawImage(img, 0, 0, 512, 512)
          
          const imageData = ctx.getImageData(0, 0, 512, 512)
          
          for (let i = 0; i <= 100; i += 10) {
            progress = i
            await new Promise(resolve => setTimeout(resolve, 100))
          }
          
          extractedFeatures = await featureExtractor.extractFeatures(imageData)
          const overallScore = featureExtractor.calculateOverallScore(extractedFeatures)
          
          progress = 100
          showNotification('特征提取完成', 'success')
        }
        img.src = e.target?.result as string
      }
      reader.readAsDataURL(file)
    } catch (error) {
      showNotification('处理失败，请重试', 'error')
      isProcessing = false
    }
  }

  async function saveScan() {
    if (!extractedFeatures) return

    const scan: SkinScan = {
      id: `scan-${Date.now()}`,
      userId: $currentUser.id,
      deviceId: 'device-001',
      timestamp: new Date(),
      overallScore: featureExtractor.calculateOverallScore(extractedFeatures),
      features: extractedFeatures,
      imageIds: []
    }

    await addSkinScan(scan)
    navigateTo('dashboard')
  }

  function triggerCamera() {
    showNotification('相机功能开发中', 'info')
  }

  const featureLabels: Record<string, string> = {
    moisture: '含水量',
    oiliness: '油脂分泌',
    elasticity: '肌肤弹性',
    roughness: '粗糙度',
    poreSize: '毛孔大小',
    wrinkles: '细纹程度'
  }
</script>

<div class="p-6 space-y-6">
  <div>
    <h1 class="text-2xl font-bold text-gray-800">数据采集</h1>
    <p class="text-gray-500 mt-1">上传肤质影像或连接硬件设备进行检测</p>
  </div>

  <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
    <div class="space-y-6">
      <div 
        ondragover={handleDragOver}
        ondragleave={handleDragLeave}
        ondrop={handleDrop}
        class="relative border-2 border-dashed rounded-2xl p-8 text-center transition-all duration-300 {
          isDragging 
            ? 'border-primary-500 bg-primary-50' 
            : 'border-gray-300 hover:border-primary-400 hover:bg-gray-50'
        }"
      >
        <input 
          bind:this={fileInput}
          type="file" 
          accept="image/*"
          onchange={handleFileSelect}
          class="hidden"
        />
        
        {#if previewImage}
          <div class="relative">
            <img src={previewImage} alt="预览" class="max-h-64 mx-auto rounded-xl shadow-lg" />
            <button 
              onclick={() => {
                previewImage = null
                extractedFeatures = null
                progress = 0
              }}
              class="absolute top-2 right-2 p-2 bg-white/90 rounded-full shadow hover:bg-white transition-colors"
            >
              <span class="text-gray-600">✕</span>
            </button>
          </div>
        {:else}
          <div class="space-y-4">
            <div class="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-primary-100 to-primary-200 flex items-center justify-center">
              <Upload class="w-8 h-8 text-primary-600" />
            </div>
            <div>
              <p class="text-gray-700 font-medium">拖拽图片到此处</p>
              <p class="text-gray-500 text-sm mt-1">或点击选择文件</p>
            </div>
          </div>
        {/if}
        
        {#if isProcessing}
          <div class="mt-4">
            <div class="flex items-center justify-center gap-2 mb-2">
              <Loader2 class="w-5 h-5 text-primary-500 animate-spin" />
              <span class="text-sm text-gray-600">特征提取中...</span>
            </div>
            <div class="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
              <div 
                class="h-full bg-gradient-to-r from-primary-400 to-primary-500 transition-all duration-300"
                style="width: {progress}%"
              ></div>
            </div>
            <p class="text-xs text-gray-500 mt-1">{progress}%</p>
          </div>
        {/if}
      </div>

      <div class="grid grid-cols-2 gap-4">
        <button 
          onclick={() => fileInput?.click()}
          disabled={isProcessing}
          class="flex items-center justify-center gap-2 px-4 py-3 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Upload class="w-5 h-5 text-gray-600" />
          <span class="text-gray-700">选择图片</span>
        </button>
        
        <button 
          onclick={triggerCamera}
          disabled={isProcessing}
          class="flex items-center justify-center gap-2 px-4 py-3 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Camera class="w-5 h-5 text-gray-600" />
          <span class="text-gray-700">拍摄照片</span>
        </button>
      </div>

      <div class="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <h3 class="font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <Cpu class="w-5 h-5 text-primary-500" />
          硬件设备连接
        </h3>
        <div class="space-y-3">
          <div class="flex items-center justify-between p-3 bg-green-50 rounded-xl border border-green-100">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                <CheckCircle class="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p class="font-medium text-gray-800">DermaScan Pro</p>
                <p class="text-xs text-gray-500">已连接 • 电量 85%</p>
              </div>
            </div>
            <span class="text-xs text-green-600 font-medium">在线</span>
          </div>
        </div>
      </div>
    </div>

    <div class="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
      <h3 class="font-semibold text-gray-800 mb-4">检测结果</h3>
      
      {#if extractedFeatures}
        <div class="space-y-6">
          <div class="text-center">
            <div class="inline-flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-br from-primary-500 to-secondary-500">
              <span class="text-3xl font-bold text-white">
                {featureExtractor.calculateOverallScore(extractedFeatures)}
              </span>
            </div>
            <p class="mt-2 text-sm text-gray-600">综合评分</p>
          </div>

          <div class="space-y-3">
            {#each Object.entries(extractedFeatures).filter(([k]) => k !== 'activeIngredients') as [key, value]}
              <div class="flex items-center justify-between">
                <span class="text-sm text-gray-600">{featureLabels[key] || key}</span>
                <div class="flex items-center gap-2">
                  <div class="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
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

          <button 
            onclick={saveScan}
            class="w-full py-3 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-xl hover:shadow-lg hover:shadow-primary-500/25 transition-all duration-300 font-medium"
          >
            保存检测结果
          </button>
        </div>
      {:else}
        <div class="text-center py-16">
          <div class="w-16 h-16 mx-auto rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
            <AlertCircle class="w-8 h-8 text-gray-400" />
          </div>
          <p class="text-gray-500">上传图片后查看检测结果</p>
        </div>
      {/if}
    </div>
  </div>
</div>
