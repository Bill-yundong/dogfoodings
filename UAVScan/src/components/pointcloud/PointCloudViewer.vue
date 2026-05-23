<template>
  <div class="relative w-full h-full bg-cyber-bg overflow-hidden">
    <div ref="containerRef" class="w-full h-full relative">
      <canvas ref="canvasRef" class="w-full h-full"></canvas>
      
      <div class="absolute top-4 left-4 space-y-2">
        <div class="cyber-card py-2 px-3 text-xs">
          <div class="flex items-center gap-2">
            <component :is="icons.MapPin" class="w-3.5 h-3.5 text-electric-blue" />
            <span class="text-cyber-text-secondary">点数量:</span>
            <span class="font-mono text-cyber-text">{{ formatNumber(currentPointCount) }}</span>
          </div>
        </div>
        <div class="cyber-card py-2 px-3 text-xs">
          <div class="flex items-center gap-2">
            <component :is="icons.Move" class="w-3.5 h-3.5 text-electric-blue" />
            <span class="text-cyber-text-secondary">FPS:</span>
            <span class="font-mono text-cyber-text">{{ fps }}</span>
          </div>
        </div>
        <div class="cyber-card py-2 px-3 text-xs">
          <div class="flex items-center gap-2">
            <component :is="icons.ZoomIn" class="w-3.5 h-3.5 text-electric-blue" />
            <span class="text-cyber-text-secondary">距离:</span>
            <span class="font-mono text-cyber-text">{{ cameraDistance.toFixed(1) }}m</span>
          </div>
        </div>
      </div>

      <div class="absolute top-4 right-4 flex flex-col gap-2">
        <button
          @click="resetCamera"
          class="cyber-btn py-2 px-3 flex items-center gap-2"
          title="重置视角"
        >
          <component :is="icons.RotateCcw" class="w-4 h-4" />
          <span class="text-xs">重置</span>
        </button>
        <button
          @click="toggleAutoRotate"
          class="cyber-btn py-2 px-3 flex items-center gap-2"
          :class="{ 'border-electric-blue text-electric-blue': autoRotate }"
          title="自动旋转"
        >
          <component :is="icons.RotateCw" class="w-4 h-4" />
          <span class="text-xs">旋转</span>
        </button>
        <button
          @click="toggleWireframe"
          class="cyber-btn py-2 px-3 flex items-center gap-2"
          :class="{ 'border-electric-blue text-electric-blue': showWireframe }"
          title="显示网格"
        >
          <component :is="icons.Grid3x3" class="w-4 h-4" />
          <span class="text-xs">网格</span>
        </button>
        <button
          @click="toggleAxesHelper"
          class="cyber-btn py-2 px-3 flex items-center gap-2"
          :class="{ 'border-electric-blue text-electric-blue': showAxes }"
          title="显示坐标轴"
        >
          <component :is="icons.Compass" class="w-4 h-4" />
          <span class="text-xs">坐标轴</span>
        </button>
      </div>

      <div class="absolute bottom-4 left-4 cyber-card py-2 px-3">
        <p class="text-xs text-cyber-text-secondary mb-2">点大小</p>
        <input
          type="range"
          v-model.number="pointSize"
          min="0.5"
          max="10"
          step="0.5"
          class="w-32 accent-electric-blue"
        />
        <span class="text-xs text-cyber-text ml-2 font-mono">{{ pointSize }}</span>
      </div>

      <div class="absolute bottom-4 right-4 cyber-card py-2 px-3">
        <p class="text-xs text-cyber-text-secondary mb-2">颜色映射</p>
        <select
          v-model="colorMode"
          class="cyber-input text-xs py-1 w-32"
        >
          <option value="height">高度</option>
          <option value="intensity">强度</option>
          <option value="original">原始</option>
        </select>
      </div>

      <div
        v-if="loading"
        class="absolute inset-0 bg-cyber-bg/80 flex items-center justify-center z-10"
      >
        <div class="text-center">
          <div class="w-12 h-12 border-2 border-electric-blue border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p class="text-cyber-text-secondary">{{ loadingText }}</p>
        </div>
      </div>

      <div
        v-if="!hasData && !loading"
        class="absolute inset-0 flex items-center justify-center"
      >
        <div class="text-center">
          <component :is="icons.Box" class="w-16 h-16 text-cyber-text-muted mx-auto mb-4 opacity-50" />
          <p class="text-cyber-text-secondary">暂无点云数据</p>
          <p class="text-cyber-text-muted text-sm mt-1">选择或上传点云文件开始可视化</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, shallowRef } from 'vue'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import {
  MapPin,
  Move,
  ZoomIn,
  RotateCcw,
  RotateCw,
  Grid3x3,
  Compass,
  Box
} from 'lucide-vue-next'
import type { PointCloudData } from '@/types'
import { useWebGLRenderer } from '@/composables/useWebGLRenderer'

const props = defineProps<{
  pointCloudData?: PointCloudData | null
  loading?: boolean
  loadingText?: string
}>()

const emit = defineEmits<{
  pointClick: [point: { x: number; y: number; z: number; index: number }]
  cameraChange: [position: { x: number; y: number; z: number }]
}>()

const icons = {
  MapPin,
  Move,
  ZoomIn,
  RotateCcw,
  RotateCw,
  Grid3x3,
  Compass,
  Box
}

const containerRef = ref<HTMLElement | null>(null)
const canvasRef = ref<HTMLCanvasElement | null>(null)

const pointSize = ref(2)
const autoRotate = ref(false)
const showWireframe = ref(true)
const showAxes = ref(true)
const colorMode = ref<'height' | 'intensity' | 'original'>('height')
const fps = ref(60)
const cameraDistance = ref(100)

const { createRenderer, render, updatePointSize, updateColorMode, dispose } = useWebGLRenderer()

const scene = shallowRef<THREE.Scene | null>(null)
const camera = shallowRef<THREE.PerspectiveCamera | null>(null)
const renderer = shallowRef<THREE.WebGLRenderer | null>(null)
const controls = shallowRef<OrbitControls | null>(null)
const pointCloud = shallowRef<THREE.Points | null>(null)
const gridHelper = shallowRef<THREE.GridHelper | null>(null)
const axesHelper = shallowRef<THREE.AxesHelper | null>(null)
const raycaster = shallowRef<THREE.Raycaster | null>(null)
const mouse = shallowRef<THREE.Vector2 | null>(null)

let animationFrameId: number | null = null
let lastTime = performance.now()
let frameCount = 0

const hasData = computed(() => props.pointCloudData && props.pointCloudData.positions.length > 0)
const currentPointCount = computed(() => {
  return props.pointCloudData?.positions.length / 3 || 0
})

function initScene() {
  if (!containerRef.value || !canvasRef.value) return

  const result = createRenderer(canvasRef.value, containerRef.value.clientWidth, containerRef.value.clientHeight)
  scene.value = result.scene
  camera.value = result.camera
  renderer.value = result.renderer
  controls.value = result.controls

  raycaster.value = new THREE.Raycaster()
  mouse.value = new THREE.Vector2()

  gridHelper.value = new THREE.GridHelper(200, 50, 0x00d4ff, 0x2a3447)
  gridHelper.value.material.opacity = 0.3
  gridHelper.value.material.transparent = true
  scene.value.add(gridHelper.value)

  axesHelper.value = new THREE.AxesHelper(50)
  scene.value.add(axesHelper.value)

  controls.value!.autoRotate = autoRotate.value
  controls.value!.autoRotateSpeed = 0.5

  controls.value!.addEventListener('change', () => {
    if (camera.value) {
      const pos = camera.value.position
      const target = controls.value!.target
      cameraDistance.value = pos.distanceTo(target)
      emit('cameraChange', { x: pos.x, y: pos.y, z: pos.z })
    }
  })

  canvasRef.value.addEventListener('click', onCanvasClick)

  window.addEventListener('resize', onResize)
}

function loadPointCloud(data: PointCloudData) {
  if (!scene.value || !renderer.value) return

  if (pointCloud.value) {
    scene.value.remove(pointCloud.value)
    pointCloud.value.geometry.dispose()
    if (Array.isArray(pointCloud.value.material)) {
      pointCloud.value.material.forEach(m => m.dispose())
    } else {
      pointCloud.value.material.dispose()
    }
  }

  const geometry = new THREE.BufferGeometry()
  
  const positions = new Float32Array(data.positions)
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))

  if (data.colors && data.colors.length > 0) {
    const colors = new Float32Array(data.colors)
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  }

  if (data.intensities && data.intensities.length > 0) {
    const intensities = new Float32Array(data.intensities)
    geometry.setAttribute('intensity', new THREE.BufferAttribute(intensities, 1))
  }

  const material = new THREE.ShaderMaterial({
    uniforms: {
      pointSize: { value: pointSize.value },
      colorMode: { value: colorMode.value === 'height' ? 0 : colorMode.value === 'intensity' ? 1 : 2 },
      minHeight: { value: Math.min(...Array.from(positions.filter((_, i) => i % 3 === 2))) },
      maxHeight: { value: Math.max(...Array.from(positions.filter((_, i) => i % 3 === 2))) },
      minIntensity: { value: data.intensities ? Math.min(...Array.from(data.intensities)) : 0 },
      maxIntensity: { value: data.intensities ? Math.max(...Array.from(data.intensities)) : 1 }
    },
    vertexShader: `
      attribute float size;
      attribute float intensity;
      attribute vec3 color;
      varying vec3 vColor;
      varying float vIntensity;
      varying float vHeight;
      uniform int colorMode;
      uniform float minHeight;
      uniform float maxHeight;
      uniform float minIntensity;
      uniform float maxIntensity;
      
      void main() {
        vColor = color;
        vIntensity = intensity;
        vHeight = position.y;
        
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = size * (300.0 / -mvPosition.z);
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: `
      varying vec3 vColor;
      varying float vIntensity;
      varying float vHeight;
      uniform int colorMode;
      uniform float minHeight;
      uniform float maxHeight;
      uniform float minIntensity;
      uniform float maxIntensity;
      
      void main() {
        vec2 center = gl_PointCoord - vec2(0.5);
        float dist = length(center);
        if (dist > 0.5) discard;
        
        vec3 finalColor;
        
        if (colorMode == 0) {
          float t = (vHeight - minHeight) / (maxHeight - minHeight);
          finalColor = mix(vec3(0.0, 0.8, 1.0), vec3(1.0, 0.6, 0.0), t);
        } else if (colorMode == 1) {
          float t = (vIntensity - minIntensity) / (maxIntensity - minIntensity);
          finalColor = mix(vec3(0.2, 0.2, 1.0), vec3(1.0, 1.0, 1.0), t);
        } else {
          finalColor = vColor;
        }
        
        float alpha = 1.0 - smoothstep(0.0, 0.5, dist);
        gl_FragColor = vec4(finalColor, alpha);
      }
    `,
    transparent: true,
    vertexColors: true
  })

  pointCloud.value = new THREE.Points(geometry, material)
  scene.value.add(pointCloud.value)

  geometry.computeBoundingBox()
  if (geometry.boundingBox && controls.value) {
    const center = new THREE.Vector3()
    geometry.boundingBox.getCenter(center)
    controls.value.target.copy(center)
    
    const size = new THREE.Vector3()
    geometry.boundingBox.getSize(size)
    const maxDim = Math.max(size.x, size.y, size.z)
    camera.value!.position.set(center.x + maxDim, center.y + maxDim * 0.5, center.z + maxDim)
    camera.value!.lookAt(center)
    controls.value.update()
  }
}

function onCanvasClick(event: MouseEvent) {
  if (!canvasRef.value || !camera.value || !pointCloud.value || !raycaster.value || !mouse.value) return

  const rect = canvasRef.value.getBoundingClientRect()
  mouse.value.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
  mouse.value.y = -((event.clientY - rect.top) / rect.height) * 2 + 1

  raycaster.value.setFromCamera(mouse.value, camera.value)
  
  const intersects = raycaster.value.intersectObject(pointCloud.value)
  
  if (intersects.length > 0) {
    const intersection = intersects[0]
    emit('pointClick', {
      x: intersection.point.x,
      y: intersection.point.y,
      z: intersection.point.z,
      index: intersection.index || 0
    })
  }
}

function onResize() {
  if (!containerRef.value || !camera.value || !renderer.value) return
  
  const width = containerRef.value.clientWidth
  const height = containerRef.value.clientHeight
  
  camera.value.aspect = width / height
  camera.value.updateProjectionMatrix()
  renderer.value.setSize(width, height)
}

function animate() {
  animationFrameId = requestAnimationFrame(animate)
  
  const now = performance.now()
  frameCount++
  
  if (now - lastTime >= 1000) {
    fps.value = frameCount
    frameCount = 0
    lastTime = now
  }
  
  if (controls.value) {
    controls.value.update()
  }
  
  if (renderer.value && scene.value && camera.value) {
    renderer.value.render(scene.value, camera.value)
  }
}

function resetCamera() {
  if (pointCloud.value && controls.value && camera.value) {
    const geometry = pointCloud.value.geometry
    geometry.computeBoundingBox()
    if (geometry.boundingBox) {
      const center = new THREE.Vector3()
      geometry.boundingBox.getCenter(center)
      controls.value.target.copy(center)
      
      const size = new THREE.Vector3()
      geometry.boundingBox.getSize(size)
      const maxDim = Math.max(size.x, size.y, size.z)
      camera.value.position.set(center.x + maxDim, center.y + maxDim * 0.5, center.z + maxDim)
      camera.value.lookAt(center)
      controls.value.update()
    }
  }
}

function toggleAutoRotate() {
  autoRotate.value = !autoRotate.value
  if (controls.value) {
    controls.value.autoRotate = autoRotate.value
  }
}

function toggleWireframe() {
  showWireframe.value = !showWireframe.value
  if (gridHelper.value) {
    gridHelper.value.visible = showWireframe.value
  }
}

function toggleAxesHelper() {
  showAxes.value = !showAxes.value
  if (axesHelper.value) {
    axesHelper.value.visible = showAxes.value
  }
}

watch(pointSize, (newSize) => {
  if (pointCloud.value) {
    const material = pointCloud.value.material as THREE.ShaderMaterial
    material.uniforms.pointSize.value = newSize
  }
})

watch(colorMode, (newMode) => {
  if (pointCloud.value) {
    const material = pointCloud.value.material as THREE.ShaderMaterial
    material.uniforms.colorMode.value = newMode === 'height' ? 0 : newMode === 'intensity' ? 1 : 2
  }
})

watch(() => props.pointCloudData, (newData) => {
  if (newData) {
    loadPointCloud(newData)
  }
}, { deep: true })

onMounted(() => {
  initScene()
  animate()
  if (props.pointCloudData) {
    loadPointCloud(props.pointCloudData)
  }
})

onUnmounted(() => {
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId)
  }
  window.removeEventListener('resize', onResize)
  if (canvasRef.value) {
    canvasRef.value.removeEventListener('click', onCanvasClick)
  }
  dispose()
  if (renderer.value) {
    renderer.value.dispose()
  }
})

function formatNumber(num: number): string {
  if (num >= 1e9) return (num / 1e9).toFixed(2) + 'B'
  if (num >= 1e6) return (num / 1e6).toFixed(2) + 'M'
  if (num >= 1e3) return (num / 1e3).toFixed(2) + 'K'
  return num.toString()
}
</script>
